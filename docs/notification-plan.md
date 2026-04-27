# Notification Detection — Implementation Plan

## Context

`docs/notification-detection-design.md` specifies _when_ Milesto sends pushes and the detection architecture (transactional outbox + claim-based dispatcher, streaks, STO, winback, coach-voiced memory hooks). The design is approved; this plan sequences it into buildable work.

**Current state** (verified via exploration):

- **APNs transport works end-to-end.** `api/src/notifications/notifications.service.ts` handles JWT (ES256), HTTP/2, fan-out, batching (100/user), 410 cleanup. `device_tokens` table exists.
- **EventEmitter2 is wired.** `roadmap.generated`, `weekly-plan.generated`, `debrief.submitted`, `weekly-tasks.generated`, `summary.generated` emit today. Missing: `task.completed`, `milestone.completed`, `goal.completed`, `weekly-plan.completed`, `coach.reply.ready`.
- **`@nestjs/schedule` is NOT installed.** No cron anywhere. No dispatcher, no outbox, no scheduler.
- **iOS:** device-token registration works (`AppDelegate.swift`), but no `UNUserNotificationCenterDelegate`, no service extension, no notification categories, no deep-link routing for pushes, no foreground activity telemetry, no settings UI. Permission prompt fires on auth (needs deferral per §9.4).
- **DB:** ~18 schema additions needed (7 new tables + columns on `profiles`, `goals`, `milestones`, `weekly_plans`, `weekly_tasks`). Migration convention: `api/migrations/YYYYMMDD_*.sql`, applied via Supabase MCP `apply_migration`.

**Goal**: ship the full design in 21 ordered phases. Each phase lands independent value and unblocks the next.

---

## Conventions

- Migrations: one SQL file per phase under `api/migrations/YYYYMMDD_notif_NN_description.sql`. Apply with `mcp__supabase__apply_migration`. After every DDL: `mcp__supabase__get_advisors` for security + performance lints.
- Backend modules: new code under `api/src/notifications/` split into subfolders — `outbox/`, `dispatcher/`, `producers/`, `streaks/`, `activity/`, `experiments/`. Existing `notifications.service.ts` (APNs client) is reused, not rewritten.
- Event names: kebab-case per existing convention (`task.completed`, `milestone.completed`, etc.). **Each event has exactly one emitter** (table below). The emitter inserts the outbox row _inside the same DB transaction_ as the state change — not an `@OnEvent` listener — because `@nestjs/event-emitter` fires synchronously in-process but bypasses the DB transaction, so a listener crash after commit would lose the notification. Listeners are only used for read-only side effects (quality signals, embeddings). Cross-module event listeners (e.g., streaks, winback cancellation) subscribe to events that are emitted _after_ the outbox insert completes.

  | Event                   | Single emitter (owner)                                                                                         |
  | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
  | `task.completed`        | `weekly-task.service.ts` (`toggleComplete` method)                                                             |
  | `milestone.completed`   | `milestones.service.ts` (new)                                                                                  |
  | `goal.completed`        | `goals.service.ts` (`markComplete`)                                                                            |
  | `weekly-plan.completed` | `debrief.service.ts` (the debrief is the only trigger for plan completion in current product)                  |
  | `coach.reply.ready`     | `chat/messages.service.ts` (where the assistant message row is inserted)                                       |
  | `user.activity`         | `activity.service.ts` (explicitly emitted by `ActivityService.record()` so winback cancellation can subscribe) |

- iOS: SwiftUI + Swift 6 strict concurrency; notification handling in `ios/Milesto/Sources/Modules/Notifications/` (new module). Service extension in a new target `NotificationServiceExtension`.
- Web admin: no scope for v1 beyond what the dashboard needs for observability (phase 21).
- After each backend change that touches protected code: run the codex review skill (per global CLAUDE.md).

---

## Phase 1 — Schema migrations (core tables + columns)

**Files (new migrations under `api/migrations/`):**

- `20260420_notif_01_profile_columns.sql`
- `20260420_notif_02_goal_milestone_task_columns.sql`
- `20260420_notif_03_notification_jobs.sql`
- `20260420_notif_04_notification_deliveries.sql`
- `20260420_notif_05_notification_system_alerts.sql`
- `20260420_notif_06_user_streaks.sql`
- `20260420_notif_07_user_activity_events.sql`
- `20260420_notif_08_notification_experiments.sql`
- `20260420_notif_09_weekly_task_intentions.sql`

**Columns to add:**

- `profiles`: `last_active_at timestamptz`, `notif_enabled boolean default true`, `notif_quiet_start smallint`, `notif_quiet_end smallint`, `notif_preferences jsonb default '{}'`, `notif_permission_status text default 'not_requested'`, `notif_permission_requested_at timestamptz`, `sto_active_hour smallint`, `tenure_start_date date`.
- `goals`: `user_motivation_quote text` (§11.3).
- `milestones`: `target_date date`, `completed_at timestamptz` (set on completion event).
- `weekly_plans`: `expected_end_date date` (generated column: `week_start_date + 6`).
- `weekly_tasks`: `completed_at timestamptz` + `CHECK ((is_completed = true) = (completed_at IS NOT NULL))`.

