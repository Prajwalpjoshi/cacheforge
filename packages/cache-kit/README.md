# @cacheforge/cache-kit

A small, framework-agnostic Redis caching toolkit: cache-aside helpers, a
rate limiter, and pub/sub helpers — built so it can be adopted in any
Node.js project, not just CacheForge.

## Status

**Implemented.** All four factories are built, unit-tested, and wired
into `apps/api` (see `apps/api/src/plugins/redis.plugin.ts`):

```ts
createRedisClient(url, socketOptions?)
  // wraps node-redis's createClient() with disableOfflineQueue: true —
  // required for every fail-open catch block below to actually work;
  // see "Design principles".

createCache(redisClient, { statsKeyPrefix?, onError? })
  → {
      get(key), set(key, value, ttlSeconds, { tags? }), delete(key), exists(key),
      getOrSet(key, ttlSeconds, fetcher, { tags? }) → { value, status: "hit"|"miss"|"bypass" },
      invalidateTag(tag),   // SMEMBERS tag → DEL members → DEL tag
      getStats(),           // real Redis-backed hit/miss counters + hitRate
    }

createRateLimiter(redisClient, { windowSeconds, max, keyPrefix, onError? })
  → { consume(identifier) → { allowed, limit, remaining, resetAt } }
  // fixed-window: INCR a windowStart-scoped key, EXPIRE on first increment

createPubSub(redisClient, { onError? })
  → {
      publish(channel, message),          // fail-open, never throws
      subscribe(channel, handler),        // duplicates the connection; returns an unsubscribe fn
    }
```

Every factory takes its Redis client as an explicit argument — see
"Design principles" below for why.

## Design principles

- **No hidden global state.** Every function takes its dependencies
  (a `node-redis` client instance) explicitly, so multiple independent
  cache/limiter/pub-sub instances never interfere with each other — this
  is also what makes each primitive trivial to unit test in isolation.
- **No framework coupling.** This package never imports Fastify, Next.js,
  React, or Prisma — it only depends on a Redis client passed in by the
  caller. It has no concept of "CacheForge" at all: key naming
  (`cacheforge:...`), TTL values, and event payload shapes are decided
  entirely by the consuming application (in this repo, `apps/api/src/cache/keys.ts`
  and `apps/api/src/events.ts`), not by this package.
- **Fail-open by construction.** Every Redis operation exposed here
  (`get`/`set`/`delete`/`exists`/`getOrSet`/`invalidateTag`, the rate
  limiter's `consume`, pub/sub's `publish`) is wrapped so a Redis error or
  outage degrades to "treat this as absent/allowed" and reports the
  failure via the optional `onError` callback, rather than throwing back
  at the caller. The one thing this package does _not_ catch is the
  `fetcher` callback passed to `getOrSet` — if your own data-fetching
  logic throws (e.g. a "not found" error), that propagates untouched.
- **`disableOfflineQueue: true` is non-negotiable.** `createRedisClient`
  always passes this to node-redis. Without it, a command issued while
  disconnected would _queue_ and hang waiting for reconnection instead of
  rejecting immediately — which would silently defeat every fail-open
  `try/catch` above. This was discovered by manually stopping a real Redis
  container mid-request during CacheForge's own development, not by an
  automated test — see the consuming project's `docs/decisions.md` for
  the full story.
- **Reusable outside CacheForge.** The package is structured
  (`package.json` `exports`, `files`, semver-ready) so it could be
  published independently once there's a reason to. It is not currently
  published to any registry.

## Usage (within this monorepo)

```ts
import {
  createRedisClient,
  createCache,
  createRateLimiter,
  createPubSub,
} from "@cacheforge/cache-kit";

const client = createRedisClient(process.env.REDIS_URL!, {
  connectTimeout: 5000,
});
await client.connect();

const cache = createCache(client, { statsKeyPrefix: "myapp:stats" });
const limiter = createRateLimiter(client, {
  windowSeconds: 60,
  max: 100,
  keyPrefix: "myapp:ratelimit",
});
const pubsub = createPubSub(client);
```

See `apps/api/src/plugins/redis.plugin.ts` in this monorepo for exactly
how CacheForge itself wires these up, and `apps/api/src/services/product.service.ts`
for how `getOrSet`/`invalidateTag` are used to implement cache-aside for a
real domain.

## Testing

```bash
pnpm --filter @cacheforge/cache-kit test
```

4 test files, 26 tests. Note that `cache.test.ts`, `pubsub.test.ts`, and
`rate-limit.test.ts` connect to a real Redis instance
(`TEST_REDIS_URL`, default `redis://localhost:6379`) — start one first
(e.g. `docker compose up -d redis` from the repo root). Only
`fail-open.test.ts` is a fully hermetic unit test.
