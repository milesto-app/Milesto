---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - planning-artifacts/prd-roadmap-generation.md
  - planning-artifacts/architecture.md
  - planning-artifacts/prd-roadmap-generation-validation-report.md
---

# momentum_back - Roadmap Generation Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Roadmap Generation System, decomposing the requirements from the Roadmap Generation PRD and Architecture into implementable stories. This is an extension of the existing momentum_back platform, building on the completed Goal Intake System (Epics 1-3).

## Requirements Inventory

### Functional Requirements

FR1: System generates vector embeddings for intake Q&A text on batch submission (extend existing)
FR2: System generates vector embeddings for goal profile narrative on profile generation (extend existing)
FR3: System stores embeddings in `context_embeddings` table with HNSW index
FR4: System retrieves top-K context chunks via HNSW filtered by goal_id and user_id
FR5: System reranks retrieved chunks using Cohere Rerank API
FR6: System falls back to raw HNSW results when reranking unavailable
FR7: System falls back to direct SQL context assembly when vector retrieval fails entirely
FR8: System assembles reranked context into prompt with labeled sections (goal profile, intake Q&A, user profile, progress summaries, debrief highlights)
FR9: System generates vector embeddings for weekly summaries and debrief notes for retrieval
FR10: System retrieves cross-goal user profile data (`goal_id IS NULL`) and includes in generation context
FR11: System generates milestones only for goals in `intake_completed` or `active` status
FR12: System generates monthly milestones using backward planning from target deadline
FR13: System generates a minimum of 3 milestones; for goals with deadlines over 3 months, 1 milestone per month
FR14: System injects user constraints (effort level, available time, experience, deadline) as explicit prompt variables
FR15: System validates generated milestones against JSON schema before storage
FR16: System attempts JSON repair on schema validation failure before rejecting output
FR17: System stores generation metadata (model, tokens, latency, context chunks used)
FR18: System prevents concurrent milestone generation for the same goal (409 if already generating)
FR19: System retries failed milestone generation once before marking as failed
FR20: Users can retry failed milestone generation (max 3 total attempts)
FR21: System generates a weekly plan on-demand, informed by current monthly milestone, last monthly summary, last weekly summary, and previous daily objective completion data
FR22: System validates generated weekly plans against JSON schema before storage
FR23: System generates a weekly summary from daily objective completions and debrief notes at end of each week
FR24: System generates a monthly summary from weekly summaries at the end of each month
FR25: System retries failed weekly plan generation once; on second failure, user sees milestone description as fallback
FR26: System generates daily objectives only after a morning check-in has been submitted for that day
FR27: System generates daily objectives considering: current weekly plan, user's energy level, this week's completed/incomplete objectives, and recent debrief notes
FR28: System calibrates daily objective count and difficulty to the user's reported energy level (fewer, lighter tasks for low energy)
FR29: System validates generated daily objectives against JSON schema before storage
FR30: System retries failed daily objective generation once; on second failure, user sees weekly plan goals as fallback
FR31: If check-in submission fails, system generates objectives with default neutral energy assumption
FR32: Users submit a morning check-in with energy level (high, good, low, very_low) and optional free-text note
FR33: System limits check-ins to one per goal per day (409 on duplicate)
FR34: Users mark daily objectives as done or not done
FR35: Users submit an end-of-day debrief with optional free text and per-task difficulty ratings (easy, moderate, hard)
FR36: System limits debriefs to one per goal per day (409 on duplicate)
FR37: System stores roadmap with status tracking (generating, complete, failed)
FR38: System stores milestones ordered by order_index with month targeting
FR39: System stores weekly plans linked to their milestone and week number
FR40: System stores daily objectives linked to their weekly plan and date
FR41: System stores check-ins and debriefs linked to goal and date
FR42: Users can retrieve their roadmap with milestones overview
FR43: Users can retrieve milestone list (summary view)
FR44: Users can retrieve current weekly plan with its daily objectives
FR45: Users can retrieve check-in and debrief history
FR46: System evaluates quality asynchronously via LLM-as-judge for each generation type (milestones, weekly plans, daily objectives)
FR47: System scores milestones on coherence, personalization, progression, and deadline-alignment (0-5 scale)
FR48: System scores weekly plans on milestone-alignment, progress-adaptation, and actionability (0-5 scale)
FR49: System scores daily objectives on energy-calibration, specificity, and achievability (0-5 scale)
FR50: System stores quality scores per generation event
FR51: System logs warning when any quality dimension scores below 3/5
FR52: System logs per-chunk retrieval details (source type, relevance score, selection decision) for observability
FR53: System tracks daily objective completion rates per week as a quality signal
FR54: System transitions goal status from `intake_completed` to `active` upon successful milestone generation
FR55: Failed milestone generation does not change goal status

