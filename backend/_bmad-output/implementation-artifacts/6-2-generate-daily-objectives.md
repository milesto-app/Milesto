# Story 6.2: Generate Daily Objectives

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to receive daily objectives calibrated to my energy level and recent progress,
so that each day's plan is achievable and keeps me moving toward my weekly goals.

## Acceptance Criteria

1. **Given** an authenticated user who has submitted a morning check-in for today
   **When** `GET /api/goals/:goalId/daily-objectives` is called and no objectives exist for today
   **Then** the system generates daily objectives considering: current weekly plan, user's energy level from check-in, this week's completed/incomplete objectives, and recent debrief notes (FR26, FR27)
   **And** the `daily_objectives` table is created via migration with RLS policies (FR40)
   **And** the generated objectives are stored and returned

2. **Given** a user with energy_level `high` or `good`
   **When** daily objectives are generated
   **Then** the system produces more objectives with moderate-to-hard difficulty (FR28)

3. **Given** a user with energy_level `low` or `very_low`
   **When** daily objectives are generated
   **Then** the system produces fewer objectives with easy difficulty (FR28)

4. **Given** the AI returns generated daily objectives
   **When** JSON schema validation runs
   **Then** the system validates objectives via class-validator (required fields: title, description, order_index) (FR29)
   **And** on validation failure, the system attempts JSON repair before rejecting

5. **Given** daily objective generation fails on both attempts (initial + retry)
   **When** the second attempt fails
   **Then** the system creates real `daily_objectives` rows from the weekly plan's objectives array with `is_fallback = true` (FR30)
   **And** fallback objectives are still trackable (user can mark done/not done)

6. **Given** a user who has not submitted a check-in for today
   **When** `GET /api/goals/:goalId/daily-objectives` is called
   **Then** the system returns 400 indicating a check-in is required before daily objectives can be generated (FR26)

7. **Given** a user who already has objectives for today
   **When** `GET /api/goals/:goalId/daily-objectives` is called
   **Then** the system returns the existing objectives (no regeneration)

## Tasks / Subtasks

