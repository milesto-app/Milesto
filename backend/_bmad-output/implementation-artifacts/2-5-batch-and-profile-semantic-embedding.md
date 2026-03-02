# Story 2.5: Batch and Profile Semantic Embedding

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want my intake responses and coaching profile embedded into semantic storage,
So that the system builds rich context for increasingly personalized coaching.

## Acceptance Criteria

1. **Given** a user submits answers for a batch **When** the `batch.answered` event fires **Then** the batch Q&A text is formatted as a single string (question + answer pairs) and embedded via `AiService.generateEmbedding()` **And** the embedding vector and source text are stored in the `goal_context_embeddings` table with `content_type = 'batch'` (FR32) **And** the `goal_context_embeddings` table is created via migration with the pgvector extension enabled **And** embedding uses `text-embedding-3-small` with 1536 dimensions (NFR15) **And** the embedding runs asynchronously via EventEmitter2 with zero impact on user-facing latency (NFR4) **And** the `intake_batches.embedded` status is updated to `true` on success (FR35)

2. **Given** a goal profile is generated **When** the `profile.generated` event fires **Then** the profile narrative summary is embedded via `AiService.generateEmbedding()` and stored in `goal_context_embeddings` with `content_type = 'profile'` (FR33) **And** the `goal_profiles.embedded` status is updated to `true` on success (FR35)

3. **Given** an embedding call fails (AiService throws or OpenRouter returns an error) **When** the event listener catches the error **Then** the `embedded` flag remains `false` on the source record (`intake_batches` or `goal_profiles`) **And** the error is logged with context (goal ID, batch/profile ID, error message) via NestJS Logger (NFR12, NFR13) **And** the failure does NOT propagate — the user's request is unaffected

4. **Given** the EventEmitter2 module is configured in AppModule **When** any event listener throws an unhandled error **Then** a global error handler on EventEmitter2 catches and logs the error (NFR13) **And** no event listener error crashes the application or affects user-facing requests

5. **Given** a batch is submitted and answered **When** `submitBatch()` completes Transaction 1 (answer persistence) **Then** the `batch.answered` event is emitted with payload `{ goal_id, batch_id, batch_number, user_id }` **And** the event fires after the batch is marked as answered but does NOT block the response

6. **Given** a goal profile is successfully generated and stored **When** `generateAndStoreProfile()` completes successfully **Then** the `profile.generated` event is emitted with payload `{ goal_id, profile_id, user_id }` **And** the event fires after profile storage but does NOT block the response

7. **Given** a new batch is served to the user (first batch or AI-generated batch) **When** the batch is stored and returned **Then** the `batch.served` event is emitted with payload `{ goal_id, batch_id, batch_number, user_id }` **And** the event fires after batch storage (this event is consumed by Story 2.6 for quality scoring — no listener in this story)

## Tasks / Subtasks

