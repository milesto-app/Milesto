---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-08'
extensionStarted: '2026-02-20'
extensionStepsCompleted: [1, 2, '3-skipped', 4, 5, 6, 7, 8]
extensionCompletedAt: '2026-02-20'
extension2Started: '2026-02-21'
extension2Reason: 'PRD fundamental redesign — adaptive incremental planning replaces generate-everything-at-once model'
extension2StepsCompleted: [1, 2, '3-skipped', 4, 5, 6, 7, 8]
extension2CompletedAt: '2026-02-21'
inputDocuments:
  - planning-artifacts/prd.md
  - implementation-artifacts/tech-spec-goal-intake-system.md
  - implementation-artifacts/tech-spec-review-solutions.md
  - planning-artifacts/prd-roadmap-generation.md
  - planning-artifacts/prd-roadmap-generation-validation-report.md
  - planning-artifacts/research/domain-roadmap-generation-research-2026-02-20.md
  - planning-artifacts/research/technical-context-retrieval-roadmap-generation-research-2026-02-20.md
workflowType: 'architecture'
project_name: 'momentum_back'
user_name: 'Sobsh'
date: '2026-02-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
45 FRs across 7 capability groups:
- **User Profile (FR1-3):** Persistent free-text profile, auto-creation, re-embedding on update
- **Goal Management (FR4-9):** CRUD with full status lifecycle including intermediate/error states, deletion restrictions
- **Intake Orchestration (FR10-17):** Hardcoded batch 1, AI-adaptive batches 2+, profile-aware redundancy avoidance, progressive tightening, batch budget (3-5 target, 7 hard cap)
- **Answer Validation (FR18-20):** Ownership verification (question → batch → goal → user), type-constraint cross-validation, duplicate submission handling (409)
- **Resilience & Recovery (FR21-28):** AI retry + fallback batches, profile generation retry (3 attempts, terminal failure state), two-transaction split
- **Semantic Context (FR32-36):** pgvector embedding pipeline for batch Q&A, goal profiles, user profiles (global). Tracking via `embedded` boolean + admin reembed
- **Quality Monitoring (FR37-41):** 3-layer framework (structural sync, semantic sync, LLM-as-judge async), composite scoring with LOG.warn threshold

**Non-Functional Requirements:**
16 NFRs driving key architectural decisions:
- **Performance:** Hardcoded batch 1 < 200ms, AI batches < 10s, answer storage < 500ms regardless of batch generation outcome, zero-latency impact from async operations
- **Security:** HTTPS only, no client-exposed secrets, database-level RLS on all tables
- **Reliability:** AI failures never block progression (fallback), answers never lost (two-transaction), embedding failures tracked and recoverable
- **Integration:** Configurable AI timeout (30s default), locked embedding model (text-embedding-3-small, 1536d), configurable default AI model

**Scale & Complexity:**
- Primary domain: API backend (REST, consumed by mobile client)
- Complexity level: Medium
- Estimated architectural components: 6 modules (Supabase, AI, UserProfile, Goal, Intake, plus AppModule orchestration), 10 database tables, 10 API endpoints

### Technical Constraints & Dependencies

- **NestJS 11 + TypeScript ESM** — `nodenext` module resolution, `.js` import extensions
- **Supabase** — sole database (Postgres + pgvector), auth provider (JWT Bearer tokens), RLS enforcement
- **OpenRouter (via OpenAI SDK)** — sole AI provider for chat completions and embeddings. Model swapping is a config change, not an architecture change.
- **2-person team** — architecture must be simple, conventional, and low-ceremony. No hexagonal/clean architecture overhead.
- **Greenfield** — no legacy constraints, but existing tech spec decisions have been implemented (partially — `SupabaseModule`, `AiModule`, `GoalModule`, `IntakeModule` already exist per git history)

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — AuthGuard + RLS on every table. RLS policies use `(select auth.uid())` for query-plan optimization. FK indexes critical for RLS subquery performance.
2. **AI Call Resilience** — 30s AbortController timeout on all AI calls. Retry once → fallback for question generation, intermediate status + retry endpoint for profile generation.
3. **Async Event Processing** — EventEmitter2 for fire-and-forget quality evaluation and embedding. Global error handler to surface listener failures. Events: `batch.served`, `batch.answered`, `profile.generated`, `user-profile.updated`.
4. **Rate Limiting** — Global 60 req/min, tighter 10 req/min on AI-calling endpoints via `@nestjs/throttler`.
5. **Data Integrity** — Two-transaction split on submit-batch, UNIQUE constraint on `(goal_id, batch_number)`, answer-type cross-validation, question ownership verification.

## Starter Template Evaluation

### Primary Technology Domain

API/Backend — NestJS 11 REST API consumed by a mobile client. No frontend, no SSR, no monorepo.

### Starter Options Considered

| Starter | Version | Fit | Notes |
|---|---|---|---|
| `nest new` (NestJS CLI) | CLI v11.0.16, NestJS v11.1.13 | Best fit | Canonical NestJS scaffold, lightweight, customizable |
| Supabase Edge Functions | N/A | Poor | Deno-based serverless, doesn't match NestJS requirement |
| Express/Fastify raw | N/A | Poor | Loses NestJS DI, modules, decorators, testing infrastructure |

### Selected Starter: NestJS CLI (`nest new`)

**Rationale:** Standard NestJS scaffold provides the right foundation — TypeScript, Jest, ESLint, module structure — without opinionated choices that conflict with the project's needs. The scaffold was already initialized and customized for ESM + `nodenext`.

**Initialization Command:**

```bash
npx @nestjs/cli@11 new momentum_back --package-manager npm --strict
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
TypeScript 5.x with strict mode. Manually adjusted to ESM with `nodenext` module resolution and `.js` import extensions.

**Build Tooling:**
`nest build` (tsc-based). `nest start --watch` for development. No SWC or Webpack — plain tsc is sufficient for a backend API.

**Testing Framework:**
Jest with `@nestjs/testing` utilities. Unit tests via `npm test`, e2e tests via `npm run test:e2e`. Prompt regression suite added as custom script (`npm run test:intake-quality`).

**Code Organization:**
Feature-based module structure (one folder per domain module with co-located controller, service, DTOs). Global modules for cross-cutting services (Supabase, AI).

**Development Experience:**
Hot reload, TypeScript strict mode, ESLint + Prettier, NestJS CLI generators (`nest g module/controller/service`).

**Additional Dependencies Added Post-Scaffold:**
- `@supabase/supabase-js` — database + auth
- `openai` — AI via OpenRouter
- `@nestjs/event-emitter` — async fire-and-forget events
- `@nestjs/throttler` — rate limiting
- `class-validator` + `class-transformer` — DTO validation

**Note:** Project is already initialized — this documents the existing foundation rather than prescribing a new scaffold.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data architecture: Supabase Postgres + pgvector, migrations via MCP tool
- Auth: Supabase Auth + JWT + RLS (already decided in tech spec)
- API style: REST with NestJS default error responses
- Environment config: `@nestjs/config` with `.env` files

**Important Decisions (Shape Architecture):**
- API documentation: Swagger/OpenAPI auto-generated from decorators
- No application-level caching — Postgres handles its own query caching
- NestJS built-in Logger for all observability

**Deferred Decisions (Post-MVP):**
- Hosting platform — develop locally, deploy when ready
- CI/CD pipeline — manual deployment for now, add automation when release cadence demands it
- Structured logging (Pino/Winston) — defer until production log aggregation is needed

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Database | Supabase Postgres + pgvector | Single database for relational and vector data. No separate vector DB. |
| Migrations | Supabase MCP tool (direct apply) | 2-person team, migrations documented in tech spec. No local migration files needed. |
| Caching | None for MVP | AI batches are unique per user/goal (not cacheable). Profile/goal reads are small. Postgres query caching is sufficient. Defer until performance data says otherwise. |
| Data Validation | class-validator + class-transformer via global ValidationPipe | Already decided in tech spec. Whitelist, forbidNonWhitelisted, transform. |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Authentication | Supabase Auth with JWT Bearer tokens | Already decided. AuthGuard validates via `auth.getUser()`. |
| Authorization | Row-Level Security on all tables | Database-level enforcement. Policies use `(select auth.uid())` for query-plan optimization. |
| API Security | Rate limiting via @nestjs/throttler | Global 60/min, AI endpoints 10/min. CORS enabled for mobile client. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| API Style | REST, JSON, `/api` prefix | Already decided. 10 endpoints defined in tech spec. |
| Error Responses | NestJS default (`{ statusCode, message, error }`) | Built-in with HttpException subclasses. Mobile client keys off statusCode. Zero custom code needed. |
| API Documentation | Swagger/OpenAPI via `@nestjs/swagger` | Auto-generated from decorators. Interactive docs for the mobile client developer. Add `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to controllers. |
| Async Communication | EventEmitter2 (fire-and-forget) | Quality evaluation, embedding pipeline, profile re-embedding. Global error handler on EventEmitter2 instance. |

### Frontend Architecture

Not applicable — this is a backend API only. Mobile client is a separate project.

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Deferred | Develop locally against Supabase cloud project. Choose hosting platform when ready to deploy. |
| CI/CD | Deferred | Manual deployment for MVP. 2-person team doesn't need automated pipelines yet. |
| Environment Config | `.env` (secrets) + `app.config.ts` (settings) | `.env` for API keys and secrets only (via `@nestjs/config`). `src/config/app.config.ts` for non-sensitive config (AI model, timeouts, batch limits, throttle settings) — typed TypeScript, version controlled. |
| Monitoring & Logging | NestJS built-in Logger | Console output, sufficient for MVP. Quality scores already trigger `LOG.warn`. Upgrade to structured logging when production log aggregation is needed. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Environment config (`@nestjs/config`) — foundational, all modules read from it
2. Database migrations via Supabase MCP — tables must exist before services
3. Auth (AuthGuard + RLS) — security foundation
4. Core modules (UserProfile, Goal, Intake) — feature implementation
5. Swagger decorators — can be added incrementally as endpoints are built
6. Rate limiting — apply after core endpoints work

**Cross-Component Dependencies:**
- `@nestjs/config` feeds env vars to SupabaseModule (URL, keys) and AiModule (API key, timeout, model)
- Swagger decorators live on controllers but have zero impact on service logic
- Rate limiting is declarative (`@Throttle` decorator) — no coupling to business logic

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices — all resolved below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: `snake_case`, plural (`user_profiles`, `intake_batches`, `goal_context_embeddings`)
- Columns: `snake_case` (`user_id`, `batch_number`, `created_at`, `scale_labels`)
- Foreign keys: `{referenced_table_singular}_id` (`goal_id`, `batch_id`, `question_id`)
- Indexes: `idx_{table}_{column}` (`idx_intake_batches_goal_id`)
- Constraints: descriptive (`UNIQUE(goal_id, batch_number)`)
- Enums via CHECK constraints, not Postgres enum types (easier to modify)

**API Naming Conventions:**
- Endpoints: plural nouns, kebab-case (`/api/goals`, `/api/goals/:goalId/intake/next-batch`)
- Route params: `camelCase` (`:goalId`, not `:goal_id`)
- Query params: `camelCase` (`?limit=20&offset=0`)
- JSON response fields: `snake_case` (matching database columns directly — no transformation layer)

**Code Naming Conventions:**
- Files: `kebab-case.ts` (`intake-prompt.service.ts`, `create-goal.dto.ts`)
- Classes: `PascalCase` (`IntakeService`, `CreateGoalDto`, `AuthGuard`)
- Methods/functions: `camelCase` (`getNextBatch`, `submitAnswers`, `generateJSON`)
- Variables: `camelCase` (`batchNumber`, `userId`, `qualityScores`)
- Constants: `UPPER_SNAKE_CASE` for env var names and config keys (`AI_CALL_TIMEOUT_MS`, `DEFAULT_AI_MODEL`)
- Interfaces/types: `PascalCase`, no `I` prefix (`BatchQuestion`, not `IBatchQuestion`)
- DTOs: `PascalCase` with `Dto` suffix (`CreateGoalDto`, `SubmitAnswersDto`)
- All imports use `.js` extension

