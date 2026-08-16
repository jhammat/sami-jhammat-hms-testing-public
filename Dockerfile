FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH" CI=true
# git: tooling/scripts/check-demo-storage-strings.mjs shells out to `git
# ls-files` to enumerate tracked files, and pnpm build runs that check.
# openssl: without it Prisma can't detect a libssl version and silently
# defaults to one that may not match what's actually installed.
RUN apt-get update && apt-get install -y --no-install-recommends git openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate
FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
COPY tooling ./tooling
RUN pnpm install --frozen-lockfile
FROM dependencies AS builder
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be present here rather than supplied when the container starts.
ARG NEXT_PUBLIC_WONFLOW_APP_NAME=WonFlow
ARG NEXT_PUBLIC_WONFLOW_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_WONFLOW_DATA_MODE=api
ARG NEXT_PUBLIC_WONFLOW_ENABLE_DEMO=false
ARG NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER=true
ARG NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS=true
ARG NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE=en
ARG NEXT_PUBLIC_WONFLOW_BUILD_ID=docker
ARG WONFLOW_ENVIRONMENT=staging
ENV NEXT_PUBLIC_WONFLOW_APP_NAME=$NEXT_PUBLIC_WONFLOW_APP_NAME \
    NEXT_PUBLIC_WONFLOW_APP_URL=$NEXT_PUBLIC_WONFLOW_APP_URL \
    NEXT_PUBLIC_WONFLOW_DATA_MODE=$NEXT_PUBLIC_WONFLOW_DATA_MODE \
    NEXT_PUBLIC_WONFLOW_ENABLE_DEMO=$NEXT_PUBLIC_WONFLOW_ENABLE_DEMO \
    NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER=$NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER \
    NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS=$NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS \
    NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE=$NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE \
    NEXT_PUBLIC_WONFLOW_BUILD_ID=$NEXT_PUBLIC_WONFLOW_BUILD_ID \
    WONFLOW_ENVIRONMENT=$WONFLOW_ENVIRONMENT
RUN pnpm --filter @wonflow/database db:generate && pnpm build
FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node","apps/web/server.js"]