### NonFunctional Requirements

NFR1: Milestone generation p95 latency within 30 seconds
NFR2: Context retrieval pipeline (embed query + HNSW search + rerank) p95 latency under 2 seconds
NFR3: Weekly plan generation p95 latency under 15 seconds
NFR4: Daily objective generation (post check-in) p95 latency under 10 seconds
NFR5: Check-in and debrief submission response time under 500ms
NFR6: Roadmap/milestone/weekly plan retrieval endpoints p95 latency under 200ms
NFR7: Async quality evaluation completes without adding latency to generation response
NFR8: Context retrieval scoped by user_id — RLS and query filters prevent cross-user context leakage
NFR9: RLS on all new tables (roadmaps, milestones, weekly_plans, daily_objectives, check_ins, debriefs)
NFR10: External API keys (Cohere, OpenAI embeddings) stored server-side, never exposed to client
NFR11: Generated content contains no PII beyond what the user provided in intake
NFR12: Milestone generation cost under $0.05 per roadmap (one-time)
NFR13: Weekly plan generation cost under $0.01 per plan
NFR14: Daily objective generation cost under $0.005 per day
NFR15: Per-goal monthly ongoing cost under $1 (includes ~4 weekly plans + ~30 daily objectives + context retrieval + summary generation)
NFR16: Embedding costs under $0.001 per goal's intake data
NFR17: Cohere Rerank costs under $0.01 per retrieval operation

### Additional Requirements

- Embedding table migration: `goal_context_embeddings` → `context_embeddings` via `ALTER TABLE RENAME` + `ADD COLUMN` (content_type discriminator, metadata JSONB). Must happen before any new service code.
- 6 services in RoadmapModule: RoadmapService, ContextPipelineService, RerankService, GenerationService, QualityService, CheckInService
- New external dependency: Cohere Rerank API via direct HTTP fetch (no cohere-ai npm package). Requires `COHERE_API_KEY` in `.env`, config in `appConfig.cohere`.
- JSON validation + repair pipeline via class-validator + class-transformer for all generation types (milestones, weekly plans, daily objectives). Same pattern as DTO validation, different layer.
- All generation is synchronous — client waits for response. No 202 + polling. No event-driven generation triggers.
- Roadmap status state machine: `(none) → generating → complete | failed`. `generating` is transient (optimistic lock). No `partial` status.
- Summary generation: hybrid — computed data (completion rates, counts) always + optional LLM narrative when debriefs exist.
- Check-ins: simple CRUD, not embedded (structured data, no semantic retrieval value). Debriefs: embedded async via EventEmitter2 (`debrief.submitted` event).
- Daily objective fallback: creates real `daily_objectives` rows from weekly plan objectives with `is_fallback = true` flag.
- Weekly plan lifecycle: status `active | completed`, auto-transitions to `completed` when `week_start_date + 7 days` passes (checked on next interaction, not cron).
- New Supabase RPC function: `match_goal_context` for HNSW filtered vector search.
- Config extensions: `appConfig.roadmap` (matchCount, matchThreshold, rerankTopN, per-type model overrides, maxGenerationAttempts, generationTimeoutMs) + `appConfig.cohere` (apiVersion, model).
- Cross-module dependency: RoadmapModule imports GoalModule; RoadmapService calls GoalService directly for goal status transition (`intake_completed` → `active`).
- Implementation sequence: embedding table migration → new table migrations + RLS + indexes → RPC function → appConfig extensions → services in dependency order (RerankService → ContextPipelineService → GenerationService → QualityService → CheckInService → RoadmapService) → RoadmapController + module wiring.
- Concurrent milestone generation prevention via optimistic locking (conditional UPDATE on status column, check affected rows).
- Per-model configuration: daily objectives use cheaper/faster models than milestones. `appConfig.roadmap` has per-type model overrides.
- Three-tier degradation chain for context retrieval: Tier 1 (rerank failure → raw HNSW), Tier 2 (HNSW failure → SQL context stuffing), Tier 3 (SQL failure → hard error).
- EventEmitter2 used only for async side effects: quality evaluation after generation, debrief embedding on submission.

