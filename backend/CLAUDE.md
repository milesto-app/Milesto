# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Momentum is an AI-powered personal coaching backend built with NestJS + TypeScript. It uses Supabase (Postgres + Auth), OpenRouter for LLM calls, and Cohere for vector reranking. The API is prefixed with `/api` and documented via Swagger at `/docs`.

## Commands

```bash
npm run build              # Compile (nest build)
npm run start:dev          # Dev server with watch mode
npm run lint               # ESLint with auto-fix
npm run format             # Prettier
npm run test               # All unit tests (Jest)
npm run test -- --testPathPattern=intake.service  # Single test file
npm run test:e2e           # End-to-end tests
npm run eval               # Build + run evaluation suite
```

## Architecture

### Module Structure

NestJS feature-based modules under `src/`. Each module has controllers, services, DTOs (`dto/`), and types (`types/`).

```
AppModule
├── ConfigModule (global) — static config in app.config.ts, prompts in prompts.config.ts
├── SupabaseModule (global) — admin + user-scoped Supabase clients
├── AiModule (global) — OpenAI SDK wrapper for embeddings + structured JSON generation
├── GoalModule — CRUD for goals, status lifecycle
├── IntakeModule — adaptive question batching, quality evaluation, profile generation
│   └── depends on GoalModule
└── RoadmapModule — milestone/weekly/daily generation, check-ins, debriefs
    └── depends on GoalModule
```

### Key Patterns

- **Auth**: `AuthGuard` validates Supabase JWTs. `@UserId()` param decorator extracts the authenticated user ID. Apply with `@UseGuards(AuthGuard)` on controllers.
- **Imports use `.js` extensions**: All relative imports include `.js` suffix (e.g., `./config/app.config.js`) for ESM compatibility with `nodenext` module resolution.
- **AI calls**: `AiService.generateJSON<T>()` for structured LLM output with Zod-style class-validator DTOs. `AiService.generateEmbedding()` for text embeddings.
- **Config**: Static `appConfig` object (not env-based) for AI models, timeouts, batch limits, throttle rates. Environment variables only for secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `COHERE_API_KEY`).
- **Events**: `EventEmitter2` for async side effects (`roadmap.generated`, `batch.answered`, `batch.served`, `profile.generated`).
- **Rate limiting**: Global throttle (60/min) + stricter AI endpoint throttle (10/min) via `@Throttle()`.
- **Validation**: Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

### Roadmap Generation Pipeline

The most complex flow: fetch goal profile → generate query embedding → HNSW vector search (with SQL fallback) → Cohere rerank → LLM generation → store with observability metadata.

Key services: `ContextPipelineService` (3-tier retrieval), `GenerationService` (LLM with retry), `RerankService` (Cohere), `QualityService` (LLM-as-judge validation).

### Goal Status Lifecycle

`intake_in_progress` → `intake_completed` → `roadmap_generating` → `active`

## Code Conventions

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for the complete coding standard. All code must comply.

- Single quotes, trailing commas, 100 char print width (Prettier)
- `@typescript-eslint/no-explicit-any` is **error**; all `no-unsafe-*` rules are **error**
- Explicit return types and member accessibility required
- `import type` enforced for type-only imports
- `strict: true` in tsconfig with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Test files colocated with source: `*.spec.ts` next to `*.service.ts` / `*.controller.ts`
- Conventional commits: `feat(module):`, `fix(module):`, `refactor(module):`, `chore(module):`
- One `Logger` instance per class: `private readonly logger = new Logger(ClassName.name)`

# SELF IMPROVEMENT
When you learned something, wether it's by fixing an error, or I tell you that it's wrong. Save what you've learned as memory. Be precise and general, to avoid repeating issues on occuring paterns.
