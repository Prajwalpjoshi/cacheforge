# Architecture

> Status: **Phase 2 (database + product CRUD)**. This document is
> filled in as each layer is actually built. See `PROJECT_SPEC.md` §6
> for the full, target architecture diagram and rationale — nothing
> below should contradict it.

## What exists today

- `apps/api`: a layered Fastify server —
  routes → controllers → services → repositories → Prisma/PostgreSQL —
  with CORS, Helmet, structured Pino logging, a request-ID/duration
  observability hook, and a global error handler that maps domain
  errors (`NotFoundError` → 404, `ConflictError` → 409), Zod validation
  failures (400, field-level detail), and unexpected errors (500)
  consistently.
  - `GET /api/health`: genuinely pings Postgres (`SELECT 1`) and Redis
    (`PING`); 503 when Postgres is down, 200 `degraded` when only Redis
    is down (PROJECT_SPEC.md §5/§10).
  - `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`: full
    CRUD backed by PostgreSQL via Prisma. No caching yet — every read
    goes to the database.
- `apps/web`: a Next.js App Router shell with the landing page and shared
  layout/typography/color tokens. No data-fetching pages yet.
- `packages/contracts`: Zod schemas for the health response and the
  full Product API surface (create/update/list/response shapes),
  shared by `apps/api` and (eventually) `apps/web`.
- `packages/cache-kit`: package scaffold only — no cache/rate-limit/
  pub-sub implementation yet.
- `docker-compose.yml`: local PostgreSQL and Redis. Postgres is now a
  hard dependency of the API (Prisma); Redis is pinged for health only
  — nothing in the request path depends on it yet.

## Data layer

- **Prisma** (`apps/api/prisma/schema.prisma`) defines all three models
  from PROJECT_SPEC.md §8: `Product` (the only one with real CRUD so
  far), `RequestMetric` and `BenchmarkRun` (schema exists; nothing
  writes to them yet — that's the metrics/Performance Lab phase).
- **Driver adapters, not the legacy query engine.** This Prisma version
  generates a self-contained client into `apps/api/src/generated/prisma`
  (gitignored, regenerated via `prisma generate` — wired into
  `postinstall` so a fresh `pnpm install` always provisions it) and
  requires an explicit driver adapter; we use `@prisma/adapter-pg`
  wrapping `pg`. See `docs/decisions.md`.
- **Repositories are the only layer that imports Prisma.** Services
  translate Prisma's error codes (`P2002` unique violation, `P2025`
  not found) into `NotFoundError`/`ConflictError`, which the global
  error handler maps to HTTP status codes — controllers never see
  Prisma at all.

## What's not built yet

Redis caching (cache-aside, TTL, invalidation), rate limiting, pub/sub,
the metrics pipeline actually persisting `RequestMetric` rows, the
Performance Lab, the Cache Explorer, the API Explorer, and the
remaining dashboard pages. These follow the phased plan in
`PROJECT_SPEC.md` §24.
