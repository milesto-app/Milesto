# Notification Detection — Architecture Design

> **Scope.** This document defines **when** Milesto should send push notifications to users, and the architecture for **detecting** those moments. It does not specify message copy, transport implementation (APNs is already wired up), or marketing pushes.
>
> **Codex validation.** Iteratively reviewed by Codex (OpenAI). Two rounds of feedback applied (19 distinct concerns addressed). A third validation round was attempted but the Codex process did not return; the design below incorporates all feedback received through round 2.
>
> **Retention revision.** The original design was engineering-first: correct delivery, guardrails against annoyance, no retention strategy. This revision adds the mechanics that make retention-led apps (Duolingo, Strava, Headspace) sticky: streaks, send-time optimization, winback sequences, dynamic fatigue, proactive coach pushes, celebration pushes, experimentation.
>
> **Evidence grounding.** Additions in this revision are grounded where possible in primary research (Gollwitzer & Sheeran 2006/2024 meta-analyses on implementation intentions; Kivetz/Urminsky/Zheng 2006 on goal-gradient; Kahneman/Tversky 1979 on loss aversion) and in documented playbooks from Duolingo (KDD 2020 bandit paper; streak-freeze blog), LinkedIn (Air Traffic Controller), Headspace (Phiture case study), and the FAccT 2024 parasocial-attachment literature. See §15 for a full source list. Claims without strong primary sourcing are flagged in-line.

---

## 1. Goals & non-goals

**Goals**

- **Maximize retention**, measured against D1 / D7 / D30 return-rate and weekly-task-completion rate. Every mechanic below must be A/B-testable against these.
- Detect the right moments to send pushes so users stay on their roadmap without feeling nagged.
- Respect timezone, coach personality, quiet hours, and user opt-outs.
- Make every reminder reproducible and auditable ("why did this push fire?").
- Reuse the existing APNs fan-out service.

**Non-goals**

- Notification copy / localization (separate doc; this design defines the payload _shape_ copy generation consumes).
- Transport changes (APNs JWT, batching, 410 cleanup already exist).
- Marketing campaigns (separate workflow).
- In-app notification center.

---

## 2. Reminder taxonomy

Each reminder has a **kind**, a **priority tier** (P0–P3), and a **trigger**. Tier governs guardrails; see §8.

| Kind                        | Tier     | Trigger                                                                                                   |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `coach_reply_ready`         | P0       | Async voice/chat coach response persisted for user                                                        |
| `roadmap_generated`         | P0       | `roadmap.service` emits `roadmap.generated`                                                               |
| `streak_at_risk`            | P0       | Streak length ≥ 3, last extension > 18h ago, today's task still incomplete, local evening window (see §5) |
| `weekly_plan_published`     | P1       | `weekly-plan-storage` emits `weekly-plan.generated`                                                       |
| `coach_proactive`           | P1       | Nightly coach-reasoning job decides to surface a proactive message (see §11)                              |
| `plan_not_generated`        | P1       | Monday 08:00 local · active goal · no weekly_plan for current week (race-protected, §4.2)                 |
| `weekly_debrief_prompt`     | P1       | Sunday 19:00 local · most recent plan's `expected_end_date` ≤ today · no debrief                          |
| `winback_step`              | P1/P2/P3 | One job per step in a dormant-user sequence (see §7)                                                      |
| `milestone_countdown_7/3/1` | P2       | `milestones.target_date` ∈ {today+7, today+3, today+1}, milestone active                                  |
| `goal_deadline_countdown`   | P2       | `goals.target_date` ∈ {today+14, today+7, today+1}                                                        |
| `daily_check_in`            | P2       | User's personalized local active hour (see §6) · active weekly_plan · `incomplete_task_count > 0`         |
| `implementation_intention`  | P2       | User-supplied if-then window arrives · task still incomplete (see §11.4)                                  |
| `week_completion_gap`       | P2       | Fri/Sat local · `incomplete_task_count ≤ 2` · user completed ≥ 1 task this week                           |
| `milestone_hit`             | P2\*     | Milestone marked complete (celebration — cap-exempt)                                                      |
| `milestone_preview`         | P2       | 24h after `milestone_hit`, bridges goal-gradient post-reward reset (see §11.5)                            |
| `goal_hit`                  | P2\*     | Goal marked complete (celebration — cap-exempt)                                                           |
| `week_completed`            | P2\*     | Weekly plan status → `completed` (celebration, leads into debrief)                                        |
| `streak_milestone`          | P2\*     | Weekly streak reaches length ∈ {4, 8, 12, 26, 52} weeks (cap-exempt)                                      |
| `streak_broken`             | P2       | Weekly streak ended — fires Monday morning with comeback framing                                          |
| `unexpected_win`            | P3       | After 3+ consecutive on-time days, random 2–6h delayed celebration from the coach                         |
| `stale_tasks`               | P3       | Mid-week local · `last_task_completed_at > 48h ago` · incomplete tasks > 0                                |

\* = cap-exempt celebration (see §8.1).

**Tier semantics**

- **P0** — High signal. Bypass daily caps and quiet hours. Reserved for `coach_reply_ready` (user-initiated) and `streak_at_risk` (loss aversion window is narrow).
- **P1** — Time-sensitive product events. Bypass per-kind caps; respect quiet hours and the global 2-per-day ceiling (§8.5).
- **P2** — Nudges and celebrations. Subject to "one P2/P3 per local day" cap and priority suppression — except celebration kinds (`milestone_hit`, `goal_hit`, `week_completed`, `streak_milestone`) which are cap-exempt because they follow explicit achievements.
- **P3** — Low-priority nudges. Fully subject to caps and suppression.

**Global ceiling.** No user ever receives more than 2 pushes in any 24h rolling window, regardless of tier. Localytics data indicates 46% of users disable push after 2–5/week from a single app (widely cited but unverified); we treat 2/day as the absolute ceiling for a wellbeing-adjacent product. See §8.5.

**Sequence-aware kinds.** `winback_step` is a multi-step sequence: each step is its own row linked by `sequence_id` and ordered by `sequence_step`. If the user becomes active mid-sequence, remaining steps are cancelled (see §7).

---

## 3. Detection architecture — outbox + dispatcher

The system uses a **transactional outbox** (`notification_jobs`) plus a **claim-based dispatcher**. Producers write rows; dispatcher drains them.

