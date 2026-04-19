"use client";

import { useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";

import {
  previewNotificationCopy,
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

type PreviewInfo = {
  success: boolean;
  status: "generated" | "failed";
  errorCode: string | null;
  model: string;
  personality: string;
  promptVersion: string;
  latencyMs: number;
  attemptsUsed: number;
  personalized: boolean;
  memoryHooks: Record<string, unknown>;
  kindSpecific: Record<string, unknown>;
};

type Language = "en" | "fr";

const BROADCAST_VALUE = "__all__";
const CUSTOM_TYPE_VALUE = "__custom__";
const DEFAULT_COACH_VALUE = "__default__";

const COACH_OPTIONS: readonly { id: number; label: string }[] = [
  { id: 1, label: "Motivator" },
  { id: 2, label: "Zen" },
  { id: 3, label: "Strict" },
  { id: 4, label: "Buddy" },
];

function userLabel(user: AdminUserOption): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name === "" ? user.email : `${name} · ${user.email}`;
}

export function NotificationForm({ users }: { users: AdminUserOption[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string>(BROADCAST_VALUE);
  const [typeKind, setTypeKind] = useState<string>(CUSTOM_TYPE_VALUE);
  const [language, setLanguage] = useState<Language>("en");
  const [coachValue, setCoachValue] = useState<string>(DEFAULT_COACH_VALUE);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function handleTypeChange(value: string) {
    setTypeKind(value);
    setPreview(null);
    setPreviewError(null);
    if (value === CUSTOM_TYPE_VALUE) return;
    const preset = NOTIFICATION_TYPE_PRESETS.find((p) => p.kind === value);
    if (preset) {
      setTitle(preset.title);
      setBody(preset.body);
    }
  }

  async function handleGenerate() {
    if (typeKind === CUSTOM_TYPE_VALUE) return;
    const preset = NOTIFICATION_TYPE_PRESETS.find((p) => p.kind === typeKind);
    if (!preset) return;

    setPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    setResult(null);

    const personalizedUserId = userId === BROADCAST_VALUE ? undefined : userId;

    try {
      const data = await previewNotificationCopy({
        kind: preset.kind,
        language,
        coachId:
          coachValue === DEFAULT_COACH_VALUE ? undefined : Number(coachValue),
        stubTitle: preset.title,
        stubTeaser: preset.body,
        ...(personalizedUserId !== undefined
          ? { userId: personalizedUserId }
          : {}),
      });

      if (!data.ok) {
        setPreviewError(data.message);
        return;
      }

      if (data.status === "generated" && data.title && data.body) {
        setTitle(data.title);
        setBody(data.body);
      }

      setPreview({
        success: data.status === "generated",
        status: data.status,
        errorCode: data.errorCode,
        model: data.model,
        personality: data.personality,
        promptVersion: data.promptVersion,
        latencyMs: data.latencyMs,
        attemptsUsed: data.attemptsUsed,
        personalized: personalizedUserId !== undefined,
        memoryHooks: data.resolvedContext.memoryHooks,
        kindSpecific: data.resolvedContext.kindSpecific,
      });
    } catch {
      setPreviewError("Failed to reach the server");
    } finally {
      setPreviewing(false);
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

  const canGenerate = typeKind !== CUSTOM_TYPE_VALUE && !previewing;

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="notif-language"
                className="text-sm font-medium text-foreground"
              >
                Language
              </label>
              <Select<string>
                value={language}
                onValueChange={(value) => {
                  if (value === "en" || value === "fr") setLanguage(value);
                }}
              >
                <SelectTrigger id="notif-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="notif-coach"
                className="text-sm font-medium text-foreground"
              >
                Coach
              </label>
              <Select<string>
                value={coachValue}
                onValueChange={(value) => {
                  if (value !== null) setCoachValue(value);
                }}
              >
                <SelectTrigger id="notif-coach">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_COACH_VALUE}>
                    Default (motivateur)
                  </SelectItem>
                  {COACH_OPTIONS.map((coach) => (
                    <SelectItem key={coach.id} value={String(coach.id)}>
                      {coach.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {previewing ? "Generating..." : "Generate with LLM"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {userId === BROADCAST_VALUE
                ? "Pick a recipient to personalize with their goal, milestones and streak."
                : "Pulls this user's goal, milestones, task and streak into the prompt."}
            </p>
          </div>

          {preview && (
            <div
              className={`space-y-2 rounded-lg px-4 py-3 text-xs ${
                preview.success
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge
                  className={`border-0 font-medium ${
                    preview.success
                      ? "bg-primary/20 text-primary"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {preview.success ? "Generated" : "Failed"}
                </Badge>
                <span>
                  {preview.personality} · {preview.model} ·{" "}
                  {preview.attemptsUsed} attempt
                  {preview.attemptsUsed === 1 ? "" : "s"} · {preview.latencyMs}
                  ms
                </span>
                <Badge className="ml-auto border-0 bg-foreground/10 text-foreground font-medium">
                  {preview.personalized ? "Personalized" : "Generic"}
                </Badge>
              </div>
              {!preview.success && preview.errorCode && (
                <div>Error: {preview.errorCode}</div>
              )}
              {preview.personalized &&
                Object.keys(preview.memoryHooks).length > 0 && (
                  <details className="text-foreground/80">
                    <summary className="cursor-pointer select-none">
                      Context sent to the LLM
                    </summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-foreground/5 p-2 text-[10px] leading-snug">
                      {JSON.stringify(
                        {
                          memory_hooks: preview.memoryHooks,
                          kind_specific: preview.kindSpecific,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                )}
            </div>
          )}

          {previewError && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {previewError}
            </div>
          )}

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
