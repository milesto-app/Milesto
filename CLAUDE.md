# Agents context

## Project Overview

Milesto is an AI-powered personal coaching app. Users set one big goal, and the app generates a personalized roadmap with milestones, weekly plans, and daily tasks — guided by an AI coach personality they choose.

The project has three codebases:

- **`ios/`** — SwiftUI iOS app (Swift 6, SwiftData, iOS 26+, Xcode 26+)
- **`api/`** — NestJS + TypeScript API (Supabase Postgres, OpenRouter LLM, Cohere reranking)
- **`web/`** — Next.js admin dashboard and public pages (App Router, TypeScript, Tailwind v4, shadcn/ui)

All three share a **Supabase** instance for auth, database, and edge functions. A Supabase MCP server is configured for direct database interaction.

## Important: Read Sub-Project Instructions

Each sub-project has its own `CLAUDE.md` with detailed conventions, patterns, and rules.

- **Working on `ios/` only** → read `ios/CLAUDE.md`
- **Working on `api/` only** → read `api/CLAUDE.md`
- **Working on `web/` only** → read `web/CLAUDE.md`
- **Working on multiple** → read each relevant `CLAUDE.md`

These files are the source of truth for code style, architecture, components, and conventions in each codebase. ALWAYS read them before making changes.

## Root Task Runner

A root `package.json` provides bun-based scripts that orchestrate common tasks across `ios/`, `api/`, and `web/`. Run `bun run` (no args) to list them. Prefer these over `cd`-ing into sub-projects for setup, dev, build, lint, test, and dependency updates.

## Shared Conventions

- **No hardcoded secrets** — environment variables for all keys.
- **Supabase MCP** — use MCP tools for migrations, SQL, edge functions, logs, advisors, etc.
- **RLS required** — always enable Row Level Security on new tables with appropriate policies.
- **After DDL changes** — run `get_advisors` (security + performance) to catch issues.
- **After any changes** — run `bun run lint` at the repo root before reporting the task as done, but dont check or revert what's been changed by the linter even if it's not related to your changes.

## Branching & PR Workflow

Never commit directly to `dev` or `main`.

**Feature branch → `dev` PRs**: squash-merge is fine.

**`dev` → `main` PRs**: **never squash-merge**. Use a regular merge commit (or rebase) so every commit from `dev` is preserved on `main`. Squashing `dev` into `main` collapses history, breaks future `dev`/`main` reconciliation, and makes past work look like a single blob.

## Versioning

The iOS Marketing Version (`MARKETING_VERSION` in `ios/Milesto.xcodeproj/project.pbxproj`) follows `proud.default.shame` (mapped to semver `major.minor.patch`):

- **proud** — big release. **Never bump this.**
- **default** — normal change (new feature, meaningful refactor).
- **shame** — small edit (bug fix, tweak, copy change).

**Bump only once per PR, not per individual edit.** Default to `shame`; use `default` only when the PR's changes are substantial enough to warrant it.
