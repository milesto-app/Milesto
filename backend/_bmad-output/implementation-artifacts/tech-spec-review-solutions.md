# Tech Spec Review — Adversarial Findings & Solutions

**Reviewed:** Goal Intake System Tech Spec
**Date:** 2026-02-08

## Solutions

### 1. Concurrent intake submissions / race condition
**Verdict:** Fix
**Solution:** Add a `UNIQUE(goal_id, batch_number)` constraint on `intake_batches`. The constraint turns silent corruption into a clear error. No need for optimistic locking or idempotency keys at this scale.

### 2. Missing indexes on RLS subquery joins
**Verdict:** Fix
**Solution:** Add indexes on `intake_batches(goal_id)`, `intake_questions(batch_id)`, and `intake_answers(question_id)`. These are FK columns used in RLS subqueries — Postgres won't auto-index them. One line per index in the migration.

### 3. Embedding dimension hardcoded without naming the model
**Verdict:** Fix
**Solution:** Pick the model now and document it. Recommended: `text-embedding-3-small` (1536 dimensions) from OpenAI via OpenRouter. Lock it in the spec. If the model changes later, re-embedding is required anyway.

### 4. `generateGoalProfile` single point of failure
**Verdict:** Fix
**Solution:** Add an intermediate status: `profile_generating`. Flow: flip to `profile_generating` → call AI → on success, store profile + flip to `intake_completed` → on failure, leave status as `profile_generating`. Add `POST /api/goals/:goalId/intake/retry-profile` endpoint for goals stuck in `profile_generating`.

### 5. Fallback batch underspecified
**Verdict:** Fix
**Solution:** Add `batch_type: 'fallback'` to the check constraint enum. Fallback batches count toward the 7-batch cap. `getFallbackBatch()` returns 2-3 unique open-ended text questions, cycling through a pool of ~10 pre-written questions so consecutive fallbacks aren't identical.

### 6. No answer-type validation
**Verdict:** Fix
**Solution:** Add validation in `IntakeService.submitBatch()`:
- `scale` → `numeric_value` required, must be within `[scale_min, scale_max]`
- `single_choice` → `selected_options` required, length === 1, value in `options`
- `multiple_choice` → `selected_options` required, length >= 1, all values in `options`
- `text` → `text_value` required, non-empty

Fetch questions for the batch, cross-reference each answer's `question_id` against question type and constraints. Return 400 with specific errors on mismatch.

### 7. No goal deletion or intake abandonment
**Verdict:** Fix
**Solution:** Add `DELETE /api/goals/:goalId` — only allowed when `status = 'intake_in_progress'`. Cascading deletes handle batches/questions/answers (already set up via `ON DELETE CASCADE`). For completed goals, leave them. A hard delete on in-progress goals covers the "changed my mind" case.

### 8. User profile embedding scope ambiguity
**Verdict:** Fix
**Solution:** User profile embeddings are global: `goal_id = NULL`, `source_type = 'user_profile'`, `source_id = user_profile.id`. One embedding per user, not per goal. Semantic search queries: `WHERE user_id = $1 AND (goal_id = $2 OR goal_id IS NULL)`.

### 9. No timeout on synchronous AI calls
**Verdict:** Fix
**Solution:** Set a 30-second `AbortController` timeout on every OpenRouter call in `AiService`. If it trips on `generateNextBatch`, fall through to fallback batch logic. Add `AI_CALL_TIMEOUT_MS` env var defaulting to 30000. No circuit breaker needed for v1.

### 10. Ambiguous `next-batch` behavior for served-but-unanswered batches
**Verdict:** Fix
**Solution:** "Next" means "next unanswered." If a batch exists but has no answers in `intake_answers`, re-serve that batch. Check: find the highest `batch_number` in `intake_batches` for this goal, check if all its questions have answers. If yes, generate next. If no, return the unanswered batch.

