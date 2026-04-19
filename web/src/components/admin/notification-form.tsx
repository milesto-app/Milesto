"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

import {
  sendNotification,
  type SendNotificationPayload,
} from "@/app/admin/(dashboard)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTIFICATION_TYPE_PRESETS } from "@/lib/notifications/types";
import type { AdminUserOption } from "@/lib/supabase/queries/users";

type SendResult = {
  success: boolean;
  message: string;
  recipientCount?: number;
};

const BROADCAST_VALUE = "__all__";
const CUSTOM_TYPE_VALUE = "__custom__";

function userLabel(user: AdminUserOption): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name === "" ? user.email : `${name} · ${user.email}`;
}

export function NotificationForm({ users }: { users: AdminUserOption[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string>(BROADCAST_VALUE);
  const [typeKind, setTypeKind] = useState<string>(CUSTOM_TYPE_VALUE);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  function handleTypeChange(value: string) {
    setTypeKind(value);
    if (value === CUSTOM_TYPE_VALUE) return;
    const preset = NOTIFICATION_TYPE_PRESETS.find((p) => p.kind === value);
    if (preset) {
      setTitle(preset.title);
      setBody(preset.body);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const payload: SendNotificationPayload = {
      title: title.trim(),
      body: body.trim(),
    };

    if (userId !== BROADCAST_VALUE) {
      payload.userIds = [userId];
    }

    if (typeKind !== CUSTOM_TYPE_VALUE) {
      payload.data = { kind: typeKind };
    }

    try {
      const data = await sendNotification(payload);

      if (!data.ok) {
        setResult({ success: false, message: data.message });
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
              htmlFor="notif-user"
              className="text-sm font-medium text-foreground"
            >
              Recipient
            </label>
            <Select<string>
              value={userId}
              onValueChange={(value) => {
                if (value !== null) setUserId(value);
              }}
            >
              <SelectTrigger id="notif-user">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BROADCAST_VALUE}>
                  Broadcast to all users
                </SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Target a specific user, or broadcast to everyone with a registered
              device.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="notif-type"
              className="text-sm font-medium text-foreground"
            >
              Notification type{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Select<string>
              value={typeKind}
              onValueChange={(value) => {
                if (value !== null) handleTypeChange(value);
              }}
            >
              <SelectTrigger id="notif-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_TYPE_VALUE}>
                  Custom (no kind)
                </SelectItem>
                {NOTIFICATION_TYPE_PRESETS.map((preset) => (
                  <SelectItem key={preset.kind} value={preset.kind}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecting a type prefills title and body and tags the payload with{" "}
              <code>kind</code> so the iOS app handles it like a real one.
            </p>
          </div>

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
