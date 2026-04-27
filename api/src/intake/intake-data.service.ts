import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import type { PriorBatchContext } from "../config/questions.config.js";
import type { GeneratedQuestion } from "../config/questions.config.js";
import type { Database, Json } from "../supabase/database.types.js";
import { SUPABASE_NOT_FOUND } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { AnswerInput, ProfileResult } from "./types/intake.types.js";

type IntakeQuestionUpdate =
  Database["public"]["Tables"]["intake_questions"]["Update"];

const FAILED_STATUS = "profile_generation_failed";

export interface StoreBatchOptions {
  goalId: string;
  batchNumber: number;
  questions: GeneratedQuestion[];
}

export interface StoredBatch {
  batch_id: string;
  batch_number: number;
  is_complete: boolean;
  questions: unknown[];
}

export interface QuestionConfig {
  min?: number;
  max?: number;
  options?: string[];
  format?: string;
}

@Injectable()
export class IntakeDataService {
  private readonly logger = new Logger(IntakeDataService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ---------- Batches & questions ----------

  public async queryLatestBatch(
    goalId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("intake_batches")
      .select("*")
      .eq("goal_id", goalId)
      .order("batch_number", { ascending: false })
      .limit(1)
      .single();

    if (error !== null && error.code !== SUPABASE_NOT_FOUND) {
      this.logger.error(
        `Failed to query batches for goal ${goalId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to query batches");
    }
    return data;
  }

  public async queryUnansweredBatch(
    goalId: string,
  ): Promise<{ id: string; batch_number: number }> {
    const latestBatch = await this.queryLatestBatch(goalId);
    if (latestBatch === null || (latestBatch.is_answered as boolean)) {
      throw new ConflictException("No unanswered batch available");
    }
    return {
      id: latestBatch.id as string,
      batch_number: latestBatch.batch_number as number,
    };
  }

  public async loadBatchQuestions(
    batchId: string,
  ): Promise<
    Array<{ id: string; question_type: string; config: QuestionConfig | null }>
  > {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("intake_questions")
      .select("*")
      .eq("batch_id", batchId);

    if (error !== null) {
      this.logger.error(
        `Failed to query questions for batch ${batchId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to query questions");
    }
    return data as Array<{
      id: string;
      question_type: string;
      config: QuestionConfig | null;
    }>;
  }

  public async reServeBatch(batch: {
    id: string;
    batch_number: number;
  }): Promise<StoredBatch> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("intake_questions")
      .select("id, question_text, question_type, config, order_in_batch")
      .eq("batch_id", batch.id)
      .order("order_in_batch");

    if (error !== null) {
      this.logger.error(
        `Failed to query questions for batch ${batch.id}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to query questions");
    }
    return {
      batch_id: batch.id,
      batch_number: batch.batch_number,
      is_complete: false,
      questions: data,
    };
  }

  public async storeGeneratedBatch(
    options: StoreBatchOptions,
  ): Promise<StoredBatch> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: batch, error } = await supabase
      .from("intake_batches")
      .insert({
        goal_id: options.goalId,
        batch_number: options.batchNumber,
        is_fallback: false,
      })
      .select()
      .single();

    if (error !== null) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }

    const inserted = await this.insertQuestions({
      goalId: options.goalId,
      batchId: batch.id,
      batchNumber: options.batchNumber,
      questions: options.questions,
    });
    return {
      batch_id: batch.id,
      batch_number: options.batchNumber,
      is_complete: false,
      questions: inserted,
    };
  }

  public async persistAnswers(
    answers: AnswerInput[],
    batchId: string,
  ): Promise<void> {
    const answeredAt = new Date().toISOString();
    await Promise.all(
      answers.map(async (answer) =>
        this.updateAnswer(answer, batchId, answeredAt),
      ),
    );
    await this.markBatchAnswered(batchId);
  }

  // ---------- Prior batch context (for AI prompt building) ----------

  public async loadPriorBatchContext(
    goalId: string,
  ): Promise<PriorBatchContext[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: priorData, error } = await supabase
      .from("intake_batches")
      .select(
        `id, batch_number,
        intake_questions (
          id, question_text, question_type, config, order_in_batch,
          answer_text, answer_numeric, selected_options
        )`,
      )
      .eq("goal_id", goalId)
      .eq("is_answered", true)
      .order("batch_number");

    if (error !== null) {
      this.logger.error(`Failed to load prior batch context: ${error.message}`);
      return [];
    }

    return priorData.map((batch: Record<string, unknown>) =>
      mapBatchToPriorContext(batch),
    );
  }

  // ---------- Profile / goal status ----------

  public async markProfileFailure(goalId: string): Promise<ProfileResult> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from("goals")
      .update({ status: FAILED_STATUS, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .is("deleted_at", null);
    if (error !== null) {
      this.logger.error(
        `Failed to update goal ${goalId} to ${FAILED_STATUS}: ${error.message}`,
      );
    }
    return { profile_id: null, profile_status: FAILED_STATUS };
  }

  public async updateGoalStatus(goalId: string, status: string): Promise<void> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from("goals")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", goalId)
      .is("deleted_at", null);
    if (error !== null) {
      this.logger.error(
        `Failed to update goal ${goalId} status to ${status}: ${error.message}`,
      );
      throw new Error(`Failed to update goal status: ${error.message}`);
    }
  }

  // ---------- Private helpers ----------

  private async updateAnswer(
    answer: AnswerInput,
    batchId: string,
    answeredAt: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const update: IntakeQuestionUpdate = {
      answer_text: answer.answer_text ?? null,
      answer_numeric: answer.answer_numeric ?? null,
      selected_options: answer.selected_options ?? null,
      answered_at: answeredAt,
    };
    const { error } = await supabase
      .from("intake_questions")
      .update(update)
      .eq("id", answer.question_id)
      .eq("batch_id", batchId);
    if (error !== null) {
      this.logger.error(
        `Failed to update answer for question ${answer.question_id}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to save answers");
    }
  }

  private async insertQuestions(params: {
    goalId: string;
    batchId: string;
    batchNumber: number;
    questions: GeneratedQuestion[];
  }): Promise<unknown[]> {
    const supabase = this.supabaseService.getAdminClient();
    const rows = params.questions.map((q, i) => ({
      goal_id: params.goalId,
      batch_id: params.batchId,
      batch_number: params.batchNumber,
      question_text: q.question_text,
      question_type: q.question_type,
      config: q.config as Json,
      order_in_batch: i + 1,
    }));

    const { data, error } = await supabase
      .from("intake_questions")
      .insert(rows)
      .select("id, question_text, question_type, config, order_in_batch");

    if (error !== null) {
      throw new Error(`Failed to create questions: ${error.message}`);
    }
    return data;
  }

  private async markBatchAnswered(batchId: string): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();
    const { error } = await supabase
      .from("intake_batches")
      .update({ is_answered: true })
      .eq("id", batchId);

    if (error !== null) {
      this.logger.error(`Failed to mark batch as answered: ${error.message}`);
      throw new InternalServerErrorException("Failed to update batch status");
    }
  }
}

function mapBatchToPriorContext(
  batch: Record<string, unknown>,
): PriorBatchContext {
  const questions = batch.intake_questions as Record<string, unknown>[] | null;
  return {
    batch_number: batch.batch_number as number,
    questions: (questions ?? []).map((q) => ({
      question_text: q.question_text as string,
      question_type: q.question_type as string,
      answer: formatAnswer(q),
      config: (q.config as Record<string, unknown> | null) ?? null,
    })),
  };
}

function formatNumericAnswer(value: unknown): string {
  return typeof value === "number" ? String(value) : "[no answer]";
}

function formatAnswer(question: Record<string, unknown>): string {
  switch (question.question_type) {
    case "text": {
      const text = question.answer_text as string | null | undefined;
      return typeof text === "string" && text !== "" ? text : "[no answer]";
    }
    case "scale":
      return formatNumericAnswer(question.answer_numeric);
    case "single_choice":
    case "multiple_choice": {
      const options = question.selected_options as string[] | null | undefined;
      return Array.isArray(options) ? options.join(", ") : "";
    }
    default:
      return "[unknown type]";
  }
}
