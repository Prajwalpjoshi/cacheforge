# CacheForge

**Observe. Cache. Measure. Optimize.**

A production-style API performance and Redis caching platform. It models
a small product catalog API and uses it to demonstrate — with real
measurements, not fabricated numbers — how a Redis cache-aside layer,
rate limiting, and pub/sub actually behave in front of PostgreSQL.

## Production Status

**Live and operational.**

CacheForge is deployed as a production-style distributed caching and
API performance platform.

| Component | Production |
|---|---|
| Frontend | Netlify |
| API | Render |
| PostgreSQL | Neon |
| Redis | Upstash |
| Observability | Enabled |
| Health checks | PostgreSQL + Redis |
| Performance Lab | Available | 

— see
[`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md) for the
pre-deployment checklist and verdict, and `docs/decisions.md` for what
changed and why during this phase.

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the complete architecture,
API specification, and phased implementation plan — it is the single
source of truth for this project.

## Documentation

| Document                                                                                                                                                              | For                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`docs/HOW_CACHEFORGE_WORKS.md`](./docs/HOW_CACHEFORGE_WORKS.md)                                                                                                      | The fastest way to understand what happens on every request — start here          |
| [`docs/TECHNICAL_ARCHITECTURE.md`](./docs/TECHNICAL_ARCHITECTURE.md)                                                                                                  | The deep engineering reference — every layer, flow, and endpoint traced to source |
| [`docs/ARCHITECTURE_DIAGRAM.md`](./docs/ARCHITECTURE_DIAGRAM.md)                                                                                                      | Every architecture diagram in one place                                           |
| [`docs/DEVELOPER_GUIDE.md`](./docs/DEVELOPER_GUIDE.md)                                                                                                                | Onboarding steps and "where do I change X"                                        |
| [`docs/INTERVIEW_GUIDE.md`](./docs/INTERVIEW_GUIDE.md)                                                                                                                | How to explain this project out loud, at three depths                             |
| [`docs/architecture.md`](./docs/architecture.md), [`caching.md`](./docs/caching.md), [`performance.md`](./docs/performance.md), [`decisions.md`](./docs/decisions.md) | The phase-by-phase build log (what was built, when, and why)                      |
| [`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md)                                                                                                                | The Phase 6 pre-deployment audit                                                  |

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

## Environment variables

Every variable the application actually reads (`apps/api/src/env.ts`,
`apps/web/lib/api/client.ts`); nothing here is aspirational.

| Variable                    | Used by | Required                              | Public? | Notes                                                                                                 |
| --------------------------- | ------- | ------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | API     | No (default `development`)            | No      | `production` disables `pino-pretty` and dev-only log formatting                                       |
| `PORT`                      | API     | No (default `4000`)                   | No      | The API binds `0.0.0.0:$PORT`                                                                         |
| `CORS_ORIGIN`               | API     | No (default `http://localhost:3000`)  | No      | **Must** be set to the real frontend origin in any non-local deployment                               |
| `DATABASE_URL`              | API     | **Yes**, no default                   | No      | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`); supports `?sslmode=require`     |
| `REDIS_URL`                 | API     | No (default `redis://localhost:6379`) | No      | Supports `rediss://` (TLS) and embedded auth — no code change needed for a managed provider           |
| `RATE_LIMIT_WINDOW_SECONDS` | API     | No (default `60`)                     | No      | Fixed-window length for both limiters                                                                 |
| `RATE_LIMIT_MAX`            | API     | No (default `300`)                    | No      | Read-route limit per window per IP                                                                    |
| `RATE_LIMIT_WRITE_MAX`      | API     | No (default `60`)                     | No      | Write-route limit per window per IP (also applies to `/api/benchmarks/run`)                           |
| `NEXT_PUBLIC_API_URL`       | Web     | No (default `http://localhost:4000`)  | **Yes** | The only server the browser talks to; baked in **at build time** — see Production Configuration below |

No variable here is a secret in this project's current form: the
local `DATABASE_URL`/`REDIS_URL` are throwaway Docker Compose
credentials, not production secrets. A real deployment's
`DATABASE_URL`/`REDIS_URL` **will** contain real credentials and must
be set only via the hosting provider's own environment/secret
configuration — never committed, never logged (the API's structured
logs never include connection strings or request bodies for this
reason).

## Docker

`docker-compose.yml` provides local PostgreSQL 16 and Redis 7 only —
`apps/api` and `apps/web` run directly via `pnpm`, not as compose
services, and there are no `Dockerfile`s in this repository. This
matches the intended deployment split (Vercel builds `apps/web`
natively from source; Render can run `apps/api` as a native Node web
service with no Dockerfile — see Deployment Architecture below). If a
containerized API deployment is chosen instead, a `Dockerfile` for
`apps/api` would need to be added at that time.

```bash
docker compose config   # validate
docker compose up -d    # start Postgres + Redis
docker compose ps       # confirm both are healthy
```

## Database

Prisma migrations are the only supported way to create/update the
schema — there is exactly one migration
(`apps/api/prisma/migrations/20260913151753_init`), which creates all
three models (`Product`, `RequestMetric`, `BenchmarkRun`) and their
enums in one step.

```bash
pnpm --filter @cacheforge/api db:migrate          # local dev (prisma migrate dev)
pnpm --filter @cacheforge/api db:migrate:deploy   # production (prisma migrate deploy — non-interactive, no drift/reset logic)
pnpm --filter @cacheforge/api db:seed             # optional demo catalog
```

