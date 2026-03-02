# Story 4.2: Context Retrieval Pipeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-22 -->

## Story

As a **developer**,
I want a three-tier context retrieval pipeline that assembles relevant context for any generation type,
So that milestone, weekly plan, and daily objective generation all receive high-quality, personalized context.

## Acceptance Criteria

1. **Given** a generation request for a specific goal **When** ContextPipelineService retrieves context **Then** it embeds the query via AiService, calls the `match_goal_context` Supabase RPC function for HNSW filtered search by goal_id and user_id, and returns top-K candidates (FR4) **And** the pipeline uses `appConfig.roadmap.matchCount` and `appConfig.roadmap.matchThreshold` for retrieval parameters

2. **Given** HNSW results are returned **When** RerankService is called **Then** it reranks chunks via direct HTTP POST to Cohere Rerank API (`https://api.cohere.com/v2/rerank`) and returns the top-N most relevant chunks (FR5) **And** it uses `appConfig.roadmap.rerankTopN` for the number of results **And** it uses `appConfig.cohere.model` (`rerank-v3.5`) and `appConfig.cohere.apiVersion` (`2`)

3. **Given** the Cohere Rerank API is unavailable or fails **When** RerankService catches the error **Then** it falls back to returning raw HNSW results unranked (FR6) **And** it logs a warning with the original error message

4. **Given** HNSW vector search fails entirely **When** ContextPipelineService catches the error **Then** it falls back to direct SQL context assembly — fetching all intake data and goal profile for the goal without relevance filtering (FR7) **And** it logs a warning with the original error message

5. **Given** reranked (or fallback) context chunks are available **When** ContextPipelineService assembles the context **Then** it produces a structured object with labeled sections: `goalProfileSection`, `intakeSection`, `userProfileSection`, `progressSection`, `debriefSection` (FR8) **And** cross-goal user profile data (`goal_id IS NULL`) is included via the `match_goal_context` RPC compound query (FR10) **And** `totalChunks` count is tracked for metadata logging

6. **Given** both HNSW and SQL fallback fail **When** the pipeline catches the error **Then** it throws an error — generation is blocked (no context available)

7. **Given** all new services **When** the test suite runs **Then** ContextPipelineService and RerankService have comprehensive unit tests covering success paths and all fallback tiers **And** all existing 232 tests continue to pass with zero regressions

## Tasks / Subtasks

