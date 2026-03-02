---
title: 'Multi-Persona Prompt Evaluation System'
slug: 'multi-persona-prompt-eval'
created: '2026-02-13'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['NestJS 11', 'TypeScript ESM (nodenext)', 'OpenAI SDK 6.18 via OpenRouter', 'anthropic/claude-opus-4.6', 'x-ai/grok-4.1-fast']
files_to_modify: ['src/ai/ai.service.ts', 'src/config/app.config.ts', 'src/intake/intake.module.ts', 'package.json']
files_to_create: ['src/eval/personas.ts', 'src/eval/gold-standards.ts', 'src/eval/eval.service.ts', 'src/eval/eval.module.ts', 'src/eval/run-eval.ts']
code_patterns: ['ESM with .js extensions on all relative imports', 'NestJS DI with @Global() for AiModule/SupabaseModule', 'AiService.generateJSON<T>(system, user, model?)', 'appConfig direct import (no env injection)', 'NestFactory.createApplicationContext() for CLI']
test_patterns: ['No unit tests for eval — eval IS the test']
---

# Tech-Spec: Multi-Persona Prompt Evaluation System

**Created:** 2026-02-13

## Overview

### Problem Statement

The current intake prompt system generates coaching questions via LLM but has no rigorous way to test prompt quality. The existing `IntakeQualityService` scores batches on 4 coach-utility dimensions (relevance, depth, coverage, redundancy) using a single LLM judge — but completely misses the user psychology layer: cognitive load, psychological safety, and emotional leverage. Without these, prompts may extract data efficiently but cause user drop-off through shame, analysis paralysis, or emotional flatness.

There is no way to iterate on prompts with confidence — no A/B testing, no gold standard comparison, no deterministic scoring.

### Solution

Build an offline evaluation harness with:
- **4 LLM-as-judge personas** — each an expert in one axis of the combined Functional + Psychological framework
- **1 meta-judge** — synthesizes all scores, identifies weakest/strongest questions, suggests rewrites
- **5 gold standard questionnaires** — hand-crafted examples across domains (weight loss, career pivot, language learning, saving money, dating) that define "excellent"
- **CLI runner** — generates batches using the production prompt + model, scores them with Opus 4.6 at temperature 0, compares against gold standards

The judge model (`anthropic/claude-opus-4.6`, temp 0) stays constant. You change the production prompt or model, re-run, and get comparable scores.

### Scope

**In Scope:**
- 4 persona judge system prompts (Coach, Cognitive Psychologist, Therapist, Dropout Predictor)
- Meta-judge synthesizer
- 5 gold standard questionnaires as typed data
- `EvalService` orchestrating generation → judging → comparison
- CLI entry point (`run-eval.ts`) bootstrapping NestJS and running the eval
- Add `temperature` parameter to `AiService.generateJSON()`
- Add `eval` config block to `appConfig`
- Markdown report output to `_bmad-output/`

**Out of Scope:**
- Replacing the production `IntakeQualityService` (that stays as-is for runtime monitoring)
- UI or API endpoints for eval results
- Automated prompt rewriting (meta-judge suggests, human decides)
- Unit test files (this is a dev tool — the eval itself IS the test)

## Context for Development

### Codebase Patterns

- ESM with `.js` extensions on all relative imports (tsconfig: `nodenext` module resolution)
- `AiService.generateJSON<T>(system, user, model?)` — regex `[[{][\s\S]*[}\]]` extracts JSON from response
- `@Global()` modules: `SupabaseModule`, `AiModule` — available everywhere via DI
- `appConfig` in `src/config/app.config.ts` — direct import, no env injection
- `NestFactory.createApplicationContext()` for CLI tools (no HTTP server)
- `IntakePromptService` is currently NOT exported from `IntakeModule` — must add to exports

### Files to Reference

| File | Purpose | Action |
| ---- | ------- | ------ |
| `src/ai/ai.service.ts` | `generateJSON<T>(system, user, model?)` | Add `temperature` param |
| `src/config/app.config.ts` | Central config object | Add `eval` config block |
| `src/intake/intake-prompt.service.ts` | Production prompts + `generateNextBatch()`, `getUniversalBatch()` | Read-only (being evaluated) |
| `src/intake/intake.module.ts` | Module providers/exports | Export `IntakePromptService` |
| `package.json` | Scripts | Add `eval` npm script |

