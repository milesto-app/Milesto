# Story 6.1: Morning Check-In

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to submit a quick morning check-in with my energy level,
so that the system knows how I feel today and can size my objectives accordingly.

## Acceptance Criteria

1. **Given** an authenticated user with an active goal (has completed roadmap)
   **When** `POST /api/goals/:goalId/checkin` is called with `energy_level` (one of: `high`, `good`, `low`, `very_low`) and optional `note` (free text)
   **Then** the check-in is stored and returned with 201 status (FR32)
   **And** the `check_ins` table is created via migration with RLS policies and UNIQUE constraint on `(goal_id, date)` (FR41)

2. **Given** a user who already submitted a check-in for this goal today
   **When** `POST /api/goals/:goalId/checkin` is called again
   **Then** the system returns 409 Conflict (FR33)

3. **Given** a request with missing or invalid `energy_level`
   **When** `POST /api/goals/:goalId/checkin` is called
   **Then** the system returns 400 with validation errors

4. **Given** an authenticated user
   **When** `GET /api/goals/:goalId/checkin` history is requested
   **Then** the system returns check-in records for the goal, ordered by date descending (FR45)

## Tasks / Subtasks

- [x] Task 1: Create `check_ins` table migration (AC: #1)
  - [x] 1.1 Apply migration via Supabase MCP with schema: `id uuid PK`, `goal_id uuid FK→goals(id) ON DELETE CASCADE`, `user_id uuid FK→auth.users(id)`, `date date NOT NULL`, `energy_level text NOT NULL`, `note text`, `created_at timestamptz DEFAULT now()`
  - [x] 1.2 Add CHECK constraint: `energy_level IN ('high', 'good', 'low', 'very_low')`
  - [x] 1.3 Add UNIQUE constraint on `(goal_id, date)`
  - [x] 1.4 Enable RLS: `CREATE POLICY "Users can only access their own check-ins" ON check_ins FOR ALL USING ((select auth.uid()) = user_id)`
  - [x] 1.5 Create FK indexes: `idx_check_ins_goal_id`, `idx_check_ins_user_id`

- [x] Task 2: Create `SubmitCheckInDto` (AC: #1, #3)
  - [x] 2.1 Create `src/roadmap/dto/submit-check-in.dto.ts` with class-validator decorators
  - [x] 2.2 `energy_level`: `@IsString()`, `@IsNotEmpty()`, `@IsIn(['high', 'good', 'low', 'very_low'])` with `@ApiProperty`
  - [x] 2.3 `note`: `@IsOptional()`, `@IsString()` with `@ApiPropertyOptional`

- [x] Task 3: Create `CheckIn` type interface (AC: #1)
  - [x] 3.1 Add `CheckIn` interface to `src/roadmap/types/daily.types.ts`: `id`, `goal_id`, `user_id`, `date`, `energy_level`, `note`, `created_at`
  - [x] 3.2 Add `EnergyLevel` type: `'high' | 'good' | 'low' | 'very_low'`

- [x] Task 4: Add check-in methods to `CheckInService` (AC: #1, #2, #4)
  - [x] 4.1 `submitCheckIn(goalId, userId, dto)`: validate goal exists and has active roadmap, get today's date, insert into `check_ins`, handle 409 on unique violation
  - [x] 4.2 `getCheckIn(goalId, date)`: query single check-in by goal_id + date (already referenced in architecture for daily objective gating)
  - [x] 4.3 `getCheckInHistory(goalId, userId)`: query all check-ins for goal ordered by date desc

- [x] Task 5: Add controller endpoints (AC: #1, #2, #3, #4)
  - [x] 5.1 `POST /api/goals/:goalId/checkin` — calls `checkInService.submitCheckIn()`, returns 201
  - [x] 5.2 `GET /api/goals/:goalId/checkin` — calls `checkInService.getCheckInHistory()`, returns 200
  - [x] 5.3 Add `@Throttle` 10/min on POST endpoint
  - [x] 5.4 Add full Swagger decorators (`@ApiOperation`, `@ApiResponse` for 201, 400, 401, 409, 429)
  - [x] 5.5 Add `@ApiParam` for `goalId`

- [x] Task 6: Unit tests (AC: #1, #2, #3, #4)
  - [x] 6.1 CheckInService tests in `check-in.service.spec.ts`:
    - Happy path: submits check-in, returns stored record
    - Duplicate check-in: throws ConflictException (409)
    - Invalid goal: throws NotFoundException
    - getCheckIn: returns check-in for goal+date
    - getCheckInHistory: returns check-ins ordered by date desc
  - [x] 6.2 Controller tests in `check-in.controller.spec.ts`:
    - POST /checkin delegates to service, returns 201
    - GET /checkin delegates to service, returns 200

## Dev Notes

### Critical Architecture Constraints

- **CheckInService already exists** at `src/roadmap/check-in.service.ts` (created in Story 5.1, extended in 5.2). Add check-in methods to this existing service. Do NOT create a new service.
- **RoadmapController already exists** at `src/roadmap/roadmap.controller.ts`. Add new endpoints here. The controller base path is `goals/:goalId/roadmap` — the check-in endpoints should be mounted at `goals/:goalId/checkin` which requires either a new controller or adjusting the route. Per architecture spec the endpoint is `/api/goals/:goalId/checkin` (not under `/roadmap`), so **create a new `CheckInController`** at `src/roadmap/check-in.controller.ts` registered in `RoadmapModule`.
- **No barrel exports** — import directly from file paths with `.js` extension.
- **Supabase admin client** — use `this.supabaseService.getAdminClient()` for all queries. Filter by `user_id` in queries since admin client bypasses RLS.
- **NestJS HTTP exceptions only** — use `ConflictException` for 409, `BadRequestException` for 400, `NotFoundException` for 404. Never raw `Error`.
- **Response format** — return resource directly (no wrapper). JSON fields use `snake_case`.
- **Date handling** — use `new Date().toISOString().split('T')[0]` for today's date string (YYYY-MM-DD format matching the `date` column type).

### Duplicate Detection Pattern

The UNIQUE constraint on `(goal_id, date)` will cause Supabase to return an error on duplicate insert. Detect this by checking `error.code === '23505'` (PostgreSQL unique violation) and throw `ConflictException`:

```typescript
const { data, error } = await supabase.from('check_ins').insert({...}).select().single();
if (error) {
  if (error.code === '23505') {
    throw new ConflictException('Check-in already submitted for this goal today');
  }
  throw new InternalServerErrorException(`Failed to store check-in: ${error.message}`);
}
```

### Goal Validation

Before storing a check-in, verify the goal belongs to this user and has an active roadmap. Use the existing pattern from `getActiveRoadmapAndMilestone()` — query the roadmap table for a `complete` status roadmap for this goal. If no roadmap or not complete, throw `BadRequestException('Goal has no active roadmap')`.

### Performance Requirements

- Check-in submission response time under 500ms (NFR5) — this is a simple DB insert, well within budget.
- Rate limiting: 10 requests/minute per user on POST endpoint.

### Project Structure Notes

- New files:
  - `src/roadmap/dto/submit-check-in.dto.ts` — DTO with class-validator
  - `src/roadmap/check-in.controller.ts` — New controller for check-in endpoints (separate from roadmap controller since endpoint path differs)
  - `src/roadmap/check-in.controller.spec.ts` — Controller unit tests
  - `src/roadmap/types/daily.types.ts` — CheckIn, DailyObjective, Debrief interfaces (Stories 6.2-6.4 will extend)
- Modified files:
  - `src/roadmap/check-in.service.ts` — Add `submitCheckIn`, `getCheckIn`, `getCheckInHistory`
  - `src/roadmap/check-in.service.spec.ts` — Add check-in tests
  - `src/roadmap/roadmap.module.ts` — Register `CheckInController`
- Database migration:
  - `create_check_ins_table` — Applied via Supabase MCP tool

### Existing Patterns to Follow

**DTO pattern** (from `src/goal/dto/create-goal.dto.ts`):
```typescript
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitCheckInDto {
  @ApiProperty({
    description: 'Current energy level',
    enum: ['high', 'good', 'low', 'very_low'],
    example: 'good',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['high', 'good', 'low', 'very_low'])
  energy_level!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text note about how you feel',
    example: 'Slept well, feeling motivated',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
```

**Controller pattern** (from `src/roadmap/roadmap.controller.ts`):
```typescript
@ApiTags('checkin')
@ApiBearerAuth()
@Controller('goals/:goalId/checkin')
@UseGuards(AuthGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: appConfig.throttle.aiEndpointTtlMs } })
  @ApiOperation({ summary: 'Submit morning check-in' })
  // ...
  async submitCheckIn(...) { ... }

  @Get()
  @ApiOperation({ summary: 'Get check-in history for goal' })
  // ...
  async getCheckInHistory(...) { ... }
}
```

**Service insert pattern** (from `CheckInService.storeWeeklyPlan()`):
```typescript
const supabase = this.supabaseService.getAdminClient();
const { data, error } = await supabase
  .from('check_ins')
  .insert(row)
  .select()
  .single();
if (error || !data) {
  // Handle error (check 23505 for unique violation → ConflictException)
}
return data as CheckIn;
```

**Logger pattern**:
```typescript
private readonly logger = new Logger(CheckInService.name);
```

### What NOT to Do

- Do NOT create `daily_objectives`, `debriefs` tables — those are Stories 6.2-6.4
- Do NOT add daily objective generation logic — that is Story 6.2
- Do NOT add debrief CRUD — that is Story 6.4
- Do NOT add QualityService integration — that is Story 7.1
- Do NOT modify `context-pipeline.service.ts` or `generation.service.ts`
- Do NOT add new npm packages — all dependencies exist (`class-validator`, `class-transformer`, `@nestjs/swagger`, `@nestjs/throttler`)
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT use raw `Error` — use NestJS HTTP exceptions
- Do NOT forget `.js` extensions on all relative imports

### Previous Story Intelligence

**From Story 5.2 (most recent):**
- Supabase error handling: always check `.error` property on response, not rely on throws
- Test mocks must match real Supabase behavior (return `{ data, error }` objects)
- `||` vs `??` fallback — use `??` for null/undefined, `||` when falsy values matter
- Event listeners use `@OnEvent` decorator, fire-and-forget pattern
- 347 tests passing, 0 regressions — maintain this baseline

**From Story 5.1:**
- CheckInService established with SupabaseService, ContextPipelineService, GenerationService, EventEmitter2, AiService dependencies
- `storeWeeklyPlan` pattern: insert → select → single → check error → return typed
- Always throw NestJS exceptions, not raw Error
- Test all exception paths including bad roadmap status

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce commits like:
```
feat(roadmap): add morning check-in submission and history
```

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 6.1]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#Morning Check-In]
- [Source: _bmad-output/planning-artifacts/architecture.md#Check-In Specific Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schemas]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries]
- [Source: _bmad-output/implementation-artifacts/5-2-weekly-and-monthly-summaries-with-embedding.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/5-1-generate-and-retrieve-weekly-plan.md#Dev Notes]

## File List

- **New:** `src/roadmap/dto/submit-check-in.dto.ts` — DTO with class-validator decorators for energy_level (typed as EnergyLevel via shared ENERGY_LEVELS const) and note (MaxLength 1000)
- **New:** `src/roadmap/dto/submit-check-in.dto.spec.ts` — DTO validation tests (10 tests)
- **New:** `src/roadmap/types/daily.types.ts` — CheckIn interface, EnergyLevel type, and ENERGY_LEVELS const array
- **New:** `src/roadmap/check-in.controller.ts` — CheckInController with POST/GET endpoints at `goals/:goalId/checkin`
- **New:** `src/roadmap/check-in.controller.spec.ts` — Controller unit tests (5 tests)
- **Modified:** `src/roadmap/check-in.service.ts` — Added `submitCheckIn`, `getCheckIn` (with user_id filter, proper PGRST116 vs DB error handling), `getCheckInHistory` methods; error messages sanitized
- **Modified:** `src/roadmap/check-in.service.spec.ts` — Added 11 check-in service tests (submitCheckIn, getCheckIn with error path, getCheckInHistory)
- **Modified:** `src/roadmap/roadmap.module.ts` — Registered CheckInController
- **Database:** `create_check_ins_table` migration applied via Supabase MCP

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- All 6 tasks and subtasks implemented and verified
- `check_ins` table created with all constraints (CHECK on energy_level, UNIQUE on goal_id+date), RLS policy, and FK indexes
- `SubmitCheckInDto` uses class-validator with `@IsIn` for energy_level enum validation
- `CheckIn` interface and `EnergyLevel` type added to `daily.types.ts` for Story 6.2-6.4 extensibility
- `submitCheckIn` validates roadmap existence and status before insert, detects 23505 unique violation for 409 Conflict
- `getCheckIn` by goal+date exposed for daily objective gating (Story 6.2)
- `getCheckInHistory` returns all check-ins ordered by date desc
- New `CheckInController` at `goals/:goalId/checkin` (separate from RoadmapController per architecture spec)
- POST endpoint has `@Throttle` 10/min and full Swagger decorators
- 15 new tests added (10 service + 5 controller), 362 total passing, 0 regressions
- All new files pass linting clean; pre-existing warnings unchanged

### Change Log

- 2026-02-22: Implemented Story 6.1 — morning check-in submission and history (all 6 tasks, 15 tests added, 362 total passing)
- 2026-02-22: Code Review — 8 issues found (3H, 3M, 2L), 6 fixed automatically. See Senior Developer Review below.
- 2026-02-23: Code Review #2 — 4 issues found (1H, 2M, 1L), 3 fixed automatically (H1, M1, M2). 447 total tests passing.

## Senior Developer Review (AI)

**Reviewer:** Sobsh | **Date:** 2026-02-22 | **Model:** Claude Opus 4.6

### Outcome: Changes Requested (fixes applied)

### Findings (8 total: 3 High, 3 Medium, 2 Low)

**Fixed (6):**

| ID | Severity | Issue | Fix |
|---|---|---|---|
| H2 | HIGH | Error messages leaked internal DB details to API clients | Logged details via `this.logger.error()`, threw generic messages |
| H3 | HIGH | No `@MaxLength` on `note` field — unbounded input | Added `@MaxLength(1000)` to `SubmitCheckInDto.note` |
| M1 | MEDIUM | `getCheckIn` lacked `user_id` filter (admin client bypasses RLS) | Added `userId` parameter and `.eq('user_id', userId)` filter |
| M2 | MEDIUM | DTO `energy_level` typed as `string` instead of `EnergyLevel` | Imported and applied `EnergyLevel` type from `daily.types.ts` |
| M3 | MEDIUM | Story File List incomplete (5 git-changed files not listed) | Updated File List to accurately reflect changes |
| L1 | LOW | No success logging in `submitCheckIn` | Added `this.logger.log()` on successful check-in |

**Not auto-fixed (2):**

| ID | Severity | Issue | Reason |
|---|---|---|---|
| H1 | HIGH | Story 5.2 changes (generation.service.ts, generation.service.spec.ts, weekly-plan.types.ts) intermixed in working tree with Story 6.1 | Process issue — requires separate commits per story; cannot be fixed by code change. Changes from both stories must be committed separately. |
| L2 | LOW | No `ParseUUIDPipe` on `goalId` param | Project-wide convention — no controllers use UUID pipe. Systemic change, not story-scoped. |

### AC Validation

All 4 Acceptance Criteria verified as implemented:
1. POST /checkin → 201 with stored record, check_ins table with RLS + UNIQUE
2. Duplicate → 409 Conflict (via 23505 unique violation detection)
3. Invalid energy_level → 400 (via class-validator @IsIn)
4. GET /checkin → history ordered by date desc

### Test Results

362 tests passing, 0 regressions (post-fix)

## Senior Developer Review #2 (AI)

**Reviewer:** Sobsh | **Date:** 2026-02-23 | **Model:** Claude Opus 4.6

### Outcome: Changes Requested (fixes applied)

### Findings (4 total: 1 High, 2 Medium, 1 Low)

**Fixed (3):**

| ID | Severity | Issue | Fix |
|---|---|---|---|
| H1 | HIGH | `getCheckIn` swallowed all DB errors as null — masked real failures (DB outage appeared as "no check-in" 400 instead of 500) | Distinguish PGRST116 (no rows) from real errors; throw InternalServerErrorException on DB failures. Added test for error path. |
| M1 | MEDIUM | Energy level values duplicated in 3 places (type, @IsIn, @ApiProperty) — drift risk | Created shared `ENERGY_LEVELS` const array in `daily.types.ts`; DTO uses it for both `@IsIn` and `@ApiProperty.enum` |
| M2 | MEDIUM | No DTO validation unit test — breaks project convention (other DTOs have spec files) | Created `submit-check-in.dto.spec.ts` with 10 tests covering all validators (@IsIn, @MaxLength, @IsOptional) |

**Not auto-fixed (1):**

| ID | Severity | Issue | Reason |
|---|---|---|---|
| L1 | LOW | No pagination or default limit on `getCheckInHistory` | Check-ins limited to ~365/year per goal; not a practical concern at current scale. Can be addressed as a systemic improvement across all list endpoints. |

### AC Validation

All 4 Acceptance Criteria re-verified as implemented (no regression from fixes).

### Test Results

447 tests passing, 0 regressions (post-fix)
