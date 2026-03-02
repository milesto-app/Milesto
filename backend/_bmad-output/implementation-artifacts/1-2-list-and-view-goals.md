# Story 1.2: List and View Goals

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to list my goals with pagination and view a single goal's details,
So that I can track my goals and their current status.

## Acceptance Criteria

1. **Given** an authenticated user with multiple goals **When** `GET /api/goals` is called with optional `limit` and `offset` query params **Then** the system returns a paginated response `{ data: [...], total, limit, offset }` (FR5) **And** only the user's own goals are returned (RLS)
2. **Given** an authenticated user **When** `GET /api/goals/:goalId` is called with a valid goal ID **Then** the system returns the goal with its current status (FR6, FR9)
3. **Given** a request for a non-existent or another user's goal **When** `GET /api/goals/:goalId` is called **Then** the system returns 404
4. **Given** an unauthenticated request **When** either endpoint is called without a valid Bearer token **Then** a 401 Unauthorized response is returned
5. **Given** a valid list request **Then** the response JSON uses `snake_case` field names and follows the list response format `{ data, total, limit, offset }`
6. **Given** no query params provided **When** `GET /api/goals` is called **Then** the system uses sensible defaults for `limit` (20) and `offset` (0)

## Tasks / Subtasks

- [x] Task 1: Add list and get-by-id methods to GoalService (AC: #1, #2, #3, #5, #6)
  - [x] 1.1 `findAll(userId, limit, offset)` — query `goals` table filtered by `user_id`, with `limit`/`offset`, ordered by `created_at` desc
  - [x] 1.2 `findAll` returns `{ data, total, limit, offset }` — use a count query (Supabase `count: 'exact'` option + `range()`) to get total
  - [x] 1.3 `findOne(userId, goalId)` — query `goals` table filtered by `id` and `user_id`
  - [x] 1.4 `findOne` throws `NotFoundException` when no row returned
- [x] Task 2: Add list and get endpoints to GoalController (AC: #1, #2, #4, #6)
  - [x] 2.1 `GET /goals` endpoint with `@Query()` params for `limit` (default 20) and `offset` (default 0)
  - [x] 2.2 `GET /goals/:goalId` endpoint with `@Param('goalId')`
  - [x] 2.3 Both endpoints use `@UseGuards(AuthGuard)` (already class-level) and `@UserId()` decorator
  - [x] 2.4 Parse and validate query params: `limit` and `offset` must be non-negative integers
- [x] Task 3: Create query param DTO (AC: #6)
  - [x] 3.1 Create `src/goal/dto/list-goals-query.dto.ts` with `limit` (optional, default 20, min 1, max 100) and `offset` (optional, default 0, min 0)
  - [x] 3.2 Use `@Type(() => Number)` from `class-transformer` + `@IsOptional()`, `@IsInt()`, `@Min()`, `@Max()` from `class-validator`
- [x] Task 4: Unit tests (AC: #1, #2, #3, #5, #6)
  - [x] 4.1 GoalService: `findAll` returns correct paginated shape
  - [x] 4.2 GoalService: `findAll` passes correct params to Supabase (user_id filter, range, count)
  - [x] 4.3 GoalService: `findOne` returns goal when found
  - [x] 4.4 GoalService: `findOne` throws NotFoundException when not found
  - [x] 4.5 GoalController: `GET /goals` delegates to service with parsed query params
  - [x] 4.6 GoalController: `GET /goals/:goalId` delegates to service
  - [x] 4.7 ListGoalsQueryDto: validates defaults, rejects negative values, rejects non-integers

## Dev Notes

### Architecture Compliance

**Module structure:** GoalModule already exists at `src/goal/` with controller, service, and DTO. This story ADDS methods — do NOT recreate files. GoalModule exports GoalService (needed by IntakeModule later).

**File naming:** `kebab-case.ts` — `goal.service.ts`, `goal.controller.ts`, `list-goals-query.dto.ts`

**Import pattern:** ALL relative imports MUST use `.js` extension:
```typescript
import { GoalService } from './goal.service.js';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto.js';
```

**Error handling:** Use NestJS HTTP exceptions exclusively (`NotFoundException`). Never `console.log` — use `private readonly logger = new Logger(GoalService.name)` (already exists in service).

**Supabase client:** Always via `this.supabaseService.getAdminClient()` (already in service constructor).

**JSON responses:** All fields in `snake_case` matching database columns. Return Supabase response data directly — no transformation layer.

### API Contracts

**List Goals — Request:**
```
GET /api/goals?limit=20&offset=0
Authorization: Bearer <jwt>
```

**List Goals — Response (200):**
```json
{
  "data": [
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
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

**Get Goal — Request:**
```
GET /api/goals/:goalId
Authorization: Bearer <jwt>
```

**Get Goal — Response (200):**
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

**Error (404):**
```json
{
  "statusCode": 404,
  "message": "Goal not found",
  "error": "Not Found"
}
```

### Supabase Query Patterns

**List with pagination (findAll):**
```typescript
const supabase = this.supabaseService.getAdminClient();

const { data, error, count } = await supabase
  .from('goals')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

**Key:** `{ count: 'exact' }` in `.select()` returns total count alongside data. `.range(from, to)` is inclusive on both ends — so for `offset=0, limit=20`, use `.range(0, 19)`.

**Get single (findOne):**
```typescript
const { data, error } = await supabase
  .from('goals')
  .select('*')
  .eq('id', goalId)
  .eq('user_id', userId)
  .single();
```

**Key:** `.single()` returns `error` with code `PGRST116` when no rows found. Check for this to throw `NotFoundException`.

### Query DTO Pattern

```typescript
// src/goal/dto/list-goals-query.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class ListGoalsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
```

**Critical:** Query params arrive as strings. `@Type(() => Number)` from `class-transformer` converts them to numbers. The global `ValidationPipe` has `transform: true` which enables this. Without `@Type`, validation decorators like `@IsInt()` will fail on string `"20"`.

### Previous Story Intelligence (1-1)

**What was built:**
- GoalModule with `GoalController` (POST /goals) and `GoalService` (create method)
- `CreateGoalDto` with `title` + `description` validation
- AuthGuard with `@UseGuards(AuthGuard)` at class level on controller
- `@UserId()` param decorator extracts user ID from request
- Infrastructure: SupabaseModule (@Global), AiModule (@Global), ConfigModule, app.config.ts
- 12 unit tests across 3 spec files (service, controller, DTO)

**Patterns established in 1-1 to follow:**
- Service gets admin client: `this.supabaseService.getAdminClient()`
- Service uses `Logger`: `private readonly logger = new Logger(GoalService.name)`
- Service throws NestJS HTTP exceptions on Supabase errors
- Controller has `@UseGuards(AuthGuard)` at class level (applies to all endpoints)
- Controller uses `@UserId()` to get authenticated user ID
- Tests mock `SupabaseService` with `getAdminClient` returning a chainable mock
- Tests mock `AuthGuard` to avoid Supabase dependency in controller tests

**Debug learnings from 1-1:**
- `AuthGuard` depends on `SupabaseService` — controller tests need a mock provider for it
- `.js` extension required on all imports (ESM/nodenext)
- Jest uses `moduleNameMapper` for `.js` extension resolution

### Existing Code to Modify (NOT Create From Scratch)

- `src/goal/goal.service.ts` — ADD `findAll()` and `findOne()` methods to existing service
- `src/goal/goal.controller.ts` — ADD `GET /goals` and `GET /goals/:goalId` endpoints
- `src/goal/goal.service.spec.ts` — ADD test cases for new methods
- `src/goal/goal.controller.spec.ts` — ADD test cases for new endpoints

### New Files to Create

- `src/goal/dto/list-goals-query.dto.ts` — query param validation DTO

### Goals Table Schema (Current State)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `user_id` | uuid | FK to auth.users, NOT NULL |
| `title` | text | NOT NULL |
| `description` | text | NOT NULL |
| `status` | text | CHECK constraint: intake_in_progress, profile_generating, intake_completed, profile_generation_failed, active |
| `profile_generation_attempts` | integer | Default 0 |
| `created_at` | timestamptz | Auto-generated |
| `updated_at` | timestamptz | Auto-generated |

RLS policies enforce `(SELECT auth.uid()) = user_id` on all operations.

### Project Structure Notes

- All changes are within `src/goal/` — no other modules affected
- New DTO in `src/goal/dto/list-goals-query.dto.ts`
- No database migrations needed — table schema is unchanged
- No new dependencies needed — `class-transformer` and `class-validator` already installed

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — List responses]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — API Naming]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/implementation-artifacts/1-1-create-a-goal.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-1-create-a-goal.md#File List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- DTO test: `Reflect.getMetadata is not a function` — `@Type` decorator from class-transformer requires `reflect-metadata`. Fixed by adding `import 'reflect-metadata'` at top of DTO spec file.
- ESLint: 2 Prettier formatting errors on controller method signatures (multi-line params) — collapsed to single-line to match Prettier config.

### Completion Notes List

- **Task 1:** Added `findAll(userId, limit, offset)` and `findOne(userId, goalId)` to GoalService. `findAll` uses Supabase `select('*', { count: 'exact' })` with `.order('created_at', { ascending: false })` and `.range()` for pagination. Returns `{ data, total, limit, offset }`. `findOne` uses `.eq('id', goalId).eq('user_id', userId).single()` and throws `NotFoundException` on any error from Supabase (covers both not-found and other-user cases).
- **Task 2:** Added `GET /goals` and `GET /goals/:goalId` endpoints to GoalController. `findAll` accepts `ListGoalsQueryDto` via `@Query()`, `findOne` accepts `goalId` via `@Param('goalId')`. Both use existing class-level `@UseGuards(AuthGuard)` and `@UserId()` decorator.
- **Task 3:** Created `ListGoalsQueryDto` with `limit` (optional, default 20, min 1, max 100) and `offset` (optional, default 0, min 0). Uses `@Type(() => Number)` for string-to-number conversion of query params.
- **Task 4:** 15 new tests added (27 total across 4 suites). Service: findAll paginated shape, findAll Supabase params, findAll error handling, findOne success, findOne not-found. Controller: findAll delegates with params, findAll custom params, findOne delegates. DTO: defaults, valid params, string transform, limit min/max, negative offset, non-integer rejection.

### File List

- `src/goal/goal.service.ts` — modified (added findAll, findOne methods)
- `src/goal/goal.controller.ts` — modified (added GET /goals and GET /goals/:goalId endpoints, new imports)
- `src/goal/dto/list-goals-query.dto.ts` — new (query param validation DTO)
- `src/goal/dto/list-goals-query.dto.spec.ts` — new (7 validation tests)
- `src/goal/goal.service.spec.ts` — modified (added findAll and findOne test suites)
- `src/goal/goal.controller.spec.ts` — modified (added findAll and findOne test suites)

## Change Log

- 2026-02-08: Story 1.2 implemented — GET /api/goals (paginated list) and GET /api/goals/:goalId (single goal) endpoints added to GoalModule, ListGoalsQueryDto created, 15 new unit tests (27 total), all acceptance criteria satisfied.