### Structure Patterns

**Project Organization:**
```
src/
  main.ts
  app.module.ts
  config/                     # @nestjs/config setup
    config.module.ts
  supabase/                   # @Global() module
    supabase.module.ts
    supabase.service.ts
  ai/                         # @Global() module
    ai.module.ts
    ai.service.ts
  common/                     # Shared utilities
    guards/auth.guard.ts
    decorators/user.decorator.ts
  user-profile/               # Feature module
    user-profile.module.ts
    user-profile.controller.ts
    user-profile.service.ts
    dto/
      update-profile.dto.ts
  goal/                       # Feature module
    goal.module.ts
    goal.controller.ts
    goal.service.ts
    dto/
      create-goal.dto.ts
  intake/                     # Feature module
    intake.module.ts
    intake.controller.ts
    intake.service.ts
    intake-prompt.service.ts
    intake-quality.service.ts
    dto/
      submit-answers.dto.ts
    testing/                  # Prompt regression suite
      fixtures/
      evaluators/
      baselines/
      intake-quality.spec.ts
```

**Rules:**
- One folder per feature module, co-located controller + service(s) + DTOs
- `common/` for shared guards, decorators, pipes, interceptors
- DTOs in a `dto/` subfolder within each module
- Unit tests co-located: `*.spec.ts` next to the file being tested
- No `shared/` or `utils/` folder — if it's shared, it goes in `common/`
- No barrel exports (`index.ts`) — import directly from the file

### Format Patterns

**API Response Formats:**
- Success responses: return the resource directly (no wrapper). E.g., `POST /api/goals` returns the goal object.
- List responses: `{ data: [...], total: number, limit: number, offset: number }`
- Error responses: NestJS default `{ statusCode: number, message: string | string[], error: string }`
- Empty success: `204 No Content` (e.g., DELETE)
- Dates in JSON: ISO 8601 strings (`2026-02-08T13:20:59.568Z`)
- Nulls: include null fields explicitly (don't omit them)

**Data Exchange:**
- JSON fields: `snake_case` (database columns pass through directly)
- Booleans: `true`/`false` (never `1`/`0`)
- Arrays: always arrays, even for single items (no unwrapping)
- UUIDs: lowercase string format

### Communication Patterns

**Event System:**
- Event names: `dot.notation`, lowercase (`batch.served`, `batch.answered`, `profile.generated`, `user-profile.updated`)
- Event payloads: typed objects with the minimum data needed (IDs + context, not full entities)
- All event listeners: `@OnEvent('event.name')` decorator
- All events: fire-and-forget — never `await` the emit, never expect a return value
- Global error handler on EventEmitter2 catches listener failures

**Logging:**
- Use NestJS `Logger` class, one per service: `private readonly logger = new Logger(IntakeService.name)`
- Log levels: `error` for failures, `warn` for quality threshold breaches, `log` for significant lifecycle events, `debug` for development
- Never log sensitive data (tokens, full user profiles)
- Log context: include `goalId`, `userId`, `batchNumber` where relevant

### Process Patterns

**Error Handling:**
- Controllers: let exceptions propagate — NestJS exception filter handles the response
- Services: throw NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, `ConflictException`)
- Supabase errors: check `.error` on response, throw appropriate HTTP exception
- AI call failures: catch in service, follow retry → fallback pattern (never propagate raw AI errors to client)
- Postgres 23505 (unique violation): catch and throw `ConflictException`

**Supabase Client Usage:**
- Admin client (`getAdminClient()`): for all server-side operations in services. This is the default.
- User-scoped client: only in AuthGuard for `auth.getUser()` token verification
- RLS is the authorization layer — admin client bypasses it, so services must scope queries with `user_id` filters

**Validation Pattern:**
- DTO validation at controller boundary (global ValidationPipe handles this)
- Business validation in services (e.g., answer-type cross-validation, status checks)
- Database constraints as last line of defense (UNIQUE, CHECK, NOT NULL)

**AI Call Pattern:**
- All AI calls go through `AiService.generateJSON()` or `AiService.generateEmbedding()`
- 30s AbortController timeout on every call
- On failure: retry once, then fallback (question generation) or leave in retryable state (profile generation)
- Never call OpenRouter/OpenAI SDK directly from feature services

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `.js` extensions on all relative imports
- Use `snake_case` for database columns and JSON response fields
- Use NestJS HTTP exceptions (never raw `Error` or custom exception classes)
- Use `Logger` from `@nestjs/common` (never `console.log`)
- Access Supabase via `SupabaseService.getAdminClient()` (never create clients directly)
- Access AI via `AiService` methods (never import OpenAI SDK directly)
- Emit events via EventEmitter2 for all async side effects
- Include `.spec.ts` unit tests for any new service logic
- Import `appConfig` directly for non-sensitive settings (never put non-secrets in `.env`)
- Use `ConfigService.get()` only for `.env` secrets (API keys, URLs with credentials)

### Pattern Examples

**Good:**
```typescript
// Correct: snake_case JSON, .js import, NestJS exception, Logger
import { IntakePromptService } from './intake-prompt.service.js';

const { data, error } = await supabase
  .from('intake_batches')
  .select('*')
  .eq('goal_id', goalId);

if (error) throw new NotFoundException('Batch not found');
this.logger.log(`Batch ${batchNumber} served for goal ${goalId}`);
```

**Anti-Patterns:**
```typescript
// WRONG: camelCase JSON field, direct SDK import, console.log
import OpenAI from 'openai';
const result = { goalId: '...', batchNumber: 1 }; // should be goal_id, batch_number
console.log('batch served'); // should use this.logger.log()
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
momentum_back/
├── .env                          # Secrets only (gitignored)
├── .env.example                  # Template for required secrets
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── nest-cli.json
├── package.json
├── package-lock.json
├── tsconfig.json                 # ESM, nodenext, strict
├── tsconfig.build.json
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
└── src/
    ├── main.ts                   # Bootstrap, global prefix, ValidationPipe, CORS
    ├── app.module.ts             # Root module: all modules + EventEmitter + Throttler
    │
    ├── config/
    │   ├── config.module.ts      # @nestjs/config ConfigModule (.env secrets only)
    │   └── app.config.ts         # Non-sensitive settings (AI model, timeouts, batch limits, throttle)
    │
    ├── supabase/                 # @Global()
    │   ├── supabase.module.ts
    │   └── supabase.service.ts   # getAdminClient(), getClientForUser(token)
    │
    ├── ai/                       # @Global()
    │   ├── ai.module.ts
    │   └── ai.service.ts         # generateJSON<T>(), generateEmbedding(), 30s timeout
    │
    ├── common/
    │   ├── guards/
    │   │   └── auth.guard.ts     # JWT Bearer validation via Supabase auth.getUser()
    │   └── decorators/
    │       └── user.decorator.ts # @UserId() param decorator
    │
    ├── user-profile/
    │   ├── user-profile.module.ts      # Exports UserProfileService
    │   ├── user-profile.controller.ts  # GET, PATCH /api/user-profile
    │   ├── user-profile.service.ts     # Auto-create, update, emit user-profile.updated
    │   ├── user-profile.service.spec.ts
    │   └── dto/
    │       └── update-profile.dto.ts
    │
    ├── goal/
    │   ├── goal.module.ts              # Exports GoalService
    │   ├── goal.controller.ts          # CRUD /api/goals, GET /api/goals/:goalId/profile
    │   ├── goal.service.ts             # CRUD, status lifecycle, deletion, pagination
    │   ├── goal.service.spec.ts
    │   └── dto/
    │       └── create-goal.dto.ts
    │
    └── intake/
        ├── intake.module.ts            # Imports GoalModule, UserProfileModule
        ├── intake.controller.ts        # next-batch, submit-batch, retry-profile
        ├── intake.service.ts           # Flow orchestration, two-tx split, embedding events
        ├── intake.service.spec.ts
        ├── intake-prompt.service.ts    # Prompts, getUniversalBatch(), generateNextBatch(), generateGoalProfile()
        ├── intake-prompt.service.spec.ts
        ├── intake-quality.service.ts   # Layer 1+2 validation, Layer 3 LLM-judge, getFallbackBatch()
        ├── intake-quality.service.spec.ts
        ├── dto/
        │   └── submit-answers.dto.ts
        └── testing/
            ├── fixtures/               # 5 goal scenarios
            ├── evaluators/             # LLM-judge prompt templates
            ├── baselines/              # Known-good quality scores
            └── intake-quality.spec.ts  # npm run test:intake-quality
```

### Configuration Split

**`.env` — secrets only (gitignored):**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
```

**`src/config/app.config.ts` — non-sensitive settings (version controlled):**
```typescript
export const appConfig = {
  ai: {
    defaultModel: 'x-ai/grok-4.1-fast',
    callTimeoutMs: 30_000,
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
  },
  intake: {
    targetBatches: 5,
    maxBatches: 7,
    questionsPerBatch: { min: 3, max: 5 },
    maxProfileRetries: 3,
    qualityWarnThreshold: 0.5,
  },
  throttle: {
    globalLimit: 60,
    globalTtlMs: 60_000,
    aiEndpointLimit: 10,
    aiEndpointTtlMs: 60_000,
  },
};
```

### Architectural Boundaries

**API Boundaries (10 endpoints):**

| Endpoint | Module | Controller Method |
|---|---|---|
| `GET /api/user-profile` | UserProfile | `getProfile()` |
| `PATCH /api/user-profile` | UserProfile | `updateProfile()` |
| `POST /api/goals` | Goal | `createGoal()` |
| `GET /api/goals` | Goal | `listGoals()` |
| `GET /api/goals/:goalId` | Goal | `getGoal()` |
| `DELETE /api/goals/:goalId` | Goal | `deleteGoal()` |
| `GET /api/goals/:goalId/intake/next-batch` | Intake | `getNextBatch()` |
| `POST /api/goals/:goalId/intake/submit-batch` | Intake | `submitBatch()` |
| `POST /api/goals/:goalId/intake/retry-profile` | Intake | `retryProfile()` |
| `GET /api/goals/:goalId/profile` | Goal | `getGoalProfile()` |

**Module Dependency Graph:**
```
AppModule
├── ConfigModule (@nestjs/config)     — .env secrets
├── EventEmitterModule                — async events
├── ThrottlerModule                   — rate limiting
├── SupabaseModule (@Global)          — available everywhere
├── AiModule (@Global)                — available everywhere
├── UserProfileModule                 — standalone, exports UserProfileService
├── GoalModule                        — standalone, exports GoalService
└── IntakeModule                      — imports GoalModule + UserProfileModule
```

**Service Boundaries:**
- `UserProfileService` — owns `user_profiles` table
- `GoalService` — owns `goals` and `goal_profiles` tables
- `IntakeService` — owns `intake_batches`, `intake_questions`, `intake_answers` tables, orchestrates flow
- `IntakePromptService` — owns prompt templates, pure AI interaction
- `IntakeQualityService` — owns quality validation, fallback logic, listens for `batch.served`
- `AiService` — owns OpenRouter communication
- `SupabaseService` — owns Supabase client creation

**Data Boundaries (table → owning service):**

| Table | Owner (write) | Reader |
|---|---|---|
| `user_profiles` | UserProfileService | IntakePromptService (via IntakeService) |
| `goals` | GoalService + IntakeService (status) | IntakeService |
| `goal_profiles` | IntakeService | GoalService |
| `intake_batches` | IntakeService | IntakeQualityService |
| `intake_questions` | IntakeService | IntakeService |
| `intake_answers` | IntakeService | IntakePromptService (via IntakeService) |
| `goal_context_embeddings` | IntakeService (async) | Future coaching system |

### Requirements to Structure Mapping

| FR Category | Module | Key Files |
|---|---|---|
| User Profile (FR1-3) | UserProfileModule | `user-profile.service.ts`, `user-profile.controller.ts` |
| Goal Management (FR4-9) | GoalModule | `goal.service.ts`, `goal.controller.ts` |
| Intake Orchestration (FR10-17) | IntakeModule | `intake.service.ts`, `intake-prompt.service.ts` |
| Answer Validation (FR18-20) | IntakeModule | `intake.service.ts` |
| Resilience & Recovery (FR21-28) | IntakeModule | `intake-quality.service.ts`, `intake.service.ts` |
| Goal Profile (FR29-31) | GoalModule + IntakeModule | `intake-prompt.service.ts`, `goal.service.ts` |
| Semantic Context (FR32-36) | IntakeModule | `intake.service.ts`, `ai.service.ts` |
| Quality Monitoring (FR37-41) | IntakeModule | `intake-quality.service.ts` |
| Auth & Rate Limiting (FR42-45) | Common + AppModule | `auth.guard.ts`, `app.module.ts` |

### Integration Points

**EventEmitter2 Events:**

| Event | Emitter | Listener | Purpose |
|---|---|---|---|
| `batch.served` | IntakeService | IntakeQualityService | Async LLM-as-judge scoring |
| `batch.answered` | IntakeService | IntakeService | Async batch Q&A embedding |
| `profile.generated` | IntakeService | IntakeService | Async profile narrative embedding |
| `user-profile.updated` | UserProfileService | IntakeService | Async user profile re-embedding |

**External Integrations:**

| Service | Integration Point | Used By |
|---|---|---|
| Supabase Postgres | `SupabaseService.getAdminClient()` | All feature services |
| Supabase Auth | `SupabaseService.getClientForUser()` | AuthGuard |
| OpenRouter (Chat) | `AiService.generateJSON()` | IntakePromptService, IntakeQualityService |
| OpenRouter (Embeddings) | `AiService.generateEmbedding()` | IntakeService (event listeners) |

**Data Flow — Submit Batch (critical path):**
```
Client → IntakeController.submitBatch()
  → IntakeService.submitBatch()
    → Transaction 1: Store answers (always commits)
    → IntakePromptService.generateNextBatch() OR generateGoalProfile()
    → Transaction 2: Store next batch OR store profile + update goal status
    → emit('batch.served')   → IntakeQualityService (async)
    → emit('batch.answered') → embedding listener (async)
  ← { submitted_batch, next_batch } OR { is_complete, goal_status, profile_id }