```
┌─────────────────────────────────┐         ┌──────────────────────┐
│ Event-driven producers          │         │ Time-anchored        │
│ (Nest event listeners)          │         │ producer             │
│ - roadmap.generated             │         │ (Nest cron, 15 min)  │
│ - weekly-plan.generated         │         │                      │
│ - debrief.submitted             │         │ Pre-materializes     │
│ - coach.reply.ready             │         │ next-24h jobs        │
│ - task.completed → streak eval  │         │ (incl. STO-picked    │
│ - activity event → STO recalc   │         │  daily_check_in)     │
└──────────────┬──────────────────┘         └──────────┬───────────┘
               │                                       │
               ▼                                       ▼
       ┌────────────────────────────────────────────────┐
       │      notification_jobs (outbox table)          │
       │  pending → claimed → sent / skipped / failed   │
       └────────────────┬───────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────────┐
            │ Engagement-recovery cron  │
            │ (Nest, 02:00 UTC nightly) │
            │ - streak eval             │
            │ - winback sequence start  │
            │ - coach_proactive job     │
            │ - stale_tasks             │
            └───────────────────────────┘
                        │
                        ▼
            ┌──────────────────────────┐         ┌────────────────────┐
            │ Dispatcher (Nest cron,   │────────▶│ Existing APNs      │
            │ every 1 min)             │         │ fan-out service    │
            │ - claim with SKIP LOCKED │         │ (JWT, batching,    │
            │ - re-check predicate     │         │  410 cleanup)      │
            │ - Phase A (P0/P1)        │         └────────────────────┘
            │ - Phase B (P2/P3 winner) │
            └──────────────────────────┘
```

### 3.1 Outbox table `notification_jobs`

| Column              | Type          | Notes                                                               |
| ------------------- | ------------- | ------------------------------------------------------------------- |
| `id`                | uuid          | primary key                                                         |
| `user_id`           | uuid          | indexed                                                             |
| `kind`              | text          | enum-like, see §2                                                   |
| `tier`              | smallint      | 0–3                                                                 |
| `dedup_key`         | text NOT NULL | UNIQUE; format defined in §4.4                                      |
| `scheduled_for_utc` | timestamptz   | when dispatcher should consider sending                             |
| `local_date`        | date          | user's local date for the scheduled fire                            |
| `payload`           | jsonb         | `{ teaser, reveal, cta_deeplink, kind_specific_data }`              |
| `sequence_id`       | uuid          | nullable; groups steps of a sequence                                |
| `sequence_step`     | smallint      | nullable; 1-indexed position in sequence                            |
| `experiment_id`     | text          | nullable; identifies A/B experiment this job belongs to             |
| `variant`           | text          | nullable; variant label for experiment (e.g. `a`, `b`)              |
| `status`            | text          | `pending` / `claimed` / `sent` / `skipped` / `failed` / `cancelled` |
| `claimed_at`        | timestamptz   | set when status moves to `claimed`                                  |
| `claimed_by`        | text          | dispatcher worker id                                                |
| `attempts`          | smallint      | default 0                                                           |
| `last_error`        | text          | nullable                                                            |
| `skip_reason`       | text          | nullable                                                            |
| `created_at`        | timestamptz   | default now()                                                       |
| `sent_at`           | timestamptz   | nullable                                                            |

**Indexes**

- `UNIQUE(dedup_key)`
- `(scheduled_for_utc) WHERE status = 'pending'` — partial, for dispatcher scan
- `(user_id, local_date) WHERE tier IN (2, 3)` — for Phase B grouping
- `(status, claimed_at) WHERE status = 'claimed'` — for orphan recovery
- `(sequence_id, sequence_step) WHERE sequence_id IS NOT NULL` — for sequence cancellation
- `(experiment_id, variant) WHERE experiment_id IS NOT NULL` — for measurement

### 3.2 Producers

**A. Event-driven (state changes)** — Nest listeners on existing events insert outbox rows synchronously inside the same transaction as the state change (true outbox pattern). `scheduled_for_utc` is `now()` if within waking hours, else next morning local.

| Event source                          | Inserts kind(s)                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roadmap.generated`                   | `roadmap_generated`                                                                                                                                  |
| `weekly-plan.generated`               | `weekly_plan_published`; cancels pending `plan_not_generated`                                                                                        |
| `weekly-plan.completed`               | `week_completed`                                                                                                                                     |
| `milestone.completed`                 | `milestone_hit`                                                                                                                                      |
| `goal.completed`                      | `goal_hit`                                                                                                                                           |
| `debrief.submitted`                   | (none — closes loop)                                                                                                                                 |
| coach reply persisted                 | `coach_reply_ready`                                                                                                                                  |
| `task.completed`                      | streak evaluation (extend / create), may emit `streak_milestone`; schedules possible `unexpected_win`; cancels pending `winback_step`s for this user |
| `user.activity` (foreground, session) | Touches `profiles.last_active_at` and writes to `user_activity_events` for STO                                                                       |

**B. Time-anchored (scheduler)** — A Nest cron runs every 15 min. It pre-materializes the next 24h of due jobs per user using the predicates in §2. Pre-materialization (vs computing at fire time) means:

- Missed ticks self-heal (job already in outbox).
- Ops can inspect what _will_ fire.
- Dispatch logic stays simple: "drain pending where due."

Scheduler also picks `daily_check_in.scheduled_for_utc` using the user's STO active hour (§6).

**C. Engagement-recovery** — Nightly Nest cron at 02:00 UTC scans denormalized state and inserts:

- `stale_tasks` / `streak_at_risk` (if today's task still incomplete at the user's local evening)
- `winback_step` jobs for users crossing dormancy thresholds (§7)
- Calls the `coach_proactive` reasoning job for eligible users (§11)
- Evaluates streaks and writes `streak_broken` jobs for breaks detected overnight

### 3.3 Dispatcher (every 1 min)

Atomic claim using `FOR UPDATE SKIP LOCKED`:

```
UPDATE notification_jobs
   SET status = 'claimed',
       claimed_at = now(),
       claimed_by = $worker_id,
       attempts = attempts + 1
 WHERE id IN (
       SELECT id FROM notification_jobs
        WHERE status = 'pending'
          AND scheduled_for_utc <= now()
        ORDER BY tier, scheduled_for_utc
        FOR UPDATE SKIP LOCKED
        LIMIT 500)
