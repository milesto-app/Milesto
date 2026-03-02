# Story 6.3: Task Completion Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to mark my daily objectives as done or not done,
so that I can track my progress and the system can learn from my completion patterns.

## Acceptance Criteria

1. **Given** an authenticated user with daily objectives for today
   **When** `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` is called with `{ "is_completed": true }`
   **Then** the objective's `is_completed` field is updated and the updated objective is returned (FR34)

2. **Given** a user marking an objective as not done (reverting)
   **When** `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` is called with `{ "is_completed": false }`
   **Then** the objective is updated back to incomplete (FR34)

3. **Given** a request for an objective that doesn't belong to this user or goal
   **When** the PATCH is attempted
   **Then** RLS prevents access and returns 404

4. **Given** daily objectives are completed throughout a week
   **When** the system tracks completion data
   **Then** daily objective completion rates are calculated per week as a quality signal for future weekly plan generation (FR53)

## Tasks / Subtasks

- [x] Task 1: Create `UpdateDailyObjectiveDto` (AC: #1, #2)
  - [x] 1.1 Create DTO class in `src/roadmap/dto/update-daily-objective.dto.ts` with `@IsBoolean()` decorator on `is_completed` field
  - [x] 1.2 Use `class-validator` + `class-transformer` decorators: `@IsBoolean()`, `@IsNotEmpty()` for `is_completed`

- [x] Task 2: Add `updateDailyObjective()` to `CheckInService` (AC: #1, #2, #3)
  - [x] 2.1 Add method `updateDailyObjective(objectiveId: string, goalId: string, userId: string, isCompleted: boolean): Promise<DailyObjective>`
  - [x] 2.2 Query `daily_objectives` table with `.eq('id', objectiveId).eq('goal_id', goalId).eq('user_id', userId)` — admin client must filter by all three for security
  - [x] 2.3 If no rows returned → throw `NotFoundException('Daily objective not found')`
  - [x] 2.4 Update `is_completed` field via `.update({ is_completed: isCompleted }).eq('id', objectiveId).eq('user_id', userId).select().single()`
  - [x] 2.5 Return the updated `DailyObjective` object

- [x] Task 3: Add `getWeeklyCompletionRate()` to `CheckInService` (AC: #4)
  - [x] 3.1 Add method `getWeeklyCompletionRate(goalId: string, userId: string, weeklyPlanId: string): Promise<{ completed: number; total: number; rate: number }>`
  - [x] 3.2 Query `daily_objectives` for the given `weekly_plan_id` and `user_id`
  - [x] 3.3 Calculate: `completed` = count where `is_completed = true`, `total` = total count, `rate` = `completed / total` (0 if total is 0)
  - [x] 3.4 This method is consumed by `queryWeekData()` which already feeds into weekly plan generation context — verify integration

- [x] Task 4: Add PATCH endpoint to `DailyObjectiveController` (AC: #1, #2, #3)
  - [x] 4.1 Add `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` to `DailyObjectiveController`
  - [x] 4.2 Accept `UpdateDailyObjectiveDto` as body (validated via global `ValidationPipe`)
  - [x] 4.3 Call `checkInService.updateDailyObjective(objectiveId, goalId, userId, dto.is_completed)`
  - [x] 4.4 Return 200 with the updated objective
  - [x] 4.5 Add Swagger decorators: `@ApiOperation`, `@ApiParam` for both `goalId` and `objectiveId`, `@ApiResponse` for 200, 400, 401, 404, 429
  - [x] 4.6 Add `@Throttle` (60/min) consistent with existing daily-objectives GET endpoint

- [x] Task 5: Unit tests (AC: #1-#4)
  - [x] 5.1 CheckInService tests in `check-in.service.spec.ts`:
    - Happy path: updates `is_completed` to `true`, returns updated objective
    - Revert: updates `is_completed` to `false`, returns updated objective
    - 404 when objective not found (wrong objectiveId)
    - 404 when objective belongs to different user (user_id filter)
    - 404 when objective belongs to different goal (goal_id filter)
  - [x] 5.2 Controller tests in `daily-objective.controller.spec.ts`:
    - PATCH delegates to service with correct params, returns 200
  - [x] 5.3 Verify `getWeeklyCompletionRate()` returns correct counts and rate
  - [x] 5.4 Verify no regressions on existing tests (maintain 381+ passing) — 390 tests pass

## Dev Notes

### Critical Architecture Constraints

- **CheckInService owns daily objectives** — add `updateDailyObjective()` and `getWeeklyCompletionRate()` to existing `src/roadmap/check-in.service.ts`. Do NOT create a new service.
- **DailyObjectiveController owns the endpoint** — add `PATCH /:objectiveId` to existing `src/roadmap/daily-objective.controller.ts`. This controller already has `GET /` for retrieving daily objectives.
- **No barrel exports** — import directly from file paths with `.js` extension.
- **Supabase admin client** — use `this.supabaseService.getAdminClient()` for all queries. Filter by `user_id` AND `goal_id` in queries since admin client bypasses RLS.
- **NestJS HTTP exceptions only** — use `NotFoundException` for 404 (objective not found or unauthorized), `BadRequestException` for 400.
- **Response format** — return the updated objective directly (no wrapper). JSON fields use `snake_case`.
- **Simple CRUD** — this is a straightforward update, no AI calls, no generation, no EventEmitter2 events. Response time should be well under 500ms (NFR5 class).
- **DTO location** — create DTO in `src/roadmap/dto/update-daily-objective.dto.ts`. Check if `dto/` subfolder already exists; if not, create it. Follow the project pattern (some modules have `dto/` subfolder, roadmap module may co-locate differently — check existing patterns).

### Update Flow

```
PATCH /api/goals/:goalId/daily-objectives/:objectiveId
  → DailyObjectiveController.updateObjective(goalId, objectiveId, userId, dto)
    → CheckInService.updateDailyObjective(objectiveId, goalId, userId, dto.is_completed)
      → Supabase: select where id=objectiveId AND goal_id=goalId AND user_id=userId
      → If not found → throw NotFoundException
      → Supabase: update is_completed where id=objectiveId AND user_id=userId
      → Return updated DailyObjective
    ← 200 + updated objective
```

### Completion Rate Tracking (FR53)

The `queryWeekData()` method in CheckInService already gathers weekly objective data for context assembly during weekly plan generation. It queries `daily_objectives` and counts completed vs total. The new `getWeeklyCompletionRate()` method formalizes this as a reusable utility that can also be consumed by future quality evaluation (Story 7.1).

Verify that `queryWeekData()` already calculates completion stats from the `daily_objectives` table — if it does, `getWeeklyCompletionRate()` may be a thin wrapper or can augment existing logic. Do NOT duplicate the query pattern.

### Database Schema (Already Exists)

```sql
-- daily_objectives table already created in Story 6.2
-- is_completed boolean NOT NULL DEFAULT false  ← this is the field being toggled
-- RLS policy: (select auth.uid()) = user_id  ← enforced at DB level
-- Admin client bypasses RLS, so service must filter by user_id explicitly
```

No new migrations needed for this story.

### Project Structure Notes

- New files:
  - `src/roadmap/dto/update-daily-objective.dto.ts` — DTO with class-validator decorators
- Modified files:
  - `src/roadmap/check-in.service.ts` — Add `updateDailyObjective()`, `getWeeklyCompletionRate()`
  - `src/roadmap/check-in.service.spec.ts` — Add completion tracking tests
  - `src/roadmap/daily-objective.controller.ts` — Add PATCH endpoint with Swagger decorators
  - `src/roadmap/daily-objective.controller.spec.ts` — Add PATCH endpoint test

### Existing Patterns to Follow

**Supabase update pattern (from CheckInService):**
```typescript
const supabase = this.supabaseService.getAdminClient();
const { data, error } = await supabase
  .from('daily_objectives')
  .update({ is_completed: isCompleted })
  .eq('id', objectiveId)
  .eq('user_id', userId)
  .select()
  .single();

if (error) {
  this.logger.error(`Failed to update daily objective: ${error.message}`);
  throw new InternalServerErrorException('Failed to update daily objective');
}
return data as DailyObjective;
```

**Controller PATCH pattern:**
```typescript
@Patch(':objectiveId')
@ApiOperation({ summary: 'Mark daily objective as done or not done' })
@ApiParam({ name: 'goalId', description: 'Goal UUID' })
@ApiParam({ name: 'objectiveId', description: 'Daily objective UUID' })
@ApiResponse({ status: 200, description: 'Updated objective' })
@ApiResponse({ status: 400, description: 'Invalid input' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Objective not found' })
@ApiResponse({ status: 429, description: 'Rate limit exceeded' })
async updateObjective(
  @Param('goalId') goalId: string,
  @Param('objectiveId') objectiveId: string,
  @UserId() userId: string,
  @Body() dto: UpdateDailyObjectiveDto,
): Promise<DailyObjective> {
  return this.checkInService.updateDailyObjective(objectiveId, goalId, userId, dto.is_completed);
}
```

**DTO pattern (from existing DTOs in the project):**
```typescript
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateDailyObjectiveDto {
  @IsBoolean()
  @IsNotEmpty()
  is_completed: boolean;
}
```

### What NOT to Do

- Do NOT create `debriefs` table or debrief endpoints — that is Story 6.4
- Do NOT add QualityService event listeners for completion events — that is Story 7.1
- Do NOT modify `generation.service.ts` — no AI calls in this story
- Do NOT modify `context-pipeline.service.ts` or `rerank.service.ts`
- Do NOT add new npm packages — all dependencies exist
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT use raw `Error` — use NestJS HTTP exceptions
- Do NOT forget `.js` extensions on all relative imports
- Do NOT emit events for completion tracking — this is simple CRUD. Quality event listeners come in Story 7.1
- Do NOT add `completed_at` timestamp column — not in the schema, not in the requirements
- Do NOT over-engineer with completion percentage endpoints — FR53 is about internal tracking as a quality signal, not a user-facing API

### Previous Story Intelligence

**From Story 6.2 (most recent — done):**
- `DailyObjective` interface already has `is_completed: boolean` — ready for PATCH
- `DailyObjectiveController` exists at `src/roadmap/daily-objective.controller.ts` — add PATCH here
- `getExistingObjectives()` method queries by `goal_id`, `user_id`, `date` — similar pattern for the update query
- `storeDailyObjectives()` uses batch insert with `.insert()` — update will use `.update().eq()` pattern
- Test mocks use `from()` table-name matching — be careful with mock interception (6.2 had a bug with this)
- 381 tests passing, 0 regressions — maintain this baseline
- Code review found: always filter by `user_id` (admin client bypasses RLS), type DTOs precisely

**From Story 6.1:**
- CheckInController has `POST/GET /goals/:goalId/checkin` — established controller + service delegation pattern
- Duplicate detection via PostgreSQL 23505 unique violation → `ConflictException`
- Error messages sanitized (log details, throw generic)
- `@MaxLength` added on text fields for safety

**From Story 5.2:**
- `queryWeekData()` already exists and calculates completion stats — verify before duplicating
- Supabase error handling: always check `.error` property
- Test mocks must match Supabase behavior (`{ data, error }`)

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce a commit like:
```
feat(roadmap): implement daily objective completion tracking
```

Last 5 commits:
- `53374fa feat(roadmap): implement weekly and monthly summary generation and embedding`
- `a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle`
- `257ecd7 feat(roadmap): harden roadmap retrieval with status handling and API docs`
- `a7b5971 feat(roadmap): implement milestone generation via LLM orchestration`
- `1c14408 feat(roadmap): implement 3-tier context retrieval pipeline for generation`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — Revised]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Check-In / Debrief Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema — daily_objectives]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Daily Loop]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR Coverage — FR34, FR53]
- [Source: _bmad-output/implementation-artifacts/6-2-generate-daily-objectives.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/6-2-generate-daily-objectives.md#Completion Notes]

## Change Log

- 2026-02-22: Implemented daily objective completion tracking — PATCH endpoint, updateDailyObjective service method, getWeeklyCompletionRate utility, UpdateDailyObjectiveDto, and 9 new unit tests (390 total, 0 regressions)
- 2026-02-22: Code review fixes — added goal_id filter to update and completion rate queries (defense-in-depth), getWeeklyCompletionRate now throws on DB error instead of silently returning zeros, strengthened test assertions to verify query parameters, added DB error test (391 total, 0 regressions)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered.

### Completion Notes List

- Created `UpdateDailyObjectiveDto` with `@IsBoolean()` and `@IsNotEmpty()` validators plus `@ApiProperty` Swagger decorator
- Added `updateDailyObjective()` to CheckInService — two-step pattern: first verify ownership (id + goal_id + user_id), then update with goal_id + user_id filters for defense-in-depth. Throws NotFoundException on missing/unauthorized
- Added `getWeeklyCompletionRate()` to CheckInService — queries by weekly_plan_id + goal_id + user_id, returns {completed, total, rate}. Throws InternalServerErrorException on DB error (not silently zeros). Verified that `queryWeekData()` already calculates similar stats inline; this method formalizes it as a reusable utility for Story 7.1
- Added PATCH endpoint at `/:objectiveId` on DailyObjectiveController with Swagger decorators and @Throttle(60/min) matching the existing GET endpoint
- 10 new tests: 5 service tests (happy path mark complete, revert to incomplete, 3 NotFoundException scenarios), 4 completion rate tests (correct rate with param verification, zero objectives, all completed, DB error throws), 1 controller delegation test
- Full suite: 391 pass, 0 failures, 0 regressions

### File List

- `src/roadmap/dto/update-daily-objective.dto.ts` (new)
- `src/roadmap/check-in.service.ts` (modified)
- `src/roadmap/check-in.service.spec.ts` (modified)
- `src/roadmap/daily-objective.controller.ts` (modified)
- `src/roadmap/daily-objective.controller.spec.ts` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/implementation-artifacts/6-3-task-completion-tracking.md` (modified)
