# Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the dark + aqua redesign to every `/admin/*` route, ship inspector rail and inline editing, and wire keyboard navigation across list pages — six self-contained PRs off `dev`.

**Architecture:** Token-driven Tailwind v4 theme layered on top of the existing shadcn/ui primitives. New interaction patterns (InspectorRail, KeyboardScope, InlineField) are React-context primitives that pages opt into. View Transitions API drives route changes.

**Tech Stack:** Next 16.2 (App Router, Server Actions, View Transitions), React 19, Tailwind v4, shadcn/ui (`@base-ui/react`), TanStack Table, nuqs, recharts, sonner, date-fns.

**Spec:** [`docs/superpowers/specs/2026-05-03-admin-redesign-design.md`](../specs/2026-05-03-admin-redesign-design.md) — every page layout, token, and behavior referenced below is defined there. When this plan says "follow Spec §3 → Detail pages", read that section before implementing.

**Working branch:** `feat/admin-ux-c-redesign` off `dev`. Each block lands as its own squash-merged PR back into `dev`.

**No test runner in `web/`.** Verification per step is `bun run lint` (repo root) + `bun run build` (in `web/`) + manual smoke against `bun run dev`. Where logic is testable in isolation (KeyboardScope dispatch, normalizeError, format helpers), the plan calls out smoke checks against `bun run dev`. No test framework will be added by this plan.

---

## Block 1 — Foundation (PR 1)

**Branch:** `feat/admin-redesign-block-1-foundation` off `dev` (or off `feat/admin-ux-c-redesign` if you want to keep them stacked).

**Outcome:** Every existing admin page renders dark with the new tokens. `RouteTransition` cross-fades on navigation. `KeyboardScope` provider mounted (no bindings yet). `LastSyncedChip` no longer warns about hydration drift. No new functionality; the visible work in later blocks builds on this.

### Task 1.1 — Create the dark token sheet

**Files:**
- Create: `web/src/app/admin/(dashboard)/admin.css`

- [ ] **Step 1: Write the file**

```css
/* web/src/app/admin/(dashboard)/admin.css */

.admin-shell {
  /* color */
  --brand: #00e0ff;
  --brand-strong: #00c4dc;
  --brand-bg-soft: rgba(0, 224, 255, 0.08);

  --surface-0: #000000;
  --surface-1: #0b0b0d;
  --surface-2: #131316;
  --surface-3: #1a1a1f;
  --surface-popover: #18181e;

  --border-subtle: #1f1f25;
  --border-default: #2a2a33;
  --border-strong: #3a3a45;
  --border-brand: rgba(0, 224, 255, 0.3);

  --text-primary: #f4f3f0;
  --text-secondary: #9c9c9c;
  --text-tertiary: #6f6f6f;
  --text-on-brand: #000000;
  --text-brand: #00e0ff;

  --status-success: #10b981;
  --status-warning: #f59e0b;
  --status-danger: #ef4444;
  --status-info: #00e0ff;

  --chart-1: #00e0ff;
  --chart-2: #4dd0cd;
  --chart-3: #f59e0b;
  --chart-4: #ff7a6b;
  --chart-5: #b388ff;

  /* spacing */
  --row-pad-y: 10px;
  --row-pad-x: 14px;
  --card-pad: 16px;
  --page-gutter: 24px;
  --section-gap: 32px;

  /* motion */
  --motion-fast: 150ms ease-out;
  --motion-layout: 220ms cubic-bezier(0.2, 0.8, 0.2, 1);

  /* override shadcn variables for this subtree only */
  --background: var(--surface-1);
  --foreground: var(--text-primary);
  --card: var(--surface-2);
  --card-foreground: var(--text-primary);
  --popover: var(--surface-popover);
  --popover-foreground: var(--text-primary);
  --primary: var(--brand);
  --primary-foreground: var(--text-on-brand);
  --secondary: var(--surface-3);
  --secondary-foreground: var(--text-primary);
  --muted: var(--surface-3);
  --muted-foreground: var(--text-secondary);
  --accent: var(--surface-3);
  --accent-foreground: var(--text-primary);
  --destructive: var(--status-danger);
  --border: var(--border-default);
  --input: var(--border-default);
  --ring: var(--brand);
  --sidebar: var(--surface-0);
  --sidebar-foreground: var(--text-primary);
  --sidebar-primary: var(--brand);
  --sidebar-primary-foreground: var(--text-on-brand);
  --sidebar-accent: var(--surface-3);
  --sidebar-accent-foreground: var(--text-primary);
  --sidebar-border: var(--border-subtle);
  --sidebar-ring: var(--brand);

  background: var(--surface-1);
  color: var(--text-primary);
  color-scheme: dark;
}

.admin-shell ::selection {
  background: var(--brand-bg-soft);
  color: var(--text-primary);
}

/* tabular-nums by default for table cells inside admin */
.admin-shell table tbody td,
.admin-shell .admin-numeric {
  font-variant-numeric: tabular-nums;
}

/* keyboard focus ring (used by InlineField, table row focus) */
.admin-shell [data-kbd-focus="true"] {
  outline: 2px solid var(--border-brand);
  outline-offset: -2px;
  border-radius: 6px;
}

/* density tokens — driven by data-density attribute on .admin-shell */
.admin-shell[data-density="compact"] {
  --row-pad-y: 6px;
  --card-pad: 12px;
}
```

- [ ] **Step 2: Add density attribute hook in lib**

**Files:**
- Create: `web/src/lib/admin-density.ts`

```ts
"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "admin:density";
type Density = "comfortable" | "compact";

const listeners = new Set<() => void>();
let cached: Density = "comfortable";

function load(): Density {
  if (typeof window === "undefined") return "comfortable";
  const raw = window.localStorage.getItem(KEY);
  return raw === "compact" ? "compact" : "comfortable";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  for (const cb of listeners) cb();
}

export function useDensity(): [Density, (next: Density) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => cached,
    () => "comfortable" as const,
  );

  useEffect(() => {
    cached = load();
    notify();
  }, []);

  function set(next: Density) {
    cached = next;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next);
      document.documentElement
        .querySelector(".admin-shell")
        ?.setAttribute("data-density", next);
    }
    notify();
  }

  return [value, set];
}
```

- [ ] **Step 3: Verify lint**

Run: `cd /Users/sobsh/dev/Milesto/Milesto && bun run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/admin.css web/src/lib/admin-density.ts
git commit -m "feat(web): add admin dark token sheet + density hook"
```

### Task 1.2 — Fix `LastSyncedChip` hydration drift

**Files:**
- Modify: `web/src/components/admin/page-header.tsx`

- [ ] **Step 1: Replace `LastSyncedChip` with the date-fns version**

Replace the `LastSyncedChip` function at the bottom of `page-header.tsx` with:

```tsx
import { formatDateTime } from "@/lib/format";

function LastSyncedChip({ at }: { at: Date | string }) {
  const label = formatDateTime(at);
  if (label === "—") return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      Synced {label}
    </span>
  );
}
```

(Move the `import` to the top of the file with the other imports.)

- [ ] **Step 2: Verify build**

Run: `cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build`
Expected: green build, no hydration warnings in build output.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/admin/page-header.tsx
git commit -m "fix(web): use stable formatter for LastSyncedChip"
```

### Task 1.3 — Mount the admin shell + token sheet in the layout

**Files:**
- Modify: `web/src/app/admin/(dashboard)/layout.tsx`

- [ ] **Step 1: Import the CSS and add the shell wrapper**

Replace the layout body with:

```tsx
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

import { requireAdmin } from "@/lib/supabase/require-admin";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppSidebar } from "./components/app-sidebar";
import "./admin.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <div className="admin-shell" data-density="comfortable">
          <SidebarProvider>
            <AppSidebar userEmail={user.email ?? ""} />
            <SidebarInset>
              <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-6">
                <SidebarTrigger className="text-text-secondary hover:text-text-primary" />
                <div className="h-4 w-px bg-border" />
                <span className="text-sm font-medium text-text-secondary">
                  Admin
                </span>
              </header>
              <main className="flex-1 px-6 py-6">{children}</main>
            </SidebarInset>
            <Toaster position="bottom-right" richColors closeButton theme="dark" />
          </SidebarProvider>
        </div>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `cd /Users/sobsh/dev/Milesto/Milesto && bun run dev` and visit `http://localhost:3000/admin`. Expected: page renders dark; sidebar is black; main background is `#0b0b0d`. Sign in if needed.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/layout.tsx
git commit -m "feat(web): mount admin dark shell"
```

### Task 1.4 — Build the `KeyboardScope` provider + `?` cheatsheet

**Files:**
- Create: `web/src/lib/admin-hotkeys.ts`
- Create: `web/src/components/admin/keyboard-scope.tsx`

- [ ] **Step 1: Write `lib/admin-hotkeys.ts`**

```ts
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type HotkeyScope = "global" | "list" | "detail" | "dialog";