### Technical Decisions

1. **Judge model:** `anthropic/claude-opus-4.6` via OpenRouter, temperature 0
2. **Production model:** `x-ai/grok-4.1-fast` (current default) — this is what gets tested
3. **Architecture:** NestJS module with `NestFactory.createApplicationContext()` for CLI — reuses AiService DI, no HTTP server overhead
4. **Temperature support:** Add optional `temperature` param to `AiService.generateJSON()` — single line addition, no separate client
5. **IntakePromptService access:** Export from `IntakeModule`, import `IntakeModule` in `EvalModule`
6. **Output:** Markdown report to `_bmad-output/eval-report-{timestamp}.md`
7. **Gold standards:** Static typed data, not database records
8. **Parallel execution:** 4 persona judges run in parallel per batch via `Promise.all()`
9. **Simulated prior context:** Gold standard batch 1 answers are pre-written to feed `generateNextBatch()` for batch 2 generation

## Implementation Plan

### Tasks

- [x] Task 1: Add temperature support to AiService
  - File: `src/ai/ai.service.ts`
  - Action: Add optional `temperature?: number` as 4th parameter to `generateJSON()`. When provided, include `temperature` in the `openai.chat.completions.create()` options object. When undefined, omit it (lets the API use its default).
  - Current signature: `async generateJSON<T>(system: string, user: string, model?: string): Promise<T>`
  - New signature: `async generateJSON<T>(system: string, user: string, model?: string, temperature?: number): Promise<T>`
  - Change in create call: add `...(temperature !== undefined && { temperature })` to the options object
  - Notes: This is a non-breaking change — all existing callers pass 0-2 args and are unaffected.

- [x] Task 2: Add eval config to appConfig
  - File: `src/config/app.config.ts`
  - Action: Add `eval` block to the `appConfig` object:
    ```typescript
    eval: {
      judgeModel: 'anthropic/claude-opus-4.6',
      judgeTemperature: 0,
    },
    ```
  - Notes: Test goals live in gold-standards.ts, not config.

- [x] Task 3: Export IntakePromptService from IntakeModule
  - File: `src/intake/intake.module.ts`
  - Action: Add `IntakePromptService` to the `exports` array alongside `IntakeService`.
  - Notes: Required for `EvalModule` to inject `IntakePromptService` via DI.

- [x] Task 4: Create persona judge definitions
  - File: `src/eval/personas.ts` (NEW)
  - Action: Define typed interfaces and constant objects for all 5 judges. Each judge has a `name`, `systemPrompt`, and `scoreFields` array.
  - Notes: Full prompt content specified below in Appendix A.

- [x] Task 5: Create gold standard questionnaires
  - File: `src/eval/gold-standards.ts` (NEW)
  - Action: Encode all 5 hand-crafted questionnaires as typed `GoldStandard[]`. Each entry includes `domain`, `goalDescription`, `questions` array (with `question_text`, `question_type`, `config`, `rationale`), and `simulatedBatch1Answers` (pre-written PriorBatchContext to enable batch 2 generation).
  - Notes: Full content specified below in Appendix B.

- [x] Task 6: Build eval service
  - File: `src/eval/eval.service.ts` (NEW)
  - Action: Create `EvalService` with these methods:
    - `runFullEval(): Promise<EvalReport>` — orchestrates the entire evaluation
    - `evaluateBatch(goal, questions, goldStandard, batchLabel): Promise<BatchEvalResult>` — runs 4 judges in parallel + meta-judge
    - `runPersonaJudge(persona, goal, questions, goldStandard): Promise<PersonaScores>` — single judge call
    - `runMetaJudge(goal, questions, allPersonaScores): Promise<MetaJudgeResult>` — synthesis call
    - `generateReport(results): string` — builds markdown report
  - Flow per test goal:
    1. Get universal batch via `IntakePromptService.getUniversalBatch()`
    2. Evaluate universal batch with 4 judges + meta-judge
    3. Generate AI batch 2 via `IntakePromptService.generateNextBatch(goal, simulatedBatch1Answers, 2)`
    4. Evaluate AI batch with 4 judges + meta-judge
    5. Evaluate gold standard batch with 4 judges + meta-judge
    6. Compute deltas: AI scores vs gold standard scores per axis
  - All judge calls use `appConfig.eval.judgeModel` and `appConfig.eval.judgeTemperature`
  - Notes: Inject `AiService` and `IntakePromptService` via constructor.

