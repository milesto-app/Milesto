"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type SendResult = {
  success: boolean;
  message: string;
  recipientCount?: number;
};

export function NotificationForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      body: body.trim(),
    };

    const trimmedUserId = userId.trim();
    if (trimmedUserId) {
      payload.userIds = [trimmedUserId];
    }

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({
          success: false,
          message:
            data.message ?? data.error ?? `Request failed (${res.status})`,
        });
        return;
      }

      setResult({
        success: true,
        message: data.queued
          ? `Notification queued for ${data.recipientCount} recipient${data.recipientCount === 1 ? "" : "s"}`
          : "No recipients with registered device tokens",
        recipientCount: data.recipientCount,
      });
    } catch {
      setResult({
        success: false,
        message: "Failed to reach the server",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-none">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="notif-title"
              className="text-sm font-medium text-foreground"
            >
              Title
            </label>
            <Input
              id="notif-title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notif-body"
              className="text-sm font-medium text-foreground"
            >
              Body
            </label>
            <Textarea
              id="notif-body"
              placeholder="Notification message"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notif-user"
              className="text-sm font-medium text-foreground"
            >
              User ID{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Input
              id="notif-user"
              placeholder="Leave empty to broadcast to all users"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Target a specific user by UUID, or leave empty to send to
              everyone.
            </p>
          </div>

          <Button type="submit" disabled={sending} className="gap-2">
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending..." : "Send Notification"}
          </Button>

          {result && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                result.success
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <Badge
                className={`border-0 font-medium ${
                  result.success
                    ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                }`}
              >
                {result.success ? "Sent" : "Error"}
              </Badge>
              {result.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
