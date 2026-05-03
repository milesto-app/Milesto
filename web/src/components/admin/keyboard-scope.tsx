"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { HotkeyBinding, HotkeyContext, HotkeyScope } from "@/lib/admin-hotkeys";

const SEQUENCE_TIMEOUT_MS = 800;

function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

function eventToToken(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.metaKey) parts.push("Cmd");
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey && event.key.length > 1) parts.push("Shift");
  parts.push(event.key);
  return parts.join("+");
}

export function KeyboardScopeProvider({ children }: { children: ReactNode }) {
  const [bindings, setBindings] = useState<HotkeyBinding[]>([]);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const activeScopeRef = useRef<HotkeyScope | null>(null);
  const sequenceRef = useRef<{ buffer: string; timer: number | null }>({
    buffer: "",
    timer: null,
  });

  const register = useCallback((binding: HotkeyBinding) => {
    setBindings((prev) => [...prev, binding]);
    return () => {
      setBindings((prev) => prev.filter((b) => b !== binding));
    };
  }, []);

  const setActiveScope = useCallback((scope: HotkeyScope | null) => {
    activeScopeRef.current = scope;
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const editable = isEditableTarget(event.target);

      if (!editable && event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setCheatsheetOpen((open) => !open);
        return;
      }

      if (cheatsheetOpen && event.key === "Escape") {
        event.preventDefault();
        setCheatsheetOpen(false);
        return;
      }

      if (editable) return;
      if (cheatsheetOpen) return;

      const token = eventToToken(event);
      const seq = sequenceRef.current;

      const candidate = seq.buffer ? `${seq.buffer} ${token}` : token;

      const matches = bindings.filter((b) => {
        if (b.scope === "global") return true;
        if (b.scope === "dialog") return activeScopeRef.current === "dialog";
        if (b.scope === activeScopeRef.current) return true;
        return false;
      });

      const direct = matches.find((b) => b.keys === token);
      const sequenced = matches.find((b) => b.keys === candidate);

      if (sequenced) {
        sequenced.handler(event);
        seq.buffer = "";
        if (seq.timer) window.clearTimeout(seq.timer);
        return;
      }

      if (direct) {
        direct.handler(event);
        seq.buffer = "";
        if (seq.timer) window.clearTimeout(seq.timer);
        return;
      }

      const couldStartSequence = matches.some((b) =>
        b.keys.startsWith(`${token} `),
      );
      if (couldStartSequence) {
        seq.buffer = token;
        if (seq.timer) window.clearTimeout(seq.timer);
        seq.timer = window.setTimeout(() => {
          seq.buffer = "";
        }, SEQUENCE_TIMEOUT_MS) as unknown as number;
      } else {
        seq.buffer = "";
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings, cheatsheetOpen]);

  const value = useMemo(
    () => ({
      register,
      bindings,
      cheatsheetOpen,
      setCheatsheetOpen,
      setActiveScope,
    }),
    [register, bindings, cheatsheetOpen, setActiveScope],
  );

  return (
    <HotkeyContext.Provider value={value}>
      {children}
      <CheatsheetOverlay
        open={cheatsheetOpen}
        bindings={bindings}
        onClose={() => setCheatsheetOpen(false)}
      />
    </HotkeyContext.Provider>
  );
}

function CheatsheetOverlay({
  open,
  bindings,
  onClose,
}: {
  open: boolean;
  bindings: HotkeyBinding[];
  onClose: () => void;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  const grouped = bindings.reduce<Record<HotkeyScope, HotkeyBinding[]>>(
    (acc, b) => {
      (acc[b.scope] ??= []).push(b);
      return acc;
    },
    { global: [], list: [], detail: [], dialog: [] } as Record<
      HotkeyScope,
      HotkeyBinding[]
    >,
  );

  const order: HotkeyScope[] = ["global", "list", "detail", "dialog"];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] rounded-2xl border border-border bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Keyboard shortcuts
          </h2>
          <span className="text-[11px] text-muted-foreground/70">
            esc to close
          </span>
        </div>
        <div className="space-y-4">
          {order.map((scope) =>
            grouped[scope].length === 0 ? null : (
              <section key={scope}>
                <h3 className="mb-2 text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70">
                  {scope}
                </h3>
                <ul className="space-y-1.5">
                  {grouped[scope].map((b) => (
                    <li
                      key={`${b.scope}-${b.keys}`}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="text-foreground">{b.description}</span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {b.keys}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
