import { Injectable, Logger } from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { NotificationSchedulerService } from "../notifications/notification-scheduler.service.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminHealthReport,
  AdminLlmHealthReport,
  AdminLlmProbe,
} from "./system.types.js";

const LLM_PROBE_TIMEOUT_MS = 5_000;
const LLM_PROBE_SYSTEM = 'Reply with {"ok":true}';
const LLM_PROBE_USER = "ping";

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiService: AiService,
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
    const openrouter = await this.probeOpenRouter();
    return { openrouter };
  }

  private async probeSupabase(): Promise<AdminHealthReport["supabase"]> {
    const start = Date.now();
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { error } = await supabase
        .from("users")
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
}
