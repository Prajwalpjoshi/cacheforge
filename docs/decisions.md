# Decisions

ADR-style log of decisions actually made during the build, in the format
Context / Decision / Reason / Trade-off. See `PROJECT_SPEC.md` §25 for
the architectural risk/trade-off table decided up front, before any code
existed. This file captures decisions made _while implementing_.

## 2026-09-13 — pnpm via global npm install, not Corepack shims

**Context:** `PROJECT_SPEC.md` and the Phase 1 plan call for enabling
pnpm through Corepack rather than a separate global install.
**Decision:** `corepack enable` failed with `EPERM` (it tries to write
shims into `C:\Program Files\nodejs`, which requires admin rights on this
machine). Installed pnpm globally via `npm install -g pnpm` instead
(npm's global prefix is user-writable), and still pinned the resolved
version (`pnpm@12.4.1`) in the root `package.json` `packageManager`
field.
**Reason:** Unblocks local development without requiring elevated
permissions; the `packageManager` field still gives Corepack (or CI, or
a machine without this restriction) the exact version to use if enabled
there.
**Trade-off:** On this machine, `packageManager` is not actively
enforced by Corepack the way it would be if the shims had installed
successfully — a contributor could run a mismatched pnpm version without
being blocked. Acceptable for a single-developer portfolio project;
worth revisiting if this becomes a multi-contributor repo.

## 2026-09-13 — `apps/web` scaffolded via `create-next-app`, not hand-written

**Context:** The installed Next.js version (16.3.5) is newer than the
assistant's training data, and its own generated `AGENTS.md` explicitly
warns that APIs/conventions may have changed.
**Decision:** Used `pnpm create next-app@latest` to scaffold `apps/web`
instead of hand-authoring `package.json`/`tsconfig.json`/config files,
then customized the generated app (landing page, layout, design tokens)
to match `PROJECT_SPEC.md` §13.
**Reason:** Guarantees the generated config is valid for the actual
installed version rather than guessing at a possibly-outdated shape;
the bundled docs (`node_modules/next/dist/docs/`) were read directly to
confirm current App Router conventions (e.g. `LayoutProps<'/'>` route
prop helper types) before writing page/layout code.
**Trade-off:** None significant — this is standard practice, and the
generated boilerplate not needed for CacheForge (default demo page,
unused SVGs) was removed.

## 2026-09-13 — Cache Components (`cacheComponents`) left disabled

**Context:** Next.js 16 ships an opt-in "Cache Components" model
(`'use cache'` directive, `cacheComponents: true` in `next.config.ts`)
for caching data/UI at the framework level.
**Decision:** Left disabled for CacheForge.
**Reason:** CacheForge's dashboard pages (metrics, health, cache
explorer) need to reflect current backend/Redis state on every load;
Next's own render-level caching is a different concern from the Redis
cache-aside story this project is about, and enabling it would risk the
dashboard silently showing stale data. Data freshness here is handled by
TanStack Query polling once those pages exist (`PROJECT_SPEC.md` §12),
not by Next's cache.
**Trade-off:** Forgoes some of Next 16's prerendering/performance
benefits on largely-static pages (Landing, Architecture, Docs); an
acceptable cost given those pages are a small fraction of the app.

## 2026-09-13 — Prisma pinned to stable 7.10.0, not the `latest` tag

**Context:** At Phase 2 time, npm's `latest` dist-tag for the `prisma`
CLI package pointed to `8.0.0-rc.14` (a release candidate), while
`@prisma/client`'s `latest` tag was still stable `7.10.0` — installing
both as `@latest` would have produced a mismatched, pre-release
combination.
**Decision:** Installed `prisma` and `@prisma/client` pinned to the
exact matching stable version, `7.10.0`.
**Reason:** A portfolio project's data layer should not run on a release
candidate; `prisma generate` itself even prints an upgrade notice
pointing at the RC, which was deliberately ignored.
**Trade-off:** None — this is the correct, boring choice.

## 2026-09-13 — Prisma driver adapters are mandatory in this version

**Context:** This Prisma version's `prisma-client` generator (the
default from `prisma init`, generating a self-contained client into
`src/generated/prisma` rather than `node_modules/@prisma/client`)
requires an explicit driver adapter — `new PrismaClient()` with no
adapter does not compile; the generated types state a driver adapter
is "required unless you connect through Prisma Accelerate."
**Decision:** Added `@prisma/adapter-pg` (+ `pg`) and construct the
client as `new PrismaClient({ adapter: new PrismaPg({ connectionString })
})` in `apps/api/src/plugins/prisma.plugin.ts`. The schema's
`datasource` block no longer carries a `url = env(...)` line — the
connection string lives in `apps/api/prisma7.config.ts` for the CLI and
is passed explicitly to the adapter for the application.
**Reason:** This is simply how the installed Prisma version works; the
generated `src/generated/prisma/internal/prismaNamespace.ts` states the
requirement directly, discovered by reading the generated output rather
than assuming the API in the assistant's training data still applied.
**Trade-off:** One more explicit dependency (`@prisma/adapter-pg`,
`pg`) versus the older implicit-connection model; no functional
downside.

## 2026-09-13 — Per-app `.env` files instead of a single root `.env`

