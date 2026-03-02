---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
inputDocuments:
  - domain-roadmap-generation-research-2026-02-20.md
  - technical-context-retrieval-roadmap-generation-research-2026-02-20.md
  - prd.md
  - architecture.md
  - prd-roadmap-generation-validation-report.md
classification:
  projectType: api_backend
  domain: consumer_ai_coaching
  complexity: high
  projectContext: extension
workflowType: 'prd'
lastEdited: '2026-02-21'
editHistory:
  - date: '2026-02-21'
    changes: 'Fundamental redesign: replaced generate-everything-at-once model with adaptive incremental planning (milestones upfront, weekly plans + daily objectives on-demand, morning check-in, energy-calibrated generation, end-of-day debrief, task tracking)'
  - date: '2026-02-20'
    changes: 'Validation-driven edit: restructured NFRs, added missing FRs, fixed traceability gaps, phased success criteria'
---

# Product Requirements Document - Roadmap Generation

**Author:** Sobsh
**Date:** 2026-02-20

## Executive Summary

This PRD covers the **Roadmap Generation System** — the engine that transforms completed intake profiles into adaptive, incrementally-planned coaching roadmaps. It is the second major module of the Momentum platform, consuming the output of the Goal Intake System (PRD v1).

After a user completes intake and receives a goal profile, the system generates a skeleton of monthly milestones via backward planning from the target deadline. Weekly plans and daily objectives are then generated just-in-time — weekly plans at the start of each week, daily objectives each morning after a brief energy check-in. Every generation step incorporates real-world feedback: energy levels, task completion data, end-of-day debriefs, and weekly/monthly summaries. The roadmap is not a static document — it is a living plan that recalibrates continuously.

**Product Vision:** Turn deep understanding of a user's goal into a concrete, day-by-day plan that adapts to how they actually feel and perform — not how they imagined they would six months ago.

**Differentiator:** Three-tier adaptive generation pipeline. Milestones provide stable structure via backward planning from the deadline. Weekly plans adapt to actual progress against those milestones. Daily objectives calibrate to the user's energy level that morning. Each tier feeds the next: debriefs shape weekly summaries, weekly summaries shape monthly summaries, monthly summaries inform the next week's plan. Plans stay personalized because they respond to reality, not just intake data.

**Builds On:** Goal Intake System (completed), pgvector embedding pipeline (in place), AiService (in place), intake answer context retrieval (in place).

**Team:** 2-person team (Sobsh + co-founder). Extension of existing NestJS + Supabase + OpenRouter stack.

## Success Criteria

### User Success

- Morning check-in completes in under 30 seconds — one tap for energy level, optional free text
- Daily objectives are calibrated to reported energy: fewer and lighter on low-energy days, more ambitious on high-energy days
- Weekly plans reflect actual progress from the prior week, not a static schedule
- Users can mark daily objectives as done/not done with a single tap
- End-of-day debrief is optional and frictionless — no required fields beyond free text
- Milestones provide visible long-term structure from day one; weekly and daily plans provide actionable near-term focus

### Business Success

- Cost model shifts to per-month ongoing: milestone generation is a one-time cost per goal, weekly plan generation recurs weekly, daily objective generation recurs daily
- Each generation type (milestone, weekly, daily) has independent quality scoring for targeted improvement
- Debrief and check-in data create a compounding feedback loop — plan quality improves over time without additional AI cost per improvement cycle
- Context retrieval pipeline amortizes embedding costs across all three generation types

### Technical Success

- Milestone generation completes in < 30 seconds (full backward plan, all milestones in one call)
- Weekly plan generation completes in < 15 seconds
- Daily objective generation completes in < 10 seconds
- Morning check-in submission round-trip < 500 ms
- Context retrieval (pgvector HNSW + Cohere Rerank) completes in < 2 seconds for any generation type
- Schema validation pass rate > 90% for milestone, weekly plan, and daily objective outputs
- JSON repair pipeline handles malformed output for all three generation types before surfacing errors