- [x] Task 7: Create eval module
  - File: `src/eval/eval.module.ts` (NEW)
  - Action: Create `EvalModule` that imports `IntakeModule` (for `IntakePromptService`) and provides `EvalService`. Do NOT add `@Global()`. Do NOT add to `AppModule` imports — this module is only used by the CLI runner.
  - Notes: `AiModule` is global, no import needed.

- [x] Task 8: Create CLI runner
  - File: `src/eval/run-eval.ts` (NEW)
  - Action: Standalone script that:
    1. Bootstraps NestJS with `NestFactory.createApplicationContext(EvalModule)`
    2. Gets `EvalService` from the app context
    3. Calls `evalService.runFullEval()`
    4. Writes markdown report to `_bmad-output/eval-report-{ISO-timestamp}.md`
    5. Prints console summary (per-goal composite scores + overall grade)
    6. Closes app context and exits
  - Notes: Uses `ConfigModule` for env vars (OPENROUTER_API_KEY). Import `AppModule` instead of `EvalModule` to get full DI chain (ConfigModule, AiModule, IntakeModule all wired up).

- [x] Task 9: Add npm script
  - File: `package.json`
  - Action: Add `"eval": "npx tsx src/eval/run-eval.ts"` to scripts.
  - Notes: `tsx` handles ESM TypeScript execution without build step. Install as devDependency if not present.

### Acceptance Criteria

- [x] AC 1: Given the CLI is run via `npm run eval`, when it completes, then a markdown report is written to `_bmad-output/eval-report-{timestamp}.md` containing per-batch scores across all 4 axes for all 5 test goals.

- [x] AC 2: Given the same prompt and model are used, when the eval runs twice, then judge scores are deterministic (temperature 0) and composite scores are within ±0.05 variance.

- [x] AC 3: Given a gold standard questionnaire is evaluated, when scores are returned, then it scores higher than the AI-generated batch on at least 3 of 4 axes for each test goal.

- [x] AC 4: Given the production prompt is modified, when the eval is re-run, then the delta between runs is visible in the report showing which axes improved or degraded.

- [x] AC 5: Given `AiService.generateJSON()` is called with temperature 0, when the OpenRouter API receives the request, then the temperature parameter is included in the request body.

- [x] AC 6: Given the eval runner starts, when it bootstraps, then it does NOT start an HTTP server — only the application context for DI.

## Additional Context

### Dependencies

- No new npm packages except `tsx` (devDependency) if not already installed
- `AiService` (global) — already available
- `IntakePromptService` — exposed via IntakeModule exports (Task 3)
- OpenRouter API key with access to both `anthropic/claude-opus-4.6` and `x-ai/grok-4.1-fast`

### Testing Strategy

This is a dev tool — no unit tests required. Correctness is verified by:
- Gold standards consistently scoring higher than AI-generated batches (sanity check)
- Deterministic scores across runs (temperature 0)
- Human review of meta-judge rewrites and verdicts
- Run once, inspect report, iterate

### Notes

**Cost per run:** ~$1.82 (75 judge calls via Opus 4.6 at $5/$25 per M tokens + 5 Grok generation calls)

**Scoring framework (4 axes, 16 dimensions):**

| Axis | Judge | Dimensions |
|------|-------|------------|
| Information Density | Coach | unique_dimensions, actionability, redundancy, inference_potential |
| Cognitive Load | Cognitive Psychologist | recall_vs_analysis, recognition_vs_generation, question_clarity, answer_effort |
| Psychological Safety | Therapist | shame_risk, honesty_likelihood, normalization, defensiveness_trigger |
| Emotional Leverage | Dropout Predictor | precipitating_event, identity_vs_behavior, emotional_anchor, commitment_signal |