```

### Development Workflow

**NPM Scripts:**
- `npm run start:dev` — development with hot reload
- `npm run build` — production build
- `npm run start:prod` — run production build
- `npm test` — unit tests
- `npm run test:e2e` — end-to-end tests
- `npm run test:intake-quality` — prompt regression suite (manual, ~10min)

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible. NestJS 11 + TypeScript ESM + Supabase + OpenRouter via OpenAI SDK — no version conflicts or incompatibilities. `app.config.ts` settings feed cleanly into services that need them.

**Pattern Consistency:** Naming conventions are consistent across all layers — `snake_case` in database and JSON, `camelCase` in code, `kebab-case` in files. Event naming (`dot.notation`) is uniform. Error handling pattern (NestJS exceptions) is consistent across all services.

**Structure Alignment:** Project structure directly maps to the module dependency graph. Each feature module has clear boundaries. Global modules (Supabase, AI) are accessible without imports. Integration points (events) are explicitly listed.

### Requirements Coverage Validation

**Functional Requirements:** All 45 FRs are mapped to specific modules and files. No orphaned requirements.

**Non-Functional Requirements:** All 16 NFRs are addressed through architectural decisions (timeouts, two-tx split, fire-and-forget events, RLS, rate limiting, configurable settings).

**Cross-Cutting Concerns:** All 5 identified concerns (auth, AI resilience, async events, rate limiting, data integrity) have explicit architectural support.

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with specific technology choices. No ambiguous "TBD" items for MVP scope.

**Structure Completeness:** Every file in the project tree has a clear purpose and ownership. Module dependency graph is acyclic.

**Pattern Completeness:** Naming, structure, format, communication, and process patterns all defined with concrete examples and anti-patterns.

### Gap Analysis Results

**Critical Gaps:** None.

**Minor Gaps:**
- Admin reembed endpoint (`POST /api/admin/reembed-missing`) referenced in PRD/tech spec but not included in endpoint table. Low priority — ops tool, not user-facing. Can be added to IntakeModule when needed.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium)
- [x] Technical constraints identified (NestJS, Supabase, OpenRouter, 2-person team)
- [x] Cross-cutting concerns mapped (5 concerns)

**Architectural Decisions**
- [x] Critical decisions documented (data, auth, API, config)
- [x] Technology stack fully specified with versions
- [x] Integration patterns defined (EventEmitter2, Supabase client, AiService)
- [x] Performance considerations addressed (timeouts, two-tx, async)

**Implementation Patterns**
- [x] Naming conventions established (database, API, code)
- [x] Structure patterns defined (feature modules, co-located tests)
- [x] Communication patterns specified (events, logging)
- [x] Process patterns documented (error handling, validation, AI calls)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established (service ownership)
- [x] Integration points mapped (4 events, 4 external integrations)
- [x] Requirements to structure mapping complete (all 45 FRs)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — the architecture builds on a thoroughly reviewed tech spec (24 adversarial findings resolved across 2 rounds), with all decisions explicitly documented and no ambiguous items.

**Key Strengths:**
- Clean separation of concerns with well-defined module boundaries
- Robust resilience patterns (two-tx split, retry + fallback, event-driven async)
- Configuration split (secrets vs. settings) prevents accidental secret exposure
- Every FR and NFR traceable to specific architectural components

**Areas for Future Enhancement:**
- Hosting and CI/CD (deferred decisions)
- Structured logging for production observability
- Admin endpoints for ops tooling
- API versioning if client base grows

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Import `appConfig` for settings, `ConfigService` for secrets only
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. `src/config/app.config.ts` + `config.module.ts` — configuration foundation
2. Database migrations via Supabase MCP — tables must exist before services
3. Core modules in dependency order: UserProfile → Goal → Intake

---

## Roadmap Generation — Project Context Analysis (Revised 2026-02-21)

> **Revision Note:** This section replaces the original (2026-02-20) context analysis. The PRD was fundamentally redesigned from a "generate everything at once" model to an adaptive incremental planning model. Milestones are generated upfront; weekly plans and daily objectives are generated just-in-time. Steps-within-milestones are eliminated entirely. All generation types are synchronous (client waits for response).

### Requirements Overview

**Functional Requirements:**
55 FRs across 9 capability groups (was 37 across 6):
- **Context Retrieval Pipeline (FR1-10):** pgvector embedding generation on intake data + weekly summaries + debrief notes, HNSW filtered search by goal_id/user_id, Cohere Rerank for precision, three-tier degradation chain, structured context assembly with labeled sections (now includes progress summaries and debrief highlights), cross-goal user profile retrieval (goal_id IS NULL)
- **Milestone Generation (FR11-20):** Status-gated (intake_completed/active), backward planning from deadline, dynamic milestone count (min 3, 1/month for >3mo goals), user constraint injection, JSON validation + repair, generation metadata logging, concurrent prevention (409), retry once + user retry (max 3). **No step expansion — milestones are the only upfront generation.**
- **Weekly Plan Generation (FR21-25):** NEW. On-demand generation informed by current milestone, monthly summary, weekly summary, and daily completion data. JSON validation. Retry once; fallback to milestone description. Weekly + monthly summaries auto-generated from completions and debriefs.
- **Daily Objective Generation (FR26-31):** NEW. Generated after morning check-in. Energy-calibrated count and difficulty (fewer/easier on low-energy days). Context: weekly plan, energy level, this week's completions, recent debriefs. JSON validation. Retry once; fallback to weekly plan goals. Default neutral energy if check-in fails.
- **Morning Check-In (FR32-33):** NEW. Energy level (high/good/low/very_low) + optional note. One per goal per day (409 on duplicate).
- **Task Tracking & Debrief (FR34-36):** NEW. Mark objectives done/not done. Optional end-of-day debrief with per-task difficulty ratings (easy/moderate/hard) + free text. One debrief per goal per day (409 on duplicate).
- **Roadmap Storage & Retrieval (FR37-45):** Roadmap status lifecycle (generating/complete/failed — **no `partial`**), ordered milestones with month targeting, weekly plans linked to milestones, daily objectives linked to weekly plans, check-ins and debriefs linked to goal/date. Retrieval: roadmap overview, milestone list, current weekly plan with objectives, check-in/debrief history.
- **Quality Monitoring (FR46-53):** Async LLM-as-judge with **per-type scoring dimensions**: milestones (coherence/personalization/progression/deadline-alignment), weekly plans (milestone-alignment/progress-adaptation/actionability), daily objectives (energy-calibration/specificity/achievability). All 0-5 scale, LOG.warn < 3. Per-chunk retrieval logging. Completion rate tracking as quality signal.
- **Goal Status Integration (FR54-55):** Transition goal to `active` on successful milestone generation via GoalService direct call; no status change on failure.

**Non-Functional Requirements:**
17 NFRs (was 12):
- **Performance:** Milestone generation p95 < 30s, context retrieval p95 < 2s, weekly plan generation p95 < 15s, daily objective generation p95 < 10s, check-in/debrief submission < 500ms, read endpoints p95 < 200ms, async quality evaluation zero latency impact. **All generation is synchronous — client waits for response.**
- **Security:** User-scoped context retrieval (RLS + query filters), RLS on all 6 new tables (roadmaps, milestones, weekly_plans, daily_objectives, check_ins, debriefs), external API keys server-side only, no PII beyond user-provided intake data
- **Cost:** Milestone generation < $0.05/roadmap (one-time), weekly plan < $0.01/plan, daily objective < $0.005/day, per-goal monthly ongoing < $1, embedding < $0.001/goal, rerank < $0.01/operation

**Scale & Complexity:**
- Primary domain: API backend (extension of existing)
- Complexity level: High
- New architectural components: 1 module (RoadmapModule), multiple services (see service boundary decision below), 6 database tables, 1 RPC function, 9 API endpoints
- New external dependency: Cohere Rerank API
- Daily recurring workload: check-ins + daily objective generation (ongoing cost model, not one-time)

### Technical Constraints & Dependencies

- **All existing constraints carry forward** — NestJS 11 + TypeScript ESM, Supabase, OpenRouter, 2-person team, `.js` imports, etc.
- **Cohere Rerank API** — new external dependency. Requires `COHERE_API_KEY` in `.env`, version pinning in `appConfig.cohere` (`{ apiVersion: '2', model: 'rerank-v3.5' }`), graceful fallback on unavailability.
- **Embedding table unification** — existing `goal_context_embeddings` table must be migrated to unified `context_embeddings` schema (with `content_type` enum, `metadata` JSONB). This affects existing IntakeService embedding listeners. One table, one pattern.
- **Embedding model locked** — `text-embedding-3-small` (1536d), consistent with existing pipeline. Changes require full re-embedding.
- **Three independent generation pipelines** — milestone, weekly plan, and daily objective generation each have different context requirements, quality dimensions, performance targets, and model configurations. They share the context retrieval pipeline but assemble different context per type.
- **All generation is synchronous** — client waits for response on all generation endpoints (milestones, weekly plans, daily objectives). No 202 + polling pattern. No `roadmap.generation.requested` event. Simpler response flow.
- **Feedback loop data** — debriefs, check-ins, and completion data are new context sources feeding future generation. Weekly summaries and debrief notes need embedding for retrieval.
- **Summary aggregation** — weekly summaries (from completions + debriefs) and monthly summaries (from weekly summaries) are auto-generated, possibly via LLM. These are additional generation types requiring context and validation.
- **Per-model configuration** — daily objectives use cheaper/faster models than milestones to control ongoing costs. `appConfig` needs per-type model overrides (milestone, weekly, daily).

**Configuration Surface Area:**

Secrets (`.env`):
- `COHERE_API_KEY`

Settings (`appConfig`):
```typescript
roadmap: {
  matchCount: 20,             // HNSW top-K candidates
  matchThreshold: 0.7,        // cosine similarity floor
  rerankTopN: 10,              // final context chunks after rerank
  milestoneModel: 'default',   // override for milestone generation
  weeklyModel: 'default',      // override for weekly plan generation
  dailyModel: 'default',       // override for daily objective generation (cheaper/faster)
  maxGenerationAttempts: 3,
  generationTimeoutMs: 30_000,
},
cohere: {
  apiVersion: '2',
  model: 'rerank-v3.5',
},
```

### Cross-Cutting Concerns Identified

1. **External API Resilience (Cohere)** — New dependency with different failure characteristics than OpenRouter. Needs its own timeout, retry policy, and graceful degradation. Cohere failure is a quality degradation, not a hard failure — generation proceeds with raw HNSW results.

2. **Three-Tier Degradation Chain** — The fallback levels are architecturally different:
   - **Tier 1 — Rerank failure:** Quality degradation. Raw HNSW results are still semantically relevant, just suboptimally ordered. Transparent to user.
   - **Tier 2 — HNSW failure:** Mode switch. Falls back to SQL context stuffing — fetches ALL intake data (no relevance filtering). Different token costs, different prompt structure. Generation quality may degrade.
   - **Tier 3 — SQL failure:** Hard failure. No context available. Generation should be blocked — return error to user.
   Each tier requires distinct error handling, logging, and potentially different prompt templates.

3. **Concurrent Generation Prevention** — Optimistic locking via conditional UPDATE for milestone generation. Check affected rows — 0 rows means 409 Conflict. No application-level locks needed. Weekly plan and daily objective generation don't need locking (they're per-week/per-day, naturally idempotent via UNIQUE constraints).

4. **Embedding Table Unification** — Migrate existing `goal_context_embeddings` to unified `context_embeddings` schema. Requires updating IntakeService embedding listeners to write to the new table with `content_type` discriminator. New content types: `weekly_summary`, `debrief_note` in addition to existing `intake_answer`, `goal_profile`, `user_profile`.

5. **Cross-Goal User Profile Retrieval** — FR10 requires user profile data (not scoped to any goal) in the generation context. The retrieval pipeline must execute a compound query: `goal_id = target_goal` for goal-specific context AND `goal_id IS NULL` for user profile data.

6. **Cross-Module Goal Status Updates** — RoadmapModule updates `goals.status` from `intake_completed` to `active` on successful milestone generation. Import GoalModule and call GoalService directly. Critical state transition — explicit call, not event-driven.

7. **Synchronous Generation with Internal Timeout** — All three generation types are synchronous (client waits). Each has a different latency budget (milestones 30s, weekly 15s, daily 10s). AbortController timeout per type. On timeout or failure: retry once, then return error (milestones) or fallback content (weekly → milestone description, daily → weekly plan goals).

8. **Energy-Calibrated Generation** — Check-in data gates and calibrates daily objective generation. Check-in must exist for the day before objectives can be generated (FR26). If check-in submission fails, default to neutral energy (FR31). Energy level influences objective count and difficulty.

9. **Feedback Loop Data Flow** — Debriefs → embed into context_embeddings → weekly summary (auto-generated end of week) → embed → monthly summary (auto-generated end of month) → feeds next week's plan generation context. Each link must be embedded for retrieval.

10. **Per-Type Quality Scoring** — Three distinct quality evaluation configurations with different scoring dimensions per generation type. All async via EventEmitter2 after each successful generation.

11. **Service Boundary Decision** — The adaptive model has more surface area than the original: context pipeline, reranking, milestone generation, weekly plan generation, daily objective generation, check-in/debrief CRUD, summary generation, quality evaluation. Decision to be made in architecture decisions step.

## Roadmap Generation — Core Architectural Decisions (Revised 2026-02-21)

> **Revision Note:** This section replaces the original (2026-02-20) decisions. Key changes: synchronous generation, no parallel step expansion, no `partial` status, 6 services, adaptive daily loop architecture.

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Service boundaries: 6 services in RoadmapModule
- Generation pattern: synchronous (client waits) for all types
- Milestone locking: optimistic lock via status column
- Roadmap status: generating | complete | failed (no partial)
- Embedding table: migrate goal_context_embeddings → context_embeddings (unchanged from original extension)
- JSON validation: class-validator on LLM output (unchanged)

**Important Decisions (Shape Architecture):**
- Cohere integration: direct fetch, no SDK (unchanged)
- Summary generation: hybrid (computed data + optional LLM narrative)
- Check-in/debrief embedding: hybrid (debriefs embedded async, check-ins fetched via SQL)
- Daily objective fallback: create real rows with is_fallback flag
- Weekly plan lifecycle: auto-complete on week end, summary generated on next plan request
- API structure: daily interactions under /goals/:goalId, roadmap resources under /roadmap

**Already Decided (Unchanged from Existing Architecture):**
- Database: Supabase Postgres + pgvector, migrations via MCP
- Auth: Supabase Auth + JWT + RLS with `(select auth.uid())`
- API: REST, JSON, `/api` prefix, NestJS default error responses
- Async events: EventEmitter2 fire-and-forget (for quality eval + debrief embedding)
- Config: `.env` secrets + `appConfig` settings
- Logging: NestJS Logger
- Rate limiting: @nestjs/throttler
- Embedding: OpenAI text-embedding-3-small (1536d)
- Vector storage: Supabase pgvector with HNSW index
- Reranking: Cohere Rerank 3.5 with graceful fallback
- Generation: OpenRouter via AiService.generateJSON()

### Service Boundaries

| Service | Responsibility |
|---|---|
| RoadmapService | Milestone orchestration, roadmap CRUD, status management, goal status transition via GoalService, optimistic locking |
| ContextPipelineService | Embed query → HNSW retrieval → rerank orchestration → context assembly. Per-type context configuration. Embeds via AiService, retrieves via Supabase RPC, delegates reranking to RerankService |
| RerankService | Cohere Rerank API integration (direct fetch), fallback to passthrough on failure |
| GenerationService | Prompt assembly + LLM calls for all 3 generation types (milestones, weekly plans, daily objectives) + summary generation (hybrid: computed + optional LLM narrative). JSON validation + repair pipeline for all types. |
| QualityService | Async LLM-as-judge with per-type scoring dimensions (milestones: coherence/personalization/progression/deadline-alignment; weekly plans: milestone-alignment/progress-adaptation/actionability; daily objectives: energy-calibration/specificity/achievability), score storage, LOG.warn on low scores |
| CheckInService | Check-in CRUD, debrief CRUD (+ async embedding emit), daily objective CRUD (including fallback creation), weekly plan CRUD, weekly plan lifecycle management (auto-complete on week end), completion tracking |

### Embedding Table Migration

Migrate existing `goal_context_embeddings` → `context_embeddings` via `ALTER TABLE RENAME` + `ADD COLUMN`:
- Add `content_type text NOT NULL DEFAULT 'intake_answer'` — discriminator for intake_answer, goal_profile, user_profile, weekly_summary, debrief_note
- Add `metadata jsonb DEFAULT '{}'` — flexible per-type metadata (batch_number, question_id, week_number, etc.)
- Backfill existing rows with appropriate `content_type` values
- Update IntakeService embedding listeners to include `content_type` on insert
- Drop `embedded` boolean tracking pattern — replace with presence check on `context_embeddings` table

### Cohere Integration

Direct HTTP via `fetch` to `https://api.cohere.com/v2/rerank`. No `cohere-ai` npm package. RerankService wraps the single POST call with:
- Configurable timeout (separate from AI call timeout)
- Single retry on transient failure (5xx, network error)
- Graceful fallback: on any Cohere failure, return raw HNSW results unranked
- Response typed with local interfaces (no SDK types)

