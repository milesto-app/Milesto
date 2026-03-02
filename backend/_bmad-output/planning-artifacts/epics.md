---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - planning-artifacts/prd.md
  - planning-artifacts/architecture.md
---

# momentum_back - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for momentum_back, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can retrieve their profile (auto-created on first access)
FR2: Users can update their profile with free-text personal context
FR3: System re-embeds user profile text into semantic context when updated
FR4: Users can create a goal with a title and description
FR5: Users can list their goals with pagination
FR6: Users can view a single goal with its current status
FR7: Users can delete a goal in `intake_in_progress`, `profile_generating`, or `profile_generation_failed` status
FR8: System prevents deletion of goals in `intake_completed` or `active` status
FR9: System tracks goal status through full lifecycle (intake_in_progress -> profile_generating -> intake_completed / profile_generation_failed -> active)
FR10: System serves hardcoded universal first batch instantly (no AI call)
FR11: System generates adaptive follow-up batches informed by user profile, goal description, and all prior answers
FR12: System avoids questions redundant with user's profile content
FR13: System supports text, scale (custom anchors), single choice, and multiple choice question types
FR14: Users can submit answers and receive next batch inline in the same response
FR15: System re-serves unanswered batch when user returns to interrupted session
FR16: System targets completion in 3-5 batches with hard cap at 7
FR17: System progressively tightens question generation (fewer questions, more quick-tap types in later batches)
FR18: System validates each answer belongs to the current batch for the user's goal
FR19: System cross-validates answer values against question type constraints
FR20: System rejects duplicate batch submissions with 409 conflict response
FR21: System retries failed AI question generation once, then serves fallback batch
FR22: Fallback batches count toward the 7-batch hard cap
FR23: Consecutive fallback batches serve different questions from the pool
FR24: System generates structured goal profile upon intake completion
FR25: System validates profile contains all required sections (current_state, desired_state, constraints, motivation, domain_context)
FR26: Users can retry failed profile generation up to 3 attempts
FR27: System transitions goal to terminal failure state after 3 failed attempts
FR28: Submitted answers are preserved even when next-batch generation fails
FR29: Users can retrieve their goal's AI-generated profile after intake completion
FR30: Profile includes structured data sections plus narrative summary
FR31: System returns 404 when profile requested before intake completion
FR32: System embeds batch Q&A text into vector store after each batch submission
FR33: System embeds goal profile narrative into vector store after generation
FR34: System embeds user profile text as global entry (goal_id = NULL) in vector store
FR35: System tracks embedding completion status per batch and per profile
FR36: Admins can trigger re-embedding for entries that failed to embed
FR37: System validates AI-generated questions structurally (valid JSON, required fields, correct types, 3-5 questions per batch)
FR38: System validates AI-generated questions semantically (interrogative structure, uniqueness, option distinctness, type variety)
FR39: System evaluates batch quality asynchronously via LLM-as-judge without blocking the user
FR40: System stores quality scores per batch
FR41: System logs warning when quality scores drop below threshold
FR42: System authenticates all requests via Bearer token
FR43: System enforces row-level access — users can only access their own data
FR44: System enforces global rate limit on all endpoints
FR45: System enforces tighter rate limit on AI-calling endpoints

### NonFunctional Requirements

NFR1: Hardcoded batch 1 responses in under 200ms
NFR2: AI-generated batch responses in under 10 seconds end-to-end
NFR3: Goal profile generation within 30 seconds (AI call timeout)
NFR4: Async operations (quality evaluation, embedding) zero impact on user-facing latency
NFR5: Answer storage (Transaction 1) in under 500ms regardless of Transaction 2 outcome
NFR6: All data transmitted over HTTPS
NFR7: API keys and service role keys never exposed to client
NFR8: Row-level security enforced at database level — no cross-user data access
NFR9: AI failures never block intake progression (fallback batches)
NFR10: Profile generation recoverable via retry (up to 3 attempts)
NFR11: Answer data never lost — two-transaction split
NFR12: Embedding failures tracked and recoverable without data loss
NFR13: EventEmitter2 errors logged, never silently swallowed
NFR14: AI call timeout configurable via app.config.ts (default 30s)
NFR15: Embedding model locked to text-embedding-3-small (1536 dimensions) — changes require full re-embedding
NFR16: Default AI model configurable via app.config.ts

### Additional Requirements