**Report structure:**

```
# Prompt Eval Report — {timestamp}

## Summary
| Goal | AI Composite | Gold Composite | Delta | Grade |
|------|-------------|----------------|-------|-------|

## Per-Goal Details

### Goal 1: {description}

#### Universal Batch (Batch 1)
| Axis | Score | Details |
...

#### AI-Generated Batch (Batch 2)
| Axis | Score | Details |
...

#### Gold Standard Batch
| Axis | Score | Details |
...

#### Meta-Judge Verdict
- Weakest question: ...
- Strongest question: ...
- Missing dimensions: ...
- Suggested rewrite: ...
- Grade: ...
```

---

## Appendix A: Persona Judge Prompts

### Judge 1: The Coach (Information Density)

**System Prompt:**
```
You are a veteran life coach with 20 years of experience onboarding 10,000+ clients. You evaluate intake questions purely on how much actionable coaching data each question extracts. You are ruthless about redundancy — if two questions yield overlapping insights, that's a failure.

You will receive a goal description, a batch of intake questions, and optionally a gold standard batch for comparison.

Score each dimension from 0.0 to 1.0 with per-question justification:

1. **unique_dimensions** — Does each question open a distinct coaching dimension? Score 1.0 if every question targets something different (motivation, constraints, resources, timeline, environment, failure patterns, identity, etc.). Score 0.0 if multiple questions mine the same vein.

2. **actionability** — Could a coach start building a plan from these answers alone, without needing clarification? Score 1.0 if every answer maps to a concrete coaching action. Score 0.0 if answers would be vague platitudes.

3. **redundancy** — Is there zero overlap between questions in THIS batch AND with the prior batch context provided? Score 1.0 if every question asks something genuinely new. Score 0.0 if questions rephrase what was already asked.

4. **inference_potential** — Do the questions reveal things the user didn't explicitly say? For example, "What would you need to give up?" reveals sacrifice willingness AND competing priorities from a single answer. Score 1.0 if most questions extract hidden signals beyond the literal answer.

IMPORTANT: Score each question individually, then average for the batch score.

Respond with ONLY a JSON object:
{
  "unique_dimensions": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "actionability": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "redundancy": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "inference_potential": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "composite": 0.0
}
```

### Judge 2: The Cognitive Psychologist (Cognitive Load)

**System Prompt:**
```
You are a cognitive psychologist specializing in survey design and cognitive load theory. You evaluate whether intake questions ask for recall (easy) or analysis (hard). You know that humans are terrible at: self-assessment, computing averages about their own behavior, abstract reasoning about their habits, and answering "why" questions about themselves. Good questions ask for specific events, concrete behaviors, or recognition (choosing from options) rather than generation (composing essays).

Score each dimension from 0.0 to 1.0 with per-question justification:

1. **recall_vs_analysis** — Does the question ask for a specific memory or event (recall = 1.0), or does it force the user to analyze/summarize their own behavior (analysis = 0.0)? Examples: "What was the last thing you ate?" (recall, 1.0) vs "What are your eating habits?" (analysis, 0.0). "When did you last exercise?" (recall, 1.0) vs "How often do you exercise?" (analysis, 0.0).

2. **recognition_vs_generation** — Can the user answer by selecting from options (recognition = 1.0), or must they compose a free-text response from scratch (generation = 0.0)? Note: text questions CAN score high here if they ask for something very specific and concrete ("Name one song you'd want to play"). Scale and choice questions score 1.0 by default. Vague open text ("Describe your goals") scores 0.0.

3. **question_clarity** — Could a 14-year-old understand this question on first read? Score 1.0 for plain language with no jargon, no compound clauses, and a single clear ask. Score 0.0 for questions with multiple embedded sub-questions, technical language, or ambiguous phrasing.

4. **answer_effort** — Can this be answered in under 30 seconds without deep thought? Score 1.0 for instant-answer questions (choice, scale, simple recall). Score 0.0 for questions that require introspection, research, or lengthy composition.

Respond with ONLY a JSON object:
{
  "recall_vs_analysis": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "recognition_vs_generation": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "question_clarity": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "answer_effort": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "composite": 0.0
}
```

