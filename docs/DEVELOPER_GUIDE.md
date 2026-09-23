# CacheForge — Developer Guide

A practical onboarding path for a developer joining this project, plus a
map of where to look when you need to change something. For _how the
system works_, see `docs/TECHNICAL_ARCHITECTURE.md`; for a friendlier
first read, see `docs/HOW_CACHEFORGE_WORKS.md`.

---

## 1. Getting a working local environment

### 1. Clone the project

```bash
git clone <this repository>
cd CacheForge
```

### 2. Install dependencies

```bash
pnpm install
```

This also generates the Prisma client (`postinstall` runs `prisma generate`
inside `apps/api`, producing the git-ignored `apps/api/src/generated/prisma`).
Requires pnpm (see `packageManager` in the root `package.json`); if
Corepack can't provision it on your machine, `npm install -g pnpm` works
identically — see `docs/decisions.md`'s 2026-09-13 entry for why Corepack
was skipped on the original development machine.

### 3. Start Docker (local PostgreSQL + Redis)

```bash
docker compose up -d
docker compose ps    # confirm both services report "healthy"
```

This starts **only** PostgreSQL 16 and Redis 7 — `apps/api`/`apps/web`
are not compose services (see `docs/TECHNICAL_ARCHITECTURE.md` §23).

### 4. Configure environment

```bash
cp .env.example .env                       # docker compose's Postgres credentials
cp apps/api/.env.example apps/api/.env     # the API's own config
cp apps/web/.env.example apps/web/.env.local
```

Each app reads its **own** env file — see
`docs/TECHNICAL_ARCHITECTURE.md` §24 for exactly why (Node's
`process.loadEnvFile()` is cwd-relative). The only variable you're likely
to need to change locally is nothing — the `.env.example` defaults already
match `docker-compose.yml`'s defaults.

### 5. Run migrations

```bash
pnpm --filter @cacheforge/api db:migrate
```

There is exactly one migration (`20260913151753_init`) creating `Product`,
`RequestMetric`, and `BenchmarkRun`. Use `db:migrate:deploy`
(`prisma migrate deploy`) instead in any non-interactive/production
context — it's the same script the deployment-readiness audit verified
against a genuinely fresh database.

### 6. Seed (optional)

```bash
pnpm --filter @cacheforge/api db:seed
```

Seeds exactly 6 demo products (idempotent — safe to re-run). Never seeds
`RequestMetric`/`BenchmarkRun` rows; those only come from real traffic.

### 7. Start the API

```bash
pnpm --filter @cacheforge/api dev    # http://localhost:4000/api/health
```

### 8. Start the frontend

```bash
pnpm --filter @cacheforge/web dev    # http://localhost:3000
```

`predev` automatically copies `README.md`/`docs/*.md` into
`apps/web/content/` before the dev server starts (`scripts/copy-docs.mjs`)
— this is what powers the in-app `/docs` page.

Or run both at once from the repo root: `pnpm dev`.

### 9. Run tests

```bash
pnpm test                                          # every workspace (183 tests)
pnpm --filter @cacheforge/api test:unit            # apps/api, no external services
pnpm --filter @cacheforge/api test:integration      # apps/api, needs the Docker services running
```

Note: 3 of `packages/cache-kit`'s 4 test files also require a live Redis
(`localhost:6379` by default) even though they're not labeled
"integration" in that package's own scripts — see
`docs/TECHNICAL_ARCHITECTURE.md` §22.

### 10. Explore the application

- `http://localhost:3000/dashboard` — Overview Dashboard (needs some
  traffic to look interesting; browse the catalog via the API Explorer
  first, or just refresh a product a few times).
- `http://localhost:3000/performance` — run a small `COMPARISON` benchmark
  (10–30 iterations) against `products.get` to see a real DB-vs-cache
  measurement.
- `http://localhost:3000/cache` — watch keys appear as you hit product
  endpoints, then delete one manually.
- `http://localhost:3000/api-explorer` — try any of the 14 real endpoints
  directly, including seeing a live `429` if you exceed the write rate
  limit.

---

## 2. Where to look when modifying something

