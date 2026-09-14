# Performance

> Status: **Implemented.** The benchmark engine (`POST /api/benchmarks/run`,
> `GET /api/benchmarks`, `GET /api/benchmarks/:id`) is real and running,
> built on `apps/api/src/benchmark/` and `apps/api/src/services/benchmark.service.ts`.
> The numbers in this document were produced by actually running it
> against the local Docker Postgres/Redis — see "A real measured run"
> below — never fabricated or hand-typed.

## What is measured

Application/service/data-access latency: the time to execute the exact
same repository call (`DB_ONLY`) or service-layer cache-aside call
(`CACHE_ONLY`) that the real `GET /api/products` / `GET /api/products/:id`
routes use, timed with `process.hrtime.bigint()` immediately around that
call.

## What is _not_ measured

End-to-end HTTP/browser/network latency. A benchmark run executes
entirely **inside the API process** — it calls
`productRepository`/`productService` functions directly in a loop, it
never issues HTTP requests to itself. This is deliberate
(PROJECT_SPEC.md §11/§13): looping real HTTP requests over the network
would measure the network stack and Node's HTTP parsing overhead as
much as the thing actually being compared (Postgres vs. Redis latency),
which would make DB_ONLY vs. CACHE_ONLY numbers a worse, noisier proxy
for the one variable that matters. The one exception is the _outer_
`POST /api/benchmarks/run` request itself, whose own HTTP overhead is
irrelevant to what's being measured and is excluded from the timed
region entirely.

## DB_ONLY

Calls `productRepository.findById`/`.list` directly — bypassing
`cache-kit` entirely, every iteration is a real PostgreSQL query. There
is no cache state to manage for this mode.

## CACHE_ONLY

Calls `productService.getById`/`.list` — the exact cache-aside code
path the real routes use, not a shortcut that talks to Redis directly.

**Cache state is explicit, not incidental:** every `CACHE_ONLY` run
(and the cache-only half of `COMPARISON`) starts by invalidating the
target's cache entry (`cache.delete`/`cache.invalidateTag`) _before_
the first iteration. This guarantees iteration 1 is always a real,
measured cache MISS (which populates the cache) and every iteration
after it is a real HIT — never a silent, unrepeatable mix of "whatever
happened to already be cached" from unrelated prior traffic. The
reported `cacheHitRate` is exactly `hits / iterations` from what
actually happened, not an assumed 100%; with `iterations = 20` it is
mathematically capped at `19/20 = 0.95`, and the engine reports
whatever the real run measured, not that assumption.

If Redis is unreachable, `CACHE_ONLY`/`COMPARISON` return `503` rather
than silently running a degraded benchmark that would mislabel Postgres
latency as "cache" latency — see `docs/caching.md` for the fail-open
philosophy this is the one deliberate exception to, and why.

## Comparison mode

Runs `DB_ONLY` immediately followed by `CACHE_ONLY`, against the same
target (same product ID, or the same default list query) so the two
sides are measuring the same workload. Both full latency arrays and
each side's own throughput are persisted; `latencyImprovementPct`,
`p95ImprovementPct`, and `throughputImprovementPct` are computed from
those two real result sets (`(before - after) / before * 100`) —
never a hardcoded or assumed percentage. A result of `33%` came from
subtracting two measured averages; it is not a claim this project
makes about caching "in general."

## Percentiles

Nearest-rank method, exactly as specified in PROJECT_SPEC.md §11: for
percentile `p` over `n` sorted samples,

```
rank  = ceil(p / 100 * n)
index = clamp(rank - 1, 0, n - 1)
result = sortedSamples[index]
```

This always returns an actual observed sample — never a value
interpolated between two samples — which is what makes a reported P95
independently reproducible from the raw `latenciesMs` array a benchmark
run persists. Implemented in `apps/api/src/benchmark/percentiles.ts`
and unit-tested (`test/percentiles.test.ts`) against hand-computed
expected values for 1, 2, 10, and 100 samples, and repeated-identical
values.

`GET /api/metrics/summary` uses a _different_ method —
PostgreSQL's `percentile_cont` (linear interpolation) — because it is
aggregating a live, growing table via SQL rather than analyzing one
fixed in-memory array from a single run; see `docs/architecture.md` and
the repository's own comments for why that distinction is deliberate,
not an inconsistency.

## Throughput

