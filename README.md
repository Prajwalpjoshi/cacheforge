# CacheForge

**Observe. Cache. Measure. Optimize.**

A production-style API performance and Redis caching platform. It models
a small product catalog API and uses it to demonstrate — with real
measurements, not fabricated numbers — how a Redis cache-aside layer,
rate limiting, and pub/sub actually behave in front of PostgreSQL.

## Status

**Phase 4 — observability + Performance Lab backend.** The
monorepo/tooling foundation, a Fastify API with a real PostgreSQL-backed
Product CRUD API, Redis cache-aside/rate-limiting/pub-sub, and a
Next.js landing page exist. Every real product-catalog request is now
persisted as a `RequestMetric` row and summarized by
`GET /api/metrics/summary` / `GET /api/metrics/requests` — real
aggregates computed in PostgreSQL, never fabricated. The Performance
Lab backend (`POST /api/benchmarks/run`, `GET /api/benchmarks[/:id]`)
runs real, in-process DB-vs-cache benchmarks — real
`process.hrtime.bigint()` measurements, real percentiles, real
throughput, real cache hit rates, persisted as `BenchmarkRun` rows —
that a future frontend will visualize; see `docs/performance.md` for
the methodology and one real measured run. Redis/Postgres failure
remains fail-open/degraded exactly as in Phase 3, re-verified against
the actual Docker containers. The frontend (dashboard, Performance Lab
UI, Cache Explorer, API Explorer) is not built yet.

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the complete architecture,
API specification, and phased implementation plan — it is the single
source of truth for this project.

## Stack

Next.js · TypeScript · Tailwind CSS · Fastify · Zod · Pino · PostgreSQL ·
Prisma (driver adapters, `@prisma/adapter-pg`) · Redis · Vitest · Docker
Compose · pnpm workspaces.

## Prerequisites

- Node.js 20.9+ (developed against Node 24)
- pnpm (see `packageManager` in `package.json`; if Corepack can't install
  it on your machine, `npm install -g pnpm` works just as well)
- Docker + Docker Compose (for local PostgreSQL and Redis)

## Getting started

```bash
cp .env.example .env                      # docker compose (Postgres credentials)
cp apps/api/.env.example apps/api/.env    # the API's own config (see below)

pnpm install                              # also generates the Prisma client
docker compose up -d                      # starts local Postgres + Redis

pnpm --filter @cacheforge/api db:migrate  # applies prisma/migrations
pnpm --filter @cacheforge/api db:seed     # optional: a small demo catalog

pnpm --filter @cacheforge/api dev        # http://localhost:4000/api/health
pnpm --filter @cacheforge/web dev        # http://localhost:3000
```

Each app reads its own env file rather than a shared root `.env`, because
Node's `process.loadEnvFile()` resolves relative to the process's working
directory — which is `apps/api` when pnpm runs that workspace's scripts,
not the repo root. See `docs/decisions.md`.

## Monorepo layout

```
apps/api          Fastify API (Prisma/PostgreSQL, Product CRUD)
apps/web           Next.js dashboard
packages/cache-kit Framework-agnostic Redis caching toolkit
packages/contracts Shared Zod schemas/types (API ⇄ web)
docs/              Architecture, caching, performance, decisions
```

## Common scripts

| Command                                    | Description                               |
| ------------------------------------------ | ----------------------------------------- |
| `pnpm dev`                                 | Run `apps/api` and `apps/web` in parallel |
| `pnpm lint`                                | Lint every workspace                      |
| `pnpm typecheck`                           | Type-check every workspace                |
| `pnpm test`                                | Run tests in every workspace              |
| `pnpm build`                               | Build every workspace                     |
| `pnpm format`                              | Format the repo with Prettier             |
| `pnpm --filter @cacheforge/api db:migrate` | Apply Prisma migrations                   |
| `pnpm --filter @cacheforge/api db:seed`    | Seed a small demo product catalog         |
| `pnpm --filter @cacheforge/api db:studio`  | Open Prisma Studio against the local DB   |