### FR Coverage Map

**Note:** FR1-3 (embedding extension/migration) are infrastructure prerequisites within Epic 4 — they enable the context retrieval pipeline that all generation types consume.

| FR | Epic | Story | Description |
|---|---|---|---|
| FR1 | Epic 4 | 4.1 | Extend intake Q&A embedding to unified table |
| FR2 | Epic 4 | 4.1 | Extend goal profile embedding to unified table |
| FR3 | Epic 4 | 4.1 | Unified context_embeddings table with HNSW index |
| FR4 | Epic 4 | 4.2 | HNSW filtered retrieval by goal_id and user_id |
| FR5 | Epic 4 | 4.2 | Cohere Rerank integration |
| FR6 | Epic 4 | 4.2 | Fallback to raw HNSW on rerank failure |
| FR7 | Epic 4 | 4.2 | Fallback to SQL context assembly on HNSW failure |
| FR8 | Epic 4 | 4.2 | Structured context assembly with labeled sections |
| FR10 | Epic 4 | 4.2 | Cross-goal user profile retrieval |
| FR11 | Epic 4 | 4.3 | Status-gated milestone generation |
| FR12 | Epic 4 | 4.3 | Backward planning from target deadline |
| FR13 | Epic 4 | 4.3 | Dynamic milestone count (min 3, 1/month for >3mo) |
| FR14 | Epic 4 | 4.3 | User constraint injection into generation prompt |
| FR15 | Epic 4 | 4.3 | JSON schema validation for milestones |
| FR16 | Epic 4 | 4.3 | JSON repair on validation failure |
| FR17 | Epic 4 | 4.3 | Generation metadata storage |
| FR18 | Epic 4 | 4.3 | Concurrent generation prevention (409) |
| FR19 | Epic 4 | 4.3 | Automatic retry on generation failure |
| FR20 | Epic 4 | 4.3 | User-triggered retry (max 3 attempts) |
| FR37 | Epic 4 | 4.3 | Roadmap status tracking (generating/complete/failed) |
| FR38 | Epic 4 | 4.3 | Milestone storage with order_index and month targeting |
| FR42 | Epic 4 | 4.4 | Roadmap retrieval with milestones overview |
| FR43 | Epic 4 | 4.4 | Milestone list retrieval (summary view) |
| FR54 | Epic 4 | 4.3 | Goal status transition to active on success |
| FR55 | Epic 4 | 4.3 | No status change on generation failure |
| FR9 | Epic 5 | 5.2 | Embed weekly summaries and debrief notes |
| FR21 | Epic 5 | 5.1 | On-demand weekly plan generation (context-aware) |
| FR22 | Epic 5 | 5.1 | JSON schema validation for weekly plans |
| FR23 | Epic 5 | 5.2 | Weekly summary auto-generation |
| FR24 | Epic 5 | 5.2 | Monthly summary auto-generation |
| FR25 | Epic 5 | 5.1 | Weekly plan retry + milestone description fallback |
| FR39 | Epic 5 | 5.1 | Weekly plan storage linked to milestone |
| FR44 | Epic 5 | 5.1 | Current weekly plan retrieval with objectives |
| FR26 | Epic 6 | 6.2 | Daily objectives require check-in first |
| FR27 | Epic 6 | 6.2 | Daily objective context (weekly plan, energy, completions, debriefs) |
| FR28 | Epic 6 | 6.2 | Energy-calibrated objective count and difficulty |
| FR29 | Epic 6 | 6.2 | JSON schema validation for daily objectives |
| FR30 | Epic 6 | 6.2 | Daily objective retry + weekly plan goals fallback |
| FR31 | Epic 6 | 6.2 | Default neutral energy on check-in failure |
| FR32 | Epic 6 | 6.1 | Morning check-in (energy level + optional note) |
| FR33 | Epic 6 | 6.1 | One check-in per goal per day (409) |
| FR34 | Epic 6 | 6.3 | Mark objectives done/not done |
| FR35 | Epic 6 | 6.4 | End-of-day debrief (free text + difficulty ratings) |
| FR36 | Epic 6 | 6.4 | One debrief per goal per day (409) |
| FR40 | Epic 6 | 6.2 | Daily objective storage linked to weekly plan and date |
| FR41 | Epic 6 | 6.1, 6.4 | Check-in and debrief storage linked to goal and date |
| FR45 | Epic 6 | 6.4 | Check-in and debrief history retrieval |
| FR53 | Epic 6 | 6.3 | Completion rate tracking per week |
| FR46 | Epic 7 | 7.1 | Async LLM-as-judge per generation type |
| FR47 | Epic 7 | 7.1 | Milestone scoring dimensions |
| FR48 | Epic 7 | 7.1 | Weekly plan scoring dimensions |
| FR49 | Epic 7 | 7.1 | Daily objective scoring dimensions |
| FR50 | Epic 7 | 7.1 | Quality score storage per generation event |
| FR51 | Epic 7 | 7.1 | Warning logging on low scores |
| FR52 | Epic 7 | 7.2 | Per-chunk retrieval detail logging |

