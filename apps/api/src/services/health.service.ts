import type { HealthResponse } from "../schemas/health.schema.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { RedisClient } from "../types/redis-client.js";

export interface HealthCheckResult {
  statusCode: 200 | 503;
  body: HealthResponse;
}

async function checkPostgres(prisma: PrismaClient): Promise<"up" | "down"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "up";
  } catch {
    return "down";
  }
}

async function checkRedis(redis: RedisClient): Promise<"up" | "down"> {
  try {
    if (!redis.isOpen) {
      return "down";
    }
    await redis.ping();
    return "up";
  } catch {
    return "down";
  }
}

export interface HealthServiceDeps {
  prisma: PrismaClient;
  redis: RedisClient;
}

export function createHealthService(deps: HealthServiceDeps) {
  return {
    async getHealth(): Promise<HealthCheckResult> {
      const [postgres, redis] = await Promise.all([
        checkPostgres(deps.prisma),
        checkRedis(deps.redis),
      ]);

      const uptimeSec = Math.round(process.uptime());

      // Postgres is the source of truth (PROJECT_SPEC.md §5) — its
      // absence is unhealthy, not merely degraded. Redis is a pure
      // performance layer; its absence only degrades the response.
      if (postgres === "down") {
        return {
          statusCode: 503,
          body: { status: "degraded", postgres, redis, uptimeSec },
        };
      }

      return {
        statusCode: 200,
        body: {
          status: redis === "down" ? "degraded" : "ok",
          postgres,
          redis,
          uptimeSec,
        },
      };
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
