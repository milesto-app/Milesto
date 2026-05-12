import { ConflictException, Injectable, Logger } from "@nestjs/common";

import { DebriefService } from "../debrief/debrief.service.js";
import type { ToolExecutionContext } from "./types/chat.types.js";

@Injectable()
export class ChatDebriefToolsService {
  private readonly logger = new Logger(ChatDebriefToolsService.name);

  constructor(private readonly debriefService: DebriefService) {}

  public async submitDebrief(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    try {
      const note = args.note as string;
      const milestoneId = args.milestone_id as string;

      const debrief = await this.debriefService.submitDebrief(
        ctx.goalId,
        ctx.userId,
        { note, milestone_id: milestoneId },
      );

      return {
        success: true,
        date: debrief.date,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        return {
          error: "You have already submitted a debrief for this milestone.",
        };
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`submitDebrief failed: ${message}`);
      return { error: "Unable to submit debrief. Please try again later." };
    }
  }
}
