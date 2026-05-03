"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { promoteAdminAction } from "../actions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function PromoteAdminForm() {
  const [userId, setUserId] = useState("");
  const [isPending, startTransition] = useTransition();

  const valid = UUID_RE.test(userId.trim());

  function handleSubmit() {
    if (!valid || isPending) return;
    const target = userId.trim();
    startTransition(() => {
      void promoteAdminAction(target).then((result) => {
        if (result.ok) {
          toast.success(`Promoted ${result.data.email}`);
          setUserId("");
        } else {
          toast.error(result.error.message);
        }
      });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="user-id (uuid)"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="h-8 w-72 font-mono text-xs"
      />
      <Button
        type="button"
        size="sm"
        onClick={handleSubmit}
        disabled={!valid || isPending}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {isPending ? "Promoting…" : "Promote"}
      </Button>
    </div>
  );
}
