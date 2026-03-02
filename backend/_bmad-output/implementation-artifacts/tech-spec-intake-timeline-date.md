---
title: 'Intake Timeline Precision — Calendar Date for Goal Target'
slug: 'intake-timeline-date'
created: '2026-02-20'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['NestJS 11', 'TypeScript ESM', 'Supabase', 'OpenRouter AI']
files_to_modify: ['src/intake/intake-prompt.service.ts', 'src/intake/intake-prompt.service.spec.ts', 'src/intake/intake.service.ts']
code_patterns: ['hardcoded universal batch constants', 'private prompt builder methods', 'PriorBatchContext iteration for Q&A formatting']
test_patterns: ['jest mocks for AiService', 'structural assertions on universal batch', 'prompt content assertions via mock.calls']
---

# Tech-Spec: Intake Timeline Precision — Calendar Date for Goal Target

**Created:** 2026-02-20

## Overview

### Problem Statement

The universal batch's timeline question uses vague ranges ("1-3 months", "3-6 months"...) which gives the AI model imprecise context about urgency and pacing. A user who needs to hit a goal by a specific wedding date and a user who vaguely thinks "sometime in the next few months" get treated identically.

### Solution

Replace the single_choice timeline question in `UNIVERSAL_BATCH_1` with a calendar date picker. Store the answer as text (ISO date string). When sending prior batch context to the AI for next-batch generation and profile synthesis, inject the current date and computed time remaining so the model can reason about urgency and pacing.

### Scope

**In Scope:**
- Change question 4 in `UNIVERSAL_BATCH_1` from `single_choice` to `text` with `config: { format: 'date' }` to signal a date picker to the frontend
- Add server-side ISO date validation for questions with `config.format === 'date'`
- Add a helper method to extract the target date from prior batches and compute time remaining
- Update `buildUserPrompt()` to inject current date and time remaining
- Update `buildProfileUserPrompt()` with the same date/time-remaining context
- Update relevant unit tests

**Out of Scope:**
- New DB column or question_type enum value
- AI-generated batches using a date type
- Frontend implementation (separate repo)

## Context for Development

### Codebase Patterns

