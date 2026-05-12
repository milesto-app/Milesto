# API Codebase Rules

## Project Overview

Milesto is an AI-powered personal coaching API built with NestJS + TypeScript. It uses Supabase (Postgres + Auth), OpenRouter for LLM calls, and Cohere for vector reranking. The API is prefixed with `/api`.

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

## Supabase

- **Never hand-edit `api/src/supabase/database.types.ts`.** After any DDL change, regenerate it with the Supabase CLI:
  `bunx --silent supabase gen types typescript --project-id <project-id> --schema public 2>/dev/null | sed '/<claude-code-hint/d' > api/src/supabase/database.types.ts`
  The `--silent` + stderr redirect strips bunx install noise; the `sed` strips a Claude Code plugin marker — without them the file becomes invalid TS. Hand-edits drift from the real schema and silently break queries.
