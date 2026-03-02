# Story 6.4: End-of-Day Debrief

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Generated: 2026-02-22 | Epic 6: Daily Coaching Loop | Story 4 of 4 -->

## Story

As a **user**,
I want to optionally submit an end-of-day reflection with task difficulty ratings,
so that the system can learn from my experience and adapt future objectives.

## Acceptance Criteria

1. **Given** an authenticated user with daily objectives for today
   **When** `POST /api/goals/:goalId/debrief` is called with `note` (free text) and optional `task_ratings` (array of `{ objective_id, rating }` where rating is `easy`/`moderate`/`hard`)
   **Then** the debrief is stored and returned with 201 status (FR35)
   **And** the `debriefs` table is created via migration with RLS policies and UNIQUE constraint on `(goal_id, date)` (FR41)

2. **Given** a user who already submitted a debrief for this goal today
   **When** `POST /api/goals/:goalId/debrief` is called again
   **Then** the system returns 409 Conflict (FR36)

3. **Given** a debrief is successfully stored
   **When** the `debrief.submitted` event fires
   **Then** the debrief note text is embedded into `context_embeddings` with `content_type = 'debrief_note'` asynchronously via EventEmitter2 (FR9)
   **And** embedding failure is logged but does not affect the debrief response

4. **Given** an authenticated user
   **When** `GET /api/goals/:goalId/debrief` is called
   **Then** the system returns debrief records for the goal, ordered by date descending (FR45)

## Tasks / Subtasks