### Judge 3: The Therapist (Psychological Safety)

**System Prompt:**
```
You are a clinical therapist specializing in motivational interviewing. You evaluate whether intake questions make people defensive, ashamed, or aspirational (answering as who they wish they were instead of who they are). You know that: direct questions about failure trigger ego protection; people lie about habits when they feel judged; normalizing language ("most people struggle with...") dramatically increases honesty; and the best questions make it safe to admit the ugly truth.

Score each dimension from 0.0 to 1.0 with per-question justification:

1. **shame_risk** (INVERTED — 1.0 = safe, 0.0 = shame-inducing) — Could this question make someone feel bad about themselves? Questions about weight, finances, failed relationships, or past attempts are inherently risky. Score 1.0 if the framing actively protects dignity (uses normalizing language, treats struggle as data). Score 0.0 if the question could make someone defensive or want to lie.

2. **honesty_likelihood** — Will the user answer truthfully, or give the socially desirable "right" answer? "How often do you exercise?" invites inflation. "What did you do after work yesterday?" gets truth. Score 1.0 if the question structure makes honest answers the path of least resistance. Score 0.0 if it practically begs for aspirational lying.

3. **normalization** — Does the framing validate that struggle, failure, or imperfection is expected and normal? Look for phrases like "most people," "it's common to," "when this happens." Score 1.0 if failure is explicitly treated as a common data point. Score 0.5 if neutral. Score 0.0 if the question implies the user should have done better.

4. **defensiveness_trigger** (INVERTED — 1.0 = safe, 0.0 = interrogation) — Does this feel like a conversation with a supportive friend, or like being questioned by an authority figure? "Why did you fail?" = interrogation (0.0). "When you stopped last time, was it sudden or gradual?" = conversation (1.0). Score based on tone, framing, and whether the user would feel safe giving an honest, unflattering answer.

Respond with ONLY a JSON object:
{
  "shame_risk": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "honesty_likelihood": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "normalization": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "defensiveness_trigger": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "composite": 0.0
}
```

### Judge 4: The Dropout Predictor (Emotional Leverage)

**System Prompt:**
```
You are a behavioral economist who studies app abandonment and habit formation. You evaluate whether the intake captures the emotional fuel that will sustain the user past week 3 — the critical drop-off point. You know that: goals without a precipitating event ("why NOW?") have 3x higher abandonment; identity-level goals ("I want to BE a runner") sustain better than behavior-level goals ("I want to run 3x/week"); concrete emotional anchors beat abstract aspirations; and commitment signals (what they'll sacrifice) predict follow-through better than motivation statements.

Score each dimension from 0.0 to 1.0 with per-question justification:

1. **precipitating_event** — Does the batch surface what triggered the user to sign up NOW (not last month, not next month)? Score 1.0 if a question directly asks about the recent trigger. Score 0.5 if motivation is asked generally. Score 0.0 if no question distinguishes "why this goal" from "why now."

2. **identity_vs_behavior** — Does the batch distinguish whether the user wants to DO something (behavior: "run 3x/week") or BE something (identity: "be an athlete")? Score 1.0 if a question probes this distinction. Score 0.0 if all questions assume behavior-level framing.

3. **emotional_anchor** — Is there a question that creates a specific, visceral image of success? "Play one specific song," "Wear that outfit," "Walk up stairs without panting." Score 1.0 if the anchor is concrete and personal. Score 0.5 if success is defined abstractly. Score 0.0 if no anchor exists.

4. **commitment_signal** — Does the batch reveal what the user is willing to sacrifice or change? "What would it replace?" or "What would you give up?" Score 1.0 if a question extracts a concrete trade-off. Score 0.0 if the batch only asks what they want, never what they'll pay.

Respond with ONLY a JSON object:
{
  "precipitating_event": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "identity_vs_behavior": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "emotional_anchor": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "commitment_signal": { "score": 0.0, "per_question": [{"q": 1, "score": 0.0, "reason": "..."}] },
  "composite": 0.0
}
```

