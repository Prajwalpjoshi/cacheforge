import type { RedisClientLike } from "./redis-client.js";
import type { PubSub, PubSubMessage, PubSubOptions } from "./types.js";

/**
 * Publishing uses the shared client directly (PUBLISH never blocks a
 * connection). Subscribing duplicates the connection, since a Redis
 * connection in subscriber mode can no longer run other commands —
 * this keeps the main client free for cache/rate-limit operations.
 *
 * Fail-open: `publish` never throws. A Redis outage must not turn an
 * otherwise-successful database mutation into a 500.
 */
export function createPubSub(
  redis: RedisClientLike,
  options: PubSubOptions = {},
): PubSub {
  const onError = options.onError ?? (() => {});

  return {
    async publish<T>(
      channel: string,
      message: PubSubMessage<T>,
    ): Promise<void> {
      try {
        await redis.publish(channel, JSON.stringify(message));
      } catch (error) {
        onError(error, { operation: "publish", key: channel });
      }
    },

    async subscribe<T>(
      channel: string,
      handler: (message: PubSubMessage<T>) => void,
    ): Promise<() => Promise<void>> {
      const subscriber = redis.duplicate();
      subscriber.on("error", (error) => {
        onError(error, { operation: "subscribe", key: channel });
      });

      await subscriber.connect();
      await subscriber.subscribe(channel, (raw) => {
        try {
          handler(JSON.parse(raw) as PubSubMessage<T>);
        } catch (error) {
          onError(error, { operation: "subscribe-handler", key: channel });
        }
      });

      return async () => {
        if (subscriber.isOpen) {
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
        }
      };
    },
  };
}
