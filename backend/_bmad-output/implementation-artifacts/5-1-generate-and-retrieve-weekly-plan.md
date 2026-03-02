# Story 5.1: Generate and Retrieve Weekly Plan

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-22 -->

## Story

As a **user**,
I want to receive a weekly plan that adapts to my actual progress and milestone targets,
So that each week's plan reflects reality — not a static schedule written months ago.

## Acceptance Criteria

1. **Given** an authenticated user with a completed roadmap and active milestone **When** `GET /api/goals/:goalId/weekly-plan` is called and no active plan exists for the current week **Then** the system generates a weekly plan on-demand, informed by: current monthly milestone, last monthly summary (if any), last weekly summary (if any), and previous daily objective completion data (FR21) **And** the `weekly_plans` table is created via migration with RLS policies and UNIQUE constraint on `(roadmap_id, week_number)` (FR39) **And** the generated plan is stored, linked to the current milestone, and returned

2. **Given** an authenticated user **When** `POST /api/goals/:goalId/weekly-plan/generate` is called **Then** the system explicitly generates a new weekly plan with the same context assembly as on-demand generation

3. **Given** the AI returns a generated weekly plan **When** JSON schema validation runs **Then** the system validates the plan via class-validator (required fields: focus, objectives array, week_number, week_start_date) (FR22) **And** on validation failure, the system attempts JSON repair before rejecting

4. **Given** weekly plan generation fails on both attempts (initial + retry) **When** the second attempt fails **Then** the system creates a fallback plan using the current milestone's description and key objectives as the weekly focus (FR25) **And** the fallback is stored as a real weekly plan record with `is_fallback = true`

5. **Given** an authenticated user with an active weekly plan **When** `GET /api/goals/:goalId/weekly-plan` is called **Then** the system returns the current active weekly plan with its daily objectives (FR44)

6. **Given** an active weekly plan whose `week_start_date + 7 days` has passed **When** the user requests a new weekly plan or interacts with weekly plan endpoints **Then** the system auto-transitions the old plan to `completed` status before generating the new one

7. **Given** all weekly plan endpoints **When** the test suite runs **Then** comprehensive unit tests cover all acceptance criteria including edge cases (fallback generation, auto-completion, no roadmap, expired plan lifecycle) **And** all existing 293 tests continue to pass with zero regressions

## Tasks / Subtasks

