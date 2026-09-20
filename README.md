# CacheForge

**Observe. Cache. Measure. Optimize.**

A production-style API performance and Redis caching platform. It models
a small product catalog API and uses it to demonstrate — with real
measurements, not fabricated numbers — how a Redis cache-aside layer,
rate limiting, and pub/sub actually behave in front of PostgreSQL.

## Status

**Phase 5 — production frontend.** The full stack now exists end to
end: a Fastify API (PostgreSQL-backed Product CRUD, Redis cache-aside/
rate-limiting/pub-sub, a real observability pipeline, and an in-process
Performance Lab benchmark engine) and a Next.js frontend that actually
visualizes and operates it. The frontend consumes every real endpoint —
`/api/health`, `/api/products*`, `/api/metrics/*`, `/api/cache/*`,
`/api/benchmarks/*` — through a typed client layer validated against
the shared `@cacheforge/contracts` schemas: an Overview Dashboard (live
metrics, per-route/per-request charts, recent-requests table), a
Performance Lab (run/inspect real DB-vs-cache benchmarks), a Cache
Explorer (browse/delete real Redis keys), an API Explorer (send real
requests to every documented endpoint), a System Health page, and an
Architecture/Documentation pair that render the project's own real
diagrams and markdown. No page substitutes fabricated numbers for a
loading/empty/error state. See `docs/decisions.md` for what changed
and why during this phase.

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
