# Story 2.4: Intake Completion and Goal Profile Generation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want the system to generate a comprehensive coaching profile when my intake is complete,
So that I receive personalized coaching based on everything I've shared.

## Acceptance Criteria

1. **Given** a user submitting answers for the final batch (AI signals `is_complete: true` in the `generateNextBatch` response OR batch 7 is reached) **When** `POST /api/goals/:goalId/intake/submit-batch` is called **Then** answers are persisted (Transaction 1) **And** the system transitions goal status from `intake_in_progress` to `profile_generating` **And** the system calls `IntakePromptService.generateGoalProfile()` to generate a structured goal profile with sections: `current_state`, `desired_state`, `constraints`, `motivation`, `domain_context` plus `narrative_summary` (FR24, FR25, FR30) **And** the profile is stored in a new `goal_profiles` table with RLS policies **And** on successful profile generation, goal status transitions to `intake_completed` (FR9) **And** the response is `{ submitted_batch: { batch_id, batch_number }, is_complete: true, profile_id: "<uuid>" }`

2. **Given** profile generation fails (AI call throws or returned profile fails validation) **When** the failure is caught during `submitBatch` **Then** the goal status transitions to `profile_generation_failed` (FR9) **And** `profile_generation_attempts` is incremented to 1 **And** answers are still persisted (Transaction 1 already committed — FR28) **And** the response is `{ submitted_batch: { batch_id, batch_number }, is_complete: true, profile_id: null, profile_status: "profile_generation_failed" }`

3. **Given** the AI-generated profile JSON is returned **When** profile validation runs **Then** the system verifies the profile contains all required sections: `current_state` (string), `desired_state` (string), `constraints` (string), `motivation` (string), `domain_context` (string), and `narrative_summary` (string) (FR25) **And** all sections must be non-empty strings **And** an invalid profile triggers a single retry, then transitions to `profile_generation_failed` if still invalid

4. **Given** an authenticated user with a goal in `intake_completed` or `active` status **When** `GET /api/goals/:goalId/profile` is called **Then** the system returns the structured goal profile with all sections and narrative summary (FR29, FR30) **And** the response includes `profile_data` (structured JSON) and `narrative_summary` (text)

5. **Given** a goal where intake is not yet complete (status is not `intake_completed` or `active`) **When** `GET /api/goals/:goalId/profile` is called **Then** the system returns 404 (FR31)

6. **Given** the intake completion flow during `submitBatch` **When** the system determines intake is complete **Then** the system enforces the batch budget: intake targets completion in 3-5 batches with hard cap at 7 (FR16) **And** the batch count is verified against `appConfig.intake.maxBatches` before profile generation

7. **Given** a goal where `getNextBatch()` returns `is_complete: true` (all batches answered + AI signals completion) **When** the system detects intake is complete via `getNextBatch` **Then** the system also triggers profile generation (not just from `submitBatch`) **And** the response is `{ batch_id: null, batch_number: null, is_complete: true, profile_id: "<uuid>" }` or `{ ..., profile_id: null, profile_status: "profile_generation_failed" }` if generation fails

## Tasks / Subtasks

