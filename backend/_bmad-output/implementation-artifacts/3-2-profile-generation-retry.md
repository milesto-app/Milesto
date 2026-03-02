# Story 3.2: Profile Generation Retry

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to retry if my coaching profile fails to generate,
So that a temporary AI failure doesn't prevent me from getting my personalized coaching plan.

## Acceptance Criteria

1. **Given** profile generation fails after intake completion **When** the failure occurs **Then** goal status transitions to `profile_generation_failed` (FR9) **And** the user can see the failed status on the goal **And** `profile_generation_attempts` is incremented to reflect the total number of failed attempts

2. **Given** a goal in `profile_generation_failed` status with fewer than 3 total attempts **When** `POST /api/goals/:goalId/intake/retry-profile` is called **Then** the system retries profile generation (FR26) **And** on success, goal status transitions to `intake_completed` and the profile is returned **And** on failure, status returns to `profile_generation_failed` with incremented attempts

3. **Given** a goal that has already failed profile generation 3 times (`profile_generation_attempts >= 3`) **When** `POST /api/goals/:goalId/intake/retry-profile` is called **Then** the system returns 400 indicating max retries exceeded (FR27) **And** the goal remains in terminal `profile_generation_failed` status

4. **Given** a goal NOT in `profile_generation_failed` status **When** `POST /api/goals/:goalId/intake/retry-profile` is called **Then** the system returns 400 indicating retry is only available for failed profile generation

5. **Given** a non-existent goal or a goal belonging to another user **When** `POST /api/goals/:goalId/intake/retry-profile` is called **Then** the system returns 404

## Tasks / Subtasks

