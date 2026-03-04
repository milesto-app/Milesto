# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Momentum is an AI-powered personal coaching backend built with NestJS + TypeScript. It uses Supabase (Postgres + Auth), OpenRouter for LLM calls, and Cohere for vector reranking. The API is prefixed with `/api` and documented via Swagger at `/docs`.

## Commands

```bash
bun run build              # Compile (nest build)
bun run start:dev          # Dev server with watch mode
bun run lint               # Prettier + ESLint with auto-fix
bun run test               # All unit tests (Jest)
bun run test:e2e           # End-to-end tests
bun run eval               # Build + run evaluation suite
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

### Formatting

- Single quotes, trailing commas, 80 char print width (Prettier)
- `strict: true` in tsconfig with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

### TypeScript & Type Safety

- **`any` is forbidden** (`no-explicit-any` is error, all `no-unsafe-*` rules are error). Use `unknown` + type narrowing or a proper interface.
- **Explicit return types** on all public/exported functions and methods.
- **Explicit access modifiers** on all class members (`private`, `protected`, `public`).
- **`readonly`** for all injected dependencies and immutable members.
- **`import type`** enforced for type-only imports.
- **No `as` type assertions** except `as const`. Use type guards instead.
- **Strict boolean expressions** — no truthy checks on non-booleans. Use explicit comparisons (`str.length > 0`, `val !== null`).
- **Exhaustive switches** — every `switch` on a union/enum must handle all cases.
- **No variable shadowing**, no parameter reassignment.
- **Prefer `??` over `||`** for nullish checks, `?.` for optional chaining.
- If it returns a Promise, mark it `async`. `async` functions must contain `await`.
- No unsafe calls, no misused promises (no `async` function where a sync callback is expected).
- No template literal types with non-string/non-number values.

### Naming

| Element               | Convention                                    | Example                     |
| --------------------- | --------------------------------------------- | --------------------------- |
| Files                 | `kebab-case`                                  | `intake-prompt.service.ts`  |
| Classes               | `PascalCase`                                  | `IntakeService`             |
| Variables / functions | `camelCase`                                   | `generateBatch`             |
| Module-level consts   | `UPPER_SNAKE_CASE`                            | `MAX_RETRIES`               |
| DB tables / columns   | `snake_case`                                  | `goal_profiles`             |
| Enums                 | `PascalCase` name, `UPPER_SNAKE_CASE` members | `enum Status { ACTIVE }`    |
| Booleans              | Prefix with `is`, `has`, `should`, `can`      | `isCompleted`, `hasProfile` |
| Event names           | `domain.action`                               | `profile.generated`         |

### File Structure

- **Max 10 functions/methods** per file. Split by responsibility if exceeded.
- One class per file (plus small helpers if tightly coupled).

### Functions & Methods

- **Max nesting depth: 3.** No nested callbacks deeper than 2 levels.
- **Max cyclomatic complexity: 10.** Reduce branching with early returns and extracted helpers.
- Always `await` promises or explicitly mark fire-and-forget with `void`.
- No `return await` outside of `try/catch` blocks.
- Use `for...of` instead of `.forEach()`. Use template literals instead of string concatenation.
- No sequential `await` in loops — prefer `Promise.all()` for independent operations.
- Prefer `const` — never use `var`, use `let` only when reassignment is needed.
- No `console.*` — use the NestJS `Logger`.
- No useless returns, no returning from Promise executors.

### Error Handling

- Use **NestJS HTTP exceptions** (`NotFoundException`, `BadRequestException`, etc.).
- Always catch with a named parameter: `catch (error)` — never bare `catch`.
- Log errors: `this.logger.error(message, error instanceof Error ? error.stack : undefined);`
- Never swallow errors silently — at minimum, log them.

### Constants & Configuration

- **No magic numbers or strings.** Extract to named constants or `appConfig`.
- Domain status values must use `as const` objects or enums.
- Supabase error codes must be named constants.
- Dates, timeouts, limits → `appConfig`.

### Imports

- All relative imports use the **`.js` extension** (ESM compatibility with `nodenext`).
- No barrel exports (`index.ts`) — use direct file imports. No circular imports.

### NestJS Patterns

- One `Logger` instance per class: `private readonly logger = new Logger(ClassName.name);`
- **Controllers**: thin — delegate all logic to services.
- **Services**: single-responsibility, inject dependencies via constructor.
- **DTOs**: use `class-validator` decorators, `!` assertion on required fields, `?` on optional.
- Guards/interceptors live in `common/`.
- All endpoints documented with `@ApiOperation` and `@ApiResponse`.

### Testing

- Colocated `*.spec.ts` files next to the source.
- `describe` block matches the class name.
- One assertion per `it` block (or closely related assertions).
- Use `beforeEach` for test module setup, not `beforeAll`.
- Name tests: `should <expected behavior> when <condition>`.
- Mock all external dependencies (Supabase, AI, HTTP).
