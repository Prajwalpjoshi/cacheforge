import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createRedisClient } from "../types/redis-client.js";

/**
 * Phase 2 scope: a raw connectivity ping for /api/health only. The real
 * cache-aside/rate-limit/pub-sub usage of this client (via cache-kit)
 * lands in the next phase — see PROJECT_SPEC.md §9/§21.
 *
 * Redis is optional at runtime (fail-open, PROJECT_SPEC.md §9): a
 * failed or dropped connection is logged and reflected in /api/health,
 * never thrown back at the caller or used to crash startup.
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

  fastify.decorate("redis", client);

  fastify.addHook("onClose", async () => {
    if (client.isOpen) {
      await client.quit();
    }
  });
});
