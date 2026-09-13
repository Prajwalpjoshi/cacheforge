import type { HealthResponse } from "../schemas/health.schema.js";

/**
 * Phase 1: reports process liveness only. Postgres/Redis readiness
 * checks (and the resulting "degraded"/503 behavior from PROJECT_SPEC.md
 * §10) are added once those dependencies exist, in a later phase.
 */
export function getHealth(): HealthResponse {
  return {
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
  };
}