- [x] Task 1: Create `debriefs` table migration (AC: #1, #2)
  - [x] 1.1 Apply migration via Supabase MCP tool creating `debriefs` table with schema: `id uuid PK`, `goal_id uuid NOT NULL FK goals(id) ON DELETE CASCADE`, `user_id uuid NOT NULL FK auth.users(id)`, `date date NOT NULL`, `note text NOT NULL`, `task_ratings jsonb DEFAULT '[]'`, `created_at timestamptz DEFAULT now()`, `UNIQUE(goal_id, date)`
  - [x] 1.2 Enable RLS: `ALTER TABLE debriefs ENABLE ROW LEVEL SECURITY`
  - [x] 1.3 Create RLS policy: `CREATE POLICY "Users can only access their own debriefs" ON debriefs FOR ALL USING ((select auth.uid()) = user_id)`
  - [x] 1.4 Create FK indexes: `idx_debriefs_goal_id ON debriefs(goal_id)` and `idx_debriefs_user_id ON debriefs(user_id)`

- [x] Task 2: Create `Debrief` interface and `SubmitDebriefDto` (AC: #1)
  - [x] 2.1 Add `Debrief` interface to `src/roadmap/types/daily.types.ts`: `{ id, goal_id, user_id, date, note, task_ratings, created_at }`
  - [x] 2.2 Add `TaskRating` interface to `src/roadmap/types/daily.types.ts`: `{ objective_id: string, rating: DifficultyRating }`
  - [x] 2.3 Create `src/roadmap/dto/submit-debrief.dto.ts` with `@IsString() @IsNotEmpty() @MaxLength(5000) note`, `@IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TaskRatingDto) task_ratings?`, and `@ApiProperty`/`@ApiPropertyOptional` Swagger decorators
  - [x] 2.4 Create `TaskRatingDto` class in same file with `@IsUUID() objective_id` and `@IsString() @IsIn(['easy', 'moderate', 'hard']) rating`

- [x] Task 3: Add `submitDebrief()` to `CheckInService` (AC: #1, #2, #3)
  - [x] 3.1 Add method `submitDebrief(goalId: string, userId: string, dto: SubmitDebriefDto): Promise<Debrief>`
  - [x] 3.2 Get today's date via `getCurrentDate()` (existing private method pattern)
  - [x] 3.3 Insert into `debriefs` table: `{ goal_id: goalId, user_id: userId, date: today, note: dto.note, task_ratings: dto.task_ratings ?? [] }`
  - [x] 3.4 Handle PostgreSQL unique violation (error code `23505`) → throw `ConflictException('Debrief already submitted for this goal today')`
  - [x] 3.5 Handle other DB errors → log error, throw `InternalServerErrorException`
  - [x] 3.6 After successful insert, emit `this.eventEmitter.emit('debrief.submitted', { debriefId: data.id, goalId, userId, note: dto.note })` — fire-and-forget, do NOT await
  - [x] 3.7 Return the stored debrief

- [x] Task 4: Add `handleDebriefSubmitted()` event listener to `CheckInService` (AC: #3)
  - [x] 4.1 Add `@OnEvent('debrief.submitted')` listener method `handleDebriefSubmitted(payload: { debriefId: string, goalId: string, userId: string, note: string }): Promise<void>`
  - [x] 4.2 Call `this.aiService.generateEmbedding(payload.note)` to get embedding vector
  - [x] 4.3 Insert into `context_embeddings`: `{ goal_id: payload.goalId, user_id: payload.userId, content_type: 'debrief_note', content_text: payload.note, embedding: JSON.stringify(embedding) }`
  - [x] 4.4 On ANY error (embedding generation or DB insert), log the error and return silently — never throw from event listener
  - [x] 4.5 On success, log: `Debrief embedded for goal ${payload.goalId}, debrief ${payload.debriefId}`

- [x] Task 5: Add `getDebriefHistory()` to `CheckInService` (AC: #4)
  - [x] 5.1 Add method `getDebriefHistory(goalId: string, userId: string): Promise<Debrief[]>`
  - [x] 5.2 Query `debriefs` table `.select('*').eq('goal_id', goalId).eq('user_id', userId).order('date', { ascending: false })`
  - [x] 5.3 Return data as `Debrief[]` (empty array if no debriefs)
  - [x] 5.4 On DB error → log, throw `InternalServerErrorException`

- [x] Task 6: Create `DebriefController` (AC: #1, #2, #4)
  - [x] 6.1 Create `src/roadmap/debrief.controller.ts` with `@Controller('goals/:goalId/debrief')`, `@UseGuards(AuthGuard)`, `@ApiTags('debrief')`, `@ApiBearerAuth()`
  - [x] 6.2 Inject `CheckInService` via constructor
  - [x] 6.3 Add `POST /` endpoint: `@HttpCode(201)`, `@Throttle({ default: { limit: 10, ttl: appConfig.throttle.aiEndpointTtlMs } })`, accepts `SubmitDebriefDto` body, calls `checkInService.submitDebrief(goalId, userId, dto)`
  - [x] 6.4 Add `GET /` endpoint: `@Throttle({ default: { limit: 60, ttl: appConfig.throttle.defaultTtlMs } })`, calls `checkInService.getDebriefHistory(goalId, userId)`
  - [x] 6.5 Add Swagger decorators: `@ApiOperation`, `@ApiParam('goalId')`, `@ApiResponse` for 201/200, 400, 401, 409, 429

- [x] Task 7: Register `DebriefController` in `RoadmapModule` (AC: #1)
  - [x] 7.1 Add `DebriefController` to `controllers` array in `src/roadmap/roadmap.module.ts`
  - [x] 7.2 Add import for `DebriefController` with `.js` extension

- [x] Task 8: Unit tests (AC: #1-#4)
  - [x] 8.1 CheckInService tests in `check-in.service.spec.ts`:
    - Happy path: `submitDebrief()` stores debrief, emits event, returns debrief
    - Duplicate: 23505 error → `ConflictException`
    - DB error: non-23505 error → `InternalServerErrorException`
    - Verify `eventEmitter.emit` called with `'debrief.submitted'` and correct payload
  - [x] 8.2 Event listener tests in `check-in.service.spec.ts`:
    - `handleDebriefSubmitted()` generates embedding and stores in `context_embeddings`
    - Embedding generation failure → logs error, does not throw
    - DB insert failure → logs error, does not throw
  - [x] 8.3 History tests in `check-in.service.spec.ts`:
    - `getDebriefHistory()` returns debriefs ordered by date desc
    - Empty history returns `[]`
    - DB error → `InternalServerErrorException`
  - [x] 8.4 Controller tests — create `debrief.controller.spec.ts`:
    - POST delegates to `submitDebrief()` with correct params, returns 201
    - GET delegates to `getDebriefHistory()`, returns 200
  - [x] 8.5 Verify no regressions on existing tests (maintain 391+ passing)

## Dev Notes

### Critical Architecture Constraints

- **CheckInService owns debriefs** — add `submitDebrief()`, `handleDebriefSubmitted()`, and `getDebriefHistory()` to existing `src/roadmap/check-in.service.ts`. Do NOT create a new service.
- **New DebriefController** — create `src/roadmap/debrief.controller.ts` at path `goals/:goalId/debrief`. This follows the same pattern as `CheckInController` (`goals/:goalId/checkin`). Do NOT add debrief endpoints to CheckInController.
- **EventEmitter2 for async embedding** — the `debrief.submitted` event triggers async embedding of the debrief note. The embedding MUST NOT block the 201 response. Follow the exact same pattern as `handleSummaryGenerated()` in CheckInService (lines 882-921).
- **No barrel exports** — import directly from file paths with `.js` extension.
- **Supabase admin client** — use `this.supabaseService.getAdminClient()` for all queries. Filter by `user_id` AND `goal_id` in queries since admin client bypasses RLS.
- **NestJS HTTP exceptions only** — `ConflictException` for 409, `InternalServerErrorException` for DB errors, `NotFoundException` for 404.
- **Response format** — return debrief directly (no wrapper). JSON fields use `snake_case`.
- **Rate limiting** — POST debrief at 10/min (AI-adjacent endpoint, same as check-in POST). GET history at 60/min (read endpoint).
- **Simple CRUD + async event** — no AI calls in the request path. Response time should be well under 500ms (NFR5). Only the async event listener calls AiService.
- **task_ratings is JSONB** — stored as a JSON array in the database column. Validated via `@ValidateNested()` + `@Type()` in the DTO. No separate table for ratings.

### Debrief Submit Flow

```
POST /api/goals/:goalId/debrief { note: "...", task_ratings?: [...] }
  → DebriefController.submitDebrief(goalId, userId, dto)
    → CheckInService.submitDebrief(goalId, userId, dto)
      → today = getCurrentDate()
      → Supabase: INSERT INTO debriefs (goal_id, user_id, date, note, task_ratings)
      → If 23505 → throw ConflictException
      → eventEmitter.emit('debrief.submitted', { debriefId, goalId, userId, note })
      → Return debrief
    ← 201 + debrief

  [ASYNC — fire-and-forget, does NOT block response]
  CheckInService.handleDebriefSubmitted({ debriefId, goalId, userId, note })
    → aiService.generateEmbedding(note)
    → Supabase: INSERT INTO context_embeddings (goal_id, user_id, content_type='debrief_note', content_text, embedding)
    → Log success/failure — never throw
```

### Debrief History Flow

```
GET /api/goals/:goalId/debrief
  → DebriefController.getDebriefHistory(goalId, userId)
    → CheckInService.getDebriefHistory(goalId, userId)
      → Supabase: SELECT * FROM debriefs WHERE goal_id=goalId AND user_id=userId ORDER BY date DESC
      → Return Debrief[]
    ← 200 + debriefs array
```

### Database Schema

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

ALTER TABLE debriefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own debriefs"
  ON debriefs FOR ALL USING ((select auth.uid()) = user_id);

CREATE INDEX idx_debriefs_goal_id ON debriefs(goal_id);
CREATE INDEX idx_debriefs_user_id ON debriefs(user_id);
```

### Existing Patterns to Follow

**Debrief DTO pattern (mirror `SubmitCheckInDto`):**
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaskRatingDto {
  @ApiProperty({ description: 'Daily objective ID', example: 'uuid-here' })
  @IsUUID()
  objective_id!: string;

  @ApiProperty({
    description: 'Difficulty rating',
    enum: ['easy', 'moderate', 'hard'],
    example: 'moderate',
  })
  @IsString()
  @IsIn(['easy', 'moderate', 'hard'])
  rating!: string;
}

export class SubmitDebriefDto {
  @ApiProperty({
    description: 'Free-text reflection on the day',
    example: 'Today was productive. The writing task took longer than expected.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note!: string;

  @ApiPropertyOptional({
    description: 'Per-task difficulty ratings',
    type: [TaskRatingDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRatingDto)
  task_ratings?: TaskRatingDto[];
}
```

**Event emission pattern (from CheckInService):**
```typescript
// Emit AFTER successful DB insert, BEFORE return
this.eventEmitter.emit('debrief.submitted', {
  debriefId: data.id,
  goalId,
  userId,
  note: dto.note,
});
return data as Debrief;
```

**Event listener pattern (from `handleSummaryGenerated` at line 882):**
```typescript
@OnEvent('debrief.submitted')
async handleDebriefSubmitted(payload: {
  debriefId: string;
  goalId: string;
  userId: string;
  note: string;
}): Promise<void> {
  try {
    const embedding = await this.aiService.generateEmbedding(payload.note);

    const supabase = this.supabaseService.getAdminClient();
    const { error: insertError } = await supabase
      .from('context_embeddings')
      .insert({
        goal_id: payload.goalId,
        user_id: payload.userId,
        content_type: 'debrief_note',
        content_text: payload.note,
        embedding: JSON.stringify(embedding),
      });

    if (insertError) {
      this.logger.error(
        `Failed to store debrief embedding for debrief ${payload.debriefId}: ${insertError.message}`,
      );
      return;
    }

    this.logger.log(
      `Debrief embedded for goal ${payload.goalId}, debrief ${payload.debriefId}`,
    );
  } catch (error) {
    this.logger.error(
      `Debrief embedding failed for debrief ${payload.debriefId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
```

**Controller pattern (mirror CheckInController exactly):**
```typescript
import {
  Body, Controller, Get, HttpCode, Param, Post, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { CheckInService } from './check-in.service.js';
import { SubmitDebriefDto } from './dto/submit-debrief.dto.js';
import { appConfig } from '../config/app.config.js';
```

**Duplicate detection pattern (from `submitCheckIn`):**
```typescript
if (error) {
  if (error.code === '23505') {
    throw new ConflictException('Debrief already submitted for this goal today');
  }
  this.logger.error(`Failed to store debrief: ${error.message}`);
  throw new InternalServerErrorException('Failed to store debrief');
}
```

### What NOT to Do

- Do NOT create a DebriefService — CheckInService owns debrief CRUD per architecture
- Do NOT add debrief endpoints to CheckInController — create a separate DebriefController (same pattern as separate DailyObjectiveController)
- Do NOT add quality evaluation event listeners — that is Story 7.1
- Do NOT modify `generation.service.ts` — no AI generation in this story
- Do NOT modify `context-pipeline.service.ts` or `rerank.service.ts`
- Do NOT add new npm packages — all dependencies exist (`class-validator`, `class-transformer`, `@nestjs/event-emitter`, `@nestjs/swagger`)
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT use raw `Error` — use NestJS HTTP exceptions
- Do NOT forget `.js` extensions on all relative imports
- Do NOT await the `eventEmitter.emit()` call — it must be fire-and-forget
- Do NOT throw errors inside the `@OnEvent` listener — always catch and log
- Do NOT validate that daily objectives exist before accepting a debrief — debriefs are optional and can be submitted independently
- Do NOT embed the `task_ratings` — only the `note` text is embedded (structured ratings have no semantic retrieval value)
- Do NOT add `completed_at` or `updated_at` columns — not in the schema
- Do NOT create a `task_ratings` table — ratings are stored as JSONB in the `debriefs` table

### Project Structure Notes

- New files:
  - `src/roadmap/dto/submit-debrief.dto.ts` — DTO with class-validator/class-transformer decorators
  - `src/roadmap/debrief.controller.ts` — New controller for debrief endpoints
  - `src/roadmap/debrief.controller.spec.ts` — Controller unit tests
- Modified files:
  - `src/roadmap/types/daily.types.ts` — Add `Debrief` and `TaskRating` interfaces
  - `src/roadmap/check-in.service.ts` — Add `submitDebrief()`, `handleDebriefSubmitted()`, `getDebriefHistory()`
  - `src/roadmap/check-in.service.spec.ts` — Add debrief and embedding tests
  - `src/roadmap/roadmap.module.ts` — Register `DebriefController`

### Previous Story Intelligence

**From Story 6.3 (most recent — done):**
- `UpdateDailyObjectiveDto` created in `src/roadmap/dto/` — confirm DTO subfolder exists
- `DailyObjectiveController` pattern: separate controller for separate resource (debrief should follow this)
- CheckInService now has `updateDailyObjective()` and `getWeeklyCompletionRate()` — add debrief methods alongside these
- 391 tests passing, 0 regressions — maintain this baseline
- Code review found: always filter by `user_id` (admin client bypasses RLS), type DTOs precisely
- `@Throttle` pattern: use `appConfig.throttle.aiEndpointTtlMs` for POST (10/min), `appConfig.throttle.defaultTtlMs` for GET (60/min)

**From Story 6.2:**
- `DailyObjective` interface already has `difficulty_rating: DifficultyRating | null` — `DifficultyRating` type already exists
- `storeDailyObjectives()` uses batch insert — debrief is single insert
- Test mocks use `from()` table-name matching — be careful with mock interception when adding `debriefs` table queries

**From Story 6.1:**
- CheckInController has `POST/GET /goals/:goalId/checkin` — debrief controller mirrors this exactly
- Duplicate detection via PostgreSQL 23505 unique violation → `ConflictException` — use same pattern
- `SubmitCheckInDto` uses `@MaxLength(1000)` on note — debrief note should be `@MaxLength(5000)` (longer reflections expected)
- Error messages: log details, throw generic

**From Story 5.2:**
- `handleSummaryGenerated()` event listener pattern — debrief embedding listener is identical shape
- `formatSummaryForEmbedding()` exists but debrief note doesn't need formatting — embed the raw note text directly
- `queryWeekData()` already has a try/catch block that queries `debriefs` table (line 852) — once the migration creates the table, this code will start returning real data automatically

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce a commit like:
```
feat(roadmap): implement end-of-day debrief with async embedding
```

Last 5 commits:
- `d6cc2b5 feat(roadmap): implement energy-calibrated daily objective generation and tracking`
- `53374fa feat(roadmap): implement weekly and monthly summary generation and embedding`
- `a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle`
- `257ecd7 feat(roadmap): harden roadmap retrieval with status handling and API docs`
- `a7b5971 feat(roadmap): implement milestone generation via LLM orchestration`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 6.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Check-In / Debrief Architecture] (line 891)
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema — debriefs] (line 1583)
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies] (line 1667)
- [Source: _bmad-output/planning-artifacts/architecture.md#FK Indexes] (line 1632)
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — Revised] (line 921)
- [Source: _bmad-output/planning-artifacts/architecture.md#EventEmitter2 Events] (line 1740)
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Daily Loop] (line 1793)
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries] (line 823)
- [Source: _bmad-output/planning-artifacts/architecture.md#FR Coverage — FR35, FR36, FR41, FR45] (line 1865)
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR5 — check-in/debrief < 500ms] (line 1883)
- [Source: _bmad-output/implementation-artifacts/6-3-task-completion-tracking.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/6-3-task-completion-tracking.md#Completion Notes]
- [Source: src/roadmap/check-in.service.ts#handleSummaryGenerated] (line 882)
- [Source: src/roadmap/check-in.service.ts#queryWeekData — debriefs query] (line 852)
- [Source: src/roadmap/check-in.controller.ts — controller pattern]
- [Source: src/roadmap/types/daily.types.ts — existing interfaces]

## Change Log

- 2026-02-22: Implemented end-of-day debrief with async embedding — all 8 tasks complete, 13 new tests added (404 total), 0 regressions
- 2026-02-22: Code review — fixed IDOR vulnerability in submitDebrief (missing goal ownership validation), added goal existence check (404 instead of 500 for invalid goalId), added 1 new test (405 total)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Task 1: Applied `create_debriefs_table` migration via Supabase MCP — table, RLS, policy, and FK indexes all created in a single migration
- Task 2: Added `Debrief` and `TaskRating` interfaces to `daily.types.ts`; created `SubmitDebriefDto` and `TaskRatingDto` with full class-validator/class-transformer/Swagger decorators
- Task 3: Added `submitDebrief()` to `CheckInService` — inserts into debriefs table, handles 23505 duplicate with ConflictException, emits `debrief.submitted` event fire-and-forget
- Task 4: Added `@OnEvent('debrief.submitted')` handler `handleDebriefSubmitted()` — generates embedding via AiService and stores in context_embeddings with content_type `debrief_note`. All errors caught and logged silently.
- Task 5: Added `getDebriefHistory()` — queries debriefs ordered by date desc, returns empty array if none
- Task 6: Created `DebriefController` at `goals/:goalId/debrief` — POST (201, 10/min throttle) and GET (200, 60/min throttle) with full Swagger documentation
- Task 7: Registered `DebriefController` in `RoadmapModule` controllers array
- Task 8: Added 13 new tests (4 submitDebrief, 3 handleDebriefSubmitted, 3 getDebriefHistory, 3 DebriefController). All 404 tests pass, 0 regressions from 391 baseline.

### File List

- `src/roadmap/types/daily.types.ts` — Modified: added `TaskRating` and `Debrief` interfaces
- `src/roadmap/dto/submit-debrief.dto.ts` — New: `SubmitDebriefDto` and `TaskRatingDto` with validation decorators
- `src/roadmap/check-in.service.ts` — Modified: added `submitDebrief()`, `handleDebriefSubmitted()`, `getDebriefHistory()` methods and imports
- `src/roadmap/debrief.controller.ts` — New: `DebriefController` with POST and GET endpoints
- `src/roadmap/roadmap.module.ts` — Modified: registered `DebriefController`
- `src/roadmap/check-in.service.spec.ts` — Modified: added 10 debrief-related tests (submit, event handler, history)
- `src/roadmap/debrief.controller.spec.ts` — New: 3 controller unit tests
