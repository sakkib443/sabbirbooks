# syntax=docker/dockerfile:1

# ─── Build ──────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# --include=dev is load-bearing: build platforms inject NODE_ENV=production,
# which makes npm skip devDependencies — and typescript, tailwind and the
# @types packages next build needs all live there.
RUN npm ci --include=dev

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the API URL
# has to arrive as a build arg — a runtime env var would be too late.
# In Coolify: tick "Build Variable" on NEXT_PUBLIC_API_URL.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

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