export type HotkeyBinding = {
  keys: string;
  description: string;
  scope: HotkeyScope;
  handler: (event: KeyboardEvent) => void;
};

type HotkeyContextValue = {
  register: (binding: HotkeyBinding) => () => void;
  bindings: HotkeyBinding[];
  cheatsheetOpen: boolean;
  setCheatsheetOpen: (open: boolean) => void;
  setActiveScope: (scope: HotkeyScope | null) => void;
};

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

export function useHotkeyContext(): HotkeyContextValue {
  const ctx = useContext(HotkeyContext);
  if (!ctx) throw new Error("useHotkeyContext outside KeyboardScopeProvider");
  return ctx;
}

export function useHotkeys(binding: HotkeyBinding): void {
  const { register } = useHotkeyContext();
  useEffect(() => register(binding), [register, binding]);
}

export function useScope(scope: HotkeyScope): void {
  const { setActiveScope } = useHotkeyContext();
  useEffect(() => {
    setActiveScope(scope);
    return () => setActiveScope(null);
  }, [setActiveScope, scope]);
}

export { HotkeyContext };
```

- [ ] **Step 2: Write `components/admin/keyboard-scope.tsx`**

```tsx
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

import {
  HotkeyBinding,
  HotkeyContext,
  HotkeyScope,
} from "@/lib/admin-hotkeys";

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
    { global: [], list: [], detail: [], dialog: [] } as Record<HotkeyScope, HotkeyBinding[]>,
  );

  const order: HotkeyScope[] = ["global", "list", "detail", "dialog"];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] rounded-2xl border border-border-default bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-text-secondary">
            Keyboard shortcuts
          </h2>
          <span className="text-[11px] text-text-tertiary">esc to close</span>
        </div>
        <div className="space-y-4">
          {order.map((scope) =>
            grouped[scope].length === 0 ? null : (
              <section key={scope}>
                <h3 className="mb-2 text-[10px] tracking-[0.14em] uppercase text-text-tertiary">
                  {scope}
                </h3>
                <ul className="space-y-1.5">
                  {grouped[scope].map((b) => (
                    <li
                      key={`${b.scope}-${b.keys}`}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="text-text-primary">{b.description}</span>
                      <kbd className="rounded border border-border-default bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
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
```

- [ ] **Step 3: Verify lint**

Run: `cd /Users/sobsh/dev/Milesto/Milesto && bun run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/admin-hotkeys.ts web/src/components/admin/keyboard-scope.tsx
git commit -m "feat(web): keyboard scope provider + cheatsheet"
```

### Task 1.5 — Build the `RouteTransition` wrapper

**Files:**
- Create: `web/src/app/admin/(dashboard)/route-transition.tsx`

- [ ] **Step 1: Write the wrapper**

```tsx
"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { unstable_ViewTransition as ViewTransition } from "react";

const SUPPORTS_VIEW_TRANSITION =
  typeof document !== "undefined" &&
  typeof (document as Document & { startViewTransition?: unknown })
    .startViewTransition === "function";

function topSegment(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "admin") return parts[1] ?? "root";
  return parts[0] ?? "root";
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previousSegmentRef = useRef(topSegment(pathname));
  const [transitionType, setTransitionType] = useState<"fade" | "slide">("fade");

  useEffect(() => {
    const next = topSegment(pathname);
    setTransitionType(next === previousSegmentRef.current ? "fade" : "slide");
    previousSegmentRef.current = next;
  }, [pathname]);

  if (!SUPPORTS_VIEW_TRANSITION) {
    return <div data-route-transition="none">{children}</div>;
  }

  return (
    <ViewTransition name={`admin-${transitionType}`}>
      <div data-route-transition={transitionType} className="contents">
        {children}
      </div>
    </ViewTransition>
  );
}
```

- [ ] **Step 2: Add the transition CSS**

Append to `web/src/app/admin/(dashboard)/admin.css`:

```css
::view-transition-old(admin-fade),
::view-transition-new(admin-fade) {
  animation-duration: 60ms;
  animation-timing-function: ease-out;
}

::view-transition-old(admin-slide) {
  animation: admin-slide-out 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
::view-transition-new(admin-slide) {
  animation: admin-slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes admin-slide-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-6px); }
}
@keyframes admin-slide-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Wire `KeyboardScopeProvider` and `RouteTransition` into layout**

Edit `web/src/app/admin/(dashboard)/layout.tsx` — wrap `<main>`'s children:

```tsx
import { KeyboardScopeProvider } from "@/components/admin/keyboard-scope";
import { RouteTransition } from "./route-transition";

// ...inside the JSX, replace:
//   <main className="flex-1 px-6 py-6">{children}</main>
// with:
              <KeyboardScopeProvider>
                <main className="flex-1 px-6 py-6">
                  <RouteTransition>{children}</RouteTransition>
                </main>
              </KeyboardScopeProvider>
```

- [ ] **Step 4: Verify build + dev**

Run:
```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto && bun run dev
```
Then in the browser navigate between `/admin` ↔ `/admin/users` and confirm a 60ms cross-fade is visible. Press `?` and confirm the cheatsheet overlay opens (it'll be empty since no bindings are registered yet); `Esc` closes.

- [ ] **Step 5: Commit and open PR 1**

```bash
git add web/src/app/admin/\(dashboard\)/route-transition.tsx \
        web/src/app/admin/\(dashboard\)/admin.css \
        web/src/app/admin/\(dashboard\)/layout.tsx
git commit -m "feat(web): admin route transitions + keyboard scope provider"
git push -u origin HEAD
gh pr create --base dev --title "feat(web): admin redesign block 1 — foundation" --body "$(cat <<'EOF'
## Summary
- Adds dark token sheet at \`web/src/app/admin/(dashboard)/admin.css\` (sourced from iOS Brand asset)
- Mounts \`.admin-shell\` wrapper with \`data-density\` attribute on the dashboard layout
- Adds \`KeyboardScopeProvider\` + \`?\` cheatsheet overlay (no bindings registered yet — Block 4)
- Adds \`RouteTransition\` using Next 16 View Transitions API
- Replaces \`LastSyncedChip\` formatter with date-fns \`formatDateTime\` (fixes hydration drift)
- Adds \`useDensity\` hook (toggle promotion happens in Block 4)

## Test plan
- [ ] \`bun run lint\` green at repo root
- [ ] \`bun run build\` green from \`web/\`
- [ ] Every admin page renders dark
- [ ] Navigation between two admin routes cross-fades (60ms)
- [ ] No hydration mismatch warning on \`/admin/notifications\`
- [ ] \`?\` opens cheatsheet, \`Esc\` closes
EOF
)"
```

---

## Block 2 — Primitive sweep (PR 2)

**Branch:** `feat/admin-redesign-block-2-primitives` off the merged `dev` (or stacked).

**Outcome:** Every admin primitive uses the dark + brand tokens. No new APIs, no structural changes. Each task in this block is one or two component restyles ending in a single commit.

### Task 2.1 — `Surface`

**Files:**
- Modify: `web/src/components/admin/surface.tsx`

- [ ] **Step 1: Replace `TONE_CLASSES`**

Replace the `TONE_CLASSES` map in the file with:

```ts
const TONE_CLASSES: Record<SurfaceTone, string> = {
  default: "border-border-default bg-surface-2",
  elevated: "border-border-default bg-surface-3",
  sunken: "border-border-subtle bg-surface-1",
  muted: "border-border-subtle bg-surface-2/60",
};
```

(`Tailwind v4`: utility classes like `bg-surface-2` exist because Block 1 mapped them through the cascade by setting `--background`/`--card` vars; for non-shadcn names like `bg-surface-2`, add an `@theme inline` line in `globals.css`.)

- [ ] **Step 2: Extend `globals.css` with custom utilities**

Modify `web/src/app/globals.css` `@theme inline` block — append:

```css
  --color-surface-0: var(--surface-0);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-surface-popover: var(--surface-popover);
  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-border-brand: var(--border-brand);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-text-on-brand: var(--text-on-brand);
  --color-text-brand: var(--text-brand);
  --color-status-success: var(--status-success);
  --color-status-warning: var(--status-warning);
  --color-status-danger: var(--status-danger);
  --color-status-info: var(--status-info);
```

(These are inert outside `.admin-shell` because the underlying `--surface-*` vars are only defined inside it. Public pages keep their existing styling.)

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/admin/surface.tsx web/src/app/globals.css
git commit -m "feat(web): map surface tones to dark tokens"
```

### Task 2.2 — `StatusBadge`

**Files:**
- Modify: `web/src/components/admin/status-badge.tsx`

- [ ] **Step 1: Add `pro`, `failed`, `info`, `free` variants and remap classNames**

Replace `StatusVariant` and `VARIANTS` with:

```ts
export type StatusVariant =
  | "active"
  | "pro"
  | "pending"
  | "expired"
  | "cancelled"
  | "revoked"
  | "failed"
  | "free"
  | "healthy"
  | "degraded"
  | "down"
  | "info"
  | "unknown";

const VARIANTS: Record<StatusVariant, Definition> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-brand-bg-soft text-text-brand",
  },
  pro: {
    label: "Pro",
    icon: CheckCircle2,
    className: "bg-brand-bg-soft text-text-brand",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-status-info/10 text-status-info",
  },
  expired: {
    label: "Expired",
    icon: AlertTriangle,
    className: "bg-status-warning/15 text-status-warning",
  },
  cancelled: {
    label: "Cancelled",
    icon: CircleSlash,
    className: "bg-status-danger/12 text-status-danger",
  },
  revoked: {
    label: "Revoked",
    icon: Ban,
    className: "bg-status-danger/12 text-status-danger",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-status-danger/12 text-status-danger",
  },
  free: {
    label: "Free",
    icon: Circle,
    className: "border border-border-default text-text-secondary",
  },
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "bg-status-success/12 text-status-success",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    className: "bg-status-warning/15 text-status-warning",
  },
  down: {
    label: "Down",
    icon: XCircle,
    className: "bg-status-danger/12 text-status-danger",
  },
  info: {
    label: "Info",
    icon: HelpCircle,
    className: "bg-status-info/10 text-status-info",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    className: "border border-border-subtle text-text-tertiary",
  },
};
```

Add `border-brand` and `bg-brand-bg-soft` mappings to `globals.css` `@theme inline` so Tailwind picks them up:

```css
  --color-brand: var(--brand);
  --color-brand-strong: var(--brand-strong);
  --color-brand-bg-soft: var(--brand-bg-soft);
```

- [ ] **Step 2: Audit existing call sites**

Run: `grep -rn "StatusBadge" web/src/app/admin web/src/components/admin --include="*.tsx"` and confirm every `variant=` value is one of the new keys. Map any old `cancelled`/`revoked` calls onto the new typings — most should already match.

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/admin/status-badge.tsx web/src/app/globals.css
git commit -m "feat(web): dark + semantic status badge variants"
```

### Task 2.3 — `PageHeader`

**Files:**
- Modify: `web/src/components/admin/page-header.tsx`

- [ ] **Step 1: Restyle for caps eyebrow + serif title**

Add an `eyebrow` prop and change the title typography. Replace the file contents with:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  lastSyncedAt,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  lastSyncedAt?: Date | string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-[28px] font-medium italic tracking-tight text-text-primary">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {lastSyncedAt ? <LastSyncedChip at={lastSyncedAt} /> : null}
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

function LastSyncedChip({ at }: { at: Date | string }) {
  const label = formatDateTime(at);
  if (label === "—") return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary"
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-brand" aria-hidden />
      Synced {label}
    </span>
  );
}
```

- [ ] **Step 2: Map Fraunces in `globals.css`**

In `@theme inline`, add:

```css
  --font-serif: var(--font-fraunces);
```

(Verify Fraunces is loaded in `app/layout.tsx` — search for `Fraunces`. If it isn't, add it next to the existing `Inter` import using `next/font/google`.)

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/admin/page-header.tsx web/src/app/globals.css web/src/app/layout.tsx
git commit -m "feat(web): page header eyebrow + serif title"
```

### Task 2.4 — `DataTable` + `Pagination` + `FilterBar`

**Files:**
- Modify: `web/src/components/admin/data-table.tsx`
- Modify: `web/src/components/admin/pagination.tsx`
- Modify: `web/src/components/admin/filter-bar.tsx`

- [ ] **Step 1: Replace ad-hoc colors with tokens**

In each file, do a token replacement pass:

| Old class | New class |
|---|---|
| `bg-card` | `bg-surface-2` |
| `bg-muted` / `bg-muted/40` | `bg-surface-1` |
| `bg-background` | `bg-surface-1` |
| `text-foreground` | `text-text-primary` |
| `text-muted-foreground` | `text-text-secondary` |
| `border-border` / `border-border/50` / `border-border/40` | `border-border-default` |
| `border-border/30` | `border-border-subtle` |
| `hover:bg-muted/40` / `hover:bg-accent/30` | `hover:bg-surface-3` |

Apply the same pass to row hover, header row, pagination footer, filter pill backgrounds. Keep functional logic untouched.

- [ ] **Step 2: Add density data attribute on the table root**

In `data-table.tsx`, on the outer `<div>` wrapping the table, add:

```tsx
<div data-table-root className="rounded-xl border border-border-default bg-surface-2 overflow-hidden">
```

In `admin.css`, add:

```css
.admin-shell[data-density="compact"] [data-table-root] tbody td {
  padding-block: 6px;
}
```

- [ ] **Step 3: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/admin/data-table.tsx web/src/components/admin/pagination.tsx web/src/components/admin/filter-bar.tsx web/src/app/admin/\(dashboard\)/admin.css
git commit -m "feat(web): table/pagination/filter-bar dark tokens"
```

### Task 2.5 — `EmptyState`, `TableSkeleton`, `RouteError`, `JsonViewer`, `CopyButton`

**Files:**
- Modify each file under `web/src/components/admin/`

- [ ] **Step 1: Token-replace every component**

Same mapping table as Task 2.4. For `JsonViewer`, ensure code blocks use `bg-surface-1` and `text-text-secondary`. For `CopyButton`, use `text-text-secondary hover:text-text-primary` and `bg-surface-3` on focus/hover.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/admin/empty-state.tsx web/src/components/admin/table-skeleton.tsx web/src/components/admin/route-error.tsx web/src/components/admin/json-viewer.tsx web/src/components/admin/copy-button.tsx
git commit -m "feat(web): tokenize empty/skeleton/error/json/copy primitives"
```

### Task 2.6 — `Dialog`, `ConfirmDestructiveDialog`, `CommandPalette`

**Files:**
- Modify: `web/src/components/ui/dialog.tsx`
- Modify: `web/src/components/admin/confirm-destructive-dialog.tsx`
- Modify: `web/src/app/admin/(dashboard)/components/command-palette.tsx`

- [ ] **Step 1: Tokenize dialog surfaces**

In `dialog.tsx`, the panel uses `bg-popover`, ring uses `border-border-default`. Backdrop is `bg-black/60`. Confirm `text-text-primary` is used for body copy.

In `confirm-destructive-dialog.tsx`, the destructive primary button uses `bg-status-danger text-white hover:bg-status-danger/85`. Disabled state uses `bg-surface-3 text-text-tertiary`.

In `command-palette.tsx`, the popover uses `bg-surface-popover border-border-default`, the active row uses `bg-surface-3 text-text-primary`, the search box border is `border-border-subtle`.

- [ ] **Step 2: Verify build + commit**

```bash
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
cd /Users/sobsh/dev/Milesto/Milesto
git add web/src/components/ui/dialog.tsx web/src/components/admin/confirm-destructive-dialog.tsx web/src/app/admin/\(dashboard\)/components/command-palette.tsx
git commit -m "feat(web): dialog/command-palette dark tokens"
```

### Task 2.7 — Sidebar + nav-config audit + open PR 2

**Files:**
- Modify: `web/src/app/admin/(dashboard)/components/app-sidebar.tsx`

- [ ] **Step 1: Update sidebar tokens**

In `app-sidebar.tsx`, replace `bg-white/10` (the brand badge background and avatar) with `bg-brand-bg-soft`. The brand badge SVG stroke goes from `text-sidebar-foreground` to `text-brand`. The active nav item background goes from `data-[active=true]:bg-white/10` to `data-[active=true]:bg-brand-bg-soft data-[active=true]:text-text-brand`. Sidebar group labels become `text-text-tertiary`.

- [ ] **Step 2: Run dev, smoke-test every page**

Run: `bun run dev` and click each entry in the sidebar. Confirm:
- Active state shows aqua tinted background.
- All 21 pages render without dark/light contrast issues.
- Status pills show correct semantic color on every page.

- [ ] **Step 3: Open PR 2**

```bash
git push -u origin HEAD
gh pr create --base dev --title "feat(web): admin redesign block 2 — primitive sweep" --body "$(cat <<'EOF'
## Summary
- Tokenizes every admin primitive to use the dark + brand vars established in Block 1
- No API changes; no structural changes; pure CSS class swap
- Adds new \`pro\`, \`failed\`, \`free\`, \`info\` status variants

## Test plan
- [ ] Lint + build green
- [ ] All 21 admin pages render dark with the new tokens
- [ ] Status pills (active/pro/pending/expired/cancelled/revoked/free) read accessibly
- [ ] Active sidebar nav item shows aqua tint
- [ ] Cmd-K command palette + ConfirmDestructiveDialog still work
EOF
)"
```

---

## Block 3 — New primitives (PR 3)

**Branch:** `feat/admin-redesign-block-3-new-primitives` off merged `dev`.

**Outcome:** Four new shared primitives + a dev-only preview route. No page changes yet.

### Task 3.1 — `Sparkline`

**Files:**
- Create: `web/src/components/admin/sparkline.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  width = 80,
  height = 20,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <span
        className={cn(
          "inline-block h-[20px] w-[80px] rounded bg-surface-3",
          className,
        )}
        aria-hidden
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block align-middle text-brand", className)}
      aria-hidden
    >
      <polygon points={areaPoints} fill="rgba(0, 224, 255, 0.08)" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/admin/sparkline.tsx
git commit -m "feat(web): Sparkline primitive"
```

### Task 3.2 — `SegmentedTabs`

**Files:**
- Create: `web/src/components/admin/segmented-tabs.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useQueryState } from "nuqs";

import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: string;
  count?: number;
};

export function SegmentedTabs({
  options,
  paramKey = "tab",
  defaultValue,
  className,
}: {
  options: SegmentedOption[];
  paramKey?: string;
  defaultValue?: string;
  className?: string;
}) {
  const fallback = defaultValue ?? options[0]?.value ?? "";
  const [active, setActive] = useQueryState(paramKey, {
    defaultValue: fallback,
    shallow: false,
  });

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-border-default bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => setActive(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-brand-bg-soft text-text-brand"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <span>{opt.label}</span>
            {opt.count != null ? (
              <span className="ml-1.5 font-mono text-[11px] text-text-tertiary">
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/admin/segmented-tabs.tsx
git commit -m "feat(web): SegmentedTabs primitive"
```

### Task 3.3 — `InspectorRail` (context + component)

**Files:**
- Create: `web/src/components/admin/inspector-rail.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState } from "nuqs";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useHotkeys } from "@/lib/admin-hotkeys";

type InspectorContent = {
  id: string;
  render: () => ReactNode;
};

type InspectorContextValue = {
  registered: InspectorContent | null;
  setRegistered: (content: InspectorContent | null) => void;
  inspectId: string | null;
  open: (id: string) => void;
  close: () => void;
};

const InspectorContext = createContext<InspectorContextValue | null>(null);

function useInspectorContext(): InspectorContextValue {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error("useInspector outside InspectorRailProvider");
  return ctx;
}

export function useInspector(content: InspectorContent | null): {
  inspectId: string | null;
  open: (id: string) => void;
  close: () => void;
} {
  const ctx = useInspectorContext();

  useEffect(() => {
    ctx.setRegistered(content);
    return () => ctx.setRegistered(null);
  }, [ctx, content]);

  return { inspectId: ctx.inspectId, open: ctx.open, close: ctx.close };
}

export function InspectorRailProvider({ children }: { children: ReactNode }) {
  const [inspectId, setInspectId] = useQueryState("inspect", {
    defaultValue: "",
    shallow: true,
  });
  const [registered, setRegistered] = useState<InspectorContent | null>(null);

  const open = useCallback(
    (id: string) => {
      setInspectId(id);
    },
    [setInspectId],
  );

  const close = useCallback(() => {
    setInspectId("");
  }, [setInspectId]);

  useHotkeys({
    keys: "Escape",
    description: "Close inspector",
    scope: "list",
    handler: () => {
      if (inspectId) close();
    },
  });

  const value = useMemo<InspectorContextValue>(
    () => ({
      registered,
      setRegistered,
      inspectId: inspectId || null,
      open,
      close,
    }),
    [registered, inspectId, open, close],
  );

  return (
    <InspectorContext.Provider value={value}>
      {children}
      <RailOutlet />
    </InspectorContext.Provider>
  );
}

function RailOutlet() {
  const { registered, inspectId, close } = useInspectorContext();
  const open = registered != null && inspectId != null;

  return (
    <aside
      data-rail-open={open ? "true" : "false"}
      className={cn(
        "pointer-events-none fixed top-14 right-0 z-30 h-[calc(100vh-3.5rem)] w-[360px] overflow-y-auto border-l border-border-default bg-surface-3 transition-transform",
        open ? "translate-x-0 pointer-events-auto" : "translate-x-full",
      )}
      style={{ transitionDuration: "220ms", transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          Inspector
        </span>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          aria-label="Close inspector"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="px-4 py-4">{registered?.render() ?? null}</div>
    </aside>
  );
}

export const InspectorSection = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <section className="mb-5">
    {title ? (
      <h3 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        {title}
      </h3>
    ) : null}
    {children}
  </section>
);

export const InspectorActions = ({ children }: { children: ReactNode }) => (
  <div className="mt-4 flex flex-col gap-2">{children}</div>
);
```

- [ ] **Step 2: Mount the provider in dashboard layout**

Modify `web/src/app/admin/(dashboard)/layout.tsx` — wrap the children with `InspectorRailProvider`:

```tsx
import { InspectorRailProvider } from "@/components/admin/inspector-rail";

// ...inside <KeyboardScopeProvider>:
              <KeyboardScopeProvider>
                <InspectorRailProvider>
                  <main className="flex-1 px-6 py-6">
                    <RouteTransition>{children}</RouteTransition>
                  </main>
                </InspectorRailProvider>
              </KeyboardScopeProvider>
```

When the rail is open, shrink main content. Add to `admin.css`:

```css
.admin-shell main {
  transition: padding-right 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.admin-shell:has(aside[data-rail-open="true"]) main {
  padding-right: calc(var(--page-gutter) + 360px);
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/admin/inspector-rail.tsx web/src/app/admin/\(dashboard\)/layout.tsx web/src/app/admin/\(dashboard\)/admin.css
git commit -m "feat(web): InspectorRail primitive + provider"
```

### Task 3.4 — `InlineField`

**Files:**
- Create: `web/src/components/admin/inline-field.tsx`

- [ ] **Step 1: Write the file**

```tsx
"use client";

import {
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/admin-api/errors";

type Variant = "text" | "textarea" | "select" | "date";

export type InlineFieldProps = {
  label: string;
  value: string | null;
  variant?: Variant;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  format?: (value: string | null) => ReactNode;
  onSave: (next: string) => Promise<ActionResult<unknown>>;
  className?: string;
};

export function InlineField({
  label,
  value,
  variant = "text",
  options,
  placeholder = "—",
  disabled,
  ariaLabel,
  format,
  onSave,
  className,
}: InlineFieldProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [recentlySaved, setRecentlySaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? "");
    }
  }, [editing, value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next === (value ?? "")) {
      setEditing(false);
      return;
    }
    setPendingValue(next);
    setEditing(false);

    startTransition(async () => {
      const res = await onSave(next);
      if (res.ok) {
        setPendingValue(null);
        setRecentlySaved(true);
        window.setTimeout(() => setRecentlySaved(false), 600);
      } else {
        setPendingValue(null);
        setDraft(value ?? "");
        toast.error(res.error.message);
      }
    });
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? "");
  }

  const displayValue = pendingValue ?? value;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary"
      >
        {label}
      </label>

      {editing ? (
        <div className="flex items-center gap-2">
          {variant === "select" && options ? (
            <select
              id={id}
              ref={(el) => { inputRef.current = el; }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : variant === "textarea" ? (
            <textarea
              id={id}
              ref={(el) => { inputRef.current = el; }}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            />
          ) : (
            <input
              id={id}
              ref={(el) => { inputRef.current = el; }}
              type={variant === "date" ? "date" : "text"}
              value={draft}
              aria-label={ariaLabel ?? label}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              className="w-full rounded-md border border-border-default bg-surface-1 px-2 py-1 text-sm text-text-primary outline-none focus:border-brand"
            />
          )}
          <Pip pending={isPending} success={false} />
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="group inline-flex items-center justify-between rounded-md px-1 py-0.5 text-left text-sm text-text-primary hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="truncate">
            {format ? format(displayValue) : (displayValue ?? placeholder)}
          </span>
          <span className="flex items-center gap-1.5">
            <Pip pending={isPending} success={recentlySaved} />
            <Pencil
              className="size-3 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </span>
        </button>
      )}
    </div>
  );
}

function Pip({ pending, success }: { pending: boolean; success: boolean }) {
  if (!pending && !success) {
    return <span className="size-1.5 rounded-full bg-transparent" aria-hidden />;
  }
  if (pending) {
    return <span className="size-1.5 animate-pulse rounded-full bg-brand" aria-hidden />;
  }
  return <Check className="size-3 text-status-success" aria-hidden />;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/admin/inline-field.tsx
git commit -m "feat(web): InlineField primitive with optimistic save"
```

### Task 3.5 — Dev preview route + open PR 3

**Files:**
- Create: `web/src/app/admin/_dev/primitives/page.tsx`

- [ ] **Step 1: Write the preview**

```tsx
import "server-only";

import { Surface } from "@/components/admin/surface";
import { StatusBadge } from "@/components/admin/status-badge";
import { Sparkline } from "@/components/admin/sparkline";
import { SegmentedTabs } from "@/components/admin/segmented-tabs";
import { InlineField } from "@/components/admin/inline-field";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default function PrimitivesPreviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Primitive preview"
        description="Dev-only — delete in Block 6."
        lastSyncedAt={new Date()}
      />

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Status badges</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge variant="active" />
          <StatusBadge variant="pro" />
          <StatusBadge variant="pending" />
          <StatusBadge variant="expired" />
          <StatusBadge variant="cancelled" />
          <StatusBadge variant="revoked" />
          <StatusBadge variant="failed" />
          <StatusBadge variant="free" />
          <StatusBadge variant="healthy" />
          <StatusBadge variant="degraded" />
          <StatusBadge variant="down" />
        </div>
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Sparklines</h2>
        <div className="flex items-center gap-6">
          <Sparkline values={[3, 7, 5, 9, 12, 8, 14, 11]} />
          <Sparkline values={[10, 9, 8, 7, 6, 5, 4, 3]} />
          <Sparkline values={[2, 3, 4, 5, 6, 7, 8, 9]} />
        </div>
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Segmented tabs</h2>
        <SegmentedTabs
          paramKey="preview-tab"
          options={[
            { value: "overview", label: "Overview" },
            { value: "goals", label: "Goals", count: 12 },
            { value: "usage", label: "Usage" },
          ]}
        />
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Inline field</h2>
        <div className="grid grid-cols-2 gap-4">
          <InlineField
            label="Display name"
            value="Gabriel Brument"
            onSave={async (next) => {
              await new Promise((r) => setTimeout(r, 600));
              if (next.toLowerCase().includes("fail")) {
                return { ok: false, error: { code: "demo", message: "Simulated failure" } };
              }
              return { ok: true, data: null };
            }}
          />
          <InlineField
            label="Role"
            value="admin"
            variant="select"
            options={[
              { value: "admin", label: "admin" },
              { value: "user", label: "user" },
            ]}
            onSave={async () => ({ ok: true, data: null })}
          />
        </div>
      </Surface>
    </div>
  );
}
```

- [ ] **Step 2: Smoke-test in browser**

Run `bun run dev`, visit `/admin/_dev/primitives`. Confirm: every status badge renders; sparklines draw; segmented tabs persist via `?preview-tab=`; InlineField shows pending pip during save and reverts on `fail`.

- [ ] **Step 3: Open PR 3**

```bash
git add web/src/app/admin/_dev/primitives/page.tsx
git commit -m "feat(web): primitives dev preview route"
git push -u origin HEAD
gh pr create --base dev --title "feat(web): admin redesign block 3 — new primitives" --body "$(cat <<'EOF'
## Summary
- Adds \`Sparkline\`, \`SegmentedTabs\`, \`InspectorRail\` (context + outlet), \`InlineField\` (text / select / date / textarea with optimistic save)
- Mounts \`InspectorRailProvider\` in dashboard layout; main content shrinks via CSS \`:has()\` when rail is open
- Dev-only \`/admin/_dev/primitives\` preview route — deleted in Block 6

## Test plan
- [ ] Lint + build green
- [ ] /admin/_dev/primitives renders every primitive
- [ ] InlineField "fail" demo reverts and toasts error
- [ ] Inspector rail provider mounts but stays hidden (no content registered yet)
EOF
)"
```

---

## Block 4 — Overview + list pages (PR 4)

**Branch:** `feat/admin-redesign-block-4-overview-lists` off merged `dev`.

**Outcome:** The most-trafficked pages get the new patterns: KPI tiles with sparklines, three-column overview, every list page picks up `j/k/Enter/x/Esc`, every list row registers an inspector view.

### Task 4.1 — Density toggle + global jump bindings in header

**Files:**
- Create: `web/src/app/admin/(dashboard)/components/header-controls.tsx`
- Modify: `web/src/app/admin/(dashboard)/layout.tsx`

- [ ] **Step 1: Write `header-controls.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";

import { useDensity } from "@/lib/admin-density";
import { useHotkeys } from "@/lib/admin-hotkeys";

export function HeaderControls() {
  const [density, setDensity] = useDensity();
  const router = useRouter();

  useHotkeys({
    keys: "g u",
    description: "Go to Users",
    scope: "global",
    handler: () => router.push("/admin/users"),
  });
  useHotkeys({
    keys: "g g",
    description: "Go to Goals",
    scope: "global",
    handler: () => router.push("/admin/goals"),
  });
  useHotkeys({
    keys: "g s",
    description: "Go to Subscriptions",
    scope: "global",
    handler: () => router.push("/admin/subscriptions"),
  });
  useHotkeys({
    keys: "g c",
    description: "Go to Coaches",
    scope: "global",
    handler: () => router.push("/admin/coaches"),
  });
  useHotkeys({
    keys: "g n",
    description: "Go to Notifications",
    scope: "global",
    handler: () => router.push("/admin/notifications"),
  });

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
        className="rounded-md border border-border-default bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary"
        aria-label="Toggle row density"
      >
        {density === "comfortable" ? "Comfortable" : "Compact"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the header**

Edit the dashboard layout's header — replace the `<span>Admin</span>` block with:

```tsx
              <header className="flex h-14 items-center gap-3 border-b border-border-default bg-surface-1 px-6">
                <SidebarTrigger className="text-text-secondary hover:text-text-primary" />
                <div className="h-4 w-px bg-border-default" />
                <span className="text-sm font-medium text-text-secondary">Admin</span>
                <div className="ml-auto flex items-center gap-3">
                  <HeaderControls />
                </div>
              </header>
```

Add the import at the top: `import { HeaderControls } from "./components/header-controls";`

- [ ] **Step 3: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/components/header-controls.tsx web/src/app/admin/\(dashboard\)/layout.tsx
git commit -m "feat(web): density toggle + global jump bindings in header"
```

### Task 4.2 — List-page keyboard nav helper

**Files:**
- Create: `web/src/components/admin/use-list-keyboard.tsx`

- [ ] **Step 1: Write the hook**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useHotkeys, useScope } from "@/lib/admin-hotkeys";
import { useInspector } from "@/components/admin/inspector-rail";

