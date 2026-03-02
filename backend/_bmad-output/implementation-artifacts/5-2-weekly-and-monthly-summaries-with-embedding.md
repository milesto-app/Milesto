# Story 5.2: Weekly & Monthly Summaries with Embedding

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-22 -->

## Story

As a **user**,
I want the system to automatically summarize my progress each week and month,
So that future plans are informed by what actually happened — not just what was planned.

## Acceptance Criteria

1. **Given** a weekly plan is being completed (auto-transition to `completed`) **When** the next weekly plan is requested **Then** the system generates a weekly summary from: daily objective completion counts, debrief notes from that week, and energy level distribution (FR23) **And** the summary includes both computed data (completion rate, objective counts, debrief count) and an optional LLM narrative when debriefs exist **And** the summary is stored on the weekly plan record

2. **Given** the first weekly plan of a new milestone-month is requested **When** previous weekly summaries exist for the prior month **Then** the system generates a monthly summary from the weekly summaries of that month (FR24) **And** the monthly summary is stored on the milestone record

3. **Given** a weekly summary or monthly summary is generated **When** the summary is stored **Then** the summary text is embedded into `context_embeddings` with `content_type = 'weekly_summary'` via AiService for future retrieval (FR9) **And** embedding runs asynchronously and does not block the weekly plan generation response

4. **Given** embedding of a summary fails **When** the error is caught **Then** the error is logged and the summary remains stored without an embedding — no data loss

5. **Given** all summary and embedding functionality **When** the test suite runs **Then** comprehensive unit tests cover all acceptance criteria including edge cases (no debrief data, monthly boundary detection, embedding failures, empty weeks) **And** all existing 319 tests continue to pass with zero regressions

## Tasks / Subtasks

