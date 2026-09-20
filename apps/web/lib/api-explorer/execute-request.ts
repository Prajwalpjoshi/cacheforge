import { apiUrl } from "@/lib/api/client";
import type { EndpointDefinition } from "./catalog";

export interface ExplorerResult {
  ok: boolean;
  status: number | null;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  /** Measured in the browser around this one fetch call — network + server time as seen by this tab, not the backend's own hrtime measurement (see docs/performance.md for that distinction). */
  latencyMs: number;
  networkError: string | null;
}

const DISPLAYED_HEADERS = [
  "x-cache-status",
  "x-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "retry-after",
  "content-type",
];

export interface ExecuteRequestInput {
  endpoint: EndpointDefinition;
  pathValues: Record<string, string>;
  queryValues: Record<string, string>;
  bodyValues: Record<string, string> | null;
}

function buildPath(
  endpoint: EndpointDefinition,
  pathValues: Record<string, string>,
): string {
  let path = endpoint.path;
  for (const field of endpoint.pathParams) {
    const value = pathValues[field.name] ?? "";
    path = path.replace(`:${field.name}`, encodeURIComponent(value));
  }
  return path;
}

export function coerceBody(
  fields: EndpointDefinition["body"],
  values: Record<string, string>,
): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (raw === undefined || raw === "") continue;
    result[field.name] = field.kind === "number" ? Number(raw) : raw;
  }
  return result;
}

/**
 * Sends a real HTTP request to the real API — this never simulates a
 * response. Unlike lib/api/*.ts, it does not validate the response
 * against a Zod schema and does not throw on a non-2xx status: the
 * whole point of this explorer is to show the caller exactly what the
 * server actually returned, including error bodies.
 */
export async function executeRequest(
  input: ExecuteRequestInput,
): Promise<ExplorerResult> {
  const { endpoint, pathValues, queryValues, bodyValues } = input;
  const path = buildPath(endpoint, pathValues);
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryValues)) {
    if (value !== "") query[key] = value;
  }
  const url = apiUrl(path, query);
  const body = bodyValues ? coerceBody(endpoint.body, bodyValues) : undefined;

  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: endpoint.method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: "",
      headers: {},
      body: null,
      latencyMs: performance.now() - started,
      networkError:
        error instanceof Error
          ? error.message
          : "Could not reach the CacheForge API.",
    };
  }
  const latencyMs = performance.now() - started;

  const headers: Record<string, string> = {};
  for (const name of DISPLAYED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  let responseBody: unknown = null;
  if (response.status !== 204) {
    const text = await response.text();
    try {
      responseBody = text ? JSON.parse(text) : null;
    } catch {
      responseBody = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers,
    body: responseBody,
    latencyMs,
    networkError: null,
  };
}