RETURNING *;
```

Then in two phases:

**Phase A — P0/P1**: send immediately. On APNs success → `sent`. On failure → revert to `pending` (retry up to 3 attempts, then `failed`).

**Phase B — P2/P3 winner selection**:

1. Group claimed **non-celebration** P2/P3 jobs by `(user_id, local_date)`. Celebration kinds (`milestone_hit`, `goal_hit`, `week_completed`, `streak_milestone`) skip grouping and send directly.
2. Skip the entire group if any P0/P1 was sent for that user in the last 6h.
3. Otherwise pick ONE winner per group using explicit priority:
   `streak_broken > implementation_intention > daily_check_in > week_completion_gap > milestone_countdown_1 > milestone_preview > milestone_countdown_3 > milestone_countdown_7 > goal_deadline_countdown_1 > goal_deadline_countdown_7 > goal_deadline_countdown_14 > stale_tasks > winback_step > unexpected_win`

   `implementation_intention` ranks second only to `streak_broken` because it fires at the exact moment the user committed to — respecting their self-prediction is the mechanic's entire leverage.

4. Losers → `skipped`, `skip_reason = 'priority_suppressed'`. Winner → re-check predicate, then send.

**Re-check at dispatch time** is mandatory. A `daily_check_in` scheduled for the user's active hour may be invalidated by overnight task completion. A `streak_at_risk` must re-verify the streak and today-incomplete predicate. Predicate functions live alongside producers and are reused by the dispatcher.

**Orphan recovery**: any row stuck in `claimed` for > 5 min → reset to `pending`. Handles dispatcher crash between claim and APNs.

**Sequence cancellation**: when `task.completed` fires for a user with pending `winback_step` rows, update all remaining steps in that `sequence_id` to `cancelled`, `skip_reason = 'user_returned'`.

### 3.4 Why this architecture

| Alternative                  | Verdict                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| pg_cron + edge functions     | Scatters logic across DB + edge + Nest. Reject.                 |
| BullMQ                       | Add later if retry/backpressure become real; not needed for v1. |
| Temporal                     | Overkill for this domain.                                       |
| DB webhooks for state events | Wrong layer — duplicates already-emitted Nest events.           |
| Scanning a wide SQL view     | Hard to index, easy to get subtly wrong. Outbox is simpler.     |

**pg_cron is used only as observability**, not as the scheduler: every 10 min it counts pending jobs older than 10 min and inserts an alert row. Recovery from a Nest crash is the responsibility of the process manager (Fly machines / PM2 / systemd), since polling a crashed Nest endpoint helps no one.

---

## 4. Detailed rules

### 4.1 Timezone

- All time-anchored kinds **require** `profiles.timezone` (IANA name, e.g. `Europe/Paris`).
- If null: skip the job, `skip_reason = 'no_timezone'`. iOS prompts the user to sync timezone on next foreground.
- Quiet hours and local-time arithmetic use `AT TIME ZONE profiles.timezone` (DST-safe).

### 4.2 `plan_not_generated` race protection

The race: `plan_not_generated` (Monday 08:00) could fire seconds before `weekly_plan_published` arrives, telling the user "no plan yet" then "plan ready."

Resolution:

1. **Monday 00:05 local** — scheduler triggers auto-generation for active goals lacking a current-week plan AND inserts a sentinel row in `notification_jobs` with `status = 'skipped'`, `skip_reason = 'grace'`, `dedup_key = plan_generation_grace:<user_id>:<week_start_date>`, valid until Monday 09:00 local.
2. **Monday 08:00 local** — `plan_not_generated` predicate requires: (a) current-week plan missing, (b) no unexpired grace marker, (c) no pending `weekly_plan_published` job for this week.
3. The `weekly-plan.generated` listener also actively cancels any pending `plan_not_generated` job by updating it to `skipped` with `skip_reason = 'superseded'`.

### 4.3 `weekly_debrief_prompt` scope

Without scoping, this could re-prompt for every historical plan with no debrief.

- Trigger only for the **most recent** plan per goal (`ORDER BY week_number DESC LIMIT 1 per goal`).
- Plan must satisfy: `status = 'completed'` OR `expected_end_date ∈ {today, today-1}` local.
- After 7 days past `expected_end_date` with still no debrief: `skipped`, `skip_reason = 'debrief_window_expired'`. Never re-trigger.

### 4.4 Dedup keys (all non-null, UNIQUE)

| Kind                       | Dedup key                                               |
| -------------------------- | ------------------------------------------------------- |
| `coach_reply_ready`        | `coach_reply_ready:<message_id>`                        |
| `roadmap_generated`        | `roadmap_generated:<roadmap_id>`                        |
| `weekly_plan_published`    | `weekly_plan_published:<plan_id>`                       |
| `plan_not_generated`       | `plan_not_generated:<user_id>:<week_start_date_iso>`    |
| `weekly_debrief_prompt`    | `weekly_debrief_prompt:<plan_id>`                       |
| `milestone_countdown`      | `milestone_countdown:<milestone_id>:<7\|3\|1>`          |
| `goal_deadline_countdown`  | `goal_deadline_countdown:<goal_id>:<14\|7\|1>`          |
| `daily_check_in`           | `daily_check_in:<user_id>:<YYYY-MM-DD-local>`           |
| `implementation_intention` | `implementation_intention:<task_id>:<YYYY-MM-DD-local>` |
| `milestone_preview`        | `milestone_preview:<milestone_id>`                      |
| `week_completion_gap`      | `week_completion_gap:<plan_id>:<YYYY-MM-DD-local>`      |
| `stale_tasks`              | `stale_tasks:<user_id>:<YYYY-MM-DD-local>`              |
| `streak_at_risk`           | `streak_at_risk:<user_id>:<goal_id>:<week_start_iso>`   |
| `streak_broken`            | `streak_broken:<user_id>:<broken_streak_id>`            |
| `streak_milestone`         | `streak_milestone:<user_id>:<length>`                   |
| `milestone_hit`            | `milestone_hit:<milestone_id>`                          |
| `goal_hit`                 | `goal_hit:<goal_id>`                                    |
| `week_completed`           | `week_completed:<plan_id>`                              |
| `unexpected_win`           | `unexpected_win:<user_id>:<YYYY-MM-DD-local>`           |
| `coach_proactive`          | `coach_proactive:<user_id>:<YYYY-MM-DD-local>`          |
| `winback_step`             | `winback_step:<sequence_id>:<step>`                     |

### 4.5 Late jobs

If `scheduled_for_utc` is more than 2h in the past at dispatch time → `skipped`, `skip_reason = 'stale'`. Avoid firing hours-late nudges that no longer make sense.

### 4.6 Payload shape

Copy generation lives in a separate module; this design fixes the payload schema it consumes and the schema the APNs layer renders.

```
payload = {
  teaser: string,                 // lock-screen title/body; may be curiosity-gap
  reveal: string?,                // optional in-app expansion
  cta_deeplink: string,           // e.g. `milesto://task/<id>` or `milesto://coach/reply/<id>`
  why_deeplink: string,           // `milesto://notif/why/<job_id>` — every push links to "why did I get this?"
  kind_specific: { ... },         // kind-typed details, e.g. { streak_length: 7, proportion_remaining: 0.15 }
  coach: { id: uuid, persona: 'drill' | 'standard' | 'gentle' },  // for voice
  memory_hooks: {                 // optional — populated for coach-voiced pushes, used by copy generation
    user_motivation_quote: string?,   // user's own onboarding "why" (verbatim)
    if_then: string?,                 // user's captured implementation intention
    recent_win: string?               // last completed task or milestone name
  }
}
```

Copy generation reads `coach.persona`, `kind_specific`, and `memory_hooks` and returns the final `teaser` / `reveal` strings. APNs payload uses `teaser` as `alert.body`, stores `reveal` + `cta_deeplink` + `why_deeplink` + `job_id` in `apns-custom`. iOS surfaces `why_deeplink` via a category action ("Why this notification?") so the autonomy affordance is one tap from the lock screen.

---

## 5. Streaks

Streaks are the single highest-leverage retention mechanic in goal-tracking apps — _and_ the mechanic most prone to backfire for wellbeing-adjacent products. This section defines a model designed to preserve motivation without inducing anxiety, grounded in the research Duolingo cites (Kivetz et al. "slack in goal pursuit") and the self-determination-theory critique of daily streaks for long-horizon goals.

### 5.1 Weekly, not daily

**Decision: streaks are weekly, not daily.** A daily streak ("did the user complete a task today?") misaligns with Milesto's product — goals like "launch a company" or "write a novel" are multi-month pursuits with legitimate zero-task days. Daily streaks punish planned rest, vacations, and real-life events, producing anxiety without commensurate progress signal.

A streak is **per goal** (one goal, one streak). Definition:

> A streak week is a local ISO week (Mon–Sun) in which the user completed ≥ 1 `weekly_task` for that goal. Weekly streak length is the count of consecutive such weeks.

This aligns the streak unit with the plan unit (weekly_plan), respects user pacing, and makes "keeping the streak" a reasonable ask even during slump periods.

### 5.2 `user_streaks` table

| Column                    | Type        | Notes                                                    |
| ------------------------- | ----------- | -------------------------------------------------------- |
| `id`                      | uuid        | PK                                                       |
| `user_id`                 | uuid        | indexed                                                  |
| `goal_id`                 | uuid        | FK goals                                                 |
| `current_weeks`           | int         | consecutive weeks with ≥ 1 task completed                |
| `longest_weeks`           | int         | historical best (not reset on break)                     |
| `last_extended_week`      | date        | ISO week start (Monday) of the last extending completion |
| `last_extended_at`        | timestamptz |                                                          |
| `freeze_tokens`           | smallint    | default 1 (see §5.4)                                     |
| `freezes_last_granted_at` | timestamptz | for monthly auto-replenish                               |
| `created_at`              | timestamptz | default now()                                            |

UNIQUE `(user_id, goal_id)`.

### 5.3 Streak evaluation

Triggered by `task.completed`:

1. Fetch the streak row for `(user_id, goal_id)`.
2. Compute `this_week = ISO week of completed_at in user tz`.
3. If `last_extended_week = this_week`: no-op.
4. Else if `last_extended_week = this_week - 1 week`, or freeze tokens absorb the gap: `current_weeks += 1`, set `last_extended_week = this_week`, update `longest_weeks`.
5. Else: weekly streak broken — insert `streak_broken` job for next Monday morning, reset `current_weeks = 1`.
6. If new `current_weeks` ∈ {4, 8, 12, 26, 52}: insert `streak_milestone` job.

A nightly Sunday-evening job in the engagement-recovery cron handles the case where a user completes _no_ tasks all week (no `task.completed` trigger): if `last_extended_week < this_week` and `this_week` is ending, mark streak as broken.

### 5.4 Freeze tokens (auto-replenishing)

Research context: Duolingo publicly credits streak freezes with ~21% churn reduction for at-risk users (widely cited but unverified). The stronger signal is that _two_ equipped freezes outperform one (+0.38% DAU, per Duolingo's own experiments) — a counterintuitive finding: more protection = more engagement, not less.

Milesto v1:

- **Start with 1 freeze** at streak creation.
- **Auto-replenish: 1 token per calendar month, max 2 simultaneous.** No effort required to earn — replenishment is an _autonomy-preserving_ gift, not a reward for compliance.
- **Auto-consumed** by evaluation when a gap week is detected.
- Visible in iOS UI with a plain-language label ("Skip weeks available: 2").

### 5.5 `streak_at_risk` push

- Fires at the user's local **Sunday evening** STO window (not daily — weekly streaks require weekly at-risk framing).
- Predicate: `current_weeks ≥ 2` AND `last_extended_week < this_week` AND tasks remain for this_week AND `freeze_tokens = 0`.
- P0 tier — bypasses daily cap, bypasses quiet hours.
- Dedup key `streak_at_risk:<user_id>:<goal_id>:<week_start>`.

### 5.6 `streak_broken` push

- Fires Monday morning of the first week after the break, in the user's STO active hour.
- Framing: comeback, never shame. Copy generation is gated — see §8.6 ethical copy constraints.

### 5.7 Anti-pattern guardrails

- **Streaks do not appear in push copy for the first 60 days** of a user's tenure. The habit must form before the loss-aversion hook is introduced; premature streak framing puts a number on behavior before the behavior is self-sustaining. In-app streak visibility is fine from day 1 — copy mention in pushes is what's deferred.
- Do not lock users out of content when a streak breaks. Streak is a retention accelerator, not a paywall.
- Do not show `streak_at_risk` if `current_weeks < 2` — a 1-week "streak" isn't worth the anxiety.
- Never show `streak_broken` on a week the user actively paused the goal in-app.
- Streak length is never the primary retention KPI — weekly task completion rate is (§9.3). This prevents optimizing the app toward "people are afraid to lose their streak" rather than "people are making progress."

---

## 6. Send-time optimization (STO)

The original design deferred STO to v2 with a fixed 08:00 local for `daily_check_in`. 08:00 is one of the worst slots: users are commuting, half-awake, or on autopilot. This is a v1 feature.

### 6.1 `user_activity_events` table

An append-only log — required for STO and useful for streak eval, coach memory, and future personalization.

| Column        | Type        | Notes                                                                  |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| `id`          | bigserial   | PK                                                                     |
| `user_id`     | uuid        | indexed                                                                |
| `kind`        | text        | `foreground` / `task_completed` / `message_sent` / `debrief_submitted` |
| `occurred_at` | timestamptz | indexed                                                                |
| `local_hour`  | smallint    | 0–23 at user's timezone (denormalized at write-time)                   |

Index `(user_id, occurred_at DESC)`, partial `(user_id, local_hour) WHERE occurred_at > now() - interval '30 days'`.

### 6.2 Picking the active hour

For each user, once per day (in the 02:00 UTC engagement cron):

1. Query the last 14 days of `user_activity_events`.
2. Build histogram of `local_hour` counts.
3. Active hour = argmax of histogram, with tie-break to the later hour.
4. If fewer than 7 events in the window: fallback to coach-persona default (drill: 07:00, standard: 19:00, gentle: 20:00).
5. Store in `profiles.sto_active_hour smallint`.

**Why 19:00 fallback, not 08:00.** Goal apps empirically see strongest engagement in the evening wind-down window. Morning pushes compete with commute/routines. Until we have per-user data, evening is a better prior than morning. The drill persona's 07:00 default reflects its intentional friction.

### 6.3 STO consumers

- `daily_check_in.scheduled_for_utc` uses `sto_active_hour` at scheduler time.
- `streak_at_risk` uses `max(sto_active_hour, 18)` — never before 18:00 local (we want the evening risk window).
- `coach_proactive` uses `sto_active_hour`.
- `weekly_debrief_prompt` keeps its fixed 19:00 — debriefs are event-anchored.

### 6.4 Update cadence

`sto_active_hour` is recomputed daily. To avoid reassigning a user's check-in time every night (whiplash), only update if the new argmax differs from stored by ≥ 2 hours, or if the stored value is > 14 days old.

---

## 7. Winback sequences

The original design had a single `inactivity_nudge`. Sequenced winback is the documented best practice for resurrection. One push may be ignored; a cadenced sequence with varied framing converts materially better.

### 7.1 Trigger

A user with no `user_activity_events` for 24h locks into the sequence. Sequence start is scheduled for the user's STO hour on day 1. All sequence rows are inserted at once with a shared `sequence_id`.

### 7.2 Steps

| Step | Day offset | Tier | Framing                                                                                        |
| ---- | ---------- | ---- | ---------------------------------------------------------------------------------------------- |
| 1    | +1         | P3   | Soft — "Your coach is ready when you are."                                                     |
| 2    | +3         | P2   | Memory callback — coach-voiced, quotes the user's onboarding "why" (see §11.3)                 |
| 3    | +7         | P1   | Loss-framed — "Your roadmap is paused. Resume to keep milesto."                                |
| 4    | +14        | P2   | Comeback offer — "Reset this week. No judgment."                                               |
| 5    | +30        | P1   | **Break-up** — "I'll stop messaging unless you come back. Tap to stay in." Autonomy-returning. |

Tier escalation is deliberate: step 3's P1 bypasses per-kind caps because by day 7 the user is at highest churn risk. The day-30 break-up push is the documented highest-converting single message in published winback data — it works because it _returns autonomy_ rather than applying more pressure (SDT-aligned). If the user doesn't respond to the break-up push within 14 days, mark them `paused` in `notif_preferences`; the system sends no further pushes until they re-open the app.

Step copy uses coach voice and memory hooks throughout. Step 2's memory callback is the most important single message in the sequence.

### 7.3 Cancellation

Any `user.activity` event on a user with pending `winback_step` jobs cancels all remaining steps in the same `sequence_id` (status → `cancelled`, `skip_reason = 'user_returned'`). The `task.completed` handler already walks this.

### 7.4 Re-entry cooldown

After a completed or cancelled sequence, the same user cannot enter another winback sequence for 30 days — prevents loop churn if they re-lapse briefly.

### 7.4.1 Auto-pause after break-up non-response

If the day-30 break-up push fires and the user does not re-engage within 14 days, set `notif_preferences.global.paused_until = now + 90 days`. No pushes until explicit user re-engagement. Removes the dark-pattern risk of infinite winback; escalating past day 30 is well-documented to drive uninstalls without reactivation lift.

### 7.5 Opt-out

Users who disable notifications mid-sequence: remaining steps skip with `skip_reason = 'user_disabled'`. Users who opt out of winback specifically (via `notif_preferences`) never enter the sequence.

---

## 8. Guardrails

### 8.1 Frequency caps

- One non-celebration P2/P3 push per user per local day (winner-selection in §3.3 Phase B).
- Celebration kinds (`milestone_hit`, `goal_hit`, `week_completed`, `streak_milestone`) are cap-exempt: they follow explicit achievements and reinforce the loop.
- P0/P1 unrestricted by daily cap; per-kind dedup prevents spam.

### 8.2 Quiet hours

- New profile fields: `notif_quiet_start smallint`, `notif_quiet_end smallint` (0–23, local hours).
- Defaults by coach persona: drill = 06/23, standard = 07/22, gentle = 08/21.
- Producers schedule jobs **after** quiet-hours end if the natural fire time falls inside the window.
- `coach_reply_ready` and `streak_at_risk` ignore quiet hours.

### 8.3 Opt-out

- `profiles.notif_enabled boolean default true` — master switch; dispatcher skips with `skip_reason = 'user_disabled'`.
- `profiles.notif_preferences jsonb` — per-kind toggles; e.g. `{ "stale_tasks": { "enabled": false } }`.
- iOS permission prompt is deferred until after the first coach-message reveal (peak positive affect), not at app launch. See §9.4.

### 8.4 Dynamic fatigue (replaces fixed backoff)

The original design used "3 consecutive ignored → pause 7 days." Too blunt. Retention-led apps scale frequency dynamically based on rolling engagement.

**Open definition.** A job is **opened** if any device delivery has `opened_at IS NOT NULL` within 12h of send. Otherwise **ignored**. Aggregated at job level, not per-token.

**Per-(user, kind) rolling open rate.**

- Compute over last 10 sends per `(user_id, kind)`.
- `open_rate ≥ 0.40` → eligible for one bonus nudge per week for that kind.
- `0.15 ≤ open_rate < 0.40` → normal frequency.
- `open_rate < 0.15` → halve frequency (one every other week instead of weekly; one per day not applicable since all P2/P3 are already per-day max).
- `open_rate < 0.05` AND ≥ 10 sends → auto-set `notif_preferences[kind].paused_until = now + 14 days`, record reason.

**Global fatigue floor.** If a user's total send count over 7 days exceeds 10, all non-P0 pushes for the next 24h are suppressed regardless of per-kind rate.

**Aversion signal (distinct from fatigue).** If app-foreground events in the 24h _after_ an unopened push are lower than the user's rolling baseline, this indicates aversion, not ambient fatigue. Track rolling `foreground_count_24h_after_send / baseline` per `(user_id, kind)`. If the ratio stays below 0.7 for 5 consecutive sends of the same kind, auto-pause that kind for 21 days. This is a leading indicator of uninstall risk that the open/ignore signal alone does not capture.

### 8.5 Global hard cap (2/day)

No user ever receives more than **2 pushes in any rolling 24h window**, across all tiers including P0. This is an ethics-motivated ceiling, not a performance optimization: the literature on notification volume vs uninstall rate for wellbeing apps is consistent that frequency itself is the strongest churn predictor at 3+/day.

Implementation: dispatcher checks `count(sent_at > now - interval '24h' AND user_id = $u)` before sending. If ≥ 2, the job is re-scheduled to the next gap in the 24h window. If the rescheduled slot would be > 2h late (per §4.5), the job is `skipped` with `skip_reason = 'global_ceiling'`.

### 8.6 Ethical copy constraints (enforced in copy generation, asserted here)

These are enforced by the copy-generation module; listed here because the dispatcher and producers depend on them being true.

- **No shame-based framing** in any push. Drill-sergeant mode is demanding, never disappointed.
- **Streak-broken copy uses comeback framing** — never moral failure, never quantified loss beyond what the user already knows.
- **No synthetic urgency.** Countdowns must reference real dates from `goals.target_date` / `milestones.target_date`.
- **No invented social proof.** Milesto has no cohort; phantom peers are prohibited.
- **No guilt-as-coach.** The coach celebrates effort and redirects gently; "I'm disappointed in you" is banned copy.
- **The "why this notification?" affordance is present on every push** (via `why_deeplink` in payload, surfaced as an iOS category action). Autonomy-preserving transparency is non-negotiable.

---

## 9. Experimentation & measurement

Retention systems without measurement are cargo culting. Any copy, timing, or frequency decision must be A/B-testable.

### 9.1 `notification_experiments` table

| Column         | Type        | Notes                                   |
| -------------- | ----------- | --------------------------------------- |
| `id`           | text        | PK, e.g. `streak_at_risk_copy_v1`       |
| `kind`         | text        | notification kind under test            |
| `variants`     | jsonb       | array of `{label, weight, description}` |
| `status`       | text        | `draft` / `running` / `concluded`       |
| `started_at`   | timestamptz |                                         |
| `concluded_at` | timestamptz | nullable                                |
| `winner`       | text        | nullable variant label                  |

Variant assignment is deterministic on `hash(user_id || experiment_id)` to keep users in one arm.

### 9.2 Measurement stack

`notification_deliveries` (§10) captures open/dismiss/received. Jobs carry `experiment_id`/`variant`. Core metrics:

- **Open rate** — opened within 1h / sent.
- **CTR to app** — any app foreground within 1h of send / sent.
- **Task completion lift** — P2/P3: task completion in the 24h after send, variant vs control.
- **Retention lift** — D1/D7 return for users in arm vs control.
- **Uninstall proxy** — APNs 410 rate per variant (can't measure uninstall directly on iOS, but token invalidation correlates).

### 9.3 North-star retention metrics

Measured weekly, shared in the product dashboard:

- D1 / D7 / D30 user return.
- Weekly task completion rate.
- Average weekly streak length.
- Winback sequence conversion rate (% who return within 14 days of entering a sequence).
- Per-kind open rate and unsubscribe rate.

### 9.4 Permission-prompt timing

Do **not** request iOS notification permission at app launch. The grant rate is highest after a high-affect moment. v1 triggers:

1. First coach-message reveal after onboarding.
2. Right after `roadmap_generated` first-ever display.
3. Fallback: first app foreground after 24h if not yet requested.

`profiles.notif_permission_requested_at` and `notif_permission_status` track state. iOS allows exactly one system prompt; we instrument a pre-prompt explainer screen to minimize hard-denies.

---

## 10. Schema additions

### New columns on existing tables

- `profiles.last_active_at timestamptz` — touched on every user-initiated action.
- `profiles.notif_enabled boolean default true`
- `profiles.notif_quiet_start smallint` (persona-defaulted at signup)
- `profiles.notif_quiet_end smallint`
- `profiles.notif_preferences jsonb default '{}'`
- `profiles.notif_permission_status text` — `not_requested` / `granted` / `denied` / `provisional`
- `profiles.notif_permission_requested_at timestamptz`
- `profiles.sto_active_hour smallint` — STO output, default NULL (falls back to persona default until computed)
- `profiles.tenure_start_date date` — used to gate "streaks in copy" (§5.7) until 60 days elapsed.
- `weekly_tasks.completed_at timestamptz nullable` — set when `is_completed → true`, cleared when reverted. CHECK `(is_completed = true) = (completed_at IS NOT NULL)`.
- `weekly_plans.expected_end_date date` — `week_start_date + 6`.
- `milestones.target_date date` — absolute, computed from `goals.target_date` + relative `target_week` at roadmap generation time.
- `goals.user_motivation_quote text` — free-text user "why" captured at onboarding, quoted verbatim by coach-voiced pushes (§11.3).

### New tables

- `notification_jobs` — §3.1.
- `notification_deliveries(job_id, device_token, apns_response, sent_at, received_at, opened_at, dismissed_at)` — populated by iOS telemetry endpoints.
- `notification_system_alerts(id, kind, payload, created_at)` — populated by pg_cron observer.
- `user_streaks` — §5.2 (weekly).
- `user_activity_events` — §6.1.
- `notification_experiments` — §9.1.
- `weekly_task_intentions(task_id uuid PK, day_of_week smallint, local_hour smallint, location_label text nullable, captured_at timestamptz)` — user-supplied if-then plans (§11.4).

### Activity timestamp touch points (backend behavior, no new endpoints)

| Action                                     | Touches                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Insert into `messages`                     | `profiles.last_active_at`, `user_activity_events`                                                     |
| Toggle `weekly_tasks.is_completed` to true | `completed_at`, `profiles.last_active_at`, `user_activity_events`, streak eval, sequence cancellation |
| Insert into `debriefs`                     | `profiles.last_active_at`, `user_activity_events`, transition plan to `completed`                     |
| Roadmap generation completes               | populate `milestones.target_date`                                                                     |
| App foreground (iOS)                       | `user_activity_events`                                                                                |

### New endpoints (iOS telemetry)

- `POST /api/notifications/delivery/received` — called by `UNNotificationServiceExtension.didReceive`.
- `POST /api/notifications/delivery/opened` — called by `UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:)`.
- `POST /api/activity/foreground` — called on app foreground; writes to `user_activity_events`.

### "Last progress" computed on demand

We do **not** denormalize `goals.last_progress_at`. Compute on demand in predicates:

```
SELECT max(wt.completed_at)
  FROM weekly_tasks wt
  JOIN weekly_plans wp ON wt.weekly_plan_id = wp.id
 WHERE wp.goal_id = $1 AND wt.completed_at IS NOT NULL;
