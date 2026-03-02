---
title: 'Goal Intake System'
slug: 'goal-intake-system'
created: '2026-02-08'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['NestJS 11', 'TypeScript (ESM/nodenext)', 'Supabase (DB + Auth + pgvector)', 'OpenRouter (via OpenAI SDK)', 'Jest']
files_to_modify: ['Clean slate — all files to be created']
code_patterns: ['.js import extensions', 'Global modules (Supabase, AI)', 'AuthGuard + UserId decorator', 'ValidationPipe whitelist/transform', '/api global prefix', 'RLS with (select auth.uid())']
test_patterns: ['Jest unit tests', 'Dedicated intake-quality prompt regression suite']
---

# Tech-Spec: Goal Intake System

**Created:** 2026-02-08

## Overview

### Problem Statement

The coaching AI needs rich, structured context about a user and their goal to provide effective mentoring. This context feeds into a larger system of milestones (monthly) → weeks → days, requiring both immediate readability and long-term semantic queryability. At goal creation time, this context doesn't exist — it must be gathered through a deliberate intake process.

### Solution

A multi-batch intake flow combining a hardcoded universal first batch with AI-generated subsequent batches. The AI consumes a persistent user profile (optional free text about the user), the goal description, and all prior answers to generate increasingly targeted questions. Stores raw answers in Supabase tables for traceability and embeds context via pgvector for semantic retrieval across the coaching lifecycle. After intake completion, an AI-generated structured goal profile serves as the primary artifact consumed by the coaching system.

### Scope

**In Scope:**
- API endpoints for intake flow (get questions, submit answers, check completion)
- Persistent user profile with optional free-text field (carries across goals)
- Hardcoded universal first batch (no AI call, instant)
- AI-powered dynamic question generation for batches 2+ (based on user profile + goal + prior answers)
- Multiple question types (text, scale with AI-defined anchors, single_choice, multiple_choice)
- Dual storage: raw Q&A in Supabase tables + pgvector embeddings in same database
- AI-generated goal profile (structured JSON + narrative summary) at intake completion
- Goal status tracking through intake lifecycle (including intermediate and error states)
- AI self-termination logic (target 3-5 batches, hard cap at 7)
- Quality evaluation framework (structural validation + async LLM-as-judge scoring)
- Prompt regression test suite (`npm run test:intake-quality`)
- Rate limiting on AI-calling endpoints
- Goal deletion for in-progress/failed intakes
- Answer-type cross-validation against question constraints
- AI call timeout and fallback resilience

**Out of Scope:**
- Coaching system (milestones/weeks/days — consumes the profile, built later)
- Frontend implementation (they adapt to our API contract)
- User authentication setup (Supabase RLS already handled)
- Coach persona selection (separate app feature, outside intake)

## Context for Development

### Codebase Patterns

- NestJS 11 + TypeScript (ESM with `nodenext` module resolution)
- All imports use `.js` extension (e.g., `./goal.service.js`)
- Supabase for DB + auth, OpenRouter for AI (via OpenAI SDK)
- Global prefix: `/api` (set in main.ts)
- ValidationPipe with `whitelist`, `forbidNonWhitelisted`, `transform`
- `SupabaseModule` and `AiModule` are `@Global()` — no need to import them
- Auth: `@UseGuards(AuthGuard)` + `@UserId()` decorator for user ID extraction
- RLS policies use `(select auth.uid())` instead of `auth.uid()`

### Project Structure (Clean Slate)

```
src/
  app.module.ts
  main.ts
  supabase/
    supabase.module.ts          # @Global()
    supabase.service.ts
  ai/
    ai.module.ts                # @Global()
    ai.service.ts
  common/
    guards/auth.guard.ts
    decorators/user.decorator.ts
  user-profile/
    user-profile.module.ts
    user-profile.controller.ts
    user-profile.service.ts
    dto/
      update-profile.dto.ts
  goal/
    goal.module.ts
    goal.controller.ts
    goal.service.ts
    dto/
      create-goal.dto.ts
  intake/
    intake.module.ts
    intake.controller.ts
    intake.service.ts
    intake-prompt.service.ts     # prompt templates + AI question generation
    intake-quality.service.ts    # structural/semantic validation + async LLM-judge
    dto/
      submit-answers.dto.ts
    testing/
      fixtures/
      evaluators/
      baselines/
      intake-quality.spec.ts
```

### Database Migrations (Supabase)

1. Enable `pgvector` extension
2. `user_profiles` — persistent user profile with free-text
3. `goals` — goal creation + status lifecycle (including `profile_generating` and `profile_generation_failed`)
4. `intake_batches` — batch rounds with sequence, quality scores, `UNIQUE(goal_id, batch_number)`, and `embedded` tracking
5. `intake_questions` — questions per batch (type, options, scale config)
6. `intake_answers` — answers linked to questions (polymorphic storage)
7. `goal_profiles` — AI-generated summary at intake completion, with `embedded` tracking
8. `goal_context_embeddings` — pgvector table with `source_type` discriminator
9. RLS policies for all tables
10. Indexes on FK columns used in RLS subqueries

### Architecture Decision

**Conventional (Feature-based) NestJS structure.** One folder per feature module with co-located controllers, services, and DTOs. No hexagonal/clean architecture — the NestJS framework already provides DI, modular boundaries, and testability. Avoids boilerplate overhead (ports, adapters, use-case classes) that doesn't pay off at this project's scale. If a service grows complex, split by responsibility within the module (e.g., `intake-prompt.service.ts`, `intake-quality.service.ts`). AI provider swapping is handled at the `AiService` level — one service, one swap point — no port interface needed. Can evolve individual modules to stricter patterns later if complexity justifies it.

**Module dependency graph:**
- `SupabaseModule` (global) — no imports needed
- `AiModule` (global) — no imports needed
- `UserProfileModule` — standalone
- `GoalModule` — standalone
- `IntakeModule` — imports `GoalModule` + `UserProfileModule`

