import type { FastifyReply, FastifyRequest } from "fastify";

export async function healthController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { statusCode, body } = await request.server.healthService.getHealth();
  reply.status(statusCode).send(body);
}
