# Story 3.5: Admin Re-Embedding Endpoint

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-12 -->

## Story

As an **admin**,
I want to trigger re-embedding for entries that failed to embed,
So that no semantic context is permanently lost.

## Acceptance Criteria

1. **Given** `intake_batches` or `goal_profiles` records exist with `embedded = false` **When** `POST /api/admin/reembed-missing` is called **Then** the system finds all unembedded records, regenerates embeddings, inserts them into `goal_context_embeddings`, and updates `embedded = true` on each source record (FR36)

2. **Given** an embedding retry succeeds **When** the embedding is stored in `goal_context_embeddings` **Then** the source record (`intake_batches` or `goal_profiles`) has `embedded` updated to `true`

3. **Given** an embedding retry fails (AI call error) **When** the error is caught **Then** the source record remains `embedded = false`, the error is logged, and processing continues to the next record

4. **Given** no records have `embedded = false` **When** `POST /api/admin/reembed-missing` is called **Then** the system returns `{ processed: 0, succeeded: 0, failed: 0 }` indicating nothing to reembed

5. **Given** an unauthenticated request **When** `POST /api/admin/reembed-missing` is called **Then** the system returns 401 Unauthorized

## Tasks / Subtasks

- [x] Task 1: Create AdminController in IntakeModule (AC: #1, #5)
  - [x] 1.1 Create `src/intake/admin.controller.ts` with `@Controller('admin')`, `@UseGuards(AuthGuard)`, `@ApiTags('Admin')`, `@ApiBearerAuth()`
  - [x] 1.2 Add `POST reembed-missing` endpoint method calling `IntakeService.reembedMissing()`
  - [x] 1.3 Add Swagger decorators (`@ApiOperation`, `@ApiResponse`)
  - [x] 1.4 Register `AdminController` in `IntakeModule` controllers array

- [x] Task 2: Implement `reembedMissing()` in IntakeService (AC: #1, #2, #3, #4)
  - [x] 2.1 Query `intake_batches` where `embedded = false` (admin client, no user_id filter)
  - [x] 2.2 Query `goal_profiles` where `embedded = false` (admin client, no user_id filter)
  - [x] 2.3 For each unembedded batch: load questions+answers, format Q&A text using existing `formatBatchQAForEmbedding()`, generate embedding via `AiService`, insert into `goal_context_embeddings`, update `intake_batches.embedded = true`
  - [x] 2.4 For each unembedded profile: load `narrative_summary`, generate embedding via `AiService`, insert into `goal_context_embeddings`, update `goal_profiles.embedded = true`
  - [x] 2.5 Return `{ processed, succeeded, failed }` summary object

- [x] Task 3: Write unit tests for `reembedMissing()` (AC: #1-#4)
  - [x] 3.1 Test: no unembedded records returns `{ processed: 0, succeeded: 0, failed: 0 }`
  - [x] 3.2 Test: unembedded batches are re-embedded and flagged
  - [x] 3.3 Test: unembedded profiles are re-embedded and flagged
  - [x] 3.4 Test: mixed batch+profile re-embedding
  - [x] 3.5 Test: embedding failure on one record doesn't stop processing of remaining records
  - [x] 3.6 Test: failed records are counted correctly in response

- [x] Task 4: Write AdminController unit test (AC: #1, #5)
  - [x] 4.1 Test: route calls `intakeService.reembedMissing()` and returns result
  - [x] 4.2 Test: AuthGuard is applied (metadata check)

- [x] Task 5: Verify all existing tests pass (AC: #1-#5)
  - [x] 5.1 Run full test suite — all 203 tests pass with zero regressions (195 existing + 8 new)

## Dev Notes

### Developer Context

**What this story builds:** A single admin endpoint `POST /api/admin/reembed-missing` that finds all `intake_batches` and `goal_profiles` with `embedded = false`, regenerates their embeddings, stores them in `goal_context_embeddings`, and updates the `embedded` flag. This recovers semantic context that was lost due to transient AI/embedding failures.

**This is the final story in Epic 3** (Reliable Intake and Production Readiness). It implements FR36: "Admins can trigger re-embedding for entries that failed to embed."

**The embedding pipeline already exists.** Story 2.5 implemented two event listeners in `IntakeService`:
- `handleBatchAnswered()` — embeds batch Q&A text on `batch.answered` event
- `handleProfileGenerated()` — embeds profile narrative on `profile.generated` event

Both listeners follow fire-and-forget pattern: on failure, `embedded` stays `false` and error is logged. This story provides the recovery mechanism.

**Where the `embedded` flag lives:**
- `intake_batches.embedded` — boolean, tracks whether batch Q&A was embedded
- `goal_profiles.embedded` — boolean, tracks whether profile narrative was embedded
- `goal_context_embeddings` has NO `embedded` column — it stores successful embeddings only

**Re-embedding reuses existing logic.** The `formatBatchQAForEmbedding()` private method in IntakeService (around line 1099) already formats Q&A text for embedding. The `AiService.generateEmbedding()` method is already used. The insert pattern into `goal_context_embeddings` is already established.

### Technical Requirements

**New file: `src/intake/admin.controller.ts`**

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { IntakeService } from './intake.service.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post('reembed-missing')
  @ApiOperation({ summary: 'Retry embedding for all entries that failed to embed' })
  @ApiResponse({ status: 201, description: 'Re-embedding results returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async reembedMissing() {
    return this.intakeService.reembedMissing();
  }
}
```

**IntakeService addition: `reembedMissing()` method**

```typescript
async reembedMissing(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = this.supabaseService.getAdminClient();
  let succeeded = 0;
  let failed = 0;

  // 1. Find unembedded batches
  const { data: batches } = await supabase
    .from('intake_batches')
    .select('id, goal_id, user_id, batch_number')
    .eq('embedded', false);

  // 2. Find unembedded profiles
  const { data: profiles } = await supabase
    .from('goal_profiles')
    .select('id, goal_id, user_id, narrative_summary')
    .eq('embedded', false);

  const totalBatches = batches?.length ?? 0;
  const totalProfiles = profiles?.length ?? 0;
  const processed = totalBatches + totalProfiles;

  // 3. Re-embed each batch
  for (const batch of batches ?? []) {
    try {
      // Load questions + answers, format text, generate embedding, insert, update flag
      // Reuse formatBatchQAForEmbedding() and existing insert pattern
      // ... (same logic as handleBatchAnswered)
      succeeded++;
    } catch (error) {
      this.logger.error(`Re-embed failed for batch ${batch.id}: ${error.message}`);
      failed++;
    }
  }

  // 4. Re-embed each profile
  for (const profile of profiles ?? []) {
    try {
      // Generate embedding from narrative_summary, insert, update flag
      // ... (same logic as handleProfileGenerated)
      succeeded++;
    } catch (error) {
      this.logger.error(`Re-embed failed for profile ${profile.id}: ${error.message}`);
      failed++;
    }
  }

  this.logger.log(`Re-embed complete: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);
  return { processed, succeeded, failed };
}
```

**IntakeModule change: register AdminController**

In `src/intake/intake.module.ts`, add `AdminController` to the `controllers` array:

```typescript
import { AdminController } from './admin.controller.js';

@Module({
  imports: [GoalModule],
  controllers: [IntakeController, AdminController],
  providers: [IntakeService, IntakePromptService, IntakeQualityService],
})
export class IntakeModule {}
```

### Architecture Compliance

**Module placement:** Architecture doc states: "Admin reembed endpoint (`POST /api/admin/reembed-missing`) referenced in PRD but not in endpoint table — add to IntakeModule when needed." The `AdminController` lives in `src/intake/` as a separate controller within IntakeModule. It does NOT require a new module.

**Route prefix:** The global prefix is `/api` (set in `main.ts`). The controller is `@Controller('admin')`. Combined: `POST /api/admin/reembed-missing`. This matches the PRD endpoint specification.

**Admin client usage:** The `reembedMissing()` method uses `getAdminClient()` (same as all server-side operations). It queries across ALL users (no `user_id` filter) — this is correct for admin operations. RLS is bypassed by the admin client.

**Auth:** Uses `@UseGuards(AuthGuard)` — any authenticated user can call it. For a 2-person team MVP, this is sufficient. The endpoint is not publicly known and does no destructive writes. Future enhancement: add admin role checking.

**Error handling:** Uses NestJS Logger for error reporting. Individual embedding failures are caught and counted without stopping the loop. Returns structured response with counts.

**Import pattern:** All relative imports MUST use `.js` extension. Package imports do NOT use extension.

**No new dependencies needed.** All libraries are already installed.

### Library & Framework Requirements

No new packages to install. All required dependencies exist:
- `@nestjs/common` — Controller, Post, UseGuards
- `@nestjs/swagger` — ApiTags, ApiBearerAuth, ApiOperation, ApiResponse
- `@supabase/supabase-js` — Supabase admin client (via SupabaseService)
- `openai` — Embedding generation (via AiService)

### File Structure Requirements

**Files to CREATE:**

- `src/intake/admin.controller.ts` — AdminController with `POST reembed-missing` endpoint
- `src/intake/admin.controller.spec.ts` — Unit tests for AdminController

**Files to MODIFY:**

- `src/intake/intake.module.ts` — Add `AdminController` to controllers array
- `src/intake/intake.service.ts` — Add `reembedMissing()` method
- `src/intake/intake.service.spec.ts` — Add unit tests for `reembedMissing()`

**Files NOT to touch:**

- `src/app.module.ts` — IntakeModule already imported, no changes needed
- `src/main.ts` — No changes
- `src/ai/ai.service.ts` — `generateEmbedding()` already exists
- `src/config/app.config.ts` — No new config needed
- `src/common/guards/auth.guard.ts` — Reuse as-is
- Any goal module files — No changes
- `intake-prompt.service.ts` — No changes
- `intake-quality.service.ts` — No changes
- Any existing DTO files — No new DTOs needed (endpoint has no request body)
- Database — No migrations needed (all tables already exist)

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**New tests to write:**

1. **`src/intake/admin.controller.spec.ts`** — AdminController unit tests:
   - Verify `reembedMissing()` calls `intakeService.reembedMissing()` and returns result
   - Verify AuthGuard is applied via metadata reflection

2. **`src/intake/intake.service.spec.ts`** — Add tests for `reembedMissing()`:
   - No unembedded records → returns `{ processed: 0, succeeded: 0, failed: 0 }`
   - Unembedded batch records → loads questions+answers, generates embedding, inserts into goal_context_embeddings, updates embedded=true
   - Unembedded profile records → loads narrative_summary, generates embedding, inserts into goal_context_embeddings, updates embedded=true
   - Mixed batches and profiles → both processed correctly
   - Embedding failure on one record → continues processing, counts failure correctly
   - Multiple failures → all counted, all logged, none stop the loop

**Mocking pattern (established in existing tests):**

```typescript
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
};
```

Mock `AiService.generateEmbedding()` to return a 1536-length array of zeros (or any valid number array).

**Existing test count:** ~195 tests. This story should add ~8-10 new tests. All existing tests must pass.

### Previous Story Intelligence

**From Story 3.4 (API Documentation with Swagger):**
- All Swagger patterns established: `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`
- Swagger CLI plugin configured in `nest-cli.json` — auto-annotates DTOs at build time
- 195 existing tests passing
- No DTO needed for this endpoint (no request body), so no `@ApiProperty` decorators needed

**From Story 2.5 (Batch and Profile Semantic Embedding):**
- `handleBatchAnswered()` at line ~950 in intake.service.ts — pattern for batch embedding
- `handleProfileGenerated()` at line ~1042 in intake.service.ts — pattern for profile embedding
- `formatBatchQAForEmbedding()` at line ~1099 in intake.service.ts — helper to format Q&A text
- Embedding insert pattern: `goal_context_embeddings` with `goal_id`, `user_id`, `content_type`, `batch_id`/`profile_id`, `content_text`, `embedding: JSON.stringify(embedding)`
- `embedded` flag updated on source table after successful insert
- Vector must be inserted as `JSON.stringify(embedding)` (Supabase JS client handles vector serialization)

**From Story 3.3 (Rate Limiting):**
- ThrottlerGuard is APP_GUARD (global) — admin endpoint automatically gets 60 req/min limit
- No need for tighter rate limiting on admin endpoint — it's not AI-calling (it calls AI internally, but the rate limit is about protecting endpoints from abuse)

### What NOT to build

- No AdminModule — use IntakeModule as specified in architecture doc
- No AdminGuard or role-based access control — AuthGuard is sufficient for MVP (2-person team)
- No new DTO — the endpoint has no request body
- No database migrations — all tables already exist
- No new configuration — no new settings needed in `app.config.ts`
- No batch processing limits or pagination — process all unembedded records in one call (for MVP, the number of failed embeddings should be small)
- No background/async processing — run synchronously in the request (failures are rare, and re-embedding should be fast)
- No caching of embedding results
- No user profile re-embedding (FR34 is deferred — user profile module not in scope)
- No custom error response format — use the standard `{ processed, succeeded, failed }` object

### Project Structure Notes

- `AdminController` lives in `src/intake/` alongside other intake controllers — NOT in a separate admin folder
- Route `POST /api/admin/reembed-missing` is independent of the `goals/:goalId/intake` route prefix
- All relative imports use `.js` extension (ESM with `nodenext`)
- Unit test file co-located: `admin.controller.spec.ts` next to `admin.controller.ts`
- New service method tests go in existing `intake.service.spec.ts` (no new test file for the service)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5 — Admin Re-Embedding Endpoint]
- [Source: _bmad-output/planning-artifacts/epics.md#FR Coverage Map — FR36 maps to Epic 3, Story 3.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Additional Requirements — "Admin reembed endpoint... add to IntakeModule when needed"]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakeService owns goal_context_embeddings]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — goal_context_embeddings owned by IntakeService (async)]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 4 — Admin/Ops: "Query intake_batches WHERE embedded = false to find missed embeddings. Hit admin reembed endpoint to recover."]
- [Source: _bmad-output/planning-artifacts/prd.md#FR36 — Admins can trigger re-embedding for entries that failed to embed]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR12 — Embedding failures tracked and recoverable without data loss]
- [Source: src/intake/intake.service.ts#handleBatchAnswered — Existing batch embedding event handler pattern]
- [Source: src/intake/intake.service.ts#handleProfileGenerated — Existing profile embedding event handler pattern]
- [Source: src/intake/intake.service.ts#formatBatchQAForEmbedding — Helper to format batch Q&A text for embedding]
- [Source: src/ai/ai.service.ts#generateEmbedding — AiService method: generates 1536-dim embedding via text-embedding-3-small]
- [Source: src/intake/intake.module.ts — Current module: controllers [IntakeController], providers [IntakeService, IntakePromptService, IntakeQualityService]]
- [Source: src/intake/admin.controller.ts — New file to create]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. Clean implementation with all tests passing on first run.

### Completion Notes List

- Created `AdminController` in `src/intake/admin.controller.ts` with `POST reembed-missing` endpoint, protected by `AuthGuard`, with Swagger decorators (`@ApiTags('Admin')`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`)
- Registered `AdminController` in `IntakeModule` controllers array
- Implemented `reembedMissing()` method in `IntakeService` — queries all `intake_batches` and `goal_profiles` with `embedded = false`, re-embeds each using existing `formatBatchQAForEmbedding()` + `AiService.generateEmbedding()`, inserts into `goal_context_embeddings`, updates `embedded = true`, with per-record error handling that continues on failure
- Added 6 unit tests for `reembedMissing()` covering: empty state, batch re-embedding, profile re-embedding, mixed records, failure continuation, and failure counting
- Added 2 AdminController unit tests: route delegation and AuthGuard metadata check
- All 203 tests pass (195 existing + 8 new), zero regressions, zero lint errors

### Implementation Plan

Reused established embedding patterns from `handleBatchAnswered()` and `handleProfileGenerated()` event listeners. The `reembedMissing()` method follows the same sequence (query → load data → format → embed → insert → update flag) but operates across all users via admin client and wraps each record in individual try/catch for fault tolerance.

### File List

**Created:**
- `src/intake/admin.controller.ts` — AdminController with `POST reembed-missing` endpoint
- `src/intake/admin.controller.spec.ts` — Unit tests for AdminController (2 tests)

**Modified:**
- `src/intake/intake.module.ts` — Added `AdminController` to controllers array
- `src/intake/intake.service.ts` — Added `reembedMissing()` public method (~130 lines)
- `src/intake/intake.service.spec.ts` — Added `reembedMissing` describe block with 6 tests

## Change Log

- 2026-02-12: Implemented Story 3.5 — Admin Re-Embedding Endpoint (FR36). Added `POST /api/admin/reembed-missing` endpoint with fault-tolerant batch/profile re-embedding. 8 new tests added (203 total).