## Epic List

### Epic 4: Milestone Roadmap Generation
Users can generate a personalized coaching roadmap with monthly milestones, planned backward from their target deadline. The system retrieves relevant context from completed intake data, generates milestones adapted to user constraints, and provides roadmap and milestone retrieval.
**FRs covered:** FR1-FR8, FR10-FR20, FR37-FR38, FR42-FR43, FR54-FR55

### Epic 5: Adaptive Weekly Planning
Users receive progress-adaptive weekly plans informed by their current milestone, prior progress, and accumulated feedback. The system auto-generates weekly and monthly summaries that compound into future planning context.
**FRs covered:** FR9, FR21-FR25, FR39, FR44

### Epic 6: Daily Coaching Loop
Users complete a morning check-in, receive energy-calibrated daily objectives, track completion, and optionally submit end-of-day debriefs. The daily engagement cycle that is the core product differentiator.
**FRs covered:** FR26-FR36, FR40-FR41, FR45, FR53

### Epic 7: Generation Quality & Observability
The system evaluates each generation type asynchronously via LLM-as-judge with type-specific scoring dimensions, stores quality scores, logs warnings on low scores, and logs per-chunk retrieval details for observability.
**FRs covered:** FR46-FR52

## Epic 4: Milestone Roadmap Generation

Users can generate a personalized coaching roadmap with monthly milestones, planned backward from their target deadline. The system retrieves relevant context from completed intake data, generates milestones adapted to user constraints, and provides roadmap and milestone retrieval.

### Story 4.1: Embedding Table Migration & Configuration

As a **developer**,
I want the embedding infrastructure unified and roadmap configuration in place,
So that all roadmap generation services have a consistent foundation to build on.

**Acceptance Criteria:**

**Given** the existing `goal_context_embeddings` table
**When** the migration runs
**Then** the table is renamed to `context_embeddings` with new columns: `content_type text NOT NULL DEFAULT 'intake_answer'` and `metadata jsonb DEFAULT '{}'` (FR3)
**And** existing rows are backfilled with appropriate `content_type` values (`intake_answer`, `goal_profile`)
**And** an HNSW index is present on the embedding column
**And** RLS policies are updated for the renamed table

**Given** existing IntakeService embedding listeners
**When** they write new embeddings
**Then** they include the `content_type` discriminator on insert (FR1, FR2)

