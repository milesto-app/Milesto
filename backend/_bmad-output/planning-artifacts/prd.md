---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain-skipped
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments:
  - tech-spec-goal-intake-system.md
  - tech-spec-review-solutions.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 2
classification:
  projectType: api_backend
  domain: consumer_ai_coaching
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
---

# Product Requirements Document - momentum_back

**Author:** Sobsh
**Date:** 2026-02-08

## Executive Summary

Momentum is an AI-powered personal coaching platform. Users set goals, complete an adaptive intake flow that deeply understands their situation, and receive personalized coaching roadmaps.

This PRD covers the **Goal Intake System** — the backend API that powers the intake experience. It is the first module of the Momentum platform.

**Product Vision:** Any person with any goal can receive coaching that feels tailored to them — starting from the very first interaction.

**Differentiator:** The intake adapts in real-time. A persistent user profile eliminates redundant questions across goals. AI-generated batches get progressively sharper. The result is a structured goal profile rich enough to drive a detailed, personalized coaching roadmap.

**Target Users:** Anyone with a goal — fitness, career, financial, creative, habit formation. No domain restriction.

**Team:** 2-person team (Sobsh + co-founder). Greenfield API backend. Supabase for database and auth, OpenRouter for AI.

## Success Criteria

### User Success

- Intake feels conversational and natural, not clinical
- Questions adapt to what users have already shared — no redundancy
- Intake completes in 3-5 batches without feeling rushed or dragged out
- Generated goal profile accurately reflects the user's situation, motivation, and constraints

### Business Success

- LLM-as-judge quality scores consistently above 0.5 composite (warn threshold), targeting 0.7+ average across relevance, depth progression, dimension coverage, and redundancy avoidance
- Goal profile contains enough structured context to generate a detailed, personalized coaching roadmap
- No user is ever blocked from completing intake (fallback batches, retry mechanisms)

### Technical Success

- AI-generated batch response times under 10 seconds
- Hardcoded batch 1 served instantly (no AI round-trip)
- Zero data loss on answer submissions (two-transaction split)
- Embedding pipeline tracks completeness — missed embeddings discoverable and recoverable
- Quality evaluation runs async with zero impact on user-facing latency

### Measurable Outcomes

- Goal profile validation passes on first attempt >90% of the time
- Fallback batch rate <5% of total batches served
- Intake completion rate >80% (users who start intake finish it)

## User Journeys

### Journey 1: Maya — First Goal, Fresh Start (Primary User, Happy Path)

Maya is 28, just decided she wants to run a marathon in 6 months. She signs up, taps "Create Goal," and types her goal.

Immediately, 5 questions appear — motivation, time commitment, success vision, timeline, past attempts. Instant, no loading (hardcoded batch 1). She taps through scale and choice questions, writes a couple of sentences for the text ones. Submits.

Brief loading while AI generates batch 2. It noticed she picked "No, first time" and "3-5 hours/week," so it digs into her fitness level, injuries, and running history. The questions feel like they're listening.

Two more batches, each sharper. By batch 4, the AI signals completion. "Building your coaching profile..." — goal profile generated, status flips to `intake_completed`.

**Capabilities revealed:** Goal creation, instant batch 1, AI question generation, answer submission with inline next-batch, profile generation, status lifecycle.

### Journey 2: Alex — Rich Profile, Second Goal (Primary User, Returning)

Alex has used Momentum for a month. Completed intake for "Get promoted to senior engineer." His profile says: "29-year-old software engineer, 4 years experience, procrastinates on long-term projects, motivated by deadlines."

Creates second goal: "Save $20k for a house down payment." Batch 1 is the same universal questions. But batch 2 skips personality questions — the AI already knows he procrastinates and is deadline-driven. Instead, it zeroes in on finances, spending habits, and trade-offs. Intake completes in 3 batches.

**Capabilities revealed:** Persistent user profile across goals, AI avoiding redundancy with profile content, shorter intakes for rich profiles, multi-goal support.

