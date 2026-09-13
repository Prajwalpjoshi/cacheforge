# CacheForge

**Observe. Cache. Measure. Optimize.**

A production-style API performance and Redis caching platform. It models
a small product catalog API and uses it to demonstrate — with real
measurements, not fabricated numbers — how a Redis cache-aside layer,
rate limiting, and pub/sub actually behave in front of PostgreSQL.

## Status

**Phase 1 — foundation.** The monorepo, tooling, a Fastify API skeleton
(`GET /api/health`), and a Next.js landing page exist. The product
catalog, Redis caching, the Performance Lab, and the rest of the
dashboard are not built yet.

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the complete architecture,
API specification, and phased implementation plan — it is the single
source of truth for this project.

## Stack

Next.js · TypeScript · Tailwind CSS · Fastify · Zod · Pino · PostgreSQL ·
Prisma · Redis · Vitest · Docker Compose · pnpm workspaces.

## Prerequisites

- Node.js 20.9+ (developed against Node 24)
- pnpm (see `packageManager` in `package.json`; if Corepack can't install
  it on your machine, `npm install -g pnpm` works just as well)
- Docker + Docker Compose (for local PostgreSQL and Redis)

## Getting started

```bash
cp .env.example .env
pnpm install
docker compose up -d          # starts local Postgres + Redis
pnpm --filter @cacheforge/api dev   # http://localhost:4000/api/health
pnpm --filter @cacheforge/web dev   # http://localhost:3000
```

## Monorepo layout

```
apps/api          Fastify API
apps/web           Next.js dashboard
packages/cache-kit Framework-agnostic Redis caching toolkit
packages/contracts Shared Zod schemas/types (API ⇄ web)
docs/              Architecture, caching, performance, decisions
```

## Common scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run `apps/api` and `apps/web` in parallel |
| `pnpm lint` | Lint every workspace |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run tests in every workspace |
| `pnpm build` | Build every workspace |
| `pnpm format` | Format the repo with Prettier |
