import { createClient } from "redis";

/**
 * Wraps `createClient` so the type used for the Fastify decoration
 * comes from this exact call signature — deriving it independently via
 * `ReturnType<typeof createClient>` picks a different overload (and a
 * different RESP protocol version) than calling it with `{ url }`,
 * which fails to type-check as the same type.
 */
export function createRedisClient(url: string) {
  return createClient({ url });
}

export type RedisClient = ReturnType<typeof createRedisClient>;
