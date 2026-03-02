# Story 1.3: Delete a Goal

Status: review

## Story

As a **user**,
I want to delete a goal that hasn't been completed,
So that I can remove goals I no longer want to pursue.

## Acceptance Criteria

1. **Given** an authenticated user with a goal in `intake_in_progress`, `profile_generating`, or `profile_generation_failed` status **When** `DELETE /api/goals/:goalId` is called **Then** the goal row is deleted from the database and the system returns 204 No Content (FR7)
2. **Given** an authenticated user with a goal in `intake_completed` or `active` status **When** `DELETE /api/goals/:goalId` is called **Then** the system returns 400 Bad Request with a message explaining deletion is not allowed for goals in this status (FR8)
3. **Given** a request for a non-existent goal or another user's goal **When** `DELETE /api/goals/:goalId` is called **Then** the system returns 404 Not Found
4. **Given** an unauthenticated request **When** `DELETE /api/goals/:goalId` is called without a valid Bearer token **Then** a 401 Unauthorized response is returned
5. **Given** a valid delete request **Then** the deletion uses a hard delete (row removed), not a soft delete

## Tasks / Subtasks

- [x] Task 1: Add `delete` method to GoalService (AC: #1, #2, #3, #5)
  - [x] 1.1 Add `delete(userId: string, goalId: string): Promise<void>` method
  - [x] 1.2 Fetch the goal first using existing `findOne(userId, goalId)` — reuses 404 handling for non-existent/other-user goals (AC #3)
  - [x] 1.3 Check goal status against deletable statuses: `intake_in_progress`, `profile_generating`, `profile_generation_failed`
  - [x] 1.4 If status is `intake_completed` or `active`, throw `BadRequestException` with message: `Cannot delete a goal in '${status}' status` (AC #2)
  - [x] 1.5 Execute hard delete: `supabase.from('goals').delete().eq('id', goalId).eq('user_id', userId)` (AC #5)
  - [x] 1.6 Throw `InternalServerErrorException` if Supabase `.error` is truthy
- [x] Task 2: Add DELETE endpoint to GoalController (AC: #1, #4)
  - [x] 2.1 Add `@Delete(':goalId')` endpoint with `@HttpCode(204)` decorator
  - [x] 2.2 Accept `goalId` via `@Param('goalId')` and `userId` via `@UserId()`
  - [x] 2.3 Call `goalService.delete(userId, goalId)` — returns void, NestJS sends 204 automatically
- [x] Task 3: Unit tests (AC: #1, #2, #3)
  - [x] 3.1 GoalService: `delete` succeeds for goal in `intake_in_progress` status
  - [x] 3.2 GoalService: `delete` succeeds for goal in `profile_generating` status
  - [x] 3.3 GoalService: `delete` succeeds for goal in `profile_generation_failed` status
  - [x] 3.4 GoalService: `delete` throws `BadRequestException` for goal in `intake_completed` status
  - [x] 3.5 GoalService: `delete` throws `BadRequestException` for goal in `active` status
  - [x] 3.6 GoalService: `delete` throws `NotFoundException` when goal not found (delegates to `findOne`)
  - [x] 3.7 GoalService: `delete` calls Supabase delete with correct params
  - [x] 3.8 GoalController: `DELETE /goals/:goalId` delegates to service and returns 204

## Dev Notes

### Technical Requirements

**Deletable statuses (FR7):** `intake_in_progress`, `profile_generating`, `profile_generation_failed`
**Protected statuses (FR8):** `intake_completed`, `active`

**Status check implementation:** Define a constant array of deletable statuses in the service method. Check with `.includes()`. This keeps the logic readable and easily extensible if statuses change.

```typescript
const DELETABLE_STATUSES = ['intake_in_progress', 'profile_generating', 'profile_generation_failed'];

if (!DELETABLE_STATUSES.includes(goal.status)) {
  throw new BadRequestException(`Cannot delete a goal in '${goal.status}' status`);
}
```

**Hard delete, not soft delete:** The architecture doc and epics both specify actual row deletion. No `deleted_at` column exists. Use Supabase `.delete()`.

**Reuse `findOne`:** The existing `findOne(userId, goalId)` already handles the 404 case (throws `NotFoundException` when no row found or user doesn't own it). Call it first to get the goal object for status checking, then delete if allowed.

### Architecture Compliance

**Module structure:** GoalModule already exists at `src/goal/`. This story ADDS a method to GoalService and an endpoint to GoalController — do NOT recreate files. No new modules or dependencies needed.

**File naming:** `kebab-case.ts` — all files already exist. No new files except test additions.

**Import pattern:** ALL relative imports MUST use `.js` extension:
```typescript
import { GoalService } from './goal.service.js';
```

**Error handling:** Use NestJS HTTP exceptions exclusively:
- `NotFoundException` — goal not found (already handled by `findOne`)
- `BadRequestException` — deletion not allowed for protected status
- `InternalServerErrorException` — Supabase error on delete operation
- Never `console.log` — use existing `private readonly logger = new Logger(GoalService.name)`

**Supabase client:** Always via `this.supabaseService.getAdminClient()` (already injected in GoalService constructor).

**JSON responses:** DELETE returns 204 No Content — no response body. Error responses use NestJS default format `{ statusCode, message, error }`.

**Controller decorator:** Use `@HttpCode(204)` on the delete method. NestJS defaults to 200 for all methods — the decorator overrides this. Import `HttpCode` from `@nestjs/common`.

**Endpoint path:** `DELETE /api/goals/:goalId` — matches architecture doc API Boundaries table exactly. Route param is `camelCase` `:goalId` per naming conventions.

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed:

- `@nestjs/common` — `Delete`, `HttpCode`, `Param`, `BadRequestException` (already available)
- `@supabase/supabase-js` — `.delete()` method on query builder (already installed)
- `class-validator` / `class-transformer` — not needed for this story (no new DTOs)

**NestJS decorators to use on the controller method:**
```typescript
@Delete(':goalId')
@HttpCode(204)
async delete(@UserId() userId: string, @Param('goalId') goalId: string): Promise<void> {
  await this.goalService.delete(userId, goalId);
}
```

**Supabase delete pattern:**
```typescript
const supabase = this.supabaseService.getAdminClient();
const { error } = await supabase
  .from('goals')
  .delete()
  .eq('id', goalId)
  .eq('user_id', userId);
```
Note: The `.eq('user_id', userId)` is a safety filter even though we already verified ownership via `findOne`. Defense in depth.

### File Structure Requirements

**Files to MODIFY (do NOT recreate):**
- `src/goal/goal.service.ts` — ADD `delete(userId, goalId)` method
- `src/goal/goal.controller.ts` — ADD `DELETE /goals/:goalId` endpoint, add `Delete` and `HttpCode` to imports from `@nestjs/common`
- `src/goal/goal.service.spec.ts` — ADD test cases for `delete` method (7 tests)
- `src/goal/goal.controller.spec.ts` — ADD test case for delete endpoint (1 test)

**No new files to create.** This story adds to existing files only.

**No database migration needed.** The `goals` table schema is unchanged — deletion operates on existing rows. RLS policies already permit delete by owner (the `delete` policy uses `(select auth.uid()) = user_id`).

**No changes to GoalModule.** No new providers, imports, or exports needed.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured with `moduleNameMapper` for `.js` extension resolution.

**Test patterns established in stories 1-1 and 1-2 — follow exactly:**

**GoalService tests (`goal.service.spec.ts`):** Add a `describe('delete')` block with 7 tests:
- Mock `findOne` on the service itself (spy) to return a goal with the desired status
- Mock Supabase chain: `from().delete().eq().eq()` returning `{ error: null }`
- For 404 test: mock `findOne` to throw `NotFoundException`
- For BadRequestException tests: mock `findOne` returning a goal with protected status

```typescript
// Pattern from existing tests — mock Supabase chain
const mockDelete = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
// Chain: from('goals').delete().eq('id', goalId).eq('user_id', userId)
mockSupabase.from.mockReturnValue({
  delete: mockDelete,
  // ... chain continues
});
```

**GoalController tests (`goal.controller.spec.ts`):** Add 1 test:
- Verify `delete` endpoint calls `goalService.delete(userId, goalId)`
- Mock `AuthGuard` already set up at describe level (from stories 1-1, 1-2)

**Test count expectations:** 8 new tests (7 service + 1 controller), bringing total across goal module to ~35 tests.

**Debug learnings from previous stories to avoid:**
- `AuthGuard` depends on `SupabaseService` — controller tests already have the mock provider
- `reflect-metadata` import needed in spec files that test decorators (not needed here — no new DTOs)
- ESLint/Prettier may auto-fix formatting — run `npm run lint` after implementation

### Previous Story Intelligence

**From Story 1-1 (Create a Goal):**
- Infrastructure scaffolded: NestJS 11, ESM/nodenext, SupabaseModule (@Global), AiModule (@Global), AuthGuard, @UserId() decorator, app.config.ts, ConfigModule
- GoalService pattern: `getAdminClient()` → query → check `.error` → throw HTTP exception or return data
- GoalController pattern: class-level `@UseGuards(AuthGuard)`, methods use `@UserId()` for user extraction
- Tests: mock `SupabaseService` with `getAdminClient` returning chainable mock object; mock `AuthGuard` in controller tests to avoid Supabase dependency
- Debug: `TS2352` casting `Request` to `Record<string, unknown>` fixed by casting via `unknown` first
- Debug: ESLint prettier formatting auto-fixed across files — expect this after changes

**From Story 1-2 (List and View Goals):**
- `findOne` already implemented and handles 404 via `NotFoundException` — reuse directly
- `findAll` uses Supabase `count: 'exact'` + `.range()` for pagination
- Supabase `.single()` returns error with code `PGRST116` when no rows — `findOne` catches any error and throws `NotFoundException`
- Debug: `Reflect.getMetadata is not a function` in DTO tests — fixed by importing `reflect-metadata`. Not relevant to this story (no new DTOs)
- Debug: Prettier formatting errors on multi-line controller method signatures — collapsed to single-line

**Key patterns to maintain:**
- Logger already exists in GoalService: `private readonly logger = new Logger(GoalService.name)`
- All Supabase queries filter by `user_id` even though admin client bypasses RLS
- Error responses use NestJS default format — no custom error shaping

### API Contract

**Request:**
```
DELETE /api/goals/:goalId
Authorization: Bearer <jwt>
```

**Response (204 — success):** No body.

**Response (400 — protected status):**
```json
{
  "statusCode": 400,
  "message": "Cannot delete a goal in 'intake_completed' status",
  "error": "Bad Request"
}
```

**Response (404 — not found):**
```json
{
  "statusCode": 404,
  "message": "Goal not found",
  "error": "Not Found"
}
```

### Project Structure Notes

- All changes within `src/goal/` — no other modules affected
- No new files, no new dependencies, no database migrations
- GoalModule exports remain unchanged

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — DELETE /api/goals/:goalId]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — Empty success: 204 No Content]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Error Handling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3 — FR7, FR8]
- [Source: _bmad-output/implementation-artifacts/1-1-create-a-goal.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/1-2-list-and-view-goals.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. Clean implementation with no blockers.

### Completion Notes List

- Implemented `GoalService.delete(userId, goalId)` method with status-based deletion guard using `DELETABLE_STATUSES` array and `.includes()` check
- Reused existing `findOne()` for ownership verification and 404 handling (defense in depth with `.eq('user_id', userId)` on the delete query)
- Added `@Delete(':goalId')` endpoint with `@HttpCode(204)` to GoalController
- Added `BadRequestException` import to GoalService for protected status rejection
- Added `Delete` and `HttpCode` imports to GoalController
- 8 new tests added (7 service + 1 controller), all passing — total: 36 tests across goal module
- Red-green-refactor cycle followed: tests written first, confirmed failing, then implementation made them pass
- Linter ran clean (0 errors, only pre-existing warnings); Prettier auto-formatted multi-line controller method signature
- No new dependencies, no new files, no database migrations required

### File List

- `src/goal/goal.service.ts` — Modified: added `delete()` method, added `BadRequestException` import
- `src/goal/goal.controller.ts` — Modified: added `DELETE /goals/:goalId` endpoint, added `Delete` and `HttpCode` imports
- `src/goal/goal.service.spec.ts` — Modified: added 8 tests in `describe('delete')` block, added `BadRequestException` import
- `src/goal/goal.controller.spec.ts` — Modified: added `delete` mock to goalService, added 1 test for delete endpoint

## Change Log

- 2026-02-08: Implemented DELETE /api/goals/:goalId endpoint with status-based deletion guard (FR7/FR8). Goals in `intake_in_progress`, `profile_generating`, or `profile_generation_failed` status can be hard-deleted; goals in `intake_completed` or `active` status are protected. 8 new unit tests added.