`iterations / totalWallClockSeconds`, timed with a single
`process.hrtime.bigint()` measurement wrapped around the _entire_
workload — including however many iterations ran concurrently — never
derived from averaging the individual per-iteration latencies. Ten
1ms-latency iterations running with `concurrency: 10` finish in
roughly 1ms of wall-clock time, not 10ms; only a wall-clock timer
around the whole batch captures that, which is exactly why the
codebase keeps these as two distinct measurements
(`apps/api/src/benchmark/percentiles.ts`'s doc comments spell this
out, and `test/percentiles.test.ts` has a dedicated case proving
throughput isn't the same computation as average latency).

## Concurrency

A small fixed-size worker pool (`apps/api/src/benchmark/concurrency.ts`),
not an unbounded `Promise.all` over every iteration — at most
`min(concurrency, iterations)` calls are ever in flight at once.
Default `concurrency: 1` (strictly sequential, the cleanest signal);
capped at `20` per PROJECT_SPEC.md §11's guardrail, alongside a
1000-iteration cap — both enforced by Zod validation (rejected with
`400`, never silently clamped to the limit).

## Benchmark isolation

Benchmarks are read-only against product data: `DB_ONLY`/`CACHE_ONLY`
only ever call `findById`/`list` — never `create`/`update`/`delete`.
For a `products.get` target, the engine picks one existing product
(the first page-1 result) and reuses that same ID for every iteration
of that run; if no products exist yet, the run is rejected with `400`
rather than silently creating one (PROJECT_SPEC.md §25). This is
enforced in code (the repository stub simply has no benchmark-callable
write methods in the paths the engine uses) and verified in
`test/benchmark.integration.test.ts`'s isolation test, which asserts
the product count and the target product's own row are unchanged
after a run.

## Persistence

Every completed run is saved as a `BenchmarkRun` row — see
PROJECT_SPEC.md §8 for the model. For `DB_ONLY`/`CACHE_ONLY`, the raw
per-iteration latency array is stored directly; for `COMPARISON`
(a single row, since PROJECT_SPEC.md §10 describes the response as
"one `BenchmarkRun`... for `COMPARISON`, the response includes both
sub-results," not two separate rows) the JSON column instead holds
`{ dbOnly: { latenciesMs, throughputRps }, cacheOnly: { latenciesMs,
throughputRps, hits, total } }`, and the row's own top-level
min/max/avg/percentile/throughput/hit-rate columns mirror the
cache-only ("headline") side. Percentile/min/max/avg stats for a
`COMPARISON` row's `GET` response are recomputed from the stored raw
latencies on read (deterministic, no drift risk between the stored
summary and the raw data); throughput and hit-count are persisted
directly since they cannot be derived from a latency array alone.

A benchmark that fails (invalid input, no products to target, Redis
required but unreachable) never creates a `BenchmarkRun` row —
`repository.create()` is the very last step of a successful run, after
every measurement has already completed.

## A real measured run

Produced by actually calling the API (`POST /api/benchmarks/run`)
against a single product on the local Docker Postgres + Redis, 30
iterations, concurrency 1, `products.get` target — not hand-typed:

|                | DB_ONLY   | CACHE_ONLY    |
| -------------- | --------- | ------------- |
| min            | 1.91 ms   | 1.30 ms       |
| avg            | 2.54 ms   | 1.69 ms       |
| p50            | 2.50 ms   | 1.43 ms       |
| p95            | 3.49 ms   | 2.19 ms       |
| p99            | 3.49 ms   | 6.72 ms       |
| throughput     | 393 req/s | 589 req/s     |
| cache hit rate | n/a       | 96.7% (29/30) |

Computed directly from those two result sets: **~33% lower average
latency, ~37% lower P95, ~50% higher throughput** with the cache
warm. These are the actual numbers from one run in one local Docker
environment on one developer machine — see Limitations below before
reading anything universal into them.

## Limitations

These results depend on this machine's CPU, available RAM, Docker's
resource allocation, whatever else was running at the time, the
current size/state of the `Product` table, Redis's current memory
pressure, and the iteration/concurrency parameters chosen. A different
machine, a larger product catalog, a network-attached (rather than
same-host Docker) Postgres/Redis, or genuine concurrent production
load could all move these numbers meaningfully — in either direction.
**A benchmark run in this Performance Lab is a real, reproducible
local measurement, not a universal production performance guarantee.**
Re-running the exact same configuration will not reproduce identical
numbers (real systems have jitter), but should reproduce comparable
ones under similar local conditions — that repeatability, not
numerical identity, is the actual claim being made.
