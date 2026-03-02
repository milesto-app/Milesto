---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Context retrieval and AI generation strategies for roadmap generation'
research_goals: 'Understand precise needs for roadmap generation context retrieval in Momentum, research 5 candidate technologies, evaluate pros/cons of each, and select the best fit'
user_name: 'Sobsh'
date: '2026-02-20'
web_research_enabled: true
source_verification: true
---

# Context Retrieval & AI Generation for Roadmap Generation: Technical Research

**Date:** 2026-02-20
**Author:** Sobsh
**Research Type:** Technical
**Project:** Momentum Backend

---

## Executive Summary

This research evaluates context retrieval strategies for Momentum's roadmap generation feature — a system that transforms intake questionnaire data into personalized monthly milestones and weekly action plans.

Five candidate technologies were evaluated: Direct Context Stuffing, Supabase pgvector with HNSW, RAG with Cross-Encoder Reranking, Hybrid Search, and Agentic RAG. While initial intake data is small (~5K tokens per goal), the data grows to 100-200K+ tokens over 12 months of user progress tracking (weekly check-ins, milestone reviews, coaching interactions). This growth trajectory makes intelligent retrieval essential from day one.

**Selected Architecture: HNSW + Cross-Encoder Reranking**

- **Embedding:** OpenAI `text-embedding-3-small` (1536d, $0.02/1M tokens)
- **Storage:** Supabase pgvector with HNSW index (native to existing stack)
- **Reranking:** Cohere Rerank 3.5 ($2/1K searches, simple API, graceful fallback)
- **Generation:** OpenRouter via existing `AiService`
- **Total incremental cost:** ~$10-30/month for 1,000 users

The architecture uses a modular pipeline (EmbeddingService → RetrievalService → RerankService → ContextPipelineService) that integrates cleanly with the existing NestJS + Supabase stack. Implementation follows a 4-week incremental plan, with each layer independently testable.

---

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
   - Data Volume Assessment
   - 5 Candidate Technologies Evaluated
   - Data Growth Trajectory & Technology Decision