- [x] Task 1: Install and configure EventEmitter2 in AppModule (AC: #4, #5, #6, #7)
  - [x] 1.1 Install `@nestjs/event-emitter` package (`npm install @nestjs/event-emitter`)
  - [x] 1.2 Import `EventEmitterModule.forRoot()` into `AppModule` imports array
  - [x] 1.3 Add global error handler on EventEmitter2 instance in `AppModule.onModuleInit()` — use `EventEmitter2` injection, call `.on('error', ...)` to log all unhandled listener errors via NestJS Logger
- [x] Task 2: Add `generateEmbedding()` to AiService (AC: #1, #2)
  - [x] 2.1 Add `generateEmbedding(text: string): Promise<number[]>` method to `AiService`
  - [x] 2.2 Call `this.openai.embeddings.create()` with model `appConfig.ai.embeddingModel` (`text-embedding-3-small`) and dimensions `appConfig.ai.embeddingDimensions` (1536)
  - [x] 2.3 Apply AbortController timeout (`appConfig.ai.callTimeoutMs`, 30s) — same pattern as `generateJSON()`
  - [x] 2.4 Return `response.data[0].embedding` (the float array)
  - [x] 2.5 Log embedding call success/failure via NestJS Logger
- [x] Task 3: Create `goal_context_embeddings` table via migration (AC: #1, #2, #3)
  - [x] 3.1 Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;`
  - [x] 3.2 Create `goal_context_embeddings` table with columns: `id` (uuid PK, default `gen_random_uuid()`), `goal_id` (uuid FK to `goals.id` ON DELETE CASCADE, NOT NULL), `user_id` (uuid FK to `auth.users.id`, NOT NULL), `content_type` (text, CHECK `content_type IN ('batch', 'profile')`, NOT NULL), `batch_id` (uuid FK to `intake_batches.id`, nullable — only for `content_type = 'batch'`), `profile_id` (uuid FK to `goal_profiles.id`, nullable — only for `content_type = 'profile'`), `content_text` (text NOT NULL — the formatted Q&A or narrative text that was embedded), `embedding` (vector(1536) NOT NULL), `created_at` (timestamptz default `now()`)
  - [x] 3.3 Add RLS policies: `SELECT` where `(select auth.uid()) = user_id`, `INSERT` where `(select auth.uid()) = user_id`
  - [x] 3.4 Add indexes: `idx_goal_context_embeddings_goal_id` on `goal_id`, `idx_goal_context_embeddings_user_id` on `user_id`, HNSW index on `embedding` column for vector similarity search (`CREATE INDEX idx_goal_context_embeddings_embedding ON goal_context_embeddings USING hnsw (embedding vector_cosine_ops)`)
- [x] Task 4: Emit events from IntakeService (AC: #5, #6, #7)
  - [x] 4.1 Inject `EventEmitter2` into `IntakeService` constructor
  - [x] 4.2 Emit `batch.answered` event after batch is marked as answered in `submitBatch()` — payload: `{ goal_id, batch_id, batch_number, user_id }`
  - [x] 4.3 Emit `batch.served` event after first batch creation in `createFirstBatch()` — payload: `{ goal_id, batch_id, batch_number, user_id }`
  - [x] 4.4 Emit `batch.served` event after AI-generated batch storage in `submitBatch()` (Transaction 2 success path) — payload: `{ goal_id, batch_id, batch_number, user_id }`
  - [x] 4.5 Emit `batch.served` event after `storeGeneratedBatch()` returns in `generateAndStoreNextBatch()` — payload: `{ goal_id, batch_id, batch_number, user_id }`
  - [x] 4.6 Emit `profile.generated` event after profile is successfully stored in `generateAndStoreProfile()` — payload: `{ goal_id, profile_id, user_id }`
  - [x] 4.7 All emits use `this.eventEmitter.emit('event.name', payload)` — fire-and-forget, NEVER awaited
- [x] Task 5: Create embedding event listeners in IntakeService (AC: #1, #2, #3)
  - [x] 5.1 Add `@OnEvent('batch.answered')` listener method `handleBatchAnswered(payload)` — loads batch Q&A, formats text, calls `generateEmbedding()`, stores in `goal_context_embeddings`, updates `intake_batches.embedded = true`
  - [x] 5.2 In `handleBatchAnswered`: load all questions + answers for the batch from `intake_questions` JOIN `intake_answers`, format as `"Q: {question_text}\nA: {answer_text/numeric/options}"` pairs joined by newlines
  - [x] 5.3 In `handleBatchAnswered`: call `this.aiService.generateEmbedding(formattedText)` to get the vector
  - [x] 5.4 In `handleBatchAnswered`: insert into `goal_context_embeddings` with `content_type = 'batch'`, `batch_id`, `goal_id`, `user_id`, `content_text`, and `embedding`
  - [x] 5.5 In `handleBatchAnswered`: update `intake_batches` SET `embedded = true` WHERE `id = batch_id`
  - [x] 5.6 In `handleBatchAnswered`: wrap entire method in try/catch — on error, log with `this.logger.error()` including context (goal_id, batch_id), do NOT rethrow
  - [x] 5.7 Add `@OnEvent('profile.generated')` listener method `handleProfileGenerated(payload)` — loads profile narrative, calls `generateEmbedding()`, stores in `goal_context_embeddings`, updates `goal_profiles.embedded = true`
  - [x] 5.8 In `handleProfileGenerated`: load `narrative_summary` from `goal_profiles` WHERE `id = profile_id`
  - [x] 5.9 In `handleProfileGenerated`: call `this.aiService.generateEmbedding(narrativeSummary)` to get the vector
  - [x] 5.10 In `handleProfileGenerated`: insert into `goal_context_embeddings` with `content_type = 'profile'`, `profile_id`, `goal_id`, `user_id`, `content_text = narrativeSummary`, and `embedding`
  - [x] 5.11 In `handleProfileGenerated`: update `goal_profiles` SET `embedded = true` WHERE `id = profile_id`
  - [x] 5.12 In `handleProfileGenerated`: wrap in try/catch — on error, log with context (goal_id, profile_id), do NOT rethrow
- [x] Task 6: Unit tests for AiService.generateEmbedding() (AC: #1, #2, #3)
  - [x] 6.1 Create `src/ai/ai.service.spec.ts` — test `generateEmbedding()` calls OpenAI embeddings API with correct model and dimensions
  - [x] 6.2 Test `generateEmbedding()` returns the embedding array from the response
  - [x] 6.3 Test `generateEmbedding()` propagates errors from OpenAI SDK
  - [x] 6.4 Test `generateEmbedding()` respects timeout (AbortController)
- [x] Task 7: Unit tests for event emissions in IntakeService (AC: #5, #6, #7)
  - [x] 7.1 Test `submitBatch()` emits `batch.answered` event with correct payload after batch is marked as answered
  - [x] 7.2 Test `submitBatch()` emits `batch.served` event with correct payload when a new batch is generated (Transaction 2)
  - [x] 7.3 Test `createFirstBatch()` emits `batch.served` event with correct payload
  - [x] 7.4 Test `generateAndStoreNextBatch()` emits `batch.served` event with correct payload
  - [x] 7.5 Test `generateAndStoreProfile()` emits `profile.generated` event with correct payload on success
  - [x] 7.6 Test `generateAndStoreProfile()` does NOT emit `profile.generated` event on failure
  - [x] 7.7 Test that event emissions are fire-and-forget (not awaited)
- [x] Task 8: Unit tests for embedding event listeners (AC: #1, #2, #3)
  - [x] 8.1 Test `handleBatchAnswered` loads Q&A, calls `generateEmbedding()`, inserts into `goal_context_embeddings`, updates `intake_batches.embedded = true`
  - [x] 8.2 Test `handleBatchAnswered` formats Q&A text correctly (Q: ... / A: ... pairs)
  - [x] 8.3 Test `handleBatchAnswered` handles embedding failure gracefully — logs error, does NOT update embedded flag
  - [x] 8.4 Test `handleBatchAnswered` handles Supabase insert failure gracefully — logs error, does NOT update embedded flag
  - [x] 8.5 Test `handleProfileGenerated` loads narrative, calls `generateEmbedding()`, inserts into `goal_context_embeddings`, updates `goal_profiles.embedded = true`
  - [x] 8.6 Test `handleProfileGenerated` handles embedding failure gracefully — logs error, does NOT update embedded flag
  - [x] 8.7 Test `handleProfileGenerated` handles Supabase insert failure gracefully — logs error, does NOT update embedded flag
- [x] Task 9: Unit test for AppModule global error handler (AC: #4)
  - [x] 9.1 Test that AppModule configures EventEmitter2 global error handler
  - [x] 9.2 Test that global error handler logs the error via Logger

## Dev Notes

### Developer Context

**What this story builds:** The semantic embedding pipeline — the async infrastructure that converts intake Q&A and goal profiles into vector embeddings stored in a dedicated table. This is the foundation for future personalized coaching, where the system will use vector similarity search to find relevant context from a user's intake history. This story also establishes the EventEmitter2 event system that Stories 2.5 and 2.6 both rely on.

**This story introduces THREE major infrastructure pieces:**
1. **EventEmitter2 module** — the async event system used by both 2.5 (embedding) and 2.6 (quality scoring). This is the FIRST time events are used in the codebase.
2. **`AiService.generateEmbedding()`** — the first embedding method on AiService. Currently AiService only has `generateJSON()`.
3. **`goal_context_embeddings` table** — a new table with pgvector extension for storing vector embeddings.

**The event flow works like this:**
1. User submits answers → `submitBatch()` stores answers (Transaction 1) → emits `batch.answered`
2. `handleBatchAnswered` listener picks up the event asynchronously → loads Q&A → calls `generateEmbedding()` → stores in `goal_context_embeddings` → updates `intake_batches.embedded = true`
3. Profile generated → `generateAndStoreProfile()` stores profile → emits `profile.generated`
4. `handleProfileGenerated` listener picks up the event asynchronously → loads narrative → calls `generateEmbedding()` → stores in `goal_context_embeddings` → updates `goal_profiles.embedded = true`

**Key design decisions:**
- Events are fire-and-forget — `this.eventEmitter.emit()` is NOT awaited. The user's HTTP response is sent before embedding starts.
- Event listeners live in `IntakeService` because it already owns the embedding pipeline per architecture doc (table `goal_context_embeddings` — Owner: IntakeService).
- Errors in listeners are caught and logged — they never propagate to the user or crash the app.
- The `batch.served` event is emitted in this story but has NO listener here — it's consumed by Story 2.6 (quality scoring). We just emit it to prepare the infrastructure.
- The `content_text` column stores the formatted text that was embedded, allowing re-embedding without re-fetching from multiple tables.

**CRITICAL: pgvector extension must be enabled BEFORE creating the table.** The migration must include `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;` as the first statement. Supabase hosts pgvector but it's not enabled by default on this project.

**CRITICAL: Admin client bypasses RLS.** Since IntakeService uses `getAdminClient()`, all inserts to `goal_context_embeddings` must explicitly include `user_id`. The RLS policies exist as a safety net for any future direct-query scenarios.

**What NOT to build in this story:**
- No `batch.served` event listener (Story 2.6 handles quality scoring)
- No `user-profile.updated` event or listener (user profile module doesn't exist yet — FR34 deferred)
- No admin re-embedding endpoint (Story 3.5)
- No retry logic for failed embeddings (Story 3.5 adds admin reembed)
- No vector similarity search queries (future coaching system)

### Technical Requirements

**EventEmitter2 configuration in AppModule:**

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    SupabaseModule,
    AiModule,
    GoalModule,
    IntakeModule,
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.eventEmitter.on('error', (error: Error) => {
      this.logger.error(`Unhandled event listener error: ${error.message}`, error.stack);
    });
  }
}
```

**AiService.generateEmbedding() method:**

```typescript
async generateEmbedding(text: string): Promise<number[]> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.ai.callTimeoutMs,
  );

  try {
    const response = await this.openai.embeddings.create(
      {
        model: appConfig.ai.embeddingModel,
        input: text,
        dimensions: appConfig.ai.embeddingDimensions,
      },
      { signal: controller.signal },
    );

    this.logger.log(`Embedding generated: ${response.data[0].embedding.length} dimensions`);
    return response.data[0].embedding;
  } catch (error) {
    this.logger.error(`Embedding generation failed: ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

**Database migration for `goal_context_embeddings` table:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create goal_context_embeddings table
CREATE TABLE goal_context_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL CHECK (content_type IN ('batch', 'profile')),
  batch_id uuid REFERENCES intake_batches(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES goal_profiles(id) ON DELETE CASCADE,
  content_text text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goal_context_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own embeddings"
  ON goal_context_embeddings FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own embeddings"
  ON goal_context_embeddings FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX idx_goal_context_embeddings_goal_id ON goal_context_embeddings(goal_id);
CREATE INDEX idx_goal_context_embeddings_user_id ON goal_context_embeddings(user_id);
CREATE INDEX idx_goal_context_embeddings_embedding ON goal_context_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);
```

**CRITICAL:** The `vector` type must be schema-qualified as `extensions.vector(1536)` because the extension is installed in the `extensions` schema on Supabase. The HNSW index operator class must also be schema-qualified: `extensions.vector_cosine_ops`.

**Event payload interfaces (define in IntakeService or a shared file):**

```typescript
interface BatchAnsweredEvent {
  goal_id: string;
  batch_id: string;
  batch_number: number;
  user_id: string;
}

interface BatchServedEvent {
  goal_id: string;
  batch_id: string;
  batch_number: number;
  user_id: string;
}

interface ProfileGeneratedEvent {
  goal_id: string;
  profile_id: string;
  user_id: string;
}
```

**Event emission points in IntakeService:**

1. **`batch.answered`** — in `submitBatch()`, after the batch is marked as answered (`intake_batches.update({ is_answered: true })`), BEFORE Transaction 2 (next batch generation):
```typescript
this.eventEmitter.emit('batch.answered', {
  goal_id: goalId,
  batch_id: currentBatch.id,
  batch_number: currentBatch.batch_number,
  user_id: userId,
});
```

2. **`batch.served`** — at THREE locations:
   - After `createFirstBatch()` inserts the first batch successfully
   - In `submitBatch()` after `storeGeneratedBatch()` returns a new batch in Transaction 2
   - In `generateAndStoreNextBatch()` after `storeGeneratedBatch()` returns

3. **`profile.generated`** — in `generateAndStoreProfile()`, after profile insert and goal status update to `intake_completed`:
```typescript
this.eventEmitter.emit('profile.generated', {
  goal_id: goalId,
  profile_id: profile.id,
  user_id: userId,
});
```

**Batch Q&A text formatting for embedding:**

```typescript
private formatBatchQAForEmbedding(
  questions: Array<{ question_text: string; question_type: string }>,
  answers: Array<{ answer_text: string | null; answer_numeric: number | null; selected_options: string[] | null }>,
): string {
  return questions.map((q, i) => {
    const answer = answers[i];
    let answerText: string;
    if (answer.answer_text) {
      answerText = answer.answer_text;
    } else if (answer.answer_numeric !== null) {
      answerText = String(answer.answer_numeric);
    } else if (answer.selected_options) {
      answerText = answer.selected_options.join(', ');
    } else {
      answerText = '(no answer)';
    }
    return `Q: ${q.question_text}\nA: ${answerText}`;
  }).join('\n\n');
}
```

**Embedding listener pattern (handleBatchAnswered):**

```typescript
@OnEvent('batch.answered')
async handleBatchAnswered(payload: BatchAnsweredEvent): Promise<void> {
  try {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Load questions + answers for this batch
    const { data: questions, error: qError } = await supabase
      .from('intake_questions')
      .select('id, question_text, question_type, order_in_batch')
      .eq('batch_id', payload.batch_id)
      .order('order_in_batch');

    if (qError || !questions?.length) {
      this.logger.error(`Failed to load questions for batch ${payload.batch_id}: ${qError?.message}`);
      return;
    }

    const questionIds = questions.map((q) => q.id);
    const { data: answers, error: aError } = await supabase
      .from('intake_answers')
      .select('question_id, answer_text, answer_numeric, selected_options')
      .in('question_id', questionIds);

    if (aError) {
      this.logger.error(`Failed to load answers for batch ${payload.batch_id}: ${aError.message}`);
      return;
    }

    // 2. Format Q&A text
    const sortedQuestions = questions.sort((a, b) => a.order_in_batch - b.order_in_batch);
    const answerMap = new Map(answers.map((a) => [a.question_id, a]));
    const formattedPairs = sortedQuestions.map((q) => {
      const answer = answerMap.get(q.id);
      // ... format answer based on type
    });
    const contentText = formattedPairs.join('\n\n');

    // 3. Generate embedding
    const embedding = await this.aiService.generateEmbedding(contentText);

    // 4. Store in goal_context_embeddings
    const { error: insertError } = await supabase
      .from('goal_context_embeddings')
      .insert({
        goal_id: payload.goal_id,
        user_id: payload.user_id,
        content_type: 'batch',
        batch_id: payload.batch_id,
        content_text: contentText,
        embedding: JSON.stringify(embedding),
      });

    if (insertError) {
      this.logger.error(`Failed to store batch embedding for batch ${payload.batch_id}: ${insertError.message}`);
      return;
    }

    // 5. Update intake_batches.embedded = true
    await supabase
      .from('intake_batches')
      .update({ embedded: true })
      .eq('id', payload.batch_id);

    this.logger.log(`Batch ${payload.batch_number} embedded for goal ${payload.goal_id}`);
  } catch (error) {
    this.logger.error(
      `Embedding failed for batch ${payload.batch_id} (goal ${payload.goal_id}): ${error.message}`,
    );
  }
}
```

**CRITICAL: Embedding vector storage format.** When inserting into Supabase with pgvector, the embedding array must be passed as `JSON.stringify(embedding)` — Supabase's PostgREST accepts the vector as a JSON string representation of the float array (e.g., `"[0.1, 0.2, ...]"`). The pgvector extension handles the conversion.

**Embedding listener pattern (handleProfileGenerated):**

```typescript
@OnEvent('profile.generated')
async handleProfileGenerated(payload: ProfileGeneratedEvent): Promise<void> {
  try {
    const supabase = this.supabaseService.getAdminClient();

    // 1. Load narrative summary
    const { data: profile, error: pError } = await supabase
      .from('goal_profiles')
      .select('narrative_summary')
      .eq('id', payload.profile_id)
      .single();

    if (pError || !profile) {
      this.logger.error(`Failed to load profile ${payload.profile_id}: ${pError?.message}`);
      return;
    }

    // 2. Generate embedding
    const embedding = await this.aiService.generateEmbedding(profile.narrative_summary);

    // 3. Store in goal_context_embeddings
    const { error: insertError } = await supabase
      .from('goal_context_embeddings')
      .insert({
        goal_id: payload.goal_id,
        user_id: payload.user_id,
        content_type: 'profile',
        profile_id: payload.profile_id,
        content_text: profile.narrative_summary,
        embedding: JSON.stringify(embedding),
      });

    if (insertError) {
      this.logger.error(`Failed to store profile embedding for profile ${payload.profile_id}: ${insertError.message}`);
      return;
    }

    // 4. Update goal_profiles.embedded = true
    await supabase
      .from('goal_profiles')
      .update({ embedded: true })
      .eq('id', payload.profile_id);

    this.logger.log(`Profile embedded for goal ${payload.goal_id}`);
  } catch (error) {
    this.logger.error(
      `Profile embedding failed for profile ${payload.profile_id} (goal ${payload.goal_id}): ${error.message}`,
    );
  }
}
```

### Architecture Compliance

**Module structure:** No new modules. EventEmitter2 is added at AppModule level. Event listeners live in IntakeService. `generateEmbedding()` is added to the existing `@Global()` AiService.

**Service boundaries (STRICT):**
- `AiService` — add `generateEmbedding()` method. Owns OpenRouter communication for both chat completions AND embeddings.
- `IntakeService` — add event emissions (`batch.answered`, `batch.served`, `profile.generated`) at appropriate points. Add `@OnEvent` listeners for `batch.answered` and `profile.generated`. Owns the `goal_context_embeddings` table per architecture doc.
- `AppModule` — configure EventEmitter2 module and global error handler.

**Who writes to `goal_context_embeddings`?**
- `IntakeService` writes (creates embeddings from event listeners)
- Future coaching system reads (via vector similarity search)
- This follows architecture doc: `goal_context_embeddings` — Owner (write): IntakeService (async)

**Event system pattern:**
- Event names: `dot.notation`, lowercase (`batch.served`, `batch.answered`, `profile.generated`)
- Event payloads: typed objects with IDs + context (not full entities)
- All listeners: `@OnEvent('event.name')` decorator
- All emits: fire-and-forget — never `await` the emit
- Global error handler on EventEmitter2 catches listener failures

**Error handling:**
- All event listeners wrapped in try/catch — errors are logged, never rethrown
- Embedding failures leave `embedded = false` on source records — recoverable via admin reembed (Story 3.5)
- Global EventEmitter2 error handler as safety net for any uncaught listener errors

**Import pattern:** ALL relative imports MUST use `.js` extension.

**JSON response format:** No response format changes — embedding is async and invisible to the user.

**RLS pattern:** Use `(select auth.uid())` (NOT `auth.uid()`) in RLS policies.

**Admin client pattern:** Use `this.supabaseService.getAdminClient()` for all operations. Explicitly set `user_id` on all inserts.

### Library & Framework Requirements

**New dependency to install:**
- `@nestjs/event-emitter` — EventEmitter2 integration for NestJS. Required for `EventEmitterModule.forRoot()` and `@OnEvent()` decorators.

**Already installed — no changes:**
- `openai` — already used by AiService. The `embeddings.create()` method is part of the OpenAI SDK.
- `@nestjs/common` — `Injectable`, `Logger`, `OnModuleInit`
- `@supabase/supabase-js` — for Supabase client operations

**AiService uses the OpenAI SDK for embeddings via OpenRouter:**
```typescript
// OpenRouter supports the OpenAI embeddings API format
// The model 'text-embedding-3-small' is an OpenAI model available through OpenRouter
this.openai.embeddings.create({
  model: appConfig.ai.embeddingModel,     // 'text-embedding-3-small'
  input: text,
  dimensions: appConfig.ai.embeddingDimensions,  // 1536
});
```

**CRITICAL: OpenRouter embedding support.** Verify that OpenRouter supports the `text-embedding-3-small` model via the embeddings API. If not, the embedding call may need to go directly to the OpenAI API. The architecture doc specifies using OpenRouter for all AI, but embedding models may be an exception. The dev agent should check this and fall back to a direct OpenAI client for embeddings if necessary. The `appConfig.ai.embeddingModel` is already configured for this.

### File Structure Requirements

**Files to CREATE:**
- `src/ai/ai.service.spec.ts` — unit tests for `generateEmbedding()` (AiService currently has no test file)

**Files to MODIFY:**
- `src/app.module.ts` — add `EventEmitterModule.forRoot()` import, implement `OnModuleInit` with global error handler, inject `EventEmitter2`
- `src/ai/ai.service.ts` — add `generateEmbedding(text: string): Promise<number[]>` method
- `src/intake/intake.service.ts` — inject `EventEmitter2`, add event emissions at 5 points (`batch.answered` x1, `batch.served` x3, `profile.generated` x1), add `@OnEvent` listener methods (`handleBatchAnswered`, `handleProfileGenerated`), add `formatBatchQAForEmbedding()` private helper
- `src/intake/intake.service.spec.ts` — add tests for event emissions and embedding listeners

**Files NOT to touch:**
- `src/intake/intake.controller.ts` — no endpoint changes
- `src/intake/intake-prompt.service.ts` — no prompt changes
- `src/intake/intake-quality.service.ts` — no quality validation changes (quality scoring is Story 2.6)
- `src/goal/goal.service.ts` — no changes needed
- `src/goal/goal.controller.ts` — no changes needed
- `src/config/app.config.ts` — embedding config already exists, read values only
- `src/supabase/*` — global module, use as-is
- `src/intake/intake.module.ts` — EventEmitter2 is imported at AppModule level, listeners auto-discovered via `@OnEvent` decorator
- `src/intake/dto/submit-answers.dto.ts` — no DTO changes

**Database migration needed:**
- Enable pgvector extension + create `goal_context_embeddings` table — apply via Supabase MCP `apply_migration` tool

### Testing Requirements

**Testing framework:** Jest with `@nestjs/testing` — already configured.

**Test file naming:** `*.spec.ts` co-located next to the file being tested.

**AiService tests — create `ai.service.spec.ts`:**

```
describe('AiService')
  describe('generateEmbedding')
    it calls OpenAI embeddings API with correct model and dimensions
    it returns the embedding vector from the response
    it propagates errors from the OpenAI SDK
    it applies timeout via AbortController
```

**IntakeService event emission tests — add to `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('event emissions')
    it emits batch.answered after marking batch as answered in submitBatch
    it emits batch.served after createFirstBatch stores the batch
    it emits batch.served after Transaction 2 generates a new batch in submitBatch
    it emits batch.served after generateAndStoreNextBatch stores a batch
    it emits profile.generated after successful profile generation in generateAndStoreProfile
    it does NOT emit profile.generated when profile generation fails
    it emits events with correct payload structure (goal_id, batch_id, user_id, etc.)
```

**IntakeService embedding listener tests — add to `intake.service.spec.ts`:**

```
describe('IntakeService')
  describe('handleBatchAnswered')
    it loads Q&A for the batch and generates embedding
    it formats Q&A text as "Q: ... / A: ..." pairs
    it stores embedding in goal_context_embeddings with content_type = 'batch'
    it updates intake_batches.embedded = true on success
    it handles embedding generation failure gracefully (logs error, no rethrow)
    it handles Supabase insert failure gracefully (logs error, no embedded flag update)
    it handles Q&A loading failure gracefully
  describe('handleProfileGenerated')
    it loads narrative summary and generates embedding
    it stores embedding in goal_context_embeddings with content_type = 'profile'
    it updates goal_profiles.embedded = true on success
    it handles embedding failure gracefully (logs error, no rethrow)
    it handles Supabase insert failure gracefully
    it handles profile loading failure gracefully
```

**AppModule tests (optional — simple wiring test):**

```
describe('AppModule')
  it configures EventEmitter2 global error handler
```

**Mock patterns:**
- Mock `EventEmitter2.emit` — verify event name and payload shape
- Mock `AiService.generateEmbedding` — return a fake vector (array of 1536 numbers, e.g., `new Array(1536).fill(0.1)`) or throw
- Mock Supabase queries for loading Q&A and profile data
- Reuse existing chainable Supabase mock pattern from Stories 2.1-2.4
- Mock Logger to verify error logging on failures

**Test count:** ~24 new tests across 2-3 files (4 AI service + 7 event emission + 13 embedding listeners).

### Previous Story Intelligence

**From Story 2.4 (immediately prior, current codebase state):**

- `generateAndStoreProfile()` is the profile creation entrypoint — emit `profile.generated` after the profile insert and status update to `intake_completed` succeed (around line 440 per the codebase analysis)
- `updateGoalStatus()` helper already exists — no need to recreate it
- `loadPriorBatchContext(goalId)` loads all Q&A as `PriorBatchContext[]` — this loads data in a specific format for AI prompts but NOT for embedding. The embedding listener needs a different query (questions + answers by batch_id, not all batches at once)
- The `goal_profiles` table already has the `embedded` boolean column (default `false`) — created in Story 2.4 migration
- The `intake_batches` table already has the `embedded` boolean column (default `false`) — created in Story 2.1 migration

**From Story 2.3 (Transaction 2 and batch serving):**

- `storeGeneratedBatch()` is the centralized batch storage method — emit `batch.served` after it returns successfully
- Transaction 2 in `submitBatch()` calls `storeGeneratedBatch()` for AI-generated batches — emit `batch.served` there too
- `generateAndStoreNextBatch()` calls `storeGeneratedBatch()` — another `batch.served` emission point
- `createFirstBatch()` stores the hardcoded first batch directly (not via `storeGeneratedBatch()`) — emit `batch.served` after the questions are inserted and the batch object is assembled

**From Stories 2.1/2.2 (answer processing):**

- `submitBatch()` marks the batch as answered (`intake_batches.update({ is_answered: true })`) — this is where `batch.answered` should fire
- Answer data includes `answer_text`, `answer_numeric`, and `selected_options` — the embedding text formatter must handle all three answer types
- The `intake_answers` table links to `intake_questions` via `question_id` — join on this to load Q&A pairs for embedding

**Debug issues from previous stories to AVOID:**
- When mocking EventEmitter2, use `jest.fn()` for `emit` and verify it was called with the correct event name and payload — do NOT try to test actual event propagation in unit tests
- The `@OnEvent` decorator auto-registers listeners only when EventEmitter2 module is properly imported — for unit tests, call the listener methods directly (don't rely on event propagation)
- When testing embedding listeners, carefully mock the Supabase call chain: the listener makes 3-4 sequential Supabase calls (load data → insert embedding → update embedded flag). Use `mockReturnValueOnce` for each call in sequence.

### Project Structure Notes

- `goal_context_embeddings` table follows architecture doc: Owner (write) is IntakeService (async), Reader is future coaching system
- Event listeners live in IntakeService per architecture doc's service boundaries
- pgvector extension installed in `extensions` schema (Supabase convention) — vector type must be schema-qualified
- EventEmitter2 imported at AppModule level — auto-discovers `@OnEvent` listeners across all modules
- No new feature modules needed — everything extends existing infrastructure

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5 — FR32, FR33, FR35]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns — Async Event Processing with EventEmitter2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — Event System (batch.served, batch.answered, profile.generated)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — goal_context_embeddings: Owner IntakeService (async)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Points — EventEmitter2 Events table]
- [Source: _bmad-output/planning-artifacts/architecture.md#External Integrations — AiService.generateEmbedding()]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Error Handling, Logging, Event patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#app.config.ts — ai.embeddingModel, ai.embeddingDimensions]
- [Source: _bmad-output/planning-artifacts/prd.md#FR32 — Embed batch Q&A after submission]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33 — Embed goal profile after generation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR35 — Track embedding completion status]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4 — Async operations zero impact on user-facing latency]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR12 — Embedding failures tracked and recoverable]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR13 — EventEmitter2 errors logged, never silently swallowed]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR15 — Embedding model locked to text-embedding-3-small (1536 dimensions)]
- [Source: _bmad-output/implementation-artifacts/2-4-intake-completion-and-goal-profile-generation.md — generateAndStoreProfile flow, goal_profiles.embedded column]
- [Source: src/intake/intake.service.ts — submitBatch() Transaction 1, createFirstBatch(), generateAndStoreNextBatch(), generateAndStoreProfile()]
- [Source: src/ai/ai.service.ts — generateJSON() pattern with AbortController timeout]
- [Source: src/config/app.config.ts — ai.embeddingModel ('text-embedding-3-small'), ai.embeddingDimensions (1536)]
- [Source: src/app.module.ts — current module imports (no EventEmitter2 yet)]
- [Source: Supabase project — pgvector extension available but not installed, intake_batches.embedded column exists, goal_profiles.embedded column exists]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Installed `@nestjs/event-emitter` and configured `EventEmitterModule.forRoot()` in AppModule with global error handler
- Added `generateEmbedding()` method to AiService following the same AbortController timeout pattern as `generateJSON()`
- Applied database migration via Supabase MCP: pgvector extension enabled, `goal_context_embeddings` table created with RLS policies and HNSW index
- Added 5 event emission points in IntakeService: `batch.answered` (1x), `batch.served` (3x), `profile.generated` (1x) — all fire-and-forget
- Added `@OnEvent('batch.answered')` and `@OnEvent('profile.generated')` listener methods with full error handling (try/catch, no rethrow)
- Added `formatBatchQAForEmbedding()` helper to format Q&A pairs for embedding
- Exported typed event payload interfaces (`BatchAnsweredEvent`, `BatchServedEvent`, `ProfileGeneratedEvent`)
- Updated `createFirstBatch()` signature to accept `userId` for `batch.served` event emission
- All 151 tests pass (42 pre-existing IntakeService + 15 new event/embedding + 4 AiService + 2 AppModule + 88 other)
- No regressions in existing test suites

### Change Log

- 2026-02-12: Story 2.5 implemented — EventEmitter2 event system, AiService.generateEmbedding(), goal_context_embeddings table, event emissions, embedding listeners, and 21 new unit tests

### File List

**New files:**
- `src/ai/ai.service.spec.ts` — Unit tests for `generateEmbedding()` (4 tests)
- `src/app.module.spec.ts` — Unit tests for AppModule global error handler (2 tests)

**Modified files:**
- `src/app.module.ts` — Added `EventEmitterModule.forRoot()`, `OnModuleInit`, global error handler
- `src/ai/ai.service.ts` — Added `generateEmbedding(text: string): Promise<number[]>` method
- `src/intake/intake.service.ts` — Added EventEmitter2 + AiService injection, event emissions (5 points), `@OnEvent` listeners (`handleBatchAnswered`, `handleProfileGenerated`), `formatBatchQAForEmbedding()`, typed event interfaces
- `src/intake/intake.service.spec.ts` — Added AiService + EventEmitter2 mocks to test setup, added 15 new tests (6 event emissions + 5 handleBatchAnswered + 4 handleProfileGenerated)
- `package.json` / `package-lock.json` — Added `@nestjs/event-emitter` dependency

**Database migration (applied via Supabase MCP):**
- Enabled pgvector extension (`extensions` schema)
- Created `goal_context_embeddings` table with RLS and HNSW index