### Meta-Judge: The Synthesizer

**System Prompt:**
```
You are a chief product officer reviewing intake question quality for a coaching platform. You have received detailed scores from 4 expert judges who each evaluated a batch of questions from a different perspective:

1. The Coach (Information Density) — how much actionable data each question extracts
2. The Cognitive Psychologist (Cognitive Load) — how easy each question is to answer
3. The Therapist (Psychological Safety) — how safe each question is to answer honestly
4. The Dropout Predictor (Emotional Leverage) — how well the batch captures emotional fuel for sustained motivation

Your job is to synthesize their scores into an actionable verdict.

You will receive the original batch of questions, the goal description, and all 4 judges' scored results.

Respond with ONLY a JSON object:
{
  "weakest_question": {
    "index": 1,
    "original": "The question text",
    "reason": "Why this is the weakest across all 4 axes",
    "improved_version": "A rewritten version that addresses the weaknesses",
    "improvement_rationale": "What specifically was changed and why"
  },
  "strongest_question": {
    "index": 1,
    "original": "The question text",
    "reason": "Why this is the strongest — what makes it effective across all 4 axes"
  },
  "missing_dimensions": ["List of coaching/psychological dimensions NOT covered by this batch"],
  "batch_personality": "1-2 sentences describing the overall character of this batch (e.g., 'Heavy on logistics, light on emotion' or 'Good psychological safety but low information density')",
  "overall_grade": "A|B|C|D|F",
  "grade_rationale": "2-3 sentences justifying the grade with specific evidence from the judges' scores"
}
```

### User Prompt Template (shared across all persona judges)

```
## Goal
{goalDescription}

## Batch Under Evaluation (Batch {batchNumber})
{questions.map((q, i) => `${i + 1}. [${q.question_type}] ${q.question_text}${q.config?.options ? '\n   Options: ' + q.config.options.join(' / ') : ''}`).join('\n')}

## Prior Batch Context
{priorContext || 'None — this is the first batch.'}

## Gold Standard Reference (what an ideal batch looks like for this domain)
{goldStandard.questions.map((q, i) => `${i + 1}. [${q.question_type}] ${q.question_text}${q.config?.options ? '\n   Options: ' + q.config.options.join(' / ') : ''}\n   Rationale: ${q.rationale}`).join('\n')}

Score the "Batch Under Evaluation" against the criteria in your system prompt. Use the Gold Standard as a reference for what excellence looks like in this domain, but score the batch on its own merits.
```

---

## Appendix B: Gold Standard Questionnaires

### Gold Standard 1: Weight Loss

**Domain:** High Shame / High Failure
**Goal:** "Lose 20lbs and get back in shape"

| # | Type | Question | Options | Rationale |
|---|------|----------|---------|-----------|
| 1 | single_choice | To help us calibrate, when was the last time you felt physically energetic and comfortable in your body? | 6 months ago / 1-2 years ago / 3+ years ago / I've never really felt that way | Establishes baseline without asking for a number. "Never" vs "6 months" radically changes coaching strategy. |
| 2 | single_choice | When you look at your current average week, where is the biggest "energy leak" that stops you from exercising? | Work leaves me mentally drained / Family duties take up every spare minute / I have free time but I just doom-scroll / I get enough sleep but still wake up tired | Identifies blocker type: Mental fatigue vs Time scarcity vs Procrastination. |
| 3 | single_choice | Most people drift off their diet after 3 weeks. When you've stopped in the past, what usually triggers it? | A stressful event made me "stress eat" / I was too hungry and binged / The meal prep was too complicated / Social events (dinners/drinks) derailed me | Normalizes failure. Distinguishes emotional eating from logistical friction. |
| 4 | text | Honest check: What specific moment in the last 7 days made you say "Okay, enough is enough, I need to fix this"? | — | Finds the precipitating event. Massive coaching leverage. |
| 5 | single_choice | Imagine it's 3 months from now and you've hit your first goal. What is the one specific thing you are most excited to do? | Wear a specific outfit hiding in my closet / Walk up stairs without getting winded / Feel confident in photos / Have energy to play with my kids | Concrete emotional anchor. Moves from abstract "weight loss" to visceral reward. |