### Journey 3: Sam — When Things Go Wrong (Primary User, Edge Cases)

Sam creates a goal. Batch 1 fine. AI call for batch 2 times out (30s). System retries once — still fails. Fallback batch served seamlessly: 2-3 open-ended text questions. Sam doesn't know anything went wrong.

Intake completes. Profile generation fails on first attempt — status sits at `profile_generating`. Retry button appears. Second attempt works.

Worse scenario: 3 failures → `profile_generation_failed`. Sam can delete the goal and start over.

Other edge cases: double-tap submit → 409 ("already submitted"). App closed mid-intake → `next-batch` re-serves the unanswered batch with same `batch_id`, app restores draft answers.

**Capabilities revealed:** AI timeout + fallback batches, profile generation retry (3 attempts), terminal failure state, goal deletion, duplicate submission handling (409), batch re-serving.

### Journey 4: Sobsh & Co-founder — Keeping It Healthy (Admin/Ops)

Check Supabase dashboard for `intake_batches` with low quality scores (composite below 0.5). Investigate prompt tuning needs. Query `intake_batches WHERE embedded = false` to find missed embeddings. Hit admin reembed endpoint to recover.

No dedicated admin UI for MVP. Supabase dashboard + SQL + one admin endpoint.

**Capabilities revealed:** Quality score monitoring, LOG.warn alerting, embedding tracking, admin reembed endpoint.

### Journey Requirements Summary

| Capability | Journeys |
|---|---|
| Goal CRUD + status lifecycle | Maya, Sam |
| User profile persistence | Alex |
| Hardcoded batch 1 (instant) | Maya, Alex |
| AI question generation (adaptive) | Maya, Alex |
| Answer submission + inline next-batch | Maya, Alex, Sam |
| Answer-type validation + ownership check | Sam |
| Fallback batch resilience | Sam |
| Profile generation + retry | Maya, Sam |
| Duplicate submission handling (409) | Sam |
| Batch re-serving (interrupted sessions) | Sam |
| pgvector embedding pipeline | Sobsh (admin) |
| Quality score monitoring | Sobsh (admin) |
| Admin reembed endpoint | Sobsh (admin) |
| Rate limiting | All users |

## API Backend Specific Requirements

### Project-Type Overview

RESTful JSON API built with NestJS 11 (TypeScript, ESM). Backend for a mobile coaching app. All endpoints prefixed with `/api`. Supabase for database and auth. OpenRouter (via OpenAI SDK) for AI.