**Given** the application configuration
**When** the app starts
**Then** `appConfig.roadmap` provides: matchCount, matchThreshold, rerankTopN, per-type model overrides (milestoneModel, weeklyModel, dailyModel), maxGenerationAttempts, generationTimeoutMs
**And** `appConfig.cohere` provides: apiVersion, model
**And** `COHERE_API_KEY` is read from environment variables

### Story 4.2: Context Retrieval Pipeline

As a **developer**,
I want a three-tier context retrieval pipeline that assembles relevant context for any generation type,
So that milestone, weekly plan, and daily objective generation all receive high-quality, personalized context.

**Acceptance Criteria:**

**Given** a generation request for a specific goal
**When** ContextPipelineService retrieves context
**Then** it embeds the query via AiService, calls the `match_goal_context` Supabase RPC function for HNSW filtered search by goal_id and user_id, and returns top-K candidates (FR4)
**And** the `match_goal_context` RPC function is created via migration with appropriate security

**Given** HNSW results are returned
**When** RerankService is called
**Then** it reranks chunks via direct HTTP POST to Cohere Rerank API and returns the top-N most relevant chunks (FR5)

**Given** the Cohere Rerank API is unavailable or fails
**When** RerankService catches the error
**Then** it falls back to returning raw HNSW results unranked (FR6)

**Given** HNSW vector search fails entirely
**When** ContextPipelineService catches the error
**Then** it falls back to direct SQL context assembly — fetching all intake data for the goal without relevance filtering (FR7)

**Given** reranked (or fallback) context chunks are available
**When** ContextPipelineService assembles the context
**Then** it produces a structured prompt with labeled sections: goal profile, intake Q&A, user profile, progress summaries, debrief highlights (FR8)
**And** cross-goal user profile data (`goal_id IS NULL`) is included in the context (FR10)

**Given** both HNSW and SQL fallback fail
**When** the pipeline catches the error
**Then** it returns a hard error — generation is blocked (no context available)

### Story 4.3: Generate Milestone Roadmap

As a **user**,
I want to generate a coaching roadmap with milestones planned backward from my deadline,
So that I have a structured, personalized plan from day one.

**Acceptance Criteria:**

**Given** an authenticated user with a goal in `intake_completed` or `active` status
**When** `POST /api/goals/:goalId/roadmap/generate` is called
**Then** the system creates a roadmap record with status `generating` (optimistic lock), retrieves context via ContextPipelineService, generates milestones via backward planning from the target deadline, validates the output, stores milestones, updates roadmap status to `complete`, transitions goal status to `active`, and returns the roadmap with milestones (FR11, FR12, FR54)
**And** the `roadmaps` and `milestones` tables are created via migration with RLS policies (FR37, FR38)
**And** the RoadmapModule, RoadmapController, RoadmapService, and GenerationService are implemented

**Given** a goal with a deadline over 3 months
**When** milestones are generated
**Then** the system produces 1 milestone per month (minimum 3 milestones total) (FR13)
**And** user constraints (effort level, available time, experience, deadline) are injected as explicit prompt variables (FR14)

**Given** the AI returns generated milestones
**When** JSON schema validation runs
**Then** the system validates milestones via class-validator (required fields, correct types, ordered structure) (FR15)
**And** on validation failure, the system attempts JSON repair (strip markdown fences, fix trailing commas, re-extract, re-validate) before rejecting (FR16)

**Given** milestone generation fails (AI error or validation failure after repair)
**When** the first attempt fails
**Then** the system retries once automatically (FR19)
**And** on second failure, roadmap status transitions to `failed` and goal status is unchanged (FR55)

**Given** a roadmap in `failed` status with fewer than 3 total attempts
**When** `POST /api/goals/:goalId/roadmap/generate` is called again
**Then** the system retries generation (FR20)

**Given** a roadmap that has already failed 3 times
**When** `POST /api/goals/:goalId/roadmap/generate` is called
**Then** the system returns 400 indicating max retries exceeded (FR20)

**Given** another request is made while a roadmap is already in `generating` status
**When** the optimistic lock check finds 0 affected rows
**Then** the system returns 409 Conflict (FR18)

