import type { Env } from "../env.js";

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}
