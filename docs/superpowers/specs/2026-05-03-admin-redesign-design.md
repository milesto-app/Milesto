# Admin Dashboard UI/UX Redesign — Design Spec

**Date:** 2026-05-03
**Branch from:** `dev` (post-PR #164)
**Direction:** dark-only, black + aqua, sourced from the iOS `Brand` asset
**Approach:** C — reskin + UX upgrades + new interaction patterns

## Goal

Replace the placeholder shadcn defaults across `/admin/*` with a deliberately-crafted, dark-only operator console that an admin wants to live in. Reuse the iOS app's brand language so all three Milesto surfaces (iOS, admin, marketing) feel cousin to each other.

## Scope

**In scope.** All 21 admin routes under `web/src/app/admin/(dashboard)/`. The dashboard layout shell (sidebar, header, route transitions). Every primitive in `web/src/components/admin/`. New shared primitives where the existing ones cannot stretch.

**Out of scope.** Public marketing pages (`/support`, `/privacy`). The login screen visual remains untouched in this spec — it stays light to match marketing. iOS or API changes. New endpoints (PR #164 already wired all 48).

## Non-goals

- Light mode for admin (dropped — operators run dark; OS toggle will not switch the admin theme).
- Mobile responsive admin (tablet+ only — admin stays desktop-first).
- A new component library or framework migration.

---

## §1 · Token system

A single new file at `web/src/app/admin/(dashboard)/admin.css`, imported by `app/admin/(dashboard)/layout.tsx`. Public/marketing pages keep `globals.css` untouched.

### Color (CSS variables, all dark)

```
--brand                #00E0FF   active nav, primary CTA, focus ring, accent text
--brand-strong         #00C4DC   CTA hover; brand bg with white text
--brand-bg-soft        rgba(0, 224, 255, 0.08)   Pro pill, active nav bg

--surface-0            #000000   app shell, sidebar
--surface-1            #0B0B0D   page background
--surface-2            #131316   cards, table, filter bar (primary surface)
--surface-3            #1A1A1F   row hover, selected row, inspector rail
--surface-popover      #18181E   popovers, dialogs, command palette

--border-subtle        #1F1F25
--border-default       #2A2A33
--border-strong        #3A3A45
--border-brand         rgba(0, 224, 255, 0.30)

--text-primary         #F4F3F0
--text-secondary       #9C9C9C
--text-tertiary        #6F6F6F
--text-on-brand        #000000
--text-brand           #00E0FF

--success              #10B981
--warning              #F59E0B
--danger               #EF4444
--info                 #00E0FF

--chart-1              #00E0FF   aqua
--chart-2              #4DD0CD   teal
--chart-3              #F59E0B   amber
--chart-4              #FF7A6B   coral
--chart-5              #B388FF   violet
```

Map to Tailwind v4 via `@theme inline` so utilities like `bg-surface-2`, `text-text-secondary`, `border-border-default` exist in JSX. Status colors stay accessible at AAA on `--surface-2` for body text and AA for label text.

### Typography

- **Sans:** Inter (existing). Default `font-feature-settings: 'tnum'` on table cells and metric numerics.
- **Serif accent:** Fraunces (italic only). Use restricted to: page titles (`<h1>`), section eyebrows, empty-state hero copy.
- **Mono:** Geist Mono (existing). IDs, JSON, log streams, latency numbers.

Scale (px, applied via existing Tailwind size classes):

```
caps     10  (uppercase eyebrow, tracking 0.14em)
xxs      11  (status pill, breadcrumb)
xs       12  (table body small, secondary)
sm       13  (table body, body small)
base     14  (body, default form field)
lg       16  (subhead)
xl       22  (card metric)
2xl      28  (page title)
3xl      36  (overview hero metric)
```

Title tracking `-0.02em`; eyebrow tracking `0.14em`; body default tracking.

### Space, radius, motion

- **Space:** 4-base. Page gutter `24`, section gap `32`, card pad `16`, row pad `10` vertical / `14` horizontal.
- **Radius:** card `14`, pill `999`, button `8`, input `10`. Matches iOS app radii.
- **Shadow:** none. Dark surfaces read cleaner with hairline borders.
- **Motion:** `150ms ease-out` for hover/focus; `220ms cubic-bezier(.2,.8,.2,1)` for layout. Route transitions via Next 16 View Transitions API (60ms cross-fade default; 220ms slide for sibling-route navigations).

### Density

Promote the existing `data-table.tsx` density toggle to the dashboard header. Two modes — comfortable (row 36px) and compact (row 28px) — persisted via the existing `useSyncExternalStore` pattern. Applies to table row height, filter-bar pill height, and card vertical padding (multiplier on `--space-row` token).

---

## §2 · Component primitives

### Reskin only — no API change

Token-swap each of these. Each diff stays small (CSS classes only):

- `surface.tsx` — gain a `tone` prop (`default | sunken | elevated`) mapping to `surface-2 | surface-1 | surface-3`. Keep existing `pad` API.
- `page-header.tsx` — restyle layout: caps eyebrow → italic-serif title → `LastSyncedChip` (rebuilt to use `formatDateTime` from `lib/format.ts`) → actions slot. Right-align actions; live dot inline with chip.
- `status-badge.tsx` — audit variants:
  - `active | pro` → brand-bg-soft + brand text
  - `pending` → info
  - `expired | warning` → warning bg + warning text
  - `cancelled | revoked | failed` → danger
  - `free | inactive` → ghost (transparent + border-default + text-secondary)
- `data-table.tsx`, `pagination.tsx`, `filter-bar.tsx`, `column-helpers.tsx` — restyle only.
- `empty-state.tsx`, `table-skeleton.tsx`, `route-error.tsx` — restyle.
- `json-viewer.tsx`, `copy-button.tsx` — restyle.
- `confirm-destructive-dialog.tsx`, `dialog.tsx`, `command-palette.tsx` — restyle, keep keyboard behavior.
- `app-sidebar.tsx`, `sidebar.tsx` (shadcn fork) — restyle. Active state uses brand-bg-soft + brand text. Group labels caps tracking.

### New primitives

#### `InspectorRail`

`web/src/components/admin/inspector-rail.tsx`

- Slide-in right panel, 360px wide, mounted in dashboard layout.
- State driven by nuqs `?inspect=<id>` query param.
- Page registers content via `useInspector({ id, render })` hook + React context. Layout renders `<aside>` only when `?inspect` is set.
- Composable: `<InspectorRail.Header>`, `<InspectorRail.Section title>`, `<InspectorRail.Actions>`.
- Closes on `Esc`, click on backdrop, or `?inspect` removed.
- Keyboard: registered via `KeyboardScope` (`x` open, `Esc` close).

Per-resource content (rendered inside the rail):

- **Users list:** name + email + status pill, joined-date, coach, "Open detail" + "Grant Pro" / "Revoke Pro" buttons.
- **Goals list:** title + status + target date, user, "Open detail" + "Regenerate roadmap" (typed-confirm).
- **Subscriptions list:** product + status + expires, "Refresh subscription" + "Open user".
- **Conversations list:** user + goal + last-message timestamp + message count, "Open detail".
- **Notifications/Sends, Notifications/Devices, Coaches, Intake, System logs:** read-only summary, "Open detail" where applicable.

#### `InlineField`

`web/src/components/admin/inline-field.tsx`

- Variants: `text | select | date | textarea`.
- Renders value as text. Click or `Enter` flips to input. `Enter`/blur saves; `Esc` cancels.
- Saves through a passed Server Action (existing). `useTransition` for pending. Optimistic UI: value updates immediately, reverts on error with `sonner` toast.
- Pip indicator beside field during save (`brand` while pending, `success` for ~600ms after, `danger` on error).
- Accessibility: `aria-live="polite"` for the pip; field becomes a real `<input>` when editing.

Used on user/goal detail pages to retire `user-edit-form.tsx`.

#### `KeyboardScope`

`web/src/lib/admin-hotkeys.ts` + `web/src/components/admin/keyboard-scope.tsx`

- Provider mounted in dashboard layout.
- Page calls `useHotkeys({ keys: 'j', handler, when: 'list' })` to register handlers scoped to a context (`global | list | detail | dialog`).
- Dialog/inspector open suppresses `list`/`detail` scopes automatically.
- `?` opens cheatsheet overlay listing every active binding.

Bindings (ship with Block 4):

```
global    Cmd-K   command palette
global    ?       keyboard cheatsheet
global    g u     /admin/users
global    g g     /admin/goals
global    g s     /admin/subscriptions
global    g c     /admin/coaches
global    g n     /admin/notifications
list      j       focus next row
list      k       focus previous row
list      Enter   open detail for focused row
list      x       open inspector for focused row
list      /       focus search
detail    Esc     back to list
dialog    Esc     close
```

#### `Sparkline`

`web/src/components/admin/sparkline.tsx`

- 80×20 inline SVG trend, no axes, no tooltip.
- Single prop: `values: number[]`. Line in `--brand`, area fill `--brand-bg-soft`.
- Used in overview KPI tiles and goal/user detail meta sidebar.

#### `RouteTransition`

`web/src/app/admin/(dashboard)/route-transition.tsx`

- Wraps `{children}` in Next 16's `unstable_ViewTransition` component.
- Sidebar and header sit *outside* the transition boundary so they don't flicker.
- 60ms cross-fade default; sibling-route navigation (e.g. `/admin/users` → `/admin/goals`) uses 220ms slide. (Discriminated by comparing top-level segment.)

#### `SegmentedTabs`

`web/src/components/admin/segmented-tabs.tsx`

- Replaces `UrlTabs` on detail pages.
- Pill segmented control: 8px radius, brand-tinted active, mono digits for counts (`Goals · 12`).
- URL state via existing nuqs `?tab=` param.

### Deletions

- `web/src/components/admin/usage-chart.tsx` — duplicated by `activity-timeline-chart.tsx`. Keep the latter.
- `web/src/app/admin/(dashboard)/users/[id]/_components/user-edit-form.tsx` — replaced by `InlineField` on user detail.
- `web/src/app/admin/_dev/primitives/page.tsx` — temporary preview route, removed in Block 6.

---

## §3 · Page patterns + interactions

### Layout shell

```
┌─────────┬───────────────────────────────────┬───────────┐
│ Sidebar │ Header                            │ Inspector │
│ 240px   │  CmdK pill · breadcrumb · density │ rail      │
│ surface │  · live dot · profile             │ 360px     │
│ -0      ├───────────────────────────────────┤ surface-3 │
│         │                                   │ slide-in  │
│ Insight │   PageHeader                      │ via       │
│ Lifecyl │   ───                             │ ?inspect  │
│ Ops     │   Content                         │           │
│         │                                   │           │
│ Settings│                                   │           │
└─────────┴───────────────────────────────────┴───────────┘
```

- Sidebar collapsible to 56px (icon-only), state persisted via existing provider.
- Header gains a `Cmd-K` pill ("Search Milesto…"), breadcrumb (last 2 levels), density toggle, live status dot, profile menu.
- `RouteTransition` wraps `<main>`. Sidebar/header outside the boundary so they don't flicker on navigation.
- Inspector rail mounts in layout, only renders when `?inspect=` is present.

### Overview (`/admin`) — operator console

Three-column grid on the page body:

- **Top row** — 4 KPI tiles. Each tile: caps eyebrow + 28px metric (mono tabular) + `Sparkline` + delta-vs-7d.
- **Left main** — Activity timeline area chart, 14d window, full bleed inside Surface.
- **Right rail** (in-page, distinct from layout inspector rail) — stacked Surface tiles: Health summary, 7d cost, scheduler status, 5 most-recent system warnings/errors. Polled every 30s.
- **Bottom row** — two-column: Recent goals (5 rows) + Recent signups (5 rows). Both rows clickable → inspector.

### List pages

Shared shape across Users / Goals / Subscriptions / Conversations / Messages / Coaches / Sends / Devices / Intake / System logs:

- `PageHeader` and `FilterBar` both sticky on scroll, stacked (header on top, filter bar pinned beneath it). Stickiness scoped to `<main>` so the inspector rail and sidebar don't lift.
- `DataTable` fills the rest. Row hover reveals trailing quick-action icons (Open, Inspect, primary mutation).
- Keyboard: `j/k` move row focus, `Enter` opens detail, `x` opens inspector, `/` focuses search.
- Click row → opens `InspectorRail`. (Mouse click is the inspector path; `Enter` on a keyboard-focused row is the detail path.)
- Footer: pagination on a `surface-1` strip, mono numerics, `n – m of total · ‹ ›`.

### Detail pages — Users / Goals / Coaches / Conversations

Two-pane:

```
┌──────────────┬───────────────────────────────────┐
│ Meta sidebar │ Tabbed primary pane               │
│ 280px sticky │  ┌────┬─────┬─────┬─────┐         │
│ avatar       │  │Over│Goals│Usage│Subs│ ...      │
│ inline name  │  └────┴─────┴─────┴─────┘         │
│ inline email │                                   │
│ status pill  │  Active tab content               │
│ ─────        │                                   │
│ created      │                                   │
│ coach        │                                   │
│ subs status  │                                   │
│ ─────        │                                   │
│ Quick acts   │                                   │
│ ─────        │                                   │
│ Danger zone  │                                   │
└──────────────┴───────────────────────────────────┘
```

- Meta sidebar (~280px) sticky; scrolls independently when content grows.
- Editable scalar fields (role, language, timezone, coach, name) → `InlineField`. Saves via existing Server Actions.
- Below identity, a `Sparkline` of the user's last-14d generations (or goals' weekly task completions) sits inside the meta block, single line, no axes, mono caption.
- `SegmentedTabs` for primary pane.
- Quick actions in meta sidebar (Grant Pro, Revoke Pro, Refresh subscription, Promote admin) — typed-confirm modal still gates destructive ones.
- Danger zone fixed at bottom of meta sidebar.
- Goal detail mirrors this exactly: meta = goal status / target / coach / created; tabs = Overview / Roadmap / Intake / Embeddings / Debriefs / Coach memory.
- Coach + Conversation detail use the meta-sidebar shell read-only — no inline fields.

### Composer pages — Notifications/Broadcast

Two-column split:

- **Left:** form (title / body / segment).
- **Right:** live preview phone-mockup tile, renders title + body inside an iOS-style notification card (using actual iOS notification chrome — rounded rect, app icon, dismiss button mock). Audience count derived from `getSubscriptionDistribution()`.
- Send → typed-confirm `BROADCAST` (existing dialog, restyled).

### Status pages — System / Health

Single column, three Surface stacks:

- **Probes** — backend / Supabase / OpenRouter / Cohere. Each row: status pip + name + latency mono number + Refresh action.
- **Queue depth** — large numeric (`xl`) + small `Sparkline` of recent values.
- **Recent logs** — last 50 warn/error rows, clickable → inspector with stack trace via `JsonViewer`.

### New patterns at a glance

- **Inspector rail** — every list page registers content; closes on `Esc`.
- **Inline editing** — meta sidebar fields on user/goal detail. No more edit modal.
- **Keyboard cheatsheet** — `?` opens overlay.
- **View Transitions** — every nav cross-fades 60ms; sibling routes slide 220ms.
- **Quick actions on hover** — tables expose 1-3 trailing icons; same target as inspector but skip the rail open for one-click flows.

---

## §4 · Phasing

Six self-contained PRs off `dev`. Each shippable on its own. Blocks 1-3 are infra and could land back-to-back; 4-5 are the visible work; 6 is cleanup.

### Block 1 — Foundation

- `web/src/app/admin/(dashboard)/admin.css` — every dark + brand token.
- `web/src/lib/format.ts` — replace `LastSyncedChip` `toLocaleTimeString` to fix hydration drift.
- `RouteTransition` mounted around `<main>` in dashboard layout.
- `KeyboardScope` provider mounted in dashboard layout (provider only; bindings register in Block 4).
- `?` cheatsheet overlay primitive.

**Verify:** every existing page renders dark with no hydration warnings. Cmd-K still opens. No layout regression. `bun run lint && bun run build`.

### Block 2 — Primitive sweep

Token-only restyle of: `Surface`, `PageHeader`, `StatusBadge`, `DataTable`, `FilterBar`, `Pagination`, `EmptyState`, `TableSkeleton`, `RouteError`, `JsonViewer`, `CopyButton`, `ConfirmDestructiveDialog`, `Dialog`, `CommandPalette`, `Sidebar`, `app-sidebar.tsx`. No new APIs.

**Verify:** every page reads correctly on dark; status pills show all five states (active / pending / expired / cancelled / free) accessibly. Lint + build green.

### Block 3 — New primitives

- `InspectorRail` (with React context + nuqs).
- `InlineField` (text/select/date/textarea, optimistic UI).
- `Sparkline`.
- `SegmentedTabs`.
- `/admin/_dev/primitives` — dev-only force-dynamic preview route showing each primitive in isolation. Not linked from sidebar.

**Verify:** preview route renders every primitive; ESC closes inspector; InlineField saves and reverts on error; lint + build green.

### Block 4 — Overview + list pages

- Overview rebuild: KPI tiles + sparklines + 3-column grid + activity feed + live ops rail.
- List pages get keyboard nav (`j/k/Enter/x/Esc`), `InspectorRail` content, hover quick-actions.
- Density toggle promoted to header.
- `gu / gg / gs / gc / gn` jump bindings registered.

**Verify:** keyboard cheatsheet shows every binding; opening inspector on every list page works; density toggle persists across reload; route transitions visible. Lint + build green.

### Block 5 — Detail pages + composer + status

- User detail → 2-pane meta sidebar with `InlineField` on editable fields. `user-edit-form.tsx` deleted.
- Goal detail → same pattern.
- Coach + Conversation detail → meta-sidebar shell read-only.
- Broadcast composer → split form/preview with iOS notification preview tile.
- System + Health → single-column Surface stacks with refresh actions.
- Settings/Account + Settings/Admins → restyle, promote-form moves to sidebar pattern.

**Verify:** every mutation still round-trips; typed-confirm gates still fire; inline edit reverts on error. Lint + build green.

### Block 6 — Verification + cleanup

- Delete `usage-chart.tsx` (replaced by `activity-timeline-chart.tsx`).
- Delete `/admin/_dev/primitives` route.
- Delete `user-edit-form.tsx` if Block 5 retired it.
- Audit `nav-config.ts` icons against 14px on black; swap unreadable ones.
- `bun run lint` + `bun run build` from `web/`.
- Manual smoke against staging: every nav entry, one mutation per resource, keyboard cheatsheet, density toggle, route transitions visible, inspector opens/closes on every list page.

---

## Risks

1. **View Transitions API** is `unstable_*` in Next 16; it may misbehave with concurrent fetches. Fallback: feature-flag the wrapper to a no-op opacity transition if View Transitions throws. (Block 1 risk.)
2. **InlineField + Server Actions** — optimistic UI on a field that triggers cache revalidation can flicker. Mitigation: `useTransition` keeps the optimistic value visible until the revalidated tag returns; suppress incoming server value during the pending window. (Block 3 risk.)
3. **Keyboard scope conflicts** with input focus inside dialogs. Mitigation: scope provider tracks `data-scope` on the active element and suppresses list bindings when scope is `dialog | input`. (Block 3 risk.)
4. **Inspector rail layout** shrinking the main content can cause table column overflow. Mitigation: when rail opens, table re-renders with hidden lower-priority columns via existing `manualPagination` re-measurement; add `data-rail-open` attribute on the layout for CSS adjustments. (Block 4 risk.)
5. **Dark-only status pills** for `expired/warning` and `revoked/danger` need contrast verification on `surface-2` and `surface-3` (hover/selected). Block 2 ships an accessibility check on the primitive preview route.

## Success criteria

- All 21 admin routes render dark without hydration warnings.
- Every list page supports `j/k/Enter/x/Esc` and an `InspectorRail` view of the focused row.
- Every detail page (User, Goal) supports inline editing for editable scalar fields with optimistic UI.
- Density toggle visible in the header; persists across reload; affects table rows, filter bar pills, and card vertical padding.
- Cmd-K opens command palette; `?` opens cheatsheet; both close on `Esc`.
- Route transitions visible on every navigation under `/admin/*`.
- `bun run lint` green at repo root; `bun run build` green from `web/`.
- Manual smoke: one mutation per resource still round-trips with toast and revalidation.

## Out-of-scope follow-ups (not for this redesign)

- Inspector rail for detail pages (currently list-only).
- Persistent user-level keyboard binding customization.
- Light mode for admin (only revisit if operators ask).
- Animated chart enter (currently static recharts).
- Full mobile/tablet responsive admin.