- [x] Task 1: Create type definitions (AC: #5)
  - [x] 1.1 Create `src/roadmap/types/context.types.ts` with `ContextChunk`, `RankedChunk`, `AssembledContext` interfaces
  - [x] 1.2 `ContextChunk`: `{ id: string, content_text: string, content_type: string, similarity: number, metadata: Record<string, unknown> }`
  - [x] 1.3 `RankedChunk`: extends `ContextChunk` with `rerank_score?: number`
  - [x] 1.4 `AssembledContext`: `{ goalProfileSection: string, intakeSection: string, userProfileSection: string, progressSection: string, debriefSection: string, totalChunks: number }`

- [x] Task 2: Implement RerankService (AC: #2, #3)
  - [x] 2.1 Create `src/roadmap/rerank.service.ts` as `@Injectable()` NestJS service
  - [x] 2.2 Inject `ConfigService` (for `COHERE_API_KEY`) and use `appConfig.cohere` for non-secret config
  - [x] 2.3 Implement `rerank(query: string, chunks: ContextChunk[]): Promise<RankedChunk[]>` method
  - [x] 2.4 HTTP POST to `https://api.cohere.com/v2/rerank` with `fetch()` — headers: `Authorization: Bearer ${cohereApiKey}`, `Content-Type: application/json`
  - [x] 2.5 Request body: `{ model: appConfig.cohere.model, query, documents: chunks.map(c => c.content_text), top_n: appConfig.roadmap.rerankTopN, return_documents: false }`
  - [x] 2.6 Map Cohere response `results[].index` back to original chunks, add `rerank_score` from `results[].relevance_score`
  - [x] 2.7 On ANY error (network, 4xx, 5xx, timeout): log `warn`, return original chunks as-is (Tier 1 fallback)
  - [x] 2.8 Use `AbortController` with 10-second timeout for the fetch call
  - [x] 2.9 Handle empty chunks input: return empty array immediately (no API call)

- [x] Task 3: Implement ContextPipelineService (AC: #1, #4, #5, #6)
  - [x] 3.1 Create `src/roadmap/context-pipeline.service.ts` as `@Injectable()` NestJS service
  - [x] 3.2 Inject `AiService`, `SupabaseService`, `RerankService`
  - [x] 3.3 Implement `assembleContext(goalId: string, userId: string): Promise<AssembledContext>` as the main orchestrator method
  - [x] 3.4 Step 1 — Build query: fetch goal profile from `goal_profiles` table (narrative_summary), use it as query text for embedding
  - [x] 3.5 Step 2 — Embed query: call `aiService.generateEmbedding(queryText)` to get query vector
  - [x] 3.6 Step 3 — HNSW retrieval: call Supabase RPC `match_goal_context` with `{ query_embedding: queryEmbedding, p_goal_id: goalId, p_user_id: userId, match_threshold: appConfig.roadmap.matchThreshold, match_count: appConfig.roadmap.matchCount }`
  - [x] 3.7 Step 3 Tier 2 fallback — If HNSW fails, fall back to `sqlContextStuffing(goalId, userId)`: direct SQL SELECT from `context_embeddings` WHERE `user_id = userId AND (goal_id = goalId OR goal_id IS NULL)` ordered by `created_at DESC`
  - [x] 3.8 Step 4 — Rerank: call `rerankService.rerank(queryText, chunks)`
  - [x] 3.9 Step 5 — Log per-chunk retrieval details at `debug` level: `{ chunkId, contentType, similarityScore, rerankScore, selected: boolean }` (FR52 observability)
  - [x] 3.10 Step 6 — Assemble prompt sections: group chunks by `content_type` into labeled sections
  - [x] 3.11 Tier 3 — If both HNSW and SQL fallback fail, throw error (generation blocked)
  - [x] 3.12 Handle edge case: no goal profile found — use goal title/description as query text fallback

- [x] Task 4: Create RoadmapModule (minimal) (AC: #7)
  - [x] 4.1 Create `src/roadmap/roadmap.module.ts` — provide ContextPipelineService, RerankService
  - [x] 4.2 Import in `src/app.module.ts`

- [x] Task 5: Write unit tests (AC: #7)
  - [x] 5.1 Create `src/roadmap/rerank.service.spec.ts`:
    - Test successful rerank with Cohere API response mapping
    - Test Tier 1 fallback (Cohere unavailable → return raw chunks)
    - Test Tier 1 fallback (Cohere returns error status → return raw chunks)
    - Test timeout handling (AbortController triggers → return raw chunks)
    - Test empty chunks input (returns empty array, no API call)
    - Test correct request body shape (model, query, documents, top_n, return_documents)
  - [x] 5.2 Create `src/roadmap/context-pipeline.service.spec.ts`:
    - Test full happy path (embed → HNSW → rerank → assemble)
    - Test Tier 2 fallback (HNSW fails → SQL context stuffing → rerank → assemble)
    - Test Tier 3 failure (HNSW + SQL both fail → throws error)
    - Test context assembly groups chunks correctly by content_type into labeled sections
    - Test cross-goal retrieval (goal_id IS NULL chunks included via RPC)
    - Test empty results (no embeddings found → returns empty sections)
    - Test query text fallback when no goal profile exists
  - [x] 5.3 Run full test suite: all 232 existing tests + new tests pass

## Dev Notes

### Developer Context

**What this story builds:** The context retrieval pipeline — the shared infrastructure that all generation types (milestones, weekly plans, daily objectives) will use to get relevant, personalized context for AI prompts. This is the critical path between stored embeddings and generation quality.

**This story creates 2 new services in what will become RoadmapModule:**
- `ContextPipelineService` — orchestrates: embed query → HNSW retrieve → rerank → assemble prompt sections
- `RerankService` — wraps the Cohere Rerank API with graceful fallback

**Story 4.1 already set up the foundation:**
- `context_embeddings` table (renamed from `goal_context_embeddings`) with HNSW index
- `match_goal_context` RPC function for vector similarity search
- `appConfig.roadmap` (matchCount, matchThreshold, rerankTopN) and `appConfig.cohere` (apiVersion, model)
- `COHERE_API_KEY` in `.env.example`

**No new database tables needed.** This story only reads from existing `context_embeddings` (via RPC) and `goal_profiles` (for query text).

**No new endpoints.** The pipeline is internal — consumed by GenerationService (Story 4.3) and CheckInService (Story 5+).

### Technical Requirements

**ContextPipelineService — orchestration pattern:**

```typescript
// The sole orchestrator for context retrieval
async assembleContext(goalId: string, userId: string): Promise<AssembledContext> {
  // Step 1: Build query from goal profile narrative
  const queryText = await this.buildQueryText(goalId);
  const queryEmbedding = await this.aiService.generateEmbedding(queryText);

  // Step 2: Retrieve candidates via HNSW (Tier 2 fallback inside)
  let chunks = await this.retrieveFromHnsw(queryEmbedding, goalId, userId);

  // Step 3: Rerank (Tier 1 fallback inside RerankService)
  const rankedChunks = await this.rerankService.rerank(queryText, chunks);

  // Step 4: Log retrieval details (FR52)
  this.logRetrievalDetails(rankedChunks);

  // Step 5: Assemble into prompt sections
  return this.assemblePromptSections(rankedChunks);
}
```

**RerankService — Cohere Rerank API integration:**

```typescript
// Direct HTTP POST — no SDK
async rerank(query: string, chunks: ContextChunk[]): Promise<RankedChunk[]> {
  if (chunks.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch('https://api.cohere.com/v2/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: appConfig.cohere.model,
        query,
        documents: chunks.map(c => c.content_text),
        top_n: appConfig.roadmap.rerankTopN,
        return_documents: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Cohere API error: ${response.status}`);
    const result = await response.json();

    return result.results.map((r: { index: number; relevance_score: number }) => ({
      ...chunks[r.index],
      rerank_score: r.relevance_score,
    }));
  } catch (error) {
    this.logger.warn(`Rerank failed, using raw HNSW results: ${error.message}`);
    return chunks.map(c => ({ ...c, rerank_score: undefined }));
  } finally {
    clearTimeout(timeout);
  }
}
```

**HNSW retrieval via Supabase RPC:**

```typescript
// Call the match_goal_context function created in Story 4.1
const { data, error } = await supabase.rpc('match_goal_context', {
  query_embedding: JSON.stringify(queryEmbedding),
  p_goal_id: goalId,
  p_user_id: userId,
  p_content_types: null,  // retrieve all types
  match_threshold: appConfig.roadmap.matchThreshold,
  match_count: appConfig.roadmap.matchCount,
});
```

**SQL Context Stuffing fallback (Tier 2):**

```typescript
// Fallback when HNSW fails — fetch all context for the goal without relevance filtering
private async sqlContextStuffing(goalId: string, userId: string): Promise<ContextChunk[]> {
  const { data, error } = await supabase
    .from('context_embeddings')
    .select('id, content_text, content_type, metadata')
    .eq('user_id', userId)
    .or(`goal_id.eq.${goalId},goal_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) throw error; // Tier 3 — hard failure

  return (data || []).map(row => ({
    ...row,
    similarity: 0, // no similarity score in SQL fallback
    metadata: row.metadata || {},
  }));
}
```

**Context assembly — group chunks by content_type:**

```typescript
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

**Query text construction:**

```typescript
private async buildQueryText(goalId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('goal_profiles')
    .select('narrative_summary')
    .eq('goal_id', goalId)
    .single();

  if (profile?.narrative_summary) return profile.narrative_summary;

  // Fallback: use goal title and description
  const { data: goal } = await supabase
    .from('goals')
    .select('title, description')
    .eq('id', goalId)
    .single();

  return `${goal?.title || ''} ${goal?.description || ''}`.trim();
}
```

### Architecture Compliance

**Module placement:** New `src/roadmap/` directory. `RoadmapModule` is NOT `@Global()` — it must be imported explicitly by any module that needs it (none currently — it's consumed within itself by Story 4.3+).

**Service boundaries:**
- `ContextPipelineService` is the sole orchestrator — no service calls another pipeline service directly
- `RerankService` is called only by `ContextPipelineService` — never by other services
- Each pipeline step returns a typed result, not raw Supabase/API responses
- Fallback logic lives inside each step, not in the orchestrator

**Three-tier degradation chain:**
- Tier 1 (rerank failure → raw HNSW): inside `RerankService.rerank()` — quality degradation, transparent to caller
- Tier 2 (HNSW failure → SQL context stuffing): inside `ContextPipelineService.retrieveFromHnsw()` — mode switch, same return type
- Tier 3 (SQL failure → hard error): throws — caller catches and handles failure state

**Naming patterns:**
- Files: `kebab-case.ts` (`context-pipeline.service.ts`, `rerank.service.ts`)
- Classes: `PascalCase` (`ContextPipelineService`, `RerankService`)
- Methods: `camelCase` (`assembleContext`, `rerank`, `buildQueryText`)
- All imports use `.js` extension

**Logging pattern:**
- `private readonly logger = new Logger(ContextPipelineService.name)`
- `warn` for fallbacks with original error message
- `debug` for per-chunk retrieval details (FR52)
- Never log sensitive data

**Config pattern:**
- `COHERE_API_KEY` from `ConfigService.get('COHERE_API_KEY')` (secret via `.env`)
- `appConfig.roadmap.*` and `appConfig.cohere.*` imported directly (non-sensitive, version controlled)

**Cohere integration:**
- Direct `fetch()` to `https://api.cohere.com/v2/rerank`
- Do NOT install `cohere-ai` package
- Local TypeScript interfaces for request/response typing

**RLS:** This story only reads from tables. The `match_goal_context` RPC uses SECURITY INVOKER (runs with caller's permissions). Admin client is used server-side, with `user_id` filtering enforced in the RPC function parameters.

### Library & Framework Requirements

**No new packages to install.** All dependencies exist:
- `@supabase/supabase-js` — admin client for RPC calls + SQL queries
- `openai` (via AiService) — embedding generation
- `@nestjs/config` — for `COHERE_API_KEY` from `.env`
- Built-in `fetch` — for Cohere Rerank API (Node.js 18+ native fetch)

**External API used but NOT via SDK:**
- **Cohere Rerank API v2** — `POST https://api.cohere.com/v2/rerank`
  - Auth: `Authorization: Bearer <COHERE_API_KEY>`
  - Model: `rerank-v3.5`
  - Request: `{ model, query, documents: string[], top_n, return_documents: false }`
  - Response: `{ results: [{ index: number, relevance_score: number }] }`

### File Structure Requirements

**Files to CREATE:**

- `src/roadmap/roadmap.module.ts` — Minimal module providing ContextPipelineService, RerankService
- `src/roadmap/context-pipeline.service.ts` — Pipeline orchestrator
- `src/roadmap/context-pipeline.service.spec.ts` — Unit tests
- `src/roadmap/rerank.service.ts` — Cohere Rerank wrapper
- `src/roadmap/rerank.service.spec.ts` — Unit tests
- `src/roadmap/types/context.types.ts` — ContextChunk, RankedChunk, AssembledContext interfaces

**Files to MODIFY:**

- `src/app.module.ts` — Add `RoadmapModule` import

**Files NOT to touch:**

- `src/ai/ai.service.ts` — `generateEmbedding()` unchanged
- `src/supabase/supabase.service.ts` — No changes
- `src/intake/` — No changes (embedding pipeline untouched)
- `src/goal/` — No changes
- `src/config/app.config.ts` — Already has `roadmap` and `cohere` config (Story 4.1)
- `.env.example` — Already has `COHERE_API_KEY` (Story 4.1)

**Files NOT to create:**

- No new controller — no new endpoints in this story
- No new DTOs — no HTTP input validation needed
- No new migration — uses existing `context_embeddings` table + `match_goal_context` RPC
- No `generation.service.ts`, `quality.service.ts`, `check-in.service.ts` — those come in Story 4.3+
- No `roadmap.service.ts` — that comes in Story 4.3
- No `roadmap.controller.ts` — that comes in Story 4.3

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**New test files to create:**

`src/roadmap/rerank.service.spec.ts`:
- Mock `ConfigService` to provide `COHERE_API_KEY`
- Mock `global.fetch` for Cohere API calls
- Test: Successful rerank — response maps indices back to chunks correctly, adds `rerank_score`
- Test: Cohere returns non-200 — falls back to raw chunks, logs warn
- Test: Cohere network error — falls back to raw chunks, logs warn
- Test: Cohere timeout (AbortController) — falls back to raw chunks, logs warn
- Test: Empty chunks input — returns empty array, no fetch call made
- Test: Correct request body — model, query, documents array, top_n from config, return_documents: false

`src/roadmap/context-pipeline.service.spec.ts`:
- Mock `AiService.generateEmbedding()` to return a fake vector
- Mock `SupabaseService.getAdminClient()` with chained `.rpc()` and `.from()` mocks
- Mock `RerankService.rerank()` to return reranked chunks
- Test: Full happy path — embed query → HNSW → rerank → assemble → returns AssembledContext with all 5 sections
- Test: HNSW returns chunks of different content_types → assembly groups them correctly into labeled sections
- Test: Tier 2 fallback — HNSW RPC fails → SQL context stuffing succeeds → rerank → assemble
- Test: Tier 3 — both HNSW and SQL fail → throws error
- Test: Cross-goal chunks — includes chunks with `goal_id IS NULL` (user_profile content type)
- Test: No embeddings found — returns empty strings for all sections, totalChunks: 0
- Test: No goal profile → falls back to goal title+description for query text
- Test: Per-chunk retrieval logging at debug level

**Existing test count:** 232 tests. All must pass after changes.

**Mock patterns (from existing codebase):**
```typescript
// Supabase mock pattern (established in intake.service.spec.ts)
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn(),
        or: jest.fn().mockReturnValue({
          order: jest.fn(),
        }),
      }),
    }),
  }),
};
```

### Previous Story Intelligence

**From Story 4.1 (Embedding Table Migration & Configuration) — just completed:**
- 232 tests passing (updated from 203 after adding config + updating mocks)
- `context_embeddings` table is live with HNSW index and 2 existing rows (intake_answer, goal_profile)
- `match_goal_context` RPC function deployed with parameters: `query_embedding vector(1536), p_goal_id uuid, p_user_id uuid, p_content_types text[], match_threshold float, match_count int`
- `appConfig.roadmap`: `{ matchCount: 20, matchThreshold: 0.7, rerankTopN: 10, milestoneModel: 'default', weeklyModel: 'default', dailyModel: 'default', maxGenerationAttempts: 3, generationTimeoutMs: 30_000, weeklyPlanTimeoutMs: 15_000, dailyObjectiveTimeoutMs: 10_000 }`
- `appConfig.cohere`: `{ apiVersion: '2', model: 'rerank-v3.5' }`
- `COHERE_API_KEY` in `.env.example`
- Current default AI model: `google/gemini-3-flash-preview`
- Embedding model: `text-embedding-3-small` (1536 dimensions)
- Embedding stored as `JSON.stringify(embedding)` in database

**Code review findings (4.1):**
- Migration sprawl (5 migrations for 2-migration job) — be surgical with migrations
- COHERE_API_KEY not actively read by code yet — this story will be the first to read it
- All constraint names now use `context_embeddings_*` prefix (cleaned up)

**AiService API:**
- `generateEmbedding(text: string): Promise<number[]>` — returns raw number array
- `generateJSON<T>(system: string, user: string, model?: string): Promise<T>` — parses JSON from LLM

**Supabase client pattern:**
- `this.supabaseService.getAdminClient()` returns `SupabaseClient`
- RPC calls: `supabase.rpc('function_name', { params })`
- Query chains: `supabase.from('table').select('...').eq('col', val)`

### Git Intelligence

Recent commits (last 10):
```
935fa65 refactor(embeddings): unify context storage and apply code review fixes
110e922 feat(embeddings): unify context storage and add roadmap configuration
71cdcbf feat(roadmap): implement adaptive incremental planning pipeline
694cb6e feat(intake): refine dimension coverage and thread prior answers
82020a5 feat(intake): use explicit effort level in AI model calls
8b93d41 feat(intake): inject target deadline context for pacing AI decisions
db532c7 feat(config): update default AI model and evaluation settings
2adea5a chore(deps): align dev dependencies to consistent version range
69cb8d9 chore(deps): align package versions for build consistency
55784d6 feat(questionnaire)
```

**Patterns observed:**
- Commit format: `type(scope): description`
- Scope for this story would be: `roadmap` or `context`
- Recent work focused on embedding unification (4.1) and intake quality refinement

### What NOT to Build

- No RoadmapController — no endpoints in this story
- No RoadmapService — milestone orchestration comes in Story 4.3
- No GenerationService — prompt assembly + LLM calls come in Story 4.3
- No QualityService — async quality scoring comes in Story 4.3+
- No CheckInService — check-in/debrief CRUD comes in later stories
- No new database tables — roadmaps, milestones tables come in Story 4.3
- No new migrations — Story 4.1 already created context_embeddings + match_goal_context RPC
- No Swagger decorators — no controller endpoints
- No event emitters or listeners — pipeline is synchronous, consumed by callers
- Do NOT install `cohere-ai` npm package — use direct `fetch()`
- Do NOT add new types to `src/config/questions.config.ts` — context types go in `src/roadmap/types/`
- Do NOT create a `src/roadmap/dto/` folder — no DTOs needed

### Project Structure Notes

- New `src/roadmap/` directory follows existing module convention (co-located service + spec)
- `src/roadmap/types/` subfolder for shared type definitions (same pattern as dto/ subfolders)
- `RoadmapModule` registered in `app.module.ts` alongside existing modules
- All relative imports use `.js` extension
- No barrel exports (`index.ts`) — import directly from files

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 4.2 — Context Retrieval Pipeline acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR4-FR8, FR10 map to Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — ContextPipelineService and RerankService responsibilities]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pipeline Orchestration Pattern — assembleContext flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Three-Tier Context Fallback Pattern — Tier 1/2/3 implementation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Context Assembly Format — assemblePromptSections with 5 labeled sections]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cohere Integration — direct HTTP via fetch, no SDK]
- [Source: _bmad-output/planning-artifacts/architecture.md#Supabase RPC Function — match_goal_context SQL]
- [Source: _bmad-output/planning-artifacts/architecture.md#Updated Configuration — appConfig.roadmap and appConfig.cohere]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines — Cohere via fetch, pipeline orchestration rules]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#FR4-FR8, FR10 — Context retrieval pipeline requirements]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#NFR2 — Context retrieval p95 < 2 seconds]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#NFR8 — Context retrieval scoped by user_id]
- [Source: _bmad-output/implementation-artifacts/4-1-embedding-table-migration-and-configuration.md — Previous story: match_goal_context RPC, appConfig.roadmap, appConfig.cohere]
- [Source: src/ai/ai.service.ts — generateEmbedding(text: string): Promise<number[]>]
- [Source: src/supabase/supabase.service.ts — getAdminClient(): SupabaseClient]
- [Source: src/config/app.config.ts — appConfig.roadmap and appConfig.cohere values]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — no debug issues encountered.

### Completion Notes List

- **Task 1:** Created type definitions (`ContextChunk`, `RankedChunk`, `AssembledContext`) in `src/roadmap/types/context.types.ts`
- **Task 2:** Implemented `RerankService` with Cohere Rerank API v2 integration via `fetch()`, 10s timeout via AbortController, graceful fallback to raw HNSW chunks on any error
- **Task 3:** Implemented `ContextPipelineService` as the sole context retrieval orchestrator. Three-tier degradation: HNSW vector search → SQL context stuffing → hard error. Query built from goal profile narrative with fallback to goal title+description. Assembly groups chunks by `content_type` into 5 labeled sections. Debug-level per-chunk logging for FR52 observability.
- **Task 4:** Created `RoadmapModule` (non-global), registered in `AppModule`
- **Task 5:** 16 new unit tests (7 for RerankService, 9 for ContextPipelineService) covering happy paths, all 3 fallback tiers, cross-goal retrieval, empty results, query text fallback, debug logging, warn logging verification, missing API key handling, and empty query text guard. Full suite: 248 tests passing (232 existing + 16 new), 0 regressions.

### File List

**Created:**
- `src/roadmap/types/context.types.ts`
- `src/roadmap/rerank.service.ts`
- `src/roadmap/rerank.service.spec.ts`
- `src/roadmap/context-pipeline.service.ts`
- `src/roadmap/context-pipeline.service.spec.ts`
- `src/roadmap/roadmap.module.ts`

**Modified:**
- `src/app.module.ts` — Added `RoadmapModule` import

## Change Log

- 2026-02-22: Implemented context retrieval pipeline (Story 4.2) — created ContextPipelineService and RerankService with three-tier degradation chain, 14 new unit tests, all 246 tests passing
- 2026-02-22: Code review fixes (7 issues fixed) — added FR52 `selected` field to logging, added within-section sorting by rerank score, changed COHERE_API_KEY to graceful fallback when missing, added empty query text guard, used appConfig.cohere.apiVersion in URL construction, added warn logging assertions to fallback tests, added SQL filter parameter assertions, added 2 new tests (missing API key, empty query text). Full suite: 248 tests passing.