- Starter Template: NestJS CLI (`nest new`) — already initialized with ESM + `nodenext` module resolution
- Configuration split: `.env` for secrets only (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY), `app.config.ts` for non-sensitive settings (AI model, timeouts, batch limits, throttle settings) — version controlled
- API Documentation: Swagger/OpenAPI via `@nestjs/swagger` with decorators on all controllers
- Async Event System: EventEmitter2 with 4 named events (`batch.served`, `batch.answered`, `profile.generated`, `user-profile.updated`) + global error handler
- Rate Limiting: `@nestjs/throttler` with declarative `@Throttle` decorators
- Logging: NestJS built-in `Logger` (one per service), quality threshold breaches at `warn` level
- Database Migrations: Applied via Supabase MCP tool (no local migration files)
- No application-level caching for MVP — AI batches are unique per user/goal, Postgres query caching sufficient
- Implementation priority: Config -> DB migrations -> Auth/RLS -> UserProfile -> Goal -> Intake -> Swagger -> Rate limiting
- Admin reembed endpoint (`POST /api/admin/reembed-missing`) referenced in PRD but not in endpoint table — add to IntakeModule when needed
- Project structure follows feature-based module organization with co-located controllers, services, DTOs, and unit tests
- All imports use `.js` extension (ESM with `nodenext` module resolution)
- JSON response fields use `snake_case` (matching database columns directly — no transformation layer)
- NestJS HTTP exceptions used exclusively (no custom exception classes)
- Admin client via `SupabaseService.getAdminClient()` for all server-side operations
- AI calls exclusively through `AiService` methods (never import OpenAI SDK directly)

### FR Coverage Map

**Note:** FR1-3 (User Profile), FR42-43 (Auth/RLS) are out of scope — handled by existing infrastructure or separate system. FR34 (user profile embedding) is deferred until the user profile module (FR1-3) is in scope — the event listener would be dead code without user profile CRUD to trigger it.

| FR | Epic | Story | Description |
|---|---|---|---|
| FR4 | Epic 1 | 1.1 | Create goal with title and description |
| FR5 | Epic 1 | 1.2 | List goals with pagination |
| FR6 | Epic 1 | 1.2 | View single goal with status |
| FR7 | Epic 1 | 1.3 | Delete goal (restricted statuses) |
| FR8 | Epic 1 | 1.3 | Prevent deletion of completed/active goals |
| FR9 | Epic 1 | 1.1-1.3 | Goal status lifecycle tracking |
| FR10 | Epic 2 | 2.1 | Hardcoded universal batch 1 (instant) |
| FR11 | Epic 2 | 2.3 | Adaptive AI follow-up batches |
| FR12 | Epic 2 | 2.3 | Redundancy avoidance with profile content |
| FR13 | Epic 2 | 2.1 | Text/scale/single-choice/multiple-choice types |
| FR14 | Epic 2 | 2.3 | Submit answers + inline next batch |
| FR15 | Epic 2 | 2.1 | Re-serve unanswered batch on return |
| FR16 | Epic 2 | 2.4 | Batch budget (3-5 target, 7 cap) |
| FR17 | Epic 2 | 2.3 | Progressive tightening of questions |
| FR18 | Epic 2 | 2.2 | Answer ownership validation |
| FR19 | Epic 2 | 2.2 | Answer-type cross-validation |
| FR20 | Epic 2 | 2.2 | Duplicate submission 409 |
| FR21 | Epic 3 | 3.1 | AI retry + fallback batch |
| FR22 | Epic 3 | 3.1 | Fallback counts toward cap |
| FR23 | Epic 3 | 3.1 | Consecutive fallbacks serve different questions |
| FR24 | Epic 2 | 2.4 | Goal profile generation on completion |
| FR25 | Epic 2 | 2.4 | Profile section validation |
| FR26 | Epic 3 | 3.2 | Profile generation retry (3 attempts) |
| FR27 | Epic 3 | 3.2 | Terminal failure state after 3 failures |
| FR28 | Epic 2 | 2.2 | Answers preserved on next-batch failure |
| FR29 | Epic 2 | 2.4 | Retrieve goal profile after completion |
| FR30 | Epic 2 | 2.4 | Structured data + narrative summary |
| FR31 | Epic 2 | 2.4 | 404 before completion |
| FR32 | Epic 2 | 2.5 | Embed batch Q&A after submission |
| FR33 | Epic 2 | 2.5 | Embed goal profile after generation |
| FR34 | -- | Deferred | Embed user profile as global entry (awaits FR1-3) |
| FR35 | Epic 2 | 2.5 | Track embedding completion status |
| FR36 | Epic 3 | 3.5 | Admin reembed for failures |
| FR37 | Epic 2 | 2.3 | Structural validation of AI questions |
| FR38 | Epic 2 | 2.3 | Semantic validation of AI questions |
| FR39 | Epic 2 | 2.6 | Async LLM-as-judge evaluation |
| FR40 | Epic 2 | 2.6 | Quality score storage per batch |
| FR41 | Epic 2 | 2.6 | Log warning on threshold breach |
| FR44 | Epic 3 | 3.3 | Global rate limit (60/min) |
| FR45 | Epic 3 | 3.3 | AI endpoint rate limit (10/min) |

