# Story 3.4: API Documentation with Swagger

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story created: 2026-02-12 -->

## Story

As a **developer**,
I want all endpoints documented with interactive API reference,
So that the mobile client developer has a clear, always-up-to-date contract to build against.

## Acceptance Criteria

1. **Given** the application is running **When** a developer visits `/docs` **Then** all endpoints are documented with `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators **And** the Swagger UI is interactive and navigable

2. **Given** DTOs are decorated with `@ApiProperty` (or auto-annotated by CLI plugin) **When** the Swagger spec is generated **Then** request/response schemas are auto-generated from DTOs with correct types, descriptions, and examples

3. **Given** all controllers use `@UseGuards(AuthGuard)` **When** the Swagger spec is generated **Then** authentication is documented with `@ApiBearerAuth()` on all controller classes **And** a Bearer auth scheme is configured in `DocumentBuilder`

4. **Given** the NestJS Swagger CLI plugin is configured in `nest-cli.json` **When** the project compiles **Then** DTO properties are automatically annotated, reducing manual `@ApiProperty()` boilerplate

## Tasks / Subtasks

- [x] Task 1: Install `@nestjs/swagger` dependency (AC: #1)
  - [x] 1.1 Run `npm install @nestjs/swagger` to add the package
  - [x] 1.2 Verify it's added to `package.json` dependencies

- [x] Task 2: Configure Swagger CLI plugin in `nest-cli.json` (AC: #4)
  - [x] 2.1 Add `plugins` array to `compilerOptions` with `@nestjs/swagger` plugin
  - [x] 2.2 Configure plugin options: `classValidatorShim: true`, `introspectComments: true`

- [x] Task 3: Configure SwaggerModule in `main.ts` (AC: #1, #3)
  - [x] 3.1 Import `SwaggerModule` and `DocumentBuilder` from `@nestjs/swagger`
  - [x] 3.2 Create `DocumentBuilder` with title, description, version, and `addBearerAuth()`
  - [x] 3.3 Call `SwaggerModule.setup('docs', app, document)` after global prefix and pipes
  - [x] 3.4 Verify Swagger UI loads at `http://localhost:3000/docs`

