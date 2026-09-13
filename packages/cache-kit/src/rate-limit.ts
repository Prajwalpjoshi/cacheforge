import type { RedisClientLike } from "./redis-client.js";
import type {
  RateLimiter,
  RateLimiterOptions,
  RateLimitResult,
} from "./types.js";

/**
 * Fixed-window counter: `INCR` a key scoped to the current window, set
 * its expiry on the first increment in that window. Simple, correct,
 * and fully explainable — the known trade-off (up to ~2x burst at a
 * window boundary) is documented in PROJECT_SPEC.md §25 rather than
 * hidden. Works across multiple API instances because the count lives
 * in Redis, not process memory.
 *
 * Fail-open: if Redis is unavailable, `consume` allows the request
 * through rather than locking out all traffic.
 */
export function createRateLimiter(
  redis: RedisClientLike,
  options: RateLimiterOptions,
): RateLimiter {
  const onError = options.onError ?? (() => {});

  return {
    async consume(identifier: string): Promise<RateLimitResult> {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - (now % options.windowSeconds);
      const resetAt = new Date((windowStart + options.windowSeconds) * 1000);
      const key = `${options.keyPrefix}:${identifier}:${windowStart}`;

      try {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, options.windowSeconds);
        }

        return {
          allowed: count <= options.max,
          limit: options.max,
          remaining: Math.max(0, options.max - count),
          resetAt,
        };
      } catch (error) {
        onError(error, { operation: "rate-limit-consume", key });
        return {
          allowed: true,
          limit: options.max,
          remaining: options.max,
          resetAt,
        };
      }
    },
  };
}
