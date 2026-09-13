import type { PubSub, PubSubMessage } from "@cacheforge/cache-kit";
import { EVENTS_CHANNEL } from "./cache/keys.js";

/**
 * Matches the three message types PROJECT_SPEC.md §9 defines for
 * `cacheforge:events`. Per §10, both create and update publish
 * "product.updated" — there is no separate "product.created" type.
 * "cache.invalidated" is reserved for manual admin key deletion
 * (`DELETE /api/cache/:key`), not product writes, since those already
 * imply invalidation via their own event type.
 */
export type ProductEventType = "product.updated" | "product.deleted";
export type CacheEventType = "cache.invalidated";

export interface ProductEventPayload {
  id: string;
  sku: string;
}

export interface CacheInvalidatedPayload {
  key: string;
}

export async function publishProductEvent(
  pubsub: PubSub,
  type: ProductEventType,
  payload: ProductEventPayload,
): Promise<void> {
  const message: PubSubMessage<ProductEventPayload> = {
    type,
    payload,
    at: new Date().toISOString(),
  };
  await pubsub.publish(EVENTS_CHANNEL, message);
}

export async function publishCacheInvalidatedEvent(
  pubsub: PubSub,
  payload: CacheInvalidatedPayload,
): Promise<void> {
  const message: PubSubMessage<CacheInvalidatedPayload> = {
    type: "cache.invalidated" satisfies CacheEventType,
    payload,
    at: new Date().toISOString(),
  };
  await pubsub.publish(EVENTS_CHANNEL, message);
}