- Universal batch questions are hardcoded constants in `intake-prompt.service.ts`
- AI prompts are built via private methods: `buildSystemPrompt()`, `buildUserPrompt()`, `buildProfileUserPrompt()`
- `PriorBatchContext` contains `{ batch_number, questions: [{ question_text, question_type, answer }] }`
- `formatAnswer()` in `intake.service.ts` handles `text` type by returning `answer_text` — ISO date string flows through naturally
- `validateAnswer()` in `intake.service.ts` handles per-type validation — needs a new branch for date format validation
- Answer validation uses the question's `config` object, which is available in the validation path

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/intake/intake-prompt.service.ts` | Universal batch constant + prompt builders (main changes) |
| `src/intake/intake-prompt.service.spec.ts` | Unit tests for prompt service |
| `src/intake/intake.service.ts` | Answer validation — add ISO date format check for `config.format === 'date'` |
| `src/intake/dto/submit-answers.dto.ts` | DTO (no changes needed) |

### Technical Decisions

- Use `question_type: 'text'` with `config: { format: 'date' }` to signal date picker to frontend without changing DB schema
- Store answer as ISO date string (e.g., "2026-06-15")
- Compute time remaining dynamically at prompt-build time, not at storage time
- **Detect the target date answer in `priorBatches` by matching `config.format === 'date'`** — schema-based detection is robust against question text changes and works for historical data regardless of wording. The `PriorBatchContext` interface must be extended to include `config` for this to work.
- Format time remaining as human-readable with rules:
  - **>= 30 days:** `~N months (D days)` using `Math.round(days / 30)`
  - **< 30 days:** `D days` (no month approximation)
  - **Past dates:** `Overdue by D days`
- Validate ISO date format server-side in `validateAnswer()` for questions with `config.format === 'date'` — reject malformed dates like `"2026-99-99"` or `"next tuesday"`

## Implementation Plan

### Tasks

- [x] Task 1: Extend `PriorBatchContext` to include question config
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Add `config?: Record<string, unknown> | null` to the question object inside `PriorBatchContext` interface.
  - Notes: This enables schema-based detection of date questions in `buildTimelineContext()`.

- [x] Task 2: Update `loadPriorBatchContext()` to pass config through
  - File: `src/intake/intake.service.ts`
  - Action: In the `loadPriorBatchContext()` method, the Supabase query already selects `config` from `intake_questions`. Include `config` in the returned `PriorBatchContext` question objects (currently only `question_text`, `question_type`, and `answer` are mapped).
  - Notes: The query at line 663 already fetches `config` — just needs to be included in the return mapping at line 689.

- [x] Task 3: Replace the timeline question in `UNIVERSAL_BATCH_1`
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Change question 4 from `single_choice` with range options to `text` with `config: { format: 'date' }`. Update `question_text` to ask for a specific target date (e.g., "When do you want to achieve this goal by?").
  - Notes: Keep `order_in_batch: 4`. The `UniversalQuestion` interface already supports `text` type and `Record<string, unknown>` config — no type change needed.

- [x] Task 4: Add ISO date validation in `validateAnswer()`
  - File: `src/intake/intake.service.ts`
  - Action: Inside the `text` case of `validateAnswer()`, after the existing non-empty string check, add: if `question.config` has `format === 'date'`, validate that `answer_text` matches `/^\d{4}-\d{2}-\d{2}$/` AND that `new Date(answer_text)` produces a valid date (not `NaN`). Throw `BadRequestException('Invalid date format. Expected YYYY-MM-DD.')` on failure.
  - Notes: This prevents garbage like `"next tuesday"` or `"2026-99-99"` from being stored. The `question` parameter in `validateAnswer()` already receives `config`.

- [x] Task 5: Add `buildTimelineContext()` helper method
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Add a private method `buildTimelineContext(priorBatches: PriorBatchContext[]): string` that:
    1. Scans all prior batch questions for one with `config?.format === 'date'`
    2. Parses the answer as an ISO date
    3. Computes days remaining using UTC dates: `const today = new Date().toISOString().slice(0, 10)` for consistency
    4. Returns a formatted string based on duration:
       - **>= 30 days:** `<timeline>\nToday's date: YYYY-MM-DD\nTarget deadline: YYYY-MM-DD\nTime remaining: ~N months (D days)\n</timeline>\n\n`
       - **1-29 days:** `<timeline>\nToday's date: YYYY-MM-DD\nTarget deadline: YYYY-MM-DD\nTime remaining: D days\n</timeline>\n\n`
       - **Past date:** `<timeline>\nToday's date: YYYY-MM-DD\nTarget deadline: YYYY-MM-DD\nTime remaining: Overdue by D days\n</timeline>\n\n`
    5. Returns empty string if no date question found or date is unparseable
  - Notes: Use `Math.round(days / 30)` for approximate months (only when >= 30 days). Use UTC throughout to avoid timezone drift.

- [x] Task 6: Inject timeline context into `buildUserPrompt()`
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Call `this.buildTimelineContext(priorBatches)` and inject the result into the user prompt, between the goal tag and the prior_responses tag.
  - Notes: Only appears when priorBatches contain the target date answer (batch 1 is always answered before batch 2 generation, so it will always be present for batches >= 2).

- [x] Task 7: Inject timeline context into `buildProfileUserPrompt()`
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Call `this.buildTimelineContext(priorBatches)` and inject the result into the profile user prompt, between the goal line and the intake responses.
  - Notes: Profile generation always happens after all batches are answered, so the target date will always be available.