### Measurable Outcomes — Phase 1

| Metric | Target | Measurement |
|---|---|---|
| Milestone schema validation rate | > 90% | Automated check on every generation |
| Weekly plan schema validation rate | > 90% | Automated check on every generation |
| Daily objective schema validation rate | > 90% | Automated check on every generation |
| Context retrieval NDCG@10 | > 0.7 | Evaluation suite against labeled relevance sets |
| Context retrieval precision@5 | > 0.8 | Evaluation suite per generation type |
| Daily objective completion rate | > 60% | Ratio of done-marked objectives to total generated, rolling 7-day |
| Check-in completion rate | > 70% | Ratio of check-ins submitted to days with app opens |
| Debrief submission rate | > 30% | Ratio of debriefs submitted to active days |

### Measurable Outcomes — Phase 2

| Metric | Target | Measurement |
|---|---|---|
| Milestone re-planning accuracy | User satisfaction > 4/5 | Survey after milestone boundary adjustments |
| Habit tracking correlation | r > 0.5 | Correlation between completion streaks and self-reported habit formation |
| Weekly plan adaptation quality | Blind eval preference > 60% | Side-by-side comparison of adapted vs. static plans |
| Energy-objective calibration accuracy | Completion rate delta > 15% | Difference in completion rate between energy-calibrated and uncalibrated objectives |

## User Journeys

### Journey 1: Maya — First Roadmap (Happy Path)

Maya completes her marathon training intake. She taps "Generate Roadmap." The system runs backward planning from her 6-month deadline and produces 6 monthly milestones (1 per month): base fitness, run/walk intervals, sustained 5K, 10K milestone, half-marathon distance, race-ready taper. Generation takes ~20 seconds. Maya sees her milestone timeline immediately.

The system generates her Week 1 plan on the spot (first week, no prior data to incorporate). The plan contains 5 goals for the week: three running sessions, one gear research task, one recovery/stretching habit.

Next morning, Maya opens the app. Morning check-in appears: "How do you feel?" She taps "Good," types "slept well" in the optional field. The system generates 3 daily objectives for Day 1 within seconds: "Run/walk 20 minutes at comfortable pace," "Research running shoes online — pick 2 candidates," "Set alarm for tomorrow's run." Each is concrete and sized for a good-energy day.

That evening, Maya marks 2 of 3 objectives done (skipped the shoe research). She opens the debrief: "Running felt harder than expected, legs were sore after 15 min." She submits.

Next morning: check-in. Maya taps "Low" — she's sore. The system generates 2 lighter objectives: "10-minute walk (active recovery)" and "Watch one video on beginner running form." No run scheduled. The debrief data and low energy both influenced the reduction.

At the start of Week 2, the system generates a new weekly plan. It incorporates: Week 1's completion data (4/7 days active, 65% objective completion), Maya's debrief notes (running harder than expected), and the current monthly milestone target. The Week 2 plan dials back running volume slightly and adds more walk/run intervals.

**Demonstrated:** Milestone generation, first weekly plan, morning check-in flow, energy-calibrated daily objectives, manual task completion tracking, end-of-day debrief, adaptive weekly planning from real-world feedback.

### Journey 2: Alex — Returning User, Rich Profile

Alex already completed a "Run a half-marathon" goal and has 3 months of check-in history, debriefs, and completion data. He creates a new goal: "Save $20,000 in 12 months." During intake, the system retrieves cross-goal profile context — Alex's existing behavioral patterns.

Milestone generation produces 12 monthly milestones. The system knows from his prior goal data that Alex performs well with specific numeric targets and poorly with open-ended tasks (his debriefs from the running goal repeatedly flagged "didn't know where to start" on vague objectives). Milestones are structured as concrete dollar amounts: Month 1 — save $1,200, Month 2 — save $1,500, etc., with early months lighter to build momentum (pattern learned from his running ramp-up).

