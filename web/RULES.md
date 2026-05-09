# Web Codebase Rules

## Project Overview

Next.js admin dashboard and public pages for Milesto (milesto.app). Uses App Router, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
bun run build              # Production build
bun run lint               # Lint
```

## Architecture

- **Admin dashboard** (`/admin/*`): Protected by Supabase auth + admin role check. Queries Supabase directly with service-role key (server-side only).
- **Public pages** (`/support`, `/privacy`): Static, no auth, SEO-optimized.

## Supabase Clients

Three clients, each for a specific context:

- `lib/supabase/client.ts` -- Browser client (anon key). Used in Client Components for login/logout.
- `lib/supabase/server.ts` -- Server auth client (anon key + cookies). Used in middleware and Server Components for session checks.
- `lib/supabase/admin.ts` -- Admin client (service role key). **Server-only.** Used in query functions for dashboard data.

## Security Rules

- `requireAdmin()` must be called before every admin query and route handler.
- `SUPABASE_SERVICE_ROLE_KEY` is never in `NEXT_PUBLIC_*` env vars.
- Admin client files always start with `import 'server-only'`.
- Dashboard is read-only -- no database mutations from the web app.
- Data minimization: never expose message content, debrief notes, or raw profile_data.

## Conventions

- Use bun, not npm.
- shadcn/ui for UI components.
- Server Components by default, Client Components only when needed (charts, polling, forms).
- `force-dynamic` on admin pages, static for public pages.
- All goal queries filter `deleted_at IS NULL`.
- UTC dates for all metrics (match backend).