### Technical Decisions

- **OpenRouter via OpenAI SDK** — model can be swapped easily per request. OpenRouter is a multi-model router, so provider/model switching is a config change, not an architecture change. If ever moving off OpenRouter, refactor one service file.
- **AI call timeout** — all OpenRouter calls use a 30-second `AbortController` timeout. Configurable via `AI_CALL_TIMEOUT_MS` env var (default 30000). On timeout, the calling service falls through to its failure/fallback path (fallback batch for question generation, `profile_generating` status for profile generation).
- **Rate limiting** — `@nestjs/throttler` enforces per-user rate limits. Global default: 60 requests/minute per user. Tighter limit on AI-triggering endpoints (`submit-batch`, `next-batch`): 10 requests/minute per user. Prevents abuse and runaway AI costs.
- **pgvector in Supabase** — no separate vector DB; enable the `vector` extension and add embedding columns. Single database for both relational and semantic queries.
- **Embedding model** — `text-embedding-3-small` via OpenRouter. Dimension: 1536. This is locked — changing models requires re-embedding all data.
- **Dual storage** — raw Q&A in structured Supabase tables (traceability, re-processing) + pgvector embeddings per batch chunk for semantic retrieval across the full coaching lifecycle
- **Persistent user profile** — `user_profiles` table with optional free-text field. User writes it once (onboarding or anytime), persists across all goals. The intake AI prompt receives: user profile + goal description + prior answers. The AI must not re-ask topics already covered in the profile.
- **Hardcoded batch 1** — universal questions (motivation, time commitment, timeline, desired outcome, history) served instantly with no AI round-trip. Exact questions defined below in "Universal Batch 1 Questions."
- **AI-generated batches 2+** — AI reads user profile + goal + all prior answers, generates 3-5 questions, returns `complete: true/false` flag. Self-terminates when sufficient context gathered. Must explicitly avoid redundancy with user profile content.
- **Batch budget** — target completion in 3-5 batches (including universal), hard cap at 7. AI should progressively raise its bar for "is this question worth asking" as batches increase. Late batches should tighten up (fewer questions, more quick-tap types). Rich user profiles may reduce total batches needed.
- **Dynamic scale values** — scale question type includes AI-defined min/max and human-readable anchor labels (e.g., "Couch potato → Marathon runner"), not hardcoded 1-10
- **Question types** — text, scale (AI-defined anchors), single_choice, multiple_choice
- **Goal profile output** — structured JSON sections (current_state, desired_state, constraints, motivation, domain_context) plus a narrative summary. Generated by a dedicated AI call consuming all raw answers at intake completion. **Validated after generation**: all five keys must exist and be non-empty strings. On validation failure, retry AI call once.
- **Embedding strategy** — embed user profile text, each batch's Q&A as a chunk, and the final goal profile into `goal_context_embeddings` with a `source_type` discriminator. **User profile embeddings are global** (`goal_id = NULL`, `source_type = 'user_profile'`, one per user). Semantic search queries use `WHERE user_id = $1 AND (goal_id = $2 OR goal_id IS NULL)` to include both goal-specific and user-level context. Later milestones/check-ins embed into the same table for unified semantic search.
- **Embedding tracking** — `intake_batches` and `goal_profiles` tables include an `embedded` boolean (default `false`) flipped to `true` on successful embedding. Enables discovery of missed embeddings via `SELECT * FROM intake_batches WHERE embedded = false`. A manual admin endpoint provides re-embedding for missed entries.
- **Transaction boundaries** — the `submit-batch` flow uses two transactions. **Transaction 1**: store answers + mark current batch as answered (always commits — answers are valid data). **Transaction 2**: generate + store next batch, or generate profile + update goal status. If Transaction 2 fails, answers are preserved and the user can retry via `next-batch` or `retry-profile`.

### Universal Batch 1 Questions

These are the exact hardcoded questions for batch 1. No AI call, served instantly:

1. **"What motivated you to pursue this goal right now?"**
   - Type: `text`
   - Placeholder: `"What's driving you?"`

2. **"How much time per week can you realistically dedicate to this?"**
   - Type: `scale`
   - `scale_min`: 1, `scale_max`: 5
   - `scale_labels`: `{"1": "< 1 hour", "2": "1-3 hours", "3": "3-5 hours", "4": "5-10 hours", "5": "10+ hours"}`

3. **"What does success look like for you?"**
   - Type: `text`
   - Placeholder: `"Describe your ideal outcome"`

4. **"When do you want to achieve this by?"**
   - Type: `single_choice`
   - Options: `["1 month", "3 months", "6 months", "1 year", "No specific deadline"]`

5. **"Have you attempted this goal before?"**
   - Type: `single_choice`
   - Options: `["No, first time", "Yes, once", "Yes, multiple times"]`

### Intake Flow Sequence

1. **User creates profile** (onboarding, optional free text — can update anytime)
2. **User creates a goal** ("Run a marathon in 6 months")
3. **Intake kicks in**: AI has user profile + goal description from the start
4. **Batch 1**: Universal hardcoded questions (instant, no AI call)
5. **Batches 2+**: AI-generated, informed by profile + goal + all prior answers
6. **Intake completes**: Status flips to `profile_generating`, AI generates goal profile
7. **Profile generated**: Goal profile stored, status flips to `intake_completed`
8. **Profile generation fails** (after 3 attempts): Status flips to `profile_generation_failed`, user can retry or delete goal

### Intake Dimensions (what the intake must capture)

1. **Current state** — baseline relevant to the goal domain
2. **Desired state** — concrete success criteria
3. **Constraints** — time, resources, competing priorities
4. **Motivation** — emotional why, what's at stake
5. **History** — past attempts, what worked, what didn't

### API Contract

