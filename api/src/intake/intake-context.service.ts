import { Injectable, Logger } from "@nestjs/common";

import { SupabaseService } from "../supabase/supabase.service.js";
import type { PriorBatchContext } from "./intake-prompt.service.js";

@Injectable()
export class IntakeContextService {
  private readonly logger = new Logger(IntakeContextService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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
      this.mapBatchToPriorContext(batch),
    );
  }

  private mapBatchToPriorContext(
    batch: Record<string, unknown>,
  ): PriorBatchContext {
    const questions = batch.intake_questions as
      | Record<string, unknown>[]
      | null;
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
