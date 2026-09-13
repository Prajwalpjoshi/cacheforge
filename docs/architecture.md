# Architecture

> Status: **Phase 3 (Redis cache + invalidation + rate limiting)**.
> This document is filled in as each layer is actually built. See
> `PROJECT_SPEC.md` §6 for the full, target architecture diagram and
> rationale — nothing below should contradict it.

## What exists today

- `apps/api`: a layered Fastify server —
  routes → controllers → services → repositories/cache → Prisma/Redis —
  with CORS, Helmet, structured Pino logging, a request-ID/duration/
  cache-status observability hook, and a global error handler that maps
  domain errors (`NotFoundError` → 404, `ConflictError` → 409,
  `TooManyRequestsError` → 429), Zod validation failures (400,
  field-level detail), and unexpected errors (500) consistently.
  - `GET /api/health`: genuinely pings Postgres (`SELECT 1`) and Redis
    (`PING`); 503 when Postgres is down, 200 `degraded` when only Redis
    is down (PROJECT_SPEC.md §5/§10).
  - `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`: full
    CRUD backed by PostgreSQL via Prisma, fronted by Redis cache-aside
    on reads (`x-cache-status: HIT|MISS|BYPASS`), invalidated and
    published to `cacheforge:events` on writes. See `docs/caching.md`.
  - `GET /api/cache/keys`, `GET /api/cache/stats`,
    `DELETE /api/cache/:key`: developer/admin visibility into the
    `cacheforge:` Redis namespace only.
  - Every `/api/*` route except `/api/health` is Redis-backed
    fixed-window rate limited (stricter on writes).
- `apps/web`: a Next.js App Router shell with the landing page and shared
  layout/typography/color tokens. No data-fetching pages yet.
- `packages/contracts`: Zod schemas for the health response, the full
  Product API surface, and the cache admin endpoints' request/response
  shapes, shared by `apps/api` and (eventually) `apps/web`.
- `packages/cache-kit`: a real, framework-agnostic Redis toolkit — see
  below — with its own unit test suite run against a real Redis
  instance (not mocked).
- `docker-compose.yml`: local PostgreSQL and Redis. Both are now
  genuinely used by the API in the request path; Redis is optional
  (fail-open) at runtime, Postgres is not.

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

## Cache layer

- **`packages/cache-kit`** exports `createCache`, `createRateLimiter`,
  `createPubSub`, and `createRedisClient` — all dependency-injected
  against a single `node-redis` client, none of them aware of Fastify,
  Prisma, or CacheForge's own key-naming conventions. `apps/api` is the
  only place that decides what `cacheforge:` keys look like
  (`apps/api/src/cache/keys.ts`) and what events mean
  (`apps/api/src/events.ts`) — cache-kit itself could be dropped into
  an unrelated project unchanged.
- **One Redis connection per process** (`apps/api/src/plugins/redis.plugin.ts`),
  decorated onto Fastify as `cache`, `readRateLimiter`, `writeRateLimiter`,
  and `pubsub` — routes and services only ever go through these, never
  through raw Redis commands (`fastify -> cache-kit -> redis`, per
  PROJECT_SPEC.md §16).
- **Product service** (`apps/api/src/services/product.service.ts`) is
  where cache-aside actually lives: `getById`/`list` call
  `cache.getOrSet(...)`, falling through to the repository only on a
  real miss or a Redis bypass; `create`/`update`/`delete` invalidate
  the relevant cache entries and publish a pub/sub event only after
  the repository call has committed. The repository itself has no
  cache awareness at all.

## What's not built yet

The metrics pipeline actually persisting `RequestMetric` rows (cache
status/source are logged per-request today, not yet written to
Postgres), the Performance Lab, the Cache Explorer/API Explorer
frontends, and the remaining dashboard pages. These follow the phased
plan in `PROJECT_SPEC.md` §24.
