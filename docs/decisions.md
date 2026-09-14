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

## 2026-09-14 — `metricsService` decorated on the root instance, not its own route file

**Context:** `productService`/`cacheAdminService`/`healthService` are
each decorated inside their own route-registration function
(`product.route.ts`, etc.) — fine, since only that route's own
controllers ever read the decoration, and Fastify decorations are only
visible within the encapsulation context they're declared in (and its
children), not to sibling contexts. `metricsService` breaks that
pattern: the global `onResponse` hook in
`observability/request-context.plugin.ts` — registered before, and
outside of, any route file's own context — needs to call
`fastify.metricsService.record(...)` for every request.
**Decision:** Added `apps/api/src/plugins/metrics.plugin.ts`, wrapped
in `fastify-plugin` (`fp`), whose only job is to construct the metrics
repository/service and decorate them onto the _root_ instance;
`metrics.route.ts` now just wires two `GET` routes to the
already-decorated `fastify.metricsService` rather than constructing its
own copy.
**Reason:** `fp()` is specifically what makes a `decorate()` call apply
to the root instance instead of a new child scope — without it, the
cross-cutting hook would silently see `fastify.metricsService` as
`undefined` at every request (this was caught before it shipped, by
reasoning through Fastify's encapsulation model while wiring the hook,
not by a failing test).
**Trade-off:** One more plugin file for a single decoration; justified
because it's the only service with this genuine cross-context need. A
related, smaller version of the same issue came up wiring the benchmark
engine (needs the _same_ cache-aside code `productService` provides),
solved differently there: `benchmark.route.ts` constructs its own
second `ProductService` instance from the same root-level
`repository`/`cache`/`pubsub` primitives, rather than promoting
`productService` to root-level too — it's a pure/stateless factory, so
a second instance behaves identically to the first, and this avoided
touching product.route.ts's already-working Phase 2/3 code.

## 2026-09-14 — `COMPARISON` benchmarks persist as one row, not two

**Context:** `BenchmarkRun` has one set of stat columns
(`minMs`/`maxMs`/.../`throughputRps`/`cacheHitRate`) per PROJECT_SPEC.md
§8, but `COMPARISON` mode produces _two_ full result sets (DB_ONLY and
CACHE_ONLY). PROJECT_SPEC.md §10 describes the API response as one
`BenchmarkRun` "for `COMPARISON`, the response includes both
sub-results" — singular, not two separate history entries.
**Decision:** A `COMPARISON` run creates exactly one `BenchmarkRun` row.
Its top-level stat columns mirror the cache-only ("headline") side; the
`rawLatenciesMs` JSON column holds a structured
`{ dbOnly: { latenciesMs, throughputRps }, cacheOnly: { latenciesMs,
throughputRps, hits, total } }` instead of a flat array. On read,
`GET /:id` recomputes each side's min/max/avg/percentiles from its own
stored raw latencies (deterministic, no drift risk) and derives the
improvement percentages from those two real result sets; throughput
and hit-count are stored directly since they can't be derived from a
latency array alone.
**Reason:** Matches the spec's own framing exactly, avoids adding a new
column/model to correlate two rows as "one comparison," and keeps
`GET /api/benchmarks`'s history list honest (a `DB_ONLY` row there
really is one run, not half of something else).
**Trade-off:** `rawLatenciesMs`'s shape now depends on `mode` (flat
array vs. structured object) — documented in code
(`services/benchmark.service.ts`) and in `docs/performance.md`, not
left implicit.

## 2026-09-14 — Redis client gets a bounded `connectTimeout`

**Context:** Writing a test for "benchmarks return 503 when Redis is
unreachable," pointing `buildServer()` at an address nothing listens on
took 10+ seconds to resolve — node-redis's default reconnect strategy
keeps retrying with backoff in the background even after the first
attempt fails, and with no `connectTimeout` set, each attempt could take
a long time to fail on its own.
**Decision:** `redis.plugin.ts` now passes `connectTimeout: 5000` when
constructing the production client (the reconnect _strategy_ itself —
keep retrying — is left at its default; only each individual attempt's
duration is bounded).
**Reason:** This is a genuine production robustness gap independent of
the test that surfaced it: a Redis that's slow or unreachable at
startup should make the API degrade (per the fail-open design) within a
bounded, known time, not hang indefinitely on an OS-level TCP timeout.
The test itself was rewritten to exercise the same
`ServiceUnavailableError` precondition against a `cache-kit` client
built directly with `reconnectStrategy: false` (the same fast,
deterministic pattern Phase 3's own cache-kit tests already used),
rather than waiting out a real 5-second timeout through the full
HTTP/Fastify layer.
**Trade-off:** None functionally; a real, hard-down Redis at process
startup now surfaces as "degraded" within 5 seconds instead of
whatever the OS's default TCP timeout happens to be on a given machine.

## 2026-09-14 — Which routes are excluded from RequestMetric persistence

**Context:** PROJECT_SPEC.md doesn't enumerate which routes should
count as "traffic" for `/api/metrics/summary`/`requests`; left
unaddressed, viewing the metrics dashboard would itself generate new
metrics rows about viewing the dashboard, and a Performance Lab
benchmark's own outer HTTP request (dominated by however many
iterations it ran) would appear as one wildly-outlying "request" that
skews the real traffic's percentiles.
**Decision:** `/api/health`, `/api/metrics/*`, `/api/benchmarks/*`, and
`/api/cache/*` are excluded from persistence (still logged, just not
written to `RequestMetric`); everything else — currently
`/api/products*` — is persisted. Centralized in one function,
`apps/api/src/observability/metrics-exclusions.ts`, with the reasoning
for each prefix in its doc comment, so this is documented in exactly
one place rather than duplicated wherever it's relevant.
**Reason:** Keeps the metrics table representing what it's meant to
represent (real product-catalog traffic) without ambiguity about which
"requests" count.
**Trade-off:** If a future phase wants to report on cache-admin or
benchmark request volume specifically, it needs its own mechanism —
deliberately not conflated with the product-traffic metrics pipeline.

## 2026-09-14 — Metrics persistence is fire-and-forget, not queued or awaited

**Context:** PROJECT_SPEC.md's Phase 4 instructions require persistence
to avoid adding request latency, avoid an unbounded in-memory queue,
and never silently lose errors.
**Decision:** The `RequestMetric` insert happens in Fastify's
`onResponse` hook (which runs _after_ the response has already been
sent to the client) and is not `await`-ed — it's fired with a
`.catch()` that logs a warning on failure.
**Reason:** Because the response is already sent by the time this hook
runs, the insert's latency is invisible to the caller regardless of
whether it's awaited; not awaiting it just means Fastify's hook chain
for _this_ request doesn't wait on it either. There's no queue/array
accumulating pending writes — each request's insert is one independent,
bounded operation, so the natural back-pressure is Postgres/Prisma's
own connection pool, identical to any other concurrent query the API
makes.
**Trade-off:** If the process crashes in the narrow window between
"response sent" and "insert completed," that one metric row is lost.
Acceptable for a demo observability pipeline reporting on aggregate
trends, not acceptable for audit-grade/billing data — documented as a
known, deliberate limitation rather than left implicit.
