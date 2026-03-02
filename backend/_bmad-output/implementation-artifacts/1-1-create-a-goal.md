# Story 1.1: Create a Goal

Status: review

## Story

As a **user**,
I want to create a goal with a title and description,
So that I can begin the coaching intake process.

## Acceptance Criteria

1. **Given** an authenticated user **When** `POST /api/goals` is called with a valid title and description **Then** a new goal is created with status `intake_in_progress` and returned to the user (FR4)
2. **Given** the request completes **Then** the `goals` table schema matches the architecture spec (includes `title`, `description`, `profile_generation_attempts`, correct status CHECK constraint) and RLS policies enforce user-only access
3. **Given** a request with missing or invalid fields **When** `POST /api/goals` is called **Then** the system returns 400 with validation errors
4. **Given** an unauthenticated request **When** `POST /api/goals` is called without a valid Bearer token **Then** a 401 Unauthorized response is returned
5. **Given** a valid request **Then** the response JSON uses `snake_case` field names matching database columns directly

## Tasks / Subtasks

- [x] Task 1: Database migration — update `goals` table schema (AC: #2)
  - [x] 1.1 Add `title` column (text, not null) to `goals` table
  - [x] 1.2 Add `profile_generation_attempts` column (integer, default 0)
  - [x] 1.3 Update status CHECK constraint to include all lifecycle statuses: `intake_in_progress`, `profile_generating`, `intake_completed`, `profile_generation_failed`, `active`
  - [x] 1.4 Remove `target_date` column (not in architecture spec)
  - [x] 1.5 Remove `context_summary` column (replaced by `goal_profiles` table in later story)
  - [x] 1.6 Verify RLS policies still use `(select auth.uid()) = user_id` pattern
- [x] Task 2: Create `src/config/app.config.ts` (AC: #2)
  - [x] 2.1 Create app.config.ts with typed config object (ai, intake, throttle sections per architecture doc)
  - [x] 2.2 Ensure config.module.ts loads `.env` for secrets only
- [x] Task 3: Update CreateGoalDto (AC: #3)
  - [x] 3.1 Add `title` field (string, required, non-empty, max length)
  - [x] 3.2 Keep `description` field (string, required, non-empty)
  - [x] 3.3 Remove `targetDate` / any fields not in the API contract
  - [x] 3.4 Use `class-validator` decorators: `@IsString()`, `@IsNotEmpty()`, `@MaxLength()`
- [x] Task 4: Update GoalService.create() (AC: #1, #5)
  - [x] 4.1 Accept `userId`, `title`, `description` parameters
  - [x] 4.2 Insert into `goals` table with `status: 'intake_in_progress'`, `profile_generation_attempts: 0`
  - [x] 4.3 Return the created goal object with `snake_case` fields
  - [x] 4.4 Use `this.supabaseService.getAdminClient()` for DB access
  - [x] 4.5 Throw appropriate NestJS HTTP exceptions on errors
- [x] Task 5: Update GoalController (AC: #1, #3, #4)
  - [x] 5.1 `POST /api/goals` endpoint with `@UseGuards(AuthGuard)` and `@UserId()` decorator
  - [x] 5.2 Accept `CreateGoalDto` body, pass to `GoalService.create()`
  - [x] 5.3 Return 201 with created goal
- [x] Task 6: Unit tests (AC: #1, #3)
  - [x] 6.1 Test successful goal creation returns correct shape and status
  - [x] 6.2 Test validation rejects missing title
  - [x] 6.3 Test validation rejects missing description
  - [x] 6.4 Test service calls Supabase with correct parameters

## Dev Notes

### Architecture Compliance

**Module structure:** GoalModule is a standalone feature module. `SupabaseModule` and `AiModule` are `@Global()` — do NOT import them in GoalModule. GoalModule must export `GoalService` for later use by IntakeModule.

**File naming:** `kebab-case.ts` — `goal.service.ts`, `goal.controller.ts`, `create-goal.dto.ts`

**Import pattern:** ALL relative imports MUST use `.js` extension:
```typescript
import { GoalService } from './goal.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
```

**Error handling:** Use NestJS HTTP exceptions exclusively. Never `console.log` — use `private readonly logger = new Logger(GoalService.name)`.

**Supabase client:** Always via `this.supabaseService.getAdminClient()`. Check `.error` on response, throw appropriate HTTP exception.

**JSON responses:** All fields in `snake_case` matching database columns. No transformation layer. Return Supabase response data directly.

### Database Migration Details

The existing `goals` table needs to be altered. Current state vs. required state:

| Column | Current | Required | Action |
|--------|---------|----------|--------|
| `id` | uuid, PK | uuid, PK | No change |
| `user_id` | uuid, FK auth.users | uuid, FK auth.users | No change |
| `title` | **MISSING** | text, not null | **ADD** |
| `description` | text | text | No change |
| `target_date` | date | **NOT NEEDED** | **DROP** |
| `status` | text, check (3 values) | text, check (5 values) | **ALTER** check constraint |
| `context_summary` | jsonb, nullable | **NOT NEEDED** | **DROP** |
| `profile_generation_attempts` | **MISSING** | integer, default 0 | **ADD** |
| `created_at` | timestamptz | timestamptz | No change |
| `updated_at` | timestamptz | timestamptz | No change |

**Status CHECK constraint update:**
- Current: `intake_in_progress`, `intake_completed`, `active`
- Required: `intake_in_progress`, `profile_generating`, `intake_completed`, `profile_generation_failed`, `active`

**IMPORTANT:** There is 1 existing row in `goals` table. The migration must handle existing data:
- `title` column: add with a default, then remove default (or update existing row first)
- `target_date` / `context_summary`: drop safely

**Apply migration via Supabase MCP tool — no local migration files.**

### API Contract

**Request:**
```json
POST /api/goals
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "title": "Run a marathon",
  "description": "I want to complete a full marathon within 6 months"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Run a marathon",
  "description": "I want to complete a full marathon within 6 months",
  "status": "intake_in_progress",
  "profile_generation_attempts": 0,
  "created_at": "2026-02-08T...",
  "updated_at": "2026-02-08T..."
}
```

**Error (400):**
```json
{
  "statusCode": 400,
  "message": ["title should not be empty", "title must be a string"],
  "error": "Bad Request"
}
```

### app.config.ts Specification

```typescript
// src/config/app.config.ts
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

This is the config foundation — imported directly by services that need it. NOT via `@nestjs/config` (that's only for `.env` secrets).

### Existing Code Context

The codebase already has implementations from 3 prior commits. The existing GoalModule code needs to be **updated, not created from scratch**:
- `goal.module.ts` — exists, may need minor updates
- `goal.controller.ts` — exists, currently has POST and GET endpoints
- `goal.service.ts` — exists, has create/findAll/findOne/updateStatus/verifyOwnership methods
- `create-goal.dto.ts` — exists, currently has `description` and `targetDate` fields

**Key differences from current code:**
- DTO needs `title` added, `targetDate` removed
- Service `create()` signature changes: `(userId, title, description)` instead of `(userId, description, targetDate)`
- API contract expects `title` field in request and response
- `app.config.ts` does not exist yet — create it

### Legacy Tables

The database has `profiles` and `user_goals` tables from an earlier iteration. These are NOT part of the current architecture. Do NOT reference or use them. The `goals` table is the correct one.

### Project Structure Notes

- GoalModule lives at `src/goal/`
- DTO lives at `src/goal/dto/create-goal.dto.ts`
- Config lives at `src/config/app.config.ts`
- All paths follow the architecture doc structure exactly

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Configuration Split]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/implementation-artifacts/tech-spec-goal-intake-system.md#Task 8 - goals table]
- [Source: _bmad-output/implementation-artifacts/tech-spec-goal-intake-system.md#Task 16 - GoalModule]
- [Source: _bmad-output/implementation-artifacts/tech-spec-goal-intake-system.md#API Contract - POST /api/goals]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build error: `TS2352` casting `Request` to `Record<string, unknown>` — fixed by casting via `unknown` first
- Controller test: `AuthGuard` dependency on `SupabaseService` needed mock — added mock provider
- ESLint: unnecessary escape `\[` in regex — removed escape
- ESLint: prettier formatting auto-fixed across 4 files

### Completion Notes List

- **Task 1:** Database migration applied via Supabase MCP. Added `title` (text, NOT NULL), `profile_generation_attempts` (integer, default 0). Dropped `target_date` and `context_summary`. Updated status CHECK constraint to 5 statuses. Existing row handled by adding title with default then populating from description. RLS policies verified using `(SELECT auth.uid())` pattern.
- **Task 2:** Created `src/config/app.config.ts` with ai, intake, throttle sections per architecture doc. Created `src/config/config.module.ts` wrapping `@nestjs/config` for `.env` secrets only.
- **Task 3:** Created `CreateGoalDto` with `title` (@IsString, @IsNotEmpty, @MaxLength(200)) and `description` (@IsString, @IsNotEmpty). No `targetDate` field.
- **Task 4:** `GoalService.create()` accepts `userId`, `title`, `description`. Inserts with `status: 'intake_in_progress'`, `profile_generation_attempts: 0`. Returns Supabase data directly (snake_case). Uses Logger, throws InternalServerErrorException on error.
- **Task 5:** `GoalController` with `POST /goals` endpoint, `@UseGuards(AuthGuard)`, `@UserId()` decorator, `CreateGoalDto` body. Returns 201 with created goal.
- **Task 6:** 12 unit tests across 3 test suites — goal service (3 tests: success shape, correct params, error handling), controller (2 tests: defined, delegates to service), DTO validation (7 tests: valid input, missing title, empty title, missing description, empty description, title exceeding max length, correct error properties).
- **Infrastructure:** Scaffolded NestJS 11 project with ESM/nodenext, installed all dependencies, created SupabaseModule (@Global), AiModule (@Global), AuthGuard, UserId decorator, configured Jest with moduleNameMapper for .js extensions, configured ESLint rules for Supabase any-type warnings.

### File List

- `package.json` — new (NestJS scaffold + dependencies)
- `package-lock.json` — new
- `tsconfig.json` — new (ESM, nodenext, strict)
- `tsconfig.build.json` — new
- `nest-cli.json` — new
- `eslint.config.mjs` — new (configured unsafe-* rules as warnings)
- `src/main.ts` — new (bootstrap with global prefix, CORS, ValidationPipe)
- `src/app.module.ts` — new (imports ConfigModule, SupabaseModule, AiModule, GoalModule)
- `src/config/app.config.ts` — new (ai, intake, throttle config)
- `src/config/config.module.ts` — new (@nestjs/config for .env secrets)
- `src/supabase/supabase.module.ts` — new (@Global module)
- `src/supabase/supabase.service.ts` — new (getAdminClient, getClientForUser)
- `src/ai/ai.module.ts` — new (@Global module)
- `src/ai/ai.service.ts` — new (generateJSON via OpenRouter)
- `src/common/guards/auth.guard.ts` — new (JWT Bearer validation)
- `src/common/decorators/user.decorator.ts` — new (@UserId param decorator)
- `src/goal/goal.module.ts` — new (GoalModule, exports GoalService)
- `src/goal/goal.controller.ts` — new (POST /goals endpoint)
- `src/goal/goal.service.ts` — new (create method)
- `src/goal/dto/create-goal.dto.ts` — new (title + description validation)
- `src/goal/goal.service.spec.ts` — new (3 unit tests)
- `src/goal/goal.controller.spec.ts` — new (2 unit tests)
- `src/goal/dto/create-goal.dto.spec.ts` — new (7 validation tests)

## Change Log

- 2026-02-08: Story 1.1 implemented — NestJS project scaffolded from clean state, database migration applied (goals table schema updated), GoalModule with POST /api/goals endpoint, 12 unit tests passing, all acceptance criteria satisfied.