### JSON Validation + Repair Pipeline

Use `class-validator` + `class-transformer` (existing dependencies) for LLM output validation:
1. Parse JSON from LLM response (existing `AiService.generateJSON()` regex extraction)
2. `plainToInstance(TargetClass[], parsed)` + `validateSync()`
3. On validation failure: attempt repair — strip markdown fences, fix trailing commas, re-extract JSON, re-validate
4. On second failure: reject and mark as failed
- `GeneratedMilestone`, `GeneratedWeeklyPlan`, `GeneratedDailyObjective` classes defined with class-validator decorators in GenerationService
- Same pattern as DTO validation, different layer (LLM output vs HTTP input)

### Generation Response Pattern

All generation types are synchronous — client waits for the response:
1. Controller validates preconditions (goal status, check-in exists, etc.)
2. For milestones: acquire optimistic lock (status → `generating`), call GenerationService, update status (`complete`/`failed`), return result
3. For weekly plans: check if summary needed for previous week → generate summary first → generate new plan → return result
4. For daily objectives: fetch check-in for today → call GenerationService with energy level → return objectives
5. On failure: retry once internally, then return error (milestones) or fallback content (weekly → milestone description, daily → weekly plan goals as real rows with `is_fallback`)

No 202 + polling. No `roadmap.generation.requested` event. EventEmitter2 is used only for async side effects (quality evaluation, debrief embedding).

### Roadmap Status State Machine

```
(new) ──► generating ──► complete ──► (terminal)
              │
              └──► failed ── retry ──► generating
```

| From | To | Trigger |
|---|---|---|
| (none) | generating | POST /generate (synchronous lock) |
| generating | complete | Milestone generation succeeded |
| generating | failed | Milestone generation failed (after retry) |
| failed | generating | POST /generate (retry, max 3 attempts) |

No `partial` status — milestones are a single LLM call, not parallel expansion. `generating` is transient (exists only during the synchronous request, used as optimistic lock).

### Summary Generation (Hybrid)

- **Computed data** (always): completion rates, objective counts, debrief count, energy level distribution — stored as structured JSON fields on weekly_plans and milestones
- **LLM narrative** (when debriefs exist): AiService.generateJSON() produces a narrative summary synthesizing debrief themes and progress patterns. Uses a cheap/fast model.
- **Weekly summary trigger:** generated when next weekly plan is requested (not standalone endpoint)
- **Monthly summary trigger:** generated when first weekly plan of a new milestone-month is requested
- Both summary types are embedded into context_embeddings (content_type: `weekly_summary`) for future retrieval

### Check-In / Debrief Architecture

- **Check-ins:** simple CRUD (energy enum + optional note). Fetched via SQL at daily objective generation time. Not embedded — structured data with no semantic retrieval value.
- **Debriefs:** simple CRUD (free text + per-task difficulty ratings). Embedded async into context_embeddings (content_type: `debrief_note`) on submission via EventEmitter2. Rich free-text benefits from semantic retrieval across weeks.
- Event: `debrief.submitted` → embedding listener in CheckInService or ContextPipelineService

### Daily Objective Fallback

On generation failure (both attempts fail):
- Create real `daily_objectives` rows from weekly plan's objectives array
- Mark with `is_fallback = true` flag
- User can still mark done/not done (preserves engagement loop)
- Quality monitoring distinguishes fallback days from AI-generated days in completion rate analysis

### Weekly Plan Lifecycle

- Status: `active | completed`
- Auto-transitions to `completed` when `week_start_date + 7 days` passes (checked on next interaction, not cron)
- "Current" plan = latest plan with status `active`
- Summary generated when next weekly plan is requested — not standalone

### API Endpoints (Revised)

| Endpoint | Method | Response | Purpose |
|---|---|---|---|
| `/api/goals/:goalId/roadmap/generate` | POST | 200 + roadmap with milestones | Trigger milestone generation or retry |
| `/api/goals/:goalId/roadmap` | GET | 200 + roadmap with milestones | Full roadmap retrieval |
| `/api/goals/:goalId/roadmap/milestones` | GET | 200 + milestones array | Milestone summary |
| `/api/goals/:goalId/checkin` | POST | 201 + check-in | Submit morning check-in |
| `/api/goals/:goalId/weekly-plan` | GET | 200 + weekly plan | Get current week's plan (generates on-demand if needed) |
| `/api/goals/:goalId/weekly-plan/generate` | POST | 200 + weekly plan | Explicitly trigger weekly plan generation |
| `/api/goals/:goalId/daily-objectives` | GET | 200 + objectives array | Get today's objectives (generates after check-in if needed) |
| `/api/goals/:goalId/daily-objectives/:objectiveId` | PATCH | 200 + objective | Mark objective done/not done |
| `/api/goals/:goalId/debrief` | POST | 201 + debrief | Submit end-of-day debrief |

