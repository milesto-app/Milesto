# Story 4.4: Retrieve Roadmap & Milestones

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-22 -->

## Story

As a **user**,
I want to view my roadmap and milestones at any time,
So that I can see my long-term plan and track milestone progression.

## Acceptance Criteria

1. **Given** an authenticated user with a completed roadmap **When** `GET /api/goals/:goalId/roadmap` is called **Then** the system returns the roadmap with all milestones ordered by `order_index` (FR42) **And** the response includes roadmap metadata (status, generation_attempts, model_used, created_at) alongside the milestones array

2. **Given** an authenticated user with a completed roadmap **When** `GET /api/goals/:goalId/roadmap/milestones` is called **Then** the system returns the milestones array as a summary view with fields: `id`, `title`, `description`, `expected_outcome`, `target_month`, `order_index` (FR43) **And** milestones are ordered by `order_index` ascending

3. **Given** a goal with no roadmap **When** `GET /api/goals/:goalId/roadmap` is called **Then** the system returns 404 Not Found

4. **Given** a goal with a roadmap in `failed` or `generating` status **When** `GET /api/goals/:goalId/roadmap` is called **Then** the system returns the roadmap with its current status and an empty milestones array (allowing the client to display status and offer retry)

5. **Given** a request for another user's roadmap **When** the query runs **Then** the service-level `user_id` filter prevents cross-user access and returns 404

6. **Given** a goal with no roadmap **When** `GET /api/goals/:goalId/roadmap/milestones` is called **Then** the system returns 404 Not Found

7. **Given** all retrieval endpoints **When** the test suite runs **Then** comprehensive unit tests cover all acceptance criteria including edge cases (empty milestones, failed/generating status, not-found) **And** all existing 283 tests continue to pass with zero regressions

## Tasks / Subtasks

