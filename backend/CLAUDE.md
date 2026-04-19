# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Momentum is an AI-powered personal coaching backend built with NestJS + TypeScript. It uses Supabase (Postgres + Auth), OpenRouter for LLM calls, and Cohere for vector reranking. The API is prefixed with `/api` and documented via Swagger at `/docs`.

## Commands

```bash
bun run build              # Compile (nest build)
bun run lint               # ESLint with auto-fix (Prettier runs from repo root)
bun run test               # All unit tests (Jest)
bun run test:e2e           # End-to-end tests
bun run eval               # Build + run evaluation suite
```

## Naming

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

## Functions & Methods

- **Max nesting depth: 3.** No nested callbacks deeper than 2 levels.
- **Max cyclomatic complexity: 10.** Reduce branching with early returns and extracted helpers.
- Always `await` promises or explicitly mark fire-and-forget with `void`.
- No `return await` outside of `try/catch` blocks.
- Use `for...of` instead of `.forEach()`. Use template literals instead of string concatenation.
- No sequential `await` in loops — prefer `Promise.all()` for independent operations.
- Prefer `const` — never use `var`, use `let` only when reassignment is needed.
- No `console.*` — use the NestJS `Logger`.
- No useless returns, no returning from Promise executors.

## Error Handling

- Use **NestJS HTTP exceptions** (`NotFoundException`, `BadRequestException`, etc.).
- Always catch with a named parameter: `catch (error)` — never bare `catch`.
- Log errors: `this.logger.error(message, error instanceof Error ? error.stack : undefined);`
- Never swallow errors silently — at minimum, log them.

## Constants & Configuration

- **No magic numbers or strings.** Extract to named constants in app.config.ts.
- Domain status values must use `as const` objects or enums.
- Supabase error codes must be named constants.

## Imports

- Do not use relative imports, always use absolute imports.
- No barrel exports (`index.ts`) — use direct file imports. No circular imports.

## NestJS Patterns

- One `Logger` instance per class: `private readonly logger = new Logger(ClassName.name);`
- **Controllers**: thin — delegate all logic to services.
- **Services**: single-responsibility, inject dependencies via constructor.
- **DTOs**: use `class-validator` decorators, `!` assertion on required fields, `?` on optional.
- Guards/interceptors live in `common/`.
- All endpoints documented with `@ApiOperation` and `@ApiResponse`.

## Testing

- Colocated `*.spec.ts` files next to the source.
- `describe` block matches the class name.
- One assertion per `it` block (or closely related assertions).
- Use `beforeEach` for test module setup, not `beforeAll`.
- Name tests: `should <expected behavior> when <condition>`.
- Mock all external dependencies (Supabase, AI, HTTP).
