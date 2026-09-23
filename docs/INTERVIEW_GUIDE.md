# CacheForge — Interview Guide

How to talk about CacheForge in a technical interview, at three different
depths, plus the reasoning behind the engineering decisions that are most
likely to come up. Every answer here is grounded in what's actually
implemented — see `docs/TECHNICAL_ARCHITECTURE.md` for the file-level
evidence behind any claim.

---

## 30-second explanation

"CacheForge is a full-stack app that puts a real Redis cache in front of a
PostgreSQL-backed product catalog API, and then proves — with actual
measured numbers, not claims — how much that cache helps. It's a Fastify
API and a Next.js dashboard, and the interesting engineering is in the
cache-aside layer, the invalidation strategy, and a built-in benchmarking
tool that measures database-only vs. cached latency on the same code
path."

## 2-minute explanation

"CacheForge is a monorepo: a Fastify API, a Next.js dashboard, and two
shared packages — `contracts` for Zod schemas used by both sides, and
`cache-kit`, a small framework-agnostic Redis toolkit I built myself
rather than reaching for an off-the-shelf caching library, so I could
control exactly how cache-aside, rate limiting, and pub/sub behave.

The domain is deliberately simple — a product catalog — because the point
isn't the CRUD, it's what sits around it: every product read goes through
a cache-aside layer (check Redis, fall back to Postgres on a miss,
repopulate Redis), every write invalidates exactly the affected cache
entries using a tag-set instead of a blocking `KEYS` scan, and every
request is measured and persisted so there's a real metrics dashboard, not
a mocked one.

The part I'm most proud of is the Performance Lab: it runs the _actual_
service-layer code, once against the database directly and once through
the cache, and reports real percentile latencies and throughput — so when
I say 'caching cuts P95 by X%,' that's a number the system produced
itself, on my machine, reproducibly, not something I typed into a
markdown file."

## 5-minute architecture explanation

Walk through, in order:

1. **The shape of the monorepo** — `apps/api` (Fastify), `apps/web`
   (Next.js), `packages/contracts` (shared Zod schemas — one definition of
   "what a Product looks like," so backend validation and frontend types
   can never silently drift), `packages/cache-kit` (Redis toolkit with
   zero framework dependencies — it never imports Fastify, Next.js, or
   Prisma, so it could be dropped into an unrelated project unchanged).
2. **The layering inside `apps/api`** — routes → controllers → services →
   repositories, strictly one direction. Repositories only know Prisma
   queries; they have no idea caching exists. Services own the cache-aside
   _decision_ (which key, which TTL, invalidate what) because that's
   business logic about the product domain, not generic infrastructure.
3. **The read path** — `GET /api/products/:id` asks
   `cache.getOrSet(key, ttl, fetcher)`: HIT returns immediately (Postgres
   untouched), MISS reads Postgres and repopulates Redis, and if Redis
   itself is unreachable, that's a third outcome — BYPASS — which is
   _not_ an error, it's the designed fail-open behavior.
4. **The write path** — a write commits to Postgres first; only after
   that succeeds does it delete the specific cache key, invalidate the
   list-cache tag set (a Redis Set that tracks which list-query keys are
   currently cached, so invalidation never needs `KEYS`/`SCAN` on the
   write path), and publish a pub/sub event.
5. **The Performance Lab** — calls the exact same repository/service
   functions the real routes use, in a loop, entirely inside the API
   process (not over HTTP, which would measure the network instead of the
   cache), and computes percentiles with a simple nearest-rank method so
   every reported number traces back to an actual observed sample.
6. **Observability** — every request is timed and logged; most are also
   persisted to a `RequestMetric` table (fire-and-forget, after the
   response is sent, so it adds zero latency); the dashboard's numbers are
   PostgreSQL aggregates computed live, never fabricated.
7. **What's honestly still missing** — no authentication anywhere (a
   stated, deliberate trade-off for a single-operator demo, not something
   I'm pretending is solved), rate-limit defaults that are placeholders
   rather than a traffic study, and no CI pipeline yet.

---

## Engineering decisions — the "why"

### Why Redis?

Because the cache, the rate limiter, and the pub/sub channel all need
_shared_ state across however many API instances might exist — an
in-process cache (an LRU map) can't be invalidated correctly from a
different instance, and an in-process rate limiter's effective limit
becomes `N × configured limit` the moment you run more than one instance.
Redis gives all three from one piece of infrastructure, and it's the
workload this project exists to demonstrate.

### Why cache-aside?

Because it preserves a simple invariant by construction: PostgreSQL is
always the source of truth, and the API is always correct even with Redis
completely absent. Write-through would make every write pay a Redis round
trip and still need its own miss-on-read logic — more moving parts for a
read-heavy catalog workload that doesn't need them.

