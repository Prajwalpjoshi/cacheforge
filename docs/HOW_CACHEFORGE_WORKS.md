# How CacheForge Works

> CacheForge is a full-stack API performance laboratory that demonstrates
> how Redis caching affects API performance and how those effects can be
> observed and measured.

This is the easiest document in the repo to start with. It walks through
the system in the order things actually happen, with just enough detail
to understand _why_ each step exists. For exact file references and every
edge case, see `docs/TECHNICAL_ARCHITECTURE.md`.

---

## 1. A user opens the application

They land on `/` (the marketing page) or go straight to `/dashboard`. Both
are served by the Next.js app (`apps/web`), which is a normal browser
application — it renders in the browser and talks to a separate backend
API over HTTP. It never touches PostgreSQL or Redis directly.

## 2. The frontend calls the API

Every piece of live data on the page — dashboard numbers, cache keys,
benchmark results — comes from `apps/web/lib/api/*.ts`, which sends a
`fetch()` to `NEXT_PUBLIC_API_URL` (the Fastify API's address) and
validates whatever comes back against a shared schema, so the frontend
never trusts an API response blindly.

```
Browser  →  Next.js (apps/web)  →  fetch()  →  Fastify API (apps/api)
```

## 3. The API receives the request

Fastify assigns the request a unique ID, starts a timer, and begins
running it through a short pipeline of cross-cutting checks before it
ever reaches your actual endpoint logic.

## 4. The rate limiter checks the request

Before almost anything else, a Redis-backed counter checks: has this IP
address made too many requests in the current time window? Read endpoints
get a generous limit (300/minute by default); write endpoints (create,
update, delete, and running a benchmark) get a stricter one (60/minute).
If the limit is exceeded, the request stops here with a `429` response.
`/api/health` is the one endpoint that's never rate-limited, so monitoring
tools can always check it.

## 5. The route validates and dispatches

Every request body/query/path parameter is checked against a Zod schema
(shared with the frontend from `packages/contracts`) before any business
logic runs. A malformed request never gets further than this — it comes
back as a `400` with a field-level explanation of what was wrong.

## 6. The service checks Redis

For a product read (`GET /api/products/:id` or `/api/products`), the
service layer asks Redis first: "do you already have this?" This is the
**cache-aside** pattern — Redis is checked before the database, and only
consulted, never assumed to be the source of truth.

## 7. Redis says HIT or MISS (or is unreachable — BYPASS)

- **HIT** — Redis had the value. It's returned immediately. PostgreSQL is
  never touched for this request.
- **MISS** — Redis was reachable but didn't have the value yet.
- **BYPASS** — Redis itself couldn't be reached at all. This is treated
  as "go straight to the database" rather than an error — a Redis outage
  should never take the API down, since Redis is a performance layer, not
  the source of truth.

## 8. PostgreSQL fallback

On a MISS or BYPASS, the service asks the repository layer for the real
data, which queries PostgreSQL through Prisma. This is always correct —
PostgreSQL is the one place where "what is a product, really" is decided.

## 9. Cache population

If Redis was reachable (a real MISS, not a BYPASS), the freshly-read value
is written back into Redis with a TTL — 60 seconds for a single product,
30 seconds for a list. The _next_ request for the same thing will now be
a HIT, until either the TTL expires or the product is written to again
(see step 13).

## 10. The response goes back to the browser

Every response carries an `x-cache-status` header (`HIT`, `MISS`, or
`BYPASS`) so you can literally watch this happen in your browser's
network tab or in the API Explorer.

## 11. Metrics persistence

_After_ the response has already been sent to the browser — so this never
adds latency the user experiences — the API fires off (without waiting
for it to finish) an insert into a `RequestMetric` table: which route,
which method, how long it took, what the cache status was. A handful of
routes (health checks, the metrics/cache/benchmark endpoints themselves)
are deliberately excluded, so the dashboard doesn't end up measuring
itself.

## 12. Dashboard visualization

The Overview Dashboard polls `GET /api/metrics/summary` and
`GET /api/metrics/requests` every 5 seconds and renders real aggregates —
P50/P95/P99 latency, cache hit rate, error rate — computed live from that
`RequestMetric` table by PostgreSQL itself (not pulled into JavaScript
and reduced by hand). Nothing here is a fabricated demo number.

## 13. Writing data invalidates the cache

Creating, updating, or deleting a product first writes to PostgreSQL.
Only _after_ that write actually succeeds does the service:

1. Delete the specific product's cache entry (for update/delete).
2. Invalidate every cached list-query result, via a small Redis _set_ that
   tracks which list keys are currently active — never by scanning the
   whole keyspace, which would be slow and blocking.
3. Publish an event (`product.updated` or `product.deleted`) on a Redis
   pub/sub channel, so anything listening knows a write just happened.

The next read after a write is guaranteed to be a fresh MISS — never a
stale HIT.

## 14. Benchmarking — proving the cache actually helps

The Performance Lab (`/performance`) lets you run a controlled experiment:
call the _exact same_ product-lookup code, some number of times, once
bypassing the cache entirely (`DB_ONLY`) and once going through the real
cache-aside path (`CACHE_ONLY`) — or both back-to-back (`COMPARISON`).
Real latencies are measured with a high-resolution timer, percentiles are
computed with a simple, reproducible formula (the nearest actual observed
sample, not an interpolated guess), and the whole result is saved to
PostgreSQL so you can look back at past runs. This turns "caching makes
things faster" from a slogan into a number you produced yourself, on your
own machine, from your own code.

## 15. Failure handling — what happens when something breaks

- **Redis goes down:** cache reads become BYPASS, writes/invalidation/pub-sub
  quietly log a warning and continue, rate limiting lets every request
  through rather than blocking traffic. `GET /api/health` is the one place
  that always tells you the truth about this (`redis: "down"`), even
  though the rest of the API keeps working.
- **PostgreSQL goes down:** this is a real outage. `/api/health` returns a
  genuine `503`, and product endpoints return real error responses —
  there's no faking a working database.

---

## The whole loop, in one picture

```
User opens app
   ↓
Frontend calls API
   ↓
Rate limiter checks the request
   ↓
Service checks Redis
   ↓
   ├── HIT  → return cached value (Postgres untouched)
   └── MISS/BYPASS → read PostgreSQL → (if Redis is up) populate the cache
   ↓
Response sent to the browser (with a real cache-status header)
   ↓
Metric quietly persisted to PostgreSQL (after the response, never blocking it)
   ↓
Dashboard polls and shows the real, current numbers
   ↓
A write invalidates exactly the cache entries it needs to, then publishes an event
   ↓
The Performance Lab can run the exact same code path many times over,
measure it for real, and prove the cache's actual effect
```

Every step above is backed by real, current source code — see
`docs/TECHNICAL_ARCHITECTURE.md` for the exact files, functions, and Redis
key names behind each one.