#### `GET /api/user-profile`
Returns the user's persistent profile (auto-creates if none exists).
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "free_text": "I'm a 32-year-old engineer...",
  "created_at": "...",
  "updated_at": "..."
}
```

#### `PATCH /api/user-profile`
Request: `{ "free_text": "..." }`
Response: updated profile object.

#### `POST /api/goals`
Request: `{ "title": "Run a marathon", "description": "In 6 months" }`
Response: created goal with `status: "intake_in_progress"`.

#### `GET /api/goals`
Returns paginated array of user's goals with status.
Query params: `?limit=20&offset=0` (defaults: limit=20, offset=0).
```json
{
  "data": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### `GET /api/goals/:goalId`
Returns single goal with status.

#### `DELETE /api/goals/:goalId`
Deletes a goal. Only allowed when status is `intake_in_progress`, `profile_generating`, or `profile_generation_failed`. Returns 400 if goal is in `intake_completed` or `active` status. Cascading deletes remove all associated batches, questions, answers, profile, and embeddings.
Response: `204 No Content`

#### `GET /api/goals/:goalId/intake/next-batch`
Returns the next unanswered batch of questions. If a batch exists but has no answers submitted, that batch is re-served (not skipped). The `batch_id` field enables the client to detect re-served batches via local caching.
```json
{
  "batch_id": "uuid",
  "batch_number": 1,
  "total_batches_completed": 0,
  "is_complete": false,
  "questions": [
    { "id": "uuid", "type": "scale", "text": "...", "scale_min": 1, "scale_max": 5, "scale_labels": { "1": "Beginner", "5": "Expert" } },
    { "id": "uuid", "type": "single_choice", "text": "...", "options": ["...", "..."] },
    { "id": "uuid", "type": "text", "text": "...", "placeholder": "..." }
  ]
}
```
If intake already complete: `{ "is_complete": true, "goal_status": "intake_completed" }`

#### `POST /api/goals/:goalId/intake/submit-batch`
Submits answers and returns the next batch inline (saves a round-trip).

**Answer validation**: each answer's `question_id` is verified to belong to the current unanswered batch for this goal owned by this user (join through `intake_questions → intake_batches → goals`). Answer values are cross-validated against their question type:
- `text` → `text_value` required, non-empty
- `scale` → `numeric_value` required, must be within `[scale_min, scale_max]`
- `single_choice` → `selected_options` required, exactly 1 item, value must exist in question's `options`
- `multiple_choice` → `selected_options` required, 1+ items, all values must exist in question's `options`

Returns 400 with specific errors on validation failure. Returns 409 if the batch has already been submitted (Postgres unique constraint violation on `intake_batches(goal_id, batch_number)`).

Request:
```json
{
  "answers": [
    { "question_id": "uuid", "text_value": "I want to be healthier" },
    { "question_id": "uuid", "numeric_value": 3 },
    { "question_id": "uuid", "selected_options": ["time", "motivation"] }
  ]
}
```

Response (intake continues):
```json
{
  "submitted_batch": 1,
  "next_batch": {
    "batch_id": "uuid",
    "batch_number": 2,
    "total_batches_completed": 1,
    "is_complete": false,
    "questions": [...]
  }
}
```

Response (intake completes):
```json
{
  "submitted_batch": 4,
  "next_batch": {
    "is_complete": true,
    "goal_status": "intake_completed",
    "profile_id": "uuid"
  }
}
```

#### `POST /api/goals/:goalId/intake/retry-profile`
Retries goal profile generation for goals stuck in `profile_generating` or `profile_generation_failed` status. Increments `profile_generation_attempts`. Returns 400 if attempts >= 3 (terminal failure) or if goal is not in a retryable status.

Response (success):
```json
{
  "goal_status": "intake_completed",
  "profile_id": "uuid"
}
```

Response (failure, attempts remaining):
```json
{
  "goal_status": "profile_generating",
  "attempts": 2,
  "max_attempts": 3
}
```

#### `GET /api/goals/:goalId/profile`
Returns the AI-generated goal profile (available after intake completes).
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "profile_data": {
    "current_state": "...",
    "desired_state": "...",
    "constraints": "...",
    "motivation": "...",
    "domain_context": "..."
  },
  "narrative_summary": "...",
  "created_at": "..."
}
```
Returns 404 if intake is not complete.

### Data Model Sketch

- `user_profiles` — persistent user profile with optional free-text (`user_id` unique, one per user)
- `goals` — user goals with status tracking (`intake_in_progress` → `profile_generating` → `intake_completed` → `active`, with `profile_generation_failed` as error state). Includes `profile_generation_attempts` (int, default 0, max 3).
- `intake_batches` — each batch round, tracks sequence number, type (`universal`, `ai_generated`, `fallback`), quality scores, and `embedded` flag. `UNIQUE(goal_id, batch_number)` constraint prevents duplicate batch submissions.
- `intake_questions` — questions within each batch, stores type, options, scale config, display order
- `intake_answers` — answers linked to questions (text value, numeric value, selected options)
- `goal_profiles` — AI-generated summary document created at intake completion, with `embedded` flag
- `goal_context_embeddings` — pgvector table for embedded chunks (user profile, batch Q&A, goal profiles) with `source_type` discriminator. User profile embeddings have `goal_id = NULL` (global, one per user).

### Quality & Testing Strategy

#### Three-Layer Quality Framework

**Layer 1: Structural Validation (synchronous, every call)**
- Response parses as valid JSON
- Contains required fields (`questions` array, correct `type` values)
- 3-5 questions per batch
- Question types from allowed set
- Scale questions have `scale_min`, `scale_max`, `scale_labels`
- Choice questions have non-empty `options` array
- `is_complete` exists as boolean
- **On failure**: retry AI call once, then serve fallback batch

**Layer 2: Semantic Quality (synchronous, every call)**
- Questions are actual questions (interrogative structure)
- Questions are unique within batch (no near-duplicates)
- Choice options are distinct and non-overlapping
- Question type variety within batch (not all same type)

**Layer 3: Coaching Quality — LLM-as-Judge (async, fire-and-forget)**
- Runs via NestJS EventEmitter2 — emit `batch.served` event, listener evaluates in background
- User never waits for evaluation, questions served immediately
- Scores stored in `intake_batches` table for monitoring
- Dimensions scored 1-5:
  - **Relevance**: questions relevant to the stated goal
  - **Depth progression**: batch N deeper than batch N-1
  - **Dimension coverage**: intake dimensions covered across all batches
  - **Redundancy**: no re-asking of already-answered topics (including user profile content)
- Composite quality score (weighted normalized 0-1) for dashboards and alerting
- **`LOG.warn` when composite score drops below 0.5** — v1 alerting mechanism. Dashboard and alerting rules are future scope.

#### Fallback Batch Strategy

When AI question generation fails (after 1 retry), a fallback batch is served:
- `batch_type`: `'fallback'`
- Fallback batches **count toward the 7-batch hard cap**
- `getFallbackBatch()` cycles through a pool of **~10 pre-written open-ended text questions**, returning 2-3 per call. Consecutive fallbacks are never identical.
- Example fallback questions: "What's the biggest challenge you see?", "What resources do you have available?", "Is there anything else your coach should know?"

#### Prompt Regression Test Suite (`npm run test:intake-quality`)

- Dedicated Jest test suite, separate from unit tests
- Real AI calls with low temperature (0.1-0.3) for reproducibility
- 5 diverse fixture scenarios:
  1. Fitness — "Run a marathon in 6 months"
  2. Career — "Get promoted to senior engineer this year"
  3. Financial — "Save $20k for a house down payment"
  4. Creative — "Write and publish my first novel"
  5. Habit — "Quit smoking"
- Each fixture includes user profile variants (rich profile, empty profile, second goal with existing profile)
- Simulates full intake flow: batch 1 → mock answers → batch 2 → ... → completion
- Runs Layer 1 + 2 + 3 evaluations on every batch
- Compares against committed baseline scores — warns on regression
- **Not run in CI on every push** — manual trigger or pre-release check
- Long timeout (~120s per scenario)

```
src/intake/testing/
  fixtures/              # goal scenarios + mock answers
  evaluators/            # LLM-judge prompt templates
  baselines/             # last known-good scores per fixture
  intake-quality.spec.ts # the test suite