**Given** a successful generation
**When** the result is stored
**Then** generation metadata (model, tokens, latency, context chunks used) is persisted on the roadmap record (FR17)

### Story 4.4: Retrieve Roadmap & Milestones

As a **user**,
I want to view my roadmap and milestones at any time,
So that I can see my long-term plan and track milestone progression.

**Acceptance Criteria:**

**Given** an authenticated user with a completed roadmap
**When** `GET /api/goals/:goalId/roadmap` is called
**Then** the system returns the roadmap with all milestones in order (FR42)

**Given** an authenticated user with a completed roadmap
**When** `GET /api/goals/:goalId/roadmap/milestones` is called
**Then** the system returns the milestones array as a summary view (title, description, expected_outcome, target_month, order_index) (FR43)

**Given** a goal with no roadmap or a roadmap in `failed` status
**When** `GET /api/goals/:goalId/roadmap` is called
**Then** the system returns 404 (no completed roadmap) or the roadmap with its current status

**Given** a request for another user's roadmap
**When** the query runs
**Then** RLS prevents access and returns 404

## Epic 5: Adaptive Weekly Planning

Users receive progress-adaptive weekly plans informed by their current milestone, prior progress, and accumulated feedback. The system auto-generates weekly and monthly summaries that compound into future planning context.

### Story 5.1: Generate and Retrieve Weekly Plan

As a **user**,
I want to receive a weekly plan that adapts to my actual progress and milestone targets,
So that each week's plan reflects reality — not a static schedule written months ago.

**Acceptance Criteria:**

**Given** an authenticated user with a completed roadmap and active milestone
**When** `GET /api/goals/:goalId/weekly-plan` is called and no active plan exists for the current week
**Then** the system generates a weekly plan on-demand, informed by: current monthly milestone, last monthly summary (if any), last weekly summary (if any), and previous daily objective completion data (FR21)
**And** the `weekly_plans` table is created via migration with RLS policies and UNIQUE constraint on appropriate fields (FR39)
**And** the generated plan is stored, linked to the current milestone, and returned

**Given** an authenticated user
**When** `POST /api/goals/:goalId/weekly-plan/generate` is called
**Then** the system explicitly generates a new weekly plan with the same context assembly as on-demand generation

**Given** the AI returns a generated weekly plan
**When** JSON schema validation runs
**Then** the system validates the plan via class-validator (required fields: focus, objectives array, week_number, week_start_date) (FR22)
**And** on validation failure, the system attempts JSON repair before rejecting

**Given** weekly plan generation fails on both attempts (initial + retry)
**When** the second attempt fails
**Then** the system creates a fallback plan using the current milestone's description and key objectives as the weekly focus (FR25)
**And** the fallback is stored as a real weekly plan record

**Given** an authenticated user with an active weekly plan
**When** `GET /api/goals/:goalId/weekly-plan` is called
**Then** the system returns the current active weekly plan with its daily objectives (FR44)

**Given** an active weekly plan whose `week_start_date + 7 days` has passed
**When** the user requests a new weekly plan or interacts with weekly plan endpoints
**Then** the system auto-transitions the old plan to `completed` status before generating the new one

### Story 5.2: Weekly & Monthly Summaries with Embedding

As a **user**,
I want the system to automatically summarize my progress each week and month,
So that future plans are informed by what actually happened — not just what was planned.

**Acceptance Criteria:**

**Given** a weekly plan is being completed (auto-transition to `completed`)
**When** the next weekly plan is requested
**Then** the system generates a weekly summary from: daily objective completion counts, debrief notes from that week, and energy level distribution (FR23)
**And** the summary includes both computed data (completion rate, objective counts, debrief count) and an optional LLM narrative when debriefs exist
**And** the summary is stored on the weekly plan record

**Given** the first weekly plan of a new milestone-month is requested
**When** previous weekly summaries exist for the prior month
**Then** the system generates a monthly summary from the weekly summaries of that month (FR24)
**And** the monthly summary is stored on the milestone record

