# Momentum Backend — Coding Style Guide

All code in this repository **must** comply with these rules. Existing violations will be fixed incrementally; new code must not introduce any.

---

## TypeScript & Type Safety

- **Explicit return types** on all public/exported functions and methods.
- **`any` is forbidden.** Use `unknown` + type narrowing, or define a proper interface.
- **Type-only imports** — use `import type { X }` when importing only types.
- **No `as` type assertions** except `as const`. Use type guards instead.
- **Explicit access modifiers** on all class members (`private`, `protected`, `public`).
- **`readonly`** for all injected dependencies and immutable members.
- **Strict boolean expressions** — no truthy checks on non-booleans. Use explicit comparisons (`str.length > 0`, `val !== null`).
- **Exhaustive switches** — every `switch` on a union/enum must handle all cases.
- **Template literal safety** — no non-string/non-number types in `${}` expressions.
- **No variable shadowing** — inner scopes must not reuse outer variable names.
- **No parameter reassignment** — treat function parameters as immutable.
- **Prefer `??` over `||`** for nullish checks, `?.` for optional chaining.
- **If it returns a Promise, mark it `async`.** Conversely, `async` functions must contain `await`.
- **No unsafe calls** — never call an `any`-typed value as a function.
- **No misused promises** — never pass an `async` function where a sync callback is expected.

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

## File Structure

- **Max 175 lines** per file (excluding comments and blank lines).
- **Max 10 functions/methods** per file. If a file grows beyond this, split by responsibility.
- One class per file (plus small helpers if tightly coupled).

## Functions & Methods

- **Max 35 lines** per function/method (excluding comments and blank lines).
- **Max 3 parameters.** Beyond that, use an options object.
- **Single responsibility** — one function does one thing.
- **Max nesting depth: 3.** No nested callbacks deeper than 2 levels.
- **Max cyclomatic complexity: 10.** Reduce branching with early returns and extracted helpers.
- **Always `await` promises** or explicitly mark fire-and-forget with the `void` operator.
- **No `return await`** outside of `try/catch` blocks.
- **Use `for...of`** instead of `.forEach()` — supports `break`, `continue`, `await`.
- **Use template literals** instead of string concatenation.
- **No sequential `await` in loops** — prefer `Promise.all()` for independent operations.
- **Array callbacks must return** — `.map()`, `.filter()`, `.reduce()` must have return values.
- **Prefer `const`** — never use `var`, use `let` only when reassignment is needed.
- **No `console.*`** — use the NestJS `Logger` instead.
- **No useless returns** — don't end a function with an empty `return`.
- **No returning from Promise executors** — `new Promise((resolve) => { ... })` must not `return` a value.

## Error Handling

- Use **NestJS HTTP exceptions** (`NotFoundException`, `BadRequestException`, etc.).
- Always catch with a **named parameter**: `catch (error)` — never bare `catch`.
- Log errors consistently:
  ```ts
  this.logger.error(message, error instanceof Error ? error.stack : undefined);
  ```
- **Never swallow errors silently** — at minimum, log them.
- Extract repeated error patterns into helpers.

## Constants & Configuration

- **No magic numbers or strings.** Extract to named constants or `appConfig`.
- Domain status values must use `as const` objects or enums.
- Supabase error codes must be named constants.
- Dates, timeouts, limits → `appConfig`.

## Imports

- All relative imports use the **`.js` extension**.
- **Group imports** (separated by blank lines):
  1. Node built-ins
  2. External packages
  3. Internal modules
- **No barrel exports** (`index.ts`) — use direct file imports.
- **No circular imports.**

## NestJS Patterns

- One `Logger` instance per class:
  ```ts
  private readonly logger = new Logger(ClassName.name);
  ```
- **Controllers**: thin — delegate all logic to services.
- **Services**: single-responsibility, inject dependencies via constructor.
- **DTOs**: use `class-validator` decorators, `!` assertion on required fields, `?` on optional.
- Guards/interceptors live in `common/`.
- All endpoints documented with `@ApiOperation` and `@ApiResponse`.

## Testing

- Colocated `*.spec.ts` files next to the source.
- `describe` block matches the class name.
- **One assertion per `it` block** (or closely related assertions).
- Use `beforeEach` for test module setup, not `beforeAll`.
- Name tests: `should <expected behavior> when <condition>`.
- Mock all external dependencies (Supabase, AI, HTTP).

## Git & Commits

- **Conventional commits**: `feat(module):`, `fix(module):`, `refactor(module):`, `chore(module):`.
- Commits are **atomic** — one logical change per commit.