```

#### Production Resilience

- **Batch 1**: hardcoded — immune to AI failures
- **Batches 2+**: if AI call fails (including 30s timeout) after 1 retry, serve fallback batch from pre-written pool. User is never blocked.
- **Profile generation**: on failure, goal enters `profile_generating` status. User can retry up to 3 times via `retry-profile` endpoint. After 3 failures, status becomes `profile_generation_failed` — user can delete the goal and start over.
- Quality scores logged async — zero impact on response latency
- Embedding failures tracked via `embedded` boolean — missed embeddings discoverable and recoverable via admin endpoint

## Implementation Plan

### Tasks

- [ ] Task 1: Initialize NestJS project and configure base infrastructure
  - File: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.prettierrc`, `eslint.config.mjs`
  - Action: Scaffold NestJS 11 project with ESM + `nodenext` module resolution. Configure TypeScript strict mode, path aliases, and `.js` import extensions. Set up ESLint, Prettier. Add OpenAI SDK and Supabase JS client as dependencies.
  - Notes: Use `@nestjs/cli` to scaffold, then adjust tsconfig for ESM compatibility.

- [ ] Task 2: Create SupabaseModule (global)
  - File: `src/supabase/supabase.module.ts`, `src/supabase/supabase.service.ts`
  - Action: Create `@Global()` SupabaseModule. SupabaseService provides `getAdminClient()` using service role key from env vars and `getClientForUser(accessToken)` for RLS-scoped queries. Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment.
  - Notes: Admin client for server-side operations. User-scoped client passes JWT for RLS enforcement.

- [ ] Task 3: Create AiModule (global)
  - File: `src/ai/ai.module.ts`, `src/ai/ai.service.ts`
  - Action: Create `@Global()` AiModule. AiService wraps OpenAI SDK configured with OpenRouter base URL. Expose `generateJSON<T>(system, user, model?)` method that calls the LLM and parses JSON from the response. Expose `generateEmbedding(text)` for vector operations using `text-embedding-3-small` (1536 dimensions). Default chat model configurable via env var `DEFAULT_AI_MODEL`. Read `OPENROUTER_API_KEY` from environment. **All AI calls use a 30-second `AbortController` timeout**, configurable via `AI_CALL_TIMEOUT_MS` env var (default 30000).
  - Notes: `generateJSON` uses regex to extract JSON (both `[...]` and `{...}`) from LLM responses. Model is overridable per call. Timeout applies to all OpenRouter calls uniformly.

- [ ] Task 4: Create AuthGuard and UserId decorator
  - File: `src/common/guards/auth.guard.ts`, `src/common/decorators/user.decorator.ts`
  - Action: AuthGuard extracts Bearer token from Authorization header, verifies it via Supabase `auth.getUser()`, and attaches user to request. `@UserId()` param decorator extracts the user ID from the verified request.
  - Notes: Guard returns 401 if token missing/invalid.

- [ ] Task 5: Configure AppModule and main.ts
  - File: `src/app.module.ts`, `src/main.ts`
  - Action: Register SupabaseModule, AiModule, UserProfileModule, GoalModule, IntakeModule in AppModule. Register `EventEmitterModule.forRoot()` and `ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 60 }] })`. In main.ts set global prefix `/api`, enable ValidationPipe with `whitelist`, `forbidNonWhitelisted`, `transform`, and enable CORS. **Register a global error handler on the EventEmitter2 instance**: `eventEmitter.on('error', (err) => logger.error('Event handler failed', err))` to surface swallowed errors.
  - Notes: SupabaseModule and AiModule are global — imported once in AppModule, available everywhere. ThrottlerModule provides global rate limiting; tighter per-route limits applied via `@Throttle()` decorator on AI-calling endpoints.

