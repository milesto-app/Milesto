# CLAUDE.md

## Project Overview

Momentum is an AI-powered personal coaching app. Users set one big goal, and the app generates a personalized roadmap with milestones, weekly plans, and daily tasks — guided by an AI coach personality they choose.

The project has two codebases:

- **`ios/`** — SwiftUI iOS app (Swift 5, SwiftData, iOS 26+, Xcode 26+)
- **`backend/`** — NestJS + TypeScript API (Supabase Postgres, OpenRouter LLM, Cohere reranking)

Both share a **Supabase** instance for auth, database, and edge functions. A Supabase MCP server is configured for direct database interaction.

## Important: Read Sub-Project Instructions

Each sub-project has its own `CLAUDE.md` with detailed conventions, patterns, and rules.

- **Working on `ios/` only** → read `ios/CLAUDE.md`
- **Working on `backend/` only** → read `backend/CLAUDE.md`
- **Working on both** → read **both** `ios/CLAUDE.md` and `backend/CLAUDE.md`

These files are the source of truth for code style, architecture, components, and conventions in each codebase. ALWAYS read them before making changes.

## High-Level Architecture

```
┌──────────────┐       HTTPS        ┌───────────────────┐
│   iOS App    │ ◄────────────────► │  NestJS Backend   │
│  (SwiftUI)   │                    │  /api/*           │
└──────┬───────┘                    └────────┬──────────┘
       │                                     │
       │  Supabase SDK                       │  Supabase Admin SDK
       │                                     │  OpenRouter (LLM)
       ▼                                     │  Cohere (reranking)
┌──────────────────────────────────────────────────────┐
│                    Supabase                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │   Auth   │  │ Postgres │  │  Edge Functions    │  │
│  │          │  │  (RLS)   │  │                    │  │
│  └──────────┘  └──────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Core User Flow

1. **Auth** — sign up/in via email, Apple, or Google (Supabase Auth)
2. **Onboarding** — user enters name, goal, deadline, selects AI coach personality
3. **Intake** — adaptive question batches to build a user profile for the goal
4. **Roadmap** — AI generates milestones → weekly plans → daily tasks
5. **Daily use** — check off tasks, check-ins, debriefs with AI coach
6. **Stats** — progress tracking and insights

## Shared Conventions

- **No hardcoded secrets** — environment variables for all keys
- **Supabase MCP** — use MCP tools for migrations, SQL, edge functions, logs, and advisors
- **RLS required** — always enable Row Level Security on new tables with appropriate policies
- **After DDL changes** — run `get_advisors` (security + performance) to catch issues

## Self Improvement

When you learn something — whether by fixing an error or being corrected — save it as memory. Be precise and general to avoid repeating mistakes on recurring patterns.