### Decision Impact Analysis

**Implementation Sequence:**
1. Embedding table migration — must happen before any new service code
2. New table migrations — roadmaps, milestones, weekly_plans, daily_objectives, check_ins, debriefs + RLS + indexes
3. RPC function — match_goal_context
4. appConfig extensions — roadmap + cohere settings
5. Services in dependency order: RerankService → ContextPipelineService → GenerationService → QualityService → CheckInService → RoadmapService
6. RoadmapController + RoadmapModule wiring

**Cross-Component Dependencies:**
- ContextPipelineService calls AiService (embedding), Supabase RPC (retrieval), RerankService (reranking)
- GenerationService calls AiService (LLM generation) for all 3 generation types + summaries
- RoadmapService imports GoalModule for direct GoalService.updateStatus() call
- CheckInService calls GenerationService for weekly plan and daily objective generation
- CheckInService emits `debrief.submitted` for async embedding
- QualityService listens for `roadmap.generated`, `weekly-plan.generated`, `daily-objectives.generated` events

## Roadmap Generation — Implementation Patterns (Revised 2026-02-21)

> **Revision Note:** This section replaces the original (2026-02-20) patterns. Removed: async generation listener, parallel step expansion (Promise.allSettled), partial status handling. Added: synchronous generation with retry, check-in gating, cascading fallback for on-demand generation, weekly plan lifecycle, summary-before-generation chain. Unchanged: pipeline orchestration, three-tier context fallback, optimistic locking (simplified), JSON repair, context assembly (extended).

### Conflict Points Identified

10 areas where AI agents could make different choices specific to the roadmap pipeline. All existing patterns (naming, structure, format, communication, process, enforcement) carry forward unchanged from the Goal Intake System architecture.

### Pipeline Orchestration Pattern (Unchanged)

**How services chain together in ContextPipelineService:**

```typescript
// CORRECT: ContextPipelineService orchestrates, each step returns typed results
async assembleContext(goalId: string, userId: string): Promise<AssembledContext> {
  // Step 1: Build query from goal data
  const queryText = await this.buildQueryText(goalId);
  const queryEmbedding = await this.aiService.generateEmbedding(queryText);

  // Step 2: Retrieve candidates via HNSW
  let chunks = await this.retrieveFromHnsw(queryEmbedding, goalId, userId);

  // Step 3: Rerank (with tier 1 fallback)
  chunks = await this.rerankService.rerank(queryText, chunks);

  // Step 4: Assemble into prompt sections
  return this.assemblePromptSections(chunks);
}
```

**Rules:**
- ContextPipelineService is the sole orchestrator — no service calls another pipeline service directly
- Each pipeline step returns a typed result, not raw Supabase/API responses
- Fallback logic lives inside each step, not in the orchestrator
- The orchestrator never catches errors from individual steps — each step handles its own failures and returns a degraded result
- After reranking, log per-chunk retrieval details for FR52 observability: `{ chunkId, contentType, similarityScore, rerankScore, selected: boolean }` at `debug` level

### Three-Tier Context Fallback Pattern (Unchanged)

**Each tier has a distinct implementation pattern:**

```typescript
// Tier 1 — Rerank failure (quality degradation)
// Inside RerankService.rerank()
async rerank(query: string, chunks: ContextChunk[]): Promise<ContextChunk[]> {
  try {
    return await this.callCohereRerank(query, chunks);
  } catch (error) {
    this.logger.warn(`Rerank failed, using raw HNSW results: ${error.message}`);
    return chunks; // passthrough — same type, same shape
  }
}

// Tier 2 — HNSW failure (mode switch)
// Inside ContextPipelineService.retrieveFromHnsw()
private async retrieveFromHnsw(...): Promise<ContextChunk[]> {
  try {
    return await this.hnswSearch(queryEmbedding, goalId, userId);
  } catch (error) {
    this.logger.warn(`HNSW search failed, falling back to SQL context stuffing: ${error.message}`);
    return await this.sqlContextStuffing(goalId, userId); // different query, same return type
  }
}

// Tier 3 — SQL failure (hard failure)
// Inside ContextPipelineService.sqlContextStuffing()
// Throws — let it propagate. Caller catches and handles the failure state.
```

**Rules:**
- Tier 1 and 2 fallbacks are silent to the caller — same return type, degraded quality
- Tier 3 throws — the caller catches and handles the failure state
- Every fallback logs at `warn` level with the original error message
- Never swallow errors silently — always log before falling back

### Synchronous Generation with Internal Retry Pattern (NEW — replaces async generation)

```typescript
// In RoadmapService — milestone generation
async generateMilestones(goalId: string, userId: string): Promise<Roadmap> {
  // 1. Acquire lock
  const roadmap = await this.acquireGenerationLock(goalId, userId);

  try {
    // 2. Assemble context
    const context = await this.contextPipelineService.assembleContext(goalId, userId);

    // 3. Generate (with internal retry inside GenerationService)
    const milestones = await this.generationService.generateMilestones(context, goalId);

    // 4. Store + update status
    await this.storeMilestones(roadmap.id, milestones);
    await this.updateRoadmapStatus(roadmap.id, 'complete');
    await this.goalService.updateStatus(goalId, 'active');

    // 5. Async side effects only
    this.eventEmitter.emit('roadmap.generated', { roadmapId: roadmap.id });

    return this.getRoadmap(goalId);
  } catch (error) {
    await this.updateRoadmapStatus(roadmap.id, 'failed');
    throw error; // NestJS exception filter handles the response
  }
}
```

**Rules:**
- Lock acquired before any work. Released (status updated) in both success and catch paths — never leave roadmap in `generating` state.
- Internal retry lives inside GenerationService — caller doesn't know about retries
- EventEmitter2 used ONLY for async side effects (quality eval, embedding) — never for generation itself
- Thrown errors propagate to NestJS exception filter — controller doesn't catch
- Same pattern for all generation types — only the lock step is milestone-specific

### Check-In Gating Pattern (NEW)

```typescript
// In CheckInService
async getDailyObjectives(goalId: string, userId: string, date: string): Promise<DailyObjective[]> {
  // 1. Check if objectives already exist for today
  const existing = await this.getExistingObjectives(goalId, date);
  if (existing.length > 0) return existing;

  // 2. Check-in required before generation
  const checkIn = await this.getCheckIn(goalId, date);
  if (!checkIn) {
    throw new BadRequestException('Morning check-in required before daily objectives');
  }

  // 3. Generate with energy level from check-in
  return this.generateDailyObjectives(goalId, userId, checkIn.energy_level);
}
```

**Rules:**
- GET endpoint is idempotent — returns existing objectives if already generated for today
- Check-in existence is validated before generation (400 if missing)
- Energy level from check-in is passed directly to GenerationService
- If check-in submission failed earlier, client must retry check-in first
- Default neutral energy only applies if check-in was submitted but with a network error that prevented storage (FR31) — not if check-in was never attempted

### Cascading Fallback for On-Demand Generation Pattern (NEW)

Different from the three-tier context retrieval fallback — this is for generation output fallbacks.

```typescript
// In CheckInService — daily objective generation
private async generateDailyObjectives(
  goalId: string, userId: string, energyLevel: string,
): Promise<DailyObjective[]> {
  const weeklyPlan = await this.getCurrentWeeklyPlan(goalId);
  const context = await this.contextPipelineService.assembleContext(goalId, userId);

  try {
    // Attempt 1
    return await this.generationService.generateDailyObjectives(weeklyPlan, energyLevel, context);
  } catch (firstError) {
    this.logger.warn(`Daily objective generation attempt 1 failed: ${firstError.message}`);
    try {
      // Attempt 2 (retry)
      return await this.generationService.generateDailyObjectives(weeklyPlan, energyLevel, context);
    } catch (secondError) {
      // Fallback: create objectives from weekly plan goals
      this.logger.warn(`Daily objective generation failed, using weekly plan fallback: ${secondError.message}`);
      return this.createFallbackObjectives(weeklyPlan, goalId);
    }
  }
}

private async createFallbackObjectives(weeklyPlan: WeeklyPlan, goalId: string): Promise<DailyObjective[]> {
  const objectives = weeklyPlan.objectives.map((obj, i) => ({
    weekly_plan_id: weeklyPlan.id,
    goal_id: goalId,
    date: new Date().toISOString().split('T')[0],
    title: obj,
    description: obj,
    is_completed: false,
    is_fallback: true,
    order_index: i + 1,
  }));
  // Store as real rows
  return this.storeObjectives(objectives);
}
```

**Rules:**
- Two attempts, then fallback — retry once, then content fallback (not error)
- Fallback creates real database rows (user can still track completion)
- `is_fallback = true` distinguishes from AI-generated objectives
- Weekly plan fallback follows same pattern: retry once → return milestone description as plan content with `is_fallback = true`
- Every fallback logs at `warn` level with original error
- Milestone generation does NOT have a content fallback — it retries once then returns error (milestones are the structural foundation, no degraded version makes sense)

### Weekly Plan Lifecycle Pattern (NEW)

```typescript
// In CheckInService
async getCurrentWeeklyPlan(goalId: string): Promise<WeeklyPlan | null> {
  // 1. Auto-complete expired plans
  await this.autoCompleteExpiredPlans(goalId);

  // 2. Return active plan if exists
  return this.getActivePlan(goalId);
}

private async autoCompleteExpiredPlans(goalId: string): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await this.supabase
    .from('weekly_plans')
    .update({ status: 'completed' })
    .eq('goal_id', goalId)
    .eq('status', 'active')
    .lt('week_start_date', sevenDaysAgo.toISOString().split('T')[0]);
}
```

**Rules:**
- Auto-complete check happens on every weekly plan read — lazy evaluation, not cron
- Only `active` → `completed` transition, triggered by date comparison
- Summary generation happens when next plan is requested, not on auto-complete
- `week_start_date + 7 days < now` is the completion condition
- No "generating" status for weekly plans — they're created synchronously

### Summary-Before-Generation Chain Pattern (NEW)

```typescript
// In CheckInService — weekly plan generation
async generateWeeklyPlan(goalId: string, userId: string): Promise<WeeklyPlan> {
  // 1. Auto-complete expired plans
  await this.autoCompleteExpiredPlans(goalId);

  // 2. Generate summary for last completed week (if no summary exists)
  const lastCompleted = await this.getLastCompletedPlanWithoutSummary(goalId);
  if (lastCompleted) {
    const summary = await this.generationService.generateWeeklySummary(lastCompleted, goalId);
    await this.updatePlanSummary(lastCompleted.id, summary);
    // Embed summary async
    this.eventEmitter.emit('summary.generated', { planId: lastCompleted.id, content: summary });
  }

  // 3. Check if monthly summary needed (first plan of new milestone month)
  await this.generateMonthlySummaryIfNeeded(goalId);

  // 4. Assemble context and generate new plan
  const context = await this.contextPipelineService.assembleContext(goalId, userId);
  const plan = await this.generationService.generateWeeklyPlan(context, goalId);

  return this.storePlan(plan);
}
```

**Rules:**
- Summary generation is a prerequisite step, not a standalone operation
- Summaries are embedded async via EventEmitter2 (fire-and-forget) — content_type: `weekly_summary`
- Monthly summary check is based on milestone target_month boundaries
- The chain is: auto-complete → summarize previous → monthly summary check → generate new
- If summary generation fails, log warn and proceed with plan generation anyway (summary is a quality enhancement, not a hard requirement)

### Optimistic Locking Pattern (Simplified — milestones only)

