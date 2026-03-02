# Story 2.2: Submit Answers with Validation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to submit my answers with full validation,
So that my responses are safely stored and any input errors are caught immediately.

## Acceptance Criteria

1. **Given** an authenticated user with an unanswered batch **When** `POST /api/goals/:goalId/intake/submit-batch` is called with valid answers matching all questions in the current batch **Then** answers are persisted in the `intake_answers` table (FR28, NFR5, NFR11) **And** the batch is marked as `is_answered = true` in `intake_batches` **And** the system returns `{ submitted_batch: { batch_id, batch_number }, message: "Answers submitted successfully" }` with status 200
2. **Given** an authenticated user submitting answers **When** the system validates each answer **Then** it verifies each `question_id` belongs to the current unanswered batch for the user's goal (FR18) **And** rejects answers referencing questions from other batches, goals, or non-existent questions with 400 Bad Request
3. **Given** a `text` question **When** an answer is submitted **Then** `answer_text` must be a non-empty string **And** `answer_numeric` and `selected_options` must be null or absent (FR19)
4. **Given** a `scale` question with config `{ min, max }` **When** an answer is submitted **Then** `answer_numeric` must be an integer within `[min, max]` range **And** `answer_text` and `selected_options` must be null or absent (FR19)
5. **Given** a `single_choice` question with config `{ options: [...] }` **When** an answer is submitted **Then** `selected_options` must be an array containing exactly one value that exists in the question's options **And** `answer_text` and `answer_numeric` must be null or absent (FR19)
6. **Given** a `multiple_choice` question with config `{ options: [...] }` **When** an answer is submitted **Then** `selected_options` must be a non-empty array where every value exists in the question's options **And** `answer_text` and `answer_numeric` must be null or absent (FR19)
7. **Given** a user submitting answers for a batch that was already submitted (batch `is_answered = true`) **When** `POST /api/goals/:goalId/intake/submit-batch` is called **Then** the system returns 409 Conflict (FR20)
8. **Given** a user submitting fewer or more answers than questions in the batch **When** `POST /api/goals/:goalId/intake/submit-batch` is called **Then** the system returns 400 Bad Request indicating answer count mismatch
9. **Given** a goal that does not exist or does not belong to the user **When** `POST /api/goals/:goalId/intake/submit-batch` is called **Then** the system returns 404 Not Found
10. **Given** a goal not in `intake_in_progress` status **When** `POST /api/goals/:goalId/intake/submit-batch` is called **Then** the system returns 400 Bad Request with a message indicating intake is not active
11. **Given** an unauthenticated request **When** `POST /api/goals/:goalId/intake/submit-batch` is called without a valid Bearer token **Then** a 401 Unauthorized response is returned
12. **Given** a Postgres unique constraint violation on `intake_answers.question_id` (duplicate insert) **When** the answer insert encounters error code 23505 **Then** the system returns 409 Conflict (FR20)

## Tasks / Subtasks