**Given** a weekly summary or monthly summary is generated
**When** the summary is stored
**Then** the summary text is embedded into `context_embeddings` with `content_type = 'weekly_summary'` via AiService for future retrieval (FR9)
**And** embedding runs asynchronously and does not block the weekly plan generation response

**Given** embedding of a summary fails
**When** the error is caught
**Then** the error is logged and the summary remains stored without an embedding — no data loss

## Epic 6: Daily Coaching Loop

Users complete a morning check-in, receive energy-calibrated daily objectives, track completion, and optionally submit end-of-day debriefs. The daily engagement cycle that is the core product differentiator.

### Story 6.1: Morning Check-In

As a **user**,
I want to submit a quick morning check-in with my energy level,
So that the system knows how I feel today and can size my objectives accordingly.

**Acceptance Criteria:**

**Given** an authenticated user with an active goal (has completed roadmap)
**When** `POST /api/goals/:goalId/checkin` is called with `energy_level` (one of: high, good, low, very_low) and optional `note` (free text)
**Then** the check-in is stored and returned with 201 status (FR32)
**And** the `check_ins` table is created via migration with RLS policies and UNIQUE constraint on `(goal_id, date)` (FR41)

**Given** a user who already submitted a check-in for this goal today
**When** `POST /api/goals/:goalId/checkin` is called again
**Then** the system returns 409 Conflict (FR33)

**Given** a request with missing or invalid energy_level
**When** `POST /api/goals/:goalId/checkin` is called
**Then** the system returns 400 with validation errors

### Story 6.2: Generate Daily Objectives

As a **user**,
I want to receive daily objectives calibrated to my energy level and recent progress,
So that each day's plan is achievable and keeps me moving toward my weekly goals.

**Acceptance Criteria:**

**Given** an authenticated user who has submitted a morning check-in for today
**When** `GET /api/goals/:goalId/daily-objectives` is called and no objectives exist for today
**Then** the system generates daily objectives considering: current weekly plan, user's energy level from check-in, this week's completed/incomplete objectives, and recent debrief notes (FR26, FR27)
**And** the `daily_objectives` table is created via migration with RLS policies (FR40)
**And** the generated objectives are stored and returned

**Given** a user with energy_level `high` or `good`
**When** daily objectives are generated
**Then** the system produces more objectives with moderate-to-hard difficulty (FR28)

**Given** a user with energy_level `low` or `very_low`
**When** daily objectives are generated
**Then** the system produces fewer objectives with easy difficulty (FR28)

**Given** the AI returns generated daily objectives
**When** JSON schema validation runs
**Then** the system validates objectives via class-validator (required fields: title, description, order_index) (FR29)
**And** on validation failure, the system attempts JSON repair before rejecting

**Given** daily objective generation fails on both attempts (initial + retry)
**When** the second attempt fails
**Then** the system creates real `daily_objectives` rows from the weekly plan's objectives array with `is_fallback = true` (FR30)
**And** fallback objectives are still trackable (user can mark done/not done)

**Given** a user who has not submitted a check-in for today
**When** `GET /api/goals/:goalId/daily-objectives` is called
**Then** the system returns 400 indicating a check-in is required before daily objectives can be generated (FR26)

**Given** a check-in submission that failed (network/server error on client side)
**When** daily objective generation proceeds without a check-in
**Then** the system generates objectives with a default neutral (`good`) energy assumption (FR31)

**Given** a user who already has objectives for today
**When** `GET /api/goals/:goalId/daily-objectives` is called
**Then** the system returns the existing objectives (no regeneration)

### Story 6.3: Task Completion Tracking

As a **user**,
I want to mark my daily objectives as done or not done,
So that I can track my progress and the system can learn from my completion patterns.

**Acceptance Criteria:**

**Given** an authenticated user with daily objectives for today
**When** `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` is called with `{ "is_completed": true }`
**Then** the objective's `is_completed` field is updated and the updated objective is returned (FR34)

**Given** a user marking an objective as not done (reverting)
**When** `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` is called with `{ "is_completed": false }`
**Then** the objective is updated back to incomplete (FR34)

**Given** a request for an objective that doesn't belong to this user or goal
**When** the PATCH is attempted
**Then** RLS prevents access and returns 404

