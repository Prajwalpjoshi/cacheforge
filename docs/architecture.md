# Architecture

> Status: **Phase 5 (production frontend)**. This
> document is filled in as each layer is actually built. See
> `PROJECT_SPEC.md` §6 for the full, target architecture diagram and
> rationale — nothing below should contradict it.

## What exists today

- `apps/api`: a layered Fastify server —
  routes → controllers → services → repositories/cache → Prisma/Redis —
  with CORS, Helmet, structured Pino logging, a request-ID/duration/
  cache-status observability hook, and a global error handler that maps
  domain errors (`NotFoundError` → 404, `ConflictError` → 409,
  `TooManyRequestsError` → 429, `ServiceUnavailableError` → 503), Zod
  validation failures (400, field-level detail), and unexpected errors
  (500) consistently.
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
  - `GET /api/metrics/summary`, `GET /api/metrics/requests`: real
    aggregates and a real request log, computed from actual traffic.
  - `POST /api/benchmarks/run`, `GET /api/benchmarks`,
    `GET /api/benchmarks/:id`: the Performance Lab backend — real,
    in-process DB-vs-cache measurements. See `docs/performance.md`.
  - Every `/api/*` route except `/api/health` is Redis-backed
    fixed-window rate limited (stricter on writes).
- `apps/web`: a full Next.js App Router application — landing page,
  Overview Dashboard, Performance Lab, Cache Explorer, API Explorer,
  System Health, Architecture, and Documentation, all consuming the
  real API above. See the dedicated "Frontend" section below.
- `packages/contracts`: Zod schemas for the health response, the full
  Product API surface, the cache admin endpoints, metrics
  (summary/request-log), and the benchmark engine's request/response
  shapes, shared by `apps/api` and `apps/web` alike.
- `packages/cache-kit`: a real, framework-agnostic Redis toolkit — see
  below — with its own unit test suite run against a real Redis
  instance (not mocked).
- `docker-compose.yml`: local PostgreSQL and Redis. Both are now
  genuinely used by the API in the request path; Redis is optional
  (fail-open) at runtime, Postgres is not.

## Data layer

- **Prisma** (`apps/api/prisma/schema.prisma`) defines all three models
  from PROJECT_SPEC.md §8: `Product`, `RequestMetric` (now written to
  by real traffic), and `BenchmarkRun` (now written to by real
  benchmark runs).
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
- **One Redis connection per process** (`apps/api/src/plugins/redis.plugin.ts`,
  now with a bounded 5s `connectTimeout` so a genuinely unreachable
  Redis fails fast rather than hanging on the OS-level TCP timeout),
  decorated onto Fastify as `cache`, `readRateLimiter`,
  `writeRateLimiter`, and `pubsub` — routes and services only ever go
  through these, never through raw Redis commands (`fastify ->
cache-kit -> redis`, per PROJECT_SPEC.md §16).
- **Product service** (`apps/api/src/services/product.service.ts`) is
  where cache-aside actually lives: `getById`/`list` call
  `cache.getOrSet(...)`, falling through to the repository only on a
  real miss or a Redis bypass; `create`/`update`/`delete` invalidate
  the relevant cache entries and publish a pub/sub event only after
  the repository call has committed. The repository itself has no
  cache awareness at all.

## Observability pipeline

- **`apps/api/src/observability/request-context.plugin.ts`** is the
  single place that measures every request (`process.hrtime.bigint()`
  around the whole request), logs a structured completion line, and
  fire-and-forgets a `RequestMetric` insert — see
  `apps/api/src/observability/metrics-exclusions.ts` for exactly which
  routes are excluded from persistence, and why (self-monitoring noise:
  `/api/health`, `/api/metrics/*`, `/api/benchmarks/*`, `/api/cache/*`).
  Persistence is deliberately **not awaited**: it happens in Fastify's
  `onResponse` hook, which fires _after_ the response has already been
  sent, so it can never add latency the caller experiences; a failed
  insert is logged and discarded, never turned into an error on an
  already-completed request. There is no in-memory queue — each
  request's insert is one bounded, independent operation, so
  back-pressure comes from Postgres/Prisma's own connection pool, the
  same as any other concurrent query.
- **`apps/api/src/repositories/metrics.repository.ts`** does all
  aggregation in PostgreSQL (`count(*) FILTER (...)`,
  `percentile_cont(...) WITHIN GROUP`, `GROUP BY route, method`) —
  never by pulling rows into Node and reducing them in JavaScript. This
  is a different percentile method (linear interpolation) than the
  benchmark engine's nearest-rank method, deliberately: one is a live
  SQL aggregate over an ever-growing table, the other a fixed in-memory
  array from one benchmark run. See `docs/performance.md`.
