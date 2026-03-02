# Story 2.6: Async Quality Scoring and Monitoring

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want each batch scored for quality behind the scenes,
So that the coaching intake experience continuously improves.

## Acceptance Criteria

1. **Given** a batch is served to a user (first batch or AI-generated batch) **When** the `batch.served` event fires **Then** `IntakeQualityService` evaluates the batch via LLM-as-judge asynchronously (FR39) **And** the evaluation runs via EventEmitter2 with zero impact on user-facing latency (NFR4) **And** the evaluation uses `AiService.generateJSON()` with a scoring prompt

2. **Given** the LLM-as-judge evaluation completes successfully **When** quality scores are returned **Then** four component scores are computed: relevance (0-1), depth_progression (0-1), dimension_coverage (0-1), redundancy_avoidance (0-1) **And** a composite score is calculated as the average of the four components **And** the composite score is stored in `intake_batches.quality_score` (FR40)

3. **Given** a batch's composite quality score falls below 0.5 (`appConfig.intake.qualityWarnThreshold`) **When** the score is stored **Then** the system logs a warning via `this.logger.warn()` with batch context: goal ID, batch number, composite score, and all four component scores (FR41)

4. **Given** a batch's composite quality score is 0.5 or above **When** the score is stored **Then** the system logs the score at `log` level (no warning)

5. **Given** the LLM-as-judge call fails (AiService throws, timeout, or invalid response) **When** the error is caught **Then** the error is logged via `this.logger.error()` with context (goal ID, batch ID) (NFR13) **And** the batch continues without a quality score — `quality_score` remains `null` **And** the failure does NOT propagate to the user or affect the batch serving

6. **Given** the EventEmitter2 module is configured with a global error handler (Story 2.5) **When** any unhandled error escapes the `batch.served` listener **Then** the global error handler catches and logs it **And** no error crashes the application

## Tasks / Subtasks