On a low-energy Tuesday, Alex's daily objectives reflect both his energy and his profile: instead of "Review your budget categories" (vague, known failure mode), the system generates "Open bank app, screenshot last 7 days of transactions, circle 2 you could skip" (concrete, small, action-oriented). His cross-goal profile directly shapes objective specificity.

**Demonstrated:** Cross-goal context retrieval, profile-informed milestone structure, behavioral pattern application to daily objective sizing, energy-aware generation with personality calibration.

### Journey 3: Sam — Failure Cases

Sam triggers roadmap generation. Milestone generation times out at 30 seconds. The system retries once with the same prompt. Second attempt succeeds at 22 seconds. Sam sees milestones with no visible disruption beyond a brief loading extension.

The following week, weekly plan generation fails — the AI returns malformed JSON. The JSON repair pipeline attempts extraction and repair. Repair fails. The system retries with a simplified prompt. Retry also fails. Fallback: Sam sees the current monthly milestone description and its key objectives as a stand-in weekly plan, with a "Regenerate" button.

Next morning, daily objective generation fails on first attempt. Retry succeeds. On another day, both attempts fail. Fallback: the system surfaces the weekly plan's goals for the day as static objectives (no energy calibration). Sam can still mark items done.

On another morning, Sam's check-in submission fails (network error). The app retries silently. If retry fails, daily objective generation proceeds with a default "good" energy level. Sam sees objectives that are reasonable but not energy-calibrated. The check-in is saved locally and synced when connectivity returns.

