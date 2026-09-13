import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PubSubMessage } from "@cacheforge/cache-kit";
import { buildServer } from "../src/server.js";
import { EVENTS_CHANNEL } from "../src/cache/keys.js";
import type { ProductEventPayload } from "../src/events.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `events-test-${runId}-`;
const nextSku = (() => {
  let n = 0;
  return () => `${skuPrefix}${n++}`;
})();

function waitForMessages(
  count: number,
  timeoutMs = 3000,
): {
  received: PubSubMessage<ProductEventPayload>[];
  onMessage: (message: PubSubMessage<ProductEventPayload>) => void;
  done: Promise<void>;
} {
  const received: PubSubMessage<ProductEventPayload>[] = [];
  let resolveDone!: () => void;
  let rejectDone!: (error: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const timer = setTimeout(() => {
    rejectDone(
      new Error(
        `Timed out waiting for ${count} message(s); received ${received.length}`,
      ),
    );
  }, timeoutMs);

  return {
    received,
    onMessage: (message) => {
      received.push(message);
      if (received.length >= count) {
        clearTimeout(timer);
        resolveDone();
      }
    },
    done,
  };
}

describe("Product pub/sub events", () => {
  let app: FastifyInstance;
  let unsubscribe: () => Promise<void>;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.prisma.product.deleteMany({
      where: { sku: { startsWith: skuPrefix } },
    });
    await app.close();
  });

  it("publishes product.updated on create", async () => {
    const waiter = waitForMessages(1);
    unsubscribe = await app.pubsub.subscribe<ProductEventPayload>(
      EVENTS_CHANNEL,
      waiter.onMessage,
    );

    const sku = nextSku();
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Event Widget", category: "events", price: 5 },
    });
    expect(created.statusCode).toBe(201);

    await waiter.done;
    await unsubscribe();

    expect(waiter.received[0]?.type).toBe("product.updated");
    expect(waiter.received[0]?.payload.sku).toBe(sku);
  });

  it("publishes product.updated on update", async () => {
    const sku = nextSku();
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Event Widget", category: "events", price: 5 },
    });
    const { id } = created.json();

    const waiter = waitForMessages(1);
    unsubscribe = await app.pubsub.subscribe<ProductEventPayload>(
      EVENTS_CHANNEL,
      waiter.onMessage,
    );

    const updated = await app.inject({
      method: "PUT",
      url: `/api/products/${id}`,
      payload: { name: "Renamed Event Widget" },
    });
    expect(updated.statusCode).toBe(200);

    await waiter.done;
    await unsubscribe();

    expect(waiter.received[0]?.type).toBe("product.updated");
    expect(waiter.received[0]?.payload.id).toBe(id);
  });

  it("publishes product.deleted on delete", async () => {
    const sku = nextSku();
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Event Widget", category: "events", price: 5 },
    });
    const { id } = created.json();

    const waiter = waitForMessages(1);
    unsubscribe = await app.pubsub.subscribe<ProductEventPayload>(
      EVENTS_CHANNEL,
      waiter.onMessage,
    );

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/products/${id}`,
    });
    expect(deleted.statusCode).toBe(204);

    await waiter.done;
    await unsubscribe();

    expect(waiter.received[0]?.type).toBe("product.deleted");
    expect(waiter.received[0]?.payload.id).toBe(id);
  });

  it("does not publish an event when the mutation fails validation", async () => {
    const waiter = waitForMessages(1, 800);
    unsubscribe = await app.pubsub.subscribe<ProductEventPayload>(
      EVENTS_CHANNEL,
      waiter.onMessage,
    );

    const invalid = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { name: "No sku or price" },
    });
    expect(invalid.statusCode).toBe(400);

    await expect(waiter.done).rejects.toThrow(/Timed out/);
    await unsubscribe();
    expect(waiter.received).toHaveLength(0);
  });

  it("does not publish an event when the mutation fails with a duplicate sku", async () => {
    const sku = nextSku();
    await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Original", category: "events", price: 5 },
    });

    const waiter = waitForMessages(1, 800);
    unsubscribe = await app.pubsub.subscribe<ProductEventPayload>(
      EVENTS_CHANNEL,
      waiter.onMessage,
    );

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Duplicate", category: "events", price: 5 },
    });
    expect(duplicate.statusCode).toBe(409);

    await expect(waiter.done).rejects.toThrow(/Timed out/);
    await unsubscribe();
    expect(waiter.received).toHaveLength(0);
  });
});
