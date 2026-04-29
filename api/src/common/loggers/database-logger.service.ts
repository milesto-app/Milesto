import { ConsoleLogger } from "@nestjs/common";

import type { SupabaseService } from "../../supabase/supabase.service.js";

const LEVEL_WARN = "warn";
const LEVEL_ERROR = "error";

export class DatabaseLogger extends ConsoleLogger {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  public override error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...(optionalParams as never[]));
    void this.persist(LEVEL_ERROR, message, optionalParams);
  }

  public override warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...(optionalParams as never[]));
    void this.persist(LEVEL_WARN, message, optionalParams);
  }

  private async persist(
    level: typeof LEVEL_WARN | typeof LEVEL_ERROR,
    message: unknown,
    optionalParams: unknown[],
  ): Promise<void> {
    try {
      const { stack, context } = this.extractStackAndContext(optionalParams);
      const supabase = this.supabaseService.getAdminClient();
      await supabase.from("system_logs").insert({
        level,
        context,
        message: this.toLogString(message),
        stack,
      });
    } catch {
      // Swallow — logging must never crash the app or itself produce a log
      // that would feed back into this method.
    }
  }

  private extractStackAndContext(params: unknown[]): {
    stack: string | null;
    context: string | null;
  } {
    let stack: string | null = null;
    let context: string | null = null;
    for (const param of params) {
      if (typeof param === "string" && stack === null && param.includes("\n")) {
        stack = param;
      } else if (typeof param === "string" && context === null) {
        context = param;
      }
    }
    return { stack, context };
  }

  private toLogString(message: unknown): string {
    if (typeof message === "string") {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