- [x] Task 1: Modify `handleProfileFailure()` to increment attempts properly (AC: #1)
  - [x] 1.1 Change signature to `handleProfileFailure(goalId: string, currentAttempts: number)`
  - [x] 1.2 Replace hardcoded `profile_generation_attempts: 1` with `profile_generation_attempts: currentAttempts + 1`

- [x] Task 2: Modify `generateAndStoreProfile()` to accept current attempts (AC: #1, #2)
  - [x] 2.1 Add optional `currentAttempts = 0` parameter to method signature
  - [x] 2.2 Pass `currentAttempts` to all `handleProfileFailure()` calls within the method

- [x] Task 3: Add `retryProfile()` public method to IntakeService (AC: #2, #3, #4, #5)
  - [x] 3.1 Signature: `retryProfile(userId: string, goalId: string): Promise<{ profile_id: string | null; goal_status: string }>`
  - [x] 3.2 Call `this.goalService.findOne(goalId, userId)` to verify ownership (throws 404 if not found)
  - [x] 3.3 Check `goal.status !== 'profile_generation_failed'` — throw `BadRequestException('Profile retry is only available for goals with failed profile generation')`
  - [x] 3.4 Check `goal.profile_generation_attempts >= appConfig.intake.maxProfileRetries` — throw `BadRequestException('Maximum profile generation attempts (3) exceeded')`
  - [x] 3.5 Call `this.generateAndStoreProfile(userId, goalId, goal.description, goal.profile_generation_attempts)`
  - [x] 3.6 Return `{ profile_id: result.profile_id, goal_status: result.profile_status }`

- [x] Task 4: Add `@Post('retry-profile')` endpoint to IntakeController (AC: #2, #3, #4, #5)
  - [x] 4.1 Add method: `retryProfile(@UserId() userId: string, @Param('goalId') goalId: string)`
  - [x] 4.2 Return `this.intakeService.retryProfile(userId, goalId)` — no request body needed

- [x] Task 5: Unit tests for IntakeService `retryProfile()` (AC: #1-#5)
  - [x] 5.1 Successful retry: profile generated, returns `{ profile_id, goal_status: 'intake_completed' }`
  - [x] 5.2 Failed retry: profile generation fails, returns `{ profile_id: null, goal_status: 'profile_generation_failed' }`
  - [x] 5.3 Failed retry increments `profile_generation_attempts` from current value (e.g., 1 → 2)
  - [x] 5.4 Throws BadRequestException when goal status is not `profile_generation_failed`
  - [x] 5.5 Throws BadRequestException when `profile_generation_attempts >= 3`
  - [x] 5.6 Throws NotFoundException when goal doesn't exist (delegated to goalService.findOne)
  - [x] 5.7 Emits `profile.generated` event on successful retry
  - [x] 5.8 Does not emit `profile.generated` event on failed retry

- [x] Task 6: Unit tests for IntakeController `retryProfile` (AC: #2)
  - [x] 6.1 Calls `intakeService.retryProfile(userId, goalId)` and returns result
  - [x] 6.2 Verifies correct parameter passing

## Dev Notes

### Developer Context

**What this story builds:** The retry mechanism for failed AI profile generation. When the initial profile generation (triggered at intake completion in Story 2.4) fails, the goal enters `profile_generation_failed` status. This story adds the `POST /api/goals/:goalId/intake/retry-profile` endpoint that allows users to retry, up to a total of 3 attempts. After 3 failures, the goal enters a terminal failed state and the user can delete it and start over.

**This story is small and surgical.** It adds one new endpoint, one new public service method, and fixes one existing bug (hardcoded attempt count). The profile generation logic itself (`generateAndStoreProfile()`) already exists from Story 2.4 — this story reuses it with a minor signature change.

**The bug to fix:** `handleProfileFailure()` in `intake.service.ts` currently hardcodes `profile_generation_attempts: 1` instead of incrementing from the current value. The initial attempt from `submitBatch()` always sets attempts to 1 (which happens to be correct for the first failure), but retries must increment from the current value. Fix: parameterize `handleProfileFailure()` to accept `currentAttempts` and set `profile_generation_attempts: currentAttempts + 1`.

**Attempt counting semantics:**
- `maxProfileRetries` config = 3 (total allowed failures, not retries)
- Initial attempt from `submitBatch()`: `currentAttempts = 0` → on failure → `attempts = 1`
- Retry 1 via endpoint: `currentAttempts = 1` → on failure → `attempts = 2`
- Retry 2 via endpoint: `currentAttempts = 2` → on failure → `attempts = 3`
- Retry 3 via endpoint: `currentAttempts = 3 >= 3` → BLOCKED with 400

**Existing code you MUST understand:**

- `src/intake/intake.service.ts` — `generateAndStoreProfile()` (lines 459-562): The complete profile generation flow. Currently private. Steps: set status to `profile_generating` → load prior batch context → call `intakePromptService.generateGoalProfile()` → validate profile → on valid: insert into `goal_profiles`, set status to `intake_completed`, emit `profile.generated` → on invalid/error: call `handleProfileFailure()`. **Add optional `currentAttempts = 0` parameter.**

- `src/intake/intake.service.ts` — `handleProfileFailure()` (lines 564-589): Sets goal status to `profile_generation_failed` and `profile_generation_attempts: 1` (HARDCODED). **Change to accept `currentAttempts` parameter and set `profile_generation_attempts: currentAttempts + 1`.**

- `src/intake/intake.controller.ts` — 28 lines. Two existing endpoints (`getNextBatch`, `submitBatch`). **Add `retryProfile` method following the same pattern.**

- `src/goal/goal.service.ts` — `findOne()` method validates goal ownership and returns goal object including `status` and `profile_generation_attempts`. Throws `NotFoundException` if not found or not owned by user. Already used by IntakeService.

- `src/config/app.config.ts` — `appConfig.intake.maxProfileRetries` = 3. Already defined but **currently unused in the codebase**. This story integrates it.

**What NOT to build:**
- No new DTO — retry-profile has no request body
- No database migration — `profile_generation_attempts` column already exists on `goals` table
- No changes to `IntakePromptService` — `generateGoalProfile()` is unchanged
- No changes to `IntakeQualityService` — profile validation is unchanged
- No changes to `GoalModule` or `GoalService`
- No changes to event system — `profile.generated` event already fires on success in `generateAndStoreProfile()`
- No changes to `IntakeModule` — all providers already registered

### Technical Requirements

**Modified `handleProfileFailure()` signature and body:**

```typescript
private async handleProfileFailure(
  goalId: string,
  currentAttempts: number,
): Promise<{
  profile_id: null;
  profile_status: 'profile_generation_failed';
}> {
  const supabase = this.supabaseService.getAdminClient();

  const { error } = await supabase
    .from('goals')
    .update({
      status: 'profile_generation_failed',
      profile_generation_attempts: currentAttempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId);

  if (error) {
    this.logger.error(
      `Failed to update goal status to profile_generation_failed: ${error.message}`,
    );
  }

  return { profile_id: null, profile_status: 'profile_generation_failed' };
}
```

**Modified `generateAndStoreProfile()` signature:**

```typescript
private async generateAndStoreProfile(
  userId: string,
  goalId: string,
  goalDescription: string,
  currentAttempts = 0,
): Promise<{ profile_id: string | null; profile_status: string }>
```

All `handleProfileFailure(goalId)` calls inside `generateAndStoreProfile()` become `handleProfileFailure(goalId, currentAttempts)`.

**New `retryProfile()` method on IntakeService:**

```typescript
async retryProfile(
  userId: string,
  goalId: string,
): Promise<{ profile_id: string | null; goal_status: string }> {
  const goal = await this.goalService.findOne(goalId, userId);

  if (goal.status !== 'profile_generation_failed') {
    throw new BadRequestException(
      'Profile retry is only available for goals with failed profile generation',
    );
  }

  if (goal.profile_generation_attempts >= appConfig.intake.maxProfileRetries) {
    throw new BadRequestException(
      `Maximum profile generation attempts (${appConfig.intake.maxProfileRetries}) exceeded`,
    );
  }

  this.logger.log(
    `Retrying profile generation for goal ${goalId} (attempt ${goal.profile_generation_attempts + 1}/${appConfig.intake.maxProfileRetries})`,
  );

  const result = await this.generateAndStoreProfile(
    userId,
    goalId,
    goal.description,
    goal.profile_generation_attempts,
  );

  return {
    profile_id: result.profile_id,
    goal_status: result.profile_status,
  };
}
```

**New controller method on IntakeController:**

```typescript
@Post('retry-profile')
async retryProfile(
  @UserId() userId: string,
  @Param('goalId') goalId: string,
) {
  return this.intakeService.retryProfile(userId, goalId);
}
```

**Response formats:**

Success:
```json
{ "profile_id": "uuid", "goal_status": "intake_completed" }
```

Failure (still retryable):
```json
{ "profile_id": null, "goal_status": "profile_generation_failed" }
```

Max retries exceeded: `400 Bad Request` with NestJS default error format:
```json
{ "statusCode": 400, "message": "Maximum profile generation attempts (3) exceeded", "error": "Bad Request" }
```

Wrong status: `400 Bad Request`:
```json
{ "statusCode": 400, "message": "Profile retry is only available for goals with failed profile generation", "error": "Bad Request" }
```

Goal not found: `404 Not Found` (delegated to `goalService.findOne()`).

### Architecture Compliance

**Module structure:** No new modules. Extend existing `IntakeModule` — no changes to module registration.

**Service boundaries (STRICT):**
- `IntakeService` — adds `retryProfile()` public method, modifies `generateAndStoreProfile()` and `handleProfileFailure()` signatures. No new dependencies.
- `IntakePromptService` — no changes. `generateGoalProfile()` is called indirectly through `generateAndStoreProfile()`.
- `IntakeQualityService` — no changes. `validateGoalProfile()` is called indirectly through `generateAndStoreProfile()`.
- `GoalService` — no changes. `findOne()` already exists and validates ownership.

**Endpoint pattern:** `POST /api/goals/:goalId/intake/retry-profile` — matches the existing `POST submit-batch` pattern (same controller, same decorators).

**Error handling:**
- `goalService.findOne()` throws `NotFoundException` for missing/unauthorized goals
- `BadRequestException` for wrong status or max retries exceeded
- AI failures caught inside `generateAndStoreProfile()` → `handleProfileFailure()` → returns failure result (does NOT throw)

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** `snake_case` field names (`profile_id`, `goal_status`).

**Config usage:** `appConfig.intake.maxProfileRetries` imported directly — NOT via `ConfigService` (it's a non-sensitive setting).

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed.

- `BadRequestException` from `@nestjs/common` — already imported in `intake.service.ts`
- `appConfig` from `../config/app.config.js` — already imported in `intake.service.ts` (added in Story 3.1)
- No new imports needed in the controller (all decorators already imported)

### File Structure Requirements

**Files to CREATE:** None.

**Files to MODIFY:**

- `src/intake/intake.service.ts` — add `retryProfile()` public method, modify `generateAndStoreProfile()` to accept `currentAttempts` parameter, modify `handleProfileFailure()` to accept and use `currentAttempts`
- `src/intake/intake.controller.ts` — add `@Post('retry-profile')` endpoint
- `src/intake/intake.service.spec.ts` — add tests for `retryProfile()` scenarios
- `src/intake/intake.controller.spec.ts` — add test for `retryProfile` endpoint

**Files NOT to touch:**

- `src/intake/intake-prompt.service.ts` — no changes
- `src/intake/intake-prompt.service.spec.ts` — no changes
- `src/intake/intake-quality.service.ts` — no changes
- `src/intake/intake-quality.service.spec.ts` — no changes
- `src/intake/intake.module.ts` — no changes needed
- `src/intake/dto/submit-answers.dto.ts` — no DTO needed for retry
- `src/ai/ai.service.ts` — stable
- `src/supabase/*` — stable
- `src/config/app.config.ts` — no changes (`maxProfileRetries` already exists)
- `src/goal/*` — no changes

**No database migrations needed.** The `profile_generation_attempts` column already exists on the `goals` table (integer, default 0, set in Story 1.1).

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakeService tests — add to `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('retryProfile')
    ✓ returns profile_id and goal_status intake_completed on successful retry
    ✓ returns profile_id null and goal_status profile_generation_failed on failed retry
    ✓ increments profile_generation_attempts on failure (e.g., 1 → 2)
    ✓ throws BadRequestException when goal status is not profile_generation_failed
    ✓ throws BadRequestException when profile_generation_attempts >= maxProfileRetries
    ✓ throws NotFoundException when goal not found (via goalService.findOne)
    ✓ emits profile.generated event on successful retry
    ✓ does not emit profile.generated event on failed retry
    ✓ sets goal status to profile_generating before AI call
```

**IntakeController tests — add to `intake.controller.spec.ts`:**

```
describe('IntakeController')
  describe('POST retry-profile')
    ✓ calls intakeService.retryProfile with userId and goalId
    ✓ returns the service result directly
```

**Mock patterns (extend established patterns from existing tests):**

- Mock `goalService.findOne` — return goal with `status: 'profile_generation_failed'` and `profile_generation_attempts: 1`
- Mock `goalService.findOne` — throw `NotFoundException` for not-found case
- Mock `intakePromptService.generateGoalProfile` — return valid profile for success, throw for failure
- Mock `intakeQualityService.validateGoalProfile` — return `{ valid: true }` for success
- Mock Supabase insert chain for `goal_profiles` table (success case)
- Mock Supabase update chain for `goals` table (status transitions)
- Reuse existing chainable Supabase mock pattern from Stories 2.1-3.1
- Add `retryProfile: jest.fn()` to controller test's mock IntakeService

**Existing tests NOT affected:** The `generateAndStoreProfile()` callers (`submitBatch`, `serveFallbackBatch`) don't pass `currentAttempts`, so it defaults to 0. `handleProfileFailure(goalId, 0)` sets `attempts = 0 + 1 = 1` — same behavior as the old hardcoded `1`. No existing test assertions need changing.

**Test count:** ~11 new tests across 2 files (9 intake service + 2 controller).

### Previous Story Intelligence

**From Story 3.1 (AI Fallback Batches):**
- `appConfig` is already imported in `intake.service.ts` — added for `maxBatches` check in `serveFallbackBatch()`. Reuse for `maxProfileRetries`.
- `serveFallbackBatch()` calls `generateAndStoreProfile()` at batch cap — this caller also needs the updated signature but will pass no `currentAttempts` (defaults to 0). No behavioral change.
- Test patterns: established chainable Supabase mock, event emission verification, error scenario testing. Follow the same patterns.
- Total tests before this story: 182 (28 prompt service + 63 intake service + 91 others).

**From Story 2.4 (Intake Completion and Goal Profile Generation):**
- `generateAndStoreProfile()` was implemented here. Its completion notes stated: "appConfig.intake.maxProfileRetries (3) is configured but NOT used in this story. This story only handles the first attempt during intake completion. Story 3.2 adds the retry endpoint."
- Profile validation via `intakeQualityService.validateGoalProfile()` runs on the generated profile. The retry path goes through the same validation — if AI returns a structurally invalid profile, the method retries once internally (existing behavior), then falls through to `handleProfileFailure()`.
- The `profile.generated` event is emitted on success — the embedding listener picks it up. Same flow for retries.

**From Story 1.3 (Delete a Goal):**
- `DELETABLE_STATUSES` in `goal.service.ts` includes `'profile_generation_failed'` — users can delete goals that permanently fail profile generation. This is the escape hatch for the terminal failure state (FR27).

### Project Structure Notes

- All changes are within `src/intake/` — no new directories or modules
- The `retryProfile()` method is a thin orchestrator: validate preconditions → delegate to existing `generateAndStoreProfile()` → return result
- Response uses `goal_status` (not `profile_status`) to be more semantically clear for the client — the field name describes what changed
- No barrel exports — import directly from the file

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2 — FR26, FR27]
- [Source: _bmad-output/planning-artifacts/architecture.md#Endpoint Table — POST /api/goals/:goalId/intake/retry-profile]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakeService orchestrates flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — AI call failures: retry → fallback/retryable state]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling — NestJS HTTP exceptions]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26 — Users can retry failed profile generation up to 3 attempts]
- [Source: _bmad-output/planning-artifacts/prd.md#FR27 — Terminal failure state after 3 failed attempts]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9 — Goal status lifecycle]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10 — Profile generation recoverable via retry]
- [Source: _bmad-output/planning-artifacts/prd.md#Error Codes — 400 for max retry attempts]
- [Source: src/intake/intake.service.ts — generateAndStoreProfile() lines 459-562, handleProfileFailure() lines 564-589]
- [Source: src/intake/intake.controller.ts — existing endpoint patterns]
- [Source: src/goal/goal.service.ts — findOne() validates ownership, DELETABLE_STATUSES includes profile_generation_failed]
- [Source: src/config/app.config.ts — intake.maxProfileRetries = 3 (unused, to be integrated)]
- [Source: _bmad-output/implementation-artifacts/3-1-ai-fallback-batches.md — Previous story, appConfig import pattern, test patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Fixed `handleProfileFailure()` bug: changed from hardcoded `profile_generation_attempts: 1` to dynamic `currentAttempts + 1` to properly increment on each failure
- Added `currentAttempts` parameter (default 0) to `generateAndStoreProfile()` — all existing callers use the default so behavior is unchanged for the initial attempt path
- Added `retryProfile()` public method on IntakeService: validates goal status is `profile_generation_failed`, checks `profile_generation_attempts < maxProfileRetries (3)`, then delegates to existing `generateAndStoreProfile()` with current attempts
- Added `POST /api/goals/:goalId/intake/retry-profile` endpoint on IntakeController following established patterns (AuthGuard, UserId decorator, no request body)
- Integrated `appConfig.intake.maxProfileRetries` (was defined but unused since Story 2.4)
- 9 new service tests covering: success, failure, attempt increment, wrong status, max retries, not found, event emission (success + failure), status transition to profile_generating
- 2 new controller tests covering: parameter passing and direct result return
- All 193 tests pass (11 new + 182 existing), zero regressions
- No new dependencies, no database migrations, no module changes needed

### Change Log

- 2026-02-12: Implemented profile generation retry endpoint and fixed attempt counter bug. Added `retryProfile()` method, `POST retry-profile` endpoint, parameterized `handleProfileFailure()` and `generateAndStoreProfile()` for proper attempt tracking. 11 new tests.

### File List

**Modified:**
- src/intake/intake.service.ts — added `retryProfile()` public method, parameterized `generateAndStoreProfile()` (added `currentAttempts`), parameterized `handleProfileFailure()` (accepts `currentAttempts`, uses `currentAttempts + 1`)
- src/intake/intake.controller.ts — added `@Post('retry-profile')` endpoint
- src/intake/intake.service.spec.ts — added 9 tests in `describe('retryProfile')` block
- src/intake/intake.controller.spec.ts — added 2 tests in `describe('POST retry-profile')` block, added `retryProfile` to mock service
