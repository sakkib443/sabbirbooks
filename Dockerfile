# syntax=docker/dockerfile:1

# ─── Build ──────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --include=dev is load-bearing: build platforms inject NODE_ENV=production,
# which makes npm skip devDependencies — and typescript, tailwind and the
# @types packages next build needs all live there.
# --mount=type=cache keeps npm's download cache on the build server between
# deploys, so a deploy that changes one file does not re-fetch 477 packages.
# The first build after a cache prune took nine minutes here; with this it is
# seconds, and the cache never lands in the image.
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the API URL
# has to arrive as a build arg — a runtime env var would be too late.
# In Coolify: tick "Build Variable" on NEXT_PUBLIC_API_URL.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# A ceiling on the build's heap. Without one, Node sizes it from the HOST's
# total memory and will happily grow past what is actually free, taking the
# server into swap and the build from minutes to an hour. 2GB is comfortably
# more than this build needs and leaves room for the apps already running.
ENV NODE_OPTIONS=--max-old-space-size=2048

# And a ceiling on how much of the machine the compiler takes.
#
# The server has four cores and runs about thirty containers on them. Turbopack
# sizes its thread pools from the core count and takes the lot: during a deploy
# the load average sat above 20 with zero idle CPU, every other project on the
# box crawled, and the build itself died with no error at all — starved, not
# out of memory (nothing in dmesg, swap untouched).
#
# ONE thread each, down from two (29 Sep): two was still not enough headroom.
# The box now sits at a load average around 7 on its four cores BEFORE a deploy
# starts — Coolify's own panel alone eats a full core — so a build asking for
# two more found nothing to run on and died exactly as before: exit 255, no
# error, one second in.
#
# A single thread makes the compile slower in isolation and is the only version
# that reliably finishes on a box this busy. Put it back to 2 when the server
# has room (fewer containers, or more cores).
ENV TOKIO_WORKER_THREADS=1 RAYON_NUM_THREADS=1 UV_THREADPOOL_SIZE=1

# The same for Next's own build cache — the expensive half of a deploy.
#
# Every deploy was compiling the whole app from nothing, because COPY . . makes
# a new layer each time and the cache inside it died with the previous build.
# Kept on the server instead, Next recompiles only what actually changed,
# which on a four-core box is the difference between twenty minutes and a few.
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ─── Runtime ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# curl is here for the orchestrator's health check — the slim base ships
# neither curl nor wget, so without it every health probe fails.
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl \
 && rm -rf /var/lib/apt/lists/*

# `output: "standalone"` emits a minimal server plus only the node_modules it
# actually traced; static/ and public/ are not included and must be copied.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
