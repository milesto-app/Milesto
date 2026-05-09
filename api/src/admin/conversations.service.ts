import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import type { Database } from "../supabase/database.types.js";
import { SupabaseService } from "../supabase/supabase.service.js";
import type {
  AdminConversationList,
  AdminConversationSummary,
  AdminMessage,
  AdminMessageDayBucket,
  AdminMessageRoleCounts,
  AdminMessageStats,
} from "./conversations.types.js";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

const ISO_DATE_LENGTH = 10;
const MS_PER_DAY = 86_400_000;
const STATS_ROW_LIMIT = 50_000;
const MESSAGE_DETAIL_LIMIT = 1000;

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  public async listConversations(
    page: number,
    perPage: number,
    goalId: string | undefined,
    userId: string | undefined,
  ): Promise<AdminConversationList> {
    const supabase = this.supabaseService.getAdminClient();
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    let query = supabase
      .from("conversations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(start, end);

    if (goalId !== undefined) {
      query = query.eq("goal_id", goalId);
    }
    if (userId !== undefined) {
      query = query.eq("user_id", userId);
    }

    const { data, count, error } = await query;
    if (error !== null) {
      this.logger.error(`Failed to list conversations: ${error.message}`);
      throw new InternalServerErrorException("Failed to list conversations");
    }

    const conversations = await this.enrichConversations(data);
    const total = count ?? 0;
    return {
      conversations,
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  public async getMessages(conversationId: string): Promise<AdminMessage[]> {
    await this.requireConversation(conversationId);
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_DETAIL_LIMIT);

    if (error !== null) {
      this.logger.error(
        `Failed to load messages for ${conversationId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load messages");
    }

    return data.map(mapMessage);
  }

  public async getMessageStats(days: number): Promise<AdminMessageStats> {
    const supabase = this.supabaseService.getAdminClient();
    const todayUtcMs = utcMidnightMs(new Date());
    const cutoffIso = new Date(
      todayUtcMs - (days - 1) * MS_PER_DAY,
    ).toISOString();

    const { data, error } = await supabase
      .from("messages")
      .select("created_at, role, tool_name")
      .gte("created_at", cutoffIso)
      .limit(STATS_ROW_LIMIT);

    if (error !== null) {
      this.logger.error(`Failed to load message stats: ${error.message}`);
      throw new InternalServerErrorException("Failed to load message stats");
    }

    const buckets = initialiseStatsBuckets(todayUtcMs, days);
    const totals = emptyTotals();
    const toolBreakdown: Record<string, number> = {};

    for (const row of data) {
      const date = row.created_at.slice(0, ISO_DATE_LENGTH);
      const bucket = buckets.get(date);
      const role = normaliseRole(row.role);

      totals.total += 1;
      if (role !== null) {
        totals.byRole[role] += 1;
      }
      if (bucket !== undefined) {
        bucket.total += 1;
        if (role !== null) {
          bucket.byRole[role] += 1;
        }
      }
      if (row.tool_name !== null) {
        toolBreakdown[row.tool_name] = (toolBreakdown[row.tool_name] ?? 0) + 1;
      }
    }

    return {
      days: [...buckets.values()],
      toolBreakdown,
      totals,
    };
  }

  private async requireConversation(
    conversationId: string,
  ): Promise<ConversationRow> {
    const supabase = this.supabaseService.getAdminClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (error !== null) {
      this.logger.error(
        `Failed to load conversation ${conversationId}: ${error.message}`,
      );
      throw new InternalServerErrorException("Failed to load conversation");
    }
    if (data === null) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    return data;
  }

  private async enrichConversations(
    conversations: ConversationRow[],
  ): Promise<AdminConversationSummary[]> {
    if (conversations.length === 0) {
      return [];
    }

    const userIds = [...new Set(conversations.map((c) => c.user_id))];
    const goalIds = [...new Set(conversations.map((c) => c.goal_id))];
    const conversationIds = conversations.map((c) => c.id);

    const [userMap, emailMap, goalTitleMap, messageCountMap] =
      await Promise.all([
        this.loadUsers(userIds),
        this.loadUserEmails(userIds),
        this.loadGoalTitles(goalIds),
        this.loadMessageCounts(conversationIds),
      ]);

    return conversations.map((conversation) => {
      const user = userMap.get(conversation.user_id);
      return {
        id: conversation.id,
        userId: conversation.user_id,
        userEmail: emailMap.get(conversation.user_id) ?? null,
        userFirstName: user?.first_name ?? null,
        userLastName: user?.last_name ?? null,
        goalId: conversation.goal_id,
        goalTitle: goalTitleMap.get(conversation.goal_id) ?? null,
        messageCount: messageCountMap.get(conversation.id) ?? 0,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      };
    });
  }

  private async loadUsers(
    userIds: string[],
  ): Promise<Map<string, Pick<UserRow, "first_name" | "last_name">>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", userIds);

    const map = new Map<string, Pick<UserRow, "first_name" | "last_name">>();
    for (const row of data ?? []) {
      map.set(row.id, { first_name: row.first_name, last_name: row.last_name });
    }
    return map;
  }

  private async loadUserEmails(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const supabase = this.supabaseService.getAdminClient();
    const map = new Map<string, string>();
    const results = await Promise.all(
      userIds.map(async (id) => supabase.auth.admin.getUserById(id)),
    );
    for (let i = 0; i < userIds.length; i += 1) {
      const id = userIds[i];
      const result = results[i];
      if (id === undefined || result === undefined || result.error !== null) {
        continue;
      }
      const email = result.data.user.email;
      if (email !== undefined) {
        map.set(id, email);
      }
    }
    return map;
  }

  private async loadGoalTitles(
    goalIds: string[],
  ): Promise<Map<string, string>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("goals")
      .select("id, title")
      .in("id", goalIds);

    const map = new Map<string, string>();
    for (const row of data ?? []) {
      map.set(row.id, row.title);
    }
    return map;
  }

  private async loadMessageCounts(
    conversationIds: string[],
  ): Promise<Map<string, number>> {
    const supabase = this.supabaseService.getAdminClient();
    const { data } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(
        row.conversation_id,
        (counts.get(row.conversation_id) ?? 0) + 1,
      );
    }
    return counts;
  }
}

function mapMessage(row: MessageRow): AdminMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: normaliseRole(row.role) ?? "assistant",
    content: row.content,
    toolCalls: row.tool_calls,
    toolCallId: row.tool_call_id,
    toolName: row.tool_name,
    createdAt: row.created_at,
  };
}

function normaliseRole(role: string): keyof AdminMessageRoleCounts | null {
  if (role === "user" || role === "assistant" || role === "tool") {
    return role;
  }
  return null;
}

function utcMidnightMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

function emptyRoleCounts(): AdminMessageRoleCounts {
  return { user: 0, assistant: 0, tool: 0 };
}

function emptyTotals(): { total: number; byRole: AdminMessageRoleCounts } {
  return { total: 0, byRole: emptyRoleCounts() };
}

function initialiseStatsBuckets(
  todayUtcMs: number,
  days: number,
): Map<string, AdminMessageDayBucket> {
  const buckets = new Map<string, AdminMessageDayBucket>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = isoDate(new Date(todayUtcMs - offset * MS_PER_DAY));
    buckets.set(date, { date, total: 0, byRole: emptyRoleCounts() });
  }
  return buckets;
}