## Epic List

### Epic 1: Goal Management
Users can create, view, list, and delete goals with full lifecycle tracking.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9

### Epic 2: Adaptive Intake Experience
Users can complete the adaptive intake experience — from the instant first batch through AI-generated follow-ups with quality gates, to profile generation — while the system builds semantic context for personalized coaching.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR24, FR25, FR28, FR29, FR30, FR31, FR32, FR33, FR35, FR37, FR38, FR39, FR40, FR41

### Epic 3: Reliable Intake and Production Readiness
Users can always complete their intake regardless of AI failures, the API is stable under load, well-documented, and operationally maintainable.
**FRs covered:** FR21, FR22, FR23, FR26, FR27, FR36, FR44, FR45

## Epic 1: Goal Management

Users can create, view, list, and delete goals with full lifecycle tracking.

### Story 1.1: Create a Goal

As a **user**,
I want to create a goal with a title and description,
So that I can begin the coaching intake process.

**Acceptance Criteria:**

**Given** an authenticated user
**When** `POST /api/goals` is called with a valid title and description
**Then** a new goal is created with status `intake_in_progress` and returned to the user (FR4)
**And** the `goals` table and RLS policies are created via migration
**And** the GoalModule, GoalController, GoalService, and CreateGoalDto are implemented

**Given** a request with missing or invalid fields
**When** `POST /api/goals` is called
**Then** the system returns 400 with validation errors

### Story 1.2: List and View Goals

As a **user**,
I want to list my goals with pagination and view a single goal's details,
So that I can track my goals and their current status.

**Acceptance Criteria:**

**Given** an authenticated user with multiple goals
**When** `GET /api/goals` is called with optional `limit` and `offset` query params
**Then** the system returns a paginated response `{ data: [...], total, limit, offset }` (FR5)
**And** only the user's own goals are returned (RLS)

**Given** an authenticated user
**When** `GET /api/goals/:goalId` is called with a valid goal ID
**Then** the system returns the goal with its current status (FR6, FR9)

**Given** a request for a non-existent or another user's goal
**When** `GET /api/goals/:goalId` is called
**Then** the system returns 404

### Story 1.3: Delete a Goal

As a **user**,
I want to delete a goal that hasn't been completed,
So that I can remove goals I no longer want to pursue.

**Acceptance Criteria:**

**Given** an authenticated user with a goal in `intake_in_progress`, `profile_generating`, or `profile_generation_failed` status
**When** `DELETE /api/goals/:goalId` is called
**Then** the goal is deleted and the system returns 204 No Content (FR7)

**Given** an authenticated user with a goal in `intake_completed` or `active` status
**When** `DELETE /api/goals/:goalId` is called
**Then** the system returns 400 Bad Request with a message explaining deletion is not allowed (FR8)

**Given** a request for a non-existent goal
**When** `DELETE /api/goals/:goalId` is called
**Then** the system returns 404

## Epic 2: Adaptive Intake Experience

Users can complete the adaptive intake experience — from the instant first batch through AI-generated follow-ups with quality gates, to profile generation — while the system builds semantic context for personalized coaching.

### Story 2.1: Serve Hardcoded First Batch

As a **user**,
I want to immediately receive my first set of intake questions when I start a goal,
So that the coaching process begins instantly without any loading delay.

**Acceptance Criteria:**

**Given** an authenticated user with a goal in `intake_in_progress` status and no batches yet
**When** `GET /api/goals/:goalId/intake/next-batch` is called
**Then** the system creates and returns the hardcoded universal batch 1 with 5 questions (FR10)
**And** the `intake_batches` and `intake_questions` tables are created via migration with RLS policies
**And** questions include text, scale, and choice types (FR13)
**And** the response is served without any AI call (NFR1: < 200ms)
**And** the IntakeModule, IntakeController, IntakeService, and IntakePromptService are implemented

**Given** an authenticated user who already received batch 1 but hasn't answered it
**When** `GET /api/goals/:goalId/intake/next-batch` is called
**Then** the system re-serves the same unanswered batch (FR15)