**Tables** match the design's §3.1, §5.2, §6.1, §9.1, §10 exactly. Indexes per §3.1:

- `notification_jobs`: `UNIQUE(dedup_key)`; partial on `(scheduled_for_utc) WHERE status = 'pending'`; partial on `(user_id, local_date) WHERE tier IN (2,3)`; partial on `(status, claimed_at) WHERE status = 'claimed'`; partial on `(sequence_id, sequence_step)`; partial on `(experiment_id, variant)`.
- `user_activity_events`: `(user_id, occurred_at DESC)`; partial `(user_id, local_hour) WHERE occurred_at > now() - interval '30 days'` — note: use a non-IMMUTABLE predicate means this must be a regular index without the WHERE, or a functional approach; use `(user_id, occurred_at DESC, local_hour)` instead and prune via retention job.
- `weekly_tasks`: `(completed_at) WHERE completed_at IS NOT NULL` for on-demand "last progress" query.

**RLS** per §10:

- `notification_jobs`, `notification_deliveries`, `notification_system_alerts`, `user_activity_events`, `notification_experiments` → deny-all for `anon`/`authenticated`; service-role bypasses. Pattern from `migrations/20260418_apple_iap_schema.sql:27-41`.
- `user_streaks` → authenticated can SELECT own rows (for UI streak display); service-role writes.
- `weekly_task_intentions` → authenticated can SELECT/INSERT/UPDATE/DELETE own rows (join via `weekly_tasks.user_id`).

**Migration ordering for `weekly_tasks.completed_at`** (avoids CHECK-on-dirty-data failure):

1. `ALTER TABLE weekly_tasks ADD COLUMN completed_at timestamptz` (nullable, no constraint).
2. Backfill: `UPDATE weekly_tasks SET completed_at = COALESCE(updated_at, created_at) WHERE is_completed = true`.
3. `ALTER TABLE weekly_tasks ADD CONSTRAINT weekly_tasks_completed_at_consistency CHECK ((is_completed = true) = (completed_at IS NOT NULL)) NOT VALID`.
4. `ALTER TABLE weekly_tasks VALIDATE CONSTRAINT weekly_tasks_completed_at_consistency` — converts to validated once data is clean.

**Other backfills** (same migration, separate statements):

- `profiles.tenure_start_date = created_at::date` for all users.
- `milestones.target_date = goals.target_date - interval '(goals total_weeks - milestones.target_week) weeks'` (best-effort; recomputed on next roadmap generation).
- `weekly_plans.expected_end_date` via generated-column (`GENERATED ALWAYS AS (week_start_date + 6) STORED`) so no backfill needed.

**`notification_deliveries` uniqueness**: add `UNIQUE (job_id, device_token)` so `received`/`opened` callbacks are idempotent. Rows are _pre-inserted at send time_ (one per device token) with `sent_at = now()` and `received_at/opened_at = null`; iOS telemetry then updates these rows rather than inserting new ones (simplifies idempotency and means the "received" endpoint is a no-op if iOS never fires it).

**Verification:** `mcp__supabase__list_tables` shows all 7 new tables; `mcp__supabase__execute_sql` spot-checks one row per table; `mcp__supabase__get_advisors` returns zero new security/performance warnings.

---

## Phase 2 — `user_activity_events` write path + foreground endpoint

**Backend (new):**

- `api/src/notifications/activity/activity.service.ts` — `record(userId, kind, occurredAt?)`. Computes `local_hour` via `profiles.timezone` (`AT TIME ZONE` in SQL, or Luxon on the service). Also touches `profiles.last_active_at = greatest(now(), last_active_at)`.
- `api/src/notifications/activity/activity.controller.ts` — `POST /api/activity/foreground` (authenticated). Rate-limit to 1/min per user (in-memory Map with TTL — foreground storms).

**Backend (wiring):**

- `api/src/notifications/notifications.module.ts` — register `ActivityService` & controller.
- `api/src/app.module.ts` — already imports `NotificationsModule`; nothing needed beyond re-export.

**Verification:** iOS simulator foreground → row in `user_activity_events` within 500ms; `profiles.last_active_at` advances. Simulate 10 foregrounds in 5 s → ≤2 rows written.

---

## Phase 3 — iOS telemetry endpoints + service extension + why-deeplink category

**Backend (new endpoints):**