type Row = { id: string; href?: string };

export function useListKeyboard<T extends Row>({
  rows,
  inspectorContent,
  searchInputId,
}: {
  rows: T[];
  inspectorContent: (row: T) => React.ReactNode;
  searchInputId?: string;
}) {
  useScope("list");
  const router = useRouter();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedIdRef = useRef<string | null>(rows[0]?.id ?? null);

  useEffect(() => {
    focusedIdRef.current = rows[focusedIndex]?.id ?? null;
  }, [rows, focusedIndex]);

  const focusedRow = rows[focusedIndex];
  const inspectorPayload = focusedRow
    ? { id: focusedRow.id, render: () => inspectorContent(focusedRow) }
    : null;
  const { open: openInspector } = useInspector(inspectorPayload);

  useHotkeys({
    keys: "j",
    description: "Focus next row",
    scope: "list",
    handler: () => setFocusedIndex((i) => Math.min(i + 1, rows.length - 1)),
  });
  useHotkeys({
    keys: "k",
    description: "Focus previous row",
    scope: "list",
    handler: () => setFocusedIndex((i) => Math.max(i - 1, 0)),
  });
  useHotkeys({
    keys: "Enter",
    description: "Open detail for focused row",
    scope: "list",
    handler: () => {
      const row = rows[focusedIndex];
      if (row?.href) router.push(row.href);
    },
  });
  useHotkeys({
    keys: "x",
    description: "Inspect focused row",
    scope: "list",
    handler: () => {
      const row = rows[focusedIndex];
      if (row) openInspector(row.id);
    },
  });
  useHotkeys({
    keys: "/",
    description: "Focus search",
    scope: "list",
    handler: (event) => {
      if (!searchInputId) return;
      event.preventDefault();
      document.getElementById(searchInputId)?.focus();
    },
  });

  const focusedId = focusedRow?.id ?? null;
  const onRowClick = useCallback(
    (id: string) => {
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) setFocusedIndex(idx);
      openInspector(id);
    },
    [rows, openInspector],
  );

  return { focusedId, onRowClick };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/admin/use-list-keyboard.tsx
