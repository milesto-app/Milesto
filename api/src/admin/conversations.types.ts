export type AdminMessageRole = "user" | "assistant" | "tool";

export interface AdminConversationSummary {
  id: string;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  goalId: string;
  goalTitle: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationList {
  conversations: AdminConversationSummary[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminMessage {
  id: string;
  conversationId: string;
  role: AdminMessageRole;
  content: string | null;
  toolCalls: unknown;
  toolCallId: string | null;
  toolName: string | null;
  createdAt: string;
}

export interface AdminMessageRoleCounts {
  user: number;
  assistant: number;
  tool: number;
}

export interface AdminMessageDayBucket {
  date: string;
  total: number;
  byRole: AdminMessageRoleCounts;
}

export interface AdminMessageStats {
  days: AdminMessageDayBucket[];
  toolBreakdown: Record<string, number>;
  totals: {
    total: number;
    byRole: AdminMessageRoleCounts;
  };
}