### Endpoint Specification

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/user-profile` | GET | Get or auto-create user profile |
| `/api/user-profile` | PATCH | Update profile free-text |
| `/api/goals` | POST | Create goal (starts intake) |
| `/api/goals` | GET | List goals (paginated) |
| `/api/goals/:goalId` | GET | Get single goal |
| `/api/goals/:goalId` | DELETE | Delete goal (restricted by status) |
| `/api/goals/:goalId/intake/next-batch` | GET | Get next unanswered batch |
| `/api/goals/:goalId/intake/submit-batch` | POST | Submit answers, get next batch inline |
| `/api/goals/:goalId/intake/retry-profile` | POST | Retry failed profile generation |
| `/api/goals/:goalId/profile` | GET | Get generated goal profile |

### Authentication Model

- Supabase Auth with JWT Bearer tokens
- `AuthGuard` validates token via `auth.getUser()`, attaches user to request
- `@UserId()` decorator extracts user ID
- RLS on all tables using `(select auth.uid())`
- 401 on missing/invalid token

### Data Schemas

- **Format:** JSON only
- **Validation:** `class-validator` + `class-transformer` via global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform)
- **Polymorphic answers:** `text_value`, `numeric_value`, `selected_options` — type-dependent
- **Goal profile:** Structured JSON (`current_state`, `desired_state`, `constraints`, `motivation`, `domain_context`) + narrative summary

### Error Codes

| Code | Scenario |
|---|---|
| 400 | Invalid input, answer-type mismatch, goal deletion on completed goal, max retry attempts |
| 401 | Missing/invalid Bearer token |
| 404 | Goal not found or intake not complete (profile endpoint) |
| 409 | Duplicate batch submission (Postgres 23505) |
| 429 | Rate limit exceeded |

### Rate Limits

- **Global:** 60 requests/minute per user
- **AI-calling endpoints** (`submit-batch`, `next-batch`): 10 requests/minute per user

### Implementation Considerations

- Two-transaction split on `submit-batch`: answers always persisted, next-batch generation separate
- AI calls use 30-second timeout (configurable via `AI_CALL_TIMEOUT_MS`)
- EventEmitter2 for async fire-and-forget: quality evaluation, embedding pipeline
- Global error handler on EventEmitter2 to surface swallowed errors
- CORS enabled for mobile client access
- No API versioning for v1
- No SDK — mobile client consumes REST directly

## Project Scoping & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — deliver the complete intake experience so the system deeply understands a user's goal, ready to feed the coaching engine.

**Resources:** 2-person team. No external dependencies beyond Supabase and OpenRouter.

### Phase 1 — MVP

All four user journeys supported (Maya, Alex, Sam, Admin/Ops).

- User profile CRUD (persistent free-text across goals)
- Goal CRUD with full status lifecycle (`intake_in_progress` → `profile_generating` → `intake_completed` / `profile_generation_failed` → `active`)
- Goal deletion (restricted by status)
- Hardcoded universal batch 1 (instant, no AI)
- AI-generated batches 2+ (adaptive, profile-aware, redundancy-avoiding)
- Answer submission with inline next-batch response
- Answer-type cross-validation and ownership verification
- Batch budget (target 3-5, hard cap 7)
- Fallback batch resilience (pre-written question pool)
- Profile generation with retry mechanism (3 attempts, terminal failure state)
- 3-layer quality framework (structural + semantic sync, LLM-as-judge async)
- pgvector embedding pipeline (batch Q&A, goal profiles, user profiles)
- Embedding tracking (`embedded` boolean) + admin reembed endpoint
- Rate limiting (global 60/min, AI endpoints 10/min)
- Prompt regression test suite
- RLS on all tables

### Phase 2 — Growth

- Coaching system consuming the goal profile (milestones → weeks → days)
- Coach persona selection
- Quality score dashboards and alerting beyond LOG.warn
- Admin UI for monitoring and re-embedding
- Answer editing with cascading regeneration

### Phase 3 — Expansion

- Multi-goal coaching with cross-goal context awareness
- Proactive check-ins and progress tracking feeding into semantic context
- Goal evolution — updating roadmap as user's situation changes
- Community features, accountability partners

### Risk Mitigation

**Technical:** AI call failures mitigated by 30s timeouts, single retry, fallback batches, two-transaction split. Profile generation has 3-attempt retry with terminal state. Embedding failures tracked and recoverable.

**Market:** Intake quality determines coaching quality. LLM-as-judge scoring provides early signal. Prompt regression suite catches regressions before they reach users.

**Resource:** 2-person team, well-defined tech spec. If needed, embedding pipeline and quality scoring could be temporarily deferred without breaking core flow.

## Functional Requirements

### User Profile Management

- FR1: Users can retrieve their profile (auto-created on first access)
- FR2: Users can update their profile with free-text personal context
- FR3: System re-embeds user profile text into semantic context when updated

### Goal Management

- FR4: Users can create a goal with a title and description
- FR5: Users can list their goals with pagination
- FR6: Users can view a single goal with its current status
- FR7: Users can delete a goal in `intake_in_progress`, `profile_generating`, or `profile_generation_failed` status
- FR8: System prevents deletion of goals in `intake_completed` or `active` status
- FR9: System tracks goal status through full lifecycle (intake_in_progress → profile_generating → intake_completed / profile_generation_failed → active)

### Intake Flow Orchestration

- FR10: System serves hardcoded universal first batch instantly (no AI call)
- FR11: System generates adaptive follow-up batches informed by user profile, goal description, and all prior answers
- FR12: System avoids questions redundant with user's profile content
- FR13: System supports text, scale (custom anchors), single choice, and multiple choice question types
- FR14: Users can submit answers and receive next batch inline in the same response
- FR15: System re-serves unanswered batch when user returns to interrupted session
- FR16: System targets completion in 3-5 batches with hard cap at 7
- FR17: System progressively tightens question generation (fewer questions, more quick-tap types in later batches)

### Answer Validation

- FR18: System validates each answer belongs to the current batch for the user's goal
- FR19: System cross-validates answer values against question type constraints
- FR20: System rejects duplicate batch submissions with 409 conflict response

### Resilience & Error Recovery

- FR21: System retries failed AI question generation once, then serves fallback batch
- FR22: Fallback batches count toward the 7-batch hard cap
- FR23: Consecutive fallback batches serve different questions from the pool
- FR24: System generates structured goal profile upon intake completion
- FR25: System validates profile contains all required sections (current_state, desired_state, constraints, motivation, domain_context)
- FR26: Users can retry failed profile generation up to 3 attempts
- FR27: System transitions goal to terminal failure state after 3 failed attempts
- FR28: Submitted answers are preserved even when next-batch generation fails

### Goal Profile

- FR29: Users can retrieve their goal's AI-generated profile after intake completion
- FR30: Profile includes structured data sections plus narrative summary
- FR31: System returns 404 when profile requested before intake completion

### Semantic Context Pipeline

- FR32: System embeds batch Q&A text into vector store after each batch submission
- FR33: System embeds goal profile narrative into vector store after generation
- FR34: System embeds user profile text as global entry (goal_id = NULL) in vector store
- FR35: System tracks embedding completion status per batch and per profile
- FR36: Admins can trigger re-embedding for entries that failed to embed

### Quality Monitoring

- FR37: System validates AI-generated questions structurally (valid JSON, required fields, correct types, 3-5 questions per batch)
- FR38: System validates AI-generated questions semantically (interrogative structure, uniqueness, option distinctness, type variety)
- FR39: System evaluates batch quality asynchronously via LLM-as-judge without blocking the user
- FR40: System stores quality scores per batch
- FR41: System logs warning when quality scores drop below threshold

### Access Control & Rate Limiting

- FR42: System authenticates all requests via Bearer token
- FR43: System enforces row-level access — users can only access their own data
- FR44: System enforces global rate limit on all endpoints
- FR45: System enforces tighter rate limit on AI-calling endpoints

## Non-Functional Requirements

### Performance

- NFR1: Hardcoded batch 1 responses in under 200ms
- NFR2: AI-generated batch responses in under 10 seconds end-to-end
- NFR3: Goal profile generation within 30 seconds (AI call timeout)
- NFR4: Async operations (quality evaluation, embedding) zero impact on user-facing latency
- NFR5: Answer storage (Transaction 1) in under 500ms regardless of Transaction 2 outcome

### Security

- NFR6: All data transmitted over HTTPS
- NFR7: API keys and service role keys never exposed to client
- NFR8: Row-level security enforced at database level — no cross-user data access

### Reliability

- NFR9: AI failures never block intake progression (fallback batches)
- NFR10: Profile generation recoverable via retry (up to 3 attempts)
- NFR11: Answer data never lost — two-transaction split
- NFR12: Embedding failures tracked and recoverable without data loss
- NFR13: EventEmitter2 errors logged, never silently swallowed

### Integration

- NFR14: AI call timeout configurable via `AI_CALL_TIMEOUT_MS` env var (default 30s)
- NFR15: Embedding model locked to `text-embedding-3-small` (1536 dimensions) — changes require full re-embedding
- NFR16: Default AI model configurable via `DEFAULT_AI_MODEL` env var