- [ ] Task 6: Database migration — enable pgvector extension
  - File: Supabase migration
  - Action: `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;`
  - Notes: Must run before any table uses `vector` type.

- [ ] Task 7: Database migration — create `user_profiles` table + RLS
  - File: Supabase migration
  - Action: Create `user_profiles` table with columns: `id` (uuid, PK, default gen_random_uuid()), `user_id` (uuid, unique, references auth.users), `free_text` (text, nullable), `created_at` (timestamptz), `updated_at` (timestamptz). Enable RLS. Policies: users can SELECT/INSERT/UPDATE their own row only using `(select auth.uid()) = user_id`.
  - Notes: One row per user. `free_text` is the persistent "tell us about yourself" field.

- [ ] Task 8: Database migration — create `goals` table + RLS
  - File: Supabase migration
  - Action: Create `goals` table with columns: `id` (uuid, PK), `user_id` (uuid, references auth.users), `title` (text, not null), `description` (text), `status` (text, check in ('intake_in_progress', 'profile_generating', 'intake_completed', 'profile_generation_failed', 'active'), default 'intake_in_progress'), `profile_generation_attempts` (int, default 0), `created_at` (timestamptz), `updated_at` (timestamptz). Enable RLS. Policies: users can SELECT/INSERT/UPDATE/DELETE their own goals using `(select auth.uid()) = user_id`.
  - Notes: Status tracks the goal through the full intake lifecycle including intermediate and error states. `profile_generation_attempts` caps at 3.

- [ ] Task 9: Database migration — create `intake_batches` table + RLS
  - File: Supabase migration
  - Action: Create `intake_batches` table: `id` (uuid, PK), `goal_id` (uuid, FK → goals, on delete cascade), `batch_number` (int, not null), `batch_type` (text, check in ('universal', 'ai_generated', 'fallback')), `quality_scores` (jsonb, nullable), `embedded` (boolean, default false), `created_at` (timestamptz). **Add `UNIQUE(goal_id, batch_number)` constraint.** Enable RLS. Policies: users can access batches for their own goals via join `(select auth.uid()) = (select user_id from goals where id = goal_id)`.
  - Notes: `quality_scores` stores the Layer 3 evaluation results as JSON. `embedded` tracks whether the batch Q&A has been embedded into pgvector. UNIQUE constraint prevents duplicate batch submissions — catch Postgres error 23505 and return 409.

- [ ] Task 10: Database migration — create `intake_questions` table + RLS
  - File: Supabase migration
  - Action: Create `intake_questions` table: `id` (uuid, PK), `batch_id` (uuid, FK → intake_batches, on delete cascade), `question_text` (text, not null), `question_type` (text, check in ('text', 'scale', 'single_choice', 'multiple_choice')), `options` (jsonb, nullable — array of strings for choice types), `scale_min` (int, nullable), `scale_max` (int, nullable), `scale_labels` (jsonb, nullable — map of value→label), `display_order` (int, not null), `placeholder` (text, nullable), `created_at` (timestamptz). Enable RLS via same goal ownership join.
  - Notes: `options`, `scale_min`/`scale_max`/`scale_labels` are type-dependent. Nullable fields only populated for relevant question types.

- [ ] Task 11: Database migration — create `intake_answers` table + RLS
  - File: Supabase migration
  - Action: Create `intake_answers` table: `id` (uuid, PK), `question_id` (uuid, FK → intake_questions, on delete cascade), `text_value` (text, nullable), `numeric_value` (numeric, nullable), `selected_options` (jsonb, nullable — array of strings), `created_at` (timestamptz). Enable RLS via goal ownership join through questions → batches → goals.
  - Notes: Polymorphic answer storage. `text_value` for text type, `numeric_value` for scale, `selected_options` for choice types.

- [ ] Task 12: Database migration — create `goal_profiles` table + RLS
  - File: Supabase migration
  - Action: Create `goal_profiles` table: `id` (uuid, PK), `goal_id` (uuid, FK → goals, unique, on delete cascade), `profile_data` (jsonb, not null — structured sections), `narrative_summary` (text, not null), `embedded` (boolean, default false), `created_at` (timestamptz). Enable RLS via goal ownership.
  - Notes: `profile_data` contains structured JSON: `{ current_state, desired_state, constraints, motivation, domain_context }`. `narrative_summary` is the human-readable coaching briefing. `embedded` tracks whether the profile narrative has been embedded into pgvector.

- [ ] Task 13: Database migration — create `goal_context_embeddings` table + RLS
  - File: Supabase migration
  - Action: Create `goal_context_embeddings` table: `id` (uuid, PK), `user_id` (uuid, FK → auth.users), `goal_id` (uuid, FK → goals, nullable — null for user profile embeddings), `source_type` (text, check in ('user_profile', 'intake_batch', 'goal_profile')), `source_id` (uuid, not null), `content` (text, not null — the raw text that was embedded), `embedding` (vector(1536)), `created_at` (timestamptz). Enable RLS. Policies: users access their own embeddings only.
  - Notes: `source_type` + `source_id` enables polymorphic lookup. Vector dimension 1536 matches `text-embedding-3-small`. User profile embeddings have `goal_id = NULL` — one global embedding per user, not per goal.

- [ ] Task 14: Database migration — create indexes on FK columns for RLS performance
  - File: Supabase migration
  - Action: Create indexes: `CREATE INDEX idx_intake_batches_goal_id ON intake_batches(goal_id)`, `CREATE INDEX idx_intake_questions_batch_id ON intake_questions(batch_id)`, `CREATE INDEX idx_intake_answers_question_id ON intake_answers(question_id)`. These FK columns are used in RLS subqueries and Postgres does not auto-index them.
  - Notes: Without these indexes, RLS policy checks perform sequential scans on every row access. Critical for performance as data grows.