- [x] Task 8: Update unit tests
  - File: `src/intake/intake-prompt.service.spec.ts`
  - Action:
    1. Update universal batch tests: question 4 should now be `text` type with `config: { format: 'date' }` instead of `single_choice`. The "at least one single_choice" test still passes (question 5). Add a test that question 4 has `config.format === 'date'`.
    2. Add tests for timeline context injection in `generateNextBatch`: when prior batches contain a question with `config: { format: 'date' }` and answer `"2026-08-15"`, the user prompt should contain `"Today's date"` and `"Time remaining"`. Use `jest.useFakeTimers({ now: new Date('2026-02-20T00:00:00Z') })` for deterministic assertions.
    3. Add tests for timeline context injection in `generateGoalProfile`: same assertions on the user prompt.
    4. Add edge case tests:
       - When no date question in prior batches → no timeline context in prompt
       - When date is in the past → prompt contains `"Overdue by"`
       - When duration < 30 days → prompt shows only days, no month approximation
    5. Add test for ISO date validation in `validateAnswer()`: submit `"not-a-date"` for a question with `config: { format: 'date' }` → `BadRequestException`.

### Acceptance Criteria

- [x] AC 1: Given a new goal with intake in progress, when the first batch is served, then question 4 should have `question_type: 'text'` and `config: { format: 'date' }` with question text asking for a specific target date.
- [x] AC 2: Given a user submits batch 1 with a target date of "2026-08-15", when the AI generates batch 2 on "2026-02-20", then the user prompt includes "Today's date: 2026-02-20", "Target deadline: 2026-08-15", and "Time remaining: ~6 months (176 days)".
- [x] AC 3: Given a user completes all intake batches with a target date answer, when the goal profile is generated, then the profile user prompt includes current date and time remaining context.
- [x] AC 4: Given a user submits batch 1 with an unparseable or missing target date, when the AI generates batch 2, then the user prompt does NOT include any timeline context (graceful no-op).
- [x] AC 5: Given a user submits batch 1 with a target date in the past, when the AI generates batch 2, then the timeline context shows "Overdue by D days".
- [x] AC 6: Given a user submits `"next tuesday"` as the answer to the date question, when `validateAnswer()` runs, then it throws `BadRequestException` with message about invalid date format.
- [x] AC 7: Given a user submits a target date 15 days from now, when the AI generates the next batch, then the timeline context shows "15 days" with no month approximation.

## Additional Context

### Dependencies

None — self-contained change within the intake module. No new packages needed.

### Testing Strategy

- **Unit tests** (in `intake-prompt.service.spec.ts`):
  - Universal batch structure: question 4 type and config assertions
  - `generateNextBatch`: verify timeline context appears in user prompt when target date is in prior batches
  - `generateGoalProfile`: same timeline context assertions
  - Edge cases: missing date, invalid date, past date, short duration (< 30 days)
  - Use `jest.useFakeTimers({ now: new Date('2026-02-20T00:00:00Z') })` for deterministic date assertions
- **Unit tests** (in `intake.service.spec.ts` or inline):
  - ISO date validation: valid date passes, malformed string rejects, invalid calendar date rejects
- **Manual testing**: Hit `GET /api/goals/:id/intake/next-batch` and verify question 4 shape; submit answers and verify the AI prompt logs contain timeline info

### Notes

- The `buildTimelineContext()` method uses `new Date().toISOString().slice(0, 10)` for UTC-consistent "today" to avoid timezone-dependent day count drift.
- The existing `single_choice` test for universal batch still passes because question 5 ("Have you attempted this goal before?") remains `single_choice`.
- Fallback pools are unaffected — they don't include timeline questions.
- Detection uses `config.format === 'date'` (schema-based) rather than matching `question_text` strings. This is robust against question text edits and works for any future date-type questions without code changes.

## Review Notes
- Adversarial review completed
- Findings: 12 total, 6 fixed, 6 skipped (noise/out-of-scope)
- Resolution approach: auto-fix
- Fixes applied: `return ''` → `continue` for invalid date resilience, UTC-consistent date parsing in validation, "Due today" edge case, singular/plural month grammar, type-safe config in validateAnswer, malformed date test coverage
