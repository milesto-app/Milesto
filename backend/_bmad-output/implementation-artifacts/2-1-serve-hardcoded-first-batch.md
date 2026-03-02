# Story 2.1: Serve Hardcoded First Batch

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to immediately receive my first set of intake questions when I start a goal,
So that the coaching process begins instantly without any loading delay.

## Acceptance Criteria

1. **Given** an authenticated user with a goal in `intake_in_progress` status and no batches yet **When** `GET /api/goals/:goalId/intake/next-batch` is called **Then** the system creates and returns the hardcoded universal batch 1 with 5 questions (FR10) **And** questions include text, scale, and single_choice types (FR13) **And** the response is served without any AI call (NFR1: < 200ms)
2. **Given** an authenticated user who already received batch 1 but hasn't answered it **When** `GET /api/goals/:goalId/intake/next-batch` is called **Then** the system re-serves the same unanswered batch with the same batch and question IDs (FR15)
3. **Given** an authenticated user with a goal that does NOT belong to them **When** `GET /api/goals/:goalId/intake/next-batch` is called **Then** the system returns 404 Not Found
4. **Given** a goal that does not exist **When** `GET /api/goals/:goalId/intake/next-batch` is called **Then** the system returns 404 Not Found
5. **Given** a goal not in `intake_in_progress` status (e.g., `intake_completed`, `active`) **When** `GET /api/goals/:goalId/intake/next-batch` is called **Then** the system returns 400 Bad Request with a message indicating intake is not active for this goal
6. **Given** an unauthenticated request **When** `GET /api/goals/:goalId/intake/next-batch` is called without a valid Bearer token **Then** a 401 Unauthorized response is returned
7. **Given** a valid next-batch request **Then** the response includes: batch metadata (`batch_number`, `is_complete: false`), and an array of question objects each with `id`, `question_text`, `question_type`, `config` (type-specific options), and `order_in_batch`

## Tasks / Subtasks