```

Indexed by `weekly_tasks(completed_at) WHERE completed_at IS NOT NULL`. Reconsider denormalization only if profiling shows a hot path.

### RLS

- `notification_jobs`, `notification_deliveries`, `notification_system_alerts`, `user_activity_events`, `notification_experiments` — admin-only read; service-role writes.
- `user_streaks` — user-readable (their own rows) for UI display; service-role writes.
- Users see notification preferences via `profiles` only.

---

## 11. Personalization — coach as character

Coaches are Milesto's core differentiator. The notification system treats the coach as an **author**, not as a flag.

### 11.1 Persona-driven parameters

| Parameter                   | Drill                | Standard             | Gentle                |
| --------------------------- | -------------------- | -------------------- | --------------------- |
| Inactivity threshold (days) | 2                    | 4                    | 7                     |
| Quiet-hours default         | 06 / 23              | 07 / 22              | 08 / 21               |
| STO fallback hour           | 07:00                | 19:00                | 20:00                 |
| Winback sequence pacing     | days 1, 2, 5, 10, 30 | days 1, 3, 7, 14, 30 | days 2, 5, 10, 21, 45 |
| `streak_at_risk` threshold  | weeks ≥ 2            | weeks ≥ 2            | weeks ≥ 3             |

### 11.2 Coach-voiced copy

All pushes where `coach` is populated in the payload are rendered by a copy-generation module that reads `coach.persona` and produces a message in that voice. System-voiced pushes (roadmap_generated, weekly_plan_published) stay neutral but may optionally include a coach line in `reveal`.

Copy generation **must set the iOS notification sender to the coach's name**, not "Milesto" — Duolingo-style character branding is the documented highest-impact single copy change. Users chose the coach; the coach speaks.

### 11.3 Memory callback — quote the user back to themselves

The most effective single notification in the taxonomy is one that quotes the user's own words back at them at a slump moment. Evidence base: commitment-and-consistency (Cialdini) + Zeigarnik + SDT autonomy-preserving (it's their voice, not the system's).

Implementation:

- During onboarding, capture the user's _why_ in their own words (free-text answer to "Why does this goal matter to you?") and store verbatim in `goals.user_motivation_quote text`.
- During weekly-plan publication, capture the user's if-then commitment per task (see §11.4).
- `memory_hooks.user_motivation_quote` and `memory_hooks.if_then` are populated into the payload for any coach-voiced push where they apply. Copy generation selects which hook to reference based on kind:
  - `winback_step` (step 2, day 3) — mandatory memory_quote reference.
  - `streak_broken` — memory_quote if available, else comeback framing without it.
  - `coach_proactive` — memory_quote or if_then, chosen by LLM.
  - `stale_tasks` — if_then if available.

### 11.4 Implementation intentions — capture and echo

The single highest-leverage evidence-based mechanic available. Gollwitzer & Sheeran 2006 meta-analysis across 94 studies (n > 8,000) reports d = 0.65 for if-then plans on goal achievement; Sheeran & Gollwitzer 2024 update across 642 tests reconfirms the effect size. This is foundational goal-psychology research, not a product-growth hack.

Flow:

1. At weekly-plan publication, the iOS app prompts optionally per task: _"When will you do this? Where?"_ Response is captured as a structured if-then (`day`, `hour`, `location_label`).
2. Stored in new `weekly_task_intentions(task_id, day_of_week, local_hour, location_label)`.
3. For each captured intention, the time-anchored producer (§3.2B) schedules an `implementation_intention` job at that exact local moment.
4. Predicate at dispatch: task still incomplete at the captured moment.
5. Copy is if-then-formatted: _"It's Tuesday 8pm at your desk — Task 1 is waiting."_ This formatting itself is what carries the Gollwitzer effect; do not reword imperatively.

If-then pushes **override STO** — the user specified the time. This is the one kind where we trust the user's intention over the model.

### 11.5 Proportional progress framing — goal-gradient

Kivetz, Urminsky & Zheng 2006 showed that _proportional_ remaining distance accelerates goal pursuit more than absolute distance. Countdown kinds must expose `proportion_remaining` in `kind_specific`:

- `milestone_countdown_7/3/1`: include `{ proportion_complete, days_remaining, milestone_name }`.
- `goal_deadline_countdown`: same shape.

Copy generation prefers proportion-first framing: _"You're 85% through Milestone 2 — 3 days left"_ beats _"3 days until Milestone 2 deadline."_

### 11.6 `milestone_preview` — bridging goal-gradient reset

Kivetz et al.'s less-famous finding: motivation drops to baseline immediately after reward. The reset is measurable. Counter: within 24h of a `milestone_hit`, surface the next milestone as already-in-progress.

- Trigger: 24h after `milestone_hit` event.
- Predicate: a subsequent milestone exists for the same goal; not already complete.
- Payload includes `{ next_milestone_name, weeks_available, any_prep_already_done }` — populating the third field establishes endowed progress.
- Coach-voiced.

### 11.7 Task-difficulty escalation

An incomplete high-difficulty task at week > 50% upgrades that user's `stale_tasks` job from P3 → P2 (still subject to winner selection).

### 11.8 `coach_proactive` push

A nightly LLM-reasoning job, gated to run for eligible users (signals: missed day, debrief emotional content, milestone pressure, unusually high task difficulty this week). Reads recent behavior, decides whether to surface a proactive message, and — if yes — inserts a `coach_proactive` job for the next STO slot. The job payload carries the generated message directly (no copy-generation re-run), but memory hooks are populated so the LLM can use them.

Gating matters: this push can feel magical or invasive depending on frequency. Cap: ≤ 2 per user per week.

FAccT 2024 parasocial-attachment research specifically flags mid-intensity relationship-seeking AI as producing maximal attachment without commensurate psychosocial benefit. The `coach_proactive` push sits precisely on this line. Guardrails: never generate a message that implies the coach is disappointed, lonely, or affected by the user's absence. The coach is a tool, and must be framed as useful, not emotionally present.

### 11.9 Ethical constraints (enforced system-wide)

Milesto is wellbeing-adjacent. Tactics that work for dating or social apps can be actively harmful here. Enforced across producers, dispatcher, and copy generation:

- **No shame-based copy.** Persona voice never blames or shames on missed goals.
- **Streak breaks default to comeback framing**, not loss.
- **No false urgency** — deadline countdowns use real `goals.target_date`, never synthetic countdowns.
- **No fake social proof** — no "1000 others completed this today" unless literally true and relevant.
- **No phantom-emotional coach copy** — see §11.8.
- **Variable reward lives in content, not in schedule.** Push _frequency_ must be predictable; only the _content_ (what the coach says) may be unpredictable. Variable-ratio schedules on prompt timing are casino mechanics; they are prohibited.
- **Every push includes a "why am I getting this?" affordance** via `why_deeplink` (see §4.6 and §8.6).
- **Easy opt-out**, always. Per-kind toggles visible in settings.

---

## 12. Failure modes & how they're handled

| Failure                                       | Handling                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| User has no timezone                          | Skip with `skip_reason = 'no_timezone'`; iOS re-syncs on foreground                                                  |
| Device token invalidated (APNs 410)           | Existing handler scrubs it                                                                                           |
| Dispatcher crashes mid-batch                  | Pre-materialized rows survive; orphan-recovery resets `claimed` rows after 5 min                                     |
| Dispatcher missed many ticks                  | Pending rows still due; jobs > 2h late marked `stale`                                                                |
| User completes all tasks overnight            | Dispatch-time predicate re-check skips `daily_check_in`                                                              |
| User disables notifications                   | Dispatcher skips with `skip_reason = 'user_disabled'`                                                                |
| Duplicate event firing                        | `UNIQUE(dedup_key)` rejects the second insert                                                                        |
| Two dispatcher workers race                   | `FOR UPDATE SKIP LOCKED` ensures each row claimed by one worker                                                      |
| Server restart mid-batch                      | Rows remain `pending` (or recover from `claimed`); next tick resumes                                                 |
| `plan_not_generated` races publish            | Grace marker + active cancellation by `weekly-plan.generated` listener                                               |
| Multi-device "ignored" ambiguity              | Aggregated to job level: ignored only if no device opened in 12h                                                     |
| Historical plan never debriefed               | 7-day window then `skipped` permanently                                                                              |
| Streak evaluation missed `task.completed`     | Nightly engagement cron re-evaluates all active streaks                                                              |
| User returns mid-winback-sequence             | Pending steps cancelled by `user.activity` event                                                                     |
| STO active hour insufficient data             | Fall back to coach-persona default                                                                                   |
| Experiment variant assigned to opted-out user | Standard variant never fires; job `skipped` like any other                                                           |
| Coach-proactive LLM fails                     | No job inserted; engagement cron logs and moves on                                                                   |
| User never provided `user_motivation_quote`   | Memory-callback pushes fall back to non-quote copy; winback step 2 degrades gracefully to step 1 voice               |
| User did not capture an if-then for a task    | No `implementation_intention` job scheduled for that task; normal `daily_check_in` flow applies                      |
| Global 2/day ceiling suppresses a P0          | Rare but possible if two P0s fire same window. Latest P0 wins; earlier P0 is rescheduled then `skipped` if > 2h late |
| User hits aversion threshold (§8.4)           | Kind auto-paused 21 days; logged for observability dashboard                                                         |
| User bounces off day-30 break-up push         | 90-day global pause (§7.4.1)                                                                                         |

---

## 13. Open questions / future work

- **Smart-push bandit ranking** — Duolingo's KDD 2020 paper describes a sleeping-recovering bandit over notification templates with reward = engagement within 2h, reportedly ~5–8% lift over random. Revisit once we have ≥ 3 months of delivery data and ≥ 10k active users.
- **Per-user response-latency learning** — replace the fixed 12h ignored-window with a per-user rolling response latency. Requires ≥ 30 delivery events per user.
- **Per-user emotional register inference** — adjust voice by _user-specific_ response patterns, not just chosen persona.
- **Calendar integration** — detect personal-event / illness days to suppress `streak_broken` and winback sequences on legitimate absence (§5.7 flagged this but implementation is out of v1 scope).
- **Intention capture at task-creation time, not plan-publication time** — ask for if-then as each task is dragged into the week, for higher completion of the intention-capture itself.
- **Rich / interactive notifications** — iOS category actions ("Mark done", "Snooze") for `daily_check_in` and `implementation_intention`. Low-lift; deferred only for scope.
- **Monthly summary push** — not in v1 taxonomy; likely worth experimenting with as reactivation channel between day 14 and day 30 of the winback sequence.
- **Cross-channel (email, in-app)** — design assumes APNs only for now.
- **Notification copy generation** — separate doc; payload schema fixed in §4.6.
- **Shared streaks / social features** — intentionally out of scope; Milesto v1 is solo.
- **Curiosity-gap fatigue tracking** — Netflix-adjacent A/B data suggests curiosity-gap subject lines halve in effectiveness by week 4. Rotate curiosity framings per kind to avoid blanket fatigue; we have no v1 mechanic for this.

---

## 14. Implementation phasing (informational)

This document is design-only. A separate implementation plan should sequence:

Ordered so each step lands retention value _and_ unblocks the next.

1. Schema migrations (§10) + `weekly_tasks.completed_at` backfill + `goals.user_motivation_quote` addition.
2. `user_activity_events` table + write-path instrumentation + `POST /api/activity/foreground`.
3. iOS telemetry endpoints (`received`, `opened`) + extension hooks + `why_deeplink` category action.
4. Activity timestamp touch points in existing backend services.
5. Outbox table + dispatcher skeleton with one P0 kind end-to-end (start with `coach_reply_ready`).
6. **Permission-prompt relocation** — move iOS permission request to post-roadmap-generation moment (§9.4). Single highest opt-in lever; ship early.
7. **Onboarding capture of `user_motivation_quote`** — memory hook for every coach-voiced push downstream.
8. Time-anchored producer cron + `daily_check_in` — initially with persona-default hour.
9. **Implementation-intentions capture + `implementation_intention` push** (§11.4). Highest-leverage evidence-based mechanic; ship before other nudge kinds.
10. Quiet hours, opt-out UI, per-kind toggles.
11. STO computation cron (requires ≥ 7 days of activity data).
12. Global 2/day hard ceiling (§8.5) — gate all subsequent kinds behind this.
13. Weekly streak system: `user_streaks` table, weekly evaluation on `task.completed` + Sunday-night cron, freeze tokens (auto-replenish), `streak_at_risk` / `streak_broken` / `streak_milestone`. Respect 60-day push-copy delay.
14. Celebration pushes: `milestone_hit`, `goal_hit`, `week_completed`.
15. `milestone_preview` (goal-gradient bridge, §11.6).
16. Winback sequence (5 steps incl. day-30 break-up + 90-day auto-pause).
17. Remaining P1/P2 kinds (`plan_not_generated`, `weekly_debrief_prompt`, `week_completion_gap`, `stale_tasks`).
18. `coach_proactive` nightly job (with parasocial guardrails, §11.8).
19. Dynamic fatigue + aversion signal (§8.4).
20. Experimentation table + variant assignment + measurement dashboard (§9).
21. Observability (pg_cron alerts, retention dashboards tied to §9.3).

---

## 15. Primary sources

Design decisions reference these. Claims without citations should be treated as folklore.

**Behavioral science**

- Kahneman & Tversky (1979), _Prospect Theory: An Analysis of Decision under Risk_, Econometrica — loss aversion.
- Kivetz, Urminsky & Zheng (2006), _The Goal-Gradient Hypothesis Resurrected_, JMR — proportional progress and endowed progress.
- Gollwitzer & Sheeran (2006), _Implementation Intentions and Goal Achievement: A Meta-Analysis of Effects and Processes_ (d=0.65, 94 studies).
- Sheeran & Gollwitzer (2024), updated meta-analysis of 642 implementation-intention tests.
- Ryan & Deci, Self-Determination Theory — autonomy, competence, relatedness; and the 2024 IwC review _Designing for Sustained Motivation_ on when BCTs backfire.
- Zeigarnik (1927) — unfinished-task salience.
- Cialdini, _Influence_ — commitment and consistency.

**App playbooks (primary)**

- Yancey & Settles (2020), _A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications_, KDD — Duolingo.
- Duolingo blog: _How the Duolingo Owl Decides What Notification To Send_ and _How the Duolingo Streak Uses Habit Research_.
- LinkedIn Engineering: _Air Traffic Controller: Member-First Notifications_.
- Phiture case study: Headspace notification retention.
- Nir Eyal, _Hooked_ and _Manipulation Matrix_.

**Ethics / parasocial**

- FAccT 2024, _When Human-AI Interactions Become Parasocial_.
- UNESCO, _Ghost in the Chatbot: The Perils of Parasocial Attachment_.

**Flagged as widely cited but unverified** (used directionally, not as quantitative targets): Leanplum "7x retention from STO," Localytics "46% opt-out at 2–5/week," Cluster "89% opt-in at positive moment," Noom "2x open rate from coach voice," Duolingo "21% churn reduction from streak freeze," Duolingo "600+ streak experiments."