- [x] Task 1: Add `monthly_summary` column to milestones table via migration (AC: #2)
  - [x] 1.1 `ALTER TABLE milestones ADD COLUMN monthly_summary jsonb;` — nullable, stores aggregated monthly summary
  - [x] 1.2 Verify migration applies cleanly, check security advisors

- [x] Task 2: Enhance `GenerationService.generateWeeklySummary()` with real computed data (AC: #1)
  - [x] 2.1 Query `daily_objectives` for the plan's week to compute actual completion rates (handle table not existing gracefully — return zeros)
  - [x] 2.2 Query `check_ins` for the plan's week to compute energy level distribution (handle missing gracefully)
  - [x] 2.3 Query `debriefs` for the plan's week to get debrief count (handle missing gracefully)
  - [x] 2.4 When debriefs exist with note text, generate LLM narrative via `AiService.generateJSON()` synthesizing debrief themes and progress patterns
  - [x] 2.5 Return complete `WeeklySummary` with computed data + optional narrative

- [x] Task 3: Add `generateMonthlySummary()` to GenerationService (AC: #2)
  - [x] 3.1 Accept array of `WeeklySummary` objects from the prior month's plans
  - [x] 3.2 Compute aggregated monthly data: average completion rate, total objectives completed/total, total debriefs, aggregated energy distribution
  - [x] 3.3 When weekly narratives exist, generate LLM monthly narrative synthesizing weekly themes
  - [x] 3.4 Return `MonthlySummary` type (same shape as `WeeklySummary` but aggregated)

- [x] Task 4: Implement `generateMonthlySummaryIfNeeded()` in CheckInService (AC: #2)
  - [x] 4.1 Determine if this is the first weekly plan of a new milestone-month by comparing current week's milestone `target_month` to the last completed plan's milestone `target_month`
  - [x] 4.2 If month boundary crossed, query all completed weekly plans with summaries from the prior milestone-month
  - [x] 4.3 Call `GenerationService.generateMonthlySummary()` with the weekly summaries
  - [x] 4.4 Store monthly summary on the milestone record (update `milestones.monthly_summary`)
  - [x] 4.5 Emit `summary.generated` event for async embedding of monthly summary text

- [x] Task 5: Add `@OnEvent('summary.generated')` listener for async embedding (AC: #3, #4)
  - [x] 5.1 Add event listener in CheckInService (following IntakeService embedding listener pattern)
  - [x] 5.2 Format summary content into embeddable text string
  - [x] 5.3 Call `AiService.generateEmbedding()` on summary text
  - [x] 5.4 Store in `context_embeddings` with `content_type = 'weekly_summary'`, `goal_id`, `user_id`, `content_text`, `embedding`
  - [x] 5.5 Log success/failure — never throw (fire-and-forget pattern)

- [x] Task 6: Update `buildGenerationContext()` in CheckInService to include monthly summary (AC: #2)
  - [x] 6.1 Query the current milestone for `monthly_summary` field
  - [x] 6.2 Set `last_monthly_summary` in `GenerationContext` when available

- [x] Task 7: Add `MonthlySummary` type definition (AC: #2)
  - [x] 7.1 Add `MonthlySummary` interface to `weekly-plan.types.ts`

- [x] Task 8: Write comprehensive unit tests (AC: #5)
  - [x] 8.1 Extend `generation.service.spec.ts` with tests for enhanced `generateWeeklySummary()` and new `generateMonthlySummary()`
  - [x] 8.2 Extend `check-in.service.spec.ts` with tests for `generateMonthlySummaryIfNeeded()`, `@OnEvent('summary.generated')` listener, and updated `buildGenerationContext()`
  - [x] 8.3 Run full test suite: all 319 existing tests + new tests pass, 0 regressions

## Dev Notes

### Developer Context

**What this story delivers:** The summary aggregation and embedding layer of the adaptive coaching loop — generating weekly and monthly summaries from actual progress data, embedding them into the vector store for future retrieval, and wiring monthly summary data into the weekly plan generation context. This completes Epic 5 (Adaptive Weekly Planning).

**Critical architectural context:** Story 5.1 created `CheckInService` and `GenerationService.generateWeeklySummary()` with a stub implementation. This story fills in the real logic. The summary-before-generation chain in `CheckInService.generateWeeklyPlan()` already calls `generateWeeklySummary()` and emits `summary.generated` — this story enhances the generation and adds the embedding listener.

**Key design decisions the developer MUST follow:**

1. **Graceful data source handling** — Daily objectives (`daily_objectives`), check-ins (`check_ins`), and debriefs (`debriefs`) tables do NOT exist yet (created in Epic 6). `generateWeeklySummary()` must query these tables safely — catch Supabase errors for missing tables and return zeros. When Epic 6 stories create the tables and populate data, the summary generation automatically enriches without code changes.

2. **Hybrid summary generation** — Computed data ALWAYS present (completion rates, counts). LLM narrative ONLY when debriefs with text exist for that week. This is a cost optimization — don't call LLM when there's nothing to synthesize.

3. **Monthly summary on milestone record** — Monthly summaries are stored as JSONB on the `milestones` table (`monthly_summary` column), not on a separate table. The milestone-month boundary is detected by comparing `target_month` values between the current and previous plan's milestone.

4. **Embedding is fire-and-forget** — The `@OnEvent('summary.generated')` listener handles embedding asynchronously. Never block weekly plan generation on embedding. Embedding failures are logged but never thrown.

5. **Summary content is the text to embed** — Format the `WeeklySummary`/`MonthlySummary` into a human-readable text string before embedding. The vector store needs text, not JSON. Include completion stats and narrative (if any) in the text.

6. **If summary generation fails, proceed** — Per architecture doc: "If summary generation fails, log warn and proceed with plan generation anyway (summary is a quality enhancement, not a hard requirement)." This is already the case in CheckInService — the summary-before-generation chain wraps summary generation in a try/catch.

**This story does NOT build:** Daily objectives (Story 6.2), morning check-ins (Story 6.1), debriefs (Story 6.4), task completion tracking (Story 6.3), or quality scoring (Story 7.1). Those stories will populate the data that makes summaries richer.

### Technical Requirements

**Database: Add column to `milestones` table (via Supabase MCP migration):**

```sql
ALTER TABLE milestones ADD COLUMN monthly_summary jsonb;
```

No index needed — read on primary key lookup only.

**Enhanced `WeeklySummary` generation (in GenerationService):**

The existing stub returns `{ completion_rate: 0, objectives_completed: 0, objectives_total: plan.objectives.length }`. Enhance to:

```typescript
async generateWeeklySummary(
  completedPlan: WeeklyPlan,
  goalId: string,
): Promise<WeeklySummary> {
  // 1. Computed data — always present
  const objectives = completedPlan.objectives || [];
  let completionRate = 0;
  let objectivesCompleted = 0;
  let debriefCount = 0;
  let energyDistribution: Record<string, number> = {};
  let narrative: string | undefined;

  // 2. Try to query daily_objectives for actual completion data
  //    (table doesn't exist until Story 6.2 — handle gracefully)
  try {
    const { data } = await supabase
      .from('daily_objectives')
      .select('is_completed')
      .eq('goal_id', goalId)
      .gte('date', completedPlan.week_start_date)
      .lt('date', weekEndDate);
    if (data?.length) {
      objectivesCompleted = data.filter(d => d.is_completed).length;
      completionRate = Math.round((objectivesCompleted / data.length) * 100);
    }
  } catch { /* table doesn't exist yet — use zeros */ }

  // 3. Try to query check_ins for energy distribution
  //    (table doesn't exist until Story 6.1 — handle gracefully)

  // 4. Try to query debriefs for count + narrative source
  //    (table doesn't exist until Story 6.4 — handle gracefully)

  // 5. If debriefs with notes exist, generate LLM narrative
  //    via AiService.generateJSON() with cheap/fast model

  return { completion_rate: completionRate, objectives_completed: objectivesCompleted, objectives_total: objectives.length, debrief_count: debriefCount, energy_distribution: energyDistribution, narrative };
}
```

**Important:** `GenerationService` currently does NOT inject `SupabaseService`. It only injects `AiService`. For querying daily_objectives/check_ins/debriefs, you have two options:
- **Option A:** Inject `SupabaseService` into `GenerationService` (adds a new dependency)
- **Option B:** Have `CheckInService` query the data and pass it to `generateWeeklySummary()` as parameters (keeps GenerationService pure LLM + validation)

**Option B is preferred** — it keeps GenerationService focused on prompt assembly and LLM calls. CheckInService already has SupabaseService. Change the method signature to accept pre-queried data:

```typescript
async generateWeeklySummary(
  completedPlan: WeeklyPlan,
  weekData: {
    objectivesCompleted: number;
    objectivesTotal: number;
    debriefNotes: string[];
    energyDistribution: Record<string, number>;
  },
): Promise<WeeklySummary>
```

**Monthly summary generation prompt (when weekly narratives exist):**
```
You are a coaching progress analyst. Summarize this month's progress.
Input: Weekly summaries from the month with completion rates and narratives.
Output: JSON { "narrative": "A concise monthly progress narrative" }
```

**Summary text format for embedding:**
```
Weekly Summary (Week {week_number}):
Completion: {objectives_completed}/{objectives_total} ({completion_rate}%)
Debriefs: {debrief_count}
{narrative if present}
```

### Architecture Compliance

**Module placement:** All changes in `src/roadmap/`. No new modules. No new files except tests.

**Service boundaries per architecture doc:**
- `CheckInService` — owns weekly plan lifecycle, summary triggering, embedding listener, monthly summary orchestration
- `GenerationService` — extended with enhanced `generateWeeklySummary()` and new `generateMonthlySummary()` methods (prompt assembly + LLM calls)
- `ContextPipelineService` — reused as-is (already handles `content_type = 'weekly_summary'` in `assemblePromptSections()`)

**Naming patterns (per architecture):**
- Methods: `generateWeeklySummary()`, `generateMonthlySummary()`, `generateMonthlySummaryIfNeeded()`, `handleSummaryGenerated()` (camelCase)
- DB columns: `monthly_summary` (snake_case)
- Event name: `summary.generated` (dot.notation, already in use)
- Content type: `weekly_summary` (snake_case, already recognized by ContextPipelineService)

**Event pattern:**
- `summary.generated` — already emitted by CheckInService (story 5.1). This story adds the `@OnEvent('summary.generated')` listener for embedding.
- Event payload: `{ planId: string, goalId: string, userId: string, summary: WeeklySummary, contentText: string }` — extend to include `userId` and embeddable text
- Listener is fire-and-forget — never `await`, never throw

**Error handling pattern:**
- Table-not-found queries: catch Supabase errors, return empty data, log at `debug` level (expected until Epic 6)
- LLM narrative generation failure: catch, log `warn`, return summary without narrative (computed data still present)
- Embedding failure: catch in event listener, log `error`, never throw
- Monthly summary failure: catch, log `warn`, proceed with weekly plan generation (not a hard requirement)

**Data flow — Summary-Before-Generation Chain (enhanced):**
```
CheckInService.generateWeeklyPlan()
  → autoCompleteExpiredPlans()
  → getLastCompletedPlanWithoutSummary()
    → if exists:
      → queryWeekData(plan) — get daily objectives, check-ins, debriefs for that week
      → GenerationService.generateWeeklySummary(plan, weekData)
      → store summary on weekly_plans record
      → emit('summary.generated', { ..., contentText }) → @OnEvent listener → embed async
  → generateMonthlySummaryIfNeeded()
    → check milestone-month boundary
    → if boundary crossed:
      → query weekly summaries from prior month
      → GenerationService.generateMonthlySummary(weeklySummaries)
      → store on milestones.monthly_summary
      → emit('summary.generated', { ..., contentText }) → @OnEvent listener → embed async
  → buildGenerationContext() — includes last_monthly_summary if available
  → ContextPipelineService.assembleContext()
  → GenerationService.generateWeeklyPlan(context)
  → store plan → emit('weekly-plan.generated')
← 200 + weekly plan
```

### Library & Framework Requirements

**No new packages to install.** All dependencies already exist:
- `@nestjs/event-emitter` (EventEmitter2) — for `@OnEvent('summary.generated')` listener
- `class-validator` + `class-transformer` — if LLM narrative output needs validation
- `@supabase/supabase-js` — for DB queries
- `openai` (via `AiService`) — for embedding generation and LLM narrative calls

**Use existing services:**
- `AiService.generateEmbedding()` for summary embedding (via event listener)
- `AiService.generateJSON()` for LLM narrative generation (when debriefs exist)
- `SupabaseService.getAdminClient()` for all DB operations

**Model configuration:**
- LLM narrative uses `appConfig.ai.defaultModel` (cheap operation, no specific model override needed)
- Embedding uses `appConfig.ai.embeddingModel` (`text-embedding-3-small`, 1536 dimensions)
- Do NOT hardcode model names — always read from config

### File Structure Requirements

**Files to CREATE:**
- None (all changes extend existing files)

**Files to MODIFY:**
- `src/roadmap/generation.service.ts` — Enhance `generateWeeklySummary()`, add `generateMonthlySummary()`, add summary prompt builders
- `src/roadmap/generation.service.spec.ts` — Add tests for enhanced summary generation
- `src/roadmap/check-in.service.ts` — Implement `generateMonthlySummaryIfNeeded()`, add `@OnEvent('summary.generated')` listener, add `queryWeekData()` helper, update `buildGenerationContext()`, update `summary.generated` event payload
- `src/roadmap/check-in.service.spec.ts` — Add tests for monthly summary, embedding listener, generation context
- `src/roadmap/types/weekly-plan.types.ts` — Add `MonthlySummary` interface, add `WeekData` interface

**Files NOT to touch:**
- `src/roadmap/roadmap.service.ts` — Milestone orchestration, not summaries
- `src/roadmap/roadmap.controller.ts` — No new endpoints
- `src/roadmap/context-pipeline.service.ts` — Already handles `weekly_summary` content type
- `src/roadmap/rerank.service.ts` — Reuse as-is
- `src/roadmap/roadmap.module.ts` — CheckInService already registered
- `src/config/app.config.ts` — No new config needed
- `src/goal/` — No changes
- `src/intake/` — No changes
- `src/ai/` — No changes
- `src/supabase/` — No changes
- `src/app.module.ts` — RoadmapModule already registered

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Extend `src/roadmap/generation.service.spec.ts`:**

Tests for `generateWeeklySummary` (enhanced):
- Returns computed data with zero completions when no daily objective data provided
- Computes correct completion rate from daily objective data
- Includes energy distribution from check-in data
- Includes debrief count
- Generates LLM narrative when debrief notes exist
- Returns summary without narrative when no debriefs exist
- Handles LLM narrative generation failure gracefully (returns computed data only)

Tests for `generateMonthlySummary`:
- Aggregates multiple weekly summaries into monthly totals
- Computes average completion rate across weeks
- Generates LLM narrative when weekly narratives exist
- Returns computed-only summary when no weekly narratives
- Handles empty weekly summary array

**Extend `src/roadmap/check-in.service.spec.ts`:**

Tests for `generateMonthlySummaryIfNeeded`:
- Generates monthly summary when milestone-month boundary is crossed
- Does not generate when same milestone-month continues
- Stores monthly summary on milestone record
- Emits `summary.generated` event for monthly summary
- Handles monthly summary generation failure gracefully (logs warn, proceeds)
- Does not generate when no completed plans with summaries exist for prior month

Tests for `@OnEvent('summary.generated')` listener:
- Embeds summary text into context_embeddings with correct content_type
- Handles embedding generation failure (logs error, no throw)
- Handles Supabase insert failure (logs error, no throw)
- Includes correct goal_id and user_id on embedding record

Tests for `buildGenerationContext` (enhanced):
- Includes `last_monthly_summary` when milestone has monthly summary
- Returns null `last_monthly_summary` when no monthly summary exists

Tests for `queryWeekData`:
- Returns zeros when daily_objectives table query fails (table doesn't exist)
- Returns zeros when check_ins table query fails
- Returns zeros when debriefs table query fails
- Returns actual data when tables exist and have data

**Mock patterns (maintain consistency with existing tests):**
```typescript
const weeklySummaryMock: WeeklySummary = {
  completion_rate: 75,
  objectives_completed: 3,
  objectives_total: 4,
  debrief_count: 2,
  energy_distribution: { high: 1, good: 3, low: 1 },
  narrative: 'Good progress this week with consistent energy levels.',
};
```

**Existing test count:** 319 tests. All must pass after changes.

### Previous Story Intelligence

**From Story 5.1 (Generate and Retrieve Weekly Plan) — just completed:**
- 319 tests passing (24 new in 5.1, 2 from code review fixes)
- `CheckInService` established with: `getCurrentWeeklyPlan()`, `generateWeeklyPlan()`, `autoCompleteExpiredPlans()`, `createFallbackPlan()`, `getLastCompletedPlanWithoutSummary()`, `buildGenerationContext()`, `storeWeeklyPlan()`
- `GenerationService.generateWeeklySummary()` exists as STUB — returns `{ completion_rate: 0, objectives_completed: 0, objectives_total: objectives.length }`
- `generateMonthlySummaryIfNeeded()` exists as PLACEHOLDER — empty body with `_goalId` parameter
- Event `summary.generated` already emitted with `{ planId, goalId, summary }` payload
- Summary-before-generation chain already works: auto-complete → summary → monthly check → context → generate
- `buildGenerationContext()` already includes `last_weekly_summary` from previous plan and `last_monthly_summary` (always null currently)
- `WeeklySummary` type has: `completion_rate`, `objectives_completed`, `objectives_total`, `debrief_count?`, `energy_distribution?`, `narrative?`
- `GenerationContext.last_monthly_summary` is typed as `Record<string, unknown> | null`

**From IntakeService embedding pattern:**
- Embedding listener pattern: `@OnEvent('event.name')` → query content → `AiService.generateEmbedding(text)` → insert into `context_embeddings` with `content_type`, `goal_id`, `user_id`, `content_text`, `embedding: JSON.stringify(embedding)`
- Error handling: wrap in try/catch, log errors, never throw
- Embedding stored as `JSON.stringify(embedding)` (stringified float array)

**From code review patterns across stories:**
- Test coverage must be comprehensive for all paths including edge cases
- All warn-level logging must be asserted in tests
- Keep changes minimal and surgical
- Don't add features beyond what's specified

### Git Intelligence

Recent commits:
```
a84b596 feat(roadmap): introduce adaptive weekly plan generation lifecycle
257ecd7 feat(roadmap): harden roadmap retrieval with status handling and API docs
a7b5971 feat(roadmap): implement milestone generation via LLM orchestration
1c14408 feat(roadmap): implement 3-tier context retrieval pipeline for generation
935fa65 refactor(embeddings): unify context storage and apply code review fixes
```

**Patterns:**
- Commit format: `type(scope): description` — scope for this story: `roadmap`
- Expected commit type: `feat(roadmap): implement weekly and monthly summary generation with embedding`
- Services are built incrementally story-by-story
- Each story extends existing files rather than rewriting them

### What NOT to Build

- No daily objectives — that's Story 6.2
- No morning check-ins — that's Story 6.1
- No debriefs — that's Story 6.4
- No task completion tracking — that's Story 6.3
- No quality scoring — that's Story 7.1
- Do NOT add QualityService — just emit events (Story 7.1 will implement)
- Do NOT add check-in/debrief CRUD to CheckInService yet — only summary + embedding
- Do NOT create new tables for summaries — monthly summary goes on milestones, weekly summary goes on weekly_plans (already exists)
- Do NOT modify context-pipeline.service.ts — it already handles `weekly_summary` content type
- Do NOT modify rerank.service.ts — reuse as-is
- Do NOT add new npm packages
- Do NOT add new API endpoints — summary generation is an internal operation triggered by the existing weekly plan flow
- Do NOT create the `daily_objectives`, `check_ins`, or `debriefs` tables — those are created by Epic 6 stories

### Project Structure Notes

- All changes in `src/roadmap/` directory — consistent with module boundary
- No new files created — all changes extend existing files
- Type definitions added to existing `weekly-plan.types.ts`
- No new module registration needed — CheckInService already registered in RoadmapModule

### References

- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#Story 5.2 — Weekly & Monthly Summaries with Embedding acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics-roadmap-generation.md#FR Coverage Map — FR9, FR23, FR24 map to Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Summary Generation (Hybrid) — computed data + optional LLM narrative pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Summary-Before-Generation Chain Pattern — auto-complete → summarize → monthly → generate]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — CheckInService owns weekly plan lifecycle, GenerationService owns prompt assembly + LLM calls]
- [Source: _bmad-output/planning-artifacts/architecture.md#Embedding Table Unification — content_type discriminator for weekly_summary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema — milestones table (add monthly_summary column)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Event System — summary.generated event, fire-and-forget pattern]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#FR23 — Weekly summary from daily objective completions and debrief notes]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#FR24 — Monthly summary from weekly summaries]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#FR9 — Embed weekly summaries and debrief notes for retrieval]
- [Source: _bmad-output/planning-artifacts/prd-roadmap-generation.md#Implementation Considerations — weekly summaries auto-generated, monthly summaries auto-generated]
- [Source: _bmad-output/implementation-artifacts/5-1-generate-and-retrieve-weekly-plan.md — Previous story: 319 tests, CheckInService patterns, GenerationService stub]
- [Source: src/roadmap/check-in.service.ts — Existing generateMonthlySummaryIfNeeded() placeholder, summary.generated event emission]
- [Source: src/roadmap/generation.service.ts — Existing generateWeeklySummary() stub to enhance]
- [Source: src/roadmap/types/weekly-plan.types.ts — WeeklySummary, GenerationContext types]
- [Source: src/intake/intake.service.ts — @OnEvent embedding listener pattern to follow]
- [Source: src/roadmap/context-pipeline.service.ts — Already filters content_type === 'weekly_summary' into progressSection]
- [Source: src/config/app.config.ts — embeddingModel, embeddingDimensions, defaultModel config]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All implementations completed in single pass.

### Completion Notes List

- **Task 1:** Applied Supabase migration `add_monthly_summary_to_milestones` — added `monthly_summary jsonb` column to milestones table. Security advisors clean.
- **Task 2:** Enhanced `generateWeeklySummary()` in GenerationService to accept `WeekData` parameter (Option B per dev notes — keeps GenerationService pure). Computes completion rate from pre-queried data, generates LLM narrative when debrief notes exist, handles LLM failures gracefully.
- **Task 3:** Added `generateMonthlySummary()` to GenerationService — aggregates weekly summaries (avg completion rate, total objectives, total debriefs, aggregated energy distribution), generates LLM narrative when weekly narratives exist.
- **Task 4:** Implemented `generateMonthlySummaryIfNeeded()` in CheckInService — detects milestone-month boundary by comparing `target_month` of recent completed plans via Supabase join, queries prior month's weekly summaries, generates and stores monthly summary on milestone record, emits `summary.generated` event. Entire method wrapped in try/catch for graceful failure.
- **Task 5:** Added `@OnEvent('summary.generated')` handler `handleSummaryGenerated()` in CheckInService — follows IntakeService embedding pattern. Calls `AiService.generateEmbedding()`, stores in `context_embeddings` with `content_type = 'weekly_summary'`. Fire-and-forget: never throws, logs errors.
- **Task 6:** Updated `buildGenerationContext()` to include `last_monthly_summary` from milestone record. The milestone `select('*')` already retrieves the new column.
- **Task 7:** Added `MonthlySummary` and `WeekData` interfaces to `weekly-plan.types.ts`.
- **Task 8:** Added 28 new tests (was 12, now 28 in check-in.service.spec.ts; was 24, now 36 in generation.service.spec.ts). Total: 347 tests passing, 0 regressions.
- Also added `queryWeekData()` method in CheckInService to query daily_objectives/check_ins/debriefs tables — handles table-not-found gracefully (returns zeros) since those tables are created in Epic 6.
- Added `AiService` dependency to CheckInService constructor (available via `@Global()` AiModule).
- Updated `summary.generated` event payload to include `userId` and `contentText` for embedding.

### File List

- `src/roadmap/types/weekly-plan.types.ts` — Added `MonthlySummary` and `WeekData` interfaces
- `src/roadmap/generation.service.ts` — Enhanced `generateWeeklySummary()` (new signature with WeekData), added `generateMonthlySummary()`, added 4 prompt builder methods
- `src/roadmap/check-in.service.ts` — Implemented `generateMonthlySummaryIfNeeded()`, added `@OnEvent('summary.generated')` handler, added `queryWeekData()`, updated `buildGenerationContext()`, updated `summary.generated` event payload, added `AiService` dependency
- `src/roadmap/generation.service.spec.ts` — Extended with 12 new tests for weekly/monthly summary generation
- `src/roadmap/check-in.service.spec.ts` — Extended with 16 new tests for monthly summary, embedding listener, queryWeekData, buildGenerationContext

### Change Log

- 2026-02-22: Implemented Story 5.2 — Weekly & Monthly Summaries with Embedding. Added monthly summary column to milestones, enhanced weekly summary generation with real computed data + LLM narrative, added monthly summary aggregation, implemented async embedding via event listener, wired monthly summary into generation context. 347 tests passing (28 new, 319 existing).
- 2026-02-22: Code review (AI) — Fixed 4 MEDIUM issues: (1) Made queryWeekData private for API consistency, (2) Fixed Supabase error handling to check response error object instead of relying on throws, (3) Updated test mocks to match real Supabase behavior (return errors vs throw), (4) Added clarifying comment for || vs ?? fallback on objectivesTotal. 347 tests passing, 0 regressions.