- [x] Task 1: Create `intake_batches` table via Supabase migration (AC: #1, #2)
  - [x] 1.1 Create `intake_batches` table with columns: `id` (UUID PK), `goal_id` (UUID FK → goals.id), `batch_number` (INT), `is_answered` (BOOLEAN DEFAULT false), `is_fallback` (BOOLEAN DEFAULT false), `quality_score` (NUMERIC nullable), `embedded` (BOOLEAN DEFAULT false), `created_at` (TIMESTAMPTZ DEFAULT now())
  - [x] 1.2 Add UNIQUE constraint on `(goal_id, batch_number)`
  - [x] 1.3 Add FK index `idx_intake_batches_goal_id` on `goal_id`
  - [x] 1.4 Add RLS policies: enable RLS, SELECT/INSERT/DELETE for `(select auth.uid()) = (select user_id from goals where id = goal_id)`
  - [x] 1.5 Add `batch_id` column (UUID FK → intake_batches.id) to existing `intake_questions` table
  - [x] 1.6 Add FK index `idx_intake_questions_batch_id` on `batch_id`
- [x] Task 2: Create IntakeModule scaffold (AC: #1)
  - [x] 2.1 Create `src/intake/intake.module.ts` — imports GoalModule, provides IntakeService + IntakePromptService, exports IntakeService
  - [x] 2.2 Create `src/intake/intake.controller.ts` — `@UseGuards(AuthGuard)`, route prefix `goals/:goalId/intake`
  - [x] 2.3 Create `src/intake/intake.service.ts` — inject SupabaseService, GoalService, IntakePromptService
  - [x] 2.4 Create `src/intake/intake-prompt.service.ts` — contains `getUniversalBatch()` returning hardcoded batch 1
  - [x] 2.5 Register IntakeModule in `app.module.ts` imports
- [x] Task 3: Implement `getUniversalBatch()` in IntakePromptService (AC: #1, #7)
  - [x] 3.1 Return array of 5 hardcoded question objects with mixed types (text, scale, single_choice)
  - [x] 3.2 Each question has: `question_text`, `question_type`, `config` (options/labels as applicable), `order_in_batch`
- [x] Task 4: Implement `getNextBatch()` in IntakeService (AC: #1, #2, #3, #4, #5)
  - [x] 4.1 Verify goal exists and belongs to user via GoalService.findOne (handles 404)
  - [x] 4.2 Verify goal status is `intake_in_progress`, else throw BadRequestException (AC #5)
  - [x] 4.3 Query `intake_batches` for the latest batch for this goal
  - [x] 4.4 If latest batch exists and `is_answered = false` → re-serve: query `intake_questions` by `batch_id`, return existing batch (AC #2)
  - [x] 4.5 If no batches exist → create batch 1: insert `intake_batches` row, get questions from `IntakePromptService.getUniversalBatch()`, insert into `intake_questions` with `batch_id`, return batch (AC #1)
  - [x] 4.6 If latest batch `is_answered = true` → this story only handles batch 1, so return 400 or empty (Story 2.3 will handle AI batches)
- [x] Task 5: Implement `GET next-batch` endpoint in IntakeController (AC: #1, #6, #7)
  - [x] 5.1 Add `@Get('next-batch')` method accepting `@UserId()` and `@Param('goalId')`
  - [x] 5.2 Call `intakeService.getNextBatch(userId, goalId)` and return result
  - [x] 5.3 Define response shape: `{ batch_number, is_complete, questions: [...] }`
- [x] Task 6: Unit tests (AC: #1-#7)
  - [x] 6.1 IntakePromptService: `getUniversalBatch()` returns 5 questions with correct types
  - [x] 6.2 IntakeService: creates batch 1 when no batches exist
  - [x] 6.3 IntakeService: re-serves unanswered batch when batch exists with `is_answered = false`
  - [x] 6.4 IntakeService: throws NotFoundException when goal not found
  - [x] 6.5 IntakeService: throws BadRequestException when goal status is not `intake_in_progress`
  - [x] 6.6 IntakeController: `GET next-batch` delegates to service correctly

## Dev Notes

### Developer Context

**What this story builds:** The first endpoint of the Intake module — `GET /api/goals/:goalId/intake/next-batch`. For batch 1 only, this is a pure database operation: store 5 hardcoded questions and return them. No AI calls. Future stories (2.2, 2.3) will add answer submission and AI-generated follow-up batches.

**Existing code you MUST understand before starting:**
- `src/goal/goal.service.ts` — has `findOne(userId, goalId)` which validates goal ownership and returns 404 if not found. **Reuse this** for goal verification in IntakeService.
- `src/goal/goal.module.ts` — exports `GoalService`. IntakeModule must import GoalModule to access it.
- `src/common/guards/auth.guard.ts` — JWT Bearer validation. Apply `@UseGuards(AuthGuard)` at controller class level.
- `src/common/decorators/user.decorator.ts` — `@UserId()` param decorator. Use for user extraction.
- `src/config/app.config.ts` — has `intake.maxBatches: 7`, `intake.questionsPerBatch: { min: 3, max: 5 }`. Reference these in service logic where relevant.

**Existing database tables:**
- `goals` — already exists with `id`, `user_id`, `title`, `description`, `status`, `profile_generation_attempts`, `created_at`, `updated_at`. RLS enabled.
- `intake_questions` — already exists with `id`, `goal_id`, `batch_number`, `question_text`, `question_type`, `config` (JSONB), `order_in_batch`, `created_at`. RLS enabled. **This table needs a `batch_id` column added.**
- `intake_answers` — already exists with `id`, `question_id`, `answer_text`, `answer_numeric`, `selected_options`, `created_at`. RLS enabled. Not touched in this story.

**Table that MUST be created:**
- `intake_batches` — does NOT exist yet. Must be created via Supabase MCP migration.

**What NOT to build in this story:**
- No answer submission (Story 2.2)
- No AI-generated batches (Story 2.3)
- No profile generation (Story 2.4)
- No embedding (Story 2.5)
- No quality scoring (Story 2.6)
- When the latest batch is already answered and batch_number < 7, return a response indicating the next batch will come from answer submission (Story 2.3 handles this). For now, a simple 400 "Submit answers for the current batch first" or similar is acceptable.

### Technical Requirements

**Hardcoded Universal Batch 1 — 5 questions (FR10, FR13):**

The batch must cover universal coaching dimensions that work for ANY goal type. Questions:

1. **"What motivated you to set this goal?"** — `text` — captures intrinsic motivation
2. **"How many hours per week can you realistically dedicate to this goal?"** — `scale` — config: `{ "min": 1, "max": 20, "min_label": "1 hour", "max_label": "20+ hours" }`
3. **"What does success look like to you when this goal is achieved?"** — `text` — vision/end state
4. **"What's your target timeline for this goal?"** — `single_choice` — config: `{ "options": ["1-3 months", "3-6 months", "6-12 months", "12+ months", "No specific deadline"] }`
5. **"Have you attempted this goal before?"** — `single_choice` — config: `{ "options": ["No, this is my first time", "Yes, once or twice", "Yes, multiple times", "Yes, but I always gave up"] }`

These questions are defined as a constant array in `IntakePromptService`. They do NOT have UUIDs at definition time — IDs are generated when inserted into `intake_questions`.

**`intake_batches` table schema:**

```sql
CREATE TABLE intake_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  quality_score NUMERIC,
  embedded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, batch_number)
);

CREATE INDEX idx_intake_batches_goal_id ON intake_batches(goal_id);
```

**Alter `intake_questions` — add `batch_id`:**

```sql
ALTER TABLE intake_questions
  ADD COLUMN batch_id UUID REFERENCES intake_batches(id) ON DELETE CASCADE;

CREATE INDEX idx_intake_questions_batch_id ON intake_questions(batch_id);
```

Note: `batch_id` is nullable initially to not break existing rows. New code MUST always populate `batch_id`. The `goal_id` and `batch_number` columns remain on `intake_questions` for query convenience.

**RLS policies for `intake_batches`:**

```sql
ALTER TABLE intake_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batches"
  ON intake_batches FOR SELECT
  USING ((select auth.uid()) = (SELECT user_id FROM goals WHERE id = goal_id));

CREATE POLICY "Users can insert batches for their own goals"
  ON intake_batches FOR INSERT
  WITH CHECK ((select auth.uid()) = (SELECT user_id FROM goals WHERE id = goal_id));

CREATE POLICY "Users can update their own batches"
  ON intake_batches FOR UPDATE
  USING ((select auth.uid()) = (SELECT user_id FROM goals WHERE id = goal_id));
```

Note: Use `(select auth.uid())` (with subquery wrapper) in ALL RLS policies to avoid per-row re-evaluation. This is a critical performance pattern.

**Response format for `GET /api/goals/:goalId/intake/next-batch`:**

```json
{
  "batch_id": "uuid",
  "batch_number": 1,
  "is_complete": false,
  "questions": [
    {
      "id": "uuid",
      "question_text": "What motivated you to set this goal?",
      "question_type": "text",
      "config": null,
      "order_in_batch": 1
    },
    {
      "id": "uuid",
      "question_text": "How many hours per week can you realistically dedicate to this goal?",
      "question_type": "scale",
      "config": { "min": 1, "max": 20, "min_label": "1 hour", "max_label": "20+ hours" },
      "order_in_batch": 2
    }
  ]
}
```

All JSON field names use `snake_case` (matching database columns directly — no transformation layer).

**Service logic flow for `getNextBatch(userId, goalId)`:**

1. Call `goalService.findOne(userId, goalId)` — throws 404 if not found/not owned
2. Check `goal.status === 'intake_in_progress'` — throw `BadRequestException` if not
3. Query `intake_batches` for this goal, ordered by `batch_number DESC`, limit 1
4. **If no batch exists:** Create batch 1
   - Insert into `intake_batches`: `{ goal_id, batch_number: 1 }`
   - Get hardcoded questions from `intakePromptService.getUniversalBatch()`
   - Insert all 5 questions into `intake_questions` with the new `batch_id`
   - Return formatted response
5. **If latest batch has `is_answered = false`:** Re-serve
   - Query `intake_questions` WHERE `batch_id = latestBatch.id` ORDER BY `order_in_batch`
   - Return formatted response with existing data
6. **If latest batch has `is_answered = true`:** Not handled in this story
   - Throw `BadRequestException('Submit current batch answers via POST submit-batch to receive the next batch')`

### Architecture Compliance

**Module structure:** Create `src/intake/` folder with co-located controller, services, and DTOs. IntakeModule is a non-global feature module — must be imported in `app.module.ts`.

**Module dependency graph (from architecture doc):**
```
IntakeModule
  imports: [GoalModule]          ← to access GoalService.findOne()
  providers: [IntakeService, IntakePromptService]
  controllers: [IntakeController]
  exports: [IntakeService]       ← future stories may need it
```

GoalModule already `exports: [GoalService]`. No changes needed to GoalModule.

**Service boundaries (STRICT):**
- `IntakeService` — owns `intake_batches` and `intake_questions` tables. Orchestrates flow.
- `IntakePromptService` — owns hardcoded question definitions and (in future stories) AI prompt templates. Pure data/AI interaction, no direct Supabase calls for table writes.
- `GoalService` — owns `goals` table. IntakeService calls `GoalService.findOne()` for validation, never queries `goals` directly.

**Endpoint path:** `GET /api/goals/:goalId/intake/next-batch`
- The `/api` prefix is set globally in `main.ts` — do NOT include it in controller decorators.
- Controller decorator: `@Controller('goals/:goalId/intake')`
- Method decorator: `@Get('next-batch')`
- Route param: `:goalId` in camelCase per naming conventions.

**Error handling — NestJS HTTP exceptions exclusively:**
- `NotFoundException` — goal not found (delegated to GoalService.findOne)
- `BadRequestException` — goal status not `intake_in_progress`, or batch already answered
- `InternalServerErrorException` — Supabase error on insert/select
- Never `console.log` — use `private readonly logger = new Logger(IntakeService.name)`

**Supabase client usage:**
- Always via `this.supabaseService.getAdminClient()` — admin client bypasses RLS
- Still filter by `user_id` / `goal_id` in queries as defense in depth
- Check `.error` on every Supabase response — throw appropriate HTTP exception if truthy

**Import pattern:** ALL relative imports MUST use `.js` extension:
```typescript
import { IntakeService } from './intake.service.js';
import { IntakePromptService } from './intake-prompt.service.js';
import { GoalService } from '../goal/goal.service.js';
```

**JSON response format:** `snake_case` field names matching database columns. No camelCase transformation. Return objects directly — no wrapper except for list endpoints.

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed:

- `@nestjs/common` — `Controller`, `Get`, `Param`, `UseGuards`, `Injectable`, `Module`, `BadRequestException`, `NotFoundException`, `InternalServerErrorException`, `Logger`
- `@supabase/supabase-js` — `.from()`, `.select()`, `.insert()`, `.eq()`, `.order()`, `.limit()`, `.single()` query builder methods
- `class-validator` / `class-transformer` — not needed for this story (no request body DTOs; goalId comes from route param)

**NestJS patterns to follow exactly:**

Controller setup:
```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { IntakeService } from './intake.service.js';

@Controller('goals/:goalId/intake')
@UseGuards(AuthGuard)
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Get('next-batch')
  async getNextBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.intakeService.getNextBatch(userId, goalId);
  }
}
```

Module setup:
```typescript
import { Module } from '@nestjs/common';
import { GoalModule } from '../goal/goal.module.js';
import { IntakeController } from './intake.controller.js';
import { IntakeService } from './intake.service.js';
import { IntakePromptService } from './intake-prompt.service.js';

@Module({
  imports: [GoalModule],
  controllers: [IntakeController],
  providers: [IntakeService, IntakePromptService],
  exports: [IntakeService],
})
export class IntakeModule {}
```

**Supabase insert pattern for batch + questions:**
```typescript
// 1. Insert batch
const supabase = this.supabaseService.getAdminClient();
const { data: batch, error: batchError } = await supabase
  .from('intake_batches')
  .insert({ goal_id: goalId, batch_number: 1 })
  .select()
  .single();

if (batchError) throw new InternalServerErrorException('Failed to create batch');

// 2. Insert questions with batch_id
const questions = this.intakePromptService.getUniversalBatch().map((q, i) => ({
  goal_id: goalId,
  batch_id: batch.id,
  batch_number: 1,
  question_text: q.question_text,
  question_type: q.question_type,
  config: q.config,
  order_in_batch: i + 1,
}));

const { data: insertedQuestions, error: questionsError } = await supabase
  .from('intake_questions')
  .insert(questions)
  .select();

if (questionsError) throw new InternalServerErrorException('Failed to create questions');
```

**Supabase query pattern for re-serve:**
```typescript
const { data: existingQuestions, error } = await supabase
  .from('intake_questions')
  .select('id, question_text, question_type, config, order_in_batch')
  .eq('batch_id', latestBatch.id)
  .order('order_in_batch');
```

### File Structure Requirements

**Files to CREATE:**

```
src/intake/
  intake.module.ts              # Module: imports GoalModule, provides services
  intake.controller.ts          # Controller: GET next-batch endpoint
  intake.service.ts             # Service: orchestrates batch creation/retrieval
  intake-prompt.service.ts      # Service: hardcoded questions + future AI prompts
  intake.service.spec.ts        # Unit tests for IntakeService
  intake-prompt.service.spec.ts # Unit tests for IntakePromptService
  intake.controller.spec.ts     # Unit tests for IntakeController
```

**Files to MODIFY:**

- `src/app.module.ts` — add `IntakeModule` to imports array

**Files NOT to touch:**

- `src/goal/*` — GoalModule is stable, only consume its exports
- `src/supabase/*` — Global module, use as-is
- `src/ai/*` — Not needed for this story (no AI calls)
- `src/config/*` — Read `appConfig` if needed, don't modify

**Database migration:** Applied via Supabase MCP tool — no local migration files. Single migration creating `intake_batches` table, adding `batch_id` to `intake_questions`, and adding RLS policies.

**No new DTOs needed.** This endpoint has no request body — `goalId` comes from route param, `userId` from auth token. Response is shaped directly in the service.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakePromptService tests (`intake-prompt.service.spec.ts`):**

```
describe('IntakePromptService')
  describe('getUniversalBatch')
    ✓ returns exactly 5 questions
    ✓ includes at least one text type question
    ✓ includes at least one scale type question
    ✓ includes at least one single_choice type question
    ✓ each question has question_text, question_type, config, order_in_batch
    ✓ scale questions have min, max, min_label, max_label in config
    ✓ single_choice questions have non-empty options array in config
    ✓ order_in_batch values are sequential 1-5
```

**IntakeService tests (`intake.service.spec.ts`):**

```
describe('IntakeService')
  describe('getNextBatch')
    ✓ creates batch 1 when no batches exist for the goal
    ✓ inserts 5 questions into intake_questions with correct batch_id
    ✓ returns response with batch_number: 1, is_complete: false, and 5 questions
    ✓ re-serves existing unanswered batch (is_answered = false)
    ✓ re-served batch returns same question IDs as original
    ✓ throws NotFoundException when goal not found (delegates to GoalService.findOne)
    ✓ throws BadRequestException when goal status is not intake_in_progress
    ✓ throws BadRequestException when latest batch is already answered
    ✓ throws InternalServerErrorException on Supabase insert error
```

**IntakeController tests (`intake.controller.spec.ts`):**

```
describe('IntakeController')
  describe('GET next-batch')
    ✓ calls intakeService.getNextBatch with userId and goalId
    ✓ returns service result directly
```

**Mock patterns (follow established patterns from GoalService tests):**

- Mock `SupabaseService` with `getAdminClient` returning a chainable mock
- Mock `GoalService.findOne` — return goal object or throw NotFoundException
- Mock `IntakePromptService.getUniversalBatch` — return hardcoded array
- Mock `AuthGuard` in controller tests to bypass Supabase dependency

```typescript
// Supabase chain mock pattern
const mockFrom = jest.fn();
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockSingle = jest.fn();

mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  single: mockSingle,
});

const mockSupabaseService = {
  getAdminClient: jest.fn().mockReturnValue({ from: mockFrom }),
};
```

**Test count:** ~19 new tests across 3 files.

### Previous Story Intelligence

**From Epic 1 story patterns (code was deleted but patterns are documented):**

- `GoalService.findOne(userId, goalId)` throws `NotFoundException` — reuse directly, do not reimplement goal lookup
- Supabase mock chain pattern: `from() → select/insert/delete() → eq() → ...` — follow the same chainable mock approach
- `AuthGuard` mock in controller tests: override the guard to avoid Supabase dependency in unit tests
- All Supabase queries filter by `user_id` even though admin client bypasses RLS (defense in depth)
- `@HttpCode` decorator needed when overriding default response codes — not needed here (GET defaults to 200, which is correct)
- Logger pattern: `private readonly logger = new Logger(ServiceName.name)` — add to both IntakeService and IntakePromptService
- ESLint/Prettier may auto-format after changes — run `npm run lint` to verify

**Debug issues from Epic 1 to AVOID:**
- `TS2352` casting errors: if accessing request properties, cast via `unknown` first
- `Reflect.getMetadata is not a function` in DTO tests: add `import 'reflect-metadata'` at top of spec files that test decorators/DTOs (not needed here — no new DTOs)
- Prettier reformats multi-line method signatures to single line — don't fight it

### Project Structure Notes

- New `src/intake/` folder aligns with architecture doc's project structure exactly
- IntakeModule placement follows feature-based module organization pattern
- No barrel exports (`index.ts`) — import directly from files
- DTOs subfolder (`src/intake/dto/`) not needed for this story — create it in Story 2.2 when `submit-answers.dto.ts` is needed
- IntakePromptService is separate from IntakeService per architecture: prompt/question logic isolated from orchestration logic

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1 — FR10, FR13, FR15]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — GET /api/goals/:goalId/intake/next-batch]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — src/intake/ layout]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakeService, IntakePromptService ownership]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Error Handling, Supabase Client]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS — (select auth.uid()) pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#FR10 — Hardcoded universal first batch]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13 — Question types]
- [Source: _bmad-output/planning-artifacts/prd.md#FR15 — Re-serve unanswered batch]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR1 — Batch 1 < 200ms]
- [Source: _bmad-output/planning-artifacts/prd.md#User Journey 1 (Maya) — Batch 1 flow]
- [Source: _bmad-output/implementation-artifacts/1-3-delete-a-goal.md#Previous Story Intelligence — GoalService patterns, mock patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test mock issue: `mockReturnValueOnce` for "already answered batch" test — second assertion call needed fresh mock setup. Fixed by using `mockReturnValue` instead for that specific test case.

### Completion Notes List

- **Task 1:** Applied single Supabase migration creating `intake_batches` table with all columns, UNIQUE constraint, FK index, RLS policies (SELECT/INSERT/UPDATE using `(select auth.uid())` subquery pattern), added `batch_id` column to `intake_questions` with FK index. Verified via `list_tables` and `get_advisors`.
- **Task 2:** Created IntakeModule scaffold with 4 files in `src/intake/` and registered in `app.module.ts`. Module imports GoalModule, provides IntakeService + IntakePromptService, exports IntakeService.
- **Task 3:** Implemented `getUniversalBatch()` returning 5 hardcoded universal coaching questions covering text, scale, and single_choice types. Defined `UniversalQuestion` interface for type safety.
- **Task 4:** Implemented `getNextBatch()` with full flow: goal validation via GoalService.findOne, status check, batch query, create-first-batch path (insert batch + 5 questions), re-serve path (query existing questions), and already-answered guard (400 error).
- **Task 5:** Implemented GET next-batch endpoint with `@UseGuards(AuthGuard)`, `@UserId()`, `@Param('goalId')`. Controller delegates to service.
- **Task 6:** 19 new tests across 3 files — 8 for IntakePromptService, 9 for IntakeService, 2 for IntakeController. All 55 tests pass (19 new + 36 existing). Zero regressions. Lint passes with 0 errors (32 pre-existing warnings).

### Change Log

- 2026-02-08: Implemented Story 2.1 — Serve Hardcoded First Batch. Created `intake_batches` table, IntakeModule with controller/services, `GET /api/goals/:goalId/intake/next-batch` endpoint, and 19 unit tests.

### File List

**Created:**
- `src/intake/intake.module.ts`
- `src/intake/intake.controller.ts`
- `src/intake/intake.service.ts`
- `src/intake/intake-prompt.service.ts`
- `src/intake/intake.controller.spec.ts`
- `src/intake/intake.service.spec.ts`
- `src/intake/intake-prompt.service.spec.ts`

**Modified:**
- `src/app.module.ts` — added IntakeModule to imports

**Database Migration:**
- `create_intake_batches_table` — creates `intake_batches` table, adds `batch_id` to `intake_questions`, RLS policies, indexes