`db:migrate:deploy` has been verified against a genuinely fresh,
empty PostgreSQL database (not the long-lived dev database) — see
`DEPLOYMENT_READINESS.md`.

## Redis

Optional at runtime by design (PROJECT_SPEC.md §9): every cache/rate-
limit/pub-sub operation fails open if Redis is unreachable, and
`GET /api/health` reports `redis: "down"` independently of overall
health. `REDIS_URL` accepts a managed provider's connection string
(TLS via `rediss://`, credentials embedded in the URL) with no code
change — see Environment variables above.

## Testing

```bash
pnpm test              # every workspace: 183 tests (contracts 17, cache-kit 26, apps/web 52, apps/api 88)
pnpm --filter @cacheforge/api test:unit          # apps/api unit tests only (no external services)
pnpm --filter @cacheforge/api test:integration   # apps/api integration tests (real Postgres + Redis required)
```

Integration tests run against the same local Postgres/Redis started
by `docker compose up -d` — there is no separate ephemeral test
database (a documented, accepted trade-off; see `docs/decisions.md`).

## Build

```bash
pnpm build   # packages first, then apps — tsc for cache-kit/contracts/api, `next build` for web
```

`apps/web`'s build runs `scripts/copy-docs.mjs` first (via `prebuild`)
to copy `README.md`/`docs/*.md` into `apps/web/content/` so the
Documentation page's file reads stay correctly scoped for Next's
output-file tracer — see `docs/decisions.md`.

## Production configuration

- **API:** `pnpm --filter @cacheforge/api build && pnpm --filter @cacheforge/api start` runs the compiled `dist/server.js` with `NODE_ENV=production` set by the hosting platform. Verified locally by actually running this exact sequence — see `DEPLOYMENT_READINESS.md`.
- **Web:** `pnpm --filter @cacheforge/web build && pnpm --filter @cacheforge/web start` runs `next start`. **`NEXT_PUBLIC_API_URL` must be set in the build environment**, not just at runtime — Next.js inlines `NEXT_PUBLIC_*` variables into the client bundle at build time, so setting it only when starting the server has no effect.
- **CORS:** set the API's `CORS_ORIGIN` to the deployed frontend's exact origin (e.g. `https://cacheforge.netlify.app`) before any real traffic reaches it from that origin.

## Deployment architecture

**Production (live):**

```
apps/web   → Netlify           https://cacheforge.netlify.app
apps/api   → Render            https://cacheforge-api.onrender.com
PostgreSQL → Neon
Redis      → Upstash
```

The production health endpoint
(`https://cacheforge-api.onrender.com/api/health`) reports:

```json
{ "status": "ok", "postgres": "up", "redis": "up" }
```

See `DEPLOYMENT_READINESS.md` for the pre-deployment checklist and
verdict, and `docs/decisions.md` for what changed and why.

For local development, see "Getting started" above — the app runs
against Docker Compose's local PostgreSQL/Redis at
`http://localhost:3000` / `http://localhost:4000`, independent of the
production deployment above.

## Known limitations

- **Fire-and-forget metrics:** a process crash in the narrow window
  between "response sent" and "`RequestMetric` insert completed" loses
  that one row. Acceptable for this project's aggregate-trend
  observability; not acceptable for audit-grade data. See
  `docs/decisions.md`.
- **No authentication:** every write and destructive endpoint
  (`POST`/`PUT`/`DELETE /api/products*`, `DELETE /api/cache/:key`,
  `POST /api/benchmarks/run`) is protected only by input validation and
  IP-based rate limiting, not per-user authorization — a deliberate,
  documented trade-off for a single-operator demo (PROJECT_SPEC.md
  §25), re-confirmed as still true in `DEPLOYMENT_READINESS.md`.
- **Rate-limit defaults are placeholders:** 300 reads / 60 writes per
  60-second window per IP are reasonable local-dev defaults, not
  numbers derived from expected production traffic — review before a
  public deployment.
- **No CI pipeline yet:** all verification in this README has been run
  manually; PROJECT_SPEC.md §17 describes the intended GitHub Actions
  pipeline, not yet implemented.

## Monorepo layout

```
apps/api          Fastify API (Prisma/PostgreSQL, Product CRUD)
apps/web           Next.js dashboard
packages/cache-kit Framework-agnostic Redis caching toolkit
packages/contracts Shared Zod schemas/types (API ⇄ web)
docs/              Architecture, caching, performance, decisions
```

## Common scripts

| Command                                           | Description                               |
| ------------------------------------------------- | ----------------------------------------- |
| `pnpm dev`                                        | Run `apps/api` and `apps/web` in parallel |
| `pnpm lint`                                       | Lint every workspace                      |
| `pnpm typecheck`                                  | Type-check every workspace                |
| `pnpm test`                                       | Run tests in every workspace              |
| `pnpm build`                                      | Build every workspace                     |
| `pnpm format`                                     | Format the repo with Prettier             |
| `pnpm --filter @cacheforge/api db:migrate`        | Apply Prisma migrations (dev)             |
| `pnpm --filter @cacheforge/api db:migrate:deploy` | Apply Prisma migrations (production)      |
| `pnpm --filter @cacheforge/api db:seed`           | Seed a small demo product catalog         |
| `pnpm --filter @cacheforge/api db:studio`         | Open Prisma Studio against the local DB   |
| `pnpm --filter @cacheforge/api start`             | Run the compiled production API           |
| `pnpm --filter @cacheforge/web start`             | Run the compiled production frontend      |
