import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPubSub } from "../src/pubsub.js";
import {
  createRedisClient,
  type RedisClientLike,
} from "../src/redis-client.js";
import type { PubSubMessage } from "../src/types.js";

const REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
const runId = randomUUID().slice(0, 8);
const channel = (name: string) => `pubsub-test:${runId}:${name}`;

function waitFor<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("createPubSub", () => {
  let redis: RedisClientLike;

  beforeAll(async () => {
    redis = createRedisClient(REDIS_URL);
    await redis.connect();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("delivers a published message to a subscriber", async () => {
    const pubsub = createPubSub(redis);
    const ch = channel("basic");
    const received = waitFor<PubSubMessage<{ id: string }>>();

    const unsubscribe = await pubsub.subscribe<{ id: string }>(
      ch,
      received.resolve,
    );

    await pubsub.publish(ch, {
      type: "product.updated",
      payload: { id: "abc" },
      at: new Date().toISOString(),
    });

    const message = await received.promise;
    expect(message.type).toBe("product.updated");
    expect(message.payload).toEqual({ id: "abc" });

    await unsubscribe();
  });

  it("delivers events for create/update/delete-shaped messages distinctly", async () => {
    const pubsub = createPubSub(redis);
    const ch = channel("lifecycle");
    const events: PubSubMessage<{ id: string }>[] = [];
    const gotThree = waitFor<void>();

    const unsubscribe = await pubsub.subscribe<{ id: string }>(ch, (msg) => {
      events.push(msg);
      if (events.length === 3) gotThree.resolve();
    });

    await pubsub.publish(ch, {
      type: "product.updated",
      payload: { id: "p1" },
      at: new Date().toISOString(),
    });
    await pubsub.publish(ch, {
      type: "product.updated",
      payload: { id: "p1" },
      at: new Date().toISOString(),
    });
    await pubsub.publish(ch, {
      type: "product.deleted",
      payload: { id: "p1" },
      at: new Date().toISOString(),
    });

    await gotThree.promise;
    expect(events.map((e) => e.type)).toEqual([
      "product.updated",
      "product.updated",
      "product.deleted",
    ]);

    await unsubscribe();
  });

  it("publish fails open (never throws) when Redis is unreachable", async () => {
    const brokenClient = createRedisClient("redis://127.0.0.1:1", {
      connectTimeout: 200,
      reconnectStrategy: false,
    });
    await brokenClient.connect().catch(() => {});

    const errors: unknown[] = [];
    const pubsub = createPubSub(brokenClient, {
      onError: (error) => errors.push(error),
    });

    await expect(
      pubsub.publish("whatever", {
        type: "product.updated",
        payload: {},
        at: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();

    expect(errors.length).toBeGreaterThan(0);
  });
});