- [x] Task 1: Create `daily_objectives` table migration (AC: #1)
  - [x] 1.1 Apply migration via Supabase MCP with schema: `id uuid PK`, `weekly_plan_id uuid FK→weekly_plans(id) ON DELETE CASCADE`, `goal_id uuid FK→goals(id) ON DELETE CASCADE`, `user_id uuid FK→auth.users(id)`, `date date NOT NULL`, `title text NOT NULL`, `description text NOT NULL`, `difficulty_rating text`, `order_index integer NOT NULL`, `is_completed boolean NOT NULL DEFAULT false`, `is_fallback boolean NOT NULL DEFAULT false`, `created_at timestamptz DEFAULT now()`
  - [x] 1.2 Add CHECK constraint: `difficulty_rating IS NULL OR difficulty_rating IN ('easy', 'moderate', 'hard')`
  - [x] 1.3 Add UNIQUE constraint on `(weekly_plan_id, date, order_index)`
  - [x] 1.4 Enable RLS: `CREATE POLICY "Users can only access their own daily objectives" ON daily_objectives FOR ALL USING ((select auth.uid()) = user_id)`
  - [x] 1.5 Create FK indexes: `idx_daily_objectives_weekly_plan_id`, `idx_daily_objectives_goal_id`, `idx_daily_objectives_user_id`

- [x] Task 2: Create `DailyObjective` interface and `GeneratedDailyObjective` validation class (AC: #4)
  - [x] 2.1 Add `DailyObjective` interface to `src/roadmap/types/daily.types.ts`: `id`, `weekly_plan_id`, `goal_id`, `user_id`, `date`, `title`, `description`, `difficulty_rating`, `order_index`, `is_completed`, `is_fallback`, `created_at`
  - [x] 2.2 Add `DifficultyRating` type: `'easy' | 'moderate' | 'hard'`
  - [x] 2.3 Create `GeneratedDailyObjective` class in `src/roadmap/types/generated-daily-objective.ts` with class-validator decorators: `@IsString()` + `@IsNotEmpty()` for `title` and `description`, `@IsInt()` + `@IsPositive()` for `order_index`, `@IsOptional()` + `@IsIn(['easy', 'moderate', 'hard'])` for `difficulty_rating`

- [x] Task 3: Add `generateDailyObjectives()` to `GenerationService` (AC: #1, #2, #3, #4)
  - [x] 3.1 Add method `generateDailyObjectives(weeklyPlan, energyLevel, context, weekData)` to `src/roadmap/generation.service.ts`
  - [x] 3.2 Build system prompt: coaching assistant generating energy-calibrated daily objectives
  - [x] 3.3 Build user prompt: inject weekly plan focus/objectives, energy level, this week's completion data, recent debrief notes, and assembled context
  - [x] 3.4 Energy calibration rules in prompt: `high`/`good` → 4-6 objectives with moderate/hard difficulty; `low`/`very_low` → 2-3 objectives with easy difficulty
  - [x] 3.5 Call `AiService.generateJSON()` with `appConfig.roadmap.dailyObjectiveTimeoutMs` (10s) and daily model
  - [x] 3.6 Validate output with `GeneratedDailyObjective` + JSON repair pipeline (same pattern as milestones/weekly plans)
  - [x] 3.7 Return `{ objectives: GeneratedDailyObjective[], metadata }` with token usage

- [x] Task 4: Add daily objective methods to `CheckInService` (AC: #1, #5, #6, #7)
  - [x] 4.1 `getDailyObjectives(goalId, userId, date)`: check existing → return if found; check check-in exists → 400 if not; call `generateDailyObjectives()`
  - [x] 4.2 `generateDailyObjectives(goalId, userId, energyLevel)`: get current weekly plan, query week data (completed/incomplete objectives, debrief notes), assemble context, call GenerationService with 2-attempt retry, store results, emit `daily-objectives.generated` event
  - [x] 4.3 `createFallbackObjectives(weeklyPlan, goalId, userId, date)`: map weekly plan objectives to real `daily_objectives` rows with `is_fallback = true`
  - [x] 4.4 `storeDailyObjectives(objectives, weeklyPlanId, goalId, userId, date)`: insert rows into `daily_objectives` table, return stored data
  - [x] 4.5 `getExistingObjectives(goalId, userId, date)`: query existing objectives for today, ordered by `order_index`

- [x] Task 5: Add controller endpoint (AC: #1, #6, #7)
  - [x] 5.1 Add `GET /api/goals/:goalId/daily-objectives` to new `DailyObjectiveController` — calls `checkInService.getDailyObjectives()`, returns 200 with objectives array
  - [x] 5.2 Add full Swagger decorators (`@ApiOperation`, `@ApiResponse` for 200, 400, 401, 429`) and `@Throttle` (60/min)
  - [x] 5.3 Add `@ApiParam` for `goalId`

- [x] Task 6: Unit tests (AC: #1-#7)
  - [x] 6.1 GenerationService tests in `generation.service.spec.ts`:
    - Happy path: generates daily objectives with energy calibration
    - JSON validation passes on valid input
    - JSON repair on malformed input
    - Throws on invalid output after repair
    - Token usage captured in metadata
  - [x] 6.2 CheckInService tests in `check-in.service.spec.ts`:
    - Happy path: generates and stores objectives, emits event
    - Returns existing objectives without regeneration (AC #7)
    - Returns 400 when no check-in exists (AC #6)
    - Fallback on generation failure creates is_fallback rows (AC #5)
    - Energy calibration: high/good produces more objectives (AC #2)
    - Energy calibration: low/very_low produces fewer objectives (AC #3)
    - Stores objectives with correct weekly_plan_id linkage
  - [x] 6.3 Controller tests:
    - GET /daily-objectives delegates to service, returns 200

## Dev Notes

### Critical Architecture Constraints

- **CheckInService owns daily objectives** — add all daily objective methods to existing `src/roadmap/check-in.service.ts`. Do NOT create a new service. CheckInService already has dependencies on ContextPipelineService, GenerationService, EventEmitter2, and AiService.
- **GenerationService owns the AI generation** — add `generateDailyObjectives()` to `src/roadmap/generation.service.ts` following the exact same pattern as `generateWeeklyPlan()`: system prompt + user prompt → `AiService.generateJSON()` → validate with `GeneratedDailyObjective` class → repair if needed → return typed result + metadata.
- **Endpoint goes on RoadmapController** — the architecture specifies `GET /api/goals/:goalId/daily-objectives` on RoadmapController (NOT CheckInController). This matches the routing pattern where `/daily-objectives` is under the roadmap controller's `goals/:goalId/roadmap` parent... Actually per the architecture endpoint table, daily-objectives are at `/api/goals/:goalId/daily-objectives` which is a different base path. Add a new route on RoadmapController or create a dedicated controller similar to CheckInController.
- **No barrel exports** — import directly from file paths with `.js` extension.
- **Supabase admin client** — use `this.supabaseService.getAdminClient()` for all queries. Filter by `user_id` in queries since admin client bypasses RLS.
- **NestJS HTTP exceptions only** — use `BadRequestException` for 400 (missing check-in), `NotFoundException` for 404, `InternalServerErrorException` for generation/storage failures.
- **Response format** — return objectives array directly (no wrapper). JSON fields use `snake_case`.
- **Date handling** — use `new Date().toISOString().split('T')[0]` for today's date string (YYYY-MM-DD format).
- **Synchronous generation** — client waits for response. No 202 + polling. EventEmitter2 ONLY for async side effects (quality evaluation via `daily-objectives.generated` event).

### Energy Calibration Rules

Per FR28, the AI prompt should encode these rules:
- **`high` or `good` energy:** 4-6 objectives, moderate-to-hard difficulty
- **`low` or `very_low` energy:** 2-3 objectives, easy difficulty
- The GenerationService prompt should make these rules explicit so the LLM respects them

### Daily Objective Generation Flow

```
GET /api/goals/:goalId/daily-objectives
  → CheckInService.getDailyObjectives(goalId, userId, date)
    → getExistingObjectives(goalId, userId, date) → return if found
    → getCheckIn(goalId, userId, date) → throw 400 if not found
    → generateDailyObjectives(goalId, userId, checkIn.energy_level)
      → getCurrentWeeklyPlan(goalId) [existing method]
      → queryWeekData(goalId, userId, weeklyPlan) [existing method]
      → contextPipelineService.assembleContext(goalId, userId)
      → generationService.generateDailyObjectives(weeklyPlan, energyLevel, context, weekData)
      → storeDailyObjectives(objectives, weeklyPlanId, goalId, userId, date)
      → eventEmitter.emit('daily-objectives.generated', { goalId, date })
    ← return objectives array
```

### Fallback Pattern

On generation failure (both attempts), create real DB rows from the weekly plan's objectives:
```typescript
const fallback = weeklyPlan.objectives.map((obj, i) => ({
  weekly_plan_id: weeklyPlan.id,
  goal_id: goalId,
  user_id: userId,
  date: today,
  title: obj,
  description: obj,
  order_index: i + 1,
  is_completed: false,
  is_fallback: true,
}));
```
These are real rows in `daily_objectives` — user can still mark them done/not done.

### Default Neutral Energy (FR31)

If a check-in submission failed on the client side but the user tries to get objectives, the gate returns 400. The FR31 scenario ("check-in submission fails, generate with neutral energy") applies if the system detects a failed check-in submission — but per the architecture, the simple implementation is: if no check-in record exists → return 400. The client is responsible for retrying the check-in. The "default neutral energy" fallback is for internal error scenarios where the check-in store succeeded but the energy_level couldn't be read — in that case, default to `'good'`.

### Database Schema

```sql
CREATE TABLE daily_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id uuid NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  difficulty_rating text,
  order_index integer NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  is_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (difficulty_rating IS NULL OR difficulty_rating IN ('easy', 'moderate', 'hard')),
  UNIQUE(weekly_plan_id, date, order_index)
);

-- RLS
ALTER TABLE daily_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own daily objectives"
  ON daily_objectives FOR ALL USING ((select auth.uid()) = user_id);

-- Indexes
CREATE INDEX idx_daily_objectives_weekly_plan_id ON daily_objectives(weekly_plan_id);
CREATE INDEX idx_daily_objectives_goal_id ON daily_objectives(goal_id);
CREATE INDEX idx_daily_objectives_user_id ON daily_objectives(user_id);
```

### Project Structure Notes

- New files:
  - `src/roadmap/types/generated-daily-objective.ts` — class-validator decorated class for LLM output validation
- Modified files:
  - `src/roadmap/types/daily.types.ts` — Add `DailyObjective` interface, `DifficultyRating` type
  - `src/roadmap/generation.service.ts` — Add `generateDailyObjectives()` method with prompt, validation, and repair
  - `src/roadmap/generation.service.spec.ts` — Add daily objective generation tests
  - `src/roadmap/check-in.service.ts` — Add `getDailyObjectives()`, `generateDailyObjectives()`, `createFallbackObjectives()`, `storeDailyObjectives()`, `getExistingObjectives()`
  - `src/roadmap/check-in.service.spec.ts` — Add daily objective service tests
  - `src/roadmap/roadmap.controller.ts` — Add `GET /daily-objectives` endpoint (or new controller)
  - `src/roadmap/roadmap.module.ts` — Register new controller if separate
- Database migration:
  - `create_daily_objectives_table` — Applied via Supabase MCP tool

### Existing Patterns to Follow

**GenerationService.generateWeeklyPlan() pattern** (mirror for daily objectives):
```typescript
async generateDailyObjectives(
  weeklyPlan: WeeklyPlan,
  energyLevel: EnergyLevel,
  context: AssembledContext,
  weekData: { completedObjectives: number; totalObjectives: number; debriefNotes: string[] },
): Promise<{ objectives: GeneratedDailyObjective[]; metadata: Record<string, unknown> }> {
  const model = appConfig.roadmap.dailyModel === 'default'
    ? appConfig.ai.defaultModel
    : appConfig.roadmap.dailyModel;
  const usageRef = { prompt_tokens: 0, completion_tokens: 0 };
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await this.aiService.generateJSON<GeneratedDailyObjective[]>(
        systemPrompt, userPrompt, model,
        { timeoutMs: appConfig.roadmap.dailyObjectiveTimeoutMs, captureUsage: usageRef },
      );
      const validated = this.validateDailyObjectives(result);
      return {
        objectives: validated,
        metadata: {
          model_used: model,
          latency_ms: Date.now() - startTime,
          attempts: attempt,
          prompt_tokens: usageRef.prompt_tokens,
          completion_tokens: usageRef.completion_tokens,
        },
      };
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw lastError;
}
```

**CheckInService.queryWeekData()** already gathers:
- daily_objectives completed/total for the week
- debrief notes from the week
- check-in energy levels

This data feeds directly into daily objective generation context.

**Event emission pattern:**
```typescript
this.eventEmitter.emit('daily-objectives.generated', { goalId, date });
```

### What NOT to Do

- Do NOT create `debriefs` table — that is Story 6.4
- Do NOT add PATCH endpoint for marking objectives done — that is Story 6.3
- Do NOT add QualityService event listener — that is Story 7.1
- Do NOT modify `context-pipeline.service.ts` or `rerank.service.ts`
- Do NOT add new npm packages — all dependencies exist
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT use raw `Error` — use NestJS HTTP exceptions
- Do NOT forget `.js` extensions on all relative imports
- Do NOT generate daily objectives without checking for existing ones first (idempotency)
- Do NOT generate daily objectives without checking check-in exists (the gate is mandatory per FR26)
- Do NOT use EventEmitter2 for generation triggering — generation is synchronous

### Previous Story Intelligence

**From Story 6.1 (most recent — in-progress):**
- CheckInService already has `submitCheckIn()`, `getCheckIn()` (with user_id filter), `getCheckInHistory()`
- CheckInController exists at `src/roadmap/check-in.controller.ts` with `POST/GET /goals/:goalId/checkin`
- `daily.types.ts` has `CheckIn` interface and `EnergyLevel` type — extend with `DailyObjective` and `DifficultyRating`
- Duplicate detection via PostgreSQL 23505 unique violation → `ConflictException`
- Error messages sanitized (log details, throw generic)
- `@MaxLength` added on text fields for safety
- 362 tests passing, 0 regressions — maintain this baseline
- Code review found: always filter by user_id (admin client bypasses RLS), type DTOs precisely

**From Story 5.2:**
- Supabase error handling: always check `.error` property
- Test mocks must match Supabase behavior (`{ data, error }`)
- Event listeners use `@OnEvent` decorator, fire-and-forget
- `queryWeekData()` method already exists for aggregating week's objectives and debriefs

**From Story 5.1:**
- CheckInService dependencies: SupabaseService, ContextPipelineService, GenerationService, EventEmitter2, AiService
- `storeWeeklyPlan` pattern: insert → select → check error → return typed
- `getActiveRoadmapAndMilestone()` validates goal has completed roadmap
- `calculateWeekNumber()` exists for week tracking

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce commits like:
```
feat(roadmap): implement energy-calibrated daily objective generation
```

Last 5 commits:
- `53374fa feat(roadmap): implement weekly and monthly summary generation and embedding`
- `a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle`
- `257ecd7 feat(roadmap): harden roadmap retrieval with status handling and API docs`
- `a7b5971 feat(roadmap): implement milestone generation via LLM orchestration`
- `1c14408 feat(roadmap): implement 3-tier context retrieval pipeline for generation`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Daily Objective Fallback]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cascading Fallback for On-Demand Generation Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Check-In / Debrief Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema — daily_objectives]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — Revised]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Generation Response Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Energy-Calibrated Generation]
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Repair Pipeline Pattern]
- [Source: _bmad-output/implementation-artifacts/6-1-morning-check-in.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/5-2-weekly-and-monthly-summaries-with-embedding.md]
- [Source: _bmad-output/implementation-artifacts/5-1-generate-and-retrieve-weekly-plan.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed test mock issue: `from()` table-name matching intercepted `storeDailyObjectives` call to `daily_objectives` table during `queryWeekData` phase. Resolved by using call-index-based mocking instead of table-name matching.

### Completion Notes List

- Task 1: Applied `create_daily_objectives_table` migration via Supabase MCP. Table created with all FKs (CASCADE on weekly_plans, goals), CHECK constraint on difficulty_rating, UNIQUE on (weekly_plan_id, date, order_index), RLS policy, and 3 FK indexes. Verified via `list_tables` and `get_advisors` (0 security issues).
- Task 2: Added `DailyObjective` interface and `DifficultyRating` type to `daily.types.ts`. Created `GeneratedDailyObjective` validation class with class-validator decorators matching the story spec exactly.
- Task 3: Added `generateDailyObjectives()` to `GenerationService` following the exact same pattern as `generateWeeklyPlan()`: 2-attempt retry, `AiService.generateJSON()`, validation + repair pipeline. System prompt encodes energy calibration rules (high/good → 4-6 moderate/hard; low/very_low → 2-3 easy). User prompt includes weekly plan focus, objectives, energy level, week progress, debrief notes, and assembled context.
- Task 4: Added 5 methods to `CheckInService`: `getDailyObjectives()` (public entry point with idempotency check + check-in gate), `generateDailyObjectivesForDay()` (private orchestrator), `createFallbackObjectives()` (maps weekly plan objectives to fallback rows), `storeDailyObjectives()` (batch insert), `getExistingObjectives()` (query by date). All methods filter by user_id. Events emitted via EventEmitter2.
- Task 5: Added `GET /daily-objectives` endpoint on new `DailyObjectiveController` at `goals/:goalId/daily-objectives` (matching architecture spec) with Swagger decorators for 200, 400, 401, 429 responses and `@Throttle` (60/min). Endpoint delegates to `checkInService.getDailyObjectives()`.
- Task 6: Added 11 GenerationService tests (energy calibration, validation, repair, retry, token usage, prompts), 5 CheckInService tests (happy path with event + energy level assertion, existing objectives idempotency, 400 on missing check-in, fallback on failure, weekly_plan_id linkage), and 1 controller test. Total: 381 tests passing (was 362), 0 regressions.

### Change Log

- 2026-02-22: Implemented Story 6.2 — energy-calibrated daily objective generation with fallback, validation, and full test coverage.
- 2026-02-22: Code review fixes — moved daily-objectives endpoint to dedicated controller at correct architecture URL path (`/api/goals/:goalId/daily-objectives`), added `@Throttle` (60/min), added `context_chunks_used` to generation metadata, typed metadata as `GenerationMetadata`, added energy level propagation assertion to service test.

### File List

- `src/roadmap/types/daily.types.ts` — Added `DailyObjective` interface, `DifficultyRating` type
- `src/roadmap/types/generated-daily-objective.ts` — New: class-validator decorated class for LLM output validation
- `src/roadmap/generation.service.ts` — Added `generateDailyObjectives()`, `validateDailyObjectives()`, `buildDailyObjectivesSystemPrompt()`, `buildDailyObjectivesUserPrompt()`
- `src/roadmap/check-in.service.ts` — Added `getDailyObjectives()`, `generateDailyObjectivesForDay()`, `createFallbackObjectives()`, `storeDailyObjectives()`, `getExistingObjectives()`
- `src/roadmap/daily-objective.controller.ts` — New: `GET /daily-objectives` endpoint with Swagger decorators and `@Throttle`
- `src/roadmap/roadmap.controller.ts` — Removed daily-objectives endpoint (moved to dedicated controller)
- `src/roadmap/roadmap.module.ts` — Registered `DailyObjectiveController`
- `src/roadmap/generation.service.spec.ts` — Added 11 daily objective generation tests
- `src/roadmap/check-in.service.spec.ts` — Added 5 daily objective service tests (with energy level assertion)
- `src/roadmap/daily-objective.controller.spec.ts` — New: 1 daily objectives controller test
- `src/roadmap/roadmap.controller.spec.ts` — Removed daily-objectives test (moved to dedicated spec)
- Database migration: `create_daily_objectives_table` applied via Supabase MCP