- [x] Task 1: Create `SubmitAnswersDto` with validation (AC: #2-#8)
  - [x] 1.1 Create `src/intake/dto/submit-answers.dto.ts` with `SubmitAnswersDto` containing `answers` array
  - [x] 1.2 Define `AnswerDto` with `question_id` (UUID string, required), `answer_text` (string, optional), `answer_numeric` (number, optional), `selected_options` (string array, optional)
  - [x] 1.3 Apply class-validator decorators: `@IsArray()`, `@ValidateNested({ each: true })`, `@ArrayMinSize(1)`, `@IsUUID()`, `@IsString()`, `@IsNumber()`, `@IsArray()`, `@IsOptional()` as appropriate
  - [x] 1.4 Use `@Type(() => AnswerDto)` from class-transformer for nested validation
- [x] Task 2: Implement `submitBatch()` in IntakeService (AC: #1-#10, #12)
  - [x] 2.1 Add `submitBatch(userId, goalId, answers)` method
  - [x] 2.2 Validate goal ownership via `goalService.findOne(userId, goalId)` — 404 if not found
  - [x] 2.3 Validate goal status is `intake_in_progress` — 400 if not
  - [x] 2.4 Query latest batch for goal: `intake_batches` WHERE `goal_id` ORDER BY `batch_number DESC` LIMIT 1
  - [x] 2.5 If no batch found or batch `is_answered = true` — throw 409 Conflict (no unanswered batch)
  - [x] 2.6 Verify answer count matches question count for the batch — 400 if mismatch
  - [x] 2.7 Load batch questions: `intake_questions` WHERE `batch_id = latestBatch.id`
  - [x] 2.8 Validate every `question_id` in answers exists in the batch's questions (ownership check, FR18) — 400 if any mismatch
  - [x] 2.9 Cross-validate each answer against its question type (FR19): text → non-empty `answer_text`; scale → `answer_numeric` in range; single_choice → `selected_options` with exactly 1 valid option; multiple_choice → `selected_options` non-empty, all valid options
  - [x] 2.10 Insert all answers into `intake_answers` table — catch Postgres 23505 for duplicate → 409
  - [x] 2.11 Update `intake_batches` SET `is_answered = true` WHERE `id = latestBatch.id`
  - [x] 2.12 Return `{ submitted_batch: { batch_id, batch_number }, message: "Answers submitted successfully" }`
- [x] Task 3: Add `POST submit-batch` endpoint to IntakeController (AC: #1, #11)
  - [x] 3.1 Add `@Post('submit-batch')` method accepting `@UserId()`, `@Param('goalId')`, `@Body() dto: SubmitAnswersDto`
  - [x] 3.2 Call `intakeService.submitBatch(userId, goalId, dto.answers)` and return result
- [x] Task 4: Unit tests (AC: #1-#12)
  - [x] 4.1 IntakeService `submitBatch`: successfully persists answers and marks batch as answered
  - [x] 4.2 IntakeService `submitBatch`: throws NotFoundException when goal not found
  - [x] 4.3 IntakeService `submitBatch`: throws BadRequestException when goal status is not `intake_in_progress`
  - [x] 4.4 IntakeService `submitBatch`: throws ConflictException when batch is already answered
  - [x] 4.5 IntakeService `submitBatch`: throws ConflictException when no unanswered batch exists
  - [x] 4.6 IntakeService `submitBatch`: throws BadRequestException on answer count mismatch
  - [x] 4.7 IntakeService `submitBatch`: throws BadRequestException when question_id not in batch (ownership)
  - [x] 4.8 IntakeService `submitBatch`: throws BadRequestException for text question with missing answer_text
  - [x] 4.9 IntakeService `submitBatch`: throws BadRequestException for scale question with out-of-range value
  - [x] 4.10 IntakeService `submitBatch`: throws BadRequestException for single_choice with invalid option
  - [x] 4.11 IntakeService `submitBatch`: throws BadRequestException for single_choice with multiple options
  - [x] 4.12 IntakeService `submitBatch`: throws BadRequestException for multiple_choice with invalid option
  - [x] 4.13 IntakeService `submitBatch`: catches Postgres 23505 and throws ConflictException
  - [x] 4.14 IntakeController `POST submit-batch`: delegates to service with correct params
  - [x] 4.15 SubmitAnswersDto: validates correctly with class-validator (optional — can be covered by e2e)

## Dev Notes

### Developer Context

**What this story builds:** The `POST /api/goals/:goalId/intake/submit-batch` endpoint — the answer submission path with comprehensive validation. This is **Transaction 1 only** — store answers and mark batch as answered. Story 2.3 will add Transaction 2 (AI-generated next batch returned inline). For now, submit returns a confirmation message, not a next batch.

**Why Transaction 1 only:** The architecture specifies a two-transaction split (NFR5, NFR11). Transaction 1 (answer persistence) must succeed independently of Transaction 2 (next-batch generation). This story implements Transaction 1 in isolation. Story 2.3 adds Transaction 2 and the inline response.

**Existing code you MUST understand before starting:**
- `src/intake/intake.service.ts` — has `getNextBatch()` with pattern for goal validation, batch querying. **Extend this service** with `submitBatch()`.
- `src/intake/intake.controller.ts` — has `GET next-batch`. **Add `POST submit-batch`** to same controller.
- `src/intake/intake-prompt.service.ts` — has `getUniversalBatch()`. Not directly needed for this story but understand the question structure (`question_text`, `question_type`, `config`, `order_in_batch`).
- `src/goal/goal.service.ts` — `findOne(userId, goalId)` validates ownership, throws 404. **Reuse exactly as Story 2.1 does.**
- `src/config/app.config.ts` — reference `appConfig.intake.questionsPerBatch` if needed for future validation bounds.

**Existing database tables (ALL already exist — NO new migrations needed):**
- `intake_batches` — has `is_answered` boolean (DEFAULT false). This story updates it to `true` after answer persistence.
- `intake_questions` — has `id`, `goal_id`, `batch_id`, `batch_number`, `question_text`, `question_type`, `config`, `order_in_batch`. Questions are loaded to validate answers against.
- `intake_answers` — has `id`, `question_id` (UNIQUE), `answer_text`, `answer_numeric`, `selected_options` (JSONB), `created_at`. The UNIQUE constraint on `question_id` means one answer per question — duplicate inserts will get Postgres 23505.

**What NOT to build in this story:**
- No AI-generated next batch (Story 2.3)
- No inline next-batch in response (Story 2.3)
- No profile generation (Story 2.4)
- No embedding events (Story 2.5)
- No quality scoring events (Story 2.6)
- No fallback batch logic (Story 3.1)
- The response is a simple confirmation — `{ submitted_batch, message }` — NOT the `{ submitted_batch, next_batch }` response from Story 2.3

### Technical Requirements

**Answer validation strategy — 3 layers (FR18, FR19, FR20):**

1. **DTO validation (controller boundary):** class-validator ensures `answers` is a non-empty array of objects with valid UUIDs for `question_id` and correct basic types for answer fields. This catches malformed requests.

2. **Business validation (service layer):**
   - **Ownership check (FR18):** Load all questions for the current unanswered batch. Verify every `question_id` in the submitted answers maps to a question in that batch. Verify count matches.
   - **Type cross-validation (FR19):** For each answer, check answer values against the question's `question_type` and `config`:
     - `text` → `answer_text` is non-empty string, no `answer_numeric`/`selected_options`
     - `scale` → `answer_numeric` is integer in `[config.min, config.max]`, no `answer_text`/`selected_options`
     - `single_choice` → `selected_options` is array of length 1, value in `config.options`, no `answer_text`/`answer_numeric`
     - `multiple_choice` → `selected_options` is non-empty array, all values in `config.options`, no `answer_text`/`answer_numeric`

3. **Database constraint (last line of defense):**
   - UNIQUE on `intake_answers.question_id` prevents duplicate answers
   - FK on `question_id → intake_questions.id` prevents orphan answers
   - Catch Postgres 23505 → throw `ConflictException`

**`SubmitAnswersDto` structure:**

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class AnswerDto {
  @IsUUID()
  question_id: string;

  @IsOptional()
  @IsString()
  answer_text?: string;

  @IsOptional()
  @IsNumber()
  answer_numeric?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selected_options?: string[];
}

export class SubmitAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
```

**Service method flow for `submitBatch(userId, goalId, answers)`:**

1. `goalService.findOne(userId, goalId)` — 404 if not found
2. Check `goal.status === 'intake_in_progress'` — 400 if not
3. Query latest batch: `intake_batches` WHERE `goal_id` ORDER BY `batch_number DESC` LIMIT 1
4. If no batch or `is_answered = true` → 409 Conflict ("No unanswered batch")
5. Load batch questions: `intake_questions` WHERE `batch_id = batch.id`
6. Validate answer count === question count → 400 if mismatch
7. Build question lookup map: `Map<question_id, question>`
8. For each answer:
   - Verify `question_id` exists in map → 400 if not (FR18)
   - Cross-validate answer values against `question.question_type` and `question.config` → 400 with details if invalid (FR19)
9. Insert answers into `intake_answers`:
   ```typescript
   const answerRows = answers.map(a => ({
     question_id: a.question_id,
     answer_text: a.answer_text ?? null,
     answer_numeric: a.answer_numeric ?? null,
     selected_options: a.selected_options ?? null,
   }));
   ```
10. Catch Postgres 23505 on insert → 409 Conflict (FR20)
11. Update `intake_batches` SET `is_answered = true`
12. Return confirmation response

**Response format for `POST /api/goals/:goalId/intake/submit-batch`:**

```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 1
  },
  "message": "Answers submitted successfully"
}
```

Note: Story 2.3 will extend this response to include `next_batch` or `is_complete` + `profile_id`. For now, it's a simple confirmation.

### Architecture Compliance

**Module structure:** No new modules. Extend existing `IntakeModule` — add DTO import, extend controller and service.

**Service boundaries (STRICT):**
- `IntakeService` — owns `intake_batches`, `intake_questions`, `intake_answers` tables. Answer submission logic lives here.
- `GoalService` — owns `goals` table. IntakeService calls `GoalService.findOne()` for validation only.
- IntakePromptService — not needed for this story.

**Endpoint path:** `POST /api/goals/:goalId/intake/submit-batch`
- Controller decorator already: `@Controller('goals/:goalId/intake')`
- Method decorator: `@Post('submit-batch')`
- Route param: `:goalId` in camelCase

**Error handling — NestJS HTTP exceptions exclusively:**
- `NotFoundException` — goal not found (delegated to GoalService.findOne)
- `BadRequestException` — goal status invalid, answer count mismatch, ownership violation, type cross-validation failure
- `ConflictException` — batch already answered, Postgres 23505 duplicate
- `InternalServerErrorException` — Supabase insert/update errors
- Never `console.log` — use `Logger`

**Supabase client usage:**
- Always via `this.supabaseService.getAdminClient()`
- Check `.error` on every Supabase response
- Catch Postgres error code `23505` specifically for unique violation → `ConflictException`

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** `snake_case` field names. No camelCase transformation.

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed:

- `@nestjs/common` — `Controller`, `Post`, `Body`, `Param`, `UseGuards`, `Injectable`, `BadRequestException`, `NotFoundException`, `ConflictException`, `InternalServerErrorException`, `Logger`
- `@supabase/supabase-js` — `.from()`, `.select()`, `.insert()`, `.update()`, `.eq()`, `.order()`, `.limit()`, `.single()` query builder methods
- `class-validator` — `@IsArray()`, `@ArrayMinSize()`, `@ValidateNested()`, `@IsUUID()`, `@IsString()`, `@IsNumber()`, `@IsOptional()`, `@IsString({ each: true })`
- `class-transformer` — `@Type(() => AnswerDto)` for nested DTO validation

**NestJS patterns to follow exactly:**

Controller addition:
```typescript
import { Body, Post } from '@nestjs/common';
import { SubmitAnswersDto } from './dto/submit-answers.dto.js';

// Add to existing IntakeController class:
@Post('submit-batch')
async submitBatch(
  @UserId() userId: string,
  @Param('goalId') goalId: string,
  @Body() dto: SubmitAnswersDto,
) {
  return this.intakeService.submitBatch(userId, goalId, dto.answers);
}
```

**Supabase insert pattern for answers:**
```typescript
const supabase = this.supabaseService.getAdminClient();

const answerRows = validatedAnswers.map((a) => ({
  question_id: a.question_id,
  answer_text: a.answer_text ?? null,
  answer_numeric: a.answer_numeric ?? null,
  selected_options: a.selected_options ?? null,
}));

const { error: insertError } = await supabase
  .from('intake_answers')
  .insert(answerRows);

if (insertError) {
  if (insertError.code === '23505') {
    throw new ConflictException('Answers already submitted for this batch');
  }
  this.logger.error(`Failed to insert answers: ${insertError.message}`);
  throw new InternalServerErrorException('Failed to save answers');
}
```

**Supabase update pattern for marking batch as answered:**
```typescript
const { error: updateError } = await supabase
  .from('intake_batches')
  .update({ is_answered: true })
  .eq('id', batchId);

if (updateError) {
  this.logger.error(`Failed to mark batch as answered: ${updateError.message}`);
  throw new InternalServerErrorException('Failed to update batch status');
}
```

### File Structure Requirements

**Files to CREATE:**

```
src/intake/
  dto/
    submit-answers.dto.ts    # SubmitAnswersDto + AnswerDto with class-validator decorators
```

**Files to MODIFY:**

- `src/intake/intake.controller.ts` — add `POST submit-batch` endpoint with `@Body() dto: SubmitAnswersDto`
- `src/intake/intake.service.ts` — add `submitBatch()` method with full validation flow
- `src/intake/intake.service.spec.ts` — add ~13 new test cases for submitBatch
- `src/intake/intake.controller.spec.ts` — add 1 new test case for POST submit-batch delegation

**Files NOT to touch:**

- `src/intake/intake.module.ts` — no changes needed (DTO doesn't need module registration)
- `src/intake/intake-prompt.service.ts` — not used in this story
- `src/goal/*` — GoalModule is stable, only consume its exports
- `src/supabase/*` — Global module, use as-is
- `src/ai/*` — Not needed for this story (no AI calls)
- `src/config/*` — Read `appConfig` if needed, don't modify
- `src/app.module.ts` — IntakeModule already registered

**No database migrations needed.** All tables (`intake_batches`, `intake_questions`, `intake_answers`) already exist with correct schemas. The `intake_answers.question_id` UNIQUE constraint is already in place for duplicate detection.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakeService tests — add to existing `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('submitBatch')
    ✓ successfully persists answers and marks batch as answered
    ✓ returns confirmation with batch_id and batch_number
    ✓ throws NotFoundException when goal not found (delegates to GoalService.findOne)
    ✓ throws BadRequestException when goal status is not intake_in_progress
    ✓ throws ConflictException when no unanswered batch exists (no batches)
    ✓ throws ConflictException when batch is already answered (is_answered = true)
    ✓ throws BadRequestException when answer count does not match question count
    ✓ throws BadRequestException when question_id is not in the batch (ownership)
    ✓ throws BadRequestException for text question with empty/missing answer_text
    ✓ throws BadRequestException for scale question with out-of-range answer_numeric
    ✓ throws BadRequestException for single_choice with invalid option value
    ✓ throws BadRequestException for single_choice with more than one option
    ✓ throws BadRequestException for multiple_choice with invalid option value
    ✓ catches Postgres 23505 and throws ConflictException
    ✓ throws InternalServerErrorException on Supabase insert error
```

**IntakeController tests — add to existing `intake.controller.spec.ts`:**

```
describe('IntakeController')
  describe('POST submit-batch')
    ✓ calls intakeService.submitBatch with userId, goalId, and answers
```

**Mock patterns (follow established patterns from Story 2.1 tests):**

- Mock `GoalService.findOne` — return goal object or throw NotFoundException
- Mock `SupabaseService.getAdminClient` with chainable mock
- For submitBatch: mock the batch query (returns unanswered batch), questions query (returns question array), answers insert (success/error), batch update (success/error)
- Postgres 23505 mock: `{ error: { code: '23505', message: 'unique violation' } }`

**Test count:** ~16 new tests across 2 files.

### Previous Story Intelligence

**From Story 2.1 (code review status, patterns established):**

- `IntakeService.getNextBatch()` pattern: goal validation → batch query → branch logic. **Follow the same pattern** for `submitBatch()`.
- Supabase error handling: check `.error` on response, log with `this.logger.error()`, throw NestJS exception. `PGRST116` means "no rows" on `.single()` — treat as expected case, not error.
- Batch query pattern: `FROM intake_batches WHERE goal_id ORDER BY batch_number DESC LIMIT 1 .single()` — reuse exactly.
- Question query pattern: `FROM intake_questions WHERE batch_id` — reuse for loading batch questions.
- Test mock pattern: chainable Supabase mock with `from → select/insert/update → eq → order → limit → single`. Follow the same mock structure.
- Controller test pattern: mock the service, verify delegation. Simple and focused.
- Logger: already instantiated in IntakeService as `private readonly logger = new Logger(IntakeService.name)` — reuse.

**Debug issues from previous stories to AVOID:**
- `mockReturnValueOnce` timing issues: for multi-call test scenarios, use careful mock ordering or `mockReturnValue` for stable defaults
- `PGRST116` is not an error — it's "no rows found" on `.single()`. Handle it explicitly in the no-batch case.
- Prettier reformats multi-line method signatures — don't fight it

### Project Structure Notes

- New `src/intake/dto/` subfolder aligns with architecture doc pattern (DTOs in `dto/` subfolder within each module)
- `submit-answers.dto.ts` follows naming convention: `kebab-case.ts`
- No barrel exports — import directly from the file
- IntakeModule doesn't need modification — DTOs are auto-discovered by the ValidationPipe through controller method signatures

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2 — FR18, FR19, FR20, FR28]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — POST /api/goals/:goalId/intake/submit-batch]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — IntakeService owns intake_answers]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Postgres 23505 → ConflictException]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Pattern — DTO → business → database constraints]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Submit Batch — Transaction 1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Error Handling, Supabase Client]
- [Source: _bmad-output/planning-artifacts/prd.md#FR18 — Answer ownership validation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR19 — Answer-type cross-validation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 — Duplicate submission 409]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28 — Answers preserved on failure]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR5 — Answer storage < 500ms]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11 — Answers never lost]
- [Source: _bmad-output/implementation-artifacts/2-1-serve-hardcoded-first-batch.md — Batch query pattern, mock pattern, service flow]
- [Source: Supabase DB schema — intake_answers.question_id UNIQUE constraint for duplicate detection]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. Clean implementation following established patterns from Story 2.1.

### Completion Notes List

- Created `SubmitAnswersDto` and `AnswerDto` with full class-validator decorators for DTO-level validation
- Implemented `submitBatch()` in IntakeService with 3-layer validation: DTO boundary, business logic (ownership + type cross-validation), and database constraint handling (23505)
- Added `private validateAnswer()` helper with switch-case for text/scale/single_choice/multiple_choice type validation against question config
- Added `POST submit-batch` endpoint to IntakeController, delegating to service
- 15 new unit tests for IntakeService.submitBatch covering all ACs: success path, goal not found (404), wrong status (400), batch already answered (409), no batch (409), count mismatch (400), ownership violation (400), text/scale/single_choice/multiple_choice type validation (400), Postgres 23505 (409), generic insert error (500)
- 1 new controller test for POST submit-batch delegation
- Full test suite: 70/70 pass, zero regressions
- No new dependencies added. No database migrations needed.

### File List

**Created:**
- `src/intake/dto/submit-answers.dto.ts`

**Modified:**
- `src/intake/intake.service.ts`
- `src/intake/intake.controller.ts`
- `src/intake/intake.service.spec.ts`
- `src/intake/intake.controller.spec.ts`

## Change Log

- 2026-02-08: Implemented Story 2.2 — POST /api/goals/:goalId/intake/submit-batch endpoint with comprehensive answer validation (DTO, business logic, DB constraint layers). Added 16 new tests across service and controller specs.
