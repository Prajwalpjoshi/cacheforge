import {
  healthResponseSchema,
  type HealthResponse,
} from "@cacheforge/contracts";
import { apiUrl, ApiNetworkError } from "./client";

export interface HealthCheckResult {
  data: HealthResponse;
  latencyMs: number;
}

/**
 * `/api/health` intentionally responds 503 when Postgres is down (see
 * apps/api/src/services/health.service.ts) — that is still a valid,
 * parseable health reading, not a request failure. So this bypasses
 * apiRequest()'s "non-2xx throws" behavior and treats any JSON body
 * matching the health schema as data, regardless of status code. Only
 * a genuinely unreachable API (network failure, bad JSON) throws.
 */
export async function getHealth(
  signal?: AbortSignal,
): Promise<HealthCheckResult> {
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/health"), { signal });
  } catch (error) {
    throw new ApiNetworkError(error);
  }
  const latencyMs = performance.now() - started;

  const json: unknown = await response.json();
  const data = healthResponseSchema.parse(json);
  return { data, latencyMs };
}
