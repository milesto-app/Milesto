# Story 2.3: AI-Generated Next Batch with Quality Gates

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the system to generate my next set of questions adaptively based on everything I've shared, with quality checks ensuring every batch is well-formed,
So that the intake feels like a conversation that gets sharper with each round.

## Acceptance Criteria

1. **Given** answers have been submitted for the current batch and intake is not yet complete **When** Transaction 2 runs after answer persistence (within `submitBatch`) **Then** AI generates the next adaptive batch informed by goal description and all prior answers (FR11) **And** the next batch is stored in `intake_batches` + `intake_questions` and returned inline in the same response as answer confirmation (FR14) **And** the response format is `{ submitted_batch: { batch_id, batch_number }, next_batch: { batch_id, batch_number, is_complete: false, questions: [...] } }`
2. **Given** a generated batch from AI **When** structural validation runs (Layer 1) **Then** the system verifies: valid JSON parse succeeded, all required fields present (`question_text`, `question_type`, `config`, `order_in_batch`), `question_type` is one of `text`/`scale`/`single_choice`/`multiple_choice`, 3-5 questions per batch (FR37) **And** structurally invalid batches trigger a single retry
3. **Given** a structurally valid batch **When** semantic validation runs (Layer 2) **Then** the system verifies: every question_text ends with `?`, no duplicate question_text within the batch, choice-type questions have at least 2 distinct options, batch contains at least 2 different question_types (FR38) **And** semantically invalid batches trigger a single retry
4. **Given** later batches (batch_number >= 3) **When** AI generates questions **Then** later batches have fewer questions (trending toward `min: 3`) and more quick-tap types (`scale`, `single_choice`, `multiple_choice`) than `text` (FR17)
5. **Given** the AI signals completion in its response OR batch 7 is reached **When** the system processes the AI response **Then** the system does NOT generate another batch **And** the response includes `is_complete: true` instead of a `next_batch` **And** the response format becomes `{ submitted_batch: { batch_id, batch_number }, is_complete: true }`
6. **Given** AI generation fails after one retry (both attempts fail validation or throw errors) **When** the failure is caught **Then** the submitted answers are still persisted (Transaction 1 already committed — FR28) **And** the response returns the submitted batch confirmation without a next_batch: `{ submitted_batch: { batch_id, batch_number }, message: "Answers submitted successfully" }` **And** calling `GET next-batch` after this will trigger the same AI generation attempt (Story 3.1 will add fallback batches)
7. **Given** the `GET /api/goals/:goalId/intake/next-batch` endpoint is called and the latest batch `is_answered = true` **When** the system detects there are answered batches but no pending batch **Then** the system attempts AI generation for the next batch (instead of the current 400 error) **And** returns the generated batch or throws an error if generation fails
8. **Given** the current `submitBatch` response format **When** Transaction 2 succeeds **Then** the response is extended from `{ submitted_batch, message }` to `{ submitted_batch, next_batch }` or `{ submitted_batch, is_complete }` **And** the `message` field is removed when `next_batch` or `is_complete` is present

## Tasks / Subtasks

