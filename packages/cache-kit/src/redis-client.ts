import { createClient } from "redis";

export interface RedisClientSocketOptions {
  connectTimeout?: number;
  reconnectStrategy?: false | ((retries: number) => number | Error);
}

/**
 * Wraps `createClient` so the type used everywhere else in this package
 * (and by consumers) comes from this exact call signature — deriving it
 * independently via `ReturnType<typeof createClient>` picks a different
 * overload (and a different RESP protocol version) than calling it with
 * options, which fails to type-check as the same type.
 *
 * `disableOfflineQueue: true` is what actually makes fail-open work:
 * node-redis's default behavior is to *queue* commands issued while
 * disconnected and wait for reconnection, so without this a command
 * sent during an outage hangs until Redis comes back rather than
 * rejecting — which would silently defeat every fail-open catch block
 * in cache.ts/rate-limit.ts/pubsub.ts. With it, a command issued while
 * not connected rejects immediately.
 */
export function createRedisClient(
  url: string,
  socket?: RedisClientSocketOptions,
) {
  return createClient({ url, socket, disableOfflineQueue: true });
}

export type RedisClientLike = ReturnType<typeof createRedisClient>;