```typescript
// In RoadmapService
async acquireGenerationLock(goalId: string, userId: string): Promise<Roadmap> {
  // For new roadmap: INSERT with status 'generating'
  // For retry: UPDATE ... SET status = 'generating', generation_attempts = generation_attempts + 1
  //            WHERE goal_id = $1 AND status IN ('failed') AND generation_attempts < 3

  const { data, error } = await supabase
    .from('roadmaps')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('goal_id', goalId)
    .neq('status', 'generating')
    .select()
    .single();

  if (!data) throw new ConflictException('Roadmap generation already in progress');
  return data;
}
```

**Rules:**
- Lock acquisition is synchronous (in the same request) — not before an async event
- Use `.neq('status', 'generating')` as the optimistic lock condition
- Throw `ConflictException` (409) if no rows affected
- Never use application-level mutexes or Redis locks — Postgres is the lock
- Weekly plans and daily objectives don't need locking — UNIQUE constraints on `(roadmap_id, week_number)` and `(weekly_plan_id, date)` handle natural idempotency

### JSON Repair Pipeline Pattern (Extended — 3 types)

**Validate → repair → re-validate:**

```typescript
// In GenerationService — works for all generation types
private validateAndRepair<T extends object>(
  raw: string,
  ClassType: new () => T,
): T | T[] {
  // Attempt 1: direct parse + validate
  let parsed = this.extractJson(raw);
  let instances = Array.isArray(parsed)
    ? (plainToInstance(ClassType, parsed) as T[])
    : (plainToInstance(ClassType, parsed) as unknown as T);
  let errors = Array.isArray(instances)
    ? instances.flatMap(i => validateSync(i as object))
    : validateSync(instances as object);
  if (errors.length === 0) return instances;

  // Attempt 2: repair common issues
  const repaired = this.repairJson(raw);
  parsed = this.extractJson(repaired);
  instances = Array.isArray(parsed)
    ? (plainToInstance(ClassType, parsed) as T[])
    : (plainToInstance(ClassType, parsed) as unknown as T);
  errors = Array.isArray(instances)
    ? instances.flatMap(i => validateSync(i as object))
    : validateSync(instances as object);
  if (errors.length === 0) return instances;

  // Both attempts failed
  throw new Error(`JSON validation failed after repair: ${errors.map(e => e.toString()).join(', ')}`);
}
```

**Rules:**
- Works for all 3 generation types: `GeneratedMilestone[]`, `GeneratedWeeklyPlan`, `GeneratedDailyObjective[]`
- Milestones and daily objectives return arrays; weekly plans return single objects
- Always attempt validation before repair — most LLM output is valid on first try
- Repair is limited to known common issues (markdown fences, trailing commas) — no creative parsing
- Two attempts max, then throw — don't loop
- The error message includes validation details for debugging

### Context Assembly Format (Extended — per-type sections)

**How reranked chunks are serialized into the generation prompt:**

```typescript
// In ContextPipelineService
private assemblePromptSections(chunks: RankedChunk[]): AssembledContext {
  const goalProfile = chunks.filter(c => c.content_type === 'goal_profile');
  const intakeAnswers = chunks.filter(c => c.content_type === 'intake_answer');
  const userProfile = chunks.filter(c => c.content_type === 'user_profile');
  const weeklySummaries = chunks.filter(c => c.content_type === 'weekly_summary');
  const debriefNotes = chunks.filter(c => c.content_type === 'debrief_note');

  return {
    goalProfileSection: goalProfile.map(c => c.content_text).join('\n\n'),
    intakeSection: intakeAnswers.map(c => c.content_text).join('\n\n'),
    userProfileSection: userProfile.map(c => c.content_text).join('\n\n'),
    progressSection: weeklySummaries.map(c => c.content_text).join('\n\n'),
    debriefSection: debriefNotes.map(c => c.content_text).join('\n\n'),
    totalChunks: chunks.length,
  };
}
```

**Rules:**
- Context is grouped by type into labeled sections — never mixed
- Order within sections: by relevance score (from reranking), descending
- `AssembledContext` is a typed object, not a string — GenerationService is responsible for formatting it into the prompt
- Different generation types use different sections: milestones use goalProfile + intake + userProfile; weekly plans add progressSection; daily objectives add debriefSection
- Chunk count tracked in `AssembledContext` for metadata logging
- GenerationService returns metadata alongside generated content (token counts, latency per call)

### Enforcement Guidelines (Roadmap Extension — Revised)

**All AI Agents MUST (in addition to existing enforcement):**
- Use synchronous generation pattern for all generation types (never 202 + polling, never EventEmitter2 for generation)
- Use EventEmitter2 ONLY for async side effects (quality eval, debrief embedding, summary embedding)
- Validate check-in existence before daily objective generation (never skip the gate)
- Create real database rows with `is_fallback = true` for fallback content (never return transient/virtual fallback data)
- Implement three-tier context fallback at the correct service level (rerank in RerankService, HNSW in ContextPipelineService)
- Use optimistic locking via Supabase `.neq('status', 'generating')` for milestone concurrent prevention (never application-level locks)
- Follow the roadmap status state machine exactly — only `generating | complete | failed`, no `partial`
- Use `class-validator` + `class-transformer` for LLM output validation on all 3 generation types (never Zod, AJV, or manual checks)
- Call Cohere Rerank via direct `fetch` (never install `cohere-ai` package)
- Keep pipeline orchestration in ContextPipelineService (no service-to-service calls between pipeline components except RerankService)
- Generate weekly summary before new weekly plan (never skip the summary-before-generation chain)
- Auto-complete expired weekly plans lazily on read (never use cron or scheduled tasks)

### Pattern Examples (Roadmap Extension — Revised)

**Good:**
```typescript
// Correct: synchronous generation, lock + try/catch, async side effects only
const roadmap = await this.acquireGenerationLock(goalId, userId);
try {
  const milestones = await this.generationService.generateMilestones(context, goalId);
  await this.updateRoadmapStatus(roadmap.id, 'complete');
  this.eventEmitter.emit('roadmap.generated', { roadmapId: roadmap.id }); // async side effect
} catch (error) {
  await this.updateRoadmapStatus(roadmap.id, 'failed');
  throw error;
}

// Correct: check-in gate before daily objectives
const checkIn = await this.getCheckIn(goalId, date);
if (!checkIn) throw new BadRequestException('Morning check-in required');

// Correct: fallback creates real rows with flag
return this.createFallbackObjectives(weeklyPlan, goalId); // is_fallback = true
```

**Anti-Patterns:**
```typescript
// WRONG: async generation via EventEmitter2
this.eventEmitter.emit('roadmap.generation.requested', { goalId }); // removed pattern
return { status: 202 }; // no more polling

// WRONG: Promise.all or Promise.allSettled for step expansion (steps don't exist)
const steps = await Promise.allSettled(milestones.map(m => this.generateSteps(m)));

// WRONG: generating daily objectives without check-in
const objectives = await this.generateDailyObjectives(goalId, userId, 'good'); // skipped gate

// WRONG: Cohere SDK import
import { CohereClient } from 'cohere-ai';

// WRONG: Swallowing fallback without logging
try { return await this.cohereRerank(query, chunks); }
catch { return chunks; } // silent fallback — no log

// WRONG: Application-level lock
const lock = await this.lockService.acquire(`roadmap:${goalId}`);

// WRONG: Returning virtual fallback (not stored in DB)
return weeklyPlan.objectives.map(o => ({ title: o, virtual: true })); // not real rows
```

## Roadmap Generation — Project Structure & Boundaries (Revised 2026-02-21)

> **Revision Note:** This section replaces the original (2026-02-20) structure. Key changes: `steps` table removed, 4 new tables (weekly_plans, daily_objectives, check_ins, debriefs), 9 endpoints instead of 4, CheckInService added, synchronous data flows, user_id on all tables for direct RLS.

### New Directory Structure

```
src/
  roadmap/                              # Feature module
    roadmap.module.ts                   # Imports GoalModule, exports RoadmapService
    roadmap.controller.ts               # 9 endpoints: generate, roadmap, milestones,
                                        #   check-in, weekly-plan, daily-objectives, debrief
    roadmap.controller.spec.ts
    roadmap.service.ts                  # Milestone orchestration, roadmap CRUD, status,
                                        #   optimistic locking, goal status transition
    roadmap.service.spec.ts
    context-pipeline.service.ts         # Embed query → HNSW retrieve → rerank → assemble
    context-pipeline.service.spec.ts
    rerank.service.ts                   # Cohere Rerank API (direct fetch), fallback
    rerank.service.spec.ts
    generation.service.ts               # All 3 generation types + summaries, JSON validation
    generation.service.spec.ts
    quality.service.ts                  # Async LLM-as-judge (per-type dimensions), scoring
    quality.service.spec.ts
    check-in.service.ts                 # Check-in/debrief CRUD, daily objectives, weekly plans,
                                        #   lifecycle management, completion tracking
    check-in.service.spec.ts
    types/
      generated-milestone.ts            # class-validator decorated for LLM output
      generated-weekly-plan.ts          # class-validator decorated for LLM output
      generated-daily-objective.ts      # class-validator decorated for LLM output
      context.types.ts                  # ContextChunk, RankedChunk, AssembledContext
      roadmap.types.ts                  # Roadmap, Milestone interfaces, status enums
      weekly-plan.types.ts              # WeeklyPlan, WeeklySummary interfaces
      daily.types.ts                    # DailyObjective, CheckIn, Debrief interfaces
```

### Updated Configuration

**`.env` additions:**
```
COHERE_API_KEY=
```

**`src/config/app.config.ts` additions:**
```typescript
roadmap: {
  matchCount: 20,
  matchThreshold: 0.7,
  rerankTopN: 10,
  milestoneModel: 'default',
  weeklyModel: 'default',
  dailyModel: 'default',       // cheaper/faster model for ongoing cost control
  maxGenerationAttempts: 3,
  generationTimeoutMs: 30_000,
  weeklyPlanTimeoutMs: 15_000,
  dailyObjectiveTimeoutMs: 10_000,
},
cohere: {
  apiVersion: '2',
  model: 'rerank-v3.5',
},
```

### Updated Module Dependency Graph

```
AppModule
├── ConfigModule (@nestjs/config)     — .env secrets
├── EventEmitterModule                — async events
├── ThrottlerModule                   — rate limiting
├── SupabaseModule (@Global)          — available everywhere
├── AiModule (@Global)                — available everywhere
├── UserProfileModule                 — standalone, exports UserProfileService
├── GoalModule                        — standalone, exports GoalService
├── IntakeModule                      — imports GoalModule + UserProfileModule
└── RoadmapModule                     — imports GoalModule (NEW)
```

### Service Boundaries (Updated)

**Existing (unchanged):**
- `UserProfileService` — owns `user_profiles` table
- `GoalService` — owns `goals` and `goal_profiles` tables
- `IntakeService` — owns `intake_batches`, `intake_questions`, `intake_answers` tables
- `IntakePromptService` — owns intake prompt templates
- `IntakeQualityService` — owns intake quality validation
- `AiService` — owns OpenRouter communication
- `SupabaseService` — owns Supabase client creation

**New:**
- `RoadmapService` — owns `roadmaps` table, milestone orchestration, optimistic locking, goal status transition
- `ContextPipelineService` — reads `context_embeddings` table (via RPC), orchestrates embed → retrieve → rerank
- `RerankService` — owns Cohere Rerank HTTP integration
- `GenerationService` — owns all generation prompts (milestones, weekly plans, daily objectives, summaries), JSON validation + repair
- `QualityService` — owns quality scoring per generation type, listens for generation events
- `CheckInService` — owns `weekly_plans`, `daily_objectives`, `check_ins`, `debriefs` tables, weekly plan lifecycle, completion tracking, debrief embedding events

### Data Boundaries (Updated)