- [x] Task 4: Add Swagger decorators to `GoalController` (AC: #1, #2, #3)
  - [x] 4.1 Add `@ApiTags('Goals')` and `@ApiBearerAuth()` at controller level
  - [x] 4.2 Add `@ApiOperation()` with summary to each endpoint method
  - [x] 4.3 Add `@ApiResponse()` for success and error status codes on each method
  - [x] 4.4 Add `@ApiParam()` for `:goalId` parameters

- [x] Task 5: Add Swagger decorators to `IntakeController` (AC: #1, #2, #3)
  - [x] 5.1 Add `@ApiTags('Intake')` and `@ApiBearerAuth()` at controller level
  - [x] 5.2 Add `@ApiOperation()` with summary to each endpoint method
  - [x] 5.3 Add `@ApiResponse()` for success and error status codes on each method
  - [x] 5.4 Add `@ApiParam()` for `:goalId` parameters

- [x] Task 6: Add `@ApiProperty()` decorators to DTOs (AC: #2)
  - [x] 6.1 Add `@ApiProperty()` with descriptions and examples to `CreateGoalDto` fields
  - [x] 6.2 Add `@ApiPropertyOptional()` with descriptions to `ListGoalsQueryDto` fields
  - [x] 6.3 Add `@ApiProperty()` with descriptions and examples to `AnswerDto` and `SubmitAnswersDto` fields

- [x] Task 7: Verify all existing tests pass (AC: #1-#4)
  - [x] 7.1 Run full test suite — all ~195 tests must pass with zero regressions
  - [x] 7.2 Verify no controller tests break due to Swagger decorators (decorators are metadata-only)

## Dev Notes

### Developer Context

**What this story builds:** Interactive API documentation via Swagger/OpenAPI, auto-generated from code decorators. This gives the mobile client developer a live, always-accurate API contract at `/docs`. No business logic changes — purely declarative decorator additions.

**This story is declarative and additive.** It installs one package, adds CLI plugin config, configures Swagger in bootstrap, and decorates existing controllers/DTOs. No new services, no new endpoints, no database changes, no new modules.

**`@nestjs/swagger` is NOT imported as a module.** Unlike `ThrottlerModule` or `EventEmitterModule`, Swagger is configured directly in `main.ts` via `SwaggerModule.setup()`. It hooks into the Express app instance, not the NestJS module system.

**The CLI plugin reduces boilerplate significantly.** When configured in `nest-cli.json`, it auto-infers `@ApiProperty()` from TypeScript types at compile time. This means:
- `class-validator` decorators (`@IsString()`, `@IsOptional()`, etc.) are recognized to determine required/optional
- TypeScript types are used for schema type inference
- You still ADD explicit `@ApiProperty()` for descriptions, examples, and complex types

**Swagger endpoint path: `/docs`** (NOT under `/api` prefix). `SwaggerModule.setup('docs', app, document)` registers directly on the Express app, independent of NestJS global prefix. Routes in the spec will still correctly show `/api/goals`, `/api/goals/:goalId/intake/next-batch`, etc.

**Bearer auth setup in DocumentBuilder:** `.addBearerAuth()` adds a security scheme. Then `@ApiBearerAuth()` on controllers references it, showing the lock icon in Swagger UI.

### Technical Requirements

**main.ts changes — add Swagger configuration:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Momentum API')
    .setDescription('AI-powered personal coaching platform — Goal Intake System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

**nest-cli.json changes — add Swagger CLI plugin:**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

**Plugin options explained:**
- `classValidatorShim: true` — infers `required` from `@IsOptional()` (absent = required), and maps validator decorators to schema constraints
- `introspectComments: true` — uses JSDoc/TypeDoc comments as `description` in the schema (optional bonus — not required but nice to have)

**GoalController changes — add Swagger decorators:**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto.js';
import { GoalService } from './goal.service.js';

@ApiTags('Goals')
@ApiBearerAuth()
@Controller('goals')
@UseGuards(AuthGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@UserId() userId: string, @Body() dto: CreateGoalDto) {
    return this.goalService.create(userId, dto.title, dto.description);
  }

  @Get()
  @ApiOperation({ summary: 'List all goals for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated list of goals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@UserId() userId: string, @Query() query: ListGoalsQueryDto) {
    return this.goalService.findAll(userId, query.limit, query.offset);
  }

  @Get(':goalId/profile')
  @ApiOperation({ summary: 'Get the AI-generated goal profile' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 200, description: 'Goal profile returned' })
  @ApiResponse({ status: 404, description: 'Goal not found or intake not complete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGoalProfile(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.goalService.getGoalProfile(userId, goalId);
  }

  @Get(':goalId')
  @ApiOperation({ summary: 'Get a single goal by ID' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 200, description: 'Goal returned' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@UserId() userId: string, @Param('goalId') goalId: string) {
    return this.goalService.findOne(userId, goalId);
  }

  @Delete(':goalId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a goal (restricted by status)' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 204, description: 'Goal deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete goal in current status' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async delete(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ): Promise<void> {
    await this.goalService.delete(userId, goalId);
  }
}
```

**IntakeController changes — add Swagger decorators:**

```typescript
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { UserId } from '../common/decorators/user.decorator.js';
import { appConfig } from '../config/app.config.js';
import { IntakeService } from './intake.service.js';
import { SubmitAnswersDto } from './dto/submit-answers.dto.js';

@ApiTags('Intake')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Get the next unanswered intake batch' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 200, description: 'Next batch returned (or re-served if unanswered)' })
  @ApiResponse({ status: 400, description: 'Intake is not active for this goal' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
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
  @ApiOperation({ summary: 'Submit answers for the current batch' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 201, description: 'Answers submitted, next batch or completion returned' })
  @ApiResponse({ status: 400, description: 'Invalid answers or intake not active' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 409, description: 'Batch already submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async submitBatch(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.intakeService.submitBatch(userId, goalId, dto.answers);
  }

  @Post('retry-profile')
  @ApiOperation({ summary: 'Retry failed profile generation' })
  @ApiParam({ name: 'goalId', description: 'The goal UUID' })
  @ApiResponse({ status: 201, description: 'Profile generation retried' })
  @ApiResponse({ status: 400, description: 'Goal not in failed state or max retries exceeded' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async retryProfile(
    @UserId() userId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.intakeService.retryProfile(userId, goalId);
  }
}
```

**CreateGoalDto changes — add `@ApiProperty()` with examples:**

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ example: 'Run a marathon', description: 'The goal title (max 200 chars)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'I want to complete my first marathon within 6 months', description: 'Detailed goal description' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
```

**ListGoalsQueryDto changes — add `@ApiPropertyOptional()`:**

```typescript
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListGoalsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Number of goals to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0, description: 'Number of goals to skip' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
```

**SubmitAnswersDto changes — add `@ApiProperty()`:**

```typescript
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerDto {
  @ApiProperty({ description: 'UUID of the question being answered', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  question_id: string;

  @ApiPropertyOptional({ description: 'Text answer (for text questions)', example: 'I want to improve my fitness' })
  @IsOptional()
  @IsString()
  answer_text?: string;

  @ApiPropertyOptional({ description: 'Numeric answer (for scale questions)', example: 7 })
  @IsOptional()
  @IsNumber()
  answer_numeric?: number;

  @ApiPropertyOptional({ description: 'Selected option(s) (for choice questions)', example: ['Option A'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selected_options?: string[];
}

export class SubmitAnswersDto {
  @ApiProperty({ description: 'Array of answers for the current batch', type: [AnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
```

### Architecture Compliance

**Module structure:** No new modules. `SwaggerModule` is configured in `main.ts` bootstrap, not as a NestJS module import — same pattern as `ValidationPipe` and `setGlobalPrefix`.

**Decorator placement:** `@ApiTags` and `@ApiBearerAuth` at controller class level. `@ApiOperation` and `@ApiResponse` at method level. `@ApiParam` on methods with route parameters. This follows standard NestJS Swagger patterns.

**Config usage:** Swagger configuration lives in `main.ts` (DocumentBuilder) — it's bootstrap-time setup, not runtime config. No `appConfig` or `ConfigService` involved.

**Import pattern:** ALL relative imports MUST use `.js` extension. `@nestjs/swagger` is a package import (no extension). Import only the decorators you use — no wildcard imports.

**CLI plugin:** Configured in `nest-cli.json` at build time. Zero runtime overhead. The plugin augments the TypeScript AST during compilation to add metadata that Swagger reads at startup.

**Error responses:** Swagger documents NestJS default error format `{ statusCode, message, error }`. No custom error schemas needed — the `@ApiResponse({ status: 4xx, description })` pattern is sufficient.

### Library & Framework Requirements

**New dependency to install:**

```bash
npm install @nestjs/swagger
```

- **Package:** `@nestjs/swagger` v11.2.6+
- **Compatibility:** NestJS 11 (v11.x line specifically targets NestJS 11)
- **Purpose:** OpenAPI/Swagger documentation auto-generation from decorators
- **No other new dependencies needed** — `swagger-ui-express` is included as a transitive dependency

**Imports used from `@nestjs/swagger`:**
- `SwaggerModule` — module setup in `main.ts`
- `DocumentBuilder` — API document configuration builder
- `ApiTags` — groups endpoints by tag in Swagger UI
- `ApiBearerAuth` — marks endpoints as requiring Bearer token auth
- `ApiOperation` — describes what an endpoint does
- `ApiResponse` — documents response status codes
- `ApiParam` — documents route parameters
- `ApiProperty` — documents DTO properties (required fields)
- `ApiPropertyOptional` — documents DTO properties (optional fields)

### File Structure Requirements

**Files to CREATE:** None.

**Files to MODIFY:**

- `nest-cli.json` — add Swagger CLI plugin to `compilerOptions.plugins`
- `src/main.ts` — import `SwaggerModule`, `DocumentBuilder`; add Swagger config after pipes, before `app.listen()`
- `src/goal/goal.controller.ts` — import and add `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`
- `src/intake/intake.controller.ts` — import and add `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`
- `src/goal/dto/create-goal.dto.ts` — add `@ApiProperty()` with examples and descriptions
- `src/goal/dto/list-goals-query.dto.ts` — add `@ApiPropertyOptional()` with defaults and descriptions
- `src/intake/dto/submit-answers.dto.ts` — add `@ApiProperty()` and `@ApiPropertyOptional()` with examples and descriptions

**Files NOT to touch:**

- `src/app.module.ts` — Swagger is NOT a module import (configured in `main.ts`)
- `src/goal/goal.service.ts` — no business logic changes
- `src/intake/intake.service.ts` — no business logic changes
- `src/intake/intake-prompt.service.ts` — no changes
- `src/intake/intake-quality.service.ts` — no changes
- `src/config/app.config.ts` — no Swagger config here
- `src/common/guards/auth.guard.ts` — no changes
- `src/common/decorators/user.decorator.ts` — no changes
- Any `*.service.spec.ts` files — service tests are unaffected
- `src/app.module.spec.ts` — no module changes
- `package-lock.json` — auto-updated by npm install (don't manually edit)

**No database migrations needed.** Swagger is purely application-level documentation.

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test impact analysis:** Swagger decorators are metadata-only — they have ZERO impact on runtime behavior. All existing tests should pass without any modifications because:
- Controller unit tests don't render Swagger UI
- Service unit tests don't interact with HTTP metadata
- `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiProperty` are all passive metadata decorators
- The CLI plugin only runs at build time, not during `ts-jest` test execution

**Manual verification:** After implementation, start the dev server (`npm run start:dev`) and verify:
- `http://localhost:3000/docs` loads Swagger UI
- All 8 endpoints are listed under correct tags (Goals, Intake)
- Bearer auth lock icon appears on all endpoints
- Clicking "Try it out" shows correct request bodies from DTO schemas
- Response status codes are documented for each endpoint

**Test count:** 0 new tests. ~195 existing tests must continue to pass.

**Important note about CLI plugin and tests:** The Swagger CLI plugin runs during `nest build` (tsc compilation), NOT during Jest test runs. Jest uses `ts-jest` which doesn't process NestJS CLI plugins. This means:
- Tests won't see auto-generated `@ApiProperty()` metadata — that's fine, tests don't need it
- Explicit `@ApiProperty()` decorators on DTOs are visible in tests (they're real decorators)
- No test configuration changes needed

### Previous Story Intelligence

**From Story 3.3 (Rate Limiting):**
- Total tests: 195 (this story should maintain that count)
- `@Throttle()` decorators already on `IntakeController.getNextBatch` and `IntakeController.submitBatch` — Swagger decorators go alongside these
- `appConfig` is already imported in `IntakeController` — no new config imports needed there
- `APP_GUARD` pattern established — Swagger doesn't use guards, so no interaction

**From the architecture document:**
- "API Documentation: Swagger/OpenAPI via `@nestjs/swagger`" — explicitly decided
- "Auto-generated from decorators. Interactive docs for the mobile client developer."
- "Add `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to controllers"
- Implementation priority: "Swagger decorators — can be added incrementally as endpoints are built" (now being done all at once since all endpoints exist)

**From previous stories' controller patterns:**
- `GoalController` has 5 methods: `create`, `findAll`, `getGoalProfile`, `findOne`, `delete`
- `IntakeController` has 3 methods: `getNextBatch`, `submitBatch`, `retryProfile`
- Both use `@UseGuards(AuthGuard)` at controller level — `@ApiBearerAuth()` goes alongside this
- Route ordering in `GoalController`: `:goalId/profile` MUST come before `:goalId` to avoid route conflicts (already correct)

**Endpoint summary for Swagger documentation:**

| Method | Route | Tag | Operation Summary |
|---|---|---|---|
| POST | /api/goals | Goals | Create a new goal |
| GET | /api/goals | Goals | List all goals for the authenticated user |
| GET | /api/goals/:goalId | Goals | Get a single goal by ID |
| GET | /api/goals/:goalId/profile | Goals | Get the AI-generated goal profile |
| DELETE | /api/goals/:goalId | Goals | Delete a goal (restricted by status) |
| GET | /api/goals/:goalId/intake/next-batch | Intake | Get the next unanswered intake batch |
| POST | /api/goals/:goalId/intake/submit-batch | Intake | Submit answers for the current batch |
| POST | /api/goals/:goalId/intake/retry-profile | Intake | Retry failed profile generation |

**Error response format (documented by Swagger but NOT changed):**
```json
{
  "statusCode": 400,
  "message": "Validation error message",
  "error": "Bad Request"
}
```

### What NOT to build

- No custom Swagger themes or UI customization
- No response DTO classes — services return plain objects from Supabase. Documenting exact response shapes would require creating response DTOs that aren't used by the app. The CLI plugin + `@ApiResponse({ description })` is sufficient for MVP.
- No `@ApiExtraModels()` — not needed without explicit response DTOs
- No separate OpenAPI JSON/YAML export endpoint — Swagger UI serves the spec at `/docs-json` automatically
- No API versioning in the Swagger config — no versioning for v1 per PRD
- No Swagger configuration in `app.config.ts` — it's bootstrap-time setup, not runtime config
- No `@ApiExcludeEndpoint()` or `@ApiExcludeController()` — all endpoints should be documented
- No test changes — decorators are metadata-only

### Project Structure Notes

- All changes are in existing files — no new directories or files created
- `SwaggerModule.setup('docs', ...)` registers at the Express level, independent of NestJS `/api` prefix
- The CLI plugin in `nest-cli.json` affects `nest build` compilation only — no impact on `ts-jest` test runs
- Decorator stacking order on controller methods: NestJS decorators first (`@Get`, `@Post`, `@HttpCode`), then Swagger decorators (`@ApiOperation`, `@ApiResponse`), then Throttle if applicable — but order doesn't matter functionally

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4 — API Documentation with Swagger]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Swagger/OpenAPI via @nestjs/swagger]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Add @ApiTags, @ApiOperation, @ApiResponse decorators]
- [Source: _bmad-output/planning-artifacts/architecture.md#Additional Requirements — API Documentation: Swagger/OpenAPI via @nestjs/swagger]
- [Source: _bmad-output/planning-artifacts/prd.md#Endpoint Specification — 10 endpoints listed]
- [Source: _bmad-output/planning-artifacts/prd.md#Error Codes — 400, 401, 404, 409, 429]
- [Source: _bmad-output/planning-artifacts/prd.md#Authentication Model — Supabase Auth with JWT Bearer tokens]
- [Source: src/main.ts — Current bootstrap: global prefix, CORS, ValidationPipe]
- [Source: src/goal/goal.controller.ts — 5 endpoints: create, findAll, getGoalProfile, findOne, delete]
- [Source: src/intake/intake.controller.ts — 3 endpoints: getNextBatch, submitBatch, retryProfile]
- [Source: src/goal/dto/create-goal.dto.ts — title (string, required, max 200), description (string, required)]
- [Source: src/goal/dto/list-goals-query.dto.ts — limit (int, optional, 1-100, default 20), offset (int, optional, min 0, default 0)]
- [Source: src/intake/dto/submit-answers.dto.ts — answers array of AnswerDto (question_id, answer_text?, answer_numeric?, selected_options?)]
- [Source: nest-cli.json — Current compiler options, plugins array to be added]
- [Source: @nestjs/swagger v11.2.6 — Latest stable for NestJS 11, CLI plugin, DocumentBuilder, SwaggerModule.setup()]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered. All changes are purely additive decorators — zero runtime behavior changes.

### Completion Notes List

- Installed `@nestjs/swagger` v11.2.6 as a dependency
- Configured Swagger CLI plugin in `nest-cli.json` with `classValidatorShim` and `introspectComments`
- Configured `SwaggerModule` in `main.ts` with DocumentBuilder (title, description, version, Bearer auth) and setup at `/docs`
- Decorated `GoalController` (5 endpoints) with `@ApiTags('Goals')`, `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`
- Decorated `IntakeController` (3 endpoints) with `@ApiTags('Intake')`, `@ApiBearerAuth()`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`
- Added `@ApiProperty()`/`@ApiPropertyOptional()` with descriptions and examples to `CreateGoalDto`, `ListGoalsQueryDto`, `AnswerDto`, `SubmitAnswersDto`
- All 195 existing tests pass with zero regressions

### Change Log

- 2026-02-12: Implemented API documentation with Swagger — installed `@nestjs/swagger`, configured CLI plugin, added Swagger setup in main.ts, decorated all controllers and DTOs

### File List

- `package.json` (modified — added `@nestjs/swagger` dependency)
- `package-lock.json` (modified — auto-updated by npm install)
- `nest-cli.json` (modified — added Swagger CLI plugin config)
- `src/main.ts` (modified — added SwaggerModule and DocumentBuilder configuration)
- `src/goal/goal.controller.ts` (modified — added Swagger decorators)
- `src/intake/intake.controller.ts` (modified — added Swagger decorators)
- `src/goal/dto/create-goal.dto.ts` (modified — added @ApiProperty decorators)
- `src/goal/dto/list-goals-query.dto.ts` (modified — added @ApiPropertyOptional decorators)
- `src/intake/dto/submit-answers.dto.ts` (modified — added @ApiProperty/@ApiPropertyOptional decorators)
