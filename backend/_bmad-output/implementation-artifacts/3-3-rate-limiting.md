# Story 3.3: Rate Limiting

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-12 -->

## Story

As a **user**,
I want the API to be protected from abuse,
So that the service remains stable and responsive for all users.

## Acceptance Criteria

1. **Given** any authenticated user **When** they exceed 60 requests per minute across any endpoints **Then** the system returns 429 Too Many Requests (FR44) **And** the response follows NestJS default error format `{ statusCode: 429, message: "ThrottlerException: Too Many Requests" }`

2. **Given** any authenticated user **When** they exceed 10 requests per minute on `GET /api/goals/:goalId/intake/next-batch` or `POST /api/goals/:goalId/intake/submit-batch` **Then** the system returns 429 Too Many Requests with the tighter limit (FR45)

3. **Given** `ThrottlerModule` is configured in `AppModule` **When** the application starts **Then** global throttle settings are read from `appConfig.throttle` (globalLimit: 60, globalTtlMs: 60000) **And** `ThrottlerGuard` is registered as a global guard via `APP_GUARD`

4. **Given** the AI endpoints in `IntakeController` **When** the `@Throttle()` decorator is applied to `getNextBatch` and `submitBatch` **Then** those endpoints enforce the tighter limit from `appConfig.throttle` (aiEndpointLimit: 10, aiEndpointTtlMs: 60000) **And** other endpoints (`retry-profile`, all goal endpoints) use the global 60/min limit

## Tasks / Subtasks