- `POST /api/notifications/delivery/received` → `UPDATE notification_deliveries SET received_at = COALESCE(received_at, now()) WHERE job_id = $1 AND device_token = $2`. Idempotent (re-delivery leaves the original timestamp). If no row matches (old/stale push from before the table existed), returns 200 with a no-op.
- `POST /api/notifications/delivery/opened` → same pattern on `opened_at`.
- Both endpoints attached to `NotificationsController` (existing file); DTOs under `api/src/notifications/dto/`.

**iOS (new):**

- **App Group** added to app + extension (`group.app.milesto-ai.shared`) so the extension can read a shared access token written by the main app via a `SharedKeychain` wrapper. This is what unblocks authenticated calls from the service extension.
- New target `NotificationServiceExtension` (mutable-content extension). `NotificationService.swift` (in extension) implements `didReceive(_:withContentHandler:)` → POSTs to `/delivery/received` with `job_id` from the **top-level payload** (the payload contract below places `job_id` as a sibling of `aps`, not inside it — Apple strips unknown keys from `aps` but preserves custom top-level keys). Reads the token from shared keychain. If token missing/expired, extension silently skips the telemetry POST — backend already pre-inserts a row at send time, so missing `received_at` is acceptable (opens still correlate).
- `ios/Milesto/Sources/Modules/Notifications/NotificationCenterDelegate.swift` — new `UNUserNotificationCenterDelegate`. Implements:
  - `willPresent` → show banner + sound when app foreground.
  - `didReceive response` → POSTs `/delivery/opened`, then routes via `cta_deeplink`.
  - `willPresent` + `didReceive` both write `user_activity_events` (kind = `notification_interaction`).
- Register categories at launch:
  - `MILESTO_GENERIC` with action `WHY_THIS` (label "Why this notification?"). Action handler opens `why_deeplink` in a web sheet.
- Deep-link router: extend `App.swift`'s `.onOpenURL` to recognize `milesto://task/<id>`, `milesto://coach/reply/<id>`, `milesto://notif/why/<job_id>`. New `DeepLinkRouter.swift` struct with `Route` enum.
- `AppDelegate.swift`: set `UNUserNotificationCenter.current().delegate = NotificationCenterDelegate.shared` in `application(_:didFinishLaunchingWithOptions:)`. Register categories here too.

**Payload contract (per §4.6):** APNs payload is shaped so required iOS directives are inside `aps`:

```
{
  "aps": {
    "alert": { "body": <teaser>, "title": <coach.name> },
    "sound": "default",
    "mutable-content": 1,
    "category": "MILESTO_GENERIC"
  },
  "job_id": <uuid>,
  "kind": <kind>,
  "reveal": <string?>,
  "cta_deeplink": <url>,
  "why_deeplink": <url>,
  "memory_hooks": { ... }
}
```

Putting `mutable-content` and `category` inside `aps` is required for the service extension and category actions to fire.

**Verification:** Send a test push via admin `POST /api/notifications/send` with a fake job_id → `notification_deliveries.received_at` populates; tap → `opened_at` populates; long-press reveals "Why this notification?" action.

---

## Phase 4 — Activity timestamp touch points

Touch `profiles.last_active_at` and append to `user_activity_events` at every user-initiated mutation.

**Files to modify:**

- `api/src/chat/messages.service.ts` (or wherever user messages insert) → on insert-by-user: `ActivityService.record(userId, 'message_sent')`.
- `api/src/roadmap/weekly-task.service.ts` → when `is_completed` toggles true: `ActivityService.record(userId, 'task_completed')` + set `weekly_tasks.completed_at = now()`, and emit `task.completed` event (used by streak eval in phase 13, winback cancellation in phase 16).
- `api/src/roadmap/debrief.service.ts:103` → after insert: `ActivityService.record(userId, 'debrief_submitted')`. Also check if the debrief completes the plan (`weekly_plans.status → 'completed'`); if so emit `weekly-plan.completed`.
- `api/src/roadmap/roadmap.service.ts` — after roadmap persistence, compute `milestones.target_date` from `goals.target_date` and `target_week`.