- **`metricsService` is decorated on the root Fastify instance**
  (`apps/api/src/plugins/metrics.plugin.ts`), unlike
  `productService`/`cacheAdminService`/`healthService` (each decorated
  inside its own route file, since only that route's own controllers
  use it) — the global `onResponse` hook needs to reach it from outside
  any single route's encapsulation context.

## Performance Lab (benchmark engine)

- **`apps/api/src/benchmark/percentiles.ts`** and **`concurrency.ts`**
  are pure, dependency-free utilities (nearest-rank percentiles, a
  bounded worker-pool runner) — unit-tested directly
  (`test/percentiles.test.ts`, `test/concurrency.test.ts`) against
  hand-computed expected values, no database or Redis required.
- **`apps/api/src/services/benchmark.service.ts`** is the engine:
  `DB_ONLY` calls `productRepository` directly (bypassing cache-kit
  entirely); `CACHE_ONLY` calls the real `productService` cache-aside
  path (the same code the actual routes use); `COMPARISON` runs both,
  in-process, against the same target. See `docs/performance.md` for
  the full methodology, including why in-process rather than
  HTTP-looped, and the explicit cache-cold-start behavior.
- **`apps/api/src/repositories/benchmark.repository.ts`** persists one
  `BenchmarkRun` row per completed run (never on failure) — including
  for `COMPARISON`, which PROJECT_SPEC.md §10 describes as a single
  `BenchmarkRun` response containing both sub-results, not two rows.

## Frontend (`apps/web`)

- **App Router, two route groups.** `app/(marketing)` holds the
  landing page under its original `SiteHeader`/`SiteFooter`; `app/(app)`
  wraps every internal page (Overview, Performance Lab, Cache Explorer,
  API Explorer, System Health, Architecture, Documentation) in
  `components/app-shell/app-shell.tsx` — a desktop sidebar / mobile
  drawer shell with a live, independently-polled system-status pill.
  Both groups share one root `layout.tsx` (fonts + the TanStack Query
  provider) but are otherwise deliberately distinct visual identities,
  per PROJECT_SPEC.md §5, despite there being no auth to separate them.
- **`lib/api/*.ts`** is the only code that talks to the Fastify API —
  one module per resource, every response validated against the
  matching schema from `@cacheforge/contracts` before the rest of the
  app ever sees it, so a backend/frontend contract drift fails loudly
  in development rather than rendering silently-wrong data. Errors are
  normalized once (`lib/api/error-message.ts`) into a message every
  page can show directly.
- **TanStack Query** drives every data-fetching page: 60s polling for
  the dashboard overview and health, 5s for the cache explorer,
  on-demand (mutations) for the Performance Lab and API Explorer.
  Dashboard data uses visibility-aware polling: while the dashboard is
  active, metrics refresh every 60 seconds; a background/hidden tab
  stops automatic polling and refreshes once when the user returns. No
  page substitutes
  fabricated data for a loading/empty/error state — see
  `packages/contracts`-typed empty states throughout
  `apps/web/components/*`.
- **Performance Lab** (`components/performance/`) renders exactly what
  `POST /api/benchmarks/run` / `GET /api/benchmarks[/:id]` return —
  including the backend's own `*ImprovementPct` values for a
  `COMPARISON` run, never recomputed client-side — plus a benchmark
  history table and an on-demand detail view with the run's real raw
  latency distribution.
- **Cache Explorer** (`components/cache/`) found, while verifying
  Redis-down behavior against the real container, that
  `GET /api/cache/stats` fails open to a _successful_ 200 with
  all-zero counters (indistinguishable from a freshly-empty cache) —
  so it additionally cross-checks `GET /api/health` and shows an
  explicit "Redis unavailable" state whenever `redis: "down"`,
  regardless of what the stats endpoint itself reports. See
  `docs/decisions.md`.
- **API Explorer** (`lib/api-explorer/catalog.ts`) is a hand-curated
  endpoint catalog, not a generated one — no `@fastify/swagger` plugin
  exists in `apps/api` (see `docs/decisions.md` for why that stayed a
  backend non-change in a frontend-only phase). Every "Try it" request
  goes to the real running API; nothing is simulated.
- **Documentation page** (`lib/docs.ts`) reads this repository's own
  `README.md`/`docs/*.md` files from disk at request time and renders
  them with `react-markdown` — the docs page and the committed files
  can never drift into two versions of the truth.
