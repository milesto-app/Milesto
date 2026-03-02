# Story 3.1: AI Fallback Batches

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the intake to continue smoothly even when AI question generation fails,
So that I'm never stuck waiting or blocked from completing my intake.

## Acceptance Criteria

1. **Given** an AI call for next-batch generation fails **When** the system retries once and it fails again **Then** a pre-written fallback batch of 2-3 open-ended text questions is served instead (FR21) **And** the fallback batch counts toward the 7-batch hard cap (FR22) **And** the user receives the batch seamlessly — no error is visible **And** the batch is stored with `is_fallback = true` in `intake_batches`

2. **Given** consecutive AI failures requiring multiple fallback batches **When** the next fallback is served **Then** different questions from the fallback pool are selected (FR23) **And** the system queries existing fallback batches for this goal to determine which pool index was used previously

3. **Given** a fallback batch is served **When** the user submits answers **Then** the normal flow resumes — next batch can be AI-generated or another fallback **And** the fallback batch's answers are included in the prior context for future AI generation prompts

4. **Given** the `submitBatch()` Transaction 2 fails (AI generation throws or validation fails after retry) **When** the failure is caught **Then** the system serves a fallback batch inline instead of returning `{ submitted_batch, message }` **And** the response format is `{ submitted_batch, next_batch }` with the fallback batch (same as successful AI generation)

5. **Given** the `getNextBatch()` path where `generateAndStoreNextBatch()` fails **When** AI generation throws or validation fails after retry **Then** the system serves a fallback batch instead of throwing `InternalServerErrorException` **And** the response is a normal batch response with fallback questions

6. **Given** a fallback batch would exceed the 7-batch hard cap **When** the system determines the next batch number >= `appConfig.intake.maxBatches` **Then** intake completion is triggered instead of serving a fallback **And** profile generation proceeds as normal (FR22)

## Tasks / Subtasks