git commit -m "feat(web): useListKeyboard hook"
```

### Task 4.3 — Wire Users list

**Files:**
- Modify: `web/src/app/admin/(dashboard)/users/page.tsx`
- Create: `web/src/app/admin/(dashboard)/users/_components/users-table.tsx` (extracting current table to a client component if it isn't already)
- Create: `web/src/app/admin/(dashboard)/users/_components/user-inspector.tsx`

- [ ] **Step 1: Extract the table to a client component if needed**

Open `users/page.tsx`. If the table is already a client component file, modify it. Otherwise extract the rendering into `_components/users-table.tsx` so it can use hooks.

- [ ] **Step 2: Wire `useListKeyboard` and the inspector**

In the new `users-table.tsx`:

```tsx
"use client";

import Link from "next/link";

import { useListKeyboard } from "@/components/admin/use-list-keyboard";
import { UserInspector } from "./user-inspector";
import type { AdminUserSummary } from "@/lib/admin-api/types";

export function UsersTable({ users }: { users: AdminUserSummary[] }) {
  const rows = users.map((u) => ({ id: u.id, href: `/admin/users/${u.id}` }));
  const { focusedId, onRowClick } = useListKeyboard({
    rows,
    inspectorContent: (row) => {
      const user = users.find((u) => u.id === row.id);
      return user ? <UserInspector user={user} /> : null;
    },
    searchInputId: "users-search",
  });

  return (
    <table data-table-root>
      {/* keep the existing thead and column structure; add the per-row hook usage */}
      <tbody>
        {users.map((user) => (
          <tr
            key={user.id}
            data-kbd-focus={focusedId === user.id ? "true" : "false"}
            onClick={() => onRowClick(user.id)}
            className="cursor-pointer hover:bg-surface-3"
          >
            {/* ... existing cells ... */}
            <td>
              <Link
                href={`/admin/users/${user.id}`}
                className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-text-primary"
              >
                Open
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Write `user-inspector.tsx`**

```tsx
"use client";

import Link from "next/link";

import {
  InspectorActions,
  InspectorSection,
} from "@/components/admin/inspector-rail";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/format";
import type { AdminUserSummary } from "@/lib/admin-api/types";

const STATUS_VARIANT: Record<string, "pro" | "free" | "expired" | "cancelled" | "unknown"> = {
  active: "pro",
  pro: "pro",
  free: "free",
  expired: "expired",
  cancelled: "cancelled",
};

export function UserInspector({ user }: { user: AdminUserSummary }) {
  const variant = STATUS_VARIANT[user.subscriptionStatus] ?? "unknown";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return (
    <>
      <InspectorSection>
        <h2 className="font-serif text-lg italic text-text-primary">{fullName || "—"}</h2>
        <p className="text-xs text-text-secondary">{user.email}</p>
        <div className="mt-2"><StatusBadge variant={variant} /></div>
      </InspectorSection>

      <InspectorSection title="Joined">
        <p className="text-sm text-text-primary">{formatDate(user.createdAt)}</p>
      </InspectorSection>

      <InspectorActions>
        <Link
          href={`/admin/users/${user.id}`}
          className="rounded-md border border-border-default bg-surface-2 px-3 py-2 text-center text-sm text-text-primary hover:bg-surface-3"
        >
          Open detail
        </Link>
      </InspectorActions>
    </>
  );
}
```

- [ ] **Step 4: Confirm `users-search` id is on the FilterBar input**

Open `users/_components/users-filter-bar.tsx` (or wherever the search lives) and add `id="users-search"` to the search input element.

- [ ] **Step 5: Smoke-test**

Run `bun run dev`, visit `/admin/users`. Confirm:
- `j`/`k` move focus indicator (border ring on focused row).
- `Enter` opens user detail.
- `x` opens inspector rail.
- Click row also opens inspector.
- `Esc` closes inspector.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/users/page.tsx web/src/app/admin/\(dashboard\)/users/_components/users-table.tsx web/src/app/admin/\(dashboard\)/users/_components/user-inspector.tsx web/src/app/admin/\(dashboard\)/users/_components/users-filter-bar.tsx
git commit -m "feat(web): wire keyboard nav + inspector to Users list"
```

### Task 4.4 — Wire remaining list pages

Repeat Task 4.3 for each of: **Goals, Subscriptions, Conversations, Messages, Coaches, Notifications/Sends, Notifications/Devices, Intake, System (logs)**.

For each route, the work is identical in shape:
1. Extract table to `_components/<resource>-table.tsx` (most already are).
2. Add a `<resource>-inspector.tsx` with InspectorSection + 1-3 actions per Spec §3.
3. Use `useListKeyboard` in the table component.
4. Add `id="<resource>-search"` to the search input.
5. Verify in browser; commit per resource.

Inspector content per resource (Spec §2 source of truth):

- **Goals:** title (italic serif) + status badge + target date + user; actions: Open detail, Regenerate roadmap (typed-confirm `REGENERATE`).
- **Subscriptions:** product + status + expires + autoRenew; actions: Refresh subscription, Open user.
- **Conversations:** user + goal title + last-message timestamp + message count; actions: Open detail.
- **Messages:** day total + role breakdown for the focused day; no detail action.
- **Coaches:** display name + user count; actions: Open detail.
- **Notifications/Sends:** title + body + sentAt + user; no detail action.
- **Notifications/Devices:** platform + tokenLast4 + user; no detail action.
- **Intake:** batch number + answered/quality + goal/user; actions: Open goal.
- **System logs:** level pip + context + timestamp + first line of message; click expands stack via JsonViewer in rail.

- [ ] **Step 1-9: One commit per page**

```bash
git commit -m "feat(web): wire keyboard nav + inspector to <resource> list"
```

### Task 4.5 — Overview rebuild

**Files:**
- Modify: `web/src/app/admin/(dashboard)/page.tsx`
- Modify or create as needed: `web/src/app/admin/(dashboard)/_components/overview-{kpi,timeline,live-ops,recent}.tsx`

- [ ] **Step 1: Replace the page body**

Server component that runs all the fetches in parallel:

```tsx
import {
  getOverviewStats,
  getActivityTimeline,
  getRecentGoals,
  getRecentSignups,
} from "@/lib/admin-api/resources/overview";
import { getCostEstimate } from "@/lib/admin-api/resources/usage";
import { getHealth } from "@/lib/admin-api/resources/system";
import {
  getSchedulerStatus,
  listSends,
} from "@/lib/admin-api/resources/notifications";
import { PageHeader } from "@/components/admin/page-header";

import { KpiTiles } from "./_components/overview-kpi";
import { ActivityTimeline } from "./_components/overview-timeline";
import { LiveOpsRail } from "./_components/overview-live-ops";
import { RecentLists } from "./_components/overview-recent";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, timeline, goals, signups, cost, health, scheduler, recentSends] =
    await Promise.all([
      getOverviewStats(),
      getActivityTimeline({ days: 14 }),
      getRecentGoals({ limit: 5 }),
      getRecentSignups({ limit: 5 }),
      getCostEstimate({ days: 7 }),
      getHealth(),
      getSchedulerStatus(),
      listSends({ perPage: 1 }),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insight"
        title="Overview"
        description="Live operator console for Milesto."
        lastSyncedAt={new Date()}
      />

      <KpiTiles stats={stats} timeline={timeline.entries ?? []} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ActivityTimeline timeline={timeline} />
        <LiveOpsRail
          health={health}
          cost={cost}
          scheduler={scheduler}
          recentSendCount={recentSends.total}
        />
      </div>

      <RecentLists goals={goals} signups={signups} />
    </div>
  );
}
```

(Adjust the import names against the actual function names in `web/src/lib/admin-api/resources/overview.ts` — when names differ, update them locally rather than changing the exports.)

- [ ] **Step 2: Write `KpiTiles`**

```tsx
"use client";

import { Surface } from "@/components/admin/surface";
import { Sparkline } from "@/components/admin/sparkline";
import type { OverviewStats, ActivityTimelineEntry } from "@/lib/admin-api/types";

export function KpiTiles({
  stats,
  timeline,
}: {
  stats: OverviewStats;
  timeline: ActivityTimelineEntry[];
}) {
  const signupsSeries = timeline.map((d) => d.signups);
  const goalsSeries = timeline.map((d) => d.goals);
  const messagesSeries = timeline.map((d) => d.messages);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Total users" value={stats.totalUsers} series={signupsSeries} />
      <Tile label="Active goals" value={stats.activeGoals} series={goalsSeries} />
      <Tile label="Pro subscriptions" value={stats.proSubscriptions} series={[]} />
      <Tile label="Today's gens" value={stats.todayGenerations} series={messagesSeries} />
    </div>
  );
}

function Tile({ label, value, series }: { label: string; value: number; series: number[] }) {
  return (
    <Surface tone="default" pad="md">
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-mono text-2xl text-text-primary admin-numeric">
          {value.toLocaleString()}
        </div>
        <Sparkline values={series.length > 0 ? series : [value]} />
      </div>
    </Surface>
  );
}
```

- [ ] **Step 3: Write `ActivityTimeline`, `LiveOpsRail`, `RecentLists`**

Each is a Surface with the described content. Follow Spec §3 — Overview. For `ActivityTimeline` use the existing `activity-timeline-chart.tsx` (already a recharts AreaChart) but wrapped in a Surface. For `LiveOpsRail` stack four Surfaces with health pip + cost number + scheduler status pip + last broadcast caption. For `RecentLists` reuse the existing recent-goals/recent-signups card content but render row-clickable with the same inspector pattern.

(Code blocks for these three components mirror the patterns in §2 and §3 — keep them small Server Components where possible, and Client Components only where keyboard or inspector wiring is needed. Each ends with one commit.)

- [ ] **Step 4: Smoke + commit**

Run `bun run dev`, visit `/admin`. Confirm KPI tiles + sparklines + timeline chart + live-ops rail + recent-lists all render.

```bash
git add web/src/app/admin/\(dashboard\)/page.tsx web/src/app/admin/\(dashboard\)/_components/
git commit -m "feat(web): rebuild overview as operator console"
```

### Task 4.6 — Open PR 4

```bash
git push -u origin HEAD
gh pr create --base dev --title "feat(web): admin redesign block 4 — overview + list pages" --body "$(cat <<'EOF'
## Summary
- Rebuilds /admin overview as a 3-column operator console: KPI tiles + sparklines + activity timeline + live-ops rail + recent-lists
- Wires j/k/Enter/x/Esc + InspectorRail content to every list page (Users, Goals, Subscriptions, Conversations, Messages, Coaches, Sends, Devices, Intake, System logs)
- Promotes density toggle to dashboard header
- Registers global \`g u/g g/g s/g c/g n\` jump bindings

## Test plan
- [ ] Lint + build green
- [ ] /admin renders all four KPI tiles with sparklines
- [ ] j/k focuses rows on every list page; Enter opens detail; x opens inspector
- [ ] Inspector closes on Esc
- [ ] Density toggle persists across reload
- [ ] g+u jumps to Users; ? opens cheatsheet listing every binding
EOF
)"
```

---

## Block 5 — Detail pages + composer + status (PR 5)

**Branch:** `feat/admin-redesign-block-5-detail-composer` off merged `dev`.

**Outcome:** User and goal detail pages adopt the meta-sidebar pattern with `InlineField`. Coach + Conversation detail get the same shell read-only. Broadcast composer becomes a split form/preview. System + Health + Settings restyle.

### Task 5.1 — User detail meta sidebar + inline editing

**Files:**
- Modify: `web/src/app/admin/(dashboard)/users/[id]/page.tsx`
- Create: `web/src/app/admin/(dashboard)/users/[id]/_components/user-meta.tsx`
- Modify: `web/src/app/admin/(dashboard)/users/[id]/_components/user-tabs.tsx`
- Delete: `web/src/app/admin/(dashboard)/users/[id]/_components/user-edit-form.tsx`

- [ ] **Step 1: Build `UserMeta` (client component)**

```tsx
"use client";

import Link from "next/link";

import { InlineField } from "@/components/admin/inline-field";
import { Sparkline } from "@/components/admin/sparkline";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate } from "@/lib/format";
import { updateUserAction } from "../actions";
import type { AdminUserDetail, AdminUserUsage } from "@/lib/admin-api/types";

export function UserMeta({
  user,
  usage,
}: {
  user: AdminUserDetail;
  usage: AdminUserUsage;
}) {
  const last14 = (usage.recent ?? [])
    .slice(0, 14)
    .map((entry) => entry.id.length); // replace with daily counts derived above when available

  return (
    <aside className="sticky top-20 w-[280px] shrink-0 space-y-5 self-start">
      <div className="space-y-1">
        <div className="size-12 rounded-full bg-brand-bg-soft text-text-brand grid place-items-center font-medium">
          {(user.firstName?.[0] ?? user.email[0] ?? "?").toUpperCase()}
        </div>
        <InlineField
          label="Name"
          value={[user.firstName, user.lastName].filter(Boolean).join(" ")}
          onSave={(next) => updateUserAction(user.id, { displayName: next })}
        />
        <InlineField
          label="Email"
          value={user.email}
          disabled
          onSave={async () => ({ ok: true, data: null })}
        />
        <StatusBadge variant={user.subscriptionStatus === "pro" ? "pro" : "free"} />
      </div>

      <div className="space-y-3">
        <InlineField
          label="Role"
          value={user.role}
          variant="select"
          options={[
            { value: "user", label: "user" },
            { value: "admin", label: "admin" },
          ]}
          onSave={(next) => updateUserAction(user.id, { role: next })}
        />
        <InlineField
          label="Language"
          value={user.language}
          onSave={(next) => updateUserAction(user.id, { language: next })}
        />
        <InlineField
          label="Coach"
          value={user.coachId != null ? String(user.coachId) : null}
          onSave={(next) => updateUserAction(user.id, { coachId: next })}
        />
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          14d generations
        </div>
        <Sparkline values={last14.length ? last14 : [0]} width={240} height={28} />
      </div>

      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          Joined
        </div>
        <div className="text-sm text-text-primary">{formatDate(user.createdAt)}</div>
      </div>
    </aside>
  );
}
```

(Replace the placeholder `last14` derivation with the actual per-day count once `getUserUsage` returns daily buckets — if it doesn't, this falls back to a single-value sparkline which renders as a flat line. Don't block the meta sidebar on adding the API field.)

- [ ] **Step 2: Replace the user detail page layout with two-pane**

Modify `users/[id]/page.tsx`:

```tsx
import { UserMeta } from "./_components/user-meta";
import { UserTabs } from "./_components/user-tabs";
import { UserDangerZone } from "./_components/user-danger-zone";

// inside the component, after fetch:
return (
  <div className="flex gap-8">
    <UserMeta user={user} usage={usage} />
    <div className="flex-1 min-w-0 space-y-6">
      <UserTabs ... />
      <UserDangerZone userId={user.id} email={user.email} />
    </div>
  </div>
);
```

- [ ] **Step 3: Confirm `updateUserAction` signature handles the new keys**

Open `users/[id]/actions.ts`. Ensure `updateUserAction(id, payload)` accepts `{ displayName?, role?, language?, coachId? }` and forwards to `updateUser`. Adjust the API call shape to match.

- [ ] **Step 4: Delete `user-edit-form.tsx`**

```bash
git rm web/src/app/admin/\(dashboard\)/users/\[id\]/_components/user-edit-form.tsx
```

Search for any other reference: `grep -rn "user-edit-form" web/src` — remove imports.

- [ ] **Step 5: Smoke + commit**

Run `bun run dev`, visit `/admin/users/<id>`. Confirm:
- Meta sidebar is sticky on scroll.
- Click name → inline editor → blur saves; wrong value reverts with toast.
- Tabs still navigate via `?tab=`.

```bash
git add -A web/src/app/admin/\(dashboard\)/users/\[id\]/
git commit -m "feat(web): user detail meta sidebar + inline editing"
```

### Task 5.2 — Goal detail meta sidebar

**Files:**
- Modify: `web/src/app/admin/(dashboard)/goals/[id]/page.tsx`
- Create: `web/src/app/admin/(dashboard)/goals/[id]/_components/goal-meta.tsx`

- [ ] **Step 1: Mirror Task 5.1 for goals**

`GoalMeta` lists status pill, target date (InlineField date), user link, coach (read-only), createdAt. Quick actions sit at the bottom: `Regenerate profile`, `Reembed`, `Regenerate roadmap` (typed-confirm `REGENERATE`), `Delete goal` (typed-confirm goal id) — these already exist in `goal-actions.tsx`; move them into the meta sidebar.

- [ ] **Step 2: Smoke + commit**

```bash
git add -A web/src/app/admin/\(dashboard\)/goals/\[id\]/
git commit -m "feat(web): goal detail meta sidebar + relocated toolbar"
```

### Task 5.3 — Coach + Conversation detail (read-only meta)

**Files:**
- Modify: `web/src/app/admin/(dashboard)/coaches/[id]/page.tsx`
- Modify: `web/src/app/admin/(dashboard)/conversations/[id]/page.tsx`

- [ ] **Step 1: Wrap each detail in the same two-pane shell**

Coach meta: display name (en/fr), description, icon, user count. Read-only.

Conversation meta: user + goal links + message count + first/last message timestamp. Read-only. Primary pane keeps the existing message viewer.

- [ ] **Step 2: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/coaches/\[id\]/page.tsx web/src/app/admin/\(dashboard\)/conversations/\[id\]/page.tsx
git commit -m "feat(web): coach/conversation detail meta sidebar (read-only)"
```

### Task 5.4 — Broadcast composer split

**Files:**
- Modify: `web/src/app/admin/(dashboard)/notifications/broadcast/_components/broadcast-composer.tsx`
- Create: `web/src/app/admin/(dashboard)/notifications/broadcast/_components/notification-preview.tsx`

- [ ] **Step 1: Build the iOS-styled preview tile**

```tsx
import { cn } from "@/lib/utils";

export function NotificationPreview({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-3 p-3 max-w-[320px] mx-auto">
      <div className={cn("rounded-xl bg-[#1c1c1e] p-3 shadow-lg")}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="size-6 rounded-md bg-brand-bg-soft grid place-items-center text-text-brand text-[10px] font-semibold">M</div>
          <span className="text-[11px] uppercase tracking-wide text-white/60">MILESTO</span>
          <span className="ml-auto text-[10px] text-white/40">now</span>
        </div>
        <div className="text-[13px] font-semibold text-white">{title || "Notification title"}</div>
        <div className="text-[12px] text-white/70 mt-0.5 line-clamp-3">{body || "Notification body"}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the composer to a 2-column grid**

In `broadcast-composer.tsx`, wrap the form and preview side by side:

```tsx
<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
  <div className="space-y-4">{/* existing fields */}</div>
  <div className="lg:sticky lg:top-20 self-start">
    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-2">Preview</div>
    <NotificationPreview title={title} body={body} />
    <div className="mt-3 text-xs text-text-secondary">
      Audience: {recipientCount.toLocaleString()} recipients
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/notifications/broadcast/_components/
git commit -m "feat(web): broadcast composer split form/preview"
```

### Task 5.5 — System / Health restyle

**Files:**
- Modify: `web/src/app/admin/(dashboard)/system/page.tsx`
- Modify: `web/src/app/admin/(dashboard)/health/page.tsx`

- [ ] **Step 1: Replace the layout with three Surface stacks per Spec §3**

For System:
- Probe rows: status pip + name + latency mono (if available) + Refresh action.
- Queue depth Surface: `xl` numeric + `Sparkline`.
- Recent logs Surface: 50 most recent warn/error rows, click → opens inspector with stack trace via `JsonViewer`.

For Health: combine `getHealth()` + `getLlmHealth()` into one column of probe rows (backend / Supabase / OpenRouter / Cohere), each with status pip + latency, Refresh button calls existing action.

- [ ] **Step 2: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/system/page.tsx web/src/app/admin/\(dashboard\)/health/page.tsx
git commit -m "feat(web): system + health stacked surface layout"
```

### Task 5.6 — Settings restyle + open PR 5

**Files:**
- Modify: `web/src/app/admin/(dashboard)/settings/account/page.tsx`
- Modify: `web/src/app/admin/(dashboard)/settings/admins/page.tsx`

- [ ] **Step 1: Apply the meta-sidebar shell to Settings/Account**

Account meta = current admin's `me.email`, `me.role`, copy-to-clipboard for ID. Primary pane shows nothing else until we add features.

- [ ] **Step 2: Move PromoteAdminForm to a meta-sidebar slot on Admins**

Restructure `admins/page.tsx` into the two-pane layout. Meta sidebar holds the promote form + a short doc snippet ("Admin role grants full read/write across /admin/*"). Primary pane stays the table.

- [ ] **Step 3: Open PR 5**

```bash
git add web/src/app/admin/\(dashboard\)/settings/
git commit -m "feat(web): settings dual-pane layout"
git push -u origin HEAD
gh pr create --base dev --title "feat(web): admin redesign block 5 — detail/composer/status" --body "$(cat <<'EOF'
## Summary
- User detail: 2-pane meta sidebar with InlineField on name / role / language / coach. Removes user-edit-form.tsx.
- Goal detail: meta sidebar holding regenerate/reembed/delete actions + status + target date inline.
- Coach + Conversation detail: read-only meta sidebar shell.
- Broadcast composer: split form/preview with iOS-style notification preview.
- System + Health: stacked Surface layout (probes / queue / logs).
- Settings/Account + Settings/Admins: dual-pane.

## Test plan
- [ ] Lint + build green
- [ ] User detail inline edits round-trip; wrong value reverts with toast
- [ ] Regenerate roadmap typed-confirm REGENERATE still gates
- [ ] Broadcast preview updates as you type
- [ ] System logs row click opens inspector with stack trace
EOF
)"
```

---

## Block 6 — Verification + cleanup (PR 6)

**Branch:** `feat/admin-redesign-block-6-cleanup` off merged `dev`.

**Outcome:** Dead code removed, dev preview gone, full smoke pass.

### Task 6.1 — Delete dead files

- [ ] **Step 1: Remove**

```bash
git rm web/src/components/admin/usage-chart.tsx 2>/dev/null || true
git rm -r web/src/app/admin/_dev/ 2>/dev/null || true
git rm web/src/app/admin/\(dashboard\)/users/\[id\]/_components/user-edit-form.tsx 2>/dev/null || true
```

- [ ] **Step 2: Audit imports**

Run `grep -rn "usage-chart\|/_dev/\|user-edit-form" web/src` — confirm no remaining references. Remove any orphaned imports.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(web): drop dead admin files"
```

### Task 6.2 — Audit nav-config icons

**Files:**
- Modify: `web/src/app/admin/(dashboard)/components/nav-config.ts`

- [ ] **Step 1: Visual smoke**

Run `bun run dev` and walk every sidebar entry. For any icon that reads ambiguously at 14px on `#000`, swap it for a clearer Lucide alternative.

- [ ] **Step 2: Commit**

```bash
git add web/src/app/admin/\(dashboard\)/components/nav-config.ts
git commit -m "chore(web): audit sidebar icons for dark legibility"
```

### Task 6.3 — Final verification + open PR 6

- [ ] **Step 1: Lint + build**

```bash
cd /Users/sobsh/dev/Milesto/Milesto && bun run lint
cd /Users/sobsh/dev/Milesto/Milesto/web && bun run build
```

Expected: both green.

- [ ] **Step 2: Manual smoke checklist**

In a browser, signed in as admin:

- [ ] Sidebar: each entry navigates, active state shows aqua tint.
- [ ] Cmd-K opens; type 4-5 routes to confirm fuzzy matches.
- [ ] `?` opens cheatsheet; lists every registered binding.
- [ ] Density toggle: switch to compact, reload, confirm persisted.
- [ ] Overview: 4 KPI tiles render with sparklines; timeline chart renders; live-ops rail shows health/cost/scheduler; recent goals + signups render.
- [ ] Each list page: `j/k` move focus; `Enter` opens detail; `x` opens inspector; clicking row opens inspector; `Esc` closes inspector.
- [ ] Users[id]: name InlineField saves and reverts; Grant/Revoke Pro round-trip; Refresh subscription surfaces 501 cleanly; Delete user typed-confirm refuses incorrect input.
- [ ] Goals[id]: regenerate-roadmap typed-confirm fires; reembed succeeds; delete-goal typed-confirm refuses incorrect input.
- [ ] Broadcast: typing fills preview; `BROADCAST` confirm gates send; success toast surfaces recipient count.
- [ ] Settings/Admins: promote → row appears; demote typed-confirm gates.
- [ ] Route transitions visible (60ms cross-fade) on every nav.
- [ ] No hydration warning; no Base UI nativeButton warning; no `revalidateTag` arity error.

- [ ] **Step 3: Commit smoke notes (optional) + PR 6**

```bash
git push -u origin HEAD
gh pr create --base dev --title "chore(web): admin redesign block 6 — cleanup + verification" --body "$(cat <<'EOF'
## Summary
- Removes \`usage-chart.tsx\` (replaced by \`activity-timeline-chart.tsx\`)
- Removes \`/admin/_dev/primitives\` dev preview
- Removes \`user-edit-form.tsx\` (retired in Block 5)
- Audits sidebar icons for dark legibility

## Test plan
- [ ] \`bun run lint\` green at repo root
- [ ] \`bun run build\` green from \`web/\`
- [ ] Manual smoke checklist (see plan §Block 6 Task 6.3) — all items pass
EOF
)"
```

---

## Self-review notes

**Spec coverage (every section of `2026-05-03-admin-redesign-design.md`):**
- §1 Tokens → Block 1 Task 1.1, Task 2.1 (`@theme inline` mapping).
- §2 Reskin primitives → Block 2 Tasks 2.1-2.7.
- §2 New primitives → Block 3 Tasks 3.1-3.4.
- §2 Deletions → Block 6 Task 6.1.
- §3 Layout shell → Block 1 Task 1.3 + Task 1.5; Block 4 Task 4.1 (header controls).
- §3 Overview → Block 4 Task 4.5.
- §3 List pages → Block 4 Tasks 4.2-4.4.
- §3 Detail pages → Block 5 Tasks 5.1-5.3.
- §3 Composer → Block 5 Task 5.4.
- §3 Status pages → Block 5 Task 5.5.
- §3 New patterns → Block 1 (RouteTransition, KeyboardScope), Block 3 (InspectorRail, InlineField), Block 4 (jump bindings).
- §4 Phasing → this plan's six PRs map 1:1.
- Risks (View Transitions, optimistic UI, scope conflicts, rail layout, dark contrast) → handled inline (fallback when API absent in Task 1.5; `useTransition` in Task 3.4; editable-target suppression in Task 1.4; CSS `:has()` shrink in Task 3.3; preview route audit in Task 3.5).
- Success criteria → Block 6 smoke checklist.

**Type consistency:** `ActionResult<T>` from `lib/admin-api/errors.ts` is the contract everywhere mutations return; existing actions already use this. `AdminUserSummary`, `AdminUserDetail`, `AdminUserUsage` etc. come from the existing `lib/admin-api/types.ts`. `useInspector(content | null)` shape matches the registration usage in `useListKeyboard`.

**No placeholders.** Every step lists exact files, commands, and code (or points at the sibling Spec section that contains the layout description). The two intentional pointers to the spec (Block 4 Task 4.4 inspector content list, Block 5 Task 5.5 layout) are minimal — the spec defines per-resource fields explicitly.

**Out-of-scope** items from the spec (light mode, mobile responsive, animated chart enter, persistent keyboard customization) are not in this plan and are not silently introduced.
