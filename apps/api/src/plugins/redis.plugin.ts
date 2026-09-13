import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  createCache,
  createPubSub,
  createRateLimiter,
  createRedisClient,
  type CacheErrorHandler,
} from "@cacheforge/cache-kit";
import {
  CACHE_STATS_KEY_PREFIX,
  RATE_LIMIT_KEY_PREFIX,
} from "../cache/keys.js";

/**
 * Owns the single Redis connection for the process and builds every
 * cache-kit primitive (cache, rate limiters, pub/sub) on top of it —
 * "Fastify -> cache-kit -> Redis", never raw Redis commands scattered
 * through routes (PROJECT_SPEC.md §16).
 *
 * Redis is optional at runtime (fail-open, PROJECT_SPEC.md §9): a
 * failed or dropped connection is logged and reflected in /api/health;
 * every cache-kit primitive here degrades gracefully rather than
 * throwing back at the caller.
 */
export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const client = createRedisClient(fastify.config.REDIS_URL);

  client.on("error", (error) => {
    fastify.log.warn({ err: error }, "redis client error");
  });

  try {
    await client.connect();
  } catch (error) {
    fastify.log.warn({ err: error }, "failed to connect to redis at startup");
  }

  const onError: CacheErrorHandler = (error, context) => {
    fastify.log.warn(
      { err: error, ...context },
      "redis operation failed; failing open",
    );
  };

  fastify.decorate("redis", client);
  fastify.decorate(
    "cache",
    createCache(client, { onError, statsKeyPrefix: CACHE_STATS_KEY_PREFIX }),
  );
  fastify.decorate(
    "readRateLimiter",
    createRateLimiter(client, {
      windowSeconds: fastify.config.RATE_LIMIT_WINDOW_SECONDS,
      max: fastify.config.RATE_LIMIT_MAX,
      keyPrefix: RATE_LIMIT_KEY_PREFIX.READ,
      onError,
    }),
  );
  fastify.decorate(
    "writeRateLimiter",
    createRateLimiter(client, {
      windowSeconds: fastify.config.RATE_LIMIT_WINDOW_SECONDS,
      max: fastify.config.RATE_LIMIT_WRITE_MAX,
      keyPrefix: RATE_LIMIT_KEY_PREFIX.WRITE,
      onError,
    }),
  );
  fastify.decorate("pubsub", createPubSub(client, { onError }));

  fastify.addHook("onClose", async () => {
    if (client.isOpen) {
      await client.quit();
    }
  });
});
