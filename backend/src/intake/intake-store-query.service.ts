import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { SUPABASE_NOT_FOUND } from "../supabase/error-codes.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { QuestionConfig, StoredBatch } from "./intake-store.service.js";

@Injectable()
export class IntakeStoreQueryService {
  private readonly logger = new Logger(IntakeStoreQueryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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
}