### 11. Quality scores are write-only with no consumer
**Verdict:** Keep as-is (minor addition)
**Solution:** Scores are intentional telemetry — instrumentation before the dashboard. Keep the quality framework, but add `LOG.warn` when composite score drops below 0.5. Dashboard and alerting rules are future scope.

### 12. No schema validation on `goal_profiles.profile_data`
**Verdict:** Fix
**Solution:** Add structural validation in `IntakePromptService.generateGoalProfile()` after the AI call returns. Check that all five keys exist (`current_state`, `desired_state`, `constraints`, `motivation`, `domain_context`) and are non-empty strings. If validation fails, retry the AI call once. Same pattern as Layer 1 validation on questions.

## Summary — Round 1

| # | Finding | Verdict |
|---|---------|---------|
| 1 | Concurrent submissions race condition | Fix — UNIQUE constraint |
| 2 | Missing indexes on RLS subqueries | Fix — add FK indexes |
| 3 | Embedding dimension without model | Fix — name the model |
| 4 | Profile generation failure | Fix — intermediate status + retry |
| 5 | Fallback batch underspecified | Fix — new batch_type + question pool |
| 6 | No answer-type validation | Fix — cross-reference against question type |
| 7 | No goal deletion/abandonment | Fix — DELETE endpoint for in-progress |
| 8 | Profile embedding scope ambiguity | Fix — global with goal_id = NULL |
| 9 | No AI call timeout | Fix — 30s AbortController |
| 10 | Ambiguous next-batch behavior | Fix — re-serve unanswered batch |
| 11 | Quality scores write-only | Keep — add LOG.warn threshold |
| 12 | No profile_data schema validation | Fix — validate keys + retry |

---

## Round 2 — Adversarial Review of Tech Spec + Round 1 Solutions

### 1. `profile_generating` creates a new stuck state (escalation of R1 #4)
**Verdict:** Fix
**Solution:** Add `profile_generation_attempts` counter (default 0, max 3) on `goals` table. The `retry-profile` endpoint increments it and retries. After 3 failures, flip status to `profile_generation_failed` — a terminal error state the client can display. No background jobs or TTL workers for v1.

### 2. No rate limiting on AI-calling endpoints
**Verdict:** Fix
**Solution:** Use `@nestjs/throttler`. Apply a global throttle (60 req/min per user) and a tighter limit on AI-triggering endpoints (10 req/min per user on `submit-batch` and `next-batch`). Configuration-level fix, not application logic.

### 3. DELETE doesn't cover new `profile_generating` status (consequence of R1 #4)
**Verdict:** Fix
**Solution:** Extend DELETE endpoint status check to allow deletion when status is `intake_in_progress` OR `profile_generating` OR `profile_generation_failed`.

### 4. No pagination on `GET /api/goals`
**Verdict:** Fix
**Solution:** Add `?limit=20&offset=0` query params with defaults. No cursor-based pagination for v1. Embedding search is naturally scoped to one goal + user profile — small result sets, no pagination needed there.

### 5. Answer validation skips question ownership verification (gap in R1 #6)
**Verdict:** Fix
**Solution:** When validating answers, fetch questions with a join: `intake_questions → intake_batches → goals` where `goals.id = :goalId AND goals.user_id = :userId AND intake_batches.batch_number = :currentBatchNumber`. Any `question_id` not in that result set → 400. One query, full ownership chain validated.