**Given** daily objectives are completed throughout a week
**When** the system tracks completion data
**Then** daily objective completion rates are calculated per week as a quality signal for future weekly plan generation (FR53)

### Story 6.4: End-of-Day Debrief

As a **user**,
I want to optionally submit an end-of-day reflection with task difficulty ratings,
So that the system can learn from my experience and adapt future objectives.

**Acceptance Criteria:**

**Given** an authenticated user with daily objectives for today
**When** `POST /api/goals/:goalId/debrief` is called with `note` (free text) and optional `task_ratings` (array of `{ objective_id, rating }` where rating is easy/moderate/hard)
**Then** the debrief is stored and returned with 201 status (FR35)
**And** the `debriefs` table is created via migration with RLS policies and UNIQUE constraint on `(goal_id, date)` (FR41)

**Given** a user who already submitted a debrief for this goal today
**When** `POST /api/goals/:goalId/debrief` is called again
**Then** the system returns 409 Conflict (FR36)

**Given** a debrief is successfully stored
**When** the `debrief.submitted` event fires
**Then** the debrief note text is embedded into `context_embeddings` with `content_type = 'debrief_note'` asynchronously via EventEmitter2 (FR9)
**And** embedding failure is logged but does not affect the debrief response

**Given** an authenticated user
**When** `GET /api/goals/:goalId/checkin` history or `GET /api/goals/:goalId/debrief` history is requested
**Then** the system returns check-in and debrief records for the goal, ordered by date (FR45)

## Epic 7: Generation Quality & Observability

The system evaluates each generation type asynchronously via LLM-as-judge with type-specific scoring dimensions, stores quality scores, logs warnings on low scores, and logs per-chunk retrieval details for observability.

### Story 7.1: Per-Type Quality Evaluation

As a **team member**,
I want each generation scored for quality behind the scenes with type-specific dimensions,
So that quality regressions are detected automatically and generation can be improved over time.

**Acceptance Criteria:**

**Given** a milestone generation completes successfully
**When** the generation event fires via EventEmitter2
**Then** QualityService evaluates the milestones asynchronously via LLM-as-judge (FR46)
**And** scores are computed on: coherence, personalization, progression, and deadline-alignment (0-5 scale each) (FR47)
**And** scores are stored on the roadmap record (FR50)
**And** the evaluation has zero impact on the generation response latency (NFR7)

**Given** a weekly plan generation completes successfully
**When** the generation event fires
**Then** QualityService evaluates the plan on: milestone-alignment, progress-adaptation, and actionability (0-5 scale each) (FR48)
**And** scores are stored on the weekly plan record (FR50)

**Given** a daily objective generation completes successfully
**When** the generation event fires
**Then** QualityService evaluates the objectives on: energy-calibration, specificity, and achievability (0-5 scale each) (FR49)
**And** scores are stored per generation event (FR50)

**Given** any quality dimension scores below 3/5
**When** the score is stored
**Then** the system logs a warning with generation context (goal ID, generation type, individual dimension scores) (FR51)

**Given** the LLM-as-judge call fails
**When** the error is caught
**Then** the error is logged and the generation continues without quality scores — no user impact

### Story 7.2: Retrieval Observability Logging

As a **team member**,
I want per-chunk retrieval details logged for every context retrieval operation,
So that I can debug context quality issues and tune retrieval parameters.

**Acceptance Criteria:**

**Given** ContextPipelineService executes a retrieval operation
**When** chunks are retrieved and reranked
**Then** the system logs per-chunk details: source type (intake_answer, goal_profile, user_profile, weekly_summary, debrief_note), relevance score (HNSW similarity + rerank score), and selection decision (included/excluded) (FR52)

**Given** a fallback to raw HNSW results (rerank failure)
**When** the retrieval completes
**Then** logs indicate the fallback occurred and include HNSW scores only (no rerank scores)

**Given** a fallback to SQL context stuffing (HNSW failure)
**When** the retrieval completes
**Then** logs indicate the SQL fallback and list the context chunks assembled without relevance scoring
