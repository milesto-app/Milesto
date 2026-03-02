# Story 7.1: Per-Type Quality Evaluation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Generated: 2026-02-23 | Epic 7: Generation Quality & Observability | Story 1 of 2 -->

## Story

As a **team member**,
I want each generation scored for quality behind the scenes with type-specific dimensions,
so that quality regressions are detected automatically and generation can be improved over time.

## Acceptance Criteria

1. **Given** a milestone generation completes successfully
   **When** the `roadmap.generated` event fires via EventEmitter2
   **Then** QualityService evaluates the milestones asynchronously via LLM-as-judge (FR46)
   **And** scores are computed on: coherence, personalization, progression, and deadline-alignment (0-5 scale each) (FR47)
   **And** scores are stored on the `roadmaps.quality_scores` JSONB column (FR50)
   **And** the evaluation has zero impact on the generation response latency (NFR7)

2. **Given** a weekly plan generation completes successfully
   **When** the `weekly-plan.generated` event fires
   **Then** QualityService evaluates the plan on: milestone-alignment, progress-adaptation, and actionability (0-5 scale each) (FR48)
   **And** scores are stored on the `weekly_plans.quality_scores` JSONB column (FR50)

3. **Given** a daily objective generation completes successfully
   **When** the `daily-objectives.generated` event fires
   **Then** QualityService evaluates the objectives on: energy-calibration, specificity, and achievability (0-5 scale each) (FR49)
   **And** scores are stored on the daily objective records via `quality_scores` JSONB column (FR50)

4. **Given** any quality dimension scores below 3/5
   **When** the score is stored
   **Then** the system logs a warning with generation context (goal ID, generation type, individual dimension scores) (FR51)

5. **Given** the LLM-as-judge call fails
   **When** the error is caught
   **Then** the error is logged and the generation continues without quality scores — no user impact

## Tasks / Subtasks

