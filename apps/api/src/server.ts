import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { loadEnv, type Env } from "./env.js";
import { createLoggerOptions } from "./observability/logger.js";
import { requestContextPlugin } from "./observability/request-context.plugin.js";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { helmetPlugin } from "./plugins/helmet.plugin.js";
import { prismaPlugin } from "./plugins/prisma.plugin.js";
import { redisPlugin } from "./plugins/redis.plugin.js";
import { metricsPlugin } from "./plugins/metrics.plugin.js";
import { rateLimitPlugin } from "./plugins/rate-limit.plugin.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRoutes } from "./routes/health.route.js";
import { productRoutes } from "./routes/product.route.js";
import { cacheAdminRoutes } from "./routes/cache-admin.route.js";
import { metricsRoutes } from "./routes/metrics.route.js";
import { benchmarkRoutes } from "./routes/benchmark.route.js";

/**
 * `envOverrides` exists for tests that need a different rate-limit
 * threshold than production without weakening the production default
 * (PROJECT_SPEC.md §23) — see test/rate-limit.integration.test.ts.
 */
export async function buildServer(
  envOverrides?: Partial<Env>,
): Promise<FastifyInstance> {
  const env: Env = { ...loadEnv(), ...envOverrides };

  const app = Fastify({
    logger: createLoggerOptions(env),
    genReqId: () => randomUUID(),
  });

  app.decorate("config", env);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(requestContextPlugin);
  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(metricsPlugin);
  await app.register(rateLimitPlugin);

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(productRoutes, { prefix: "/api" });
  await app.register(cacheAdminRoutes, { prefix: "/api" });
  await app.register(metricsRoutes, { prefix: "/api" });
  await app.register(benchmarkRoutes, { prefix: "/api" });

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();

  try {
    await app.listen({ port: app.config.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  void start();
}
