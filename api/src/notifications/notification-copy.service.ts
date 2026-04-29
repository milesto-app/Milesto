import { Injectable, Logger } from "@nestjs/common";

import { AiService } from "../ai/ai.service.js";
import { config } from "../config/app.config.js";
import {
  buildNotificationSystemPrompt,
  buildNotificationUserPrompt,
  type NotificationPromptInput,
} from "./notification-prompts.js";

export interface NotificationCopy {
  title: string;
  body: string;
}

@Injectable()
export class NotificationCopyService {
  private readonly logger = new Logger(NotificationCopyService.name);

  constructor(private readonly aiService: AiService) {}

  public async generate(
    input: NotificationPromptInput,
  ): Promise<NotificationCopy | null> {
    const system = buildNotificationSystemPrompt(input.language, input.coach);
    const user = buildNotificationUserPrompt(input);

    try {
      const { data } = await this.aiService.generateJson<
        Partial<NotificationCopy>
      >(
        system,
        user,
        config.notifications.copyModel,
        undefined,
        config.notifications.copyCallTimeoutMs,
      );
      return this.sanitize(data);
    } catch (error) {
      this.logger.error(
        "Notification copy generation failed",
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  private sanitize(raw: Partial<NotificationCopy>): NotificationCopy | null {
    const title = (raw.title ?? "").trim();
    const body = (raw.body ?? "").trim();
    if (title.length === 0 || body.length === 0) {
      return null;
    }
    const { maxTitleLength, maxBodyLength } = config.notifications;
    return {
      title: title.slice(0, maxTitleLength),
      body: body.slice(0, maxBodyLength),
    };
  }
}