### 6. AI timeout undefined for `generateGoalProfile` (gap in R1 #9)
**Verdict:** Clarify
**Solution:** Same 30s timeout applies. On timeout: status stays `profile_generating` (R1 #4 handles this). Combined with R2 #1 (attempt counter + terminal state), the recovery path is complete. Make this explicit in the spec.

### 7. Fire-and-forget embeddings with no recovery
**Verdict:** Fix
**Solution:** Add `embedded` boolean column (default `false`) on `intake_batches` and `goal_profiles`. Embedding listener flips to `true` on success. Provides discoverability via `SELECT * FROM intake_batches WHERE embedded = false`. Add a manual `POST /api/admin/reembed-missing` endpoint (admin-only) to iterate and re-embed. No dead letter queue for v1.

### 8. Hardcoded batch 1 questions not specified in tech spec
**Verdict:** Fix
**Solution:** Define exact questions in spec:
1. *"What motivated you to pursue this goal right now?"* — `text`, placeholder: "What's driving you?"
2. *"How much time per week can you realistically dedicate to this?"* — `scale`, min: 1, max: 5, labels: `{"1": "< 1 hour", "2": "1-3 hours", "3": "3-5 hours", "4": "5-10 hours", "5": "10+ hours"}`
3. *"What does success look like for you?"* — `text`, placeholder: "Describe your ideal outcome"
4. *"When do you want to achieve this by?"* — `single_choice`, options: `["1 month", "3 months", "6 months", "1 year", "No specific deadline"]`
5. *"Have you attempted this goal before?"* — `single_choice`, options: `["No, first time", "Yes, once", "Yes, multiple times"]`

### 9. UNIQUE constraint returns 500 instead of 409 (refinement of R1 #1)
**Verdict:** Fix
**Solution:** In `IntakeService.submitBatch()`, wrap the batch insert in try/catch. Catch Postgres error code `23505` (unique_violation), return `ConflictException` (NestJS → 409) with message: "This batch has already been submitted."

### 10. EventEmitter2 swallows errors silently
**Verdict:** Fix
**Solution:** Register a global error handler on the EventEmitter2 instance in AppModule: `eventEmitter.on('error', (err) => this.logger.error('Event handler failed', err))`. Surfaces swallowed errors in logs. NestJS `@OnEvent` decorator handles module loading order — listener registration is not a realistic failure mode.

### 11. No transaction boundaries on submit-batch flow
**Verdict:** Fix
**Solution:** Two-transaction split:
- **Transaction 1:** Store answers + mark current batch as answered. Always commits — answers are valid data regardless of what happens next.
- **Transaction 2:** Generate + store next batch (or generate profile + update goal status). If this fails, answers are preserved and user can retry `next-batch`.

### 12. Re-served batch indistinguishable from new batch (refinement of R1 #10)
**Verdict:** Fix
**Solution:** Include `batch_id` in the response payload. The client caches `batch_id` locally. If `GET /next-batch` returns a `batch_id` the client has seen before, the client knows it's a re-serve and can restore local answers. No separate `previously_served` flag needed — the `batch_id` is the signal.

## Summary — Round 2

| # | Finding | Verdict | Solution |
|---|---------|---------|----------|
| 1 | `profile_generating` stuck state | Fix | Attempt counter (max 3) + `profile_generation_failed` terminal status |
| 2 | No rate limiting | Fix | `@nestjs/throttler` — global + tighter on AI endpoints |
| 3 | DELETE doesn't cover new statuses | Fix | Extend status check to include new statuses |
| 4 | No pagination on goals | Fix | `?limit=20&offset=0` query params |
| 5 | Answer validation skips ownership | Fix | Join through questions → batches → goals → user |
| 6 | Timeout undefined for profile gen | Clarify | Already covered by R1 #4 + R1 #9 — make explicit |
| 7 | Fire-and-forget embedding recovery | Fix | `embedded` boolean + manual admin reembed endpoint |
| 8 | Batch 1 questions unspecified | Fix | Define exact 5 questions with types/scales/options |
| 9 | UNIQUE constraint returns 500 | Fix | Catch Postgres 23505, return 409 |
| 10 | EventEmitter2 swallows errors | Fix | Global error handler on EventEmitter2 |
| 11 | No transaction boundaries | Fix | Two-transaction split: answers first, then next-batch |
| 12 | Re-served batch indistinguishable | Fix | Include `batch_id` in response payload |
