import type { FastifyReply, FastifyRequest } from "fastify";
import type { CacheKeyParams, CacheKeysQuery } from "@cacheforge/contracts";
import { publishCacheInvalidatedEvent } from "../events.js";

const DEFAULT_KEYS_LIMIT = 100;

export async function listCacheKeysController(
  request: FastifyRequest<{ Querystring: CacheKeysQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.cacheAdminService.listKeys(
    request.query.cursor,
    request.query.pattern,
    DEFAULT_KEYS_LIMIT,
  );
  reply.send(result);
}

export async function getCacheStatsController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.cacheAdminService.getStats();
  reply.send(result);
}

export async function deleteCacheKeyController(
  request: FastifyRequest<{ Params: CacheKeyParams }>,
  reply: FastifyReply,
): Promise<void> {
  const deleted = await request.server.cacheAdminService.deleteKey(
    request.params.key,
  );

  if (!deleted) {
    reply.status(404).send({
      statusCode: 404,
      error: "NotFoundError",
      message: `Key "${request.params.key}" not found`,
    });
    return;
  }

  await publishCacheInvalidatedEvent(request.server.pubsub, {
    key: request.params.key,
  });

  reply.status(204).send();
}
