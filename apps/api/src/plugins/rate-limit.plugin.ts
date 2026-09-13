import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { TooManyRequestsError } from "../errors.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Applies the Redis-backed fixed-window limiters (built in
 * plugins/redis.plugin.ts) to every `/api/*` route except
 * `/api/health` — monitoring/orchestration traffic against health
 * checks shouldn't be throttled, per PROJECT_SPEC.md §9/§19. Write
 * methods (POST/PUT/PATCH/DELETE) get the stricter of the two limiters.
 */
export const rateLimitPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", async (request, reply) => {
    if (
      !request.url.startsWith("/api/") ||
      request.url.startsWith("/api/health")
    ) {
      return;
    }

    const limiter = WRITE_METHODS.has(request.method)
      ? fastify.writeRateLimiter
      : fastify.readRateLimiter;

    const result = await limiter.consume(request.ip);

    reply.header("x-ratelimit-limit", result.limit);
    reply.header("x-ratelimit-remaining", result.remaining);

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
      );
      reply.header("retry-after", retryAfterSeconds);
      throw new TooManyRequestsError("Rate limit exceeded. Please slow down.");
    }
  });
});