| Table | Owner (write) | Reader |
|---|---|---|
| `user_profiles` | UserProfileService | IntakePromptService |
| `goals` | GoalService + IntakeService (status) + RoadmapService (status → active) | IntakeService, RoadmapService, CheckInService |
| `goal_profiles` | IntakeService | GoalService, ContextPipelineService |
| `intake_batches` | IntakeService | IntakeQualityService |
| `intake_questions` | IntakeService | IntakeService |
| `intake_answers` | IntakeService | IntakePromptService |
| `context_embeddings` | IntakeService (async) + ContextPipelineService (query embed) + CheckInService (debrief + summary embed) | ContextPipelineService (via RPC) |
| `roadmaps` | RoadmapService | RoadmapController, QualityService |
| `milestones` | RoadmapService | RoadmapController, CheckInService |
| `weekly_plans` | CheckInService | RoadmapController, GenerationService |
| `daily_objectives` | CheckInService | RoadmapController |
| `check_ins` | CheckInService | CheckInService (for daily objective generation) |
| `debriefs` | CheckInService | GenerationService (for weekly summary context) |

### Database Schema (New Tables — Revised)

**roadmaps:**
```sql
CREATE TABLE roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'generating',
  generation_attempts integer NOT NULL DEFAULT 1,
  model_used text,
  generation_metadata jsonb DEFAULT '{}',
  quality_scores jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(goal_id),
  CHECK (status IN ('generating', 'complete', 'failed')),
  CHECK (generation_attempts >= 1 AND generation_attempts <= 3)
);
```

**milestones:**
```sql
CREATE TABLE milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  expected_outcome text NOT NULL,
  target_month integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(roadmap_id, order_index)
);
```

**weekly_plans:**
```sql
CREATE TABLE weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  week_number integer NOT NULL,
  week_start_date date NOT NULL,
  focus text NOT NULL,
  objectives jsonb NOT NULL DEFAULT '[]',
  generation_context jsonb DEFAULT '{}',
  summary jsonb,
  status text NOT NULL DEFAULT 'active',
  is_fallback boolean NOT NULL DEFAULT false,
  model_used text,
  generation_metadata jsonb DEFAULT '{}',
  quality_scores jsonb,
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('active', 'completed')),
  UNIQUE(roadmap_id, week_number)
);
```

**daily_objectives:**
```sql
CREATE TABLE daily_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id uuid NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  difficulty_rating text,
  order_index integer NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  is_fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (difficulty_rating IS NULL OR difficulty_rating IN ('easy', 'moderate', 'hard')),
  UNIQUE(weekly_plan_id, date, order_index)
);
```

**check_ins:**
```sql
CREATE TABLE check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL,
  energy_level text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  CHECK (energy_level IN ('high', 'good', 'low', 'very_low')),
  UNIQUE(goal_id, date)
);
```

**debriefs:**
```sql
CREATE TABLE debriefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  date date NOT NULL,
  note text NOT NULL,
  task_ratings jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, date)
);
```

**context_embeddings migration** (from `goal_context_embeddings` — unchanged from original extension):
```sql
ALTER TABLE goal_context_embeddings RENAME TO context_embeddings;
ALTER TABLE context_embeddings ADD COLUMN content_type text NOT NULL DEFAULT 'intake_answer';
ALTER TABLE context_embeddings ADD COLUMN metadata jsonb DEFAULT '{}';

-- Update existing rows
UPDATE context_embeddings SET content_type = 'goal_profile' WHERE source_type = 'goal_profile';
UPDATE context_embeddings SET content_type = 'user_profile' WHERE goal_id IS NULL;

-- HNSW index (if not already present)
CREATE INDEX IF NOT EXISTS idx_context_embeddings_hnsw
  ON context_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for filtered queries
CREATE INDEX IF NOT EXISTS idx_context_embeddings_goal_created
  ON context_embeddings (goal_id, created_at DESC);
```

**FK indexes for RLS performance:**
```sql
CREATE INDEX idx_roadmaps_user_id ON roadmaps(user_id);
CREATE INDEX idx_roadmaps_goal_id ON roadmaps(goal_id);
CREATE INDEX idx_milestones_roadmap_id ON milestones(roadmap_id);
CREATE INDEX idx_milestones_goal_id ON milestones(goal_id);
CREATE INDEX idx_weekly_plans_roadmap_id ON weekly_plans(roadmap_id);
CREATE INDEX idx_weekly_plans_milestone_id ON weekly_plans(milestone_id);
CREATE INDEX idx_weekly_plans_goal_id ON weekly_plans(goal_id);
CREATE INDEX idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX idx_daily_objectives_weekly_plan_id ON daily_objectives(weekly_plan_id);
CREATE INDEX idx_daily_objectives_goal_id ON daily_objectives(goal_id);
CREATE INDEX idx_daily_objectives_user_id ON daily_objectives(user_id);
CREATE INDEX idx_check_ins_goal_id ON check_ins(goal_id);
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_debriefs_goal_id ON debriefs(goal_id);
CREATE INDEX idx_debriefs_user_id ON debriefs(user_id);
```

### RLS Policies (New Tables)

```sql
-- roadmaps
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own roadmaps"
  ON roadmaps FOR ALL USING ((select auth.uid()) = user_id);

-- milestones (via roadmap join)
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own milestones"
  ON milestones FOR ALL USING (
    EXISTS (SELECT 1 FROM roadmaps WHERE roadmaps.id = milestones.roadmap_id
            AND roadmaps.user_id = (select auth.uid()))
  );

-- weekly_plans (direct user_id)
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own weekly plans"
  ON weekly_plans FOR ALL USING ((select auth.uid()) = user_id);

-- daily_objectives (direct user_id)
ALTER TABLE daily_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own daily objectives"
  ON daily_objectives FOR ALL USING ((select auth.uid()) = user_id);

-- check_ins (direct user_id)
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own check-ins"
  ON check_ins FOR ALL USING ((select auth.uid()) = user_id);

-- debriefs (direct user_id)
ALTER TABLE debriefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own debriefs"
  ON debriefs FOR ALL USING ((select auth.uid()) = user_id);
```

### Supabase RPC Function (Unchanged)

```sql
CREATE OR REPLACE FUNCTION match_goal_context(
  query_embedding vector(1536),
  p_goal_id uuid,
  p_user_id uuid,
  p_content_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (id uuid, content_text text, content_type text, similarity float, metadata jsonb)
AS $$
  SELECT ce.id, ce.content_text, ce.content_type,
         1 - (ce.embedding <=> query_embedding) as similarity,
         ce.metadata
  FROM context_embeddings ce
  WHERE ce.user_id = p_user_id
    AND (ce.goal_id = p_goal_id OR ce.goal_id IS NULL)
    AND (p_content_types IS NULL OR ce.content_type = ANY(p_content_types))
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

### API Boundaries (Roadmap — 9 endpoints)

| Endpoint | Module | Controller Method | Rate Limit |
|---|---|---|---|
| `POST /api/goals/:goalId/roadmap/generate` | Roadmap | `generateRoadmap()` | 3/min (AI) |
| `GET /api/goals/:goalId/roadmap` | Roadmap | `getRoadmap()` | 60/min |
| `GET /api/goals/:goalId/roadmap/milestones` | Roadmap | `getMilestones()` | 60/min |
| `POST /api/goals/:goalId/checkin` | Roadmap | `submitCheckIn()` | 10/min |
| `GET /api/goals/:goalId/weekly-plan` | Roadmap | `getWeeklyPlan()` | 60/min |
| `POST /api/goals/:goalId/weekly-plan/generate` | Roadmap | `generateWeeklyPlan()` | 5/min (AI) |
| `GET /api/goals/:goalId/daily-objectives` | Roadmap | `getDailyObjectives()` | 60/min |
| `PATCH /api/goals/:goalId/daily-objectives/:objectiveId` | Roadmap | `updateObjective()` | 60/min |
| `POST /api/goals/:goalId/debrief` | Roadmap | `submitDebrief()` | 10/min |

### Requirements to Structure Mapping (Roadmap — Revised)

| FR Category | Module | Key Files |
|---|---|---|
| Context Retrieval Pipeline (FR1-10) | RoadmapModule | `context-pipeline.service.ts`, `rerank.service.ts` |
| Milestone Generation (FR11-20) | RoadmapModule | `generation.service.ts`, `roadmap.service.ts` |
| Weekly Plan Generation (FR21-25) | RoadmapModule | `generation.service.ts`, `check-in.service.ts` |
| Daily Objective Generation (FR26-31) | RoadmapModule | `generation.service.ts`, `check-in.service.ts` |
| Morning Check-In (FR32-33) | RoadmapModule | `check-in.service.ts`, `roadmap.controller.ts` |
| Task Tracking & Debrief (FR34-36) | RoadmapModule | `check-in.service.ts`, `roadmap.controller.ts` |
| Roadmap Storage & Retrieval (FR37-45) | RoadmapModule | `roadmap.service.ts`, `check-in.service.ts`, `roadmap.controller.ts` |
| Quality Monitoring (FR46-53) | RoadmapModule | `quality.service.ts` |
| Goal Status Integration (FR54-55) | RoadmapModule + GoalModule | `roadmap.service.ts`, `goal.service.ts` |

### Integration Points (Updated)

**EventEmitter2 Events (Updated):**

| Event | Emitter | Listener | Purpose |
|---|---|---|---|
| `batch.served` | IntakeService | IntakeQualityService | Async LLM-as-judge scoring |
| `batch.answered` | IntakeService | IntakeService | Async batch Q&A embedding |
| `profile.generated` | IntakeService | IntakeService | Async profile narrative embedding |
| `user-profile.updated` | UserProfileService | IntakeService | Async user profile re-embedding |
| `roadmap.generated` | RoadmapService | QualityService | Async milestone quality scoring |
| `weekly-plan.generated` | CheckInService | QualityService | Async weekly plan quality scoring |
| `daily-objectives.generated` | CheckInService | QualityService | Async daily objective quality scoring |
| `debrief.submitted` | CheckInService | CheckInService | Async debrief text embedding |
| `summary.generated` | CheckInService | CheckInService | Async weekly/monthly summary embedding |

**External Integrations (Updated):**

| Service | Integration Point | Used By |
|---|---|---|
| Supabase Postgres | `SupabaseService.getAdminClient()` | All feature services |
| Supabase Auth | `SupabaseService.getClientForUser()` | AuthGuard |
| OpenRouter (Chat) | `AiService.generateJSON()` | IntakePromptService, IntakeQualityService, GenerationService, QualityService |
| OpenRouter (Embeddings) | `AiService.generateEmbedding()` | IntakeService, ContextPipelineService |
| Cohere Rerank | `RerankService` (direct fetch) | ContextPipelineService |

**Data Flow — Generate Roadmap (milestone generation):**
```
Client → POST /api/goals/:goalId/roadmap/generate
  → RoadmapController.generateRoadmap()
    → RoadmapService.generateMilestones()
      → acquireGenerationLock() — optimistic lock
      → ContextPipelineService.assembleContext()
        → AiService.generateEmbedding() — embed query
        → Supabase RPC match_goal_context() — HNSW search
        → RerankService.rerank() — Cohere API (or passthrough)
        → assemblePromptSections() — group by type
      → GenerationService.generateMilestones() — LLM call + validate/repair
      → store milestones
      → update roadmap status → complete
      → GoalService.updateStatus(goalId, 'active')
      → emit('roadmap.generated') — triggers QualityService
  ← 200 + { roadmap with milestones }
```

**Data Flow — Daily Loop (check-in → objectives → tracking → debrief):**
```
Morning:
  Client → POST /api/goals/:goalId/checkin { energy_level, note? }
    → CheckInService.submitCheckIn() — store, return 201
  Client → GET /api/goals/:goalId/daily-objectives
    → CheckInService.getDailyObjectives()
      → check existing objectives for today → return if exists
      → validate check-in exists for today (400 if not)
      → ContextPipelineService.assembleContext()
      → GenerationService.generateDailyObjectives(energy_level, context)
      → store objectives (or fallback with is_fallback=true)
      → emit('daily-objectives.generated')
    ← 200 + objectives array

During day:
  Client → PATCH /api/goals/:goalId/daily-objectives/:objectiveId { is_completed }
    → CheckInService.updateObjective() — toggle completion
    ← 200 + updated objective