- [x] Task 1: Add fallback question pool and `getFallbackBatch()` to IntakePromptService (AC: #1, #2, #3)
  - [x] 1.1 Define `FALLBACK_POOLS` constant: array of 3+ distinct fallback batches, each containing 2-3 open-ended text questions. Questions are domain-agnostic, designed to gather useful coaching context regardless of goal type.
  - [x] 1.2 Add `getFallbackBatch(usedFallbackIndexes: number[]): GeneratedQuestion[]` method that selects the first unused pool index, cycling through all pools. If all pools exhausted, restart from the beginning.
  - [x] 1.3 Each fallback question uses `question_type: 'text'`, `config: null`, and sequential `order_in_batch` values.

- [x] Task 2: Modify `storeGeneratedBatch()` in IntakeService to support `is_fallback` flag (AC: #1)
  - [x] 2.1 Add optional `isFallback` parameter (default `false`) to `storeGeneratedBatch()` method signature
  - [x] 2.2 Pass `is_fallback: isFallback` in the `intake_batches` insert call

- [x] Task 3: Add `getUsedFallbackIndexes()` private method to IntakeService (AC: #2)
  - [x] 3.1 Query `intake_batches` for this goal where `is_fallback = true`, ordered by `batch_number`
  - [x] 3.2 For each fallback batch, load its questions and determine which fallback pool index was used by comparing question texts against the `FALLBACK_POOLS` constant
  - [x] 3.3 Return array of used fallback pool indexes

- [x] Task 4: Add `serveFallbackBatch()` private method to IntakeService (AC: #1, #2, #4, #5, #6)
  - [x] 4.1 Signature: `serveFallbackBatch(userId: string, goalId: string, goalDescription: string, batchNumber: number): Promise<batch_response>`
  - [x] 4.2 Check if `batchNumber >= appConfig.intake.maxBatches` — if so, trigger intake completion (profile generation) instead of serving fallback
  - [x] 4.3 Call `getUsedFallbackIndexes(goalId)` to determine which pools have been used
  - [x] 4.4 Call `intakePromptService.getFallbackBatch(usedIndexes)` to get fallback questions
  - [x] 4.5 Call `storeGeneratedBatch(goalId, batchNumber, fallbackQuestions, true)` to store with `is_fallback = true`
  - [x] 4.6 Emit `batch.served` event for the fallback batch
  - [x] 4.7 Return the stored batch response

- [x] Task 5: Modify `generateAndStoreNextBatch()` to use fallback on failure (AC: #5)
  - [x] 5.1 Replace `throw new InternalServerErrorException('Failed to generate next batch')` at line 392 with a call to `serveFallbackBatch()`
  - [x] 5.2 Wrap the entire AI generation + validation logic in try/catch — on any error, call `serveFallbackBatch()`

- [x] Task 6: Modify `submitBatch()` Transaction 2 to use fallback on failure (AC: #4)
  - [x] 6.1 Replace the `return { submitted_batch, message }` at line 288-291 (validation failure after retry) with a call to `serveFallbackBatch()` and return `{ submitted_batch, next_batch: fallbackBatch }`
  - [x] 6.2 Replace the `return { submitted_batch, message }` at lines 320-323 (outer catch) with a call to `serveFallbackBatch()` and return `{ submitted_batch, next_batch: fallbackBatch }`
  - [x] 6.3 Add secondary try/catch around fallback — if fallback itself fails, return `{ submitted_batch, message }` as last resort

- [x] Task 7: Unit tests (AC: #1-#6)
  - [x] 7.1 IntakePromptService `getFallbackBatch`: returns first pool when no indexes used
  - [x] 7.2 IntakePromptService `getFallbackBatch`: returns second pool when first index is used
  - [x] 7.3 IntakePromptService `getFallbackBatch`: wraps around when all pools exhausted
  - [x] 7.4 IntakePromptService `getFallbackBatch`: returns 2-3 text questions with sequential order_in_batch
  - [x] 7.5 IntakeService `generateAndStoreNextBatch`: serves fallback when AI generation throws
  - [x] 7.6 IntakeService `generateAndStoreNextBatch`: serves fallback when validation fails after retry
  - [x] 7.7 IntakeService `generateAndStoreNextBatch`: triggers profile generation instead of fallback when at max batches
  - [x] 7.8 IntakeService `submitBatch`: serves fallback inline when validation fails after retry
  - [x] 7.9 IntakeService `submitBatch`: serves fallback inline when Transaction 2 throws
  - [x] 7.10 IntakeService `submitBatch`: returns message fallback when fallback itself fails
  - [x] 7.11 IntakeService `serveFallbackBatch`: stores batch with `is_fallback: true`
  - [x] 7.12 IntakeService `serveFallbackBatch`: selects different fallback pool for consecutive failures
  - [x] 7.13 IntakeService `serveFallbackBatch`: emits `batch.served` event
  - [x] 7.14 IntakeService `storeGeneratedBatch`: passes `is_fallback` to insert when provided

## Dev Notes

### Developer Context

**What this story builds:** The safety net for the AI-powered intake system. When AI question generation fails — whether from timeouts, invalid responses, or service outages — the system seamlessly serves pre-written fallback batches so the user never gets stuck. This is a critical resilience feature that ensures 100% intake completion rate regardless of AI reliability.

**This story modifies the existing failure paths established in Story 2.3.** Currently, there are two failure modes:
1. `generateAndStoreNextBatch()` (called from `getNextBatch()`) — throws `InternalServerErrorException` on line 392 after retry failure
2. `submitBatch()` Transaction 2 — returns `{ submitted_batch, message: 'Answers submitted successfully' }` without a next batch on lines 288-291 (validation failure) and lines 320-323 (outer catch)

Both paths need to be replaced with fallback batch serving.

**The `intake_batches.is_fallback` column already exists** (boolean, default false). It was created in Story 2.1's migration. The current `storeGeneratedBatch()` method doesn't set it — it defaults to false. This story adds the ability to set it to `true` for fallback batches.

**Fallback batches are intentionally simple.** They are 2-3 open-ended text questions designed to gather useful context regardless of the goal domain. They don't need AI generation, structural/semantic validation, or quality scoring (though the `batch.served` event is still emitted so quality scoring will run async).

**Key design decisions:**
- **Fallback pool lives in `IntakePromptService`** — same pattern as `UNIVERSAL_BATCH_1`, keeping all hardcoded question content in one place
- **Pool selection tracks used indexes** — queries existing `is_fallback = true` batches for the goal, matches their questions against the pool to determine which index was used, then selects the next unused index
- **Fallback at batch cap triggers completion** — if serving a fallback would exceed the 7-batch cap, intake completion (profile generation) is triggered instead. Fallback batches count toward the cap (FR22).
- **`serveFallbackBatch()` is a single private method** called from both failure points, preventing code duplication

**Existing code you MUST understand before starting:**

- `src/intake/intake.service.ts` — 1073 lines. Two failure points to modify:
  1. `generateAndStoreNextBatch()` line 392: `throw new InternalServerErrorException(...)` — replace with fallback
  2. `submitBatch()` lines 288-291 and 320-323: `return { submitted_batch, message }` — replace with fallback

- `src/intake/intake-prompt.service.ts` — 241 lines. Has `UNIVERSAL_BATCH_1` constant and `getUniversalBatch()` method as the pattern for hardcoded questions. **Add `FALLBACK_POOLS` and `getFallbackBatch()` here.**

- `src/intake/intake-quality.service.ts` — 363 lines. No changes needed. Validation only runs on AI-generated batches, not fallback batches (they are pre-validated by definition).

- `src/intake/intake.service.ts` `storeGeneratedBatch()` lines 635-682: Inserts batch and questions. Currently inserts `{ goal_id: goalId, batch_number: batchNumber }` — need to add optional `is_fallback` parameter.

- `src/config/app.config.ts` — no changes needed. `appConfig.intake.maxBatches` (7) is already used for the batch cap.

**What NOT to build in this story:**
- No changes to `IntakeQualityService` — validation runs on AI-generated batches, not fallback batches
- No changes to `IntakeController` — same endpoints, same response formats
- No changes to database schema — `is_fallback` column already exists
- No changes to event handling — `batch.served` and `batch.answered` events fire normally for fallback batches
- No changes to profile generation — fallback batches are treated identically once stored

### Technical Requirements

**Fallback question pools — 3 distinct pools of 2-3 open-ended text questions:**

```typescript
const FALLBACK_POOLS: GeneratedQuestion[][] = [
  [
    {
      question_text: 'What are the biggest obstacles or challenges you foresee in pursuing this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 1,
    },
    {
      question_text: 'What resources or support do you currently have that could help you achieve this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 2,
    },
    {
      question_text: 'How will achieving this goal change your daily life or routine?',
      question_type: 'text',
      config: null,
      order_in_batch: 3,
    },
  ],
  [
    {
      question_text: 'What past experiences or skills do you have that are relevant to this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 1,
    },
    {
      question_text: 'What would you consider a meaningful first milestone toward this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 2,
    },
  ],
  [
    {
      question_text: 'Who in your life would be most affected by or supportive of this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 1,
    },
    {
      question_text: 'What would you need to give up or change to make room for this goal?',
      question_type: 'text',
      config: null,
      order_in_batch: 2,
    },
    {
      question_text: 'How confident are you that you can achieve this goal, and what would increase your confidence?',
      question_type: 'text',
      config: null,
      order_in_batch: 3,
    },
  ],
];
```

**Pool selection logic:**

```typescript
getFallbackBatch(usedFallbackIndexes: number[]): GeneratedQuestion[] {
  for (let i = 0; i < FALLBACK_POOLS.length; i++) {
    if (!usedFallbackIndexes.includes(i)) {
      return FALLBACK_POOLS[i];
    }
  }
  // All pools exhausted — cycle back to first
  return FALLBACK_POOLS[0];
}
```

**Determining used fallback indexes — query pattern:**

```typescript
private async getUsedFallbackIndexes(goalId: string): Promise<number[]> {
  const supabase = this.supabaseService.getAdminClient();

  const { data: fallbackBatches, error } = await supabase
    .from('intake_batches')
    .select('id')
    .eq('goal_id', goalId)
    .eq('is_fallback', true)
    .order('batch_number');

  if (error || !fallbackBatches?.length) return [];

  const indexes: number[] = [];
  for (const batch of fallbackBatches) {
    // Load questions for this fallback batch
    const { data: questions } = await supabase
      .from('intake_questions')
      .select('question_text')
      .eq('batch_id', batch.id)
      .order('order_in_batch');

    if (!questions?.length) continue;

    // Match against FALLBACK_POOLS by comparing first question text
    const firstQ = questions[0].question_text;
    const poolIndex = this.intakePromptService.findFallbackPoolIndex(firstQ);
    if (poolIndex >= 0) indexes.push(poolIndex);
  }

  return indexes;
}
```

**`findFallbackPoolIndex()` in IntakePromptService:**

```typescript
findFallbackPoolIndex(firstQuestionText: string): number {
  return FALLBACK_POOLS.findIndex(
    (pool) => pool[0].question_text === firstQuestionText,
  );
}
```

**Modified `storeGeneratedBatch()` signature:**

```typescript
private async storeGeneratedBatch(
  goalId: string,
  batchNumber: number,
  questions: { question_text: string; question_type: string; config: Record<string, unknown> | null; order_in_batch: number }[],
  isFallback = false,
) {
  const supabase = this.supabaseService.getAdminClient();

  const { data: newBatch, error: batchError } = await supabase
    .from('intake_batches')
    .insert({ goal_id: goalId, batch_number: batchNumber, is_fallback: isFallback })
    .select()
    .single();
  // ... rest unchanged
```

**`serveFallbackBatch()` method:**

```typescript
private async serveFallbackBatch(
  userId: string,
  goalId: string,
  goalDescription: string,
  batchNumber: number,
) {
  // Check if we've hit the batch cap — trigger completion instead
  if (batchNumber >= appConfig.intake.maxBatches) {
    const profileResult = await this.generateAndStoreProfile(userId, goalId, goalDescription);
    return {
      batch_id: null,
      batch_number: null,
      is_complete: true,
      questions: [],
      ...profileResult,
    };
  }

  const usedIndexes = await this.getUsedFallbackIndexes(goalId);
  const fallbackQuestions = this.intakePromptService.getFallbackBatch(usedIndexes);

  this.logger.warn(`Serving fallback batch ${batchNumber} for goal ${goalId} (used indexes: [${usedIndexes.join(', ')}])`);

  const storedBatch = await this.storeGeneratedBatch(goalId, batchNumber, fallbackQuestions, true);

  // Emit batch.served event — fire-and-forget
  this.eventEmitter.emit('batch.served', {
    goal_id: goalId,
    batch_id: storedBatch.batch_id,
    batch_number: storedBatch.batch_number,
    user_id: userId,
  } satisfies BatchServedEvent);

  return storedBatch;
}
```

**Modified `generateAndStoreNextBatch()` — replace throw with fallback:**

Replace line 392:
```typescript
// BEFORE:
throw new InternalServerErrorException('Failed to generate next batch');

// AFTER:
this.logger.warn(
  `Batch validation failed after retry for goal ${goalId}. Serving fallback.`,
);
return this.serveFallbackBatch(userId, goalId, goalDescription, nextBatchNumber);
```

Also wrap the entire method body in try/catch to handle AI call errors:
```typescript
// At the top of generateAndStoreNextBatch, wrap existing logic:
try {
  // ... existing AI generation + validation logic
} catch (error) {
  this.logger.error(
    `AI generation failed for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}. Serving fallback.`,
  );
  return this.serveFallbackBatch(userId, goalId, goalDescription, nextBatchNumber);
}
```

**Modified `submitBatch()` Transaction 2 — replace message fallback with batch fallback:**

Replace line 288-291 (validation failure after retry):
```typescript
// BEFORE:
return {
  submitted_batch: submittedBatch,
  message: 'Answers submitted successfully',
};

// AFTER:
const fallbackBatch = await this.serveFallbackBatch(userId, goalId, goal.description, nextBatchNumber);
return {
  submitted_batch: submittedBatch,
  next_batch: fallbackBatch,
};
```

Replace line 316-324 (outer catch):
```typescript
// BEFORE:
} catch (error) {
  this.logger.error(...);
  return {
    submitted_batch: submittedBatch,
    message: 'Answers submitted successfully',
  };
}

// AFTER:
} catch (error) {
  this.logger.error(
    `Transaction 2 failed: ${error instanceof Error ? error.message : String(error)}. Attempting fallback.`,
  );
  try {
    const nextBatchNumber = latestBatch.batch_number + 1;
    const fallbackBatch = await this.serveFallbackBatch(userId, goalId, goal.description, nextBatchNumber);
    return {
      submitted_batch: submittedBatch,
      next_batch: fallbackBatch,
    };
  } catch (fallbackError) {
    this.logger.error(
      `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
    );
    return {
      submitted_batch: submittedBatch,
      message: 'Answers submitted successfully',
    };
  }
}
```

### Architecture Compliance

**Module structure:** No new modules. Extend existing `IntakeModule` — no changes to module registration.

**Service boundaries (STRICT):**
- `IntakePromptService` — owns fallback question content (`FALLBACK_POOLS` constant, `getFallbackBatch()`, `findFallbackPoolIndex()`). Same pattern as `UNIVERSAL_BATCH_1`. No AI calls, no database access.
- `IntakeService` — orchestrates fallback flow: determines when to use fallback, resolves used pool indexes, calls `IntakePromptService.getFallbackBatch()`, stores batch with `is_fallback: true`, emits events.
- `IntakeQualityService` — no changes. Validation is for AI-generated batches. Fallback batches are pre-validated by definition.
- `GoalService` — no changes.

**Endpoint changes:** None. Same endpoints, same response formats. The fallback is transparent to the client.

**Error handling:**
- AI generation failures: caught, logged, fallback served seamlessly
- Validation failures after retry: caught, logged as warning, fallback served
- Fallback serving itself fails (e.g., Supabase insert error): caught, logged, falls back to the old `{ submitted_batch, message }` response as last resort
- Profile generation triggered at batch cap: follows existing Story 2.4 pattern

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** `snake_case` field names. Fallback batch responses use identical format to AI-generated batch responses — `{ batch_id, batch_number, is_complete: false, questions: [...] }`.

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed.

- `IntakePromptService` — no new imports needed
- `IntakeService` — no new imports needed (already imports all required NestJS decorators, services, and event utilities)

**Existing patterns reused:**
- `storeGeneratedBatch()` — same insert pattern, just add `is_fallback` field
- `batch.served` event emission — same pattern as existing AI batch serving
- `loadPriorBatchContext()` — already works for fallback batches (they have questions and answers like any batch)

### File Structure Requirements

**Files to CREATE:**

None — no new source files. All changes go into existing files.

**Files to MODIFY:**

- `src/intake/intake-prompt.service.ts` — add `FALLBACK_POOLS` constant, `getFallbackBatch()` method, `findFallbackPoolIndex()` method
- `src/intake/intake.service.ts` — add `serveFallbackBatch()` and `getUsedFallbackIndexes()` private methods, modify `storeGeneratedBatch()` to accept `isFallback` parameter, modify `generateAndStoreNextBatch()` to use fallback instead of throw, modify `submitBatch()` Transaction 2 to use fallback instead of message response
- `src/intake/intake-prompt.service.spec.ts` — add tests for `getFallbackBatch()` and `findFallbackPoolIndex()`
- `src/intake/intake.service.spec.ts` — add tests for fallback scenarios in both `submitBatch` and `generateAndStoreNextBatch`

**Files NOT to touch:**

- `src/intake/intake-quality.service.ts` — validation is for AI batches only
- `src/intake/intake-quality.service.spec.ts` — no quality service changes
- `src/intake/intake.controller.ts` — no endpoint changes
- `src/intake/intake.module.ts` — no module changes needed
- `src/intake/dto/submit-answers.dto.ts` — no DTO changes
- `src/ai/ai.service.ts` — stable
- `src/supabase/*` — stable
- `src/config/app.config.ts` — no new config needed
- `src/goal/*` — no goal module changes

**No database migrations needed.** The `is_fallback` column already exists on `intake_batches` (boolean, default false).

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakePromptService tests — add to `intake-prompt.service.spec.ts`:**

```
describe('IntakePromptService')
  describe('getFallbackBatch')
    ✓ returns first pool when no indexes are used
    ✓ returns second pool when first index is used
    ✓ returns third pool when first two indexes are used
    ✓ wraps around to first pool when all indexes are used
    ✓ returns questions with question_type "text" and config null
    ✓ returns questions with sequential order_in_batch starting at 1
  describe('findFallbackPoolIndex')
    ✓ returns correct index for first pool's first question
    ✓ returns correct index for second pool's first question
    ✓ returns -1 for unknown question text
```

**IntakeService tests — add to existing `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('generateAndStoreNextBatch — fallback')
    ✓ serves fallback batch when AI generation throws an error
    ✓ serves fallback batch when validation fails after retry
    ✓ stores fallback batch with is_fallback = true
    ✓ triggers profile generation instead of fallback when at max batches
    ✓ emits batch.served event for fallback batch
  describe('submitBatch — Transaction 2 fallback')
    ✓ serves fallback inline when validation fails after retry
    ✓ serves fallback inline when Transaction 2 throws
    ✓ returns message fallback when fallback itself fails
    ✓ response contains submitted_batch and next_batch (not message) on fallback
  describe('serveFallbackBatch')
    ✓ selects different fallback pool when previous fallback exists
    ✓ stores batch with is_fallback: true
    ✓ emits batch.served event
  describe('storeGeneratedBatch')
    ✓ passes is_fallback: true to insert when isFallback parameter is true
    ✓ defaults is_fallback to false when parameter not provided
```

**Mock patterns (extend established patterns from Stories 2.1-2.4 tests):**

- Mock `IntakePromptService.generateNextBatch` — throw error to trigger fallback
- Mock `IntakePromptService.getFallbackBatch` — return a fallback question array
- Mock `IntakePromptService.findFallbackPoolIndex` — return index or -1
- Mock `IntakeQualityService.validateBatch` — return `{ valid: false }` to trigger retry → fallback
- Mock Supabase query for `intake_batches` with `is_fallback = true` filter
- Reuse existing chainable Supabase mock pattern from Stories 2.1-2.4

**Test count:** ~23 new tests across 2 files (9 prompt service + 14 intake service).

### Previous Story Intelligence

**From Story 2.3 (AI batch generation — established the failure patterns):**

- `generateAndStoreNextBatch()` line 392: `throw new InternalServerErrorException('Failed to generate next batch')` — this is the exact line to replace with fallback logic
- `submitBatch()` Transaction 2 outer catch (lines 316-324): returns `{ submitted_batch, message }` — this is where the fallback inline response replaces the message
- `submitBatch()` validation failure after retry (lines 284-291): returns `{ submitted_batch, message }` — also needs fallback
- The retry pattern (generate → validate → retry once → give up) is preserved — fallback only triggers AFTER the retry fails
- Story 2.3 completion notes explicitly stated: "Story 3.1 will add fallback batches" and "throws `InternalServerErrorException` on generation failure" — these are the hooks we're implementing

**From Story 2.4 (profile generation — completion at batch cap):**

- `generateAndStoreProfile()` method handles profile generation flow
- When `batchNumber >= appConfig.intake.maxBatches`, the system should trigger completion instead of serving a fallback. This is already handled in `generateNextBatch()` line 113 (`if (batchNumber >= appConfig.intake.maxBatches) return { questions: [], is_complete: true }`), but the fallback path needs the same check.

**From Story 2.1 (first batch — established `is_fallback` column):**

- `intake_batches` table has `is_fallback` column (boolean, default false) — created in Story 2.1 migration
- `storeGeneratedBatch()` method inserts `{ goal_id: goalId, batch_number: batchNumber }` without `is_fallback` — it defaults to false. Just add the parameter.

**Established test patterns:**

- Supabase mock chain: `from` → `select`/`insert`/`update` → `eq`/`order`/`limit` → `single`/no-finalizer
- `mockReturnValueOnce` for sequential Supabase calls
- `IntakePromptService` mock: `{ generateNextBatch: jest.fn(), getUniversalBatch: jest.fn(), generateGoalProfile: jest.fn() }` — add `getFallbackBatch` and `findFallbackPoolIndex` to this mock
- Event emission verified via `expect(mockEventEmitter.emit).toHaveBeenCalledWith('batch.served', expect.objectContaining({...}))`

### Project Structure Notes

- All changes are within the existing `src/intake/` directory — no new directories or modules
- `FALLBACK_POOLS` constant lives in `intake-prompt.service.ts` alongside `UNIVERSAL_BATCH_1` — consistent pattern for hardcoded question content
- `serveFallbackBatch()` and `getUsedFallbackIndexes()` are private methods on `IntakeService` — not exposed through any public API
- No barrel exports — import directly from the file
- `is_fallback` flag is stored at database level — transparent to client (the GET response for a batch doesn't include `is_fallback`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1 — FR21, FR22, FR23]
- [Source: _bmad-output/planning-artifacts/architecture.md#AI Call Pattern — retry once then fallback]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakePromptService owns prompt templates, IntakeQualityService owns fallback logic]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — AI call failures: catch, retry → fallback]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Error Handling, Supabase Client]
- [Source: _bmad-output/planning-artifacts/prd.md#FR21 — System retries failed AI generation once, then serves fallback batch]
- [Source: _bmad-output/planning-artifacts/prd.md#FR22 — Fallback batches count toward 7-batch hard cap]
- [Source: _bmad-output/planning-artifacts/prd.md#FR23 — Consecutive fallback batches serve different questions from pool]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR9 — AI failures never block intake progression]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11 — Answer data never lost — two-transaction split]
- [Source: _bmad-output/implementation-artifacts/2-3-ai-generated-next-batch-with-quality-gates.md — generateAndStoreNextBatch failure path, submitBatch Transaction 2 failure path, retry pattern]
- [Source: _bmad-output/implementation-artifacts/2-4-intake-completion-and-goal-profile-generation.md — generateAndStoreProfile pattern, batch cap completion trigger]
- [Source: src/intake/intake.service.ts — Line 392 (throw to replace), Lines 288-291 (validation failure), Lines 316-324 (outer catch), Lines 635-682 (storeGeneratedBatch)]
- [Source: src/intake/intake-prompt.service.ts — UNIVERSAL_BATCH_1 constant pattern, GeneratedQuestion interface]
- [Source: src/config/app.config.ts — intake.maxBatches (7)]
- [Source: Supabase schema — intake_batches.is_fallback column (boolean, default false)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- **Task 1:** Added `FALLBACK_POOLS` constant (3 pools of 2-3 open-ended text questions), `getFallbackBatch()` method with pool cycling, and `findFallbackPoolIndex()` method to `IntakePromptService`. Follows established `UNIVERSAL_BATCH_1` pattern.
- **Task 2:** Added optional `isFallback` parameter (default `false`) to `storeGeneratedBatch()`. Passes `is_fallback` field in `intake_batches` insert.
- **Task 3:** Added `getUsedFallbackIndexes()` private method to `IntakeService`. Queries `intake_batches` for `is_fallback=true` rows, loads their questions, and matches first question text against `FALLBACK_POOLS` via `findFallbackPoolIndex()`.
- **Task 4:** Added `serveFallbackBatch()` private method to `IntakeService`. Checks batch cap (triggers profile generation at max), resolves used pool indexes, gets fallback questions, stores with `is_fallback=true`, emits `batch.served` event.
- **Task 5:** Wrapped `generateAndStoreNextBatch()` body in try/catch. Replaced `throw InternalServerErrorException` (validation failure after retry) with `serveFallbackBatch()` call. Outer catch also calls `serveFallbackBatch()`.
- **Task 6:** Modified `submitBatch()` Transaction 2: validation failure after retry now calls `serveFallbackBatch()` returning `{ submitted_batch, next_batch }`. Outer catch calls `serveFallbackBatch()` with secondary try/catch — if fallback itself fails, falls back to `{ submitted_batch, message }` as last resort.
- **Task 7:** Added 9 new tests to `intake-prompt.service.spec.ts` (getFallbackBatch + findFallbackPoolIndex). Updated 3 existing tests in `intake.service.spec.ts` that tested old failure behavior (now test fallback behavior with proper mocks). Added 6 new tests in `intake.service.spec.ts` covering: fallback storage with is_fallback=true, batch.served event emission, pool selection with prior fallback, profile generation at max batches, default is_fallback=false, and message fallback when fallback itself fails. Total: 182 tests pass (28 prompt service + 63 intake service + 91 others).
- Added `appConfig` import to `intake.service.ts` for `maxBatches` check in `serveFallbackBatch()`.

### File List

- `src/intake/intake-prompt.service.ts` — Modified: added `FALLBACK_POOLS` constant, `getFallbackBatch()`, `findFallbackPoolIndex()`
- `src/intake/intake.service.ts` — Modified: added `serveFallbackBatch()`, `getUsedFallbackIndexes()`, modified `storeGeneratedBatch()` (isFallback param), `generateAndStoreNextBatch()` (try/catch + fallback), `submitBatch()` (fallback in Transaction 2)
- `src/intake/intake-prompt.service.spec.ts` — Modified: added 9 tests for getFallbackBatch and findFallbackPoolIndex
- `src/intake/intake.service.spec.ts` — Modified: updated 3 existing tests for new fallback behavior, added 6 new fallback-specific tests

### Change Log

- 2026-02-12: Implemented AI fallback batches (Story 3.1). When AI question generation fails (either generation error or validation failure after retry), the system now serves pre-written fallback batches from a pool of 3 distinct question sets. Fallback batches are stored with `is_fallback=true`, count toward the 7-batch cap, and are seamlessly transparent to the client. If fallback would exceed the cap, profile generation is triggered instead.
