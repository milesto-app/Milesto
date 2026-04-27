# syntax=docker/dockerfile:1.7


# =============================================================================
# deps — install all dependencies (cached via Bun store)
# =============================================================================
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY --link package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile


# =============================================================================
# builder — compile NestJS (dist/)
# =============================================================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY --link --from=deps /app/node_modules ./node_modules
COPY --link . .

RUN bun run build


# =============================================================================
# prod-deps — install production-only dependencies
# =============================================================================
FROM oven/bun:1-alpine AS prod-deps

WORKDIR /app

COPY --link package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production


# =============================================================================
# runner — minimal production image
# =============================================================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --link --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --link --from=builder   --chown=bun:bun /app/dist         ./dist
COPY --link --from=builder   --chown=bun:bun /app/resources    ./resources
COPY --link                  --chown=bun:bun package.json      ./

USER bun

EXPOSE 3000

CMD ["bun", "dist/main.js"]
