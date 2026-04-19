# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Momentum is an AI-powered personal coaching app. Users set one big goal, and the app generates a personalized roadmap with milestones, weekly plans, and daily tasks — guided by an AI coach personality they choose.

The project has three codebases:

- **`ios/`** — SwiftUI iOS app (Swift 6, SwiftData, iOS 26+, Xcode 26+)
- **`backend/`** — NestJS + TypeScript API (Supabase Postgres, OpenRouter LLM, Cohere reranking)
- **`web/`** — Next.js admin dashboard and public pages (App Router, TypeScript, Tailwind v4, shadcn/ui)

All three share a **Supabase** instance for auth, database, and edge functions. A Supabase MCP server is configured for direct database interaction.

## Important: Read Sub-Project Instructions

Each sub-project has its own `CLAUDE.md` with detailed conventions, patterns, and rules.

- **Working on `ios/` only** → read `ios/CLAUDE.md`
- **Working on `backend/` only** → read `backend/CLAUDE.md`
- **Working on `web/` only** → read `web/CLAUDE.md`
- **Working on multiple** → read each relevant `CLAUDE.md`

These files are the source of truth for code style, architecture, components, and conventions in each codebase. ALWAYS read them before making changes.

## Root Task Runner

A root `package.json` provides bun-based scripts that orchestrate common tasks across `ios/`, `backend/`, and `web/`. Run `bun run` (no args) to list them. Prefer these over `cd`-ing into sub-projects for setup, dev, build, lint, test, and dependency updates.

## Shared Conventions

- **No hardcoded secrets** — environment variables for all keys.
- **Supabase MCP** — use MCP tools for migrations, SQL, edge functions, logs, advisors, etc.
- **RLS required** — always enable Row Level Security on new tables with appropriate policies.
- **After DDL changes** — run `get_advisors` (security + performance) to catch issues.
- **After any changes** — run `bun run lint` at the repo root before reporting the task as done.