- [x] Task 1: Install `@nestjs/throttler` dependency (AC: #3)
  - [x] 1.1 Run `npm install @nestjs/throttler` to add the package
  - [x] 1.2 Verify it's added to `package.json` dependencies

- [x] Task 2: Configure `ThrottlerModule` in `AppModule` (AC: #1, #3)
  - [x] 2.1 Import `ThrottlerModule` and `ThrottlerGuard` from `@nestjs/throttler`
  - [x] 2.2 Import `APP_GUARD` from `@nestjs/core`
  - [x] 2.3 Import `appConfig` from `./config/app.config.js`
  - [x] 2.4 Add `ThrottlerModule.forRoot([{ ttl: appConfig.throttle.globalTtlMs, limit: appConfig.throttle.globalLimit }])` to `imports` array
  - [x] 2.5 Add `{ provide: APP_GUARD, useClass: ThrottlerGuard }` to `providers` array

- [x] Task 3: Add `@Throttle()` decorator to AI endpoints in `IntakeController` (AC: #2, #4)
  - [x] 3.1 Import `Throttle` from `@nestjs/throttler`
  - [x] 3.2 Import `appConfig` from `../config/app.config.js`
  - [x] 3.3 Add `@Throttle({ default: { limit: appConfig.throttle.aiEndpointLimit, ttl: appConfig.throttle.aiEndpointTtlMs } })` to `getNextBatch()` method
  - [x] 3.4 Add same `@Throttle()` decorator to `submitBatch()` method

- [x] Task 4: Update `AppModule` tests (AC: #3)
  - [x] 4.1 Add test: ThrottlerGuard is registered as APP_GUARD provider
  - [x] 4.2 Add test: ThrottlerModule is included in module imports

- [x] Task 5: Verify all existing tests pass (AC: #1-#4)
  - [x] 5.1 Run full test suite — all 195 tests pass (193 existing + 2 new) with zero regressions
  - [x] 5.2 Verify no controller tests break due to `@Throttle()` decorator (confirmed — decorator is metadata-only)

## Dev Notes

### Developer Context

**What this story builds:** Rate limiting protection for the entire API. This is a declarative, infrastructure-level change — no business logic is modified. The `@nestjs/throttler` package provides the throttling mechanism, configured globally via `APP_GUARD` with per-endpoint overrides via decorators.

**This story is small and declarative.** It installs one package, adds module configuration, and applies two decorators. No new services, no new endpoints, no database changes, no new DTOs.

**The throttle config already exists but is unused.** `appConfig.throttle` was defined in `src/config/app.config.ts` during the initial setup but never wired up. This story integrates it.

**Rate limiting is IP-based (default `ThrottlerGuard` behavior).** The architecture says "per user" but the default `ThrottlerGuard` tracks by IP address. For a mobile app (one user per device), IP-based tracking is equivalent and simpler. If per-user-ID tracking is needed later, a custom guard extending `ThrottlerGuard` can override `getTracker()` to use the Supabase user ID — but this is deferred because:
1. `ThrottlerGuard` (APP_GUARD) runs before `AuthGuard` (@UseGuards), so the user object isn't available yet
2. IP-based is the standard approach and sufficient for MVP
3. The 3-attempt cap on `retry-profile` and the 7-batch cap on intake already provide business-level abuse prevention

**Which endpoints get the tighter AI limit (10/min):**
- `GET /api/goals/:goalId/intake/next-batch` — triggers AI question generation (batch 2+)
- `POST /api/goals/:goalId/intake/submit-batch` — triggers AI generation of next batch inline

**Which endpoints use global limit only (60/min):**
- `POST /api/goals/:goalId/intake/retry-profile` — has its own 3-attempt business cap
- All goal CRUD endpoints (`POST/GET/DELETE /api/goals`)
- `GET /api/goals/:goalId/profile`

**`@nestjs/throttler` v6 API (NestJS 11 compatible):**
- TTL is in **milliseconds** (not seconds — breaking change from v5)
- `forRoot()` accepts an **array** of throttler configs
- `@Throttle()` takes an **object** keyed by throttler name (`{ default: { limit, ttl } }`)
- Default throttler name is `'default'` when no `name` property is specified in `forRoot()`
- `ThrottlerGuard` registered via `APP_GUARD` applies to all routes automatically

**Existing code you MUST understand:**

- `src/app.module.ts` — 25 lines. Root module with 6 imports (ConfigModule, EventEmitterModule, SupabaseModule, AiModule, GoalModule, IntakeModule) and EventEmitter2 error handler. **Add ThrottlerModule import and APP_GUARD provider.**

- `src/intake/intake.controller.ts` — 36 lines. Three endpoints: `getNextBatch`, `submitBatch`, `retryProfile`. All use `@UseGuards(AuthGuard)` at controller level. **Add `@Throttle()` decorator to `getNextBatch` and `submitBatch` only.**

- `src/config/app.config.ts` — `appConfig.throttle` already defined:
  ```typescript
  throttle: {
    globalLimit: 60,
    globalTtlMs: 60_000,
    aiEndpointLimit: 10,
    aiEndpointTtlMs: 60_000,
  }
  ```

- `src/app.module.spec.ts` — 32 lines. Tests EventEmitter2 error handler setup. **Add tests for ThrottlerGuard registration.**

**What NOT to build:**
- No custom ThrottlerGuard subclass — default IP-based tracking is sufficient for MVP
- No new services, controllers, or modules
- No database migrations
- No DTO changes
- No changes to `main.ts` — the guard is registered via `APP_GUARD` in the module, not `app.useGlobalGuards()`
- No changes to any service files
- No changes to `GoalController` — it uses the global 60/min limit (no override needed)
- No `@SkipThrottle()` decorators — all endpoints should be rate-limited

### Technical Requirements

**AppModule changes — add ThrottlerModule and APP_GUARD:**

```typescript
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config.js';
import { ConfigModule } from './config/config.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AiModule } from './ai/ai.module.js';
import { GoalModule } from './goal/goal.module.js';
import { IntakeModule } from './intake/intake.module.js';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: appConfig.throttle.globalTtlMs,
        limit: appConfig.throttle.globalLimit,
      },
    ]),
    SupabaseModule,
    AiModule,
    GoalModule,
    IntakeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.eventEmitter.on('error', (error: Error) => {
      this.logger.error(
        `Unhandled event listener error: ${error.message}`,
        error.stack,
      );
    });
  }
}
```

**IntakeController changes — add @Throttle() to AI endpoints:**

```typescript
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { appConfig } from '../config/app.config.js';
import { IntakeService } from './intake.service.js';
import { SubmitAnswersDto } from './dto/submit-answers.dto.js';

@Controller('goals/:goalId/intake')
@UseGuards(AuthGuard)
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Get('next-batch')
  @Throttle({
    default: {
      limit: appConfig.throttle.aiEndpointLimit,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  async getNextBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.intakeService.getNextBatch(userId, goalId);
  }

  @Post('submit-batch')
  @Throttle({
    default: {
      limit: appConfig.throttle.aiEndpointLimit,
      ttl: appConfig.throttle.aiEndpointTtlMs,
    },
  })
  async submitBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.intakeService.submitBatch(userId, goalId, dto.answers);
  }

  @Post('retry-profile')
  async retryProfile(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.intakeService.retryProfile(userId, goalId);
  }
}
```

**429 response format (NestJS default — no custom handling needed):**

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

Response headers automatically include:
- `X-RateLimit-Limit` — the configured limit
- `X-RateLimit-Remaining` — remaining requests in the window
- `X-RateLimit-Reset` — seconds until the window resets

### Architecture Compliance

**Module structure:** No new modules. `ThrottlerModule` is a third-party NestJS module imported in `AppModule` — same pattern as `EventEmitterModule.forRoot()`.

**Guard registration:** `ThrottlerGuard` registered via `APP_GUARD` in `AppModule.providers` — standard NestJS pattern for global guards. This runs before controller-level `@UseGuards(AuthGuard)`.

**Config usage:** `appConfig.throttle.*` imported directly from `./config/app.config.js` — NOT via `ConfigService` (non-sensitive settings, consistent with existing patterns in `intake.service.ts`).

**Error handling:** `ThrottlerGuard` throws `ThrottlerException` (extends `HttpException` with status 429) — handled by NestJS default exception filter. No custom error handling needed.

**Endpoint pattern:** `@Throttle()` decorator applied per-method on AI endpoints. Global throttle applied automatically to all other endpoints via `APP_GUARD`.

**Import pattern:** ALL relative imports MUST use `.js` extension. Third-party imports (`@nestjs/throttler`) use package names as-is.

### Library & Framework Requirements

**New dependency to install:**

```bash
npm install @nestjs/throttler
```

- **Package:** `@nestjs/throttler` v6.5.0+
- **Compatibility:** NestJS 11 (peer dependency supported since v6.4.0)
- **Purpose:** Declarative rate limiting via guards and decorators
- **No other new dependencies needed**

**Imports used from `@nestjs/throttler`:**
- `ThrottlerModule` — module configuration (`forRoot()`)
- `ThrottlerGuard` — guard class (registered as `APP_GUARD`)
- `Throttle` — decorator for per-endpoint overrides

**Imports used from `@nestjs/core`:**
- `APP_GUARD` — provider token for global guards (already available, no new install)

### File Structure Requirements

**Files to CREATE:** None.

**Files to MODIFY:**

- `src/app.module.ts` — import `ThrottlerModule`, `ThrottlerGuard`, `APP_GUARD`, `appConfig`; add `ThrottlerModule.forRoot()` to imports; add `APP_GUARD` provider
- `src/intake/intake.controller.ts` — import `Throttle` and `appConfig`; add `@Throttle()` decorator to `getNextBatch` and `submitBatch`
- `src/app.module.spec.ts` — add tests verifying ThrottlerModule configuration and APP_GUARD registration

**Files NOT to touch:**

- `src/config/app.config.ts` — throttle config already defined and correct
- `src/main.ts` — no global guard registration here (using APP_GUARD in module instead)
- `src/intake/intake.service.ts` — no business logic changes
- `src/intake/intake-prompt.service.ts` — no changes
- `src/intake/intake-quality.service.ts` — no changes
- `src/goal/goal.controller.ts` — uses global 60/min limit (no override needed)
- `src/goal/goal.service.ts` — no changes
- `src/common/guards/auth.guard.ts` — no changes
- Any `*.service.spec.ts` files — service tests are unaffected by throttling

**No database migrations needed.** Rate limiting is purely application-level.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**AppModule tests — update `app.module.spec.ts`:**

```
describe('AppModule')
  ✓ should configure EventEmitter2 global error handler (existing)
  ✓ should log errors via the error handler (existing)
  ✓ should compile with ThrottlerModule configured
  ✓ should register ThrottlerGuard as APP_GUARD
```

The new tests verify that the module compiles with all dependencies (including ThrottlerModule) and that the APP_GUARD provider is correctly registered. Use `@nestjs/testing` `Test.createTestingModule` to verify the full module graph resolves.

**AppModule test approach:**

```typescript
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Test that AppModule compiles with ThrottlerModule
it('should compile with ThrottlerModule configured', async () => {
  // Mock external dependencies (Supabase, etc.) to isolate module structure
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue({})
    .overrideProvider(AiService)
    .useValue({})
    .compile();

  expect(module).toBeDefined();
});
```

**IntakeController tests — verify no regressions in `intake.controller.spec.ts`:**

The existing controller tests create an isolated TestingModule without `ThrottlerModule`. The `@Throttle()` decorator is metadata-only and does NOT require `ThrottlerModule` to be present in the test module. All existing tests should pass without changes.

However, if the test compilation fails due to missing throttler metadata resolution, add a mock:
```typescript
providers: [
  { provide: IntakeService, useValue: intakeService },
  { provide: SupabaseService, useValue: {} },
],
```
No throttler-specific mocks should be needed since the guard isn't active in unit tests.

**Test count:** ~2-4 new tests in `app.module.spec.ts`. 0 changes to existing controller/service tests.

**All ~193 existing tests must continue to pass.** The `@Throttle()` decorator and `ThrottlerModule` import should have zero impact on existing tests because:
- Controller unit tests don't include `APP_GUARD` providers
- Service unit tests don't interact with HTTP layer
- The decorator is passive metadata that's only read by `ThrottlerGuard`

### Previous Story Intelligence

**From Story 3.1 (AI Fallback Batches):**
- `appConfig` is already imported in `intake.service.ts` — this story adds it to `intake.controller.ts` and `app.module.ts`
- Total tests before this story: 193 (182 from before Story 3.2, + 11 from Story 3.2)

**From Story 3.2 (Profile Generation Retry):**
- `retry-profile` endpoint added to `IntakeController` — this endpoint does NOT get the tighter AI limit (only `next-batch` and `submit-batch` per epics AC)
- Controller has 3 endpoints now: `getNextBatch`, `submitBatch`, `retryProfile`

**From the architecture document:**
- Rate limiting is listed as cross-cutting concern #4: "Global 60 req/min, tighter 10 req/min on AI-calling endpoints via `@nestjs/throttler`"
- Implementation priority: "Rate limiting — apply after core endpoints work" (last item)
- `APP_GUARD` pattern explicitly chosen over `app.useGlobalGuards()` in main.ts

**`@nestjs/throttler` v6 critical notes (from web research):**
- TTL is in **milliseconds** (v5 used seconds — breaking change)
- `forRoot()` takes an **array** of configs (v5 took a single object)
- `@Throttle()` takes an **object** keyed by throttler name (v5 took positional args)
- Default throttler name is `'default'` when no `name` property specified
- `ThrottlerGuard` must be provided via `APP_GUARD` or `@UseGuards()` — it doesn't auto-activate from `ThrottlerModule` alone
- Version 6.5.0 is latest stable with NestJS 11 peer dependency support

### Project Structure Notes

- All changes are in `src/` — no new directories or files created
- `ThrottlerModule.forRoot()` follows the same pattern as `EventEmitterModule.forRoot()` in AppModule
- `APP_GUARD` pattern puts the guard registration in the module, not in `main.ts` — this is the NestJS recommended approach and keeps all module configuration centralized
- `@Throttle()` decorator placement on individual methods (not controller level) ensures only the specific AI endpoints get the tighter limit while `retry-profile` keeps the global limit

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3 — FR44, FR45]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns — Rate Limiting: Global 60 req/min, tighter 10 req/min]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Rate limiting via @nestjs/throttler]
- [Source: _bmad-output/planning-artifacts/architecture.md#Additional Dependencies — @nestjs/throttler]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/prd.md#FR44 — System enforces global rate limit on all endpoints]
- [Source: _bmad-output/planning-artifacts/prd.md#FR45 — System enforces tighter rate limit on AI-calling endpoints]
- [Source: _bmad-output/planning-artifacts/prd.md#Rate Limits — Global 60/min, AI endpoints 10/min]
- [Source: _bmad-output/planning-artifacts/prd.md#Error Codes — 429 for rate limit exceeded]
- [Source: src/config/app.config.ts — throttle.globalLimit (60), throttle.globalTtlMs (60000), throttle.aiEndpointLimit (10), throttle.aiEndpointTtlMs (60000)]
- [Source: src/app.module.ts — Current module structure, EventEmitterModule.forRoot() pattern]
- [Source: src/intake/intake.controller.ts — getNextBatch, submitBatch, retryProfile endpoints]
- [Source: @nestjs/throttler v6.5.0 docs — forRoot() array config, @Throttle() object syntax, APP_GUARD pattern, millisecond TTL]

## Change Log

- 2026-02-12: Implemented rate limiting — installed `@nestjs/throttler` v6.5.0, configured global 60 req/min throttle via `ThrottlerModule.forRoot()` and `APP_GUARD`, applied tighter 10 req/min limit to AI endpoints (`getNextBatch`, `submitBatch`) via `@Throttle()` decorator, added 2 unit tests for module configuration

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No issues encountered. All implementation was straightforward and declarative.

### Completion Notes List

- Installed `@nestjs/throttler` v6.5.0 — NestJS 11 compatible
- Configured `ThrottlerModule.forRoot()` in `AppModule` with global 60 req/min limit from `appConfig.throttle`
- Registered `ThrottlerGuard` as `APP_GUARD` for automatic application to all routes
- Added `@Throttle()` decorator with 10 req/min limit to `getNextBatch()` and `submitBatch()` in `IntakeController`
- `retryProfile()` correctly uses global limit only (no `@Throttle()` override)
- Added 2 new tests: ThrottlerModule in imports, ThrottlerGuard as APP_GUARD — verified via `Reflect.getMetadata`
- Full test suite: 195 tests pass (193 existing + 2 new), zero regressions
- All 4 acceptance criteria satisfied

### File List

- `package.json` — added `@nestjs/throttler` dependency
- `package-lock.json` — updated lock file
- `src/app.module.ts` — added ThrottlerModule.forRoot(), APP_GUARD provider with ThrottlerGuard
- `src/intake/intake.controller.ts` — added @Throttle() decorator to getNextBatch and submitBatch
- `src/app.module.spec.ts` — added 2 tests for ThrottlerModule config and APP_GUARD registration
