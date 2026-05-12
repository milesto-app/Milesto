# Milesto Project Rules

## Overview

Milesto is an AI-powered personal coaching app. Users set one big goal, and the app generates a personalized roadmap with weekly milestones, weekly tasks; guided by an AI coach personality they choose and they can chat with.

The project has three codebases:

- **`ios/`** — SwiftUI iOS app
- **`api/`** — NestJS, Supabase, TypeScript API
- **`web/`** — Next.js admin dashboard and public pages

A Supabase MCP server is configured for direct database interaction.

## Read Sub-Project Instructions

Each sub-project's rules live in `docs/` at the repo root.

- **Working on `ios/`** → read `docs/IOS.md`
- **Working on `api/`** → read `docs/API.md`
- **Working on `web/`** → read `docs/WEB.md`

These files are the source of truth for code style, architecture, components, and conventions in each codebase. ALWAYS read them before making changes.

## Root Task Runner

A root `Makefile` orchestrates common tasks across `ios/`, `api/`, and `web/`. Independent tasks (install, build, lint, update). Prefer these over `cd`-ing into sub-projects. See the `Makefile` for the full target list.

## Shared Conventions

- **No hardcoded secrets** — environment variables for all keys.
- **Supabase MCP** — use MCP tools for migrations, SQL, edge functions, logs, advisors, etc.
- **After DDL changes** — run `get_advisors` (security + performance) to catch issues.
- **After any changes** — run `make lint` at the repo root before reporting the task as done, but dont check or revert what's been changed by the linter even if it's not related to your changes.

## Deployment

- **`api/` and `web/`** — deployed to a VPS via [Dokploy](https://dokploy.com/), which auto-deploys on every push to `main`.
- **`ios/`** — built and distributed via Xcode Cloud, which listens for commits on `main`.

Merging into `main` ships to production across all three stacks — treat `dev` → `main` PRs accordingly.

## Branching & PR Workflow

Never commit directly to `dev` or `main`.

**Feature branch → `dev` PRs**: squash-merge is fine.

**`dev` → `main` PRs**: **never squash-merge**. Use a regular merge commit (or rebase) so every commit from `dev` is preserved on `main`. Squashing `dev` into `main` collapses history, breaks future `dev`/`main` reconciliation, and makes past work look like a single blob.

## Versioning

The iOS Marketing Version (`MARKETING_VERSION` in `ios/Milesto.xcodeproj/project.pbxproj`) follows `proud.default.shame` (mapped to semver `major.minor.patch`):

- **proud** — big release. **Never bump this.**
- **default** — normal change (new feature, meaningful refactor).
- **shame** — small edit (bug fix, tweak, copy change).

**Bump only once before creating a PR, not per individual edit.** Default to `shame`; use `default` only when the PR's changes are substantial enough to warrant it.