- [x] Task 1: Add dependencies to IntakeQualityService (AC: #1, #2, #3, #5)
  - [x] 1.1 Import `Logger` from `@nestjs/common` and create private logger: `private readonly logger = new Logger(IntakeQualityService.name)`
  - [x] 1.2 Import `AiService` from `../ai/ai.service.js` and add to constructor injection
  - [x] 1.3 Import `SupabaseService` from `../supabase/supabase.service.js` and add to constructor injection
  - [x] 1.4 Import `OnEvent` from `@nestjs/event-emitter`
  - [x] 1.5 Import `appConfig` is already present — no change needed
  - [x] 1.6 Import `BatchServedEvent` type from `./intake.service.js`
- [x] Task 2: Implement `evaluateBatchQuality()` method in IntakeQualityService (AC: #1, #2)
  - [x] 2.1 Add method signature: `async evaluateBatchQuality(questions: Array<{ question_text: string; question_type: string }>, goalDescription: string, batchNumber: number, priorQuestions: Array<{ question_text: string; batch_number: number }>): Promise<{ relevance: number; depth_progression: number; dimension_coverage: number; redundancy_avoidance: number; composite: number }>`
  - [x] 2.2 Build system prompt for LLM-as-judge: instruct the AI to evaluate the batch on 4 dimensions, each scored 0.0-1.0, and return JSON
  - [x] 2.3 Build user prompt: include goal description, current batch questions, batch number, and prior batch questions for context
  - [x] 2.4 Call `this.aiService.generateJSON<QualityScores>()` with the system and user prompts
  - [x] 2.5 Validate returned scores are numbers between 0 and 1; clamp if out of range
  - [x] 2.6 Calculate composite as average of 4 component scores
  - [x] 2.7 Return the complete scores object including composite
- [x] Task 3: Implement `@OnEvent('batch.served')` listener in IntakeQualityService (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Add `@OnEvent('batch.served')` decorator on new method `handleBatchServed(payload: BatchServedEvent): Promise<void>`
  - [x] 3.2 Wrap entire method body in try/catch — on error, log via `this.logger.error()` with context (goal_id, batch_id), do NOT rethrow
  - [x] 3.3 Load current batch questions from `intake_questions` WHERE `batch_id = payload.batch_id` ORDER BY `order_in_batch`
  - [x] 3.4 Load goal description from `goals` WHERE `id = payload.goal_id` using `.select('description').single()`
  - [x] 3.5 Load prior batch questions from `intake_questions` WHERE `goal_id` matches AND `batch_number < payload.batch_number` (joined via `intake_batches`) for redundancy/depth comparison
  - [x] 3.6 Call `this.evaluateBatchQuality()` with the loaded data
  - [x] 3.7 Store composite score: `supabase.from('intake_batches').update({ quality_score: scores.composite }).eq('id', payload.batch_id)`
  - [x] 3.8 If composite < `appConfig.intake.qualityWarnThreshold`: log warning with all scores via `this.logger.warn()`
  - [x] 3.9 If composite >= threshold: log at info level via `this.logger.log()`
- [x] Task 4: Update IntakeQualityService spec with dependency mocks (AC: all)
  - [x] 4.1 Update `beforeEach` test module to provide mock `AiService` (`{ generateJSON: jest.fn() }`) and mock `SupabaseService` (`{ getAdminClient: () => mockSupabase }`)
  - [x] 4.2 Verify existing validation tests still pass with the new constructor dependencies
- [x] Task 5: Unit tests for `evaluateBatchQuality()` (AC: #1, #2)
  - [x] 5.1 Test that it calls `aiService.generateJSON()` with system and user prompts containing goal description and questions
  - [x] 5.2 Test that it returns the correct composite score (average of 4 components)
  - [x] 5.3 Test that it clamps out-of-range scores (e.g., negative or > 1) to valid range
  - [x] 5.4 Test that it propagates errors from `aiService.generateJSON()` (the listener handles the catch)
- [x] Task 6: Unit tests for `handleBatchServed()` listener (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Test happy path: loads questions + goal, calls `evaluateBatchQuality()`, stores composite score in `intake_batches.quality_score`
  - [x] 6.2 Test warning logging: when composite < 0.5, `logger.warn()` is called with goal_id, batch_number, and all component scores
  - [x] 6.3 Test info logging: when composite >= 0.5, `logger.log()` is called (not `logger.warn()`)
  - [x] 6.4 Test AI failure: when `evaluateBatchQuality()` throws, error is logged via `logger.error()`, quality_score is NOT updated, no rethrow
  - [x] 6.5 Test Supabase failure: when score update fails, error is logged, no rethrow
  - [x] 6.6 Test batch question loading failure: when `intake_questions` query fails, error is logged, method returns early
  - [x] 6.7 Test goal loading failure: when `goals` query fails, error is logged, method returns early

## Dev Notes

### Developer Context

**What this story builds:** The async quality monitoring pipeline — an LLM-as-judge system that evaluates every batch served to users, scores it across 4 quality dimensions, stores the composite score, and warns when quality drops. This is the FINAL story in Epic 2 and the last piece of the intake infrastructure before Epic 3 (resilience and production readiness).

**This story extends ONE existing service:**
1. **`IntakeQualityService`** — currently a pure synchronous validation utility (structural + semantic checks). This story transforms it into a full service with dependencies (AiService, SupabaseService, Logger) and adds the async LLM-as-judge quality evaluation triggered by the `batch.served` event.

**The quality scoring flow works like this:**
1. User requests next batch OR submits answers → IntakeService stores/serves a batch → emits `batch.served` event (already implemented in Story 2.5)
2. `IntakeQualityService.handleBatchServed()` listener picks up the event asynchronously
3. Listener loads the batch questions, goal description, and prior batch questions for context
4. Calls `evaluateBatchQuality()` which sends a scoring prompt to the LLM via `AiService.generateJSON()`
5. LLM returns 4 component scores (relevance, depth_progression, dimension_coverage, redundancy_avoidance)
6. Composite = average of 4 scores → stored in `intake_batches.quality_score`
7. If composite < 0.5 → `logger.warn()` with full score breakdown

**Key design decisions:**
- The `@OnEvent('batch.served')` listener lives in `IntakeQualityService` (NOT IntakeService) — per architecture doc's event table: emitter=IntakeService, listener=IntakeQualityService. This keeps quality logic encapsulated in its own service.
- Quality evaluation is fire-and-forget — the user never sees quality scores. They exist purely for ops monitoring (admin Journey 4).
- Only the composite score is persisted in `intake_batches.quality_score` (existing column, numeric, nullable). Component scores are included in warning logs for debugging.
- LLM-as-judge failures are swallowed — a batch is still perfectly valid and served to the user even without a quality score. The `quality_score` column stays `null`.
- First batch (hardcoded universal batch) also gets scored. This provides a baseline quality measurement.
- The prior batch questions provide context for depth_progression and redundancy_avoidance scoring. For batch 1, prior questions will be empty — the LLM-as-judge should handle this gracefully (no depth comparison possible, score based on standalone quality).

**CRITICAL: IntakeQualityService constructor changes.** Currently the service has NO constructor — it's a pure utility class. This story adds `AiService` and `SupabaseService` injection. Both are `@Global()` modules so no import changes needed in `IntakeModule`. However, the **existing test file** (`intake-quality.service.spec.ts`) creates the service without providing these dependencies. The test setup MUST be updated to provide mocks, or all existing validation tests will fail.

**CRITICAL: Scoring prompt quality.** The LLM-as-judge prompt is the most important artifact in this story. It must clearly define each dimension with concrete examples and scoring criteria. A vague prompt will produce inconsistent scores. The prompt should be deterministic-leaning — ask the LLM to reason step-by-step before scoring.

**What NOT to build in this story:**
- No UI or endpoint for viewing quality scores (ops use Supabase dashboard)
- No quality score aggregation or trending analysis
- No automatic remediation when scores are low (just logging)
- No fallback batch logic based on quality scores (Story 3.1 handles fallbacks for generation failures, not quality failures)
- No changes to how batches are served — quality evaluation is a pure side effect
- No `quality_scores` JSONB column for component breakdown — composite in `quality_score` is sufficient for MVP

### Technical Requirements

**Quality score interface:**

```typescript
interface QualityScores {
  relevance: number;          // 0-1: Are questions relevant to the user's goal?
  depth_progression: number;  // 0-1: Do questions dig deeper than prior batches?
  dimension_coverage: number; // 0-1: Do questions cover different goal aspects?
  redundancy_avoidance: number; // 0-1: Are questions non-redundant with prior batches?
}
```

**LLM-as-judge system prompt (store as private constant in IntakeQualityService):**

```typescript
private readonly QUALITY_JUDGE_SYSTEM_PROMPT = `You are an expert intake quality evaluator for a personal coaching platform. Your job is to score a batch of intake questions on four dimensions.

Score each dimension from 0.0 to 1.0:

1. **relevance** — How relevant are the questions to the user's stated goal? Score 1.0 if every question directly relates to understanding the goal. Score 0.0 if questions are generic or unrelated.

2. **depth_progression** — Do these questions dig deeper than previous batches? For batch 1 (no prior context), score based on whether questions go beyond surface-level. For later batches, score higher if they build on and deepen prior answers. Score 0.0 if questions stay at the same superficial level.

3. **dimension_coverage** — Do questions cover different aspects of the goal (motivation, constraints, resources, timeline, past experience, emotional state, etc.)? Score 1.0 if questions span multiple distinct dimensions. Score 0.0 if all questions target the same narrow aspect.

4. **redundancy_avoidance** — Are questions non-redundant with prior batches? Score 1.0 if every question asks something new. Score 0.0 if questions repeat what was already asked. For batch 1 (no prior context), score 1.0 by default.

Respond with ONLY a JSON object, no other text:
{"relevance": 0.0, "depth_progression": 0.0, "dimension_coverage": 0.0, "redundancy_avoidance": 0.0}`;
```

**LLM-as-judge user prompt (built dynamically in `evaluateBatchQuality()`):**

```typescript
const userPrompt = `## Goal Description
${goalDescription}

## Current Batch (Batch ${batchNumber})
${questions.map((q, i) => `${i + 1}. [${q.question_type}] ${q.question_text}`).join('\n')}

${priorQuestions.length > 0 ? `## Prior Batch Questions
${priorQuestions.map((q) => `- [Batch ${q.batch_number}] ${q.question_text}`).join('\n')}` : '## Prior Batch Questions\nNone (this is the first batch)'}

Score this batch.`;
```

**`evaluateBatchQuality()` method:**

```typescript
async evaluateBatchQuality(
  questions: Array<{ question_text: string; question_type: string }>,
  goalDescription: string,
  batchNumber: number,
  priorQuestions: Array<{ question_text: string; batch_number: number }>,
): Promise<{ relevance: number; depth_progression: number; dimension_coverage: number; redundancy_avoidance: number; composite: number }> {
  const userPrompt = /* build from template above */;

  const scores = await this.aiService.generateJSON<QualityScores>(
    this.QUALITY_JUDGE_SYSTEM_PROMPT,
    userPrompt,
  );

  // Clamp all scores to [0, 1]
  const clamp = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
  const relevance = clamp(scores.relevance);
  const depth_progression = clamp(scores.depth_progression);
  const dimension_coverage = clamp(scores.dimension_coverage);
  const redundancy_avoidance = clamp(scores.redundancy_avoidance);

  const composite = (relevance + depth_progression + dimension_coverage + redundancy_avoidance) / 4;

  return { relevance, depth_progression, dimension_coverage, redundancy_avoidance, composite };
}
```

**`handleBatchServed()` event listener:**

```typescript
@OnEvent('batch.served')
async handleBatchServed(payload: BatchServedEvent): Promise<void> {
  try {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Load current batch questions
    const { data: questions, error: qError } = await supabase
      .from('intake_questions')
      .select('question_text, question_type')
      .eq('batch_id', payload.batch_id)
      .order('order_in_batch');

    if (qError || !questions?.length) {
      this.logger.error(`Failed to load questions for quality scoring (batch ${payload.batch_id}): ${qError?.message}`);
      return;
    }

    // 2. Load goal description
    const { data: goal, error: gError } = await supabase
      .from('goals')
      .select('description')
      .eq('id', payload.goal_id)
      .single();

    if (gError || !goal) {
      this.logger.error(`Failed to load goal for quality scoring (goal ${payload.goal_id}): ${gError?.message}`);
      return;
    }

    // 3. Load prior batch questions for context (batches before this one)
    const { data: priorQuestions } = await supabase
      .from('intake_questions')
      .select('question_text, batch_number')
      .eq('goal_id', payload.goal_id)
      .lt('batch_number', payload.batch_number)
      .order('batch_number')
      .order('order_in_batch');

    // 4. Evaluate quality via LLM-as-judge
    const scores = await this.evaluateBatchQuality(
      questions,
      goal.description,
      payload.batch_number,
      priorQuestions ?? [],
    );

    // 5. Store composite score
    const { error: updateError } = await supabase
      .from('intake_batches')
      .update({ quality_score: scores.composite })
      .eq('id', payload.batch_id);

    if (updateError) {
      this.logger.error(`Failed to store quality score for batch ${payload.batch_id}: ${updateError.message}`);
      return;
    }

    // 6. Log based on threshold
    if (scores.composite < appConfig.intake.qualityWarnThreshold) {
      this.logger.warn(
        `Low quality score for batch ${payload.batch_number} (goal ${payload.goal_id}): ` +
        `composite=${scores.composite.toFixed(2)}, relevance=${scores.relevance.toFixed(2)}, ` +
        `depth_progression=${scores.depth_progression.toFixed(2)}, ` +
        `dimension_coverage=${scores.dimension_coverage.toFixed(2)}, ` +
        `redundancy_avoidance=${scores.redundancy_avoidance.toFixed(2)}`,
      );
    } else {
      this.logger.log(
        `Quality score for batch ${payload.batch_number} (goal ${payload.goal_id}): composite=${scores.composite.toFixed(2)}`,
      );
    }
  } catch (error) {
    this.logger.error(
      `Quality scoring failed for batch ${payload.batch_id} (goal ${payload.goal_id}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

**CRITICAL: Prior questions query uses `goal_id` and `batch_number < current`.** The `intake_questions` table has both `goal_id` and `batch_number` columns, so filtering is straightforward without a join to `intake_batches`. However, we need to ensure we only get questions from batches with a lower `batch_number` for the same goal.

**CRITICAL: Do NOT load answers for quality scoring.** The LLM-as-judge evaluates question QUALITY, not answer quality. It only needs the questions themselves, the goal description, and prior questions for context. Answers are irrelevant for this evaluation.

### Architecture Compliance

**Module structure:** No new modules. `IntakeQualityService` already exists in `IntakeModule`. `AiService` and `SupabaseService` are `@Global()` so they're auto-available — no import changes in `intake.module.ts`.

**Service boundaries (STRICT):**
- `IntakeQualityService` — add `@OnEvent('batch.served')` listener (`handleBatchServed`), add `evaluateBatchQuality()` method. Owns all quality evaluation logic per architecture doc: "IntakeQualityService — owns quality validation, fallback logic, listens for `batch.served`".
- `AiService` — used as-is via `generateJSON<T>()`. No changes.
- `SupabaseService` — used as-is via `getAdminClient()`. No changes.
- `IntakeService` — NO changes. `batch.served` events already emitted (Story 2.5).

**Event system pattern:**
- Follows established pattern from Story 2.5
- Event name: `batch.served` (already defined and emitted)
- Listener uses `@OnEvent('batch.served')` decorator
- Listener is async, wrapped in try/catch, errors logged and swallowed

**Error handling:**
- All errors caught in listener — never propagate to user
- LLM failures leave `quality_score` as `null` — no impact on batch serving
- Supabase failures logged and method returns early

**Import pattern:** ALL relative imports MUST use `.js` extension.

**Logging pattern:**
- `Logger` from `@nestjs/common`, instantiated with service name
- `warn` for quality threshold breaches (FR41)
- `error` for failures
- `log` for successful quality scoring

**Admin client pattern:** `this.supabaseService.getAdminClient()` for all DB operations.

**Config usage:** `appConfig.intake.qualityWarnThreshold` (0.5) — NEVER hardcode the threshold value.

### Library & Framework Requirements

**No new dependencies.** Everything needed is already installed:
- `@nestjs/event-emitter` — `@OnEvent` decorator (Story 2.5)
- `@nestjs/common` — `Injectable`, `Logger`
- `openai` (via AiService) — `generateJSON()` for LLM-as-judge
- `@supabase/supabase-js` (via SupabaseService) — database operations

**AiService.generateJSON<T>() usage:**
```typescript
// Already available — no new methods needed
const scores = await this.aiService.generateJSON<QualityScores>(
  systemPrompt,
  userPrompt,
);
// Uses default model (appConfig.ai.defaultModel = 'x-ai/grok-4.1-fast')
// Uses 30s AbortController timeout
// Extracts JSON from response via regex
```

### File Structure Requirements

**Files to CREATE:**
- None — all changes go into existing files

**Files to MODIFY:**
- `src/intake/intake-quality.service.ts` — Add constructor with `AiService` and `SupabaseService` injection. Add `Logger`. Add `QUALITY_JUDGE_SYSTEM_PROMPT` constant. Add `evaluateBatchQuality()` method. Add `@OnEvent('batch.served')` listener `handleBatchServed()`. Import `OnEvent` from `@nestjs/event-emitter`, `BatchServedEvent` from `./intake.service.js`.
- `src/intake/intake-quality.service.spec.ts` — Update test module `beforeEach` to provide mock `AiService` and mock `SupabaseService`. Add tests for `evaluateBatchQuality()` and `handleBatchServed()`. Verify existing validation tests still pass.

**Files NOT to touch:**
- `src/intake/intake.service.ts` — events already emitted, no changes needed
- `src/intake/intake.service.spec.ts` — no changes needed
- `src/intake/intake.controller.ts` — no endpoint changes
- `src/intake/intake-prompt.service.ts` — no prompt changes
- `src/intake/intake.module.ts` — IntakeQualityService already registered, AiService/SupabaseService are @Global
- `src/app.module.ts` — EventEmitter2 already configured (Story 2.5)
- `src/ai/ai.service.ts` — generateJSON already exists
- `src/config/app.config.ts` — qualityWarnThreshold already defined (0.5)
- Database — `intake_batches.quality_score` column already exists (numeric, nullable). No migration needed.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file:** `src/intake/intake-quality.service.spec.ts` (existing file, add new tests).

**CRITICAL: Update test module setup.** The current `beforeEach` creates `IntakeQualityService` with NO dependencies. After adding constructor injection, the test module MUST provide:
- `AiService` mock: `{ generateJSON: jest.fn() }`
- `SupabaseService` mock: `{ getAdminClient: () => mockSupabase }`

**Updated test module setup:**

```typescript
let mockAiService: { generateJSON: jest.Mock };
let mockSupabase: { from: jest.Mock };

beforeEach(async () => {
  mockAiService = { generateJSON: jest.fn() };
  mockSupabase = { from: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      IntakeQualityService,
      { provide: AiService, useValue: mockAiService },
      { provide: SupabaseService, useValue: { getAdminClient: () => mockSupabase } },
    ],
  }).compile();

  service = module.get<IntakeQualityService>(IntakeQualityService);
});
```

**Tests for `evaluateBatchQuality()`:**

```
describe('evaluateBatchQuality')
  it calls aiService.generateJSON with system prompt and user prompt containing goal and questions
  it returns composite as average of 4 component scores
  it clamps negative scores to 0
  it clamps scores above 1 to 1
  it handles NaN scores by defaulting to 0
  it propagates errors from aiService.generateJSON (no internal catch)
```

**Tests for `handleBatchServed()`:**

```
describe('handleBatchServed')
  it loads batch questions, goal description, and prior questions from Supabase
  it calls evaluateBatchQuality with loaded data
  it stores composite score in intake_batches.quality_score
  it logs warning when composite < 0.5 (qualityWarnThreshold) with all component scores
  it logs at info level when composite >= 0.5
  it catches and logs error when question loading fails, does not rethrow
  it catches and logs error when goal loading fails, does not rethrow
  it catches and logs error when evaluateBatchQuality throws, does not rethrow
  it catches and logs error when quality_score update fails, does not rethrow
  it handles empty prior questions gracefully (batch 1 scenario)
```

**Existing tests MUST still pass:**
- All `validateStructural()` tests (8 tests)
- All `validateSemantic()` tests (5 tests)
- All `validateGoalProfile()` tests (7 tests)
- All `validateBatch()` tests (3 tests)

**Mock patterns:**
- Mock `AiService.generateJSON` — return a fake quality scores object `{ relevance: 0.8, depth_progression: 0.7, dimension_coverage: 0.9, redundancy_avoidance: 0.85 }` or throw
- Mock Supabase chainable queries — use `mockReturnValueOnce` for sequential calls (questions query → goal query → prior questions query → score update)
- Spy on `Logger.warn` and `Logger.error` to verify threshold logging — use `jest.spyOn(service['logger'], 'warn')` pattern

**Test count:** ~16 new tests + 23 existing = ~39 total in `intake-quality.service.spec.ts`.

### Previous Story Intelligence

**From Story 2.5 (immediately prior):**

- EventEmitter2 fully configured in AppModule with global error handler — no setup needed
- `batch.served` event emitted at 3 locations in IntakeService: `createFirstBatch()` (line 847), `submitBatch()` Transaction 2 (line 305), `generateAndStoreNextBatch()` (line 405)
- Event payload type `BatchServedEvent` is exported from `intake.service.ts` (line 26): `{ goal_id, batch_id, batch_number, user_id }`
- `@OnEvent` listener pattern established: async method, try/catch wrapper, log errors, never rethrow
- Test pattern for mocking EventEmitter2: `{ emit: jest.fn() }` — but for IntakeQualityService we don't need to mock emit (we mock the listener inputs instead)
- Chainable Supabase mock pattern: `mockSupabase.from.mockReturnValueOnce(chain)` with nested call chains

**From Stories 2.1-2.4:**

- `intake_questions` table has columns: `id`, `goal_id`, `batch_id`, `batch_number`, `question_text`, `question_type`, `config`, `order_in_batch`, `created_at`
- `intake_batches` table has `quality_score` (numeric, nullable) — ready to receive scores
- IntakeQualityService is already registered in IntakeModule providers (no module change needed)
- The mock pattern for IntakeQualityService in `intake.service.spec.ts` already has: `{ validateBatch: jest.fn(), validateGoalProfile: jest.fn() }` — this does NOT need updating since IntakeService doesn't call the new quality scoring methods

**Debug issues from previous stories to AVOID:**
- When adding constructor dependencies to IntakeQualityService, the existing spec MUST provide the new mocks or ALL tests will fail (NestJS DI resolution error)
- Call `handleBatchServed()` directly in tests — do NOT rely on event propagation (unit tests should test the method, not the event system wiring)
- The Supabase mock for `handleBatchServed` requires 4 sequential calls: questions query, goal query, prior questions query, score update. Use `mockReturnValueOnce` carefully in the right order.

### Project Structure Notes

- IntakeQualityService is the correct home for quality evaluation per architecture doc's service boundaries table: "IntakeQualityService — owns quality validation, fallback logic, listens for `batch.served`"
- No new files or modules needed — pure extension of existing service
- `intake_batches.quality_score` column is `numeric` type (nullable) — stores the composite float (0.0-1.0)
- All 4 component scores exist only in memory during evaluation and in warn-level logs when threshold is breached
- `appConfig.intake.qualityWarnThreshold` (0.5) is the ONLY source of truth for the warning threshold

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6 — FR39, FR40, FR41]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points — batch.served: Emitter=IntakeService, Listener=IntakeQualityService]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakeQualityService: owns quality validation, fallback logic, listens for batch.served]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — Event System]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Error Handling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Logging]
- [Source: _bmad-output/planning-artifacts/prd.md#FR39 — System evaluates batch quality asynchronously via LLM-as-judge]
- [Source: _bmad-output/planning-artifacts/prd.md#FR40 — System stores quality scores per batch]
- [Source: _bmad-output/planning-artifacts/prd.md#FR41 — System logs warning when quality scores drop below threshold]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4 — Async operations zero impact on user-facing latency]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR13 — EventEmitter2 errors logged, never silently swallowed]
- [Source: _bmad-output/implementation-artifacts/2-5-batch-and-profile-semantic-embedding.md — EventEmitter2 setup, batch.served emission points, @OnEvent listener pattern]
- [Source: src/intake/intake-quality.service.ts — Current sync validation methods (validateStructural, validateSemantic, validateBatch, validateGoalProfile)]
- [Source: src/intake/intake.service.ts:26 — BatchServedEvent type export]
- [Source: src/intake/intake.service.ts:305,405,847 — batch.served event emission points]
- [Source: src/ai/ai.service.ts:49 — generateJSON<T>(system, user, model?) method]
- [Source: src/config/app.config.ts:14 — qualityWarnThreshold: 0.5]
- [Source: Supabase DB — intake_batches.quality_score column (numeric, nullable)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. Clean implementation.

### Completion Notes List

- Transformed IntakeQualityService from a pure utility class to a full NestJS service with AiService and SupabaseService constructor injection
- Added `QUALITY_JUDGE_SYSTEM_PROMPT` constant with detailed scoring criteria for 4 quality dimensions (relevance, depth_progression, dimension_coverage, redundancy_avoidance)
- Implemented `evaluateBatchQuality()` method: builds user prompt with goal/questions/prior context, calls AiService.generateJSON, clamps scores to [0,1], computes composite average
- Implemented `@OnEvent('batch.served')` listener `handleBatchServed()`: loads batch questions, goal description, prior questions from Supabase, evaluates quality, stores composite score, logs warning when below threshold (0.5)
- All errors caught and logged in listener — never propagate to user (fire-and-forget pattern)
- Updated test module to provide AiService and SupabaseService mocks
- Added 17 new tests (7 for evaluateBatchQuality, 10 for handleBatchServed) covering happy paths, error paths, clamping, NaN handling, threshold logging
- All 23 existing validation tests continue to pass unchanged
- Full suite: 167 tests across 10 suites, 0 regressions
- Lint: 0 errors (only pre-existing warnings)

### File List

- `src/intake/intake-quality.service.ts` (modified) — Added imports, constructor, QualityScores interface, QUALITY_JUDGE_SYSTEM_PROMPT, evaluateBatchQuality(), handleBatchServed()
- `src/intake/intake-quality.service.spec.ts` (modified) — Updated test module with AiService/SupabaseService mocks, added evaluateBatchQuality and handleBatchServed test suites

## Change Log

- 2026-02-12: Implemented async quality scoring pipeline — LLM-as-judge evaluates batch quality on 4 dimensions via @OnEvent('batch.served'), stores composite in intake_batches.quality_score, warns on low scores. 17 new tests added, 40 total in spec file, 167 total across project.