- [x] Task 1: Add `quality_scores` column to `daily_objectives` table (AC: #3)
  - [x] 1.1 Apply migration via Supabase MCP: `ALTER TABLE daily_objectives ADD COLUMN quality_scores jsonb DEFAULT null`
  - [x] 1.2 No RLS changes needed — existing policy covers all columns

- [x] Task 2: Create quality evaluation type definitions (AC: #1-#5)
  - [x] 2.1 Create `src/roadmap/types/quality.types.ts` with:
    - `MilestoneQualityScores` interface: `{ coherence: number, personalization: number, progression: number, deadline_alignment: number, composite: number }`
    - `WeeklyPlanQualityScores` interface: `{ milestone_alignment: number, progress_adaptation: number, actionability: number, composite: number }`
    - `DailyObjectiveQualityScores` interface: `{ energy_calibration: number, specificity: number, achievability: number, composite: number }`
    - `GenerationType` type: `'milestone' | 'weekly_plan' | 'daily_objective'`
    - Event payload interfaces: `RoadmapGeneratedEvent`, `WeeklyPlanGeneratedEvent`, `DailyObjectivesGeneratedEvent`

- [x] Task 3: Implement `QualityService` core (AC: #1-#5)
  - [x] 3.1 Create `src/roadmap/quality.service.ts` with:
    - Inject `AiService`, `SupabaseService`, `Logger`
    - Private method `evaluateQuality<T>(generationType: GenerationType, content: string, context: string): Promise<T>` — calls `AiService.generateJSON()` with type-specific LLM-as-judge prompt using `appConfig.eval.judgeModel` and `appConfig.eval.judgeTemperature`
    - Private method `clampScore(score: number): number` — clamp to 0-5 range (same pattern as IntakeQualityService)
    - Private method `checkWarnings(generationType: GenerationType, scores: Record<string, number>, goalId: string): void` — log warn if any dimension < 3

- [x] Task 4: Add milestone quality evaluation listener (AC: #1, #4, #5)
  - [x] 4.1 Add `@OnEvent('roadmap.generated')` handler `handleRoadmapGenerated(payload: { roadmapId: string, goalId: string })`
  - [x] 4.2 Load roadmap + milestones from `roadmapId`
  - [x] 4.3 Load goal data (title, description, deadline) for context
  - [x] 4.4 Build evaluation prompt with milestone content + goal context
  - [x] 4.5 Call `evaluateQuality<MilestoneQualityScores>('milestone', ...)`
  - [x] 4.6 Compute composite score (average of 4 dimensions)
  - [x] 4.7 Store scores on `roadmaps.quality_scores` via Supabase update
  - [x] 4.8 Call `checkWarnings()` — log warn for any dimension < 3
  - [x] 4.9 Wrap entire handler in try/catch — log error, never throw

- [x] Task 5: Add weekly plan quality evaluation listener (AC: #2, #4, #5)
  - [x] 5.1 Add `@OnEvent('weekly-plan.generated')` handler `handleWeeklyPlanGenerated(payload: { planId: string, goalId: string })`
  - [x] 5.2 Load weekly plan from `planId` (focus, objectives)
  - [x] 5.3 Load current milestone for context (milestone title, description, expected_outcome)
  - [x] 5.4 Build evaluation prompt with plan content + milestone context
  - [x] 5.5 Call `evaluateQuality<WeeklyPlanQualityScores>('weekly_plan', ...)`
  - [x] 5.6 Compute composite score (average of 3 dimensions)
  - [x] 5.7 Store scores on `weekly_plans.quality_scores` via Supabase update
  - [x] 5.8 Call `checkWarnings()`
  - [x] 5.9 Wrap in try/catch — log error, never throw

- [x] Task 6: Add daily objective quality evaluation listener (AC: #3, #4, #5)
  - [x] 6.1 Add `@OnEvent('daily-objectives.generated')` handler `handleDailyObjectivesGenerated(payload: { goalId: string, date: string })`
  - [x] 6.2 Load daily objectives for `goalId + date` (title, description, difficulty_rating, is_fallback)
  - [x] 6.3 Skip evaluation if all objectives are fallback (is_fallback = true) — no AI content to evaluate
  - [x] 6.4 Load check-in for `goalId + date` to get energy_level for context
  - [x] 6.5 Build evaluation prompt with objectives content + energy level context
  - [x] 6.6 Call `evaluateQuality<DailyObjectiveQualityScores>('daily_objective', ...)`
  - [x] 6.7 Compute composite score (average of 3 dimensions)
  - [x] 6.8 Update `daily_objectives.quality_scores` for ALL objectives matching `goalId + date`
  - [x] 6.9 Call `checkWarnings()`
  - [x] 6.10 Wrap in try/catch — log error, never throw

- [x] Task 7: Register `QualityService` in `RoadmapModule` (AC: #1-#3)
  - [x] 7.1 Add `QualityService` to `providers` array in `src/roadmap/roadmap.module.ts`
  - [x] 7.2 Add import for `QualityService` with `.js` extension

- [x] Task 8: Unit tests (AC: #1-#5)
  - [x] 8.1 Create `src/roadmap/quality.service.spec.ts`:
    - Milestone evaluation happy path: loads data, calls AiService, stores scores on roadmap
    - Weekly plan evaluation happy path: loads data, calls AiService, stores scores on weekly plan
    - Daily objective evaluation happy path: loads data, calls AiService, stores scores on all objectives
    - Fallback skip: daily objectives with all `is_fallback = true` skips evaluation
    - Warning logging: dimension below 3 → `logger.warn` called with correct context
    - AiService failure: error logged, no throw, no scores stored
    - DB load failure: error logged, no throw
    - Score clamping: values outside 0-5 are clamped
  - [x] 8.2 Verify no regressions on existing tests (maintain 405+ passing)

## Dev Notes

### Critical Architecture Constraints

- **QualityService lives in RoadmapModule** — create `src/roadmap/quality.service.ts`. Do NOT create a separate module.
- **Async via EventEmitter2** — QualityService listens for generation events. Evaluation MUST NOT block generation responses. Follow `@OnEvent()` fire-and-forget pattern.
- **Three distinct event listeners** — one per generation type: `roadmap.generated`, `weekly-plan.generated`, `daily-objectives.generated`. Each has different scoring dimensions and different data sources.
- **Use `appConfig.eval` for LLM config** — judge model is `appConfig.eval.judgeModel` (`x-ai/grok-4.1-fast`), temperature is `appConfig.eval.judgeTemperature` (0), timeout is `appConfig.eval.callTimeoutMs` (120_000ms).
- **AiService.generateJSON()** — all LLM calls go through AiService. Never import OpenAI SDK directly.
- **Supabase admin client** — use `this.supabaseService.getAdminClient()` for all queries.
- **NestJS Logger** — use `private readonly logger = new Logger(QualityService.name)`. Log at `warn` level for low scores (any dimension < 3/5). Log at `error` level for failures.
- **Never throw from event listeners** — wrap entire handler in try/catch, log error, return silently.
- **0-5 integer scale** — all quality dimensions are scored 0-5 (not 0-1 like intake quality). This is different from IntakeQualityService's 0-1 composite scale.
- **Warn threshold is 3** — FR51 says "any quality dimension scores below 3/5" triggers a warning.
- **No barrel exports** — import directly from file paths with `.js` extension.
- **snake_case JSON** — all quality score field names use snake_case.

### Event Payloads (from existing code)

```typescript
// src/roadmap/roadmap.service.ts:76
this.eventEmitter.emit('roadmap.generated', {
  roadmapId: roadmap.id,
  goalId,
});

// src/roadmap/check-in.service.ts:633
this.eventEmitter.emit('weekly-plan.generated', {
  planId: weeklyPlan.id,
  goalId,
});

// src/roadmap/check-in.service.ts:397
this.eventEmitter.emit('daily-objectives.generated', {
  goalId,
  date: today,
});
```

### Quality Score Storage

```
Milestones  → roadmaps.quality_scores (jsonb column already exists)
Weekly Plan → weekly_plans.quality_scores (jsonb column already exists)
Daily Objs  → daily_objectives.quality_scores (NEW — add via migration)
```

**Daily objective quality scores** are stored on ALL objectives for that goal+date (same generation event). This is consistent with per-generation-event storage.

### LLM-as-Judge Evaluation Prompts

Each generation type needs a specific evaluation prompt. The prompt should:
1. Present the generated content to evaluate
2. Provide context (goal, milestone, energy level, etc.) for calibrated scoring
3. Request scores on the type-specific dimensions (0-5 scale each)
4. Return structured JSON with dimension scores

**Milestone dimensions (FR47):**
- `coherence` — milestones form a logical progression toward the goal
- `personalization` — milestones reflect user's constraints, experience, and preferences
- `progression` — difficulty/complexity increases appropriately across milestones
- `deadline_alignment` — milestone timing aligns with the user's target deadline

**Weekly plan dimensions (FR48):**
- `milestone_alignment` — weekly focus and objectives advance the current milestone
- `progress_adaptation` — plan accounts for actual progress (completions, debriefs)
- `actionability` — objectives are specific, concrete, and can be acted upon

**Daily objective dimensions (FR49):**
- `energy_calibration` — objective count and difficulty match the user's energy level
- `specificity` — objectives are clear and unambiguous
- `achievability` — objectives can realistically be completed in one day

### Evaluation Data Loading Strategy

```
handleRoadmapGenerated({ roadmapId, goalId }):
  → Load roadmaps WHERE id = roadmapId (for generation_metadata)
  → Load milestones WHERE roadmap_id = roadmapId ORDER BY order_index
  → Load goals WHERE id = goalId (for title, description, target_date)
  → Build prompt: milestones JSON + goal context
  → Evaluate → Store on roadmaps.quality_scores

handleWeeklyPlanGenerated({ planId, goalId }):
  → Load weekly_plans WHERE id = planId (for focus, objectives)
  → Load milestones WHERE id = weekly_plan.milestone_id (for milestone context)
  → Build prompt: weekly plan JSON + milestone context
  → Evaluate → Store on weekly_plans.quality_scores

handleDailyObjectivesGenerated({ goalId, date }):
  → Load daily_objectives WHERE goal_id = goalId AND date = date
  → If ALL is_fallback = true → skip evaluation, return
  → Load check_ins WHERE goal_id = goalId AND date = date (for energy_level)
  → Build prompt: objectives JSON + energy level
  → Evaluate → Update ALL daily_objectives quality_scores for goal+date
```

### IntakeQualityService Reference Pattern

Follow the same structural pattern as `src/intake/intake-quality.service.ts`:
- `@OnEvent` decorator for async event handling
- Try/catch wrapping the entire handler
- Private `clampScore()` method for score normalization
- Composite score calculated as average of all dimensions
- Warning logging at `warn` level with full context
- `AiService.generateJSON()` for LLM evaluation with structured output

**Key differences from IntakeQualityService:**
- IntakeQualityService uses 0-1 scale → QualityService uses 0-5 scale
- IntakeQualityService has composite threshold of 0.5 → QualityService warns on ANY dimension < 3
- IntakeQualityService has 3 layers (structural, semantic, LLM) → QualityService has LLM-only evaluation
- IntakeQualityService stores on `intake_batches` → QualityService stores on 3 different tables

### Project Structure Notes

- New files:
  - `src/roadmap/quality.service.ts` — QualityService with 3 event listeners
  - `src/roadmap/quality.service.spec.ts` — Unit tests
  - `src/roadmap/types/quality.types.ts` — Quality score interfaces and event payload types
- Modified files:
  - `src/roadmap/roadmap.module.ts` — Register QualityService as provider
  - `src/roadmap/types/daily.types.ts` — Add `quality_scores` to `DailyObjective` interface (if not already present)

### What NOT to Do

- Do NOT create a separate QualityModule — QualityService is a provider in RoadmapModule
- Do NOT add any API endpoints — quality evaluation is internal-only, no REST API
- Do NOT modify generation flows — QualityService only listens to events after generation completes
- Do NOT modify `roadmap.service.ts`, `check-in.service.ts`, or `generation.service.ts` — event emissions already exist
- Do NOT block generation responses — all quality evaluation is async via EventEmitter2
- Do NOT throw exceptions from event listeners — always catch and log
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT use raw `Error` — log error details from caught exceptions
- Do NOT forget `.js` extensions on all relative imports
- Do NOT evaluate fallback daily objectives (is_fallback = true) — only evaluate AI-generated content
- Do NOT use 0-1 scale — use 0-5 scale per FR47-49
- Do NOT install new npm packages — all dependencies exist (`@nestjs/event-emitter`, `openai` via AiService)
- Do NOT create a Cohere or external integration — QualityService uses AiService exclusively
- Do NOT add check-in/debrief history endpoints — those already exist

### Previous Story Intelligence

**From Story 6.4 (End-of-Day Debrief — done):**
- Event listener pattern established in CheckInService: `@OnEvent('debrief.submitted')` → try/catch → log success/failure. QualityService uses the same pattern.
- DebriefController created as separate controller following DailyObjectiveController pattern. No new controller needed for this story.
- 405 tests passing, 0 regressions — maintain this baseline.
- `appConfig.throttle` patterns established: `aiEndpointTtlMs` for POST, `defaultTtlMs` for GET. Not relevant here (no endpoints).

**From Story 6.3 (Task Completion Tracking — done):**
- `updateDailyObjective()` in CheckInService updates individual objectives. QualityService will batch-update quality_scores on all objectives for a date.
- Code review found: always filter by `user_id` (admin client bypasses RLS).

**From Story 6.2 (Generate Daily Objectives — done):**
- `daily-objectives.generated` event emitted at `check-in.service.ts:397` with payload `{ goalId, date: today }`.
- Daily objectives stored with `is_fallback` flag — QualityService should skip evaluation when all objectives are fallback.
- `DailyObjective` interface in `daily.types.ts` — needs `quality_scores` field added.

**From Story 5.2 (Weekly & Monthly Summaries — done):**
- `summary.generated` event — NOT relevant to QualityService (summaries are not evaluated for quality per FRs).
- `weekly-plan.generated` event emitted at `check-in.service.ts:633` with payload `{ planId, goalId }`.

**From Story 4.3 (Generate Milestone Roadmap — done):**
- `roadmap.generated` event emitted at `roadmap.service.ts:76` with payload `{ roadmapId, goalId }`.
- `roadmaps.quality_scores` JSONB column already exists in schema.

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce:
```
feat(roadmap): implement per-type async quality evaluation via LLM-as-judge
```

Last 5 commits:
- `78d8f4c feat(roadmap): implement end-of-day debrief submission and embedding`
- `d6cc2b5 feat(roadmap): implement energy-calibrated daily objective generation and tracking`
- `53374fa feat(roadmap): implement weekly and monthly summary generation and embedding`
- `a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle`
- `257ecd7 feat(roadmap): harden roadmap retrieval with status handling and API docs`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 7.1]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR46-FR51]
- [Source: _bmad-output/planning-artifacts/architecture.md#Quality Monitoring (FR46-53)] (line 700)
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — QualityService] (line 822)
- [Source: _bmad-output/planning-artifacts/architecture.md#EventEmitter2 Events — roadmap.generated, weekly-plan.generated, daily-objectives.generated] (line 1737-1739)
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR7 — async quality evaluation zero latency impact] (line 1886)
- [Source: _bmad-output/planning-artifacts/architecture.md#New Directory Structure — quality.service.ts] (line 1392)
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure — FR46-53 → quality.service.ts] (line 1724)
- [Source: src/roadmap/roadmap.service.ts#emit roadmap.generated] (line 76)
- [Source: src/roadmap/check-in.service.ts#emit weekly-plan.generated] (line 633)
- [Source: src/roadmap/check-in.service.ts#emit daily-objectives.generated] (line 397)
- [Source: src/intake/intake-quality.service.ts#handleBatchServed — LLM-as-judge reference pattern] (line 283)
- [Source: src/config/app.config.ts#eval — judgeModel, judgeTemperature, callTimeoutMs]
- [Source: src/roadmap/types/roadmap.types.ts#quality_scores field] (line 11)
- [Source: src/roadmap/types/weekly-plan.types.ts#quality_scores field] (line 19)
- [Source: _bmad-output/implementation-artifacts/6-4-end-of-day-debrief.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Implemented QualityService with three async event listeners (`roadmap.generated`, `weekly-plan.generated`, `daily-objectives.generated`) following the IntakeQualityService pattern
- Each listener loads contextual data, builds an LLM-as-judge evaluation prompt with type-specific dimensions, calls AiService.generateJSON(), clamps scores to 0-5, computes composite average, stores JSONB scores on the corresponding table, and logs warnings for any dimension < 3
- Daily objective evaluation skips when all objectives are fallback (is_fallback = true)
- All three handlers wrapped in try/catch — errors logged at `error` level, never thrown
- Added `quality_scores` JSONB column to `daily_objectives` table via Supabase migration
- Added `quality_scores` field to `DailyObjective` TypeScript interface
- Created type definitions for all three quality score interfaces, GenerationType union, and event payload interfaces
- Registered QualityService as provider in RoadmapModule
- 21 unit tests covering: 3 happy paths, fallback skip, warning logging (2), score clamping (3), DB load failures (5), AiService failures (3), DB update failures (2)
- 426 total tests passing (21 new + 405 existing), 0 regressions
- ESLint clean (0 errors, warnings are safe `any` in test mocks consistent with other test files)

#### Senior Developer Review (AI) — 2026-02-23

**Reviewer:** Claude Opus 4.6 (adversarial code review)

**Fixes Applied (3 MEDIUM):**
1. Removed unused `generationType` parameter from private `evaluateQuality` method and updated all 3 call sites (dead code elimination)
2. Added missing weekly plan DB update failure test (symmetric coverage with roadmap and daily objective update failure tests)
3. Added empty milestones array and empty daily objectives array edge case tests (distinct from DB error tests — exercises `!data?.length` branches)

**Result:** 24 unit tests (3 new), 429 total passing, 0 regressions. All ACs verified as implemented. 3 LOW issues noted but not fixed (inline prompts, unrounded composite, loose quality_scores typing — all consistent with existing codebase patterns).

### File List

- `src/roadmap/quality.service.ts` — NEW: QualityService with 3 event listeners and LLM-as-judge evaluation
- `src/roadmap/quality.service.spec.ts` — NEW: 24 unit tests for QualityService
- `src/roadmap/types/quality.types.ts` — NEW: Quality score interfaces and event payload types
- `src/roadmap/types/daily.types.ts` — MODIFIED: Added `quality_scores` field to DailyObjective interface
- `src/roadmap/roadmap.module.ts` — MODIFIED: Registered QualityService as provider

## Change Log

- 2026-02-23: Implemented per-type quality evaluation with LLM-as-judge for milestones, weekly plans, and daily objectives (Story 7.1)
- 2026-02-23: Code review fixes — removed unused parameter, added 3 missing tests (weekly plan update failure, empty milestones, empty objectives)
