import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { config } from "../config/app.config.js";
import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminIntakeBatch,
  AdminIntakeBatchList,
  AdminIntakeQualityFailures,
} from "./intake.types.js";

type IntakeBatchRow = Database["public"]["Tables"]["intake_batches"]["Row"];

const MS_PER_DAY = 86_400_000;

interface QuestionCounts {
  total: number;
  answered: number;
}

@Injectable()
export class AdminIntakeService {
  private readonly logger = new Logger(AdminIntakeService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listBatches(
    page: number,
    perPage: number,
    goalId: string | undefined,
  ): Promise<AdminIntakeBatchList> {
    const supabase = this.supabaseService.getAdminClient();
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    let query = supabase
      .from("intake_batches")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (goalId !== undefined) {
      query = query.eq("goal_id", goalId);
    }

    const { data, count, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list intake batches: ${error.message}`);
      throw new InternalServerErrorException("Failed to list intake batches");
    }

    const batches = await this.enrichBatches(data);
    const total = count ?? 0;
    return {
      batches,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  public async getQualityFailures(
    days: number,
  ): Promise<AdminIntakeQualityFailures> {
    const supabase = this.supabaseService.getAdminClient();
    const threshold = config.qualityFailureThreshold;
    const cutoffIso = new Date(Date.now() - days * MS_PER_DAY).toISOString();

    const { data, error } = await supabase
      .from("intake_batches")
      .select("*")
      .lt("quality_score", threshold)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false });

    if (error !== null) {
      this.logger.error(
        `Failed to load intake quality failures: ${error.message}`,
      );
      throw new InternalServerErrorException(
        "Failed to load intake quality failures",
      );
    }

    const batches = await this.enrichBatches(data);
    return { batches, threshold };
  }

  private async enrichBatches(
    rows: IntakeBatchRow[],
  ): Promise<AdminIntakeBatch[]> {
    if (rows.length === 0) {
      return [];
    }

    const batchIds = rows.map((row) => row.id);
    const counts = await this.loadQuestionCounts(batchIds);

    return rows.map((row) => {
      const tally = counts.get(row.id) ?? { total: 0, answered: 0 };
      return {
        id: row.id,
        goalId: row.goal_id,
        batchNumber: row.batch_number,
        isAnswered: row.is_answered,
        qualityScore: row.quality_score,
        embedded: row.embedded,
        createdAt: row.created_at,
        questionCount: tally.total,
        answeredCount: tally.answered,
      };
    });
  }

  private async loadQuestionCounts(
    batchIds: string[],
  ): Promise<Map<string, QuestionCounts>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("intake_questions")
      .select("batch_id, answered_at")
      .in("batch_id", batchIds);

    if (error !== null) {
      this.logger.error(
        `Failed to load intake question counts: ${error.message}`,
      );
      return new Map();
    }

    const counts = new Map<string, QuestionCounts>();
    for (const row of data) {
      if (row.batch_id === null) {
        continue;
      }
      const entry = counts.get(row.batch_id) ?? { total: 0, answered: 0 };
      entry.total += 1;
      if (row.answered_at !== null) {
        entry.answered += 1;
      }
      counts.set(row.batch_id, entry);
    }
    return counts;
  }
}
