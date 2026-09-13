# Caching

> Status: **Implemented.** Cache-aside for Product reads, tag-based
> list invalidation, Redis-backed rate limiting, and pub/sub product
> events are all real and running, built on `packages/cache-kit`. This
> file documents what actually exists; PROJECT_SPEC.md §9 remains the
> original design intent (they now agree).

## Why cache-aside?

Postgres is the source of truth; Redis is a pure performance layer that
the API is always correct without. Cache-aside (check Redis → on miss,
read Postgres and populate Redis → return) keeps that invariant true by
construction: there is no path where Redis holds data Postgres doesn't
also have, and no path where the API can only be served by Redis. The
alternative (write-through) would make every write pay a Redis round
trip and would need its own invalidation-on-read-miss logic anyway —
cache-aside is simpler and matches the read-heavy product-catalog
workload this project models.

## Why Redis?

It's the workload this project exists to demonstrate — an in-process
cache (e.g. an LRU map) can't be invalidated correctly across multiple
API instances, can't back a rate limiter that's meaningful under
horizontal scaling, and can't drive pub/sub at all. Redis gives all
three (cache, rate limiter, pub/sub) from one piece of infrastructure.

## Cache key design

| Key                                                       | Purpose                                    | Type                    | TTL                             | Invalidation                                 |
| --------------------------------------------------------- | ------------------------------------------ | ----------------------- | ------------------------------- | -------------------------------------------- |
| `cacheforge:product:{id}`                                 | Single product                             | String (JSON)           | 60s                             | `DEL` on that product's update/delete        |
| `cacheforge:products:list:{sha1(page,pageSize,category)}` | One paginated/filtered product list        | String (JSON)           | 30s                             | Deleted via the tag set on any product write |
| `cacheforge:products:list:keys`                           | Tag set tracking active list-cache keys    | Set                     | none (cleared with its members) | Cleared together with the keys it tracks     |
| `cacheforge:ratelimit:read:{ip}:{windowStart}`            | Fixed-window counter, read routes          | String (`INCR`)         | window length (60s default)     | Natural TTL expiry                           |
| `cacheforge:ratelimit:write:{ip}:{windowStart}`           | Fixed-window counter, write routes         | String (`INCR`)         | window length (60s default)     | Natural TTL expiry                           |
| `cacheforge:stats:hits` / `cacheforge:stats:misses`       | Real, Redis-backed cache hit/miss counters | String (`INCR`)         | none                            | Never (cumulative)                           |
| `cacheforge:events`                                       | Pub/sub channel for product write events   | Pub/Sub (not persisted) | n/a                             | n/a                                          |

Every key lives under the `cacheforge:` namespace, which is what lets
the Cache Explorer/admin endpoints safely `SCAN MATCH cacheforge:*`
without any risk of touching a key belonging to another application
sharing the same Redis instance.

**List key hashing is deterministic, not a raw string concatenation.**
`apps/api/src/cache/keys.ts`'s `productListKey()` builds a plain object
with a _fixed key order_ (`page`, `pageSize`, `category`), `JSON.stringify`s
it, and SHA-1 hashes the result. Because the object's shape and key
order never vary, two logically-equivalent queries always produce
byte-identical JSON and therefore the same key; two different queries
(even ones that look similar as raw query strings) hash to different
keys. This is verified in `test/product-cache.integration.test.ts`.

## Why 60s / 30s TTLs?

These are exactly the values PROJECT_SPEC.md §9 specifies, not
independently chosen: 60s for a single product (relatively stable,
individually addressed), 30s for list queries (change more often in
relative terms — any create/update/delete anywhere in that category
affects a list result — and are cheap to recompute).

## Why tag-based invalidation, not `KEYS`?

`KEYS`/pattern-scanning is `O(n)` over the entire keyspace and blocks
the Redis event loop while it runs — unacceptable on a write path that
runs on every product mutation. Instead, every list-cache `set()` also
registers its own key in a Redis **set** (`SADD cacheforge:products:list:keys
{key}`); invalidation does `SMEMBERS` that set, `DEL`s every member,
then `DEL`s the set itself. This is `packages/cache-kit`'s `cache.ts`:
`set(key, value, ttl, { tags })` does the `SADD`, `invalidateTag(tag)`
does the `SMEMBERS`/`DEL`/`DEL`. The only place `SCAN` appears anywhere
in this codebase is the read-only `GET /api/cache/keys` admin endpoint,
and it is cursor-based (non-blocking) — grep-checked, there is no
`KEYS` call anywhere in the API or `cache-kit`.

## Why fail-open?

Redis is optional infrastructure; Postgres is not. Every Redis
operation in `cache-kit` (`get`/`set`/`delete`/`exists`/`getOrSet`/
`invalidateTag`, the rate limiter's `consume`, pub/sub's `publish`) is
wrapped so an unreachable or erroring Redis **degrades to "go to the
source"** rather than throwing back at the caller:

- **Reads** fall through to Postgres and the response is tagged
  `cacheStatus: BYPASS` (distinct from a normal `MISS` — a `MISS` means
  Redis was reachable and simply didn't have the value yet; `BYPASS`
  means Redis wasn't consulted at all because it was unreachable).
- **Writes** still commit to Postgres; the invalidation/pub-sub calls
  that follow are themselves fail-open, so a Redis outage during a
  write is logged, never turned into a 500.
- **Rate limiting** fails open (allows the request) rather than
  locking out all traffic when Redis is down — a deliberate
  availability-over-throttling trade-off, documented as a known
  limitation in PROJECT_SPEC.md §25 (not appropriate for a real
  abuse-exposed production API without a fallback limiter).
- **`/api/health`** is the one place Redis's state is never hidden: it
  actively pings Redis and reports `redis: "down"` /
  `status: "degraded"` independently of whether the rest of the API is
  functioning.

This was verified against the actual Docker Redis container, not
mocked: `docker compose stop redis` while the API was running, then
confirmed `GET /api/products/:id` returned 200 with
`x-cache-status: BYPASS`, `POST /api/products` still returned 201,
`GET /api/health` returned `{"status":"degraded","redis":"down"}`, and
`GET /api/cache/stats` degraded gracefully instead of erroring.
`docker compose start redis` afterward, and the very next request
already showed `redis: "up"` again with cache-aside resuming (`MISS`
then `HIT` on the next two reads).

### One real gotcha this uncovered

node-redis's default behavior is to **queue** commands issued while
disconnected and wait for reconnection, rather than rejecting them —
which would have silently defeated every fail-open catch block above
(a command sent during an outage would hang until Redis came back,
not throw). `cache-kit`'s `createRedisClient()` passes
`disableOfflineQueue: true` specifically so a command issued while not
connected rejects immediately instead. This was caught by the manual
Redis-outage test above, not by an automated test — the fix and how it
was found are in `docs/decisions.md`.

## Why Redis-backed rate limiting instead of process memory?

An in-memory counter is per-process: with more than one API instance
behind a load balancer, each instance would enforce its own limit
independently, making the effective limit `N × configured limit` and
meaningless as a control. A fixed-window counter in Redis
(`INCR cacheforge:ratelimit:{read|write}:{ip}:{windowStart}`, `EXPIRE`
set on the first increment in that window) is shared state, so the
limit means the same thing regardless of how many API instances are
running. Fixed-window (over sliding-window/token-bucket) is the
simplest scheme that's still correct and fully explainable; its one
known trade-off (up to ~2x burst exactly at a window boundary) is
documented in PROJECT_SPEC.md §25 rather than hidden.

`/api/health` is explicitly excluded from rate limiting (monitoring/
orchestration traffic shouldn't be throttled); every other `/api/*`
route is covered, with write methods (`POST`/`PUT`/`PATCH`/`DELETE`)
subject to a stricter limit than reads. Thresholds are configuration
(`RATE_LIMIT_MAX`, `RATE_LIMIT_WRITE_MAX`, `RATE_LIMIT_WINDOW_SECONDS`),
not hard-coded — PROJECT_SPEC.md specifies the algorithm, not exact
numbers, so the shipped defaults (300 reads / 60 writes per 60s) are a
reasonable placeholder, not a spec requirement.

## Pub/Sub

A single channel, `cacheforge:events`, carries JSON messages
`{ type, payload, at }`. Per PROJECT_SPEC.md §10, both create and
update publish `"product.updated"` (there's no separate
`"product.created"` type); delete publishes `"product.deleted"`;
`"cache.invalidated"` is reserved for the admin `DELETE /api/cache/:key`
endpoint, not product writes (those already imply invalidation via
their own event type). Publishing only ever happens _after_ the
database mutation has committed — a rejected write (400/404/409) never
publishes anything, verified in
`test/product-events.integration.test.ts`. Publishing itself is
fail-open (never throws); subscribing duplicates the Redis connection
(`client.duplicate()`), since a connection in subscriber mode can't run
other commands — the shared client stays free for cache/rate-limit
operations.

## Cache statistics

Hit/miss counters (`cacheforge:stats:hits` / `cacheforge:stats:misses`)
are real Redis `INCR`s performed on every `getOrSet` call, not
in-memory or fabricated — deliberately Redis-backed rather than
process-local so the numbers stay meaningful if the API is ever run as
more than one instance (the trade-off called out by PROJECT_SPEC.md
§11: prefer state that survives horizontal scaling where practical).
`GET /api/cache/stats` combines these with a real `Redis INFO` subset
(`used_memory_human`, `connected_clients`, `uptime_in_seconds`) — see
`apps/api/src/services/cache-admin.service.ts`.

## Cache administration endpoints

`GET /api/cache/keys` (cursor-based `SCAN`, never `KEYS`),
`GET /api/cache/stats`, and `DELETE /api/cache/:key` are the only ways
to inspect or touch Redis from the API. All three are restricted to the
`cacheforge:` namespace — `DELETE /api/cache/:key` and a supplied
`pattern` query param both reject (400) anything outside it — so the
Cache Explorer these endpoints will eventually back can never become a
general Redis console. Neither `REDIS_URL` nor any credential is ever
returned by any endpoint or logged.
