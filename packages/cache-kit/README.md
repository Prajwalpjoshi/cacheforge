# @cacheforge/cache-kit

A small, framework-agnostic Redis caching toolkit: cache-aside helpers, a
rate limiter, and pub/sub helpers — built so it can be adopted in any
Node.js project, not just CacheForge.

## Status

**Phase 1 (foundation).** The package currently exports only a version
marker. The real API is being built incrementally:

```ts
createCache(redisClient, { defaultTtlSeconds })
  → { getOrSet(key, ttlSeconds, fetcher, tags?), invalidate(key), invalidateTag(tag) }

createRateLimiter(redisClient, { windowSeconds, max })
  → { consume(identifier) → { allowed, remaining, resetAt } }

createPubSub(redisClient)
  → { publish(channel, message), subscribe(channel, handler) }
```

## Design principles

- **No hidden global state.** Every function takes its dependencies
  (a `node-redis` client instance) explicitly, so multiple independent
  cache/limiter/pub-sub instances never interfere with each other.
- **No framework coupling.** This package never imports Fastify, Next.js,
  React, or Prisma — it only depends on a Redis client passed in by the
  caller.
- **Reusable outside CacheForge.** The package is structured
  (`package.json` `exports`, `files`, semver-ready) so it could be
  published independently once there's a reason to; see
  `PROJECT_SPEC.md` §21 for the full strategy.

## Usage (within this monorepo)

```ts
import { CACHE_KIT_VERSION } from "@cacheforge/cache-kit";
```

Once `createCache`/`createRateLimiter`/`createPubSub` land, `apps/api`
will wire them up inside its Redis plugin — see `PROJECT_SPEC.md` §9 and
§14.
