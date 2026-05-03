import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, User, Wrench } from "lucide-react";

import { ApiError } from "@/lib/admin-api/errors";
import { getConversationMessages } from "@/lib/admin-api/resources/conversations";
import type { AdminMessage } from "@/lib/admin-api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { JsonViewer } from "@/components/admin/json-viewer";
import { PageHeader } from "@/components/admin/page-header";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ROLE_META = {
  user: { label: "User", icon: User, accent: "text-foreground" },
  assistant: { label: "Assistant", icon: Bot, accent: "text-primary" },
  tool: { label: "Tool", icon: Wrench, accent: "text-amber-600" },
} as const;

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let messages: AdminMessage[];
  try {
    messages = await getConversationMessages(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/admin/conversations" />}
        className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Conversations
      </Button>

      <PageHeader
        title="Transcript"
        description={`${messages.length} messages · ${id}`}
      />

      {messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="This conversation has no stored messages."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageRow({ message }: { message: AdminMessage }) {
  const meta = ROLE_META[message.role];
  const Icon = meta.icon;
  return (
    <Card className="border-border/60 shadow-none">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between text-xs">
          <div className={`inline-flex items-center gap-1.5 ${meta.accent}`}>
            <Icon className="size-3.5" aria-hidden />
            <span className="font-medium uppercase tracking-wider">
              {meta.label}
            </span>
            {message.toolName ? (
              <span className="font-mono text-muted-foreground">
                · {message.toolName}
              </span>
            ) : null}
          </div>
          <span className="text-muted-foreground tabular-nums">
            {formatDate(message.createdAt)}
          </span>
        </div>
        {message.content ? (
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {message.content}
          </p>
        ) : null}
        {message.toolCalls !== null && message.toolCalls !== undefined ? (
          <JsonViewer value={message.toolCalls} />
        ) : null}
      </CardContent>
    </Card>
  );
}