**Simulated Batch 1 Answers** (for generating AI batch 2):
```
Q: What motivated you to set this goal? → "I saw a photo of myself at a family event and didn't recognize myself. I used to be active and I miss that version of me."
Q: Hours per week? → 6
Q: What does success look like? → "Fitting into my old clothes and having energy to play with my kids without getting winded."
Q: Timeline? → "3-6 months"
Q: Attempted before? → "Yes, multiple times"
```

### Gold Standard 2: Career Pivot

**Domain:** High Anxiety / Identity
**Goal:** "Switch from a stable accounting job to UX design"

| # | Type | Question | Options | Rationale |
|---|------|----------|---------|-----------|
| 1 | single_choice | Which of these tasks currently drains your battery the fastest? | Meetings & Politics / Repetitive Admin work / Dealing with angry clients / Being micromanaged / The sheer volume of work | Defines the "Push" factor. What they hate is easier to articulate than what they love. |
| 2 | single_choice | If you had to spend 5 hours learning UX design this week, when would it actually happen? | Before work (early mornings) / Lunch breaks / After work (sacrificing relaxation) / Weekends only | Reality check. "After work" = burnout risk. "Weekends" = slow progress. |
| 3 | single_choice | When you think about making this jump, what is the "3 a.m. worry" that keeps you up? | That I'm not actually good enough (Imposter Syndrome) / That I'll run out of money / That I'll regret leaving my safe job / That I'm too old to start over | Primary fear blocker. Allows coach to address the emotional elephant immediately. |
| 4 | single_choice | Are you looking to change what you do (new role) or where you do it (new industry)? | Same role, cooler industry / Totally new role, same industry / Total reinvention (new role & industry) / I'm not sure yet | Scope of pivot. "Total reinvention" requires 10x more energy. |
| 5 | text | If we succeed, what does your ideal Tuesday morning look like in 6 months? | — | Concrete lifestyle visualization. Sustains motivation through job hunting. |

**Simulated Batch 1 Answers:**
```
Q: What motivated you to set this goal? → "I've been doing accounting for 8 years and I dread Monday mornings. I've always been drawn to design but never pursued it."
Q: Hours per week? → 8
Q: What does success look like? → "Landing a junior UX role at a tech company, even if it means a pay cut initially."
Q: Timeline? → "6-12 months"
Q: Attempted before? → "No, this is my first time"
```

### Gold Standard 3: Language Learning

**Domain:** High Boredom / Drop-off
**Goal:** "Learn Spanish for an upcoming trip to Mexico"

| # | Type | Question | Options | Rationale |
|---|------|----------|---------|-----------|
| 1 | single_choice | How much Spanish do you actually know right now? | Zero (Hola = Hello) / Survival (Can order a beer) / Conversational (Can chat but with mistakes) / Rusty (I took it in school 10 years ago) | Faster and more accurate than a 1-10 scale. "Rusty" implies reactivatable knowledge. |
| 2 | single_choice | We know language apps can get boring. If you've tried before, why did you stop? | I felt like I wasn't making progress / The gamification annoyed me / I got busy and missed a streak / I didn't have anyone to practice with | Failure mode: Lack of feedback vs Lack of utility vs Schedule slip. |
| 3 | single_choice | To get results, you need "input" (listening/reading). How do you currently commute or spend downtime? | Driving (Audio only) / Public Transit (Can read/watch) / Walking (Audio only) / I work from home (No commute) | Hidden resource constraint. Can't assign reading exercises to a driver. |
| 4 | single_choice | What is the specific interaction you are visualizing having on your trip? | Ordering food like a local / Chatting with a taxi driver / Flirting or making friends / Just not looking like a clueless tourist | "Flirting" vs "Not looking clueless" = Approach vs Avoidance motivation. |
| 5 | single_choice | Realistically, how much "embarrassment" are you willing to tolerate to learn faster? | None, I want to be perfect before I speak / A little, I'll speak if I have to / I don't care, I'll talk to anyone even if I look silly | #1 predictor of language success. "None" is a major red flag. |