### Story 2.2: Submit Answers with Validation

As a **user**,
I want to submit my answers with full validation,
So that my responses are safely stored and any input errors are caught immediately.

**Acceptance Criteria:**

**Given** an authenticated user with an unanswered batch
**When** `POST /api/goals/:goalId/intake/submit-batch` is called with valid answers
**Then** answers are persisted in Transaction 1 (NFR5, NFR11, FR28)
**And** the `intake_answers` table is created via migration with RLS policies
**And** the system validates each answer belongs to the current batch (FR18)
**And** the system cross-validates answer values against question type constraints (FR19)

**Given** a user submitting answers for a batch that was already submitted
**When** `POST /api/goals/:goalId/intake/submit-batch` is called
**Then** the system returns 409 Conflict (FR20)

**Given** answers with invalid types (e.g., numeric for a text question)
**When** `POST /api/goals/:goalId/intake/submit-batch` is called
**Then** the system returns 400 with validation details (FR19)

### Story 2.3: AI-Generated Next Batch with Quality Gates

As a **user**,
I want the system to generate my next set of questions adaptively based on everything I've shared, with quality checks ensuring every batch is well-formed,
So that the intake feels like a conversation that gets sharper with each round.

**Acceptance Criteria:**

**Given** answers have been submitted and intake is not yet complete
**When** Transaction 2 runs after answer persistence
**Then** AI generates the next adaptive batch informed by user profile, goal description, and all prior answers (FR11, FR12)
**And** the next batch is stored and returned inline in the same response (FR14)
**And** later batches have fewer questions and more quick-tap types (FR17)

**Given** the AI returns a generated batch
**When** structural validation runs (Layer 1)
**Then** the system verifies: valid JSON, all required fields present, correct question types, 3-5 questions per batch (FR37)
**And** structurally invalid batches are rejected and trigger a retry

**Given** a structurally valid batch
**When** semantic validation runs (Layer 2)
**Then** the system verifies: questions are interrogative, no duplicate questions within the batch, choice options are distinct, type variety across the batch (FR38)
**And** semantically invalid batches are rejected and trigger a retry

### Story 2.4: Intake Completion and Goal Profile Generation

As a **user**,
I want the system to generate a comprehensive coaching profile when my intake is complete,
So that I receive personalized coaching based on everything I've shared.

**Acceptance Criteria:**

**Given** a user submitting answers for the final batch (AI signals completion or batch 7 reached)
**When** `POST /api/goals/:goalId/intake/submit-batch` is called
**Then** answers are persisted (Transaction 1)
**And** the system generates a structured goal profile with sections: current_state, desired_state, constraints, motivation, domain_context plus narrative summary (FR24, FR25, FR30)
**And** the `goal_profiles` table is created via migration with RLS policies
**And** goal status transitions to `intake_completed` (FR9)
**And** the response indicates intake is complete with the profile ID
**And** the system targets completion in 3-5 batches with hard cap at 7 (FR16)

**Given** an authenticated user with a goal in `intake_completed` or `active` status
**When** `GET /api/goals/:goalId/profile` is called
**Then** the system returns the structured goal profile with narrative summary (FR29, FR30)

**Given** a goal where intake is not yet complete
**When** `GET /api/goals/:goalId/profile` is called
**Then** the system returns 404 (FR31)

### Story 2.5: Batch and Profile Semantic Embedding

As a **user**,
I want my intake responses and coaching profile embedded into semantic storage,
So that the system builds rich context for increasingly personalized coaching.

**Acceptance Criteria:**

**Given** a user submits answers for a batch
**When** the `batch.answered` event fires
**Then** the batch Q&A text is embedded via `AiService.generateEmbedding()` and stored in `goal_context_embeddings` (FR32)
**And** the `goal_context_embeddings` table is created via migration with pgvector extension enabled
**And** embedding uses `text-embedding-3-small` with 1536 dimensions (NFR15)
**And** the embedding runs asynchronously with zero impact on user-facing latency (NFR4)
**And** the `embedded` status is tracked per batch (FR35)

**Given** a goal profile is generated
**When** the `profile.generated` event fires
**Then** the profile narrative is embedded and stored in `goal_context_embeddings` (FR33)
**And** the `embedded` status is tracked per profile (FR35)

**Given** an embedding call fails
**When** the listener catches the error
**Then** the `embedded` flag remains `false` and the error is logged (NFR12, NFR13)

### Story 2.6: Async Quality Scoring and Monitoring

As a **user**,
I want each batch scored for quality behind the scenes,
So that the coaching intake experience continuously improves.