**Event emissions added here (per user's chosen approach):**

- `task.completed` (payload: `{userId, taskId, goalId, weeklyPlanId, completedAt}`) — roadmap/weekly-task.service.ts.
- `milestone.completed` — wherever milestones flip to complete (today: nowhere; add an admin/manual trigger endpoint first; later an auto-detection worker in phase 17).
- `goal.completed` — `goals.service.ts` on status → `completed`.
- `weekly-plan.completed` — `debrief.service.ts` only (the debrief is the sole product trigger for plan completion today; matches the single-emitter ownership table above).
- `coach.reply.ready` — in the chat pipeline where the assistant message is persisted.

**Verification:** complete a task in iOS → row appears in `user_activity_events` AND `profiles.last_active_at` advances AND `task.completed` event is logged.

---

## Phase 5 — Outbox table + dispatcher skeleton + `coach_reply_ready` end-to-end

Install `@nestjs/schedule` and set up the first real notification flow.

**Backend (new):**

- `api/src/notifications/outbox/outbox.service.ts` — `insert(job)` helper with dedup via `ON CONFLICT (dedup_key) DO NOTHING`. `cancel(filter)` for superseding. `markSkipped(id, reason)`, `markSent(id)`, `markFailed(id, error)`.
- `api/src/notifications/dispatcher/dispatcher.service.ts` — cron every 1 min. Calls the thin pg function `claim_notification_jobs(worker_id, batch_size)` which ONLY does the atomic claim. Two-phase send logic (Phase A P0/P1, Phase B P2/P3 grouping + winner selection, global ceiling, gate checks) lives in TypeScript.
- `api/src/notifications/dispatcher/predicates.ts` — per-kind predicate functions called both at enqueue and at dispatch (re-check, §3.3).
- `api/src/notifications/dispatcher/orphan-recovery.service.ts` — cron every 2 min; `UPDATE notification_jobs SET status='pending' WHERE status='claimed' AND claimed_at < now() - interval '5 min'`.
- `api/src/notifications/producers/coach-reply.producer.ts` — inserts `coach_reply_ready` job _in the same transaction_ as the assistant-message insert in `chat/messages.service.ts` (via pg RPC `persist_assistant_message_tx`), not via `@OnEvent`. Event is still emitted post-commit for read-only listeners (embeddings, etc.).

**Backend (infra):**

- `bun add @nestjs/schedule`.
- `api/src/app.module.ts` — `ScheduleModule.forRoot()`.
- PG function `claim_notification_jobs` via migration `20260421_notif_10_claim_fn.sql`.

**Verification:** user sends chat message → backend persists reply → `coach.reply.ready` fires → row in `notification_jobs` (pending) → within 1 min, row moves to `sent`, iOS receives push. Open APNs sandbox token in Apple's Push Notifications Console to verify payload.

---

## Phase 6 — Permission-prompt relocation (§9.4)

Highest-leverage opt-in lever; ships before more kinds to avoid wasted pushes to unpermitted users.

**iOS:**

- Remove unconditional `requestPermissionAndRegister()` from `App.swift:68` / `App.swift:73`.
- Add a `PermissionPromptCoordinator` that fires on:
  1. First coach-message reveal (hook in coach conversation view-model).
  2. First-ever `roadmap_generated` display (hook in roadmap view).
  3. Fallback: first foreground ≥ 24 h after auth if `notif_permission_status = 'not_requested'`.
- Pre-prompt explainer sheet before the system prompt (one shot, shown once).
- On grant → POST `profiles.notif_permission_status = 'granted'` (and re-register token); on deny → `'denied'`. Backend persists via existing `profiles` service.

**Verification:** fresh install → onboard → no prompt at launch → first coach reply reveals prompt with explainer → grant flows token to backend.

---

## Phase 7 — Onboarding capture of `user_motivation_quote`

**iOS:**

- Add free-text step to onboarding flow ("Why does this goal matter to you?") — `OnboardingMotivationView.swift`.
- PATCH `goals.user_motivation_quote` via existing goals endpoint. If endpoint doesn't accept it, add field to the DTO.
- Make optional; skip retains null.

**Backend:**

- Extend `api/src/goals/dto/update-goal.dto.ts` (or create) to accept `user_motivation_quote`.

**Verification:** new user onboards → `SELECT user_motivation_quote FROM goals WHERE user_id = $new`. Quote appears verbatim.

---

## Phase 8 — Time-anchored scheduler + `daily_check_in` (persona-default hour)

**Backend:**

- `api/src/notifications/producers/scheduler.service.ts` — cron every 15 min. For each active user, compute next-24h `daily_check_in` if one isn't already pending. Uses persona default hour for v1 (drill 07, standard 19, gentle 20) — STO takes over in phase 11. Inserts with dedup `daily_check_in:<user_id>:<YYYY-MM-DD-local>`.
- Predicate: active weekly_plan, `incomplete_task_count > 0`, `notif_enabled`, not in quiet hours (phase 10 — for v1 hardcode quiet 22-07).
- Re-check at dispatch (already in dispatcher skeleton from phase 5).

**Verification:** seed a user with active plan and persona standard → within 15 min, a `daily_check_in` row for tomorrow 19:00 local appears in `notification_jobs`; at dispatch time, if still incomplete, push fires.

---

## Phase 9 — Implementation intentions: capture + push (§11.4)

Highest-leverage evidence-based mechanic; ships before other nudge kinds.

**iOS:**

- On weekly-plan publication screen, per task, prompt _"When will you do this? Where?"_ with day/hour/location inputs.
- POST `weekly_task_intentions(task_id, day_of_week, local_hour, location_label)`.

**Backend:**

- `api/src/notifications/intentions/intentions.controller.ts` — CRUD on `weekly_task_intentions` (auth'd user can only touch own tasks).
- `api/src/notifications/producers/intention.producer.ts` — invoked by scheduler. For each captured intention: insert `implementation_intention` job at the if-then local time. Predicate: task still incomplete. **Overrides STO** per design.
- Dispatcher winner-selection rank (already defined): `implementation_intention` second only to `streak_broken`.

**Verification:** capture an intention for Tuesday 20:00 → at Tuesday 20:00 local, push fires with if-then copy; if task was completed earlier, job skipped with `predicate_invalidated`.

---

## Phase 10 — Quiet hours, opt-out UI, per-kind toggles

**iOS:**

- Settings → Notifications (new `NotificationSettingsView.swift`).
  - Master toggle (→ `profiles.notif_enabled`).
  - Quiet hours start/end pickers.
  - Per-kind toggles for every P2/P3 kind.
- PATCH `profiles` with updated fields.

**Backend — `notif_preferences` schema (fixed here so downstream phases can rely on it):**

```
profiles.notif_preferences = {
  "global": { "paused_until": <timestamptz?> },     // written by winback phase 16, fatigue phase 19 (global floor)
  "<kind>": {                                         // one entry per kind
    "enabled": <bool, default true>,
    "paused_until": <timestamptz?>                    // written by fatigue phase 19 per-kind
  }
}
```

**Central gate function** `isPushAllowed(userId, kind): { allowed, reason }` lives in `api/src/notifications/gate/gate.service.ts` and is called by BOTH producers (before enqueue) AND dispatcher (before send — re-check for late-breaking pauses). It checks, in order:

1. `profiles.notif_enabled = false` → `user_disabled`.
2. `notif_preferences.global.paused_until > now()` → `global_paused`.
3. `notif_preferences[kind].enabled = false` → `kind_disabled`.
4. `notif_preferences[kind].paused_until > now()` → `kind_paused`.
5. Quiet hours (unless kind in `{coach_reply_ready, streak_at_risk}`) → `quiet_hours` (dispatcher reschedules to quiet-end; producer schedules after quiet-end from the start).

All phases 10–20 that read "check opt-out" mean "call `gate.service.isPushAllowed`." This single call site is what makes phases 16 (winback break-up 90-day pause) and 19 (fatigue auto-pause) actually effective.

**Verification:** disable `daily_check_in` → scheduler still enqueues? No, producer must check. Verify no rows inserted. Flip master off → dispatcher skips all existing pending rows.

---

## Phase 11 — STO computation (requires ≥ 7 days of activity data)

**Backend:**

- `api/src/notifications/sto/sto.service.ts` — `computeActiveHour(userId): number | null`. Implements §6.2.
- `api/src/notifications/sto/sto-cron.service.ts` — runs as a consumer of the 15-min local-time scheduler: fires once per user when their local time enters the 02:00–02:14 window. Updates `profiles.sto_active_hour` with whiplash guard: only change if ≥ 2 hours different or stored > 14 days old.
- Scheduler (phase 8) switches from persona-default to `coalesce(sto_active_hour, persona_default_hour)` for `daily_check_in`; `streak_at_risk` uses `max(sto_active_hour, 18)`; `coach_proactive` uses `sto_active_hour`.

**Verification:** backfill 14 days of synthetic `user_activity_events` clustered around 20:00 local → the 15-min local-time scheduler's 02:00-local tick sets `sto_active_hour = 20` → next day's `daily_check_in` fires at 20:00 local.

---

## Phase 12 — Global 2/day hard ceiling (§8.5)

**Backend:**

- Dispatcher preflight: before APNs send, `SELECT count(*) FROM notification_jobs WHERE user_id=$u AND sent_at > now() - interval '24h'`. If ≥ 2: reschedule to the earliest gap. If gap > 2h late: skip with `skip_reason = 'global_ceiling'`.
- Track via a materialized counter if profiling shows the count-query is hot (not needed for v1).

**Verification:** enqueue 3 P0s within 5 min for one user → 2 send, 3rd skipped with `global_ceiling`.

---

## Phase 13 — Weekly streaks system

**Backend:**

- `api/src/notifications/streaks/streaks.service.ts` — `evaluateOnTaskCompleted(userId, goalId, completedAt)` per §5.3. Insert/update `user_streaks` row.
- `api/src/notifications/streaks/streaks-nightly.service.ts` — hooked into the per-user local-time scheduler (see cross-cutting). For each user whose local Sunday is ending (23:00–23:59 local), scan for broken streaks where no `task.completed` fired this local week. Insert `streak_broken` jobs for the user's local Monday morning.
- `@OnEvent('task.completed')` listener calls the streak service. May emit `streak_milestone` at {4, 8, 12, 26, 52} weeks.
- `streak_at_risk` predicate: `current_weeks ≥ 2`, `last_extended_week < this_week`, tasks remain, `freeze_tokens = 0`. Fires Sunday evening STO slot.
- Freeze-token auto-replenish: 1/month, cap 2. Nightly cron checks `freezes_last_granted_at` per streak row.
- §5.7 guardrails: no streak mention in push copy for first 60 days (gate in copy module via `now()::date - profiles.tenure_start_date < 60`). In-app streak visible from day 1.

**iOS:**

- Streak card on goal detail / roadmap view — reads `user_streaks` via existing Supabase client.

**Verification:** complete task Mon week N → `current_weeks = 1`. Complete task Mon week N+1 → `current_weeks = 2`. Skip week N+2 entirely, no freeze → Sunday 23:30 cron marks broken, Monday `streak_broken` fires.

---

## Phase 14 — Celebration pushes (winner-selection-exempt, NOT ceiling-exempt)

`milestone_hit`, `goal_hit`, `week_completed`.

**Scope clarification**: "cap-exempt" in the design (§8.1) means only **exempt from the P2/P3 per-day winner-selection suppression** — i.e. they don't compete in the group, they send directly. They are **still subject to the absolute 2-per-24h global ceiling (§8.5)**. A user completing 3 milestones in one evening will see 2 pushes, not 3.

**Backend:**

- Producers listen on `milestone.completed`, `goal.completed`, `weekly-plan.completed`. Insert jobs (tier 2).
- Dispatcher: celebration kinds skip Phase B grouping (send directly after Phase A), but still pass through the global ceiling check from phase 12.
- If a celebration job is suppressed by the global ceiling, `skip_reason = 'global_ceiling_celebration'` — celebrations that can't fit still deserve an audit trail because they're rare.

**Verification:** toggle 3 milestones complete back-to-back → 2 push; 3rd skipped with `global_ceiling_celebration` row in `notification_jobs`.

---

## Phase 15 — `milestone_preview` (goal-gradient bridge, §11.6)

**Backend:**

- Listener on `milestone.completed` → schedule `milestone_preview` job for now + 24 h, dedup `milestone_preview:<milestone_id>`.
- Predicate: next milestone exists, not yet complete. Payload includes `{ next_milestone_name, weeks_available, any_prep_already_done }`.
- Insert `weekly_tasks` already created for the next milestone? Check count to fill `any_prep_already_done`.

**Verification:** complete milestone M → 24 h later, push previews milestone M+1 with endowed-progress framing.

---

## Phase 16 — Winback sequence (5 steps + day-30 break-up + 90-day auto-pause)

**Backend:**

- `api/src/notifications/winback/winback.service.ts` — runs as a consumer of the 15-min local-time scheduler: fires once per user when their local time enters the 02:00–02:14 window. Detects dormancy: `profiles.last_active_at < now() - persona_threshold_days` and no active sequence.
- On dormancy: insert all 5 steps at once with shared `sequence_id`, offset days per persona (§11.1 table). Steps 1–5 have tiers P3/P2/P1/P2/P1 with copy hints in `payload.memory_hooks`.
- `@OnEvent('task.completed')` and `@OnEvent('user.activity')` → cancel pending `winback_step` rows via `sequence_id` (update to `cancelled`, `skip_reason = 'user_returned'`).
- Re-entry cooldown: 30 days after cancellation/completion.
- Auto-pause: if step 5 fires and no activity in 14 days → `notif_preferences.global.paused_until = now + 90 days`.

**Verification:** simulate a dormant user (old `last_active_at`) → the 15-min local-time scheduler's 02:00-local tick creates 5 scheduled rows → foreground-sim triggers `user.activity` → pending rows flip to `cancelled`.

---

## Phase 17 — Remaining P1/P2 kinds

`plan_not_generated`, `weekly_debrief_prompt`, `week_completion_gap`, `stale_tasks`.

**Backend:**

- `plan_not_generated` producer + the race protection in §4.2 (grace sentinel at Monday 00:05 local; cancel-on-`weekly-plan.generated`).
- `weekly_debrief_prompt` producer (Sunday 19:00 local, scoped to most-recent-per-goal, 7-day expiry window).
- `week_completion_gap` (Fri/Sat local, near-complete plan).
- `stale_tasks` (mid-week, 48 h silence).
- All predicates in `dispatcher/predicates.ts`; all dedup keys per §4.4.

**Verification:** skip a Monday plan generation → Monday 08:00 local triggers `plan_not_generated` push (unless grace or pending publish).

---

## Phase 18 — `coach_proactive` local-02:00-tick producer (§11.8)

**Backend:**

- `api/src/notifications/producers/coach-proactive.producer.ts` — runs as a consumer of the 15-min local-time scheduler: fires once per eligible user when their local time enters the 02:00–02:14 window.
- Gating signals: missed day, debrief emotional content (sentiment from existing embeddings), milestone pressure (target_date in 7d + < 50% complete), unusually high task difficulty.
- Calls OpenRouter LLM with coach persona + memory hooks to produce one message; stores directly in `payload.teaser` (skip copy-gen re-run).
- Cap ≤ 2 per user per week (check count of `coach_proactive` sent in last 7 d).
- Guardrails per §11.8: no phantom-emotional copy; LLM system prompt includes banned-phrase list.

**Verification:** seed an eligible user → the 15-min local-time scheduler's 02:00-local tick inserts a job → push lands at STO hour with coach voice.

---

## Phase 19 — Dynamic fatigue + aversion signal (§8.4)

**Backend:**

- `api/src/notifications/fatigue/fatigue.service.ts` — computes per-(user, kind) rolling open rate over last 10 sends. Adjusts per-kind enablement: auto-pause at <5% open, <15% halve frequency, ≥40% allow bonus.
- Aversion signal: compute rolling `foreground_count_24h_after_send / baseline`. Persist the baseline in `profiles.activity_baseline_per_day` (new small column, add via micro-migration). If ratio < 0.7 for 5 consecutive sends of same kind → auto-pause 21 days.
- Global fatigue floor: > 10 sends / 7 d → suppress non-P0 for 24 h.

**Verification:** script 10 unopened sends of a kind → 11th enqueue skipped with `fatigue_auto_paused`.

---

## Phase 20 — Experimentation + measurement

**Backend:**

- `api/src/notifications/experiments/experiments.service.ts` — `assignVariant(userId, experimentId): variantLabel` using `hash(user_id || experiment_id)`.
- Producers optionally call `assignVariant` and stamp `experiment_id` + `variant` on outbox rows.
- Metrics job (daily) writes a `notification_experiment_metrics` view/materialized view consumed by the admin dashboard.

**Web (dashboard):**

- `web/app/admin/notifications/experiments/page.tsx` — list experiments, view variants, view measured open rate / CTR / task completion lift / retention lift / APNs 410 rate.

**Verification:** create a draft experiment in admin, set status `running`, seed users via admin tool → variant assignment deterministic across sessions.

---

## Phase 21 — Observability

**pg_cron (observer-only, per §3.4):**

- Extension check via `mcp__supabase__list_extensions`; enable if missing (`CREATE EXTENSION IF NOT EXISTS pg_cron`).
- Scheduled job every 10 min inserts into `notification_system_alerts` when pending rows exist older than 10 min.

**Web dashboard:**

- `web/app/admin/notifications/dashboard/page.tsx` — tiles for:
  - D1/D7/D30 return (north-star, §9.3).
  - Weekly task completion rate.
  - Avg weekly streak length.
  - Winback sequence conversion.
  - Per-kind open rate + unsubscribe rate.
  - APNs 410 invalidation rate.
- Pulls from `notification_deliveries`, `user_activity_events`, `user_streaks`, `device_tokens`.

**Backend:**

- Log-based alerting: dispatcher logs structured events `{kind, skip_reason, user_id}` via NestJS logger; parsed into Supabase logs dashboards.

**Verification:** stop dispatcher for 20 min → pg_cron alert row inserted; dashboard tile surfaces it.

---

## Critical files (new or modified)

- `api/migrations/20260420_notif_01..09_*.sql` — schema (phase 1).
- `api/src/notifications/{activity,outbox,dispatcher,producers,streaks,sto,fatigue,experiments,winback}/*` — new submodules (phases 2–20).
- `api/src/notifications/notifications.module.ts` — wires all submodules.
- `api/src/notifications/notifications.service.ts` — unchanged (APNs transport reuse).
- `api/src/roadmap/weekly-task.service.ts`, `api/src/roadmap/debrief.service.ts`, `api/src/chat/messages.service.ts` (or equiv), `api/src/goals/goals.service.ts`, `api/src/roadmap/roadmap.service.ts` — event emissions (phase 4).
- `api/src/app.module.ts` — `ScheduleModule.forRoot()` (phase 5).
- `ios/Milesto/Sources/Modules/Notifications/*` — new module (phases 3, 6, 10).
- `ios/NotificationServiceExtension/*` — new target (phase 3).
- `ios/Milesto/Sources/App.swift`, `AppDelegate.swift` — delegate wiring (phases 3, 6).
- `ios/Milesto/Sources/Modules/Settings/Views/SettingsView.swift` — add notifications section (phase 10).
- `web/app/admin/notifications/*` — dashboards (phases 20–21).

---

## Cross-cutting concerns

- **Timezone**: every `local_hour`/`local_date` computation uses `AT TIME ZONE profiles.timezone`. If null → skip with `skip_reason = 'no_timezone'` (§4.1).
- **Late jobs**: dispatcher skips with `skip_reason = 'stale'` if `scheduled_for_utc < now() - 2h` (§4.5).
- **Transactional outbox**: producers insert outbox rows _inside the same DB transaction as the state-changing mutation_. Concretely: the emitter service (e.g., `weekly-task.service.ts.toggleComplete`) opens a transaction, writes the state change + outbox row + `user_activity_events` row together, commits, then emits the Nest event for read-only listeners. This is the design's §3.2A purity. Dedup keys add a second line of defense but are not a substitute: a post-commit listener that crashes would silently drop the notification. In practice this means wrapping multi-statement mutations with `supabase.rpc('do_task_completion_tx', {...})` helpers OR using a single `WITH … RETURNING` SQL block. v1 will use pg RPC helpers for the 5 event-emitting mutations.
- **Scheduling — one authoritative model**:
  - **Single scheduler cron, every 15 min (UTC).** For each active user it computes the user's current local hour/date (`AT TIME ZONE profiles.timezone`) and evaluates all time-anchored kinds against the user's local windows.
  - **All** time-anchored kinds resolve through this one evaluator, including those the design doc labels "nightly": `streak_at_risk` (Sunday evening local), `streak_broken` (Monday morning local), `weekly_debrief_prompt` (Sunday 19:00 local), `plan_not_generated` (Monday 08:00 local), `streaks-nightly` (23:00–23:59 Sunday local), `sto` recomputation (02:00–02:14 local), `winback` dormancy check (any 15-min window where `last_active_at` crosses the persona threshold), `coach_proactive` gating (02:00–02:14 local). No separate UTC-pinned crons.
  - This replaces the design's "nightly Nest cron at 02:00 UTC" with a "run once per user per local day at their local 02:00 window" guarantee. DST-safe because each tick recomputes local time from scratch.
  - Idempotency is guaranteed by dedup keys (§4.4) which include `YYYY-MM-DD-local` — so a user whose clock jumps through the window twice (rare, DST-fall-back) can't get two jobs.
- **Claim SQL lives in backend code, not pg function** (revised from initial draft): dispatcher issues the `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` directly via Supabase RPC using a minimal function `claim_notification_jobs(worker_id, batch_size)` that _only_ does the claim and returns rows. Dispatch policy (winner selection, ceiling checks, predicate re-check) stays in TypeScript where it can be unit-tested and version-controlled cleanly.
- **Copy generation**: deferred to a separate module/doc per design. This plan fixes the payload shape (§4.6) that copy-gen will consume.
- **Ethical copy constraints** (§8.6, §11.9): enforced in copy-gen module; the producers/dispatcher don't generate strings — they pass `memory_hooks` + `kind_specific` only.

---

## Verification plan

**End-to-end smoke after each phase** (automated where possible):

1. **Phase 1** — `mcp__supabase__list_tables` shows 7 new tables; `get_advisors` clean.
2. **Phase 2** — cURL `/api/activity/foreground` with auth token → row in `user_activity_events`.
3. **Phase 3** — send test push via admin endpoint → `notification_deliveries.received_at` populates; tap → `opened_at` populates.
4. **Phase 4** — complete a task via iOS → `task.completed` event logged; `profiles.last_active_at` advances.
5. **Phase 5** — send chat message → assistant reply → `coach_reply_ready` job fires within 1 min; push arrives on device.
6. **Phase 6** — fresh install, do not prompt at launch; prompt appears post-first-coach-reveal.
7. **Phase 7** — new user → `goals.user_motivation_quote` populated verbatim.
8. **Phase 8** — scheduler enqueues `daily_check_in` for next 24h; dispatch re-check skips if tasks complete.
9. **Phase 9** — capture if-then for Tue 20:00 → push fires at Tue 20:00 local.
10. **Phase 10** — flip master notif off → dispatcher skips all pending P0/P1/P2/P3.
11. **Phase 11** — seed 14 days of 20:00 activity → `sto_active_hour = 20`.
12. **Phase 12** — enqueue 3 P0s in 5 min → only 2 send.
13. **Phase 13** — 3-week chain with week-4 skip + freeze absorb → streak = 4.
14. **Phase 14** — complete 3 milestones in one evening → 2 celebration pushes fire, 3rd skipped with `global_ceiling_celebration` (confirms cap-exempt from winner selection only, not from 2/day global ceiling).
15. **Phase 15** — 24 h post-milestone → `milestone_preview` push lands.
16. **Phase 16** — dormant user → 5 steps enqueued; foreground mid-sequence → remaining steps cancelled.
17. **Phase 17** — skip Monday plan gen → Monday 08:00 local `plan_not_generated` fires (unless grace).
18. **Phase 18** — eligible user → LLM-generated coach-proactive push lands within cap.
19. **Phase 19** — 10 unopened sends of kind X → auto-pause.
20. **Phase 20** — split experiment into A/B → assignments deterministic; dashboard surfaces metrics.
21. **Phase 21** — stop dispatcher → pg_cron alert row visible in admin dashboard.

**Global integration test at end**: run a 7-day simulated user lifecycle (onboard → motivation quote → permission grant → weekly plan with intentions → mixed task completion → streak ↑ → dormancy → winback step 1 → recovery → streak_broken → comeback) and assert per-phase invariants.
