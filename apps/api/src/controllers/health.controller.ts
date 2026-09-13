import type { FastifyReply, FastifyRequest } from "fastify";
import { getHealth } from "../services/health.service.js";

export function healthController(
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  reply.send(getHealth());
}