### Why invalidation via a tag set, not `KEYS`/pattern scanning?

`KEYS` (and unscoped `SCAN` patterns used as a substitute) is `O(n)` over
the entire keyspace and blocks Redis's single-threaded event loop while it
runs — unacceptable on a path that executes on every write. Instead, every
list-cache write registers its own key into a Redis Set; invalidation
reads that set's members and deletes exactly those keys, an operation
bounded by "how many list variants are currently cached," not "how big is
the whole keyspace." The only place `SCAN` appears anywhere in the
codebase is the read-only, cursor-based Cache Explorer endpoint — never on
a write path.

### Why PostgreSQL?

It's the durable system of record for three things: the actual product
data, a raw log of every real request, and every benchmark result. Nothing
in this system is allowed to be true only in Redis — if Redis vanished
entirely, every fact that matters would still be recoverable from
Postgres.

### Why Fastify?

Its schema-based validation model maps directly onto a Zod-first
architecture (via `fastify-type-provider-zod`), and its `onRequest` /
`onSend` / `onResponse` hook lifecycle is exactly what's needed for a
clean, centralized rate-limiter and observability layer without scattering
that logic across every route handler.

### Why a layered (routes/controllers/services/repositories) architecture?

So each layer has exactly one reason to change. If I need to add a new
cache key, that's a services-layer change; if I need to change a SQL
query's shape, that's repositories-only; if I need to change an HTTP
status code mapping, that's the global error handler. Nothing about
Prisma leaks into a controller, and nothing about Fastify's request/reply
objects leaks into a service — which is also what makes services testable
without spinning up an HTTP server.

### Why a shared `contracts` package?

Both `apps/api` and `apps/web` need to agree on exactly what a Product (or
a health response, or a benchmark result) looks like. Duplicating that
definition invites silent drift — the frontend assuming a field exists
that the backend renamed, for instance. One shared Zod schema, imported by
both sides, makes that class of bug structurally impossible instead of
something to catch in code review.

### Why Redis pub/sub?

To make "a write happened, and here's what" an observable event
independent of polling — `cacheforge:events` carries
`product.updated`/`product.deleted`/`cache.invalidated` messages,
published only after the triggering write has actually committed. It's
implemented and tested end-to-end; it's honest to say the current
frontend doesn't yet have a live UI feed consuming it — the plumbing
exists, but nothing in the running app currently subscribes to it outside
the test suite.

### Why benchmark DB-only vs. cache in-process, not over real HTTP?

Looping real HTTP requests at the API would measure the network stack and
Node's own HTTP parsing overhead as much as the thing actually being
compared. Calling the repository (`DB_ONLY`) or service (`CACHE_ONLY`)
functions directly, in a loop, inside the same process, isolates the one
variable that's actually interesting: how much time Postgres vs. Redis
adds to fetching the same data.

### How does failure handling actually work?

Redis failures are fail-open everywhere except one deliberate exception:
a cache-only benchmark run returns a `503` rather than silently measuring
a degraded system and calling the result "cache performance." PostgreSQL
failures are never fail-open — Postgres is the source of truth, so its
absence is a real, honestly-reported outage (`/api/health` returns a real
`503`), not something to paper over.

### How was performance actually verified?

By running the Performance Lab itself against the local Docker
Postgres/Redis and recording the real output — not by writing plausible
numbers into documentation. `docs/performance.md` has one such run (30
iterations, `products.get`, `COMPARISON`), with an explicit "Limitations"
section stating these are one local measurement on one machine, not a
universal production guarantee — and the methodology (nearest-rank
percentiles, wall-clock throughput, guaranteed cold-start-then-warm cache
behavior) is fully documented so the numbers are reproducible, not a black
box.

### What would you improve next?

In priority order, honestly:

1. **Authentication** — every write/destructive endpoint is currently
   open, protected only by rate limiting. For anything beyond a
   single-operator demo, this is the first gap to close.
2. **A real CI pipeline** — the intended lint → typecheck → unit →
   integration → build → e2e pipeline is designed (`PROJECT_SPEC.md` §17)
   but not yet implemented; all verification so far has been manual.
3. **Rate-limit tuning from real traffic data** — the current 300/60
   defaults are reasonable local-dev placeholders, not derived from an
   actual expected load.
4. **A live pub/sub-driven UI feed** — the plumbing (`cacheforge:events`)
   already exists and is tested; wiring a real-time event feed into the
   System Health or Cache Explorer page would make that investment pay
   off visibly.
5. **Ephemeral test infrastructure in CI** — the current integration
   tests share one long-lived local Postgres/Redis instance
   (`fileParallelism: false` works around this locally); a real CI setup
   provisioning fresh service containers per run would remove that
   constraint entirely.