3. [Integration Patterns Analysis](#integration-patterns-analysis)
   - Stage 1: Embedding Generation
   - Stage 2: Vector Storage (Supabase pgvector)
   - Stage 3: Cross-Encoder Reranking (Cohere)
   - Stage 4: LLM Generation
   - Data Flow Integration Summary
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
   - Modular RAG Pipeline Architecture
   - Chunking Strategy: Natural Document Boundaries
   - Filtered Vector Search Architecture
   - Data Architecture (Schema + RLS)
   - Scalability Considerations
   - Security Architecture
5. [Implementation Approaches](#implementation-approaches-and-technology-adoption)
   - Incremental Build Strategy (4 weeks)
   - Testing and Quality Assurance
   - Cost Estimation
   - Observability and Monitoring
   - Risk Assessment and Mitigation
6. [Technical Recommendations](#technical-research-recommendations)
   - Selected Technology Stack
   - Implementation Roadmap
   - Success Metrics
7. [Conclusion](#technical-research-conclusion)

---

## Technical Research Scope Confirmation

**Research Topic:** Context retrieval and AI generation strategies for roadmap generation
**Research Goals:** Understand precise needs for roadmap generation context retrieval in Momentum, research 5 candidate technologies, evaluate pros/cons of each, and select the best fit

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-20

## Technology Stack Analysis

### Critical Context: Data Volume Assessment

Before evaluating technologies, we must understand the actual data scale. Analysis of the Momentum codebase reveals:

- **Per-goal intake data**: ~4,000-5,000 tokens (questions + answers across 5-7 batches)
- **Goal profile**: ~800-1,200 tokens (structured JSON with narrative summary)
- **Total per goal with system prompt**: ~6,800-7,800 tokens
- **Multi-goal scenario** (5 goals): ~25,000 tokens of raw data

**This is a small dataset.** Even with 5 completed goals, the total context fits comfortably within modern LLM context windows (128K-1M tokens). This is a fundamental constraint that shapes the entire technology evaluation.

### Candidate Technologies for Context Retrieval

Based on the research landscape, five approaches are evaluated:

1. **Direct Context Stuffing** (query all, send all)
2. **Supabase pgvector with HNSW indexing**
3. **RAG with Cross-Encoder Reranking** (Cohere Rerank / BGE)
4. **Hybrid Search** (full-text + vector in Postgres)
5. **Agentic RAG / Context Engineering** (dynamic multi-pass retrieval)

---

### 1. Direct Context Stuffing

Query all intake data for a goal from Supabase via standard SQL joins, serialize it into a structured prompt, and send the full context to the LLM.

_Architecture: Simple SQL queries → serialize to text → LLM prompt_
_Implementation: Standard Supabase client queries, no new infrastructure_
_Integration: Native fit with existing NestJS + Supabase stack_
_Performance: Single DB round-trip, no embedding computation_

**Pros:**
- Simplest possible implementation — zero new infrastructure
- No embedding model costs or latency
- 100% recall — the LLM sees everything, nothing is missed
- Deterministic — same input always produces same context
- Debuggable — you can see exactly what the LLM receives

**Cons:**
- Scales poorly if data grows beyond context window (unlikely at current scale)
- "Lost in the Middle" effect — LLMs can lose focus with noisy context
- No semantic relevance filtering — irrelevant answers still consume tokens
- Cost scales linearly with data volume (but ~5K tokens is cheap)

**Confidence: HIGH** — Well-established pattern, research confirms effectiveness for small datasets.
_Source: [RAG vs Context Stuffing](https://www.spyglassmtg.com/blog/rag-vs.-prompt-stuffing-overcoming-context-window-limits-for-large-information-dense-documents)_
_Source: [RAGFlow — From RAG to Context](https://ragflow.io/blog/rag-review-2025-from-rag-to-context)_

---

### 2. Supabase pgvector with HNSW Indexing

Store vector embeddings of intake answers and goal profiles. Use HNSW (Hierarchical Navigable Small World) index for approximate nearest neighbor search to retrieve the most relevant context chunks.

_Architecture: Embedding model → pgvector storage → HNSW index → similarity search → LLM_
_Implementation: Supabase pgvector extension, embedding generation via OpenAI/OpenRouter_
_Integration: Native Supabase integration, RPC functions for similarity queries_
_Performance: pgvectorscale achieves 471 QPS at 99% recall on 50M vectors_

**Pros:**
- Stays within Postgres/Supabase — no external vector DB needed
- HNSW provides sub-millisecond search at scale
- Semantic retrieval — finds conceptually relevant context, not just keyword matches
- pgvectorscale (Supabase's Rust extension) competitive with dedicated vector DBs
- Future-proof if data volume grows significantly

**Cons:**
- Overhead for ~20 documents per goal — embedding and indexing a handful of short texts adds complexity with marginal benefit
- Embedding model cost and latency for each intake answer
- Approximate search means potential recall loss (though negligible at small scale)
- Adds operational complexity: embedding pipeline, index tuning (ef_construction, m parameters)
- HNSW index consumes RAM — overkill for small datasets

**Confidence: HIGH** — Technology is mature and well-documented.
_Source: [Crunchy Data — HNSW Indexes with pgvector](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector)_
_Source: [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector)_
_Source: [Pinecone vs Supabase pgvector Performance](https://geetopadesha.com/vector-search-in-2026-pinecone-vs-supabase-pgvector-performance-test/)_

---

### 3. RAG with Cross-Encoder Reranking

Two-stage retrieval: first retrieve candidate chunks via vector search (bi-encoder), then rerank them using a cross-encoder model (Cohere Rerank, BGE-reranker, or ColBERT) for higher precision.

_Architecture: Embedding retrieval → cross-encoder rerank → top-K selection → LLM_
_Implementation: pgvector for stage 1, Cohere API or self-hosted BGE for stage 2_
_Integration: Additional API call (Cohere) or model hosting (BGE) required_
_Performance: Cohere Rerank adds ~150ms for 100 documents; ColBERT 180x fewer FLOPs than BERT_

**Pros:**
- Highest precision — cross-encoders process query+document pairs jointly
- Cohere Rerank 3 supports 100+ languages
- 8-11% accuracy improvement over vector search alone
- BGE-reranker is open-source and self-hostable

**Cons:**
- **Massively over-engineered for ~20 documents** — reranking 20 short answers is wasteful
- Adds external dependency (Cohere API) or model hosting complexity (BGE)
- Additional latency: 150ms+ per reranking pass
- Additional cost per API call
- Cross-encoder doesn't scale to large candidate sets (but the candidate set is tiny)

**Confidence: HIGH** — Technology is proven, but applicability to this use case is LOW.
_Source: [Top 7 Rerankers for RAG](https://www.analyticsvidhya.com/blog/2025/06/top-rerankers-for-rag/)_
_Source: [ZeroEntropy — Best Reranking Model Guide](https://www.zeroentropy.dev/articles/ultimate-guide-to-choosing-the-best-reranking-model-in-2025)_
_Source: [ColBERT Re-Ranking](https://medium.com/@2nick2patel2/colbert-and-friends-re-ranking-that-feels-instant-6c09102b7526)_

---

### 4. Hybrid Search (Full-Text + Vector in Postgres)

Combine Postgres native full-text search (tsvector/tsquery) with pgvector similarity search in a single SQL query. Uses Reciprocal Rank Fusion (RRF) to merge results from both retrieval methods.

_Architecture: Parallel full-text + vector search → RRF fusion → LLM_
_Implementation: Postgres FTS + pgvector in single query, Supabase RPC function_
_Integration: Fully within Supabase/Postgres — no external services_
_Performance: Single database round-trip, combines keyword precision with semantic recall_

**Pros:**
- Best of both worlds — catches keyword matches AND semantic similarity
- Single infrastructure (Postgres) — no external dependencies
- Single query execution — efficient
- Good for mixed content (some answers are keyword-heavy, some are conceptual)

**Cons:**
- Same over-engineering concern as pgvector alone for small datasets
- More complex SQL/RPC functions to maintain
- Tuning the RRF weights between text and vector scores requires experimentation
- Full-text search on short answers (50-400 chars) provides limited value
- Still requires embedding pipeline

**Confidence: MEDIUM** — Hybrid search is powerful at scale, but benefit over simple approaches is unclear for small, structured datasets.
_Source: [Supabase AI & Vectors Docs](https://supabase.com/docs/guides/ai)_
_Source: [Firecrawl — Best Vector Databases 2026](https://www.firecrawl.dev/blog/best-vector-databases)_

---

### 5. Agentic RAG / Context Engineering

An AI agent dynamically decides what context to retrieve based on the task. For roadmap generation, the agent might first retrieve the goal profile, assess gaps, then selectively retrieve specific intake answers to fill those gaps across multiple retrieval passes.

_Architecture: LLM agent → dynamic retrieval decisions → selective queries → generation_
_Implementation: Multi-step LLM orchestration with tool-use for DB queries_
_Integration: Requires agent framework (LangChain, custom) on top of existing stack_
_Performance: Multiple LLM calls + DB queries — highest latency approach_

**Pros:**
- Most intelligent context selection — retrieves exactly what's needed
- Handles complex, multi-faceted goals where different context matters for different milestones
- Self-correcting — can retrieve more context if initial generation is insufficient
- Represents the cutting edge of RAG evolution ("Context Engineering")

**Cons:**
- **Highest complexity** — requires agent orchestration, tool definitions, error handling
- **Highest latency** — multiple LLM round-trips before generation even starts
- **Highest cost** — multiple LLM calls for retrieval planning
- Hardest to debug and test
- Overkill when all context fits in a single prompt
- Non-deterministic retrieval path

**Confidence: MEDIUM** — Emerging pattern with strong potential, but premature for this data scale.
_Source: [Agentic RAG Survey](https://arxiv.org/abs/2501.09136)_
_Source: [RAG in 2026](https://squirro.com/squirro-blog/state-of-rag-genai)_
_Source: [Google — Role of Sufficient Context](https://research.google/blog/deeper-insights-into-retrieval-augmented-generation-the-role-of-sufficient-context/)_

---

### Technology Adoption Trends

_Migration Patterns:_ The industry is moving from "always use RAG" toward **Context Engineering** — intelligently choosing the right retrieval strategy per use case. For small, structured datasets, the trend is back toward simplicity. RAG preserved 95% accuracy while using only 25% of tokens — but when 100% of tokens costs only ~5K tokens, the savings are negligible.

_Emerging Technologies:_ pgvectorscale (DiskANN-based, Rust indexer) is making Supabase pgvector competitive with dedicated vector databases up to 50M vectors. Cohere Rerank 3 and ColBERT late-interaction models are reducing reranking latency. Long-context LLMs (128K-1M tokens) are making context stuffing viable for increasingly large datasets.

_Key Insight:_ Research demonstrates that for datasets under 10K tokens, **context stuffing outperforms RAG** in both accuracy and cost. The "Lost in the Middle" effect only becomes significant beyond ~50K tokens of context.

_Source: [CopilotKit — RAG vs Context Window](https://www.copilotkit.ai/blog/rag-vs-context-window-in-gpt-4)_
_Source: [Pinecone — Why Use Retrieval](https://www.pinecone.io/blog/why-use-retrieval-instead-of-larger-context/)_
_Source: [Dataiku — Is RAG Obsolete?](https://www.dataiku.com/stories/blog/is-rag-obsolete)_

---

### Data Growth Trajectory & Technology Decision

While the initial intake data is small (~5K tokens), the context grows significantly as the user progresses through their roadmap:

| Timeframe | Data Sources | Estimated Tokens |
|-----------|-------------|-----------------|
| Intake complete | Q&A + goal profile | ~5K |
| Month 1 | + 4 weekly check-ins + milestone review | ~10-15K |
| Month 3 | + 12 weekly updates + 3 milestone reviews | ~30-50K |
| Month 6 | + habit data, pivots, coaching interactions | ~60-100K |
| Month 12 | + full year of progress history | ~100-200K+ |

At 6+ months, intelligent retrieval is essential. When generating week 37's plan, the system must selectively retrieve:
- Original goal context and constraints
- Current milestone objectives
- Recent weekly progress (last 2-3 weeks)
- Relevant past struggles or breakthroughs on similar tasks

**Decision: Build HNSW + Cross-Encoder Reranking from the start.**

Rationale:
- Avoids painful retrofit and migration later
- Every data point (check-ins, reviews, adjustments) gets embedded from day one
- Consistent architecture — no throwaway plumbing
- Supabase pgvector is native to the existing stack, minimizing infrastructure overhead
- Cross-encoder reranking ensures high-precision context selection as history deepens

---

## Integration Patterns Analysis

### Pipeline Architecture Overview

The chosen HNSW + Cross-Encoder Reranking pipeline integrates into the existing Momentum stack as a 4-stage flow:

```
User Data → Embed → Store (pgvector) → Retrieve (HNSW) → Rerank (Cross-Encoder) → Generate (LLM)
```

Each stage maps to a specific integration point with the existing NestJS + Supabase + OpenRouter stack.

---

### Stage 1: Embedding Generation

**Integration Point:** OpenAI/OpenRouter Embedding API → NestJS service

The existing `AiService` already uses OpenAI SDK (via OpenRouter). Embedding generation extends this with a dedicated method.

_Model Choice:_ `text-embedding-3-small` (1536 dimensions) — $0.02/1M tokens. At ~5K tokens per goal intake, embedding a full intake costs ~$0.0001. Even 10,000 users with 5 goals each = $0.50 total embedding cost. `text-embedding-3-large` (3072 dimensions, $0.13/1M tokens) offers marginal quality gains — not justified at this scale.

_Chunking Strategy:_ Each data unit gets its own embedding:
- Individual intake answers (per question)
- Goal profile sections (current_state, desired_state, constraints, etc.)
- Future: weekly check-ins, milestone reviews, each as separate chunks

_Trigger:_ Embed on write — when an intake answer is submitted or a check-in is saved, generate and store the embedding immediately. No batch pipeline needed.

_Source: [OpenAI Embedding Models](https://platform.openai.com/docs/models/text-embedding-3-small)_
_Source: [Embedding Models Comparison 2026](https://research.aimultiple.com/embedding-models/)_

---

### Stage 2: Vector Storage (Supabase pgvector)

**Integration Point:** Supabase Postgres with pgvector extension → existing `SupabaseService`

_Storage Schema:_ A dedicated table (e.g., `context_embeddings`) stores:
- `id`, `goal_id`, `user_id` — standard references
- `content_type` — enum: `intake_answer`, `goal_profile`, `weekly_checkin`, `milestone_review`
- `content_text` — the raw text that was embedded (for display/debugging)
- `embedding` — `vector(1536)` column for the actual embedding
- `metadata` — JSONB for batch_number, question_id, week_number, etc.
- `created_at` — timestamp for recency-based filtering

_HNSW Index:_ Create an HNSW index on the `embedding` column for fast approximate nearest neighbor search. Tuning parameters:
- `m = 16` (connections per layer — good default)
- `ef_construction = 64` (build-time accuracy — can increase for better recall)

_RPC Function:_ Supabase PostgREST doesn't support pgvector operators directly. A Postgres function wraps the similarity search and is called via `supabase.rpc('match_context', { query_embedding, match_threshold, match_count, goal_id })`. This function can also filter by `content_type` and `goal_id` to scope retrieval.

_RLS:_ Standard RLS policy using `(select auth.uid()) = user_id` ensures users only retrieve their own context.

_Source: [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector)_
_Source: [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search)_
_Source: [Crunchy Data — HNSW Indexes](https://www.crunchydata.com/blog/hnsw-indexes-with-postgres-and-pgvector)_

---

### Stage 3: Cross-Encoder Reranking

**Integration Point:** Cohere Rerank API → new NestJS `RerankService`

_Why Cohere Rerank:_
- Simple REST API — a single POST call with query + documents returns reranked results with relevance scores
- No model hosting or GPU infrastructure required
- Rerank 3.5: $2.00 per 1,000 searches (1 search = 1 query + up to 100 docs)
- At projected usage: a few hundred rerank calls/day = pennies
- 100+ language support for international users

_Integration Pattern:_
1. HNSW retrieves top-K candidates (e.g., K=20-50)
2. Send query + candidate texts to Cohere Rerank API
3. Receive reranked list with relevance scores
4. Take top-N (e.g., N=10) highest-scoring documents as final context
5. Pass to LLM for generation

_TypeScript Integration:_ Cohere provides `cohere-ai` npm package, or use raw `fetch` calls to `https://api.cohere.com/v2/rerank`. LangChain's `@langchain/cohere` package also available but may be overkill if only using rerank.

_Fallback:_ If Cohere API is unavailable, fall back to raw HNSW results without reranking. The pipeline should degrade gracefully — reranking improves quality but isn't strictly required.

_Alternative — Self-Hosted BGE-Reranker:_
- Open-source, no API costs
- Requires model hosting (GPU or CPU inference server)
- More operational complexity
- Better for high-volume production; Cohere is simpler for early-stage

_Source: [Cohere Rerank API](https://docs.cohere.com/reference/rerank)_
_Source: [Cohere Rerank Pricing](https://www.metacto.com/blogs/cohere-pricing-explained-a-deep-dive-into-integration-development-costs)_
_Source: [Top 7 Rerankers for RAG](https://www.analyticsvidhya.com/blog/2025/06/top-rerankers-for-rag/)_

---

### Stage 4: LLM Generation

**Integration Point:** OpenRouter API via existing `AiService.generateJSON()`

_No changes needed to existing infrastructure._ The reranked context is serialized into the user prompt alongside the system prompt for roadmap generation. The existing `generateJSON<T>()` method handles structured output parsing.

_Context Assembly:_ The final prompt includes:
1. System prompt with roadmap generation instructions
2. Reranked context chunks (ordered by relevance score)
3. Goal description and target deadline
4. Current milestone/week being generated (if applicable)

---

### Data Flow Integration Summary

```
Write Path (on intake answer / check-in submit):
  NestJS Controller → Service → Supabase INSERT
                             → OpenAI Embed API → Supabase INSERT (embedding)

Read Path (on roadmap generation):
  NestJS Controller → Embed query → Supabase RPC (HNSW search)
                                  → Cohere Rerank API
                                  → AiService.generateJSON() with reranked context
```

_Key Design Decisions:_
- **Embed on write** — no batch pipeline, embeddings are always fresh
- **RPC for retrieval** — Supabase PostgREST limitation requires wrapping pgvector queries
- **Cohere for reranking** — API simplicity over self-hosted model hosting
- **Graceful degradation** — reranking failure falls back to raw HNSW results
- **Existing services extended** — no new modules, just new methods on `AiService` and `SupabaseService`

_Source: [RAG Pipeline Best Practices](https://www.dhiwise.com/post/build-rag-pipeline-guide)_
_Source: [End-to-End RAG Pipeline](https://medium.com/@puvanakopis/end-to-end-rag-pipeline-ingestion-embeddings-retrieval-generation-804153d35425)_

---

## Architectural Patterns and Design

### System Architecture Pattern: Modular RAG Pipeline

The recommended architecture follows the **Modular RAG** pattern — each pipeline stage (embed, store, retrieve, rerank, generate) is a standalone, replaceable module. This aligns with NestJS's dependency injection model where each module/service can be swapped or extended independently.

```
┌─────────────────────────────────────────────────────┐
│                   NestJS Application                 │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ EmbeddingSvc │  │ RetrievalSvc │  │ RerankSvc  │ │
│  │              │  │              │  │            │ │
│  │ - embed()    │  │ - search()   │  │ - rerank() │ │
│  │ - chunk()    │  │ - filter()   │  │ - score()  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                │         │
│  ┌──────▼─────────────────▼────────────────▼──────┐  │
│  │              ContextPipelineSvc                 │  │
│  │  orchestrates: embed → retrieve → rerank → ctx │  │
│  └────────────────────────┬───────────────────────┘  │
│                           │                          │
│  ┌────────────────────────▼───────────────────────┐  │
│  │               AiService (existing)             │  │
│  │         generateJSON(system, user, model)      │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Each service has a single responsibility:
- **EmbeddingService** — generates embeddings via OpenAI API, handles chunking logic
- **RetrievalService** — wraps Supabase RPC calls for filtered HNSW search
- **RerankService** — calls Cohere Rerank API, returns scored results
- **ContextPipelineService** — orchestrates the full retrieve → rerank → assemble flow
- **AiService** (existing) — generates roadmap from assembled context

_Source: [RAG Architecture Patterns](https://orq.ai/blog/rag-architecture)_
_Source: [Modular RAG Design](https://medium.com/@hrk84ya/rag-in-2025-from-quick-fix-to-core-architecture-9a9eb0a42493)_
_Source: [NestJS + pgvector RAG Example](https://github.com/ErfanSeidipoor/nestjs-langgraph-pgvector-rag)_

---

### Chunking Strategy: Natural Document Boundaries

Unlike typical RAG systems that chunk long documents, Momentum's data has **natural boundaries** — each intake answer, check-in, and milestone review is already a discrete, semantically coherent unit. No splitting required.

**Chunking approach: one embedding per natural unit**

| Content Type | Typical Size | Chunk Strategy |
|-------------|-------------|----------------|
| Intake answer | 50-400 chars | 1 embedding per answer (no splitting) |
| Goal profile section | 200-500 chars | 1 embedding per section (current_state, constraints, etc.) |
| Weekly check-in | 200-800 chars | 1 embedding per check-in |
| Milestone review | 500-1500 chars | 1 embedding per review |

**Contextual headers** — each chunk is embedded with a prefix for semantic grounding:
```
"Goal: Learn to play guitar | Intake Q: What is your current skill level? | Answer: I've never played..."
```

This ensures the embedding captures the relationship between the answer and its question/goal, not just the raw answer text. Research shows contextual headers improve retrieval precision by 15-30%.

_Source: [Pinecone Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/)_
_Source: [Analytics Vidhya — Chunking for RAG](https://www.analyticsvidhya.com/blog/2025/02/types-of-chunking-for-rag-systems/)_
_Source: [Weaviate Chunking Strategies](https://weaviate.io/blog/chunking-strategies-for-rag)_

---

### Filtered Vector Search Architecture

**Critical finding:** pgvector 0.8.0 introduces **iterative index scans** that solve the classic HNSW filtering problem. Previously, filtering after HNSW traversal could return too few results when the filter was selective. Now pgvector iteratively scans until enough matches are found.

**Filter architecture for Momentum:**

```sql
CREATE FUNCTION match_goal_context(
  query_embedding vector(1536),
  p_goal_id uuid,
  p_content_types text[] DEFAULT NULL,  -- optional type filter
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (id uuid, content_text text, content_type text, similarity float)
AS $$
  SELECT id, content_text, content_type,
         1 - (embedding <=> query_embedding) as similarity
  FROM context_embeddings
  WHERE user_id = (select auth.uid())
    AND goal_id = p_goal_id
    AND (p_content_types IS NULL OR content_type = ANY(p_content_types))
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

**Filtering selectivity assessment:**
- Per goal: ~20-50 embeddings initially, growing to ~200-500 over a year
- This is a **high-selectivity filter** (each goal is a tiny fraction of total data)
- pgvector 0.8.0's iterative scans handle this well
- For further optimization: consider a composite index on `(goal_id, embedding)` or table partitioning by user_id if scale demands it

_Source: [pgvector 0.8.0 Iterative Scans](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/)_
_Source: [pgvector Filtering Discussion](https://github.com/pgvector/pgvector/issues/259)_
_Source: [Filtered Vector Search Performance](https://www.clarvo.ai/blog/optimizing-filtered-vector-queries-from-tens-of-seconds-to-single-digit-milliseconds-in-postgresql)_

---

### Data Architecture

**Single shared table with metadata-based isolation:**

```sql
CREATE TABLE context_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  content_type text NOT NULL,  -- 'intake_answer' | 'goal_profile' | 'checkin' | 'milestone_review'
  content_text text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}',  -- batch_number, question_id, week, etc.
  created_at timestamptz DEFAULT now()
);

-- HNSW index for fast similarity search
CREATE INDEX ON context_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for filtered queries
CREATE INDEX ON context_embeddings (goal_id, created_at DESC);

-- RLS policy
ALTER TABLE context_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own context"
  ON context_embeddings FOR ALL
  USING ((select auth.uid()) = user_id);
```

**Design decisions:**
- `ON DELETE CASCADE` on goal_id — deleting a goal cleans up all embeddings automatically
- `vector_cosine_ops` — cosine similarity is standard for text embeddings (normalized)
- `m = 16` — good default for moderate-scale datasets; increase to 32 if recall drops
- `ef_construction = 64` — build-time accuracy; higher = slower index builds but better recall
- Composite index on `(goal_id, created_at)` — supports both filtered search and recency queries

---

### Scalability Considerations

**Current scale (MVP):** 100-1,000 users × 1-3 goals × ~30 embeddings = 3K-90K rows
**Year 1:** 10,000 users × 5 goals × ~200 embeddings = 10M rows
**Year 2+:** 100,000 users × 10 goals × ~500 embeddings = 500M rows

| Scale | Strategy | Notes |
|-------|----------|-------|
| < 1M rows | Single HNSW index, no partitioning | Default config works fine |
| 1-50M rows | Tune HNSW params, composite indexes | pgvectorscale DiskANN if RAM-constrained |
| 50M+ rows | Table partitioning by user_id, consider pgvectorscale | DiskANN stores index on SSD, not RAM |

**The key insight:** you don't need to solve for 500M rows today. The architecture supports progressive optimization — start with simple HNSW, add DiskANN or partitioning when scale demands it.

---

### Security Architecture

- **RLS** on `context_embeddings` ensures user isolation at the database level
- **Embedding API keys** (OpenAI, Cohere) stored in environment variables, never exposed to client
- **No raw embeddings exposed** to the client — only the pipeline result (generated roadmap)
- **Supabase admin client** used server-side for embedding operations (bypasses RLS for write path, enforces RLS for read path via user context)

---

## Implementation Approaches and Technology Adoption

### Adoption Strategy: Incremental Build

The pipeline should be built incrementally, each layer testable independently before adding the next:

**Phase 1 — Embedding Foundation (Week 1)**
1. Enable pgvector extension via Supabase migration: `create extension if not exists vector with schema public;`
2. Create `context_embeddings` table with HNSW index
3. Add `EmbeddingService` to NestJS — wraps OpenAI embedding API
4. Hook into existing intake answer submission — embed on write
5. **Test:** verify embeddings are stored, correct dimensions, cosine similarity works

**Phase 2 — Retrieval Layer (Week 2)**
1. Create Supabase RPC function `match_goal_context()` with goal_id filtering
2. Add `RetrievalService` to NestJS — wraps RPC calls
3. **Test:** query with a sample embedding, verify top-K results are semantically relevant

**Phase 3 — Reranking Layer (Week 2-3)**
1. Add Cohere Rerank integration — `RerankService`
2. Wire retrieval → rerank pipeline in `ContextPipelineService`
3. Add fallback: if Cohere is down, return raw HNSW results
4. **Test:** compare reranked vs raw results on sample queries

**Phase 4 — Generation Integration (Week 3-4)**
1. Build roadmap generation prompts using reranked context
2. Wire into `AiService.generateJSON()` for structured milestone/week output
3. Add API endpoint for roadmap generation
4. **Test:** end-to-end generation from intake data → roadmap

_Source: [Supabase pgvector Setup](https://supabase.com/docs/guides/database/extensions/pgvector)_
_Source: [Supabase Semantic Search](https://supabase.com/docs/guides/ai/semantic-search)_

---

### Testing and Quality Assurance

**Component-level testing:**

| Component | What to Test | Metric |
|-----------|-------------|--------|
| Embedding | Same-concept texts produce similar vectors | Cosine similarity > 0.8 |
| Retrieval | Top-K returns relevant chunks for a goal | Precision@K, Recall@K |
| Reranking | Reranked order is better than raw HNSW order | NDCG improvement |
| Generation | Roadmap is coherent, covers all constraints | LLM-as-judge evaluation |

**Golden test set:** Create 5-10 sample goals with known "ideal" context retrieval results. Use these as regression tests — if retrieval quality drops after changes, tests catch it.

**Evaluation approach for retrieval:**
- For each test goal, manually label which chunks are relevant to roadmap generation
- Measure Precision@10 and Recall@10 on the retrieval step
- Measure NDCG to verify reranking improves ordering
- Target: Precision@10 > 0.7, Recall@10 > 0.85

**End-to-end evaluation:**
- Use the existing multi-persona evaluation pattern (already in the codebase for intake prompts) to evaluate roadmap quality
- Evaluate on: coherence, completeness, personalization, actionability

_Source: [RAG Evaluation Metrics](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)_
_Source: [RAG Evaluation Complete Guide](https://www.getmaxim.ai/articles/rag-evaluation-a-complete-guide-for-2025/)_
_Source: [Braintrust RAG Evaluation](https://www.braintrust.dev/articles/rag-evaluation-metrics)_

---

### Cost Estimation

**Monthly cost projection for Momentum (1,000 active users):**

| Service | Usage | Unit Cost | Monthly Cost |
|---------|-------|-----------|-------------|
| OpenAI Embeddings (`text-embedding-3-small`) | ~500K tokens/month (new data) | $0.02/1M tokens | ~$0.01 |
| Cohere Rerank 3.5 | ~5,000 searches/month | $2.00/1K searches | ~$10.00 |
| OpenRouter LLM (generation) | ~2M tokens/month | varies by model | ~$5-20 |
| Supabase (pgvector storage) | included in plan | — | $0 extra |

**Total incremental cost: ~$10-30/month** for 1,000 active users. The reranking API is the dominant cost, but at $2/1K searches it's negligible at startup scale.

**At 10,000 users:** ~$100-300/month. Still manageable. At this scale, consider switching Cohere Rerank for self-hosted BGE-reranker to eliminate the per-search cost.

_Source: [Cohere Pricing](https://cohere.com/pricing)_
_Source: [OpenAI Embedding Pricing](https://www.helicone.ai/llm-cost/provider/openai/model/text-embedding-3-small)_

---

### Observability and Monitoring

**Recommended approach: lightweight custom logging first, dedicated tooling later.**

For MVP, log key pipeline metrics directly:
- **Retrieval latency** — time for HNSW search RPC call
- **Rerank latency** — time for Cohere API call
- **Context token count** — tokens sent to LLM after reranking
- **Relevance scores** — Cohere returns scores per document; log the top-N and bottom-N scores to detect retrieval quality degradation

**Future tooling (when scale justifies it):**
- **Langfuse** — open-source LLM observability, traces full pipeline with `@observe()` decorators
- **Arize Phoenix** — open-source, built on OpenTelemetry, good for embedding drift detection

**Embedding drift monitoring:** Re-embed a small golden set weekly and compare cosine similarity to original embeddings. If drift exceeds threshold, trigger re-embedding of affected content. This is only relevant if the embedding model changes — `text-embedding-3-small` is stable, so drift is unlikely.

_Source: [Langfuse RAG Observability](https://langfuse.com/blog/2025-10-28-rag-observability-and-evals)_
_Source: [LLM Observability Tools](https://www.firecrawl.dev/blog/best-llm-observability-tools)_

---

### Risk Assessment and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cohere API downtime | Low | Medium | Fallback to raw HNSW results without reranking |
| OpenAI embedding model deprecation | Low | High | Store raw text alongside embeddings; re-embed if needed |
| Poor retrieval quality on long histories | Medium | High | Golden test set + regression testing; tune HNSW params |
| pgvector performance at scale | Low | Medium | pgvectorscale DiskANN available as upgrade path |
| Embedding cost spike | Very Low | Low | At $0.02/1M tokens, cost is negligible even at 10x scale |
| Reranking adds too much latency | Low | Medium | Cohere Rerank is ~150ms; async generation hides latency |

---

## Technical Research Recommendations

### Selected Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Embedding Model | `text-embedding-3-small` (1536d) | Best cost/performance ratio, $0.02/1M tokens |
| Vector Storage | Supabase pgvector + HNSW | Native to existing stack, no new infrastructure |
| Reranking | Cohere Rerank 3.5 | Simple API, $2/1K searches, 100+ languages |
| Generation | OpenRouter (existing) | Already integrated via `AiService` |
| Fallback | Raw HNSW results (no rerank) | Graceful degradation if Cohere is unavailable |

### Implementation Roadmap

1. **Week 1:** pgvector setup + EmbeddingService + embed-on-write for intake answers
2. **Week 2:** RPC function + RetrievalService + Cohere RerankService
3. **Week 3:** ContextPipelineService + roadmap generation prompts
4. **Week 4:** API endpoint + end-to-end testing + golden test set

### Success Metrics

- Retrieval Precision@10 > 0.7
- Retrieval Recall@10 > 0.85
- NDCG improvement from reranking > 10%
- End-to-end generation latency < 10 seconds
- Roadmap quality score (LLM-as-judge) > 4/5

---

## Technical Research Conclusion

### Summary of Key Findings

1. **Data volume starts small but grows fast** — intake data is ~5K tokens, but 12 months of progress tracking reaches 100-200K+ tokens per goal. Building the retrieval pipeline now avoids a painful retrofit.

2. **HNSW + Cross-Encoder Reranking is the right architecture** — pgvector HNSW provides fast, scalable vector retrieval within the existing Supabase stack. Cohere Rerank adds precision with minimal integration complexity and cost.

3. **Natural chunking eliminates complexity** — unlike typical RAG systems, Momentum's data has built-in boundaries (each answer, check-in, review is a chunk). No document splitting logic required.

4. **Cost is negligible** — the entire retrieval pipeline adds ~$10-30/month for 1,000 users. Embedding costs are effectively zero at this scale.

5. **The architecture is future-proof** — single shared `context_embeddings` table scales to millions of rows. pgvectorscale DiskANN and table partitioning are available upgrade paths if needed.

### Next Steps

1. **Run the domain research** (in parallel) to understand best practices for roadmap structure, coaching frameworks, and milestone design
2. **Update the PRD/architecture** with the new roadmap generation epic via `/bmad-bmm-correct-course`
3. **Create stories** for the 4-week implementation plan
4. **Verify pgvector version** on the Supabase project: `SELECT * FROM pg_extension WHERE extname = 'vector';`
5. **Create Cohere account** and obtain API key for Rerank 3.5

---

**Technical Research Completion Date:** 2026-02-20
**Source Verification:** All technical claims cited with current sources (2025-2026)
**Confidence Level:** HIGH — based on multiple authoritative technical sources, verified against Supabase and pgvector official documentation
