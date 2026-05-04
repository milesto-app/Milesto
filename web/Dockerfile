# syntax=docker/dockerfile:1.7


# =============================================================================
# deps — install dependencies (cached via Bun store)
# =============================================================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY --link package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile


# =============================================================================
# builder — compile Next.js (standalone output)
# =============================================================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY --link --from=deps /app/node_modules ./node_modules
COPY --link . .

RUN --mount=type=cache,target=/app/.next/cache \
    bun run build


# =============================================================================
# runner — minimal production image
# =============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --link --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --link --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