- [x] Task 1: Create `weekly_plans` database table via migration (AC: #1)
  - [x] 1.1 Create `weekly_plans` table with all columns: id, roadmap_id, milestone_id, goal_id, user_id, week_number, week_start_date, focus, objectives (jsonb), generation_context (jsonb), summary (jsonb), status, is_fallback, model_used, generation_metadata (jsonb), quality_scores (jsonb), created_at
  - [x] 1.2 Add CHECK constraints: `status IN ('active', 'completed')`
  - [x] 1.3 Add UNIQUE constraint: `(roadmap_id, week_number)`
  - [x] 1.4 Enable RLS: `(select auth.uid()) = user_id`
  - [x] 1.5 Create FK indexes: `idx_weekly_plans_roadmap_id`, `idx_weekly_plans_milestone_id`, `idx_weekly_plans_goal_id`, `idx_weekly_plans_user_id`

- [x] Task 2: Create weekly plan types and validation DTO (AC: #3)
  - [x] 2.1 Create `src/roadmap/types/weekly-plan.types.ts` with `WeeklyPlan`, `WeeklyPlanStatus`, `WeeklySummary`, `GenerationContext` interfaces
  - [x] 2.2 Create `src/roadmap/types/generated-weekly-plan.ts` with class-validator decorated `GeneratedWeeklyPlan` class (focus, objectives array, week_number)

- [x] Task 3: Extend GenerationService with weekly plan generation (AC: #2, #3, #4)
  - [x] 3.1 Add `generateWeeklyPlan(context: AssembledContext, milestone: Milestone, weekNumber: number, generationContext: GenerationContext)` method
  - [x] 3.2 Build system + user prompts for weekly plan generation (milestone context, progress data, previous summaries)
  - [x] 3.3 Call `AiService.generateJSON<GeneratedWeeklyPlan>()` with `appConfig.roadmap.weeklyPlanTimeoutMs` timeout
  - [x] 3.4 Validate output with class-validator + JSON repair pipeline (reuse existing `validateAndRepair` pattern)
  - [x] 3.5 Return `GeneratedWeeklyPlan` with `GenerationMetadata`
  - [x] 3.6 Add `generateWeeklySummary(completedPlan: WeeklyPlan, goalId: string)` method for summary generation (hybrid: computed + optional LLM narrative)

- [x] Task 4: Implement CheckInService for weekly plan orchestration (AC: #1, #2, #4, #5, #6)
  - [x] 4.1 Create `src/roadmap/check-in.service.ts` with constructor injecting SupabaseService, ContextPipelineService, GenerationService, EventEmitter2
  - [x] 4.2 Implement `getCurrentWeeklyPlan(goalId, userId)`: auto-complete expired plans, return active plan with daily objectives, or null
  - [x] 4.3 Implement `generateWeeklyPlan(goalId, userId)`: summary-before-generation chain (auto-complete → summarize previous → monthly summary check → assemble context → generate → store)
  - [x] 4.4 Implement `autoCompleteExpiredPlans(goalId)`: update `status = 'completed'` where `week_start_date + 7 < now()`
  - [x] 4.5 Implement `getLastCompletedPlanWithoutSummary(goalId)`: find completed plan with null summary
  - [x] 4.6 Implement `generateMonthlySummaryIfNeeded(goalId)`: check milestone-month boundary, generate if needed
  - [x] 4.7 Implement `createFallbackPlan(milestone, goalId, userId, weekNumber)`: create real weekly plan row with `is_fallback = true` using milestone description/expected_outcome as focus
  - [x] 4.8 Implement cascading fallback: attempt 1 → attempt 2 → fallback plan
  - [x] 4.9 Emit `weekly-plan.generated` event after successful generation (for QualityService)
  - [x] 4.10 Emit `summary.generated` event after summary generation (for async embedding)

- [x] Task 5: Add weekly plan controller endpoints (AC: #1, #2, #5)
  - [x] 5.1 Add `GET /api/goals/:goalId/weekly-plan` endpoint to RoadmapController — calls `getCurrentWeeklyPlan()`, auto-generates if no active plan exists
  - [x] 5.2 Add `POST /api/goals/:goalId/weekly-plan/generate` endpoint — explicit trigger for weekly plan generation
  - [x] 5.3 Add Swagger decorators: `@ApiOperation`, `@ApiParam`, `@ApiResponse` (200, 400, 401, 404)
  - [x] 5.4 Add `@Throttle` with `aiEndpointLimit` on POST generate endpoint (5/min)
  - [x] 5.5 Validate goal has active roadmap before proceeding (400 if not)

- [x] Task 6: Register CheckInService in RoadmapModule (AC: all)
  - [x] 6.1 Add `CheckInService` to providers array in `roadmap.module.ts`
  - [x] 6.2 Verify all dependencies are injectable (SupabaseService, ContextPipelineService, GenerationService, EventEmitter2)

- [x] Task 7: Write comprehensive unit tests (AC: #7)
  - [x] 7.1 Create `src/roadmap/check-in.service.spec.ts` with tests:
    - generateWeeklyPlan: happy path — generates plan with context
    - generateWeeklyPlan: auto-completes expired plan before generating
    - generateWeeklyPlan: generates summary for last completed plan before new plan
    - generateWeeklyPlan: fallback on double failure — creates is_fallback plan
    - getCurrentWeeklyPlan: returns existing active plan
    - getCurrentWeeklyPlan: returns null when no active plan
    - autoCompleteExpiredPlans: updates expired plans to completed
    - autoCompleteExpiredPlans: ignores non-expired plans
    - Cross-user access: user_id filter prevents cross-user data
  - [x] 7.2 Extend `src/roadmap/generation.service.spec.ts` with tests:
    - generateWeeklyPlan: happy path with valid JSON response
    - generateWeeklyPlan: JSON repair on validation failure
    - generateWeeklyPlan: throws on double validation failure
    - generateWeeklySummary: hybrid summary with computed data
  - [x] 7.3 Extend `src/roadmap/roadmap.controller.spec.ts` with tests:
    - GET /weekly-plan: passes goalId and userId to service
    - POST /weekly-plan/generate: passes goalId and userId to service
    - GET /weekly-plan: returns 404 when no roadmap exists
  - [x] 7.4 Run full test suite: all 293 existing tests + new tests pass, 0 regressions

## Dev Notes

### Developer Context

**What this story delivers:** The weekly planning layer of the adaptive coaching loop — generating progress-informed weekly plans that sit between long-term milestones and daily objectives. This is the first story in Epic 5 (Adaptive Weekly Planning).

**Critical architectural context:** This story introduces the `CheckInService` — the service that will own all daily-loop CRUD and orchestration (weekly plans, daily objectives, check-ins, debriefs). Story 5.1 creates the service with weekly plan functionality only. Stories 6.1-6.4 will extend it with check-in, daily objective, and debrief functionality.

**Key design decisions the developer MUST follow:**
1. **Summary-before-generation chain** — When generating a new weekly plan, ALWAYS check for unsummarized completed plans first. Generate summary → embed → then generate new plan. This creates the compounding feedback loop.
2. **Auto-complete expired plans lazily** — Check on every read, not via cron. `week_start_date + 7 < now()` → set status to `completed`.
3. **Cascading fallback with real rows** — On generation failure (2 attempts), create a real `weekly_plans` row with `is_fallback = true` using the milestone description. Never return virtual/transient fallback data.
4. **Synchronous generation** — Client waits for the response. No 202 + polling. EventEmitter2 only for async side effects (quality eval, summary embedding).

**This story does NOT build:** Daily objectives (Story 6.2), morning check-ins (Story 6.1), debriefs (Story 6.4), task completion tracking (Story 6.3), or quality scoring (Story 7.1). The CheckInService methods for those features will be added in their respective stories.

### Technical Requirements

**Database: `weekly_plans` table (via Supabase MCP migration):**

```sql
CREATE TABLE weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  focus text NOT NULL,
  objectives jsonb NOT NULL DEFAULT '[]',
  generation_context jsonb DEFAULT '{}',
  summary jsonb,
  status text NOT NULL DEFAULT 'active',
  is_fallback boolean NOT NULL DEFAULT false,
  model_used text,
  generation_metadata jsonb DEFAULT '{}',
  quality_scores jsonb,
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('active', 'completed')),
  UNIQUE(roadmap_id, week_number)
);

-- RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own weekly plans"
  ON weekly_plans FOR ALL USING ((select auth.uid()) = user_id);

-- FK indexes for RLS performance
CREATE INDEX idx_weekly_plans_roadmap_id ON weekly_plans(roadmap_id);
CREATE INDEX idx_weekly_plans_milestone_id ON weekly_plans(milestone_id);
CREATE INDEX idx_weekly_plans_goal_id ON weekly_plans(goal_id);
CREATE INDEX idx_weekly_plans_user_id ON weekly_plans(user_id);
```

**GeneratedWeeklyPlan validation class (LLM output validation):**

```typescript
import { IsString, IsArray, IsInt, Min, ArrayMinSize } from 'class-validator';

export class GeneratedWeeklyPlan {
  @IsString()
  focus!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  objectives!: string[];
}
```

**Weekly plan generation prompt should include:**
- Current milestone title, description, expected_outcome, target_month
- Last monthly summary (if any)
- Last weekly summary (if any)
- Previous daily objective completion data (completion rate, counts)
- Retrieved context from ContextPipelineService (goal profile, intake, progress sections)
- Week number for progress tracking

**Summary generation (hybrid):**
- Computed data (always): completion rates, objective counts, debrief count, energy level distribution from that week
- LLM narrative (when debriefs exist): synthesize debrief themes and progress patterns using a cheap/fast model
- Store as JSONB on weekly_plan `summary` field

**Weekly plan lifecycle auto-transition:**
```typescript
// In CheckInService
private async autoCompleteExpiredPlans(goalId: string): Promise<void> {
  const supabase = this.supabaseService.getAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await supabase
    .from('weekly_plans')
    .update({ status: 'completed' })
    .eq('goal_id', goalId)
    .eq('status', 'active')
    .lt('week_start_date', sevenDaysAgo.toISOString().split('T')[0]);
}
```

### Architecture Compliance

**Module placement:** All new code in `src/roadmap/`. CheckInService is a new provider in RoadmapModule. No new modules.

**Service boundaries per architecture doc:**
- `CheckInService` — owns `weekly_plans` table, weekly plan lifecycle, orchestration
- `GenerationService` — extended with `generateWeeklyPlan()` and `generateWeeklySummary()` methods (prompt assembly + LLM calls + JSON validation)
- `ContextPipelineService` — reused as-is for context retrieval

**Naming patterns (per architecture):**
- File: `check-in.service.ts` (kebab-case)
- Class: `CheckInService` (PascalCase)
- Methods: `getCurrentWeeklyPlan()`, `generateWeeklyPlan()`, `autoCompleteExpiredPlans()` (camelCase)
- DB columns: `snake_case` (week_start_date, is_fallback, generation_metadata)
- JSON response: `snake_case` (matching DB columns directly)

**Error handling pattern:**
- `NotFoundException` (404) for missing roadmap or milestone
- `BadRequestException` (400) for goal without active roadmap
- All Supabase errors checked via `.error` property
- AI generation failures: retry once → fallback plan (never propagate raw AI errors)
- Every fallback logs at `warn` level with original error

**Event pattern:**
- `weekly-plan.generated` — emitted after successful generation (async quality scoring by QualityService — Story 7.1)
- `summary.generated` — emitted after summary generation (async embedding into context_embeddings)
- Events are fire-and-forget — never `await` the emit

**Data flow — Weekly Plan Generation (per architecture doc):**
```
Client → POST /api/goals/:goalId/weekly-plan/generate
  → CheckInService.generateWeeklyPlan()
    → autoCompleteExpiredPlans()
    → getLastCompletedPlanWithoutSummary()
      → if exists: GenerationService.generateWeeklySummary() → store → emit('summary.generated')
    → generateMonthlySummaryIfNeeded()
    → ContextPipelineService.assembleContext()
    → GenerationService.generateWeeklyPlan(context)
    → store plan (or fallback with is_fallback=true)
    → emit('weekly-plan.generated')
  ← 200 + weekly plan
```

**Data flow — GET Weekly Plan (on-demand):**
```
Client → GET /api/goals/:goalId/weekly-plan
  → CheckInService.getCurrentWeeklyPlan()
    → autoCompleteExpiredPlans()
    → return active plan if exists
  → if no active plan: generateWeeklyPlan()
  ← 200 + weekly plan
```

### Library & Framework Requirements

**No new packages to install.** All dependencies already exist:
- `@nestjs/swagger` — for endpoint documentation
- `@nestjs/throttler` — for rate limiting on generate endpoint
- `@nestjs/event-emitter` (EventEmitter2) — for async events
- `class-validator` + `class-transformer` — for LLM output validation
- `@supabase/supabase-js` — for DB access

**Use existing services:**
- `AiService.generateJSON<T>()` for LLM calls with `appConfig.roadmap.weeklyPlanTimeoutMs` (15s) timeout
- `AiService.generateEmbedding()` for summary embedding (via event listener)
- `SupabaseService.getAdminClient()` for all DB operations
- `ContextPipelineService.assembleContext()` for context retrieval

**Model configuration:**
- Weekly plan generation uses `appConfig.roadmap.weeklyModel` (currently `'default'`, resolves to `appConfig.ai.defaultModel`)
- Weekly summary LLM narrative uses same model (cheap operation)
- Do NOT hardcode model names — always read from config

### File Structure Requirements

**Files to CREATE:**

- `src/roadmap/check-in.service.ts` — New service for weekly plan orchestration (will be extended in Stories 6.1-6.4)
- `src/roadmap/check-in.service.spec.ts` — Comprehensive unit tests
- `src/roadmap/types/weekly-plan.types.ts` — WeeklyPlan, WeeklyPlanStatus, WeeklySummary, GenerationContext interfaces
- `src/roadmap/types/generated-weekly-plan.ts` — class-validator decorated GeneratedWeeklyPlan class

**Files to MODIFY:**

- `src/roadmap/generation.service.ts` — Add `generateWeeklyPlan()` and `generateWeeklySummary()` methods
- `src/roadmap/generation.service.spec.ts` — Add tests for new generation methods
- `src/roadmap/roadmap.controller.ts` — Add GET /weekly-plan and POST /weekly-plan/generate endpoints
- `src/roadmap/roadmap.controller.spec.ts` — Add tests for new endpoints
- `src/roadmap/roadmap.module.ts` — Register CheckInService as provider

**Files NOT to touch:**

- `src/roadmap/roadmap.service.ts` — Milestone orchestration, not weekly plans
- `src/roadmap/context-pipeline.service.ts` — Reuse as-is
- `src/roadmap/rerank.service.ts` — Reuse as-is
- `src/config/app.config.ts` — Config already has `weeklyModel`, `weeklyPlanTimeoutMs`
- `src/goal/` — No changes
- `src/intake/` — No changes
- `src/ai/` — No changes
- `src/supabase/` — No changes
- `src/app.module.ts` — RoadmapModule already registered

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**New test file: `src/roadmap/check-in.service.spec.ts`:**

Tests for `generateWeeklyPlan`:
- Happy path: assembles context, generates plan, stores, emits event
- Auto-completes expired plan before generating new one
- Generates summary for last completed plan before new plan (summary-before-generation chain)
- Monthly summary generated when crossing milestone-month boundary
- Fallback: first attempt fails → retry → success
- Fallback: both attempts fail → creates fallback plan with `is_fallback = true`
- Throws NotFoundException when no roadmap exists
- Throws BadRequestException when goal not in active status

Tests for `getCurrentWeeklyPlan`:
- Returns existing active plan (no generation)
- Returns null/auto-generates when no active plan exists
- Auto-completes expired plans before returning

Tests for `autoCompleteExpiredPlans`:
- Updates expired active plans to completed
- Does not touch non-expired active plans
- Does not touch already-completed plans

Tests for cross-user access:
- user_id filter on all queries prevents cross-user data access

**Extend `src/roadmap/generation.service.spec.ts`:**

Tests for `generateWeeklyPlan`:
- Happy path: valid JSON response parsed and validated
- JSON repair on validation failure (markdown fences, trailing commas)
- Throws on double validation failure
- Correct model and timeout used from config

Tests for `generateWeeklySummary`:
- Hybrid summary with computed data (always present)
- LLM narrative generated when debrief data exists
- Computed-only summary when no debriefs

**Extend `src/roadmap/roadmap.controller.spec.ts`:**
- GET /weekly-plan: passes goalId and userId to CheckInService
- POST /weekly-plan/generate: passes goalId and userId to CheckInService
- GET /weekly-plan: returns 404 when no roadmap exists

**Mock patterns (maintain consistency with existing tests):**
```typescript
const weeklyPlanMock = {
  id: 'plan-uuid',
  roadmap_id: 'roadmap-uuid',
  milestone_id: 'milestone-uuid',
  goal_id: 'goal-uuid',
  user_id: 'user-uuid',
  week_number: 1,
  week_start_date: '2026-02-17',
  focus: 'Build foundation habits',
  objectives: ['Run 3 times', 'Research gear', 'Set daily alarm'],
  status: 'active',
  is_fallback: false,
  created_at: '2026-02-17T00:00:00.000Z',
};
```

**Existing test count:** 293 tests. All must pass after changes.

### Previous Story Intelligence

**From Story 4.4 (Retrieve Roadmap & Milestones) — just completed:**
- 293 tests passing (10 new tests added in 4.4)
- Swagger decorator pattern established: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`, `@ApiResponse` (including 401)
- `MilestoneSummary` type added — use similar Pick<> pattern for weekly plan summary if needed
- `getRoadmap(goalId, userId)` returns roadmap with milestones — use for validating roadmap exists before weekly plan generation
- Mock pattern for Supabase chains well-established: `.from().select().eq().single()`

**From Story 4.3 (Generate Milestone Roadmap) — milestone generation patterns:**
- `GenerationService.generateMilestones()` established the generation + validation + repair pattern — follow exactly for `generateWeeklyPlan()`
- `AiService.generateJSON<T>()` call pattern with timeout, model override, and usage capture
- Optimistic locking pattern in RoadmapService — NOT needed for weekly plans (UNIQUE constraint handles idempotency)
- Context retrieval via `ContextPipelineService.assembleContext()` — reuse as-is

**From code review patterns across stories:**
- Test coverage must be comprehensive for all paths including edge cases
- All warn-level logging must be asserted in tests
- Keep changes minimal and surgical
- Don't add features beyond what's specified

### Git Intelligence

Recent commits:
```
a7b5971 feat(roadmap): implement milestone generation via LLM orchestration
1c14408 feat(roadmap): implement 3-tier context retrieval pipeline for generation
935fa65 refactor(embeddings): unify context storage and apply code review fixes
110e922 feat(embeddings): unify context storage and add roadmap configuration
71cdcbf feat(roadmap): implement adaptive incremental planning pipeline
```

**Patterns:**
- Commit format: `type(scope): description` — scope for this story: `roadmap`
- Expected commit type: `feat(roadmap): implement weekly plan generation and retrieval`
- Services are built incrementally story-by-story
- Each story extends existing files rather than rewriting them

### What NOT to Build

- No daily objectives — that's Story 6.2
- No morning check-ins — that's Story 6.1
- No debriefs — that's Story 6.4
- No task completion tracking — that's Story 6.3
- No quality scoring — that's Story 7.1
- No retrieval observability logging — that's Story 7.2
- Do NOT add `QualityService` — just emit events for it (Story 7.1 will implement the listener)
- Do NOT add check-in/debrief CRUD methods to CheckInService yet — only weekly plan methods
- Do NOT modify context-pipeline.service.ts — it already handles all context types
- Do NOT modify rerank.service.ts — reuse as-is
- Do NOT modify app.config.ts — weekly plan config already exists
- Do NOT add new npm packages
- Do NOT create cron jobs or scheduled tasks — use lazy auto-complete on read
- Do NOT use 202 + polling pattern — all generation is synchronous

### Project Structure Notes

- All changes in `src/roadmap/` directory — consistent with module boundary
- New `check-in.service.ts` will be extended in Stories 6.1-6.4 (not renamed)
- Type files follow existing pattern: `types/weekly-plan.types.ts` alongside `types/roadmap.types.ts`
- Validation DTO follows existing pattern: `types/generated-weekly-plan.ts` alongside `types/generated-milestone.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 5.1 — Generate and Retrieve Weekly Plan acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR21, FR22, FR25, FR39, FR44 map to Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — CheckInService owns weekly_plans]
- [Source: _bmad-output/planning-artifacts/architecture.md#Summary-Before-Generation Chain Pattern — summary → embed → generate new plan]
- [Source: _bmad-output/planning-artifacts/architecture.md#Weekly Plan Lifecycle Pattern — auto-complete on read, lazy evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cascading Fallback for On-Demand Generation Pattern — retry once → fallback with is_fallback=true]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema — weekly_plans table definition with all columns, constraints, indexes]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies — weekly_plans direct user_id policy]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — GET /weekly-plan (60/min), POST /weekly-plan/generate (5/min)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Weekly Plan Generation diagram]
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Repair Pipeline Pattern — validate → repair → re-validate for GeneratedWeeklyPlan]
- [Source: _bmad-output/planning-artifacts/architecture.md#Generation Response Pattern — synchronous, client waits, EventEmitter2 for side effects only]
- [Source: _bmad-output/planning-artifacts/architecture.md#Context Assembly Format — progressSection for weekly summaries, debriefSection for debrief notes]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#Weekly Plan Generation FRs — FR21-FR25]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#Data Schemas — Weekly Plan JSON schema]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#NFR3 — Weekly plan generation p95 < 15 seconds]
- [Source: _bmad-output/implementation-artifacts/4-4-retrieve-roadmap-and-milestones.md — Previous story: 293 tests, Swagger pattern, mock patterns]
- [Source: src/roadmap/generation.service.ts — Existing generateMilestones() pattern to follow]
- [Source: src/roadmap/roadmap.service.ts — getRoadmap() for roadmap validation]
- [Source: src/roadmap/roadmap.controller.ts — Existing endpoint patterns with Swagger decorators]
- [Source: src/roadmap/roadmap.module.ts — Module provider registration]
- [Source: src/config/app.config.ts — weeklyModel, weeklyPlanTimeoutMs already configured]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Task 1: Created `weekly_plans` table via Supabase MCP migration with all columns, CHECK constraint on status, UNIQUE(roadmap_id, week_number), RLS policy, and 4 FK indexes. Security advisors clean.
- Task 2: Created `WeeklyPlan`, `WeeklyPlanStatus`, `WeeklySummary`, `GenerationContext` interfaces in `weekly-plan.types.ts`. Created `GeneratedWeeklyPlan` class-validator DTO with `@IsString` focus and `@IsArray @ArrayMinSize(1) @IsString({each:true})` objectives.
- Task 3: Extended `GenerationService` with `generateWeeklyPlan()` (2-attempt retry, validate+repair pipeline, weeklyPlanTimeoutMs) and `generateWeeklySummary()` (computed summary). Added system/user prompt builders for weekly plan context.
- Task 4: Created `CheckInService` with: `getCurrentWeeklyPlan()` (auto-complete + query), `generateWeeklyPlan()` (summary-before-generation chain, context assembly, cascading fallback with `is_fallback=true`), `autoCompleteExpiredPlans()` (lazy 7-day check), `createFallbackPlan()` (real DB row from milestone data). Events emitted: `weekly-plan.generated`, `summary.generated`.
- Task 5: Added `GET /api/goals/:goalId/roadmap/weekly-plan` (on-demand generation if no active plan) and `POST /api/goals/:goalId/roadmap/weekly-plan/generate` (explicit generation, @Throttle 5/min) with full Swagger decorators.
- Task 6: Registered `CheckInService` in `RoadmapModule` providers.
- Task 7: 24 new tests added. CheckInService: 10 tests (getCurrentWeeklyPlan, autoComplete, generateWeeklyPlan happy/fallback/summary-chain/no-roadmap, cross-user). GenerationService: 9 new tests (weekly plan generation, validation, repair, retry, prompts, summary). Controller: 5 new tests (GET/POST weekly-plan delegation, auto-generate, 404). All 317 tests pass with 0 regressions.
- Code Review Fixes (2026-02-22): 7 issues fixed — added @IsNotEmpty() on GeneratedWeeklyPlan.focus, replaced raw Error with InternalServerErrorException in storeWeeklyPlan, added cascading fallback error handling, differentiated 400 vs 404 for roadmap status, added Supabase error check on summary update, removed unnecessary async from buildGenerationContext, added 2 missing tests (autoComplete filter verification, BadRequestException for non-complete roadmap). 319 tests pass with 0 regressions.

### Change Log

- 2026-02-22: Implemented Story 5.1 — Weekly plan generation and retrieval with CheckInService, GenerationService extensions, controller endpoints, database migration, and comprehensive tests (317 total, 0 regressions)
- 2026-02-22: Code review fixes — 7 issues (3 HIGH, 4 MEDIUM) resolved, 2 tests added (319 total, 0 regressions)

### File List

**New files:**
- `src/roadmap/check-in.service.ts` — Weekly plan orchestration service
- `src/roadmap/check-in.service.spec.ts` — CheckInService unit tests (12 tests)
- `src/roadmap/types/weekly-plan.types.ts` — WeeklyPlan, WeeklyPlanStatus, WeeklySummary, GenerationContext interfaces
- `src/roadmap/types/generated-weekly-plan.ts` — class-validator decorated GeneratedWeeklyPlan class

**Modified files:**
- `src/roadmap/generation.service.ts` — Added generateWeeklyPlan(), generateWeeklySummary(), validation/repair, prompt builders
- `src/roadmap/generation.service.spec.ts` — Added 9 new tests for weekly plan generation and summary
- `src/roadmap/roadmap.controller.ts` — Added GET /weekly-plan and POST /weekly-plan/generate endpoints
- `src/roadmap/roadmap.controller.spec.ts` — Added 5 new tests for weekly plan endpoints, added CheckInService mock
- `src/roadmap/roadmap.module.ts` — Registered CheckInService as provider

**Database:**
- Supabase migration: `create_weekly_plans_table` — weekly_plans table with RLS, indexes, constraints
