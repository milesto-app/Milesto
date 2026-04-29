import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { NotificationSchedulerService } from "../notifications/notification-scheduler.service.js";
import { RerankService } from "../roadmap/rerank.service.js";
import type { ContextChunk } from "../roadmap/types/context.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type { AdminLogLevel } from "./dto/list-logs-query.dto.js";
import type {
  AdminHealthReport,
  AdminLlmHealthReport,
  AdminLlmProbe,
  AdminSystemLog,
} from "./system.types.js";

const LLM_PROBE_TIMEOUT_MS = 5_000;
const LLM_PROBE_SYSTEM = 'Reply with {"ok":true}';
const LLM_PROBE_USER = "ping";
const RERANK_PROBE_QUERY = "hello";
const RERANK_PROBE_DOCS: ContextChunk[] = [
  {
    id: "probe-1",
    content_text: "hello",
    content_type: "probe",
    similarity: 0,
    metadata: {},
  },
  {
    id: "probe-2",
    content_text: "world",
    content_type: "probe",
    similarity: 0,
    metadata: {},
  },
];

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
    private readonly rerankService: RerankService,
    private readonly notificationSchedulerService: NotificationSchedulerService,
  ) {}

  public async getHealth(): Promise<AdminHealthReport> {
    const supabase = await this.probeSupabase();
    const queueDepth = this.readQueueDepth();
    return {
      backend: { status: "healthy", responseTimeMs: 0 },
      supabase,
      queueDepth,
    };
  }

  public async getLlmHealth(): Promise<AdminLlmHealthReport> {
    const [openrouter, cohere] = await Promise.all([
      this.probeOpenRouter(),
      this.probeCohere(),
    ]);
    return { openrouter, cohere };
  }

  public async listLogs(
    level: AdminLogLevel | undefined,
    since: string | undefined,
    limit: number,
  ): Promise<AdminSystemLog[]> {
    const supabase = this.supabaseService.getAdminClient();
    let query = supabase
      .from("system_logs")
      .select("id, level, context, message, stack, metadata, logged_at")
      .order("logged_at", { ascending: false })
      .limit(limit);

    if (level !== undefined) {
      query = query.eq("level", level);
    }
    if (since !== undefined) {
      query = query.gte("logged_at", since);
    }

    const { data, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list system logs: ${error.message}`);
      throw new InternalServerErrorException("Failed to list system logs");
    }

    return data.map((row) => ({
      id: row.id,
      level: row.level,
      context: row.context,
      message: row.message,
      stack: row.stack,
      metadata: row.metadata,
      loggedAt: row.logged_at,
    }));
  }

  private async probeSupabase(): Promise<AdminHealthReport["supabase"]> {
    const start = Date.now();
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return {
        status: error === null ? "healthy" : "unhealthy",
        responseTimeMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(
        "Supabase health probe failed",
        error instanceof Error ? error.stack : undefined,
      );
      return { status: "unhealthy", responseTimeMs: Date.now() - start };
    }
  }

  private readQueueDepth(): number | null {
    const status = this.notificationSchedulerService.getStatus();
    if (status.lastRunAt === null) {
      return null;
    }
    return status.lastBatchSize;
  }

  private async probeOpenRouter(): Promise<AdminLlmProbe> {
    const start = Date.now();
    try {
      const result = await this.aiService.generateJson<{ ok: boolean }>(
        LLM_PROBE_SYSTEM,
        LLM_PROBE_USER,
        undefined,
        undefined,
        LLM_PROBE_TIMEOUT_MS,
      );
      const probe: AdminLlmProbe = {
        status: "healthy",
        latencyMs: Date.now() - start,
      };
      if (result.usage !== null) {
        probe.model = result.usage.model;
      }
      return probe;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OpenRouter probe failed: ${message}`);
      return {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }

  private async probeCohere(): Promise<AdminLlmProbe> {
    const start = Date.now();
    try {
      const result = await this.rerankService.rerank(
        RERANK_PROBE_QUERY,
        RERANK_PROBE_DOCS,
      );
      if (!result.rerankApplied) {
        return {
          status: "unhealthy",
          latencyMs: Date.now() - start,
          error: result.failureReason ?? "rerank not applied",
        };
      }
      return { status: "healthy", latencyMs: Date.now() - start };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cohere probe failed: ${message}`);
      return {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }
}
