# Story 7.2: Retrieval Observability Logging

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Generated: 2026-02-23 | Epic 7: Generation Quality & Observability | Story 2 of 2 -->

## Story

As a **team member**,
I want per-chunk retrieval details logged for every context retrieval operation,
so that I can debug context quality issues and tune retrieval parameters.

## Acceptance Criteria

1. **Given** ContextPipelineService executes a retrieval operation
   **When** chunks are retrieved and reranked
   **Then** the system logs per-chunk details: source type (intake_answer, goal_profile, user_profile, weekly_summary, debrief_note), relevance score (HNSW similarity + rerank score), and selection decision (included/excluded) (FR52)

2. **Given** a fallback to raw HNSW results (rerank failure)
   **When** the retrieval completes
   **Then** logs indicate the fallback occurred and include HNSW scores only (no rerank scores)

3. **Given** a fallback to SQL context stuffing (HNSW failure)
   **When** the retrieval completes
   **Then** logs indicate the SQL fallback and list the context chunks assembled without relevance scoring

## Tasks / Subtasks

- [x] Task 1: Add retrieval metadata types (AC: #1-#3)
  - [x] 1.1 Create `RetrievalTier` type: `'hnsw_reranked' | 'hnsw_only' | 'sql_fallback'`
  - [x] 1.2 Create `ChunkRetrievalLog` interface: `{ chunk_id, content_type, similarity_score, rerank_score?, selected, exclusion_reason? }`
  - [x] 1.3 Create `RetrievalSummaryLog` interface: `{ goal_id, tier, total_candidates, selected_count, excluded_count, fallback_reason?, latency_ms }`
  - [x] 1.4 Add types to `src/roadmap/types/context.types.ts` (extend existing file)

- [x] Task 2: Modify `RerankService.rerank()` to return all candidates with selection metadata (AC: #1, #2)
  - [x] 2.1 Change return type from `RankedChunk[]` to `RerankResult` (new interface: `{ selected: RankedChunk[], allCandidates: RankedChunk[], rerankApplied: boolean }`)
  - [x] 2.2 On success: map ALL input chunks with rerank scores; mark top-N as selected, rest as excluded. Return both lists.
  - [x] 2.3 On fallback (Cohere failure / missing key): set `rerankApplied = false`, return all chunks as selected with `rerank_score: undefined`
  - [x] 2.4 Update all callers of `rerankService.rerank()` (only `ContextPipelineService.assembleContext()`)

- [x] Task 3: Enhance `ContextPipelineService` retrieval tracking and logging (AC: #1-#3)
  - [x] 3.1 Track retrieval tier: set `tier = 'hnsw_reranked'` on normal path, `'hnsw_only'` when rerank not applied, `'sql_fallback'` when HNSW fails
  - [x] 3.2 Capture `fallback_reason` string when a fallback occurs (from caught error message)
  - [x] 3.3 Track timing: record `Date.now()` at pipeline start, compute `latency_ms` at end
  - [x] 3.4 Replace existing `logRetrievalDetails(rankedChunks)` with enhanced `logRetrievalObservability(allCandidates, selectedChunks, tier, fallbackReason, goalId, latencyMs)`
  - [x] 3.5 Log each candidate chunk at `debug` level: `{ chunk_id, content_type, similarity_score, rerank_score, selected, exclusion_reason }`
  - [x] 3.6 Log retrieval summary at `log` level: `{ goal_id, tier, total_candidates, selected_count, excluded_count, fallback_reason, latency_ms }`
  - [x] 3.7 On SQL fallback: log all chunks with `similarity_score: null, rerank_score: null, selected: true` (no relevance scoring available)

- [x] Task 4: Unit tests (AC: #1-#3)
  - [x] 4.1 Update `src/roadmap/rerank.service.spec.ts`:
    - Happy path: returns `selected` (top-N) and `allCandidates` (all with scores), `rerankApplied: true`
    - Cohere failure: returns all as selected, `rerankApplied: false`
    - Missing API key: returns all as selected, `rerankApplied: false`
    - Empty chunks: returns empty arrays
  - [x] 4.2 Update `src/roadmap/context-pipeline.service.spec.ts`:
    - Normal path (HNSW + rerank): logs per-chunk details with both scores and selection decisions, summary with tier `hnsw_reranked`
    - Rerank fallback: logs per-chunk with HNSW scores only (no rerank), summary with tier `hnsw_only`
    - SQL fallback: logs chunks without scores, summary with tier `sql_fallback` and fallback_reason
    - Verify `logger.debug` called for each chunk
    - Verify `logger.log` called once for summary
    - Verify latency_ms is a positive number
  - [x] 4.3 Verify no regressions on existing tests (maintain 429+ passing)

## Dev Notes

### Critical Architecture Constraints

- **No new files needed** — all changes are modifications to existing `context-pipeline.service.ts`, `rerank.service.ts`, and `context.types.ts`. This is a logging enhancement, not a new feature.
- **No new endpoints, no new tables, no new migrations** — this story is purely internal observability.
- **No new npm packages** — use NestJS Logger exclusively.
- **NestJS Logger** — `private readonly logger = new Logger(ContextPipelineService.name)`. Already initialized in both services.
- **Log levels**: `debug` for per-chunk details (verbose, only visible when debug enabled), `log` for retrieval summary (always visible in production).
- **Supabase admin client** — `this.supabaseService.getAdminClient()` for all queries.
- **No barrel exports** — import directly from file paths with `.js` extension.
- **snake_case JSON** — all log field names use snake_case.
- **Never throw from logging code** — wrap logging in try/catch if complex, but simple Logger calls don't need it.

### Existing Code to Modify

**`src/roadmap/context-pipeline.service.ts`** (current `assembleContext` pipeline):
```
assembleContext(goalId, userId):
  → buildQueryText(goalId)                          // get narrative/goal text
  → aiService.generateEmbedding(queryText)          // embed query
  → retrieveChunks(queryEmbedding, goalId, userId)  // HNSW with SQL fallback
  → rerankService.rerank(queryText, chunks)          // Cohere with passthrough fallback
  → logRetrievalDetails(rankedChunks)                // CURRENT: debug log selected only
  → assemblePromptSections(rankedChunks)             // group by type into sections
```

The existing `logRetrievalDetails()` at line ~144 only logs selected chunks at `debug` level. It needs to be replaced with comprehensive observability that logs ALL candidates with selection decisions.

**`src/roadmap/rerank.service.ts`** (current `rerank` method):
- Returns `RankedChunk[]` — only the top-N selected chunks
- On Cohere failure: returns all input chunks with `rerank_score: undefined`
- Needs to return both selected AND excluded chunks with metadata

**`src/roadmap/types/context.types.ts`** (existing types):
```typescript
interface ContextChunk { id, content_text, content_type, similarity, metadata }
interface RankedChunk extends ContextChunk { rerank_score?: number }
interface AssembledContext { goalProfileSection, intakeSection, userProfileSection, progressSection, debriefSection, totalChunks }
```

### Implementation Strategy

**Step 1: Extend types** — Add `RetrievalTier`, `ChunkRetrievalLog`, `RetrievalSummaryLog`, and `RerankResult` to `context.types.ts`.

**Step 2: Modify `RerankService.rerank()`** — Change signature to return `RerankResult` instead of `RankedChunk[]`. On Cohere success: map ALL input chunks (not just top-N) with rerank scores from Cohere response, mark top-N as the `selected` array. On failure: return all as selected with `rerankApplied: false`.

Key detail: The Cohere API's `top_n` parameter already limits what it returns. To get scores for ALL candidates, either:
- **(Preferred)** Set `top_n` equal to `chunks.length` in the Cohere request to get scores for all, then slice to `appConfig.roadmap.rerankTopN` in our code. This gives us rerank scores for excluded chunks too.
- OR keep `top_n` as-is and mark chunks not in the Cohere response as excluded with no rerank score.

Choose Option A (request all scores from Cohere, slice locally) — gives better observability data.

**Step 3: Modify `ContextPipelineService.assembleContext()`**:
1. Record `startTime = Date.now()` at the top
2. Track `tier: RetrievalTier` and `fallbackReason: string | undefined`
3. After `retrieveChunks()`: if SQL fallback was used, set `tier = 'sql_fallback'`
4. After `rerankService.rerank()`: use `rerankResult.rerankApplied` to determine final tier
5. Replace `logRetrievalDetails()` with `logRetrievalObservability()` that takes all metadata
6. Continue passing only `selected` chunks to `assemblePromptSections()`

**Tracking the tier**: The current code doesn't surface which fallback was used. Options:
- Have `retrieveChunks()` return `{ chunks, usedSqlFallback: boolean, fallbackReason? }` instead of just `ContextChunk[]`
- OR use a class-level field — not ideal for concurrency
- OR use a result object pattern

Use the result object: `retrieveChunks()` returns `{ chunks: ContextChunk[], tier: 'hnsw' | 'sql_fallback', fallbackReason?: string }`.

### What the Logging Output Should Look Like

**Normal path (HNSW + Cohere rerank):**
```
[ContextPipelineService] DEBUG: {"chunk_id":"abc-123","content_type":"goal_profile","similarity_score":0.92,"rerank_score":0.87,"selected":true}
[ContextPipelineService] DEBUG: {"chunk_id":"def-456","content_type":"intake_answer","similarity_score":0.88,"rerank_score":0.82,"selected":true}
[ContextPipelineService] DEBUG: {"chunk_id":"ghi-789","content_type":"intake_answer","similarity_score":0.85,"rerank_score":0.31,"selected":false}
[ContextPipelineService] Retrieval complete: {"goal_id":"xyz","tier":"hnsw_reranked","total_candidates":20,"selected_count":10,"excluded_count":10,"latency_ms":1245}
```

**Rerank fallback (Cohere failed):**
```
[RerankService] WARN: Rerank failed, using raw HNSW results: Cohere API error: 503
[ContextPipelineService] DEBUG: {"chunk_id":"abc-123","content_type":"goal_profile","similarity_score":0.92,"rerank_score":null,"selected":true}
[ContextPipelineService] Retrieval complete: {"goal_id":"xyz","tier":"hnsw_only","total_candidates":20,"selected_count":20,"excluded_count":0,"fallback_reason":"Cohere API error: 503","latency_ms":890}
```

**SQL fallback (HNSW failed):**
```
[ContextPipelineService] WARN: HNSW retrieval failed, falling back to SQL context stuffing: ...
[ContextPipelineService] DEBUG: {"chunk_id":"abc-123","content_type":"goal_profile","similarity_score":null,"rerank_score":null,"selected":true}
[ContextPipelineService] Retrieval complete: {"goal_id":"xyz","tier":"sql_fallback","total_candidates":15,"selected_count":15,"excluded_count":0,"fallback_reason":"HNSW search error: connection timeout","latency_ms":450}
```

### RerankService Change Detail

Current `rerank()` signature:
```typescript
async rerank(query: string, chunks: ContextChunk[]): Promise<RankedChunk[]>
```

New signature:
```typescript
async rerank(query: string, chunks: ContextChunk[]): Promise<RerankResult>
```

Where:
```typescript
interface RerankResult {
  selected: RankedChunk[];
  allCandidates: RankedChunk[];
  rerankApplied: boolean;
}
```

On Cohere success:
- Request reranking for ALL chunks (set `top_n: chunks.length`)
- Map all chunks with their rerank scores
- Sort by rerank_score descending
- `selected` = first `appConfig.roadmap.rerankTopN` items
- `allCandidates` = all items with scores
- `rerankApplied = true`

On Cohere failure / missing key:
- `selected` = all input chunks with `rerank_score: undefined`
- `allCandidates` = same as selected
- `rerankApplied = false`

### ContextPipelineService Change Detail

Current `retrieveChunks()` returns `ContextChunk[]`.

New return: `{ chunks: ContextChunk[], usedSqlFallback: boolean, fallbackReason?: string }`

In `assembleContext()`:
```typescript
const startTime = Date.now();
const queryText = await this.buildQueryText(goalId);
const queryEmbedding = await this.aiService.generateEmbedding(queryText);
const retrieval = await this.retrieveChunks(queryEmbedding, goalId, userId);
const rerankResult = await this.rerankService.rerank(queryText, retrieval.chunks);

// Determine tier
let tier: RetrievalTier;
let fallbackReason: string | undefined;
if (retrieval.usedSqlFallback) {
  tier = 'sql_fallback';
  fallbackReason = retrieval.fallbackReason;
} else if (rerankResult.rerankApplied) {
  tier = 'hnsw_reranked';
} else {
  tier = 'hnsw_only';
}

// Log observability
this.logRetrievalObservability(
  rerankResult.allCandidates,
  rerankResult.selected,
  tier,
  fallbackReason,
  goalId,
  Date.now() - startTime,
);

return this.assemblePromptSections(rerankResult.selected);
```

### Project Structure Notes

- Modified files:
  - `src/roadmap/types/context.types.ts` — Add `RetrievalTier`, `ChunkRetrievalLog`, `RetrievalSummaryLog`, `RerankResult` types
  - `src/roadmap/rerank.service.ts` — Change `rerank()` return type to `RerankResult`, request all scores from Cohere
  - `src/roadmap/context-pipeline.service.ts` — Enhance `retrieveChunks()` return type, replace `logRetrievalDetails()` with `logRetrievalObservability()`, add timing tracking
  - `src/roadmap/rerank.service.spec.ts` — Update tests for new return type
  - `src/roadmap/context-pipeline.service.spec.ts` — Update tests for enhanced logging and new return types

### What NOT to Do

- Do NOT create new files — this is all modifications to existing code
- Do NOT create new endpoints — this is internal observability only
- Do NOT create database tables or migrations — logging goes to stdout via NestJS Logger
- Do NOT modify `roadmap.service.ts`, `check-in.service.ts`, `generation.service.ts`, or `quality.service.ts` — they don't call the context pipeline directly in ways that need changing
- Do NOT store retrieval logs in the database — use NestJS Logger to stdout only
- Do NOT add a separate logging service — use the existing Logger on ContextPipelineService
- Do NOT change the `AssembledContext` return type — downstream consumers are unaffected
- Do NOT break the existing pipeline behavior — this is purely additive logging
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT create barrel exports (`index.ts`)
- Do NOT forget `.js` extensions on all relative imports
- Do NOT install new npm packages
- Do NOT log content_text (it may be large) — only log IDs, types, and scores

### Previous Story Intelligence

**From Story 7.1 (Per-Type Quality Evaluation — done):**
- QualityService implemented with 3 async event listeners, 24 unit tests
- `appConfig.eval` config added for judge model settings
- 429 total tests passing baseline — maintain this
- Follows try/catch pattern for all event listeners — QualityService never throws
- Types placed in `src/roadmap/types/quality.types.ts` — follow same placement pattern

**From Story 4.2 (Context Retrieval Pipeline — done):**
- ContextPipelineService and RerankService created with the current code
- Three-tier fallback pattern established: rerank failure → raw HNSW, HNSW failure → SQL stuffing
- `logRetrievalDetails()` was a minimal debug-level implementation intended to be enhanced in this story
- `RerankService` uses direct fetch to Cohere API with 10s timeout
- `match_goal_context` RPC function provides HNSW filtered search

**From Story 6.2 (Generate Daily Objectives — done):**
- ContextPipelineService.assembleContext() is called from CheckInService for daily objective generation
- The return type `AssembledContext` must not change — only internal pipeline behavior changes

### Git Intelligence

Recent commits follow `feat(roadmap): description` format. This story should produce:
```
feat(roadmap): add per-chunk retrieval observability logging to context pipeline
```

Last 5 commits:
- `d8a917b feat(roadmap): implement per-type async quality evaluation via LLM-as-judge`
- `78d8f4c feat(roadmap): implement end-of-day debrief submission and embedding`
- `d6cc2b5 feat(roadmap): implement energy-calibrated daily objective generation and tracking`
- `53374fa feat(roadmap): implement weekly and monthly summary generation and embedding`
- `a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle`

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 7.2]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR52]
- [Source: _bmad-output/planning-artifacts/architecture.md#Quality Monitoring (FR46-53)] (line 700)
- [Source: _bmad-output/planning-artifacts/architecture.md#Pipeline Orchestration Pattern — FR52 observability note] (line 976)
- [Source: _bmad-output/planning-artifacts/architecture.md#Three-Tier Context Fallback Pattern] (line 978)
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — ContextPipelineService, RerankService] (line 819-820)
- [Source: _bmad-output/planning-artifacts/architecture.md#Logging pattern — NestJS Logger] (line 307-309)
- [Source: src/roadmap/context-pipeline.service.ts#assembleContext — current pipeline flow]
- [Source: src/roadmap/context-pipeline.service.ts#logRetrievalDetails — current minimal logging]
- [Source: src/roadmap/rerank.service.ts#rerank — Cohere API integration]
- [Source: src/roadmap/types/context.types.ts#ContextChunk, RankedChunk, AssembledContext]
- [Source: _bmad-output/implementation-artifacts/7-1-per-type-quality-evaluation.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/4-2-context-retrieval-pipeline.md]

## Change Log

- 2026-02-23: Implemented per-chunk retrieval observability logging across context pipeline — all 4 tasks completed, 433 tests passing (5 new tests added from 429 baseline, minus 1 consolidated = net +4)
- 2026-02-23: Code review fixes — added exclusion_reason to per-chunk logs, added failureReason to RerankResult for hnsw_only fallback_reason propagation, typed log objects with ChunkRetrievalLog/RetrievalSummaryLog, forced rerank_score null on sql_fallback tier, added edge case test. 434 tests passing

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All implementations followed the story Dev Notes strategy exactly.

### Completion Notes List

- **Task 1**: Added `RetrievalTier`, `ChunkRetrievalLog`, `RetrievalSummaryLog`, and `RerankResult` types to `context.types.ts`
- **Task 2**: Changed `RerankService.rerank()` return type from `RankedChunk[]` to `RerankResult`. Now requests all scores from Cohere (`top_n: chunks.length`), sorts by relevance, and slices to `rerankTopN` locally. On failure/missing key, returns all as selected with `rerankApplied: false`
- **Task 3**: Enhanced `ContextPipelineService` — `retrieveChunks()` now returns `{ chunks, usedSqlFallback, fallbackReason }`. Added timing tracking (`startTime`/`latency_ms`), tier determination logic, and replaced `logRetrievalDetails()` with `logRetrievalObservability()` that logs per-chunk details at `debug` level and summary at `log` level with snake_case JSON fields
- **Task 4**: Updated both spec files — 7 tests in `rerank.service.spec.ts` (all updated for RerankResult), 13 tests in `context-pipeline.service.spec.ts` (8 existing updated + 5 new observability tests). 433 total tests passing, zero regressions

### File List

- `src/roadmap/types/context.types.ts` (modified) — Added RetrievalTier, ChunkRetrievalLog, RetrievalSummaryLog, RerankResult types
- `src/roadmap/rerank.service.ts` (modified) — Changed rerank() return type to RerankResult, request all scores from Cohere
- `src/roadmap/context-pipeline.service.ts` (modified) — Enhanced retrieveChunks() return, replaced logRetrievalDetails with logRetrievalObservability, added timing
- `src/roadmap/rerank.service.spec.ts` (modified) — Updated all tests for RerankResult return type
- `src/roadmap/context-pipeline.service.spec.ts` (modified) — Updated existing tests + added 5 new observability logging tests