**Context:** Phase 1's `loadEnv()` calls `process.loadEnvFile()` with no
path, which resolves relative to `process.cwd()`. Because
`pnpm --filter @cacheforge/api <script>` runs with cwd set to
`apps/api`, Phase 1 was silently never loading the root `.env` it
instructed users to create — this went unnoticed because every var in
that phase had a Zod schema default. Phase 2's `DATABASE_URL` has no
default, which would have surfaced this as a confusing startup crash.
**Decision:** `apps/api` now reads its own `apps/api/.env`
(`apps/api/.env.example` is the template); the repo-root `.env` is
trimmed to just the `POSTGRES_*` vars `docker compose` needs (it
auto-loads `.env` from the directory containing `docker-compose.yml`).
This also matches how `apps/api/prisma7.config.ts` resolves
`DATABASE_URL` (via `dotenv/config`, also cwd-relative) and how
production deployment already works (§18 — Vercel and Render configure
each service's env vars independently; there is no shared root `.env`
in production either).
**Reason:** Removes a footgun rather than hard-coding a relative path
from `src/env.ts` up to the repo root, which would have been fragile
and wouldn't have matched how the Prisma CLI resolves its own env file.
**Trade-off:** `DATABASE_URL`/`REDIS_URL` are now duplicated in
concept between the root `.env.example` (docker compose's Postgres
credentials) and `apps/api/.env.example` (the API's connection
strings) — an intentional, documented duplication, not an oversight.

## 2026-09-13 — Shared dev/test database, cleanup-based test isolation

**Context:** Product integration tests need a real PostgreSQL instance
(explicitly required for this phase) but a dedicated ephemeral test
database wasn't set up.
**Decision:** Tests run against the same local Postgres container/
database used for manual development, using per-run unique SKU
prefixes (`test-<runId>-N`) and an `afterAll` cleanup that deletes only
rows matching that prefix.
**Reason:** Avoids provisioning a second database for a single local
container within this phase's scope, while still exercising real
Prisma/PostgreSQL behavior (unique constraint violations, not-found
errors) rather than mocks.
**Trade-off:** Test runs are not fully isolated from concurrent manual
use of the same dev database; a real CI pipeline (PROJECT_SPEC.md §17)
should instead provision an ephemeral Postgres service container per
run, which sidesteps this entirely and is worth doing before this
project ships CI.

## 2026-09-14 — `disableOfflineQueue: true` is required for fail-open to actually work

**Context:** While manually verifying Redis-failure behavior against
the real Docker container (stopping it while the API was running),
`GET /api/products/:id` hung indefinitely instead of returning the
expected fail-open `BYPASS` response, and a subsequent `/api/health`
request hung too.
**Decision:** `cache-kit`'s `createRedisClient()` now passes
`disableOfflineQueue: true` to `node-redis`.
**Reason:** node-redis's default behavior is to _queue_ commands issued
while the client is disconnected and wait for reconnection, rather than
rejecting them immediately. Every fail-open `try/catch` in
`cache.ts`/`rate-limit.ts`/`pubsub.ts` depends on the underlying Redis
call actually rejecting on failure — with the default queueing
behavior, nothing ever rejected, so nothing ever caught, and the
request just hung until Redis came back. This was only caught by
actually stopping the real container per PROJECT_SPEC.md §21's
instruction to test this for real rather than mocking it — the
automated fail-open tests (which point at an unreachable address that
never connects at all, so no client is ever in a "connected then
dropped" state) did not exercise this exact scenario.
**Trade-off:** None — this is strictly a correctness fix. Retested
after the fix: `docker compose stop redis` while the API was running →
`GET /api/products/:id` returned 200 with `x-cache-status: BYPASS`,
`POST /api/products` returned 201, `/api/health` reported
`{"status":"degraded","redis":"down"}`, and `GET /api/cache/stats`
degraded gracefully instead of erroring — all within milliseconds, no
hang. `docker compose start redis` afterward, and cache-aside resumed
(`MISS` then `HIT`) on the next two reads.

## 2026-09-14 — Sequential test file execution (`fileParallelism: false`)

**Context:** `apps/api`'s test files all share one real Postgres and
one real Redis instance, including a single global pub/sub channel
(`cacheforge:events`). Running the full suite showed
`test/product-events.integration.test.ts` intermittently receiving
events published by `test/product-cache.integration.test.ts`'s
concurrent product writes, since Vitest runs test files in parallel by
default.
**Decision:** Set `fileParallelism: false` in `apps/api/vitest.config.ts`.
**Reason:** Full determinism matters more than test-suite speed for a
suite whose entire point is exercising shared external state truthfully
(real Postgres, real Redis, one real pub/sub channel) rather than
mocking it apart. Filtering pub/sub messages by a per-test identifier
would have papered over the same underlying issue without fixing the
rate-limiter and cache tests' _own_ latent exposure to the same kind of
cross-file leakage (e.g., two files' rate-limit counters colliding if
they ever reused an identifier).
**Trade-off:** The suite runs somewhat slower (test files no longer
overlap in wall-clock time). Acceptable for a project of this size; a
future CI setup provisioning fresh, ephemeral Postgres/Redis containers
per run would remove the need for this entirely.
