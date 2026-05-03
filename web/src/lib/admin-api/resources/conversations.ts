import "server-only";

import { apiFetch } from "@/lib/admin-api/client";
import type {
  AdminConversationList,
  AdminMessage,
  AdminMessageStats,
} from "@/lib/admin-api/types";

const DEFAULT_REVALIDATE_SECONDS = 30;
const CONVERSATIONS_TAG = "admin:conversations";
const MESSAGES_TAG = "admin:messages";

function conversationTag(id: string) {
  return `admin:conversation:${id}`;
}

export type ListConversationsParams = {
  page?: number;
  perPage?: number;
  goalId?: string;
  userId?: string;
};

export async function listConversations(
  params: ListConversationsParams = {},
): Promise<AdminConversationList> {
  return apiFetch<AdminConversationList>("/admin/conversations", {
    next: {
      tags: [CONVERSATIONS_TAG],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
    query: {
      page: params.page,
      perPage: params.perPage,
      goalId: params.goalId,
      userId: params.userId,
    },
  });
}

export async function getConversationMessages(
  id: string,
): Promise<AdminMessage[]> {
  return apiFetch<AdminMessage[]>(`/admin/conversations/${id}/messages`, {
    next: {
      tags: [CONVERSATIONS_TAG, conversationTag(id)],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });
}

export async function getMessageStats(
  days?: number,
): Promise<AdminMessageStats> {
  return apiFetch<AdminMessageStats>("/admin/messages/stats", {
    next: { tags: [MESSAGES_TAG], revalidate: DEFAULT_REVALIDATE_SECONDS },
    query: { days },
  });
}