**Acceptance Criteria:**

**Given** a batch is served to a user
**When** the `batch.served` event fires
**Then** IntakeQualityService evaluates the batch via LLM-as-judge asynchronously (FR39)
**And** quality scores (relevance, depth progression, dimension coverage, redundancy avoidance) are computed
**And** a composite score is calculated and stored on the batch record (FR40)
**And** the evaluation has zero impact on user-facing latency (NFR4)

**Given** a batch's composite quality score falls below 0.5
**When** the score is stored
**Then** the system logs a warning with batch context (goal ID, batch number, scores) (FR41)

**Given** the LLM-as-judge call fails
**When** the error is caught
**Then** the error is logged and the batch continues without a quality score (NFR13)

## Epic 3: Reliable Intake and Production Readiness

Users can always complete their intake regardless of AI failures, the API is stable under load, well-documented, and operationally maintainable.

### Story 3.1: AI Fallback Batches

As a **user**,
I want the intake to continue smoothly even when AI question generation fails,
So that I'm never stuck waiting or blocked from completing my intake.

**Acceptance Criteria:**

**Given** an AI call for next-batch generation fails
**When** the system retries once and it fails again
**Then** a pre-written fallback batch of 2-3 open-ended text questions is served instead (FR21)
**And** the fallback batch counts toward the 7-batch hard cap (FR22)
**And** the user receives the batch seamlessly — no error is visible

**Given** consecutive AI failures requiring multiple fallback batches
**When** the next fallback is served
**Then** different questions from the fallback pool are selected (FR23)

**Given** a fallback batch is served
**When** the user submits answers
**Then** the normal flow resumes — next batch can be AI-generated or another fallback

### Story 3.2: Profile Generation Retry

As a **user**,
I want to retry if my coaching profile fails to generate,
So that a temporary AI failure doesn't prevent me from getting my personalized coaching plan.

**Acceptance Criteria:**

**Given** profile generation fails after intake completion
**When** the failure occurs
**Then** goal status transitions to `profile_generation_failed` (FR9)
**And** the user can see the failed status on the goal

**Given** a goal in `profile_generation_failed` status with fewer than 3 attempts
**When** `POST /api/goals/:goalId/intake/retry-profile` is called
**Then** the system retries profile generation (FR26)
**And** on success, goal status transitions to `intake_completed`
**And** on failure, status remains `profile_generation_failed`

**Given** a goal that has already failed profile generation 3 times
**When** `POST /api/goals/:goalId/intake/retry-profile` is called
**Then** the system returns 400 indicating max retries exceeded (FR27)
**And** the goal remains in terminal `profile_generation_failed` status

### Story 3.3: Rate Limiting

As a **user**,
I want the API to be protected from abuse,
So that the service remains stable and responsive for all users.

**Acceptance Criteria:**

**Given** any authenticated user
**When** they exceed 60 requests per minute across any endpoints
**Then** the system returns 429 Too Many Requests (FR44)

**Given** any authenticated user
**When** they exceed 10 requests per minute on `GET /api/goals/:goalId/intake/next-batch` or `POST /api/goals/:goalId/intake/submit-batch`
**Then** the system returns 429 Too Many Requests with a tighter limit (FR45)

**Given** ThrottlerModule is configured in AppModule
**When** the application starts
**Then** global throttle settings are read from `app.config.ts`
**And** AI endpoints use `@Throttle` decorator with tighter limits

### Story 3.4: API Documentation with Swagger

As a **developer**,
I want all endpoints documented with interactive API reference,
So that the mobile client developer has a clear, always-up-to-date contract to build against.

**Acceptance Criteria:**

**Given** the application is running
**When** a developer visits the Swagger endpoint
**Then** all endpoints are documented with `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators
**And** request/response schemas are auto-generated from DTOs
**And** authentication is documented with `@ApiBearerAuth`

### Story 3.5: Admin Re-Embedding Endpoint

As an **admin**,
I want to trigger re-embedding for entries that failed to embed,
So that no semantic context is permanently lost.

**Acceptance Criteria:**

**Given** entries exist in `goal_context_embeddings` with `embedded = false`
**When** `POST /api/admin/reembed-missing` is called
**Then** the system queries all unembedded entries and retries embedding for each (FR36)
**And** successfully embedded entries are updated to `embedded = true`
**And** still-failing entries remain `embedded = false` with errors logged

**Given** no entries have `embedded = false`
**When** `POST /api/admin/reembed-missing` is called
**Then** the system returns a response indicating nothing to reembed