Evening (optional):
  Client → POST /api/goals/:goalId/debrief { note, task_ratings? }
    → CheckInService.submitDebrief() — store, emit('debrief.submitted')
    ← 201 + debrief
```

**Data Flow — Weekly Plan Generation:**
```
Client → POST /api/goals/:goalId/weekly-plan/generate
  → CheckInService.generateWeeklyPlan()
    → autoCompleteExpiredPlans() — active → completed if week passed
    → getLastCompletedPlanWithoutSummary()
      → if exists: GenerationService.generateWeeklySummary() → store → emit('summary.generated')
    → generateMonthlySummaryIfNeeded()
    → ContextPipelineService.assembleContext()
    → GenerationService.generateWeeklyPlan(context)
    → store plan (or fallback with is_fallback=true)
    → emit('weekly-plan.generated')
  ← 200 + weekly plan
```

## Roadmap Generation — Architecture Validation Results (Revised 2026-02-21)

> **Revision Note:** This section replaces the original (2026-02-20) validation. Validated against the redesigned PRD with 55 FRs + 17 NFRs (was 37 FRs + 12 NFRs).

### Coherence Validation

**Decision Compatibility:** All technology choices remain compatible. NestJS 11 + TypeScript ESM + Supabase pgvector + Cohere Rerank (via fetch) + OpenRouter. The 6-service split aligns with NestJS DI. Synchronous generation simplifies the architecture — no EventEmitter2 coordination for generation flow. class-validator for LLM output extends existing DTO validation. New tables (weekly_plans, daily_objectives, check_ins, debriefs) follow existing naming and constraint conventions.

**Pattern Consistency:** All new patterns extend existing conventions:
- Naming: `snake_case` DB columns throughout all 6 new tables — consistent
- Events: `dot.notation` lowercase (`roadmap.generated`, `weekly-plan.generated`, `daily-objectives.generated`, `debrief.submitted`, `summary.generated`) — consistent
- Error handling: NestJS exceptions (`ConflictException` for 409, `BadRequestException` for missing check-in) — consistent
- Logging: NestJS Logger per service — consistent
- Config: secrets in `.env`, settings in `appConfig` — consistent
- RLS: `(select auth.uid())` on all tables, direct `user_id` column where possible for simpler policies — improvement over join-based policies

**Structure Alignment:** RoadmapModule follows the same feature-module pattern. Co-located tests. Types in `types/` subfolder (justified by 7 type files). CheckInService as a cohesive daily-loop service is a clean domain boundary.

### Requirements Coverage Validation

**Functional Requirements:** All 55 FRs mapped to specific services and files.

| FR | Covered By | Status |
|---|---|---|
| FR1-3 (embed intake data) | IntakeService listeners + context_embeddings migration | Covered |
| FR4 (HNSW retrieval) | ContextPipelineService + match_goal_context RPC | Covered |
| FR5 (Cohere rerank) | RerankService | Covered |
| FR6 (rerank fallback) | RerankService three-tier pattern | Covered |
| FR7 (SQL fallback) | ContextPipelineService three-tier pattern | Covered |
| FR8 (context assembly) | ContextPipelineService extended context assembly | Covered |
| FR9 (embed summaries + debriefs) | CheckInService async events | Covered |
| FR10 (cross-goal user profile) | match_goal_context RPC (goal_id IS NULL) | Covered |
| FR11 (status-gated) | RoadmapService status check | Covered |
| FR12-13 (backward planning, milestone count) | GenerationService prompts | Covered |
| FR14 (constraint injection) | GenerationService prompt assembly | Covered |
| FR15-16 (JSON validation + repair) | GenerationService repair pipeline | Covered |
| FR17 (generation metadata) | roadmaps.generation_metadata | Covered |
| FR18 (concurrent prevention) | Optimistic locking pattern | Covered |
| FR19-20 (retry) | Synchronous generation with internal retry | Covered |
| FR21 (weekly plan on-demand) | CheckInService.generateWeeklyPlan() | Covered |
| FR22 (weekly plan validation) | GenerationService repair pipeline | Covered |
| FR23 (weekly summary) | Summary-before-generation chain | Covered |
| FR24 (monthly summary) | generateMonthlySummaryIfNeeded() | Covered |
| FR25 (weekly plan fallback) | Cascading fallback pattern | Covered |
| FR26 (check-in gate) | Check-in gating pattern | Covered |
| FR27 (daily objective context) | ContextPipelineService + CheckInService | Covered |
| FR28 (energy calibration) | GenerationService with energy level parameter | Covered |
| FR29 (daily objective validation) | GenerationService repair pipeline | Covered |
| FR30 (daily objective fallback) | Cascading fallback pattern (is_fallback rows) | Covered |
| FR31 (default neutral energy) | Check-in gating pattern rule | Covered |
| FR32-33 (check-in CRUD + uniqueness) | CheckInService + UNIQUE(goal_id, date) | Covered |
| FR34 (mark objectives done) | CheckInService.updateObjective() | Covered |
| FR35-36 (debrief CRUD + uniqueness) | CheckInService + UNIQUE(goal_id, date) | Covered |
| FR37-38 (roadmap + milestone storage) | roadmaps + milestones tables | Covered |
| FR39-41 (weekly/daily/check-in storage) | weekly_plans + daily_objectives + check_ins + debriefs tables | Covered |
| FR42-45 (retrieval endpoints) | RoadmapController (9 endpoints) | Covered |
| FR46-49 (per-type quality scoring) | QualityService with per-type dimensions | Covered |
| FR50-51 (score storage + warn) | QualityService + LOG.warn | Covered |
| FR52 (per-chunk retrieval logging) | ContextPipelineService debug logging | Covered |
| FR53 (completion rate tracking) | CheckInService completion tracking | Covered |
| FR54-55 (goal status integration) | RoadmapService → GoalService direct call | Covered |

**Non-Functional Requirements:** All 17 NFRs addressed.

| NFR | Architectural Support |
|---|---|
| NFR1 (milestone < 30s) | generationTimeoutMs: 30_000 |
| NFR2 (retrieval < 2s) | HNSW + Cohere ~150ms |
| NFR3 (weekly plan < 15s) | weeklyPlanTimeoutMs: 15_000 |
| NFR4 (daily objectives < 10s) | dailyObjectiveTimeoutMs: 10_000 |
| NFR5 (check-in/debrief < 500ms) | Simple CRUD, no AI calls |
| NFR6 (read < 200ms) | Standard Supabase queries with FK indexes |
| NFR7 (async quality) | EventEmitter2 fire-and-forget |
| NFR8 (user-scoped) | RLS + user_id on all tables |
| NFR9 (RLS all tables) | Policies defined for all 6 new tables + FK indexes |
| NFR10 (keys server-side) | COHERE_API_KEY in .env |
| NFR11 (no extra PII) | Generation reads only user-provided data |
| NFR12 (milestone cost < $0.05) | Model configurable via appConfig |
| NFR13 (weekly plan < $0.01) | weeklyModel configurable |
| NFR14 (daily objective < $0.005) | dailyModel configurable (cheapest) |
| NFR15 (monthly < $1/goal) | Per-type model config controls ongoing costs |
| NFR16 (embedding < $0.001) | text-embedding-3-small (locked) |
| NFR17 (rerank < $0.01) | Cohere rerank-v3.5 |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with specific technology choices, configuration values, and code patterns. No "TBD" items.

**Structure Completeness:** Complete directory structure with every file named and purposed. Module dependency graph is acyclic. All integration points mapped.

**Pattern Completeness:** 10 roadmap-specific patterns defined with concrete code examples, rules, and anti-patterns. Enforcement guidelines explicit and comprehensive.

### Gap Analysis Results

**Critical Gaps:** None.

**Minor Gaps (identified, non-blocking):**
1. **FR27 "recent" undefined** — the retrieval pipeline's relevance scoring handles temporal relevance implicitly. Acceptable for architecture level; prompt engineering will quantify.
2. **FR28 energy calibration thresholds** — delegated to GenerationService prompt design. Not an architectural gap.
3. **Daily objective generation_metadata** — stored at weekly_plan level (one generation event produces multiple rows). Architecturally sound.
4. **Weekly/monthly summary content spec** — FR23/FR24 define triggers but not content structure. Summary-before-generation chain handles the trigger; content is a prompt design detail.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (11 cross-cutting concerns)
- [x] Scale and complexity assessed (High)
- [x] Technical constraints identified (Cohere, pgvector, embedding lock, 3 generation types)
- [x] Cross-cutting concerns mapped (11 concerns, all resolved)

**Architectural Decisions**
- [x] Critical decisions documented (6 services, synchronous generation, optimistic lock, hybrid summaries, check-in gating, cascading fallback)
- [x] Technology stack fully specified
- [x] Integration patterns defined (EventEmitter2 for side effects only, Supabase RPC, Cohere HTTP)
- [x] Performance considerations addressed (per-type timeouts, per-type models, FK indexes)

**Implementation Patterns**
- [x] Pipeline orchestration pattern defined
- [x] Three-tier context fallback pattern defined
- [x] Synchronous generation with retry pattern defined
- [x] Check-in gating pattern defined
- [x] Cascading fallback for on-demand generation defined
- [x] Weekly plan lifecycle pattern defined
- [x] Summary-before-generation chain defined
- [x] Optimistic locking pattern defined (simplified)
- [x] JSON repair pipeline pattern defined (extended to 3 types)
- [x] Context assembly format defined (extended with progress + debrief sections)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established (6 services)
- [x] Integration points mapped (9 events, 5 external integrations)
- [x] Requirements to structure mapping complete (all 55 FRs across 9 categories)
- [x] Database schema defined (6 new tables, 1 migration, 1 RPC function)
- [x] RLS policies defined with FK indexes for performance
- [x] 3 data flow diagrams (milestone generation, daily loop, weekly plan generation)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — extends a proven architecture with well-defined patterns. All 55 FRs and 17 NFRs explicitly covered. Synchronous generation is simpler than the original async model. The adaptive daily loop (check-in → objectives → tracking → debrief → summaries) is a cohesive domain with clear boundaries.

**Key Strengths:**
- Synchronous generation eliminates async coordination complexity
- CheckInService encapsulates the entire daily interaction loop — clean domain boundary
- Three-tier context fallback chain unchanged from proven original design
- Per-type model configuration enables cost optimization (cheap models for daily, capable for milestones)
- Cascading fallback with real database rows preserves user engagement even on AI failure
- Summary-before-generation chain creates a compounding feedback loop
- Direct user_id on all new tables enables simple, performant RLS policies

**Areas for Future Enhancement:**
- Milestone re-planning (Phase 2) — when user is ahead/behind schedule
- Burnout risk detection from energy trends (Phase 2)
- Habit tracking linked to recurring objectives (Phase 2)
- Streaming generation progress (SSE/WebSocket for real-time updates)
- Proactive nudges based on check-in patterns (Phase 3)
- Cross-goal context awareness (Phase 3)
- BGE self-hosted reranker — switch from Cohere when scale reaches 10K+ users
- pgvectorscale DiskANN — upgrade HNSW when embeddings exceed RAM capacity

### Implementation Handoff (Roadmap Extension — Revised)

**AI Agent Guidelines:**
- Follow all existing architectural decisions AND the revised roadmap extension decisions
- Use the 10 implementation patterns consistently
- Respect the updated module dependency graph and data boundaries
- Use synchronous generation for all types (never 202 + polling)
- Use EventEmitter2 only for async side effects (quality eval, embedding)
- Refer to this document for all architectural questions

**Implementation Priority:**
1. Embedding table migration — `goal_context_embeddings` → `context_embeddings` + new columns
2. New table migrations — `roadmaps`, `milestones`, `weekly_plans`, `daily_objectives`, `check_ins`, `debriefs` + RLS + FK indexes
3. RPC function — `match_goal_context`
4. `appConfig` extensions — roadmap + cohere settings
5. Services in dependency order: RerankService → ContextPipelineService → GenerationService → QualityService → CheckInService → RoadmapService
6. RoadmapController + RoadmapModule wiring