- [x] Task 1: Create `goal_profiles` database table via migration (AC: #1)
  - [x] 1.1 Create `goal_profiles` table with columns: `id` (uuid, PK, default `gen_random_uuid()`), `goal_id` (uuid, FK to `goals.id`, UNIQUE), `user_id` (uuid, FK to `auth.users.id`), `profile_data` (jsonb, NOT NULL), `narrative_summary` (text, NOT NULL), `embedded` (boolean, default `false`), `created_at` (timestamptz, default `now()`)
  - [x] 1.2 Add RLS policy: `SELECT` where `(select auth.uid()) = user_id`
  - [x] 1.3 Add RLS policy: `INSERT` where `(select auth.uid()) = user_id`
  - [x] 1.4 Add index `idx_goal_profiles_goal_id` on `goal_id`
  - [x] 1.5 Add index `idx_goal_profiles_user_id` on `user_id`
- [x] Task 2: Add `generateGoalProfile()` to IntakePromptService (AC: #1, #3)
  - [x] 2.1 Define `GoalProfile` interface: `{ current_state: string, desired_state: string, constraints: string, motivation: string, domain_context: string, narrative_summary: string }`
  - [x] 2.2 Add `generateGoalProfile(goalDescription: string, priorBatches: PriorBatchContext[]): Promise<GoalProfile>` method
  - [x] 2.3 Build system prompt: role definition (goal profile synthesizer), output JSON schema with required sections, instructions to synthesize all intake Q&A into structured coaching profile
  - [x] 2.4 Build user prompt: include goal description and ALL prior Q&A pairs from all batches
  - [x] 2.5 Call `this.aiService.generateJSON<GoalProfile>()` with system + user prompts
- [x] Task 3: Add `validateGoalProfile()` to IntakeQualityService (AC: #3)
  - [x] 3.1 Implement `validateGoalProfile(profile: unknown): { valid: boolean, errors: string[] }` — verifies: is object, has all 6 required keys (`current_state`, `desired_state`, `constraints`, `motivation`, `domain_context`, `narrative_summary`), all values are non-empty strings
- [x] Task 4: Add profile generation flow to IntakeService (AC: #1, #2, #3, #6)
  - [x] 4.1 Add private method `generateAndStoreProfile(userId: string, goalId: string, goalDescription: string): Promise<{ profile_id: string | null, profile_status: string }>` that: loads prior batch context, calls `intakePromptService.generateGoalProfile()`, validates profile, retries once on validation failure, stores in `goal_profiles` on success
  - [x] 4.2 In `generateAndStoreProfile`: before calling AI, transition goal status to `profile_generating` (update `goals` table)
  - [x] 4.3 In `generateAndStoreProfile`: on success, insert profile into `goal_profiles`, transition goal status to `intake_completed`, return `{ profile_id: <id>, profile_status: 'intake_completed' }`
  - [x] 4.4 In `generateAndStoreProfile`: on failure (AI error or validation failure after retry), increment `profile_generation_attempts`, transition goal status to `profile_generation_failed`, return `{ profile_id: null, profile_status: 'profile_generation_failed' }`
  - [x] 4.5 Wrap entire `generateAndStoreProfile` in try/catch — on any error, log it, transition goal to `profile_generation_failed`, return failure result
- [x] Task 5: Modify `submitBatch()` in IntakeService to trigger profile generation on completion (AC: #1, #2, #6)
  - [x] 5.1 In the Transaction 2 block, when `generated.is_complete === true`: instead of just returning `{ submitted_batch, is_complete: true }`, call `generateAndStoreProfile(userId, goalId, goal.description)` and include profile result in response
  - [x] 5.2 Update return format to `{ submitted_batch, is_complete: true, profile_id, profile_status }` when intake completes
  - [x] 5.3 Ensure profile generation failure does NOT lose the `is_complete` signal — the response always includes `is_complete: true`
- [x] Task 6: Modify `generateAndStoreNextBatch()` in IntakeService to trigger profile generation on completion (AC: #7)
  - [x] 6.1 When `generated.is_complete === true` in `generateAndStoreNextBatch()`: call `generateAndStoreProfile()` instead of returning the bare `is_complete` response
  - [x] 6.2 Note: `generateAndStoreNextBatch` is called from `getNextBatch()` — need to pass `userId` through (currently only has `goalId` and `goalDescription`)
  - [x] 6.3 Update `generateAndStoreNextBatch` signature to accept `userId` parameter
  - [x] 6.4 Update `getNextBatch()` to pass `userId` to `generateAndStoreNextBatch()`
- [x] Task 7: Add `getGoalProfile()` to GoalService (AC: #4, #5)
  - [x] 7.1 Add `getGoalProfile(userId: string, goalId: string)` method: query `goal_profiles` table where `goal_id = goalId` and `user_id = userId`
  - [x] 7.2 If no profile found, throw `NotFoundException('Profile not found')`
  - [x] 7.3 Also verify goal status is `intake_completed` or `active` before querying — throw `NotFoundException` if not (FR31)
  - [x] 7.4 Return the profile object with `profile_data` and `narrative_summary`
- [x] Task 8: Add `GET /api/goals/:goalId/profile` endpoint to GoalController (AC: #4, #5)
  - [x] 8.1 Add `@Get(':goalId/profile')` handler that calls `goalService.getGoalProfile(userId, goalId)`
  - [x] 8.2 Protected by `@UseGuards(AuthGuard)` (already class-level on GoalController)
- [x] Task 9: Unit tests (AC: #1-#7)
  - [x] 9.1 IntakePromptService `generateGoalProfile`: calls AiService.generateJSON with system and user prompts containing all Q&A context
  - [x] 9.2 IntakePromptService `generateGoalProfile`: system prompt specifies required profile sections
  - [x] 9.3 IntakeQualityService `validateGoalProfile`: passes valid profile with all 6 sections
  - [x] 9.4 IntakeQualityService `validateGoalProfile`: fails when a section is missing
  - [x] 9.5 IntakeQualityService `validateGoalProfile`: fails when a section is empty string
  - [x] 9.6 IntakeQualityService `validateGoalProfile`: fails when profile is not an object
  - [x] 9.7 IntakeService `submitBatch`: triggers profile generation when AI signals is_complete
  - [x] 9.8 IntakeService `submitBatch`: returns profile_id on successful generation
  - [x] 9.9 IntakeService `submitBatch`: transitions goal to profile_generation_failed on AI failure
  - [x] 9.10 IntakeService `submitBatch`: increments profile_generation_attempts on failure
  - [x] 9.11 IntakeService `submitBatch`: retries profile generation once on validation failure
  - [x] 9.12 IntakeService `submitBatch`: answers preserved even when profile generation fails
  - [x] 9.13 IntakeService `generateAndStoreNextBatch`: triggers profile generation when is_complete from getNextBatch path
  - [x] 9.14 GoalService `getGoalProfile`: returns profile when goal is intake_completed
  - [x] 9.15 GoalService `getGoalProfile`: returns profile when goal is active
  - [x] 9.16 GoalService `getGoalProfile`: throws 404 when goal is intake_in_progress
  - [x] 9.17 GoalService `getGoalProfile`: throws 404 when profile not found
  - [x] 9.18 GoalController: GET /api/goals/:goalId/profile routes to getGoalProfile

## Dev Notes

### Developer Context

**What this story builds:** The culmination of the intake flow — when a user has answered enough batches, the system synthesizes all their answers into a structured coaching profile. This is the core output of the entire intake system and the input for the future coaching engine.

**This story hooks into the existing `is_complete` signal from Story 2.3.** Currently, when the AI signals `is_complete: true` (or batch 7 is reached), `submitBatch()` returns `{ submitted_batch, is_complete: true }` and `getNextBatch()` returns `{ batch_id: null, batch_number: null, is_complete: true, questions: [] }`. This story intercepts both of those completion points to trigger profile generation before returning the response.

**Three things happen on intake completion (in order):**
1. Goal status transitions: `intake_in_progress` → `profile_generating`
2. AI generates a structured goal profile from all prior Q&A
3. Goal status transitions: `profile_generating` → `intake_completed` (success) or `profile_generation_failed` (failure)

**Key insight — profile generation is synchronous for this story.** The user waits for the profile to be generated before getting the response. This is different from the async patterns used in Stories 2.5/2.6 (embedding, quality scoring). NFR3 allows up to 30 seconds for this (AI call timeout), so it's acceptable to block the response.

**This is the FIRST story that creates a new database table (`goal_profiles`).** Previous stories used pre-existing tables. You MUST create the migration via `apply_migration` Supabase MCP tool.

**This is the FIRST story that adds an endpoint to GoalController.** The `GET /api/goals/:goalId/profile` endpoint lives on GoalController (not IntakeController) because it's a read endpoint for a goal resource, consistent with the architecture doc's endpoint table.

**Existing code you MUST understand before starting:**

- `src/intake/intake.service.ts` — 643 lines. Two completion points to modify:
  1. `submitBatch()` lines 199-203: when `generated.is_complete === true` — currently returns bare `{ submitted_batch, is_complete: true }`. Hook profile generation here.
  2. `generateAndStoreNextBatch()` lines 284-291: when `generated.is_complete === true` from `getNextBatch()` path — currently returns `{ batch_id: null, batch_number: null, is_complete: true, questions: [] }`. Hook profile generation here too.

- `src/intake/intake-prompt.service.ts` — 176 lines. Has `generateNextBatch()` with `PriorBatchContext` interface and prompt builders. **Add `generateGoalProfile()` here** following the same pattern (system prompt + user prompt → `aiService.generateJSON<GoalProfile>()`).

- `src/intake/intake-quality.service.ts` — 171 lines. Has `validateStructural()` and `validateSemantic()` for batch validation. **Add `validateGoalProfile()` here** as a separate validation method (profile validation is simpler — just check required sections are present and non-empty).

- `src/goal/goal.service.ts` — 110 lines. Has `findOne()`, `create()`, `delete()`. **Add `getGoalProfile()` here.** You also need to add a method or allow `IntakeService` to update goal status — but `IntakeService` already directly queries Supabase for status updates (see current code patterns), so it should update `goals` table directly via Supabase admin client.

- `src/goal/goal.controller.ts` — 46 lines. **Add `GET :goalId/profile` endpoint.** Note the route will be `GET /api/goals/:goalId/profile` — using `@Get(':goalId/profile')` decorator.

- `src/config/app.config.ts` — `appConfig.intake.maxProfileRetries` (3) is configured but NOT used in this story. This story only handles the first attempt during intake completion. Story 3.2 adds the retry endpoint.

**Existing database state:**
- `goals` table already has `status` column with CHECK constraint including `profile_generating`, `intake_completed`, and `profile_generation_failed`
- `goals` table already has `profile_generation_attempts` column (integer, default 0)
- `goal_profiles` table does NOT exist yet — you MUST create it via migration

**What NOT to build in this story:**
- No retry endpoint `POST /api/goals/:goalId/intake/retry-profile` (Story 3.2)
- No embedding of profile narrative (Story 2.5)
- No `profile.generated` event emission (Story 2.5)
- No user profile loading for the AI prompt (user profile module doesn't exist yet)
- The `profile_generation_attempts` field is only incremented to 1 on failure in this story. The retry mechanism (checking attempts < maxProfileRetries) is Story 3.2
- No updating goal status to `active` — that's a future lifecycle transition

### Technical Requirements

**Database migration for `goal_profiles` table:**

```sql
CREATE TABLE goal_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  profile_data jsonb NOT NULL,
  narrative_summary text NOT NULL,
  embedded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_goal_profile UNIQUE (goal_id)
);

ALTER TABLE goal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goal profiles"
  ON goal_profiles FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own goal profiles"
  ON goal_profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX idx_goal_profiles_goal_id ON goal_profiles(goal_id);
CREATE INDEX idx_goal_profiles_user_id ON goal_profiles(user_id);
```

**CRITICAL:** The `goal_id` has a UNIQUE constraint — one profile per goal. The `ON DELETE CASCADE` ensures profile is deleted when goal is deleted. The `user_id` column is needed for RLS policies.

**AI Prompt Design for `generateGoalProfile()` — profile synthesis:**

System prompt:
```
You are a coaching profile synthesizer. Your job is to analyze all intake responses and create a comprehensive, structured coaching profile.

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "current_state": "A detailed assessment of the user's current situation, resources, skills, and starting point relevant to their goal.",
  "desired_state": "A clear description of what success looks like — the end state the user wants to reach.",
  "constraints": "Time, financial, physical, or situational constraints that limit the user's options or pace.",
  "motivation": "What drives the user — their why, their emotional connection to this goal, and what keeps them going.",
  "domain_context": "Relevant domain knowledge — the specific field, area, or discipline of their goal and what matters in it.",
  "narrative_summary": "A 2-3 paragraph narrative that weaves together the above sections into a coherent coaching profile. Written in second person ('you') as if speaking to the user."
}

RULES:
- Every section MUST be a non-empty string.
- Draw from ALL intake responses — do not ignore any answers.
- Be specific and concrete — reference actual details from the user's responses.
- The narrative_summary should feel personal and insightful, not generic.
- Do NOT include any information not supported by the intake responses.
- Each structured section (current_state, desired_state, constraints, motivation, domain_context) should be 2-5 sentences.
```

User prompt:
```
GOAL: {goal.description}

COMPLETE INTAKE RESPONSES:
{for each batch, formatted as:}
--- Batch {n} ---
Q: {question_text} ({question_type})
A: {formatted answer}
{end for each}

Synthesize all the above into a comprehensive coaching profile.
```

**Profile validation rules:**

```typescript
validateGoalProfile(profile: unknown): { valid: boolean, errors: string[] } {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profile is not an object'] };
  }

  const required = ['current_state', 'desired_state', 'constraints', 'motivation', 'domain_context', 'narrative_summary'];
  const errors: string[] = [];

  for (const key of required) {
    if (!(key in profile)) {
      errors.push(`Missing required section: ${key}`);
    } else if (typeof profile[key] !== 'string' || profile[key].trim() === '') {
      errors.push(`Section ${key} must be a non-empty string`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**Profile generation flow in IntakeService:**

```
1. Transition goal status: intake_in_progress → profile_generating
2. Load all prior batch context (reuse loadPriorBatchContext)
3. Call intakePromptService.generateGoalProfile(goalDescription, priorBatches)
4. Validate profile via intakeQualityService.validateGoalProfile()
5. If invalid: retry once (same as batch validation pattern)
6. If still invalid after retry:
   - Increment profile_generation_attempts
   - Transition goal status: profile_generating → profile_generation_failed
   - Return { profile_id: null, profile_status: 'profile_generation_failed' }
7. If valid:
   - Insert into goal_profiles table
   - Transition goal status: profile_generating → intake_completed
   - Return { profile_id: <id>, profile_status: 'intake_completed' }
```

**Goal status transition helper (add to IntakeService):**

```typescript
private async updateGoalStatus(goalId: string, status: string): Promise<void> {
  const supabase = this.supabaseService.getAdminClient();
  const { error } = await supabase
    .from('goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', goalId);

  if (error) {
    this.logger.error(`Failed to update goal ${goalId} status to ${status}: ${error.message}`);
    throw new Error(`Failed to update goal status: ${error.message}`);
  }
  this.logger.log(`Goal ${goalId} status updated to ${status}`);
}
```

**Response format changes:**

`submitBatch` when intake completes successfully:
```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 5
  },
  "is_complete": true,
  "profile_id": "uuid",
  "profile_status": "intake_completed"
}
```

`submitBatch` when profile generation fails:
```json
{
  "submitted_batch": {
    "batch_id": "uuid",
    "batch_number": 5
  },
  "is_complete": true,
  "profile_id": null,
  "profile_status": "profile_generation_failed"
}
```

`getNextBatch` when intake completes (via `generateAndStoreNextBatch`):
```json
{
  "batch_id": null,
  "batch_number": null,
  "is_complete": true,
  "questions": [],
  "profile_id": "uuid",
  "profile_status": "intake_completed"
}
```

`GET /api/goals/:goalId/profile` response:
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "profile_data": {
    "current_state": "...",
    "desired_state": "...",
    "constraints": "...",
    "motivation": "...",
    "domain_context": "..."
  },
  "narrative_summary": "...",
  "created_at": "2026-02-08T..."
}
```

### Architecture Compliance

**Module structure:** No new modules. Extend existing `IntakeModule` and `GoalModule`.

**Service boundaries (STRICT):**
- `IntakeService` — orchestrates profile generation: calls IntakePromptService → validates via IntakeQualityService → stores profile + updates goal status. The `generateAndStoreProfile()` private method is the new entrypoint.
- `IntakePromptService` — add `generateGoalProfile()` method. Owns prompt construction and AI call for profile synthesis. Reuses `PriorBatchContext` interface.
- `IntakeQualityService` — add `validateGoalProfile()` method. Pure validation of profile structure.
- `GoalService` — add `getGoalProfile()` method. Owns reading from `goal_profiles` table.
- `GoalController` — add `GET :goalId/profile` endpoint. Delegates to `GoalService.getGoalProfile()`.

**Who writes to `goal_profiles`?**
- `IntakeService` writes (creates profile after intake completion)
- `GoalService` reads (serves profile to client via GET endpoint)
- This follows the architecture doc pattern: `goal_profiles` table — Owner (write): IntakeService, Reader: GoalService

**Who updates `goals.status`?**
- `IntakeService` updates status during profile generation flow (`intake_in_progress` → `profile_generating` → `intake_completed` / `profile_generation_failed`)
- This is consistent with Story 2.3 where `IntakeService` manages the intake lifecycle

**Error handling:**
- Profile generation failures: caught, logged, goal transitions to `profile_generation_failed`, response includes `profile_id: null`
- Profile generation NEVER blocks the `is_complete` signal — user always knows intake is done
- Supabase errors during profile insert: caught, logged, same failure pattern
- AI call errors: caught via try/catch, single retry, then failure
- All errors use NestJS Logger, never `console.log`

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** `snake_case` field names everywhere (`profile_data`, `narrative_summary`, `profile_id`, `profile_status`).

**RLS pattern:** Use `(select auth.uid())` (NOT `auth.uid()`) in RLS policies for query-plan optimization.

**Admin client pattern:** Use `this.supabaseService.getAdminClient()` for all server-side operations. Since IntakeService uses admin client, it MUST include `user_id` when inserting into `goal_profiles` (admin client bypasses RLS, so the `user_id` must be explicitly set).

### Library & Framework Requirements

**No new dependencies needed.** Everything required is already installed:

- `@nestjs/common` — `Injectable`, `Logger`, `NotFoundException`, `InternalServerErrorException`
- `openai` — already used by AiService (do NOT import directly)
- `src/ai/ai.service.ts` — `AiService.generateJSON<T>()` — the only AI interface

**AiService usage pattern for profile generation:**

```typescript
// In IntakePromptService
async generateGoalProfile(
  goalDescription: string,
  priorBatches: PriorBatchContext[],
): Promise<GoalProfile> {
  const systemPrompt = this.buildProfileSystemPrompt();
  const userPrompt = this.buildProfileUserPrompt(goalDescription, priorBatches);

  return this.aiService.generateJSON<GoalProfile>(systemPrompt, userPrompt);
}
```

**Supabase insert pattern for goal_profiles:**

```typescript
const supabase = this.supabaseService.getAdminClient();

const { data: profile, error } = await supabase
  .from('goal_profiles')
  .insert({
    goal_id: goalId,
    user_id: userId,
    profile_data: {
      current_state: validatedProfile.current_state,
      desired_state: validatedProfile.desired_state,
      constraints: validatedProfile.constraints,
      motivation: validatedProfile.motivation,
      domain_context: validatedProfile.domain_context,
    },
    narrative_summary: validatedProfile.narrative_summary,
  })
  .select()
  .single();
```

**CRITICAL: Separate `profile_data` from `narrative_summary` when storing.** The `profile_data` column stores the structured JSON object with 5 sections. The `narrative_summary` column stores the plain text summary. The AI returns all 6 fields as a flat object — you split them when inserting.

**Supabase query pattern for reading profile:**

```typescript
const supabase = this.supabaseService.getAdminClient();

const { data: profile, error } = await supabase
  .from('goal_profiles')
  .select('id, goal_id, profile_data, narrative_summary, created_at')
  .eq('goal_id', goalId)
  .eq('user_id', userId)
  .single();
```

**Goal status update pattern:**

```typescript
const { error } = await supabase
  .from('goals')
  .update({
    status: 'profile_generating',
    updated_at: new Date().toISOString(),
  })
  .eq('id', goalId);
```

Note: The `goals` table already has a CHECK constraint on `status` that includes all the values we need (`intake_in_progress`, `profile_generating`, `intake_completed`, `profile_generation_failed`). No migration needed for the goals table.

### File Structure Requirements

**Files to CREATE:**

None — no new source files. All changes go into existing files.

**Files to MODIFY:**

- `src/intake/intake-prompt.service.ts` — add `GoalProfile` interface, `generateGoalProfile()` method, `buildProfileSystemPrompt()`, `buildProfileUserPrompt()` private methods
- `src/intake/intake-quality.service.ts` — add `validateGoalProfile()` method
- `src/intake/intake.service.ts` — add `generateAndStoreProfile()` private method, `updateGoalStatus()` private method, modify `submitBatch()` completion path, modify `generateAndStoreNextBatch()` completion path + signature to accept `userId`
- `src/goal/goal.service.ts` — add `getGoalProfile()` method
- `src/goal/goal.controller.ts` — add `@Get(':goalId/profile')` endpoint
- `src/intake/intake-prompt.service.spec.ts` — add tests for `generateGoalProfile()`
- `src/intake/intake-quality.service.spec.ts` — add tests for `validateGoalProfile()`
- `src/intake/intake.service.spec.ts` — add tests for profile generation flow
- `src/goal/goal.service.spec.ts` — add tests for `getGoalProfile()`
- `src/goal/goal.controller.spec.ts` — add test for profile endpoint

**Files NOT to touch:**

- `src/ai/ai.service.ts` — AiService is stable, use as-is
- `src/supabase/*` — Global module, use as-is
- `src/config/app.config.ts` — Read config values, don't modify
- `src/app.module.ts` — No module changes needed
- `src/intake/intake.controller.ts` — No changes needed (profile endpoint is on GoalController)
- `src/intake/intake.module.ts` — No changes needed (IntakeQualityService already registered)
- `src/intake/dto/submit-answers.dto.ts` — No changes needed
- `src/goal/goal.module.ts` — No changes needed (GoalService is already provided and exported)

**Database migration needed:**
- `goal_profiles` table — apply via Supabase MCP `apply_migration` tool (not local migration files)

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**IntakePromptService tests — add to `intake-prompt.service.spec.ts`:**

```
describe('IntakePromptService')
  describe('generateGoalProfile')
    ✓ calls AiService.generateJSON with system and user prompts
    ✓ system prompt specifies all 6 required profile sections
    ✓ user prompt includes goal description and all prior Q&A
    ✓ propagates AiService errors (does not catch them)
```

**IntakeQualityService tests — add to `intake-quality.service.spec.ts`:**

```
describe('IntakeQualityService')
  describe('validateGoalProfile')
    ✓ passes valid profile with all 6 non-empty sections
    ✓ fails when profile is not an object (null, string, array)
    ✓ fails when a required section is missing
    ✓ fails when a section is an empty string
    ✓ fails when a section is not a string (number, boolean)
    ✓ returns all errors when multiple sections are invalid
```

**IntakeService tests — add to existing `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('submitBatch — profile generation on completion')
    ✓ transitions goal to profile_generating then intake_completed when AI signals is_complete
    ✓ returns profile_id and profile_status in response
    ✓ stores profile with correct profile_data (5 sections) and narrative_summary (separate column)
    ✓ transitions goal to profile_generation_failed when AI profile generation throws
    ✓ increments profile_generation_attempts on failure
    ✓ retries profile generation once on validation failure
    ✓ returns is_complete: true even when profile generation fails
    ✓ answers are preserved (Transaction 1) when profile generation fails
  describe('generateAndStoreNextBatch — profile generation on completion')
    ✓ triggers profile generation when is_complete via getNextBatch path
    ✓ returns profile_id in is_complete response
    ✓ handles profile generation failure gracefully from getNextBatch path
```

**GoalService tests — add to `goal.service.spec.ts`:**

```
describe('GoalService')
  describe('getGoalProfile')
    ✓ returns profile when goal status is intake_completed
    ✓ returns profile when goal status is active
    ✓ throws NotFoundException when goal status is intake_in_progress
    ✓ throws NotFoundException when goal status is profile_generating
    ✓ throws NotFoundException when no profile exists for goal
```

**GoalController tests — add to `goal.controller.spec.ts`:**

```
describe('GoalController')
  describe('getGoalProfile')
    ✓ GET /api/goals/:goalId/profile routes to goalService.getGoalProfile
```

**Mock patterns (extend established patterns from Story 2.2/2.3 tests):**

- Mock `AiService.generateJSON` — return a valid `GoalProfile` object or throw error
- Mock `IntakeQualityService.validateGoalProfile` — return `{ valid: true }` or `{ valid: false, errors: [...] }`
- Mock `IntakePromptService.generateGoalProfile` — return valid profile or throw
- Mock Supabase insert for `goal_profiles` — return `{ data: { id: 'uuid', ... }, error: null }`
- Mock Supabase update for `goals` (status transition) — return `{ error: null }`
- Reuse existing chainable Supabase mock pattern from Stories 2.1-2.3

**Test count:** ~22 new tests across 5 files (4 prompt + 6 quality + 11 intake + 5 goal service + 1 goal controller).

**Testing the status transition sequence:**
The profile generation flow makes multiple Supabase calls in sequence:
1. `goals.update({ status: 'profile_generating' })`
2. `goal_profiles.insert(...)` (on success)
3. `goals.update({ status: 'intake_completed' })` (on success)

Or on failure:
1. `goals.update({ status: 'profile_generating' })`
2. AI call fails or validation fails after retry
3. `goals.update({ status: 'profile_generation_failed', profile_generation_attempts: 1 })`

Mock ordering is CRITICAL — each test must carefully mock the exact Supabase call sequence.

### Previous Story Intelligence

**From Story 2.3 (immediately prior, current codebase state):**

- The `is_complete` signal is already handled in two places — both need modification:
  1. `submitBatch()` at lines 199-203: returns bare `{ submitted_batch, is_complete: true }`
  2. `generateAndStoreNextBatch()` at lines 284-291: returns bare `{ batch_id: null, ..., is_complete: true, questions: [] }`
- `generateAndStoreNextBatch()` currently takes `(goalId, goalDescription, nextBatchNumber)` — you need to add `userId` parameter for profile generation (profile insert needs `user_id`)
- `loadPriorBatchContext(goalId)` is already a private helper — reuse it for profile generation prompts
- Retry pattern established: generate → validate → if invalid, retry once → if still invalid, degrade. Use the same pattern for profile generation.
- `IntakeQualityService` is already injected into `IntakeService` — no wiring changes needed
- `IntakePromptService` already has `AiService` injection — no wiring changes needed

**From Stories 2.1/2.2 (earlier codebase patterns):**

- The `createFirstBatch()` and `storeGeneratedBatch()` patterns show how to insert rows and return results. Use the same pattern for profile insertion.
- Answer validation in `submitBatch()` ensures all answers are validated before Transaction 1. Profile generation happens after Transaction 1 — so even if profile fails, answers are safe.
- `goal.description` is already fetched at line 75 of `submitBatch()` — reuse it for the profile prompt.

**Debug issues from previous stories to AVOID:**
- When multiple Supabase calls happen in sequence (status update → profile insert → status update), carefully order mock responses in tests. Use `mockReturnValueOnce` for each call in sequence.
- The `userId` parameter needs to flow from the controller through `getNextBatch()` → `generateAndStoreNextBatch()` → `generateAndStoreProfile()`. Make sure the parameter chain is complete.
- When testing profile generation failure, ensure the test verifies that the goal status ends up as `profile_generation_failed` (not stuck at `profile_generating`).

### Project Structure Notes

- `goal_profiles` table follows architecture doc's data boundaries: IntakeService writes, GoalService reads
- Profile endpoint `GET /api/goals/:goalId/profile` lives on GoalController per architecture doc's endpoint table (not IntakeController)
- No new modules or files needed — all changes extend existing services
- `GoalProfile` interface defined in `intake-prompt.service.ts` alongside existing `GeneratedQuestion` and `PriorBatchContext` interfaces
- Profile generation uses the same `AiService.generateJSON<T>()` pattern as batch generation

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4 — FR16, FR24, FR25, FR29, FR30, FR31]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Submit Batch — Transaction 1 + Profile Generation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — IntakeService writes goal_profiles, GoalService reads]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — goal_profiles: Owner IntakeService, Reader GoalService]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — GET /api/goals/:goalId/profile in GoalController]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Naming, Error Handling, RLS, Supabase Client]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9 — Goal status lifecycle]
- [Source: _bmad-output/planning-artifacts/prd.md#FR16 — Batch budget 3-5 target, 7 cap]
- [Source: _bmad-output/planning-artifacts/prd.md#FR24 — Structured goal profile on completion]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25 — Profile section validation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29 — Retrieve goal profile after completion]
- [Source: _bmad-output/planning-artifacts/prd.md#FR30 — Structured data + narrative summary]
- [Source: _bmad-output/planning-artifacts/prd.md#FR31 — 404 before completion]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR3 — Profile generation within 30s]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR11 — Answers never lost]
- [Source: _bmad-output/implementation-artifacts/2-3-ai-generated-next-batch-with-quality-gates.md — is_complete signal, retry pattern, Transaction 2 flow]
- [Source: src/intake/intake.service.ts — Lines 199-203 (submitBatch completion), Lines 284-291 (generateAndStoreNextBatch completion)]
- [Source: src/intake/intake-prompt.service.ts — PriorBatchContext interface, generateNextBatch pattern, AiService injection]
- [Source: src/intake/intake-quality.service.ts — validateStructural/validateSemantic pattern for batch validation]
- [Source: src/goal/goal.service.ts — findOne pattern, GoalService structure]
- [Source: src/goal/goal.controller.ts — Existing endpoint patterns, class-level AuthGuard]
- [Source: src/config/app.config.ts — intake.maxProfileRetries (3), intake.maxBatches (7)]
- [Source: Supabase project — goals table CHECK constraint includes profile_generating, intake_completed, profile_generation_failed]
- [Source: Supabase project — goals.profile_generation_attempts column already exists (integer, default 0)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All implementations followed existing patterns and passed on first test run after implementation.

### Completion Notes List

- Task 1: Created `goal_profiles` table via Supabase MCP migration with UNIQUE constraint on goal_id, ON DELETE CASCADE from goals, RLS policies using `(select auth.uid())`, and indexes on goal_id and user_id.
- Task 2: Added `GoalProfile` interface and `generateGoalProfile()` method to IntakePromptService with dedicated system prompt (coaching profile synthesizer) and user prompt including all prior Q&A.
- Task 3: Added `validateGoalProfile()` to IntakeQualityService — validates profile is an object with all 6 required non-empty string sections.
- Task 4: Added `generateAndStoreProfile()` and `updateGoalStatus()` private methods plus `handleProfileFailure()` helper to IntakeService. Implements full profile generation flow: status transition to `profile_generating`, AI call with retry on validation failure, profile storage, status transition to `intake_completed` or `profile_generation_failed`.
- Task 5: Modified `submitBatch()` to trigger profile generation when `is_complete` is true (both first attempt and retry paths). Response includes `profile_id` and `profile_status` fields.
- Task 6: Modified `generateAndStoreNextBatch()` to accept `userId` parameter and trigger profile generation when `is_complete` is true. Updated `getNextBatch()` to pass `userId` through.
- Task 7: Added `getGoalProfile()` to GoalService — checks goal status is `intake_completed` or `active` before querying `goal_profiles` table, throws 404 otherwise.
- Task 8: Added `GET :goalId/profile` endpoint to GoalController, placed before `:goalId` wildcard route to avoid routing conflicts.
- Task 9: All 22 new tests added and passing (4 prompt + 8 quality + 9 intake service + 5 goal service + 1 controller). Existing tests updated to account for profile generation on completion paths.
- Full test suite: 130 tests passing, 0 failures, 0 regressions.

### Change Log

- 2026-02-08: Implemented Story 2.4 — Intake Completion and Goal Profile Generation. Created `goal_profiles` table, profile generation AI flow with validation/retry, profile endpoint, and comprehensive test coverage.

### File List

**Database migration (via Supabase MCP):**
- `goal_profiles` table — created via `apply_migration`

**Modified source files:**
- `src/intake/intake-prompt.service.ts` — added `GoalProfile` interface, `generateGoalProfile()`, `buildProfileSystemPrompt()`, `buildProfileUserPrompt()`
- `src/intake/intake-quality.service.ts` — added `validateGoalProfile()` method
- `src/intake/intake.service.ts` — added `generateAndStoreProfile()`, `updateGoalStatus()`, `handleProfileFailure()` private methods; modified `submitBatch()` and `generateAndStoreNextBatch()` completion paths; updated `generateAndStoreNextBatch` signature to accept `userId`
- `src/goal/goal.service.ts` — added `getGoalProfile()` method
- `src/goal/goal.controller.ts` — added `GET :goalId/profile` endpoint, reordered routes for specificity

**Modified test files:**
- `src/intake/intake-prompt.service.spec.ts` — added 4 tests for `generateGoalProfile`
- `src/intake/intake-quality.service.spec.ts` — added 8 tests for `validateGoalProfile`
- `src/intake/intake.service.spec.ts` — added 9 profile generation tests, updated existing completion tests with profile mocks
- `src/goal/goal.service.spec.ts` — added 5 tests for `getGoalProfile`
- `src/goal/goal.controller.spec.ts` — added 1 test for profile endpoint