| I want to change...                                                                                 | Start here                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend** page behavior/layout                                                                   | `apps/web/app/(app)/<page>/page.tsx` → the matching `apps/web/components/<feature>/` directory                                                                                                                                                                                                                     |
| A shared UI primitive (buttons, skeletons, error/empty states)                                      | `apps/web/components/ui/`                                                                                                                                                                                                                                                                                          |
| How the frontend talks to a specific resource                                                       | `apps/web/lib/api/<resource>.ts` (all funnel through `apps/web/lib/api/client.ts`)                                                                                                                                                                                                                                 |
| Polling behavior / query caching                                                                    | `apps/web/lib/hooks/use-*.ts` (per-resource) and `apps/web/lib/providers.tsx` (global defaults)                                                                                                                                                                                                                    |
| The API Explorer's endpoint catalog                                                                 | `apps/web/lib/api-explorer/catalog.ts` (hand-maintained — keep in sync with `packages/contracts` and `apps/api/src/routes/*` by hand; there is no generator)                                                                                                                                                       |
| **A new/changed API endpoint**                                                                      | Add/modify the route in `apps/api/src/routes/*.route.ts`, wire a controller in `apps/api/src/controllers/`, and the schema in `packages/contracts/src/` (re-exported via `apps/api/src/schemas/`)                                                                                                                  |
| **Business logic** (what a request actually does)                                                   | `apps/api/src/services/*.service.ts` — this is also where cache-aside decisions and invalidation/pub-sub triggers belong; never put this in a controller or repository                                                                                                                                             |
| **Database access / queries**                                                                       | `apps/api/src/repositories/*.repository.ts` — the _only_ layer that imports Prisma; add a new query function here, never inline a Prisma call in a service                                                                                                                                                         |
| **Database schema**                                                                                 | `apps/api/prisma/schema.prisma`, then `pnpm --filter @cacheforge/api exec prisma migrate dev --name <description>` to generate a new migration — never hand-edit a committed migration                                                                                                                             |
| **Redis key naming, TTLs, tags, channel names**                                                     | `apps/api/src/cache/keys.ts` (all CacheForge-specific naming lives here — `packages/cache-kit` itself has no concept of a `cacheforge:` prefix)                                                                                                                                                                    |
| **Pub/sub event types/payloads**                                                                    | `apps/api/src/events.ts`                                                                                                                                                                                                                                                                                           |
| **Generic cache/rate-limit/pub-sub primitives** (framework-agnostic, reusable outside this project) | `packages/cache-kit/src/{cache,rate-limit,pubsub,redis-client}.ts` — changes here affect every consumer; keep it free of Fastify/Prisma/Next imports                                                                                                                                                               |
| **Shared request/response shapes**                                                                  | `packages/contracts/src/<domain>.ts` — both `apps/api` and `apps/web` import from here; a schema change here is the single source of truth for both sides                                                                                                                                                          |
| **Global error handling / status-code mapping**                                                     | `apps/api/src/errors.ts` (error classes) and `apps/api/src/middleware/error-handler.ts` (the mapping)                                                                                                                                                                                                              |
| **Rate limiting behavior**                                                                          | `packages/cache-kit/src/rate-limit.ts` (the algorithm) and `apps/api/src/plugins/rate-limit.plugin.ts` (which routes/methods it applies to, header names)                                                                                                                                                          |
| **Metrics collection / exclusion rules**                                                            | `apps/api/src/observability/request-context.plugin.ts` (what's measured) and `apps/api/src/observability/metrics-exclusions.ts` (which routes are excluded from persistence)                                                                                                                                       |
| **The benchmark engine**                                                                            | `apps/api/src/benchmark/{percentiles,concurrency}.ts` (pure math) and `apps/api/src/services/benchmark.service.ts` (mode dispatch, workload resolution)                                                                                                                                                            |
| **Tests**                                                                                           | Co-located per package: `packages/*/test/`, `apps/api/test/`, `apps/web/**/*.test.ts(x)` — see `docs/TECHNICAL_ARCHITECTURE.md` §22 for what each layer already covers before adding a new test                                                                                                                    |
| **Documentation**                                                                                   | `docs/architecture.md` / `caching.md` / `performance.md` / `decisions.md` are the phase-by-phase build log — add a new dated entry to `decisions.md` for any new architectural decision; `docs/TECHNICAL_ARCHITECTURE.md` is the synthesized deep reference (update it if a change here makes a claim in it stale) |

---

## 3. Conventions worth knowing before your first change

- **Routes → Controllers → Services → Repositories, one direction only.**
  A controller never calls Prisma or Redis directly; a repository never
  makes a caching decision. See `docs/TECHNICAL_ARCHITECTURE.md` §6.
- **Cache-aside, always via `cache.getOrSet`.** Don't call `redis.get`/`set`
  directly from a service — go through `packages/cache-kit`'s `cache`
  instance (decorated on `fastify.cache`) so fail-open behavior and stats
  tracking stay consistent.
- **Never use Redis `KEYS`/`FLUSHALL`/`FLUSHDB`.** Use tag-based
  invalidation (`invalidateTag`) for bulk operations and cursor-based
  `SCAN` (already wrapped in `cache-admin.service.ts`) for enumeration.
  This is grep-checked in the test suite's spirit, even if not currently
  enforced by an automated lint rule.
- **Any new key must live under the `cacheforge:` namespace**
  (`apps/api/src/cache/keys.ts`'s `NAMESPACE` constant) — this is what
  keeps `SCAN MATCH cacheforge:*` and the `DELETE /api/cache/:key`
  namespace guard meaningful.
- **Invalidate/publish only after a successful commit.** See
  `docs/TECHNICAL_ARCHITECTURE.md` §8/§11 for why order matters here.
- **Zod schemas live in `packages/contracts`, not duplicated locally.** If
  you need a shape only `apps/api` uses (no frontend consumer), it's still
  conventional to add it under `apps/api/src/schemas/` as a thin re-export
  — see the existing files there for the pattern, and their own comment
  about when a truly API-only schema would be added directly instead.
- **No authentication exists.** Don't assume a `request.user` or similar —
  every route is currently reachable without a credential (see
  `docs/TECHNICAL_ARCHITECTURE.md` §21). If you're adding a genuinely
  destructive new capability, treat this as an open question, not a solved
  one.
- **Fire-and-forget metrics persistence is intentional**, not a bug to
  "fix" by awaiting it — see `docs/TECHNICAL_ARCHITECTURE.md` §15 for why.
- **`apps/api`'s test suite runs with `fileParallelism: false`** because
  test files share one real Postgres/Redis/pub-sub channel — keep new
  integration tests aware of this shared state (unique SKU prefixes, etc.,
  following the existing tests' pattern) rather than assuming isolation.