Worst case: entire milestone generation fails 3 times. Goal stays at `intake_completed` (doesn't break). Sam can retry later or continue using the goal profile for manual planning.

**Demonstrated:** Timeout handling and retry for milestone generation, JSON repair pipeline across all generation types, cascading fallbacks (weekly plan → milestone description, daily objectives → weekly plan goals), graceful degradation on check-in failure.

### Journey 4: Sobsh — Monitoring and Evaluation

Sobsh queries the generation metadata table filtered by type (milestone, weekly_plan, daily_objective). Each record stores: generation type, model used, prompt token count, completion token count, latency, schema validation result, retry count, and the raw AI response.

He reviews check-in completion rates by cohort: what percentage of users who open the app complete the morning check-in? He checks debrief submission rates — if below 30%, the debrief UX needs simplification.

He monitors daily objective completion rates segmented by energy level. If "low" energy days show < 40% completion, the system is still generating too ambitious objectives for low-energy states.

Context retrieval quality is evaluated per generation type: milestone generation should retrieve intake answers and goal profile; weekly plan generation should retrieve the current milestone, last weekly summary, and last monthly summary; daily objective generation should retrieve the current weekly plan and recent debriefs. Precision and recall are measured against labeled relevance sets.

The evaluation suite runs independently for each generation type. Milestone evaluations check logical progression and deadline alignment. Weekly plan evaluations check adaptation from prior week data. Daily objective evaluations check energy calibration and task granularity.

**Demonstrated:** Per-type generation metadata querying, check-in and debrief rate monitoring, energy-segmented completion analysis, per-type context retrieval evaluation, independent evaluation suites.

### Journey Requirements Summary

| Capability | Maya | Alex | Sam | Sobsh |
|---|---|---|---|---|
| Milestone generation (backward planning) | X | X | X | |
| Weekly plan generation (progress-informed) | X | X | | |
| Daily objective generation (energy-calibrated) | X | X | | |
| Morning check-in (energy level + optional text) | X | X | | |
| Manual task completion tracking | X | X | X | |
| End-of-day debrief (optional) | X | | | |
| Weekly summary auto-generation | X | | | |
| Monthly summary auto-generation | X | | | |
| Cross-goal profile context retrieval | | X | | |
| Profile-informed objective sizing | | X | | |
| Milestone generation retry + timeout handling | | | X | |
| JSON repair pipeline (all generation types) | | | X | |
| Cascading fallbacks (weekly → milestone, daily → weekly) | | | X | |
| Check-in failure graceful degradation | | | X | |
| Per-type generation metadata logging | | | | X |
| Check-in / debrief / completion rate monitoring | | | | X |
| Energy-segmented completion analysis | | | | X |
| Per-type context retrieval evaluation | | | | X |
| Independent evaluation suites per generation type | | | | X |

## API Backend Specific Requirements

### Project-Type Overview

Extension of existing NestJS 11 API. New `RoadmapModule` with supporting services for context retrieval, embedding, reranking, generation, check-in, and debrief. All existing conventions apply (ESM imports, `.js` extensions, `snake_case` DB fields, `@UseGuards(AuthGuard)`, etc.).

### Endpoint Specification

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/goals/:goalId/roadmap/generate` | POST | Trigger milestone generation (or retry failed generation) |
| `/api/goals/:goalId/roadmap` | GET | Retrieve roadmap with milestones overview |
| `/api/goals/:goalId/roadmap/milestones` | GET | List milestones only (summary view) |
| `/api/goals/:goalId/checkin` | POST | Submit morning check-in (energy level + optional note) |
| `/api/goals/:goalId/weekly-plan` | GET | Get current week's plan (generates on-demand if not yet created) |
| `/api/goals/:goalId/weekly-plan/generate` | POST | Explicitly trigger weekly plan generation |
| `/api/goals/:goalId/daily-objectives` | GET | Get today's objectives (generates after check-in if not yet created) |
| `/api/goals/:goalId/daily-objectives/:objectiveId` | PATCH | Mark objective done/not done |
| `/api/goals/:goalId/debrief` | POST | Submit end-of-day debrief |

### Authentication Model

Same as existing: `@UseGuards(AuthGuard)` + `@UserId()` decorator. RLS on all new tables using `(select auth.uid())`.

### Data Schemas

**Roadmap:**
```json
{
  "id": "uuid",
  "goal_id": "uuid (UNIQUE)",
  "user_id": "uuid",
  "status": "generating | complete | failed",
  "generation_attempts": 0,
  "model_used": "string",
  "generation_metadata": {
    "tokens": 0,
    "latency_ms": 0,
    "context_chunks_used": 0
  },
  "quality_scores": {
    "coherence": 0,
    "personalization": 0,
    "progression": 0,
    "deadline_alignment": 0
  },
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

**Milestone:**
```json
{
  "id": "uuid",
  "roadmap_id": "uuid",
  "goal_id": "uuid",
  "order_index": 1,
  "title": "string",
  "description": "string",
  "expected_outcome": "string",
  "target_month": 1,
  "created_at": "ISO 8601"
}
```
UNIQUE constraint on `(roadmap_id, order_index)`.

**Weekly Plan:**
```json
{
  "id": "uuid",
  "roadmap_id": "uuid",
  "milestone_id": "uuid",
  "goal_id": "uuid",
  "week_number": 1,
  "week_start_date": "date",
  "focus": "string",
  "objectives": ["string"],
  "generation_context": {
    "monthly_summary": "string | null",
    "last_weekly_summary": "string | null",
    "daily_completion_rate": 0.0
  },
  "summary": "string | null",
  "status": "active | completed",
  "created_at": "ISO 8601"
}
```

**Daily Objective:**
```json
{
  "id": "uuid",
  "weekly_plan_id": "uuid",
  "goal_id": "uuid",
  "date": "date",
  "title": "string",
  "description": "string",
  "is_completed": false,
  "difficulty_rating": "easy | moderate | hard | null",
  "order_index": 1,
  "created_at": "ISO 8601"
}
```

**Check-In:**
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "user_id": "uuid",
  "date": "date",
  "energy_level": "high | good | low | very_low",
  "note": "string | null",
  "created_at": "ISO 8601"
}
```
UNIQUE constraint on `(goal_id, date)`.

**Debrief:**
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "user_id": "uuid",
  "date": "date",
  "note": "string",
  "task_ratings": [
    { "objective_id": "uuid", "rating": "easy | moderate | hard" }
  ],
  "created_at": "ISO 8601"
}
```
UNIQUE constraint on `(goal_id, date)`.

### Error Codes

| Code | Scenario |
|---|---|
| 400 | Goal not in `intake_completed` or `active` status; max generation attempts exceeded; check-in required before daily objectives |
| 401 | Missing/invalid Bearer token |
| 404 | Goal, roadmap, weekly plan, or objective not found |
| 409 | Generation already in progress for this goal; check-in already submitted today; debrief already submitted today |
| 429 | Rate limit exceeded |

### Rate Limits

- **Milestone generation:** 3 requests/minute per user (heavy AI operation)
- **Weekly plan / daily objective generation:** 5 requests/minute per user
- **Check-in / debrief submission:** 10 requests/minute per user
- **Read endpoints:** 60 requests/minute per user (global)

### Implementation Considerations

- Milestone generation: single LLM call via `AiService.generateJSON()`, backward planning from deadline, user constraints (effort level, available time, experience, deadline) injected as prompt variables
- Weekly plan generation: context assembled from current milestone, last monthly summary, last weekly summary, previous daily objective completion data. Single LLM call.
- Daily objective generation: context assembled from current weekly plan, energy level from check-in, this week's completed/incomplete objectives, recent debrief notes. Single LLM call. Uses a cheaper/faster model than milestone generation to control ongoing costs.
- Check-in and debrief: simple CRUD operations, no AI calls
- Weekly summaries: auto-generated from daily objective completions + debriefs at end of week (or start of next). May use LLM for narrative summary.
- Monthly summaries: auto-generated from weekly summaries at end of month (or start of next milestone)
- Context retrieval pipeline is modular: EmbeddingService, RetrievalService, RerankService, ContextPipelineService
- Rerank failure falls back to raw HNSW results; HNSW failure falls back to SQL context stuffing
- JSON validation + repair pipeline for all generation types (milestones, weekly plans, daily objectives)
- EventEmitter2 for async quality evaluation after each generation completes
- Generation metadata (tokens, latency, model, context chunks) stored per generation event
- Concurrent milestone generation prevention via optimistic locking (409)
- New embeddings: weekly summaries and debrief notes embedded into `context_embeddings` for retrieval
- "Start of week" and "morning" are user-triggered, not cron-based
- Generation never corrupts existing data — intake, goal profile, and embeddings consumed read-only
- Embedding model: `text-embedding-3-small` (1536 dimensions), consistent with existing pipeline
- LLM model configurable via app config per generation type (milestone model, weekly model, daily model)
- Pipeline stages independently configurable: HNSW match_count, rerank top-N, match_threshold

## Project Scoping & Phased Development

### MVP Strategy

Full adaptive loop is the MVP. Milestones + on-demand weekly plans + morning check-in + daily objectives + task tracking + optional debriefs + weekly/monthly summaries. 2-person team. Larger scope than original "generate once" model — the adaptive daily loop is the core product differentiator.

### Phase 1 — MVP (This PRD)

- Context retrieval pipeline (pgvector HNSW + Cohere Rerank with fallbacks)
- Milestone generation via backward planning from target deadline
- On-demand weekly plan generation (context-aware, progress-adaptive)
- Morning check-in (4 energy levels + optional note)
- On-demand daily objective generation (energy-calibrated, progress-aware)
- Manual task completion tracking (done/not done)
- End-of-day debrief (optional, task difficulty ratings + free text)
- Weekly summary auto-generation
- Monthly summary auto-generation
- JSON schema validation + repair for all generation types
- Roadmap/milestone/weekly plan/daily objective storage with RLS
- REST endpoints for generation, check-in, tracking, and retrieval
- Milestone generation retry for failed roadmaps
- Graceful degradation at every pipeline stage
- Generation metadata logging per generation event
- LLM-as-judge quality evaluation (async, per generation type)

### Phase 2 — Intelligent Adaptation

- Milestone re-planning when user significantly ahead/behind schedule (AI suggests milestone adjustments)
- Burnout risk detection from energy level trends and completion rate drops
- Habit tracking linked to recurring daily objectives
- Milestone review prompts at end of each month
- Roadmap regeneration for changed circumstances (new constraints, timeline shift)

### Phase 3 — Adaptive Coaching

- Proactive nudges based on check-in patterns and completion trends
- Cross-goal context awareness (skills and patterns from one goal informing another)
- Coach persona selection affecting objective tone and strategy
- Goal evolution — regenerating milestones when circumstances change
- Chat interface to interact with objectives, milestones, and plans

### Risk Mitigation

**Technical:** Multi-layer fallbacks (rerank → raw HNSW → SQL context stuffing). JSON repair pipeline for malformed output. Milestone generation retry. Weekly/daily generation fallback to showing parent plan description.

**Quality:** Backward planning + constraint injection reduce hallucination. Few-shot examples teach desired structure. LLM-as-judge scoring catches quality regressions per generation type.

**User engagement:** Adaptive loop requires daily input. Mitigation: if no check-in submitted, system generates objectives with default neutral energy assumption. If no debrief submitted, system generates next day from completion data alone.

**Context growth:** As weeks pass, accumulated context grows. Mitigation: summarize older data into weekly/monthly summaries. Use retrieval pipeline to select most relevant context rather than stuffing everything.

**Cost:** Daily generation adds ongoing cost. Mitigation: use cheaper/faster models for daily objectives, keep milestone generation on a more capable model, summarize context to keep prompts small. Target per-goal monthly cost under $1.

## Functional Requirements

### Context Retrieval Pipeline

- FR1: System generates vector embeddings for intake Q&A text on batch submission (extend existing)
- FR2: System generates vector embeddings for goal profile narrative on profile generation (extend existing)
- FR3: System stores embeddings in `context_embeddings` table with HNSW index
- FR4: System retrieves top-K context chunks via HNSW filtered by goal_id and user_id
- FR5: System reranks retrieved chunks using Cohere Rerank API
- FR6: System falls back to raw HNSW results when reranking unavailable
- FR7: System falls back to direct SQL context assembly when vector retrieval fails entirely
- FR8: System assembles reranked context into prompt with labeled sections (goal profile, intake Q&A, user profile, progress summaries, debrief highlights)
- FR9: System generates vector embeddings for weekly summaries and debrief notes for retrieval
- FR10: System retrieves cross-goal user profile data (`goal_id IS NULL`) and includes in generation context

### Milestone Generation

- FR11: System generates milestones only for goals in `intake_completed` or `active` status
- FR12: System generates monthly milestones using backward planning from target deadline
- FR13: System generates a minimum of 3 milestones; for goals with deadlines over 3 months, 1 milestone per month
- FR14: System injects user constraints (effort level, available time, experience, deadline) as explicit prompt variables
- FR15: System validates generated milestones against JSON schema before storage
- FR16: System attempts JSON repair on schema validation failure before rejecting output
- FR17: System stores generation metadata (model, tokens, latency, context chunks used)
- FR18: System prevents concurrent milestone generation for the same goal (409 if already generating)
- FR19: System retries failed milestone generation once before marking as failed
- FR20: Users can retry failed milestone generation (max 3 total attempts)

### Weekly Plan Generation

- FR21: System generates a weekly plan on-demand, informed by current monthly milestone, last monthly summary, last weekly summary, and previous daily objective completion data
- FR22: System validates generated weekly plans against JSON schema before storage
- FR23: System generates a weekly summary from daily objective completions and debrief notes at end of each week
- FR24: System generates a monthly summary from weekly summaries at the end of each month
- FR25: System retries failed weekly plan generation once; on second failure, user sees milestone description as fallback

### Daily Objective Generation

- FR26: System generates daily objectives only after a morning check-in has been submitted for that day
- FR27: System generates daily objectives considering: current weekly plan, user's energy level, this week's completed/incomplete objectives, and recent debrief notes
- FR28: System calibrates daily objective count and difficulty to the user's reported energy level (fewer, lighter tasks for low energy)
- FR29: System validates generated daily objectives against JSON schema before storage
- FR30: System retries failed daily objective generation once; on second failure, user sees weekly plan goals as fallback
- FR31: If check-in submission fails, system generates objectives with default neutral energy assumption

### Morning Check-In

- FR32: Users submit a morning check-in with energy level (high, good, low, very_low) and optional free-text note
- FR33: System limits check-ins to one per goal per day (409 on duplicate)

### Task Tracking & Debrief

- FR34: Users mark daily objectives as done or not done
- FR35: Users submit an end-of-day debrief with optional free text and per-task difficulty ratings (easy, moderate, hard)
- FR36: System limits debriefs to one per goal per day (409 on duplicate)

### Roadmap Storage & Retrieval

- FR37: System stores roadmap with status tracking (generating, complete, failed)
- FR38: System stores milestones ordered by order_index with month targeting
- FR39: System stores weekly plans linked to their milestone and week number
- FR40: System stores daily objectives linked to their weekly plan and date
- FR41: System stores check-ins and debriefs linked to goal and date
- FR42: Users can retrieve their roadmap with milestones overview
- FR43: Users can retrieve milestone list (summary view)
- FR44: Users can retrieve current weekly plan with its daily objectives
- FR45: Users can retrieve check-in and debrief history

### Quality Monitoring

- FR46: System evaluates quality asynchronously via LLM-as-judge for each generation type (milestones, weekly plans, daily objectives)
- FR47: System scores milestones on coherence, personalization, progression, and deadline-alignment (0-5 scale)
- FR48: System scores weekly plans on milestone-alignment, progress-adaptation, and actionability (0-5 scale)
- FR49: System scores daily objectives on energy-calibration, specificity, and achievability (0-5 scale)
- FR50: System stores quality scores per generation event
- FR51: System logs warning when any quality dimension scores below 3/5
- FR52: System logs per-chunk retrieval details (source type, relevance score, selection decision) for observability
- FR53: System tracks daily objective completion rates per week as a quality signal

### Goal Status Integration

- FR54: System transitions goal status from `intake_completed` to `active` upon successful milestone generation
- FR55: Failed milestone generation does not change goal status

## Non-Functional Requirements

### Performance

- NFR1: Milestone generation p95 latency within 30 seconds
- NFR2: Context retrieval pipeline (embed query + HNSW search + rerank) p95 latency under 2 seconds
- NFR3: Weekly plan generation p95 latency under 15 seconds
- NFR4: Daily objective generation (post check-in) p95 latency under 10 seconds
- NFR5: Check-in and debrief submission response time under 500ms
- NFR6: Roadmap/milestone/weekly plan retrieval endpoints p95 latency under 200ms
- NFR7: Async quality evaluation completes without adding latency to generation response

### Security

- NFR8: Context retrieval scoped by user_id — RLS and query filters prevent cross-user context leakage
- NFR9: RLS on all new tables (roadmaps, milestones, weekly_plans, daily_objectives, check_ins, debriefs)
- NFR10: External API keys (Cohere, OpenAI embeddings) stored server-side, never exposed to client
- NFR11: Generated content contains no PII beyond what the user provided in intake

### Cost

- NFR12: Milestone generation cost under $0.05 per roadmap (one-time)
- NFR13: Weekly plan generation cost under $0.01 per plan
- NFR14: Daily objective generation cost under $0.005 per day
- NFR15: Per-goal monthly ongoing cost under $1 (includes ~4 weekly plans + ~30 daily objectives + context retrieval + summary generation)
- NFR16: Embedding costs under $0.001 per goal's intake data
- NFR17: Cohere Rerank costs under $0.01 per retrieval operation