- [x] Task 1: Add `generateNextBatch()` to IntakePromptService (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Define `GeneratedQuestion` interface in `intake-prompt.service.ts`: `{ question_text: string, question_type: 'text' | 'scale' | 'single_choice' | 'multiple_choice', config: Record<string, unknown> | null, order_in_batch: number }`
  - [x] 1.2 Add `generateNextBatch(goalDescription: string, priorBatches: PriorBatchContext[], batchNumber: number): Promise<{ questions: GeneratedQuestion[], is_complete: boolean }>` method
  - [x] 1.3 Build system prompt: role definition (adaptive coaching question generator), output JSON schema, question type specifications with config requirements, progressive tightening rules (batch 3+ = fewer questions, more quick-tap), completion signal rules (suggest completion when covered enough dimensions OR batch 7 = forced complete)
  - [x] 1.4 Build user prompt: include goal description, all prior Q&A pairs formatted as context, current batch number, remaining budget (`appConfig.intake.maxBatches - batchNumber + 1`)
  - [x] 1.5 Call `this.aiService.generateJSON<{ questions: GeneratedQuestion[], is_complete: boolean }>()` with system + user prompts
  - [x] 1.6 Handle `is_complete` signal from AI: if `true` or `batchNumber >= appConfig.intake.maxBatches`, return `{ questions: [], is_complete: true }`
- [x] Task 2: Create IntakeQualityService with structural + semantic validation (AC: #2, #3)
  - [x] 2.1 Create `src/intake/intake-quality.service.ts` with `@Injectable()`
  - [x] 2.2 Implement `validateStructural(questions: unknown[]): { valid: boolean, errors: string[] }` — checks: is array, length 3-5, each has `question_text` (string), `question_type` (valid enum value), `config` (object or null), `order_in_batch` (number); scale config has `min`/`max` numbers; choice configs have `options` string array (FR37)
  - [x] 2.3 Implement `validateSemantic(questions: GeneratedQuestion[]): { valid: boolean, errors: string[] }` — checks: each `question_text` ends with `?`, no duplicate `question_text` values (case-insensitive), choice questions have >= 2 distinct options, batch has >= 2 different `question_type` values (FR38)
  - [x] 2.4 Implement `validateBatch(questions: unknown[]): { valid: boolean, errors: string[], layer: 'structural' | 'semantic' }` — runs structural first, then semantic if structural passes; returns combined result with which layer failed
- [x] Task 3: Modify `submitBatch()` in IntakeService for Transaction 2 (AC: #1, #5, #6, #8)
  - [x] 3.1 After existing Transaction 1 (answer insert + batch mark as answered), add Transaction 2 block
  - [x] 3.2 Load all prior batches with their Q&A for context: query `intake_batches` + `intake_questions` + `intake_answers` for this goal, ordered by batch_number
  - [x] 3.3 Load goal description from the goal object (already fetched in step 1 of submitBatch)
  - [x] 3.4 Call `intakePromptService.generateNextBatch()` with goal description, prior batch context, and next batch number
  - [x] 3.5 If AI signals `is_complete: true`: return `{ submitted_batch, is_complete: true }` (do NOT create a new batch)
  - [x] 3.6 Run `intakeQualityService.validateBatch()` on generated questions — if invalid, retry once via `intakePromptService.generateNextBatch()` again
  - [x] 3.7 If valid after retry (or first attempt): insert new batch into `intake_batches`, insert questions into `intake_questions`, return `{ submitted_batch, next_batch: { batch_id, batch_number, is_complete: false, questions } }`
  - [x] 3.8 If still invalid after retry: log warning, return `{ submitted_batch, message: "Answers submitted successfully" }` (graceful degradation — answers are safe)
  - [x] 3.9 Wrap Transaction 2 in try/catch: if any error, log it, return the Transaction 1 result (answers always preserved — FR28)
- [x] Task 4: Modify `getNextBatch()` in IntakeService (AC: #7)
  - [x] 4.1 Replace the `throw BadRequestException` on line 54-56 when latest batch is answered — instead, attempt AI generation for next batch
  - [x] 4.2 Load prior batch context same as in submitBatch
  - [x] 4.3 Load goal description from goal object
  - [x] 4.4 Call `intakePromptService.generateNextBatch()` and validate
  - [x] 4.5 If valid: insert batch + questions, return batch response
  - [x] 4.6 If AI signals completion: return `{ batch_id: null, batch_number: null, is_complete: true, questions: [] }`
  - [x] 4.7 If generation fails: throw `InternalServerErrorException('Failed to generate next batch')` (Story 3.1 will add fallback)
- [x] Task 5: Register IntakeQualityService (AC: #2, #3)
  - [x] 5.1 Add `IntakeQualityService` to `providers` array in `intake.module.ts`
  - [x] 5.2 Inject `IntakeQualityService` into `IntakeService` constructor
- [x] Task 6: Unit tests (AC: #1-#8)
  - [x] 6.1 IntakePromptService `generateNextBatch`: returns questions and is_complete from AI
  - [x] 6.2 IntakePromptService `generateNextBatch`: calls AiService.generateJSON with correct prompts
  - [x] 6.3 IntakePromptService `generateNextBatch`: returns is_complete true when batchNumber >= maxBatches
  - [x] 6.4 IntakeQualityService `validateStructural`: passes valid batch
  - [x] 6.5 IntakeQualityService `validateStructural`: fails on wrong question count (< 3 or > 5)
  - [x] 6.6 IntakeQualityService `validateStructural`: fails on missing required fields
  - [x] 6.7 IntakeQualityService `validateStructural`: fails on invalid question_type
  - [x] 6.8 IntakeQualityService `validateStructural`: fails on scale without min/max in config
  - [x] 6.9 IntakeQualityService `validateStructural`: fails on choice type without options array
  - [x] 6.10 IntakeQualityService `validateSemantic`: passes valid batch
  - [x] 6.11 IntakeQualityService `validateSemantic`: fails on question not ending with ?
  - [x] 6.12 IntakeQualityService `validateSemantic`: fails on duplicate question text
  - [x] 6.13 IntakeQualityService `validateSemantic`: fails on choice with < 2 options
  - [x] 6.14 IntakeQualityService `validateSemantic`: fails on single question type variety
  - [x] 6.15 IntakeService `submitBatch`: Transaction 2 generates and returns next batch inline
  - [x] 6.16 IntakeService `submitBatch`: returns is_complete when AI signals completion
  - [x] 6.17 IntakeService `submitBatch`: retries once on validation failure, succeeds on retry
  - [x] 6.18 IntakeService `submitBatch`: returns answer confirmation without next_batch when AI fails after retry
  - [x] 6.19 IntakeService `submitBatch`: Transaction 1 succeeds even when Transaction 2 throws
  - [x] 6.20 IntakeService `getNextBatch`: generates AI batch when latest batch is answered
  - [x] 6.21 IntakeService `getNextBatch`: returns is_complete when AI signals completion
  - [x] 6.22 IntakeService `getNextBatch`: throws InternalServerError when AI generation fails
  - [x] 6.23 IntakePromptService `generateNextBatch`: system prompt includes progressive tightening for batch >= 3

## Dev Notes

### Developer Context

**What this story builds:** The AI-powered question generation engine — the core intelligence of the intake system. After the user submits answers (Transaction 1, already built in Story 2.2), Transaction 2 now kicks in: the system feeds all prior context to an LLM, gets back adaptive questions, validates them through structural and semantic quality gates, stores the new batch, and returns it inline in the same response.

**This is the FIRST story that uses AiService.** The `AiService.generateJSON<T>()` method already exists and works. You call it with system + user prompts and it returns parsed JSON. It handles the 30s timeout and JSON extraction from LLM response. You do NOT need to touch `AiService`.

**Two-transaction split (CRITICAL to understand):**
- **Transaction 1** (Story 2.2, already built): Insert answers → mark batch as answered. This ALWAYS succeeds independently.
- **Transaction 2** (THIS story): Generate next batch via AI → validate → store. This is wrapped in try/catch. If it fails, Transaction 1's results are preserved. The user gets their answers saved no matter what.

**Key architectural insight:** `submitBatch()` currently returns `{ submitted_batch, message }`. This story extends the response to `{ submitted_batch, next_batch }` when Transaction 2 succeeds, or `{ submitted_batch, is_complete }` when intake is done. The `message` field is only returned as a fallback when Transaction 2 fails.

**Existing code you MUST understand before starting:**
- `src/intake/intake.service.ts` — 376 lines. `submitBatch()` (lines 59-181) is the main method to extend. `getNextBatch()` (lines 22-57) needs modification at line 54 to attempt AI generation instead of throwing 400.
- `src/intake/intake-prompt.service.ts` — 66 lines. Has `getUniversalBatch()` and `UniversalQuestion` interface. **Add `generateNextBatch()` here.** This service does NOT currently inject `AiService` — you need to add it.
- `src/ai/ai.service.ts` — 51 lines. `generateJSON<T>(system, user, model?)` extracts JSON via regex from LLM response. Uses 30s AbortController timeout. **Do NOT modify this file.**
- `src/config/app.config.ts` — 21 lines. `appConfig.intake.maxBatches` (7), `appConfig.intake.questionsPerBatch` ({ min: 3, max: 5 }), `appConfig.intake.targetBatches` (5). **Use these values in prompt construction and validation — do NOT hardcode.**

**Existing database tables (ALL already exist — NO new migrations needed):**
- `intake_batches` — `id`, `goal_id`, `batch_number`, `is_answered`, `is_fallback`, `quality_score`, `embedded`, `created_at`. UNIQUE on `(goal_id, batch_number)`.
- `intake_questions` — `id`, `goal_id`, `batch_id`, `batch_number`, `question_text`, `question_type`, `config` (JSONB), `order_in_batch`, `created_at`. CHECK on `question_type` IN (`text`, `scale`, `single_choice`, `multiple_choice`).
- `intake_answers` — `id`, `question_id` (UNIQUE), `answer_text`, `answer_numeric`, `selected_options` (JSONB), `created_at`.
- `goals` — `id`, `user_id`, `title`, `description`, `status`, `profile_generation_attempts`, `created_at`, `updated_at`.

**What NOT to build in this story:**
- No fallback batches when AI fails (Story 3.1) — for now, just return the Transaction 1 result
- No profile generation when intake completes (Story 2.4) — for now, just return `is_complete: true`
- No goal status transition to `intake_completed` (Story 2.4)
- No embedding of batch Q&A (Story 2.5)
- No async LLM-as-judge quality scoring (Story 2.6) — this story only does synchronous structural + semantic validation
- No `batch.served` or `batch.answered` event emissions (Story 2.5/2.6)
- No user profile loading for redundancy avoidance (FR12 partially — user profile module doesn't exist yet; for now, the AI prompt should mention the concept but the actual profile content will be empty/null)

### Technical Requirements

**AI Prompt Design for `generateNextBatch()` — the most critical part of this story:**

System prompt structure:
```
You are an adaptive coaching intake question generator. Your job is to create the next batch of questions for a user who is setting up a coaching goal.

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "questions": [
    {
      "question_text": "Your question here?",
      "question_type": "text|scale|single_choice|multiple_choice",
      "config": null | { "min": number, "max": number, "min_label": string, "max_label": string } | { "options": ["opt1", "opt2", ...] },
      "order_in_batch": 1
    }
  ],
  "is_complete": false
}

QUESTION TYPE SPECIFICATIONS:
- "text": Free-form answer. config must be null.
- "scale": Numeric rating. config must have { min, max, min_label, max_label }.
- "single_choice": Pick one option. config must have { options: string[] } with 2-6 options.
- "multiple_choice": Pick multiple options. config must have { options: string[] } with 2-8 options.

RULES:
- Generate between {min} and {max} questions per batch.
- Every question_text MUST end with a question mark (?).
- Use at least 2 different question_types per batch.
- Do NOT repeat questions already asked in prior batches.
- order_in_batch starts at 1 and increments sequentially.
- Focus questions on understanding the user's specific situation, constraints, resources, and path to their goal.

PROGRESSIVE TIGHTENING (batch {batchNumber} of max {maxBatches}):
- Batches 2-3: 4-5 questions, mix of text and quick-tap types (scale, choice).
- Batches 4-5: 3-4 questions, mostly quick-tap types. Text only for critical gaps.
- Batches 6-7: 3 questions, all quick-tap. Wrap up remaining dimensions.

COMPLETION SIGNAL:
- Set "is_complete": true when you believe sufficient context has been gathered (typically after 3-5 batches).
- If this is batch {maxBatches}, you MUST set "is_complete": true and return an empty questions array.
- When setting is_complete to true, return an empty questions array [].
```

User prompt structure:
```
GOAL: {goal.description}

PRIOR INTAKE RESPONSES:
{for each prior batch, formatted as:}
--- Batch {n} ---
Q: {question_text} ({question_type})
A: {formatted answer based on type}
{end for each}

Generate batch {nextBatchNumber} of questions. You have {remainingBudget} batches remaining (including this one).
```

**Prior batch context loading — query pattern:**

```typescript
// Load all prior batches with questions and answers for this goal
const { data: priorData, error } = await supabase
  .from('intake_batches')
  .select(`
    id,
    batch_number,
    intake_questions (
      id,
      question_text,
      question_type,
      config,
      order_in_batch,
      intake_answers (
        answer_text,
        answer_numeric,
        selected_options
      )
    )
  `)
  .eq('goal_id', goalId)
  .eq('is_answered', true)
  .order('batch_number');
```

Note: This uses Supabase's foreign table syntax for joins. `intake_questions` has a FK to `intake_batches` via `batch_id`. `intake_answers` has a FK to `intake_questions` via `question_id`. The query will automatically join through these FKs.

**Answer formatting for prompt context:**

```typescript
function formatAnswer(question: any, answer: any): string {
  switch (question.question_type) {
    case 'text':
      return answer.answer_text || '[no answer]';
    case 'scale':
      return `${answer.answer_numeric}`;
    case 'single_choice':
    case 'multiple_choice':
      return (answer.selected_options || []).join(', ');
    default:
      return '[unknown type]';
  }
}
```

**Structural validation rules (Layer 1 — FR37):**

1. Input is an array
2. Length between `appConfig.intake.questionsPerBatch.min` (3) and `appConfig.intake.questionsPerBatch.max` (5)
3. Each question has:
   - `question_text`: non-empty string
   - `question_type`: one of `text`, `scale`, `single_choice`, `multiple_choice`
   - `config`: null for `text`, object with `min` (number) and `max` (number) for `scale`, object with `options` (string[]) for `single_choice`/`multiple_choice`
   - `order_in_batch`: positive integer
4. `order_in_batch` values are sequential starting from 1

**Semantic validation rules (Layer 2 — FR38):**

1. Every `question_text` ends with `?`
2. No duplicate `question_text` (case-insensitive comparison)
3. Choice-type questions (`single_choice`, `multiple_choice`) have at least 2 distinct options
4. Batch contains at least 2 different `question_type` values

**Retry logic for validation:**

```
1. Call generateNextBatch() → get questions
2. Run validateBatch(questions)
3. If invalid:
   a. Log warning with validation errors
   b. Call generateNextBatch() again (retry once)
   c. Run validateBatch(retried questions)
   d. If still invalid: log error, return without next_batch
4. If valid: insert batch + questions, return inline
```

**Response format changes for `submitBatch()`:**

Success with next batch:
```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 2
  },
  "next_batch": {
    "batch_id": "uuid",
    "batch_number": 3,
    "is_complete": false,
    "questions": [...]
  }
}
```

Intake complete:
```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 5
  },
  "is_complete": true
}
```

Fallback (Transaction 2 failed):
```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 2
  },
  "message": "Answers submitted successfully"
}
```

### Architecture Compliance

**Module structure:** No new modules. Extend existing `IntakeModule` — add `IntakeQualityService` to providers, inject `AiService` into `IntakePromptService`.

**New service: `IntakeQualityService`**
- Owns structural and semantic validation logic
- No database access — pure validation functions
- No AI calls — validation is synchronous
- Injected into `IntakeService` for batch validation orchestration

**Service boundaries (STRICT):**
- `IntakeService` — orchestrates the flow: Transaction 1 (already built) → Transaction 2 (new: call IntakePromptService → validate via IntakeQualityService → store batch)
- `IntakePromptService` — owns prompt construction and AI call for question generation. Add `generateNextBatch()`. Inject `AiService` (global module, no import needed).
- `IntakeQualityService` — owns structural + semantic validation. Pure validation, no side effects.
- `GoalService` — no changes. Already provides `findOne()`.
- `AiService` — no changes. Already provides `generateJSON<T>()`.

**Endpoint changes:**
- `POST /api/goals/:goalId/intake/submit-batch` — response format extended (no URL change, no new params)
- `GET /api/goals/:goalId/intake/next-batch` — behavior change when latest batch is answered (generates AI batch instead of 400)
- No new endpoints

**Error handling:**
- Transaction 2 failures NEVER propagate to client as errors — they degrade gracefully to the Transaction 1 response
- AI generation errors: caught, logged, Transaction 1 result returned
- Validation failures: caught, logged as warnings, retry once, then degrade
- `getNextBatch` AI failure: throws `InternalServerErrorException` (Story 3.1 will add fallback)

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** `snake_case` field names. `next_batch` NOT `nextBatch`.

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed:

- `@nestjs/common` — `Injectable`, `Logger`, `InternalServerErrorException`
- `openai` — already used by AiService (do NOT import directly)
- `src/ai/ai.service.ts` — `AiService.generateJSON<T>()` — the only AI interface

**AiService usage pattern:**

```typescript
// In IntakePromptService — inject AiService
import { AiService } from '../ai/ai.service.js';

constructor(private readonly aiService: AiService) {}

async generateNextBatch(...): Promise<{ questions: GeneratedQuestion[], is_complete: boolean }> {
  const systemPrompt = this.buildSystemPrompt(batchNumber);
  const userPrompt = this.buildUserPrompt(goalDescription, priorBatches, batchNumber);

  return this.aiService.generateJSON<{ questions: GeneratedQuestion[], is_complete: boolean }>(
    systemPrompt,
    userPrompt,
  );
}
```

**Supabase join query pattern (for loading prior context):**

```typescript
const supabase = this.supabaseService.getAdminClient();

const { data: priorBatches, error } = await supabase
  .from('intake_batches')
  .select(`
    id,
    batch_number,
    intake_questions (
      id,
      question_text,
      question_type,
      config,
      order_in_batch,
      intake_answers (
        answer_text,
        answer_numeric,
        selected_options
      )
    )
  `)
  .eq('goal_id', goalId)
  .eq('is_answered', true)
  .order('batch_number');
```

**Supabase insert pattern for AI-generated batch (same as createFirstBatch):**

```typescript
const { data: newBatch, error: batchError } = await supabase
  .from('intake_batches')
  .insert({ goal_id: goalId, batch_number: nextBatchNumber })
  .select()
  .single();

if (batchError) throw new Error('Failed to create batch');

const questionRows = validatedQuestions.map((q, i) => ({
  goal_id: goalId,
  batch_id: newBatch.id,
  batch_number: nextBatchNumber,
  question_text: q.question_text,
  question_type: q.question_type,
  config: q.config,
  order_in_batch: i + 1,
}));

const { data: insertedQuestions, error: questionsError } = await supabase
  .from('intake_questions')
  .insert(questionRows)
  .select('id, question_text, question_type, config, order_in_batch');
```

### File Structure Requirements

**Files to CREATE:**

```
src/intake/
  intake-quality.service.ts       # Structural + semantic validation for AI-generated batches
  intake-quality.service.spec.ts  # Unit tests for validation logic
```

**Files to MODIFY:**

- `src/intake/intake-prompt.service.ts` — add `AiService` injection, `generateNextBatch()` method, `PriorBatchContext` interface, prompt builder methods
- `src/intake/intake.service.ts` — modify `submitBatch()` to add Transaction 2 (AI generation + validation + store), modify `getNextBatch()` to attempt AI generation when latest batch is answered
- `src/intake/intake.module.ts` — add `IntakeQualityService` to providers array
- `src/intake/intake-prompt.service.spec.ts` — add tests for `generateNextBatch()`
- `src/intake/intake.service.spec.ts` — add tests for Transaction 2 flow and getNextBatch AI generation

**Files NOT to touch:**

- `src/ai/ai.service.ts` — AiService is stable, use as-is
- `src/goal/*` — GoalModule is stable, only consume its exports
- `src/supabase/*` — Global module, use as-is
- `src/config/app.config.ts` — Read config values, don't modify
- `src/app.module.ts` — IntakeModule already registered
- `src/intake/intake.controller.ts` — No changes needed (same endpoints, service handles response format change)
- `src/intake/dto/submit-answers.dto.ts` — No changes needed

**No database migrations needed.** All tables (`intake_batches`, `intake_questions`) already exist with correct schemas. The `question_type` CHECK constraint already includes all 4 types.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakeQualityService tests (`intake-quality.service.spec.ts`) — NEW FILE:**

```
describe('IntakeQualityService')
  describe('validateStructural')
    ✓ passes a valid batch of 3-5 questions with correct fields
    ✓ fails when questions array has fewer than 3 items
    ✓ fails when questions array has more than 5 items
    ✓ fails when question_text is missing or empty
    ✓ fails when question_type is invalid
    ✓ fails when scale question config is missing min or max
    ✓ fails when choice question config is missing options array
    ✓ fails when order_in_batch values are not sequential
  describe('validateSemantic')
    ✓ passes a valid batch with varied types and proper formatting
    ✓ fails when a question doesn't end with ?
    ✓ fails when duplicate question_text exists (case-insensitive)
    ✓ fails when choice question has fewer than 2 distinct options
    ✓ fails when all questions are the same type (< 2 type variety)
  describe('validateBatch')
    ✓ returns valid for a fully valid batch
    ✓ returns structural error when structural validation fails
    ✓ returns semantic error when structural passes but semantic fails
```

**IntakePromptService tests — add to `intake-prompt.service.spec.ts`:**

```
describe('IntakePromptService')
  describe('generateNextBatch')
    ✓ calls AiService.generateJSON with system and user prompts
    ✓ includes goal description in user prompt
    ✓ includes prior Q&A context in user prompt
    ✓ includes batch number and remaining budget in user prompt
    ✓ returns is_complete: true when batchNumber >= maxBatches
    ✓ system prompt includes progressive tightening rules for batch >= 3
    ✓ propagates AiService errors (does not catch them)
```

**IntakeService tests — add to existing `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('submitBatch — Transaction 2')
    ✓ generates next batch inline when answers submitted successfully
    ✓ returns is_complete: true when AI signals completion
    ✓ retries AI generation once when validation fails
    ✓ returns Transaction 1 result (no next_batch) when AI fails after retry
    ✓ returns Transaction 1 result when AI throws an error
    ✓ Transaction 1 answers are always preserved regardless of Transaction 2 outcome
    ✓ loads prior batch context including Q&A pairs for prompt
    ✓ returns is_complete: true when submitting batch at maxBatches limit
  describe('getNextBatch — AI generation')
    ✓ generates AI batch when latest batch is answered
    ✓ returns is_complete response when AI signals completion
    ✓ throws InternalServerErrorException when AI generation fails
    ✓ validates AI-generated batch before storing
```

**Mock patterns (extend established patterns from Story 2.1/2.2 tests):**

- Mock `AiService.generateJSON` — return a valid question batch or throw error
- Mock `IntakeQualityService.validateBatch` — return `{ valid: true }` or `{ valid: false, errors: [...], layer: 'structural' }`
- Mock `IntakePromptService.generateNextBatch` — return `{ questions: [...], is_complete: false }` or `{ questions: [], is_complete: true }`
- Supabase join query mock: mock the foreign table join response (nested `intake_questions` with nested `intake_answers`)
- Reuse existing chainable Supabase mock pattern from Story 2.1/2.2

**Test count:** ~28 new tests across 3 files (16 quality service + 7 prompt service + 12 intake service).

### Previous Story Intelligence

**From Story 2.2 (current codebase state):**

- `submitBatch()` is lines 59-181 in `intake.service.ts`. It currently returns `{ submitted_batch, message }`. This return value on line 174-180 is the exact point to modify — wrap Transaction 2 around it.
- Transaction 1 ends at line 172 (batch marked as answered). Everything after that is the response construction. Insert Transaction 2 between line 172 and 174.
- The `goal` object is already fetched at line 69 — reuse `goal.description` for the AI prompt. Do NOT re-fetch it.
- `latestBatch.batch_number` tells you the just-submitted batch number. The next batch is `latestBatch.batch_number + 1`.
- Supabase chainable mock pattern is well-established in `intake.service.spec.ts`. For the join query (prior context), you'll need a new mock path that returns nested data.

**From Story 2.1:**

- `createFirstBatch()` (lines 307-351) shows the pattern for inserting a new batch + questions. **Reuse the same pattern** for AI-generated batches.
- `getNextBatch()` has PGRST116 handling at line 39 — "no rows found" on `.single()`. Not an error.
- Line 54 is the `throw BadRequestException` that needs to be replaced with AI generation.

**Debug issues from previous stories to AVOID:**
- `mockReturnValueOnce` timing: for tests where `submitBatch` makes multiple Supabase calls (batch query, questions query, answer insert, batch update, THEN prior context query, new batch insert, new questions insert), carefully order mocks.
- Each test should mock the exact call sequence. Consider extracting a helper to set up the "Transaction 1 succeeds" mock baseline, then customize Transaction 2 mocks per test.
- The Supabase join query (`.select('..., intake_questions(...)')`) returns data with nested structure — mock the response shape accordingly.

### Project Structure Notes

- New `src/intake/intake-quality.service.ts` aligns with architecture doc: `IntakeQualityService` is listed as a planned service in the `src/intake/` folder
- IntakeQualityService is a provider in IntakeModule, not exported (only used internally by IntakeService)
- No barrel exports — import directly from the file
- AiService injection into IntakePromptService works because AiModule is `@Global()` — no module import needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3 — FR11, FR12, FR14, FR17, FR37, FR38]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Submit Batch — Transaction 1 + Transaction 2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakePromptService owns prompt templates, IntakeQualityService owns validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#AI Call Pattern — AiService.generateJSON, 30s timeout, retry once]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Error Handling, Supabase Client]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — AI call failures: catch, retry → fallback]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11 — Adaptive follow-up batches]
- [Source: _bmad-output/planning-artifacts/prd.md#FR14 — Submit answers + inline next batch]
- [Source: _bmad-output/planning-artifacts/prd.md#FR17 — Progressive tightening]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28 — Answers preserved on failure]
- [Source: _bmad-output/planning-artifacts/prd.md#FR37 — Structural validation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR38 — Semantic validation]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR2 — AI batches < 10s]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5 — Answer storage < 500ms independent of batch generation]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11 — Answers never lost — two-transaction split]
- [Source: _bmad-output/implementation-artifacts/2-2-submit-answers-with-validation.md — Transaction 1 pattern, submitBatch flow, mock patterns]
- [Source: _bmad-output/implementation-artifacts/2-1-serve-hardcoded-first-batch.md — createFirstBatch pattern, Supabase insert pattern]
- [Source: src/intake/intake.service.ts — Current implementation, lines 59-181 for submitBatch, lines 22-57 for getNextBatch]
- [Source: src/intake/intake-prompt.service.ts — UniversalQuestion interface, getUniversalBatch pattern]
- [Source: src/ai/ai.service.ts — generateJSON<T>() method, 30s AbortController timeout, regex JSON extraction]
- [Source: src/config/app.config.ts — intake.maxBatches (7), intake.questionsPerBatch (min: 3, max: 5), intake.targetBatches (5)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All tests passed on first run.

### Completion Notes List

- Implemented `GeneratedQuestion` and `PriorBatchContext` interfaces in IntakePromptService
- Added `generateNextBatch()` method with system/user prompt builders, progressive tightening rules, and maxBatches guard
- Created `IntakeQualityService` with structural validation (Layer 1: array check, question count 3-5, required fields, config shape, sequential order) and semantic validation (Layer 2: question mark, no duplicates, 2+ options, 2+ type variety)
- Extended `submitBatch()` with Transaction 2: loads prior batch context via Supabase join query, calls AI generation, validates with retry, stores valid batch, returns inline. Transaction 2 failures degrade gracefully to Transaction 1 result.
- Modified `getNextBatch()` to attempt AI generation when latest batch is answered (instead of throwing 400). Returns `is_complete` response when AI signals completion, throws `InternalServerErrorException` on generation failure.
- Extracted shared logic into private helpers: `loadPriorBatchContext()`, `formatAnswer()`, `storeGeneratedBatch()`, `generateAndStoreNextBatch()`
- Registered `IntakeQualityService` in IntakeModule providers and injected into IntakeService
- Injected `AiService` into IntakePromptService (global module, no import needed)
- All 103 tests pass (16 quality service + 15 prompt service + 33 intake service + existing tests)
- TypeScript compiles cleanly, 0 ESLint errors

### Change Log

- 2026-02-08: Implemented Story 2.3 — AI-generated next batch with structural + semantic quality gates, retry logic, graceful degradation, and inline response format

### File List

**New files:**
- `src/intake/intake-quality.service.ts` — Structural + semantic validation for AI-generated batches
- `src/intake/intake-quality.service.spec.ts` — 16 unit tests for validation logic

**Modified files:**
- `src/intake/intake-prompt.service.ts` — Added `GeneratedQuestion`, `PriorBatchContext` interfaces, `generateNextBatch()` method with prompt builders, `AiService` injection
- `src/intake/intake-prompt.service.spec.ts` — Added 7 tests for `generateNextBatch()`; updated module setup with AiService mock
- `src/intake/intake.service.ts` — Extended `submitBatch()` with Transaction 2 (AI generation + validation + store), modified `getNextBatch()` for AI generation when batch answered, added helper methods
- `src/intake/intake.service.spec.ts` — Added 12 tests for Transaction 2 and getNextBatch AI generation; updated module setup with IntakeQualityService mock
- `src/intake/intake.module.ts` — Added IntakeQualityService to providers