- [x] Task 1: Enhance `getRoadmap` service method for status-aware retrieval (AC: #1, #3, #4)
  - [x] 1.1 Verify current `getRoadmap` correctly returns roadmap in any status (complete, failed, generating) with milestones — it already does this; enhance with empty milestones handling for non-complete roadmaps
  - [x] 1.2 Verify 404 is thrown when no roadmap exists for the goal/user combination

- [x] Task 2: Enhance `getMilestones` service method for summary view (AC: #2, #6)
  - [x] 2.1 Verify `getMilestones` returns milestones ordered by `order_index`
  - [x] 2.2 Verify 404 is thrown when no roadmap exists for milestones endpoint
  - [x] 2.3 Consider using `select('id, title, description, expected_outcome, target_month, order_index, created_at')` for true summary view (optimize payload)

- [x] Task 3: Add Swagger/OpenAPI decorators to retrieval endpoints (AC: #1, #2)
  - [x] 3.1 Add `@ApiTags('roadmap')` to `RoadmapController`
  - [x] 3.2 Add `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` decorators to `GET /roadmap` endpoint
  - [x] 3.3 Add `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` decorators to `GET /milestones` endpoint
  - [x] 3.4 Add `@ApiOperation`, `@ApiResponse` to existing `POST /generate` endpoint for completeness

- [x] Task 4: Write comprehensive unit tests (AC: #7)
  - [x] 4.1 Extend `roadmap.service.spec.ts` with edge case tests:
    - getRoadmap with `failed` status roadmap → returns roadmap with empty milestones
    - getRoadmap with `generating` status roadmap → returns roadmap with empty milestones
    - getMilestones when roadmap has no milestones → returns empty array
    - getMilestones when roadmap not found → throws NotFoundException
  - [x] 4.2 Extend `roadmap.controller.spec.ts` with additional tests:
    - GET /roadmap passes correct params to service
    - GET /milestones passes correct params to service
  - [x] 4.3 Run full test suite: all 283 existing tests + new tests pass, 0 regressions

- [x] Task 5: Verify RLS enforcement (AC: #5)
  - [x] 5.1 Confirm `getRoadmap` filters by both `goal_id` and `user_id`
  - [x] 5.2 Confirm `getMilestones` filters by both `goal_id` and `user_id` (via roadmap lookup)
  - [x] 5.3 Add unit test for cross-user access attempt → 404

## Dev Notes

### Developer Context

**What this story delivers:** The read-side completion of the roadmap module — ensuring both retrieval endpoints (roadmap overview + milestone list) are production-ready with proper error handling, API documentation, and comprehensive test coverage.

**Critical context: Story 4.3 already scaffolded these endpoints.** The retrieval methods (`getRoadmap`, `getMilestones`) and controller endpoints (`GET /roadmap`, `GET /milestones`) already exist and are functional. This story's primary focus is:
1. **Hardening** — ensuring edge cases are handled (failed/generating status, empty milestones, cross-user access)
2. **Documentation** — adding Swagger/OpenAPI decorators for mobile client developer
3. **Test coverage** — comprehensive tests for all ACs including negative cases
4. **Validation** — confirming the implementation fully satisfies FR42/FR43

**Existing code locations:**
- `src/roadmap/roadmap.controller.ts:27-41` — GET /roadmap and GET /milestones endpoints
- `src/roadmap/roadmap.service.ts:91-133` — `getRoadmap()` and `getMilestones()` methods
- `src/roadmap/roadmap.service.spec.ts:400-467` — Existing retrieval tests (1 happy + 1 error each)
- `src/roadmap/roadmap.controller.spec.ts:64-85` — Existing controller tests for retrieval

**This story completes Epic 4.** After this story, all 4 stories in Epic 4 are done and the epic can transition to `done` status.

### Technical Requirements

**This is a hardening + documentation story.** No new services, no new tables, no new modules. The retrieval logic already exists from Story 4.3 scaffolding. The work is:

**1. Swagger/OpenAPI decorators (primary new code):**

```typescript
// In roadmap.controller.ts — add these imports and decorators
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('roadmap')
@ApiBearerAuth()
@Controller('goals/:goalId/roadmap')
@UseGuards(AuthGuard)
export class RoadmapController {

  @Post('generate')
  @ApiOperation({ summary: 'Generate milestone roadmap for a goal' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Roadmap with milestones generated successfully' })
  @ApiResponse({ status: 400, description: 'Goal not in valid status or max retries exceeded' })
  @ApiResponse({ status: 409, description: 'Generation already in progress' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle(...)
  async generateRoadmap(...) { ... }

  @Get()
  @ApiOperation({ summary: 'Retrieve roadmap with milestones overview' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Roadmap with milestones array' })
  @ApiResponse({ status: 404, description: 'No roadmap found for this goal' })
  async getRoadmap(...) { ... }

  @Get('milestones')
  @ApiOperation({ summary: 'Retrieve milestone list (summary view)' })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Milestones array ordered by order_index' })
  @ApiResponse({ status: 404, description: 'No roadmap found for this goal' })
  async getMilestones(...) { ... }
}
```

**2. Potential service enhancement — milestone summary select:**

```typescript
// In roadmap.service.ts getMilestones() — consider selecting only summary fields
const { data, error } = await supabase
  .from('milestones')
  .select('id, title, description, expected_outcome, target_month, order_index, created_at')
  .eq('roadmap_id', roadmap.id)
  .order('order_index', { ascending: true });
```

This is optional — the current `select('*')` works fine and returns all fields. Only optimize if payload size is a concern.

**3. No new endpoints, no new service methods needed.**

### Architecture Compliance

**Module placement:** All changes in existing files under `src/roadmap/`. No new modules, no new services.

**Naming patterns:**
- Swagger decorators follow kebab-case for API tags matching controller prefix: `@ApiTags('roadmap')`
- No new files to name — all modifications to existing files

**Error handling pattern (already correct in existing code):**
- `NotFoundException` (404) for missing roadmap or milestones
- Admin client + `user_id` filter for RLS enforcement at service level
- Supabase `.single()` error → NotFoundException

**Response format per architecture doc:**
- `GET /roadmap` returns the roadmap object directly (with milestones nested)
- `GET /milestones` returns the milestones array directly
- Error responses: NestJS default `{ statusCode, message, error }`

**Swagger pattern from Story 3.4:**
- `@ApiTags` on controller class
- `@ApiBearerAuth` on controller class
- `@ApiOperation({ summary })` on each endpoint
- `@ApiParam` for path parameters
- `@ApiResponse({ status, description })` for each possible response code

### Library & Framework Requirements

**No new packages to install.** All dependencies already exist:
- `@nestjs/swagger` — already installed and configured (from Story 3.4)
- `@supabase/supabase-js` — admin client for DB reads
- `@nestjs/throttler` — already on generate endpoint

**Do NOT install:** Any new packages. This is a pure read-endpoint story.

### File Structure Requirements

**Files to MODIFY:**

- `src/roadmap/roadmap.controller.ts` — Add Swagger decorators (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`, `@ApiResponse`) to all 3 endpoints
- `src/roadmap/roadmap.service.spec.ts` — Add edge case tests for getRoadmap and getMilestones
- `src/roadmap/roadmap.controller.spec.ts` — Optionally extend with additional test assertions

**Files NOT to touch:**

- `src/roadmap/roadmap.service.ts` — Already correct, no logic changes needed (unless optimizing milestone select)
- `src/roadmap/roadmap.module.ts` — No changes
- `src/roadmap/context-pipeline.service.ts` — No changes
- `src/roadmap/rerank.service.ts` — No changes
- `src/roadmap/generation.service.ts` — No changes
- `src/roadmap/types/*` — No changes
- `src/config/app.config.ts` — No changes
- `src/goal/` — No changes
- `src/intake/` — No changes
- `src/ai/` — No changes
- `src/app.module.ts` — No changes

**Files NOT to create:**

- No new service files
- No new DTO files (retrieval endpoints have no request body)
- No new type files
- No new migration files

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Extend `src/roadmap/roadmap.service.spec.ts`:**

New tests for `getRoadmap`:
- Test: Roadmap with `failed` status → returns roadmap object with status `failed` and empty milestones array
- Test: Roadmap with `generating` status → returns roadmap object with status `generating` and empty milestones array
- Test: Roadmap with `complete` status → returns roadmap with milestones ordered by order_index (existing test, verify)
- Test: No roadmap for goal → throws NotFoundException (existing test, verify)
- Test: Milestones query returns null → roadmap returned with empty milestones array

New tests for `getMilestones`:
- Test: Roadmap exists with milestones → returns ordered array (existing test, verify)
- Test: No roadmap for goal → throws NotFoundException
- Test: Roadmap exists but no milestones → returns empty array
- Test: Milestones query error → throws NotFoundException

**Extend `src/roadmap/roadmap.controller.spec.ts`:**
- Test: Verify GET /roadmap passes goalId and userId to service
- Test: Verify GET /milestones passes goalId and userId to service

**Mock patterns (maintain consistency with existing tests):**
```typescript
// Existing pattern from roadmap.service.spec.ts — reuse for new tests
const roadmapSingleMock = jest.fn().mockResolvedValue({
  data: { ...mockRoadmapRow, status: 'failed' },
  error: null,
});
```

**Existing test count:** 283 tests. All must pass after changes.

### Previous Story Intelligence

**From Story 4.3 (Generate Milestone Roadmap) — just completed:**
- 283 tests passing (33 new tests added in 4.3, +2 from review fixes)
- `getRoadmap(goalId, userId)` already returns roadmap with milestones via `.order('order_index')`
- `getMilestones(goalId, userId)` already returns milestone array via roadmap lookup
- Both controller endpoints wired and tested at basic level
- Swagger pattern established in Story 3.4 — use same decorator approach
- Mock pattern for Supabase chains well-established: `.from().select().eq().single()`
- Current default AI model: `google/gemini-3-flash-preview` (not relevant for retrieval)

**From Story 4.3 code review findings:**
- Test coverage must be comprehensive for all paths
- All warn-level logging must be asserted in tests
- Keep changes minimal and surgical

### Git Intelligence

Recent commits:
```
a7b5971 feat(roadmap): implement milestone generation via LLM orchestration
1c14408 feat(roadmap): implement 3-tier context retrieval pipeline for generation
935fa65 refactor(embeddings): unify context storage and apply code review fixes
110e922 feat(embeddings): unify context storage and add roadmap configuration
```

**Patterns:**
- Commit format: `type(scope): description` — scope for this story: `roadmap`
- Expected commit type: `feat(roadmap)` for Swagger additions, or `test(roadmap)` if primarily test additions

### What NOT to Build

- No new service methods — retrieval logic already exists
- No new database tables or migrations — roadmaps and milestones tables already exist
- No new module wiring — RoadmapModule already complete
- No generation logic — that's Story 4.3 (done)
- No quality scoring — that's Story 7.1
- No weekly plans, daily objectives, check-ins, debriefs — those are Epic 5/6
- Do NOT add new npm packages
- Do NOT modify `src/config/app.config.ts`
- Do NOT change the roadmap service logic unless a bug is found
- Do NOT add DTOs for retrieval endpoints (no request body)

### Project Structure Notes

- All changes in existing files under `src/roadmap/` — NO new files to create
- Alignment with established patterns from Stories 4.1–4.3
- Swagger decorators follow pattern from Story 3.4 (API Documentation)

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 4.4 — Retrieve Roadmap & Milestones acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR42, FR43 map to Story 4.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Endpoints — GET /roadmap, GET /milestones]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — Swagger decorators, naming patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Formats — resource directly, list responses, error responses]
- [Source: _bmad-output/planning-artifacts/architecture.md#RLS Policies — roadmaps direct user_id, milestones join-based]
- [Source: _bmad-output/implementation-artifacts/4-3-generate-milestone-roadmap.md — Previous story: scaffolded retrieval endpoints, 283 tests]
- [Source: src/roadmap/roadmap.service.ts — getRoadmap(), getMilestones() implementations]
- [Source: src/roadmap/roadmap.controller.ts — GET /roadmap, GET /milestones endpoint wiring]

## Change Log

- 2026-02-22: Implemented Story 4.4 — Added Swagger/OpenAPI decorators to all roadmap controller endpoints, comprehensive edge case tests for getRoadmap and getMilestones, cross-user RLS enforcement tests. Verified existing service logic handles all status-aware retrieval correctly. 293 tests pass (10 new, 0 regressions).
- 2026-02-22: Code review fixes — Added missing @ApiResponse 401 to all endpoints (consistency with GoalController pattern), changed getMilestones to summary select per AC#2 (select specific fields instead of '*'), enhanced cross-user tests with eq() call assertions to verify user_id filter. 293 tests pass, 0 regressions.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No bugs or issues encountered. Existing service implementation from Story 4.3 already handled all edge cases (failed/generating status, empty milestones, null data). No service code changes were needed.

### Completion Notes List

- **Task 1 (getRoadmap hardening):** Verified existing `getRoadmap` at `roadmap.service.ts:91-110` correctly handles all statuses. The `milestones ?? []` pattern already returns empty array for non-complete roadmaps. Added 4 new edge case tests (failed status, generating status, null milestones, cross-user access).
- **Task 2 (getMilestones hardening):** Verified existing `getMilestones` at `roadmap.service.ts:112-133` correctly returns ordered milestones and throws 404 for missing roadmap. Added 4 new edge case tests (order verification, no roadmap, empty milestones, query error). [Review fix] Subtask 2.3 implemented — changed `select('*')` to summary select per AC#2, added `MilestoneSummary` type.
- **Task 3 (Swagger decorators):** Added `@ApiTags('roadmap')`, `@ApiBearerAuth()` at class level. Added `@ApiOperation`, `@ApiParam`, `@ApiResponse` decorators to all 3 endpoints (POST /generate, GET /, GET /milestones) following the established pattern from Story 3.4. [Review fix] Added missing `@ApiResponse({ status: 401 })` to all endpoints for consistency with GoalController.
- **Task 4 (comprehensive tests):** Extended service spec with 8 new tests covering all edge cases. Extended controller spec with 2 new RLS enforcement tests. Full suite: 293 tests pass, 0 regressions.
- **Task 5 (RLS verification):** Confirmed both `getRoadmap` and `getMilestones` filter by `user_id` at the Supabase query level. Added cross-user access tests for both methods demonstrating 404 on mismatched user. [Review fix] Enhanced cross-user tests with `.eq()` call assertions to verify actual user_id filtering, not just error propagation.

### File List

- `src/roadmap/roadmap.controller.ts` — Modified: Added Swagger/OpenAPI decorators (@ApiTags, @ApiBearerAuth, @ApiOperation, @ApiParam, @ApiResponse) to all 3 endpoints. [Review] Added @ApiResponse 401 to all endpoints.
- `src/roadmap/roadmap.service.ts` — Modified: [Review] Changed getMilestones select from '*' to summary fields, updated return type to MilestoneSummary[].
- `src/roadmap/types/roadmap.types.ts` — Modified: [Review] Added MilestoneSummary type (Pick from Milestone).
- `src/roadmap/roadmap.service.spec.ts` — Modified: Added 8 new edge case tests for getRoadmap and getMilestones (failed/generating status, empty milestones, null data, cross-user access, query errors). [Review] Enhanced cross-user tests with eq() call assertions.
- `src/roadmap/roadmap.controller.spec.ts` — Modified: Added 2 new RLS enforcement tests verifying goalId and userId pass-through