**Simulated Batch 1 Answers:**
```
Q: What motivated you to set this goal? → "Going to Mexico City in 4 months for a friend's wedding. I don't want to rely on everyone else to translate."
Q: Hours per week? → 5
Q: What does success look like? → "Being able to have a basic conversation with locals without pulling out Google Translate every 10 seconds."
Q: Timeline? → "3-6 months"
Q: Attempted before? → "Yes, once or twice"
```

### Gold Standard 4: Saving Money

**Domain:** High Guilt / Avoidance
**Goal:** "Save $10,000 for a house deposit"

| # | Type | Question | Options | Rationale |
|---|------|----------|---------|-----------|
| 1 | text | Without looking at your app, what was the last purchase you made that you instantly regretted? | — | Low cognitive load (easy memory) but high emotional signal. Reveals impulse trigger category. |
| 2 | single_choice | Everyone has a "blind spot" with money. What's yours? | Emotional spending (stress/happy) / Social spending (drinks/dinners) / Fixed costs are too high (rent/car) / I simply don't earn enough yet | Removes shame by calling it a "blind spot." Distinguishes Behavioral vs Structural problems. |
| 3 | single_choice | When do you usually deal with your finances? | I check my app daily / I check once a month / I avoid looking until I have to / When my card gets declined | Measures Financial Anxiety. Avoidance is a key psychological barrier. |
| 4 | single_choice | Why is buying a house important to you personally (not just financially)? | Stability (No landlord) / Freedom to renovate / Building wealth for family / Social status | "Stability" needs conservative plan. "Status" implies different timeline pressure. |
| 5 | text | What is the first thing you will do when you get the keys? | — | Emotional reward hook. Creates visceral anchor. |

**Simulated Batch 1 Answers:**
```
Q: What motivated you to set this goal? → "My rent just went up again and I'm tired of making someone else rich. I want something that's mine."
Q: Hours per week? → 3
Q: What does success look like? → "Having $10k in a dedicated savings account and knowing exactly where my money goes each month."
Q: Timeline? → "12+ months"
Q: Attempted before? → "Yes, but I always gave up"
```

### Gold Standard 5: Dating

**Domain:** High Rejection Fear / Vulnerability
**Goal:** "Find a serious long-term partner"

| # | Type | Question | Options | Rationale |
|---|------|----------|---------|-----------|
| 1 | single_choice | Think of the last decent date you went on. What made it "good"? | Great conversation flow / Physical attraction / Shared values / We laughed a lot | Defines priority filter: Intellectual vs Physical vs Emotional. |
| 2 | single_choice | In past relationships, what is the pattern that usually causes the end? | We drifted apart (Boredom) / Constant conflict (Incompatibility) / Trust issues / I lost myself in the relationship (Codependency) | High-density psychological profiling. "Codependency" is a massive coaching signal. |
| 3 | single_choice | Dating takes time. How many evenings per week are you actually willing to give up for dates? | 1 night max / 2-3 nights / I'm free whenever / I'm honestly too busy to date right now | "Too busy" = goal is unrealistic until schedule changes. |
| 4 | single_choice | Why are you looking now? | I'm tired of being alone / All my friends are pairing up / I want to start a family soon / I finally feel ready after a breakup | "Friends pairing up" = External FOMO. "I feel ready" = Internal growth. |
| 5 | single_choice | If you saw someone attractive at a coffee shop today, what would you honestly do? | Go say hi immediately / Make eye contact and hope they come over / Look away and check my phone / Leave | Initiation Confidence assessment. Coach needs to know: find matches or act on matches? |

**Simulated Batch 1 Answers:**
```
Q: What motivated you to set this goal? → "I just turned 30 and realized I've been so focused on my career that I haven't built the personal life I actually want."
Q: Hours per week? → 6
Q: What does success look like? → "Being in a relationship where I feel genuinely excited to come home to someone."
Q: Timeline? → "6-12 months"
Q: Attempted before? → "Yes, once or twice"
```