- [ ] Task 15: Create UserProfileModule
  - File: `src/user-profile/user-profile.module.ts`, `src/user-profile/user-profile.controller.ts`, `src/user-profile/user-profile.service.ts`, `src/user-profile/dto/update-profile.dto.ts`
  - Action: CRUD for user profiles. Endpoints: `GET /api/user-profile` (get or create empty), `PATCH /api/user-profile` (update free_text). Service uses admin client to read/write `user_profiles` table. DTO validates `free_text` as optional string. Export `UserProfileService` so IntakeModule can import it. On PATCH, emit `user-profile.updated` event via EventEmitter2 so embedding listeners can re-embed the free text.
  - Notes: Auto-creates profile row on first GET if none exists. Only exposes the user's own profile. Cross-module event decouples profile updates from embedding logic.

- [ ] Task 16: Create GoalModule
  - File: `src/goal/goal.module.ts`, `src/goal/goal.controller.ts`, `src/goal/goal.service.ts`, `src/goal/dto/create-goal.dto.ts`
  - Action: Goal CRUD. Endpoints:
    - `POST /api/goals` (create goal, auto-sets status `intake_in_progress`)
    - `GET /api/goals` (list user's goals with pagination: `?limit=20&offset=0`)
    - `GET /api/goals/:id` (get single goal with status)
    - `DELETE /api/goals/:goalId` (delete goal — only allowed when status is `intake_in_progress`, `profile_generating`, or `profile_generation_failed`. Returns 400 otherwise. Cascading deletes handle all related data.)
    - `GET /api/goals/:goalId/profile` (returns goal profile from `goal_profiles` table — 404 if intake not complete)
  - Service manages goal lifecycle status updates. Export `GoalService` so IntakeModule can use it.
  - Notes: Goal creation triggers intake flow on the frontend side. Backend just sets the initial status. Profile endpoint is a simple read — profile is written by IntakeService at intake completion.

- [ ] Task 17: Create IntakeModule — core service and controller
  - File: `src/intake/intake.module.ts`, `src/intake/intake.controller.ts`, `src/intake/intake.service.ts`, `src/intake/dto/submit-answers.dto.ts`
  - Action: Intake flow orchestration. Endpoints:
    - `GET /api/goals/:goalId/intake/next-batch` — returns next unanswered batch. If a batch exists but has no answers, re-serves that batch (does not skip). Includes `batch_id`, `batch_number`, `total_batches_completed`, `is_complete`. If intake already complete, returns `{ is_complete: true, goal_status: "intake_completed" }`. Apply `@Throttle({ default: { ttl: 60000, limit: 10 } })`.
    - `POST /api/goals/:goalId/intake/submit-batch` — accepts answers for current batch, validates answer ownership (question must belong to current batch → goal → user) and answer-type constraints (see API Contract), stores answers in Transaction 1, generates next batch or completes intake in Transaction 2. Triggers async quality evaluation via EventEmitter2. Returns `{ submitted_batch, next_batch }`. Catches Postgres 23505 unique_violation → returns 409 `ConflictException("This batch has already been submitted")`. Apply `@Throttle({ default: { ttl: 60000, limit: 10 } })`.
    - `POST /api/goals/:goalId/intake/retry-profile` — retries profile generation for goals in `profile_generating` or `profile_generation_failed` status. Increments `profile_generation_attempts`. After 3 attempts, flips to `profile_generation_failed`.
  - Service: orchestrates the flow — checks current batch number, delegates to IntakePromptService for question generation, stores questions/answers, checks completion. On completion: flips status to `profile_generating`, calls `generateGoalProfile`, validates profile_data keys, stores profile, flips to `intake_completed`. On profile generation failure: leaves status as `profile_generating` for retry.
  - DTO: `submit-answers.dto.ts` validates array of `{ question_id: string, text_value?: string, numeric_value?: number, selected_options?: string[] }`.
  - Notes: Controller uses `@UseGuards(AuthGuard)` and `@UserId()`. IntakeModule imports GoalModule and UserProfileModule. Submit endpoint does question generation synchronously (user waits for AI on batches 2+). Two-transaction approach ensures answers are never lost even if next-batch generation fails.

- [ ] Task 18: Create IntakePromptService — question generation
  - File: `src/intake/intake-prompt.service.ts`
  - Action: Houses all prompt templates and question generation logic.
    - `getUniversalBatch()` — returns the 5 hardcoded batch 1 questions as defined in "Universal Batch 1 Questions" section. No AI call. Mix of question types (2 text, 2 single_choice, 1 scale).
    - `generateNextBatch(goal, userProfile, previousBatches, previousAnswers, batchNumber)` — builds prompt with all context, calls AiService.generateJSON, returns structured questions + `is_complete` flag. Prompt instructs: avoid redundancy with user profile, aim to complete by batch 5, hard cap at 7, progressively tighten, mix question types.
    - `generateGoalProfile(goal, userProfile, allAnswers)` — synthesizes all intake data into structured goal profile JSON + narrative summary. **Validates output**: checks that all five required keys (`current_state`, `desired_state`, `constraints`, `motivation`, `domain_context`) exist and are non-empty strings. On validation failure, retries the AI call once before propagating the error.
  - Notes: Prompt templates stored as template literal functions within the service. Low coupling — only depends on AiService (global). The same 30s timeout from AiService applies to all AI calls here.

- [ ] Task 19: Create IntakeQualityService — validation and evaluation
  - File: `src/intake/intake-quality.service.ts`
  - Action: Three-layer quality framework.
    - `validateStructure(aiResponse)` — Layer 1: JSON parsing, field validation, type checking. Returns `{ valid: boolean, errors: string[] }`.
    - `validateSemantics(questions)` — Layer 2: interrogative check, uniqueness, option distinctness, type variety. Returns `{ valid: boolean, warnings: string[] }`.
    - `evaluateQualityAsync(batch, goal, userProfile, previousAnswers)` — Layer 3: fire-and-forget LLM-as-judge. Listens for `batch.served` event via `@OnEvent('batch.served')`. Calls AiService with judge prompt, scores relevance/depth/coverage/redundancy on 1-5 scale, computes composite score, writes to `intake_batches.quality_scores`. **Logs `LOG.warn` when composite score drops below 0.5.**
    - `getFallbackBatch()` — cycles through a pool of ~10 pre-written open-ended text questions, returning 2-3 per call. Consecutive fallbacks are never identical. Tracks last-used index to rotate.
  - Notes: Layer 1+2 called synchronously in intake flow. Layer 3 triggered via EventEmitter2, never blocks the user. Fallback batches stored with `batch_type: 'fallback'` and count toward the 7-batch cap.

- [ ] Task 20: Create embedding pipeline
  - File: `src/intake/intake.service.ts` (extend)
  - Action: After each batch submission, embed the batch Q&A text into `goal_context_embeddings` via AiService.generateEmbedding and flip `intake_batches.embedded = true`. After goal profile generation, embed the profile narrative and flip `goal_profiles.embedded = true`. On user profile update, embed/re-embed the free text (global embedding with `goal_id = NULL`). Use `source_type` discriminator to tag each embedding.
  - Notes: Embedding runs async (fire-and-forget via EventEmitter2 events: `batch.answered`, `profile.generated`, `user-profile.updated`). Failures logged but don't block the user flow. The `embedded` boolean enables discovery of missed embeddings.

- [ ] Task 21: Wire up EventEmitter2
  - File: `src/app.module.ts`, `src/intake/intake-quality.service.ts`, `src/intake/intake.service.ts`
  - Action: Install `@nestjs/event-emitter`. Register `EventEmitterModule.forRoot()` in AppModule. Register global error handler on EventEmitter2 instance to log swallowed errors. Emit events from IntakeService: `batch.served` (for quality eval), `batch.answered` (for embedding), `profile.generated` (for embedding). Listeners in IntakeQualityService and IntakeService handle async processing.
  - Notes: Events decouple the hot path from background processing. Global error handler ensures listener failures are visible in logs rather than silently swallowed.

- [ ] Task 22: Create prompt regression test suite
  - File: `src/intake/testing/fixtures/`, `src/intake/testing/evaluators/`, `src/intake/testing/baselines/`, `src/intake/testing/intake-quality.spec.ts`
  - Action: Create 5 fixture scenarios (fitness, career, financial, creative, habit) with user profile variants. Each fixture defines goal text, mock answer generator, and expected quality thresholds. Test suite instantiates real IntakePromptService + AiService, runs full intake flow per fixture, evaluates with Layer 1+2+3, compares against baseline scores. Add `"test:intake-quality": "jest --testPathPattern=intake-quality --testTimeout=120000"` to package.json scripts.
  - Notes: Uses low temperature (0.1-0.3) for reproducibility. Not run in CI on every push. Baselines committed to repo.

- [ ] Task 23: Add unit tests for core services
  - File: `src/intake/intake.service.spec.ts`, `src/intake/intake-prompt.service.spec.ts`, `src/intake/intake-quality.service.spec.ts`, `src/goal/goal.service.spec.ts`, `src/user-profile/user-profile.service.spec.ts`
  - Action: Unit tests for each service with mocked dependencies. Test: batch flow orchestration, hardcoded batch 1 content, structural validation logic, semantic validation logic, answer storage and type validation, answer ownership verification, goal status transitions (including `profile_generating` and `profile_generation_failed`), profile CRUD, goal deletion restrictions, pagination, 409 on duplicate submission, transaction boundaries (answers preserved when next-batch fails), profile_data key validation. Mock AiService and SupabaseService.
  - Notes: Standard Jest tests, run via `npm test`.

### Acceptance Criteria

- [ ] AC 1: Given a new user, when they call `GET /api/user-profile`, then a profile is auto-created and returned with `free_text: null`.
- [ ] AC 2: Given a user with a profile, when they call `PATCH /api/user-profile` with `{ "free_text": "I'm a 32-year-old engineer..." }`, then the profile is updated and the text is persisted.
- [ ] AC 3: Given an authenticated user, when they call `POST /api/goals` with `{ "title": "Run a marathon", "description": "In 6 months" }`, then a goal is created with status `intake_in_progress`.
- [ ] AC 4: Given a goal with status `intake_in_progress` and no batches yet, when the user calls `GET /api/goals/:goalId/intake/next-batch`, then batch 1 is returned with the 5 hardcoded universal questions (2 text, 1 scale, 2 single_choice), no AI call is made, the response includes `batch_id`, and the response matches the API contract shape.
- [ ] AC 5: Given batch 1 answers have been submitted, when the user calls `GET /api/goals/:goalId/intake/next-batch`, then the AI generates batch 2 questions informed by the user profile, goal, and batch 1 answers. Questions are structurally valid (Layer 1) and semantically sound (Layer 2).
- [ ] AC 6: Given the user submits answers via `POST /api/goals/:goalId/intake/submit-batch`, then each answer's `question_id` is verified to belong to the current batch for this goal owned by this user, answer values are cross-validated against their question type constraints, and valid answers are stored in `intake_answers` with correct polymorphic values.
- [ ] AC 7: Given answers are submitted, when the batch is served, then a `batch.served` event fires and the LLM-as-judge quality evaluation runs asynchronously without blocking the response.
- [ ] AC 8: Given the AI returns `is_complete: true` after a batch submission, then the goal status flips to `profile_generating`, a goal profile is generated (structured JSON with all 5 required keys + narrative), validated, stored in `goal_profiles`, and the goal status is updated to `intake_completed`.
- [ ] AC 9: Given a user has a rich profile with detailed free text, when the AI generates batch 2+ questions, then the questions do not re-ask topics already covered in the user profile.
- [ ] AC 10: Given the AI call fails on batch 2+ (including timeout), when the system retries once and still fails, then a fallback batch from the pre-written pool is served with `batch_type: 'fallback'` and the user is not blocked.
- [ ] AC 11: Given batch answers are submitted, then the Q&A text is embedded into `goal_context_embeddings` with `source_type = 'intake_batch'` asynchronously, and `intake_batches.embedded` is set to `true`.
- [ ] AC 12: Given intake completes and a goal profile is generated, then the profile narrative is embedded into `goal_context_embeddings` with `source_type = 'goal_profile'` and `goal_profiles.embedded` is set to `true`.
- [ ] AC 13: Given the intake has reached 7 batches, when the user calls `GET /api/goals/:goalId/intake/next-batch`, then the system forces completion regardless of AI's assessment.
- [ ] AC 14: Given the user submits batch answers via `POST /api/goals/:goalId/intake/submit-batch`, then the response includes `next_batch` inline with the next set of questions including `batch_id` (no separate GET needed).
- [ ] AC 15: Given intake is complete, when the user calls `GET /api/goals/:goalId/profile`, then the structured goal profile (profile_data JSON + narrative_summary) is returned.
- [ ] AC 16: Given intake is NOT complete, when the user calls `GET /api/goals/:goalId/profile`, then a 404 is returned.
- [ ] AC 17: Given a user updates their profile free text via `PATCH /api/user-profile`, then a `user-profile.updated` event is emitted and the free text is re-embedded into `goal_context_embeddings` with `goal_id = NULL` asynchronously.
- [ ] AC 18: Given an unauthenticated request to any endpoint, when the request is made without a valid Bearer token, then a 401 Unauthorized response is returned.
- [ ] AC 19: Given a user tries to access another user's goal/intake, then RLS policies prevent access and a 404 or empty result is returned.
- [ ] AC 20: Given a user submits answers for a batch that has already been submitted (duplicate), then a 409 Conflict response is returned with message "This batch has already been submitted."
- [ ] AC 21: Given a user submits answers with `question_id` values that don't belong to the current batch or this goal, then a 400 response is returned with specific error details.
- [ ] AC 22: Given a user submits a `text_value` for a scale question or a `numeric_value` outside the scale range, then a 400 response is returned with specific validation errors.
- [ ] AC 23: Given goal profile generation fails after the AI returns `is_complete: true`, then the goal status is set to `profile_generating` and the user can call `POST /api/goals/:goalId/intake/retry-profile` to retry.
- [ ] AC 24: Given profile generation has failed 3 times, then the goal status is `profile_generation_failed` and the retry endpoint returns 400.
- [ ] AC 25: Given a goal with status `intake_in_progress`, `profile_generating`, or `profile_generation_failed`, when the user calls `DELETE /api/goals/:goalId`, then the goal and all associated data are deleted (204 response).
- [ ] AC 26: Given a goal with status `intake_completed` or `active`, when the user calls `DELETE /api/goals/:goalId`, then a 400 response is returned.
- [ ] AC 27: Given a user calls `GET /api/goals?limit=5&offset=10`, then at most 5 goals are returned starting from offset 10, with total count included.
- [ ] AC 28: Given batch 1 has been served but not answered, when the user calls `GET /api/goals/:goalId/intake/next-batch` again, then the same batch 1 is re-served with the same `batch_id`.
- [ ] AC 29: Given the submit-batch Transaction 1 (answer storage) succeeds but Transaction 2 (next-batch generation) fails, then the answers are preserved in the database and the user can retry by calling `GET /next-batch`.
- [ ] AC 30: Given a user exceeds the rate limit on AI-calling endpoints (10 req/min), then a 429 Too Many Requests response is returned.

## Additional Context

### Dependencies

- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` — NestJS framework
- `@supabase/supabase-js` — Supabase client for DB and auth
- `openai` — OpenAI SDK (configured for OpenRouter endpoint)
- `@nestjs/event-emitter` — EventEmitter2 for async fire-and-forget processing
- `@nestjs/throttler` — rate limiting middleware
- `class-validator`, `class-transformer` — DTO validation
- `jest`, `@nestjs/testing` — testing framework

### Testing Strategy

- **Unit tests** (`npm test`): Mock SupabaseService and AiService. Test service logic, validation, flow orchestration, status transitions (including error states), answer-type validation, ownership verification, transaction boundaries, duplicate submission handling, pagination. Run on every commit.
- **Prompt regression tests** (`npm run test:intake-quality`): Real AI calls against 5 diverse fixtures with profile variants. Evaluate all 3 quality layers. Compare against baselines. Run manually when prompts change.
- **Manual testing**: Use Supabase dashboard to verify RLS policies. Test full flow via curl/Postman against running server.

### Notes

- The intake profile will later be consumed by the coaching system (milestones → weeks → days)
- pgvector enables semantic queries across the full coaching lifecycle (intake context, progress tracking, check-ins, context evolution) — all in one Postgres database
- Question type variety per batch prevents fatigue: mix quick interactions (scale/choice) with deeper text questions
- The intake is the user's first impression — should feel conversational, not clinical
- Embedding model is locked to `text-embedding-3-small` (1536 dimensions). Changing models requires re-embedding all data — use the admin reembed endpoint.
- Prompts are code — version them, test them, review changes. Store prompt templates alongside the service code.
- User profile free-text prompt should be casual and low-pressure: "Anything you'd like your coach to know? Your background, past experience with this kind of goal, what's driving you — whatever feels relevant. Totally optional."
- **Known limitation (v1):** No support for editing answers from previous batches. AI-generated batches depend on prior answers, so editing would require cascading regeneration. Users can clarify or correct in later text answers — the AI will incorporate corrections. Can be added later if needed.
