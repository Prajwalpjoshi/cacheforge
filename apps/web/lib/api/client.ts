import type { ZodType } from "zod";

/**
 * The API's standard error body (see apps/api/src/middleware/error-handler.ts).
 * `details` is only present for Zod validation failures (400).
 */
interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string;
  details?: Array<{ path: string; message: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    status: number,
    options?: { code?: string; details?: ApiErrorBody["details"] },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

/** Thrown when the request never reached the server at all (offline, CORS, DNS, connection refused). */
export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super(
      "Could not reach the CacheForge API. Check that it is running and reachable.",
    );
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) return "http://localhost:4000";
  return configured.replace(/\/+$/, "");
}

export function apiUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return {};
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  status: number;
  headers: Headers;
  latencyMs: number;
}

/**
 * Every browser -> API call goes through here. It never talks to
 * Postgres/Redis directly (PROJECT_SPEC.md §19) — only to the Fastify
 * API at NEXT_PUBLIC_API_URL. Responses are validated against the
 * shared Zod contract from @cacheforge/contracts when one is supplied,
 * so a schema drift between apps/api and apps/web fails loudly in
 * development instead of silently rendering wrong data.
 */
export async function apiRequest<T>(
  path: string,
  schema: ZodType<T> | null,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const url = apiUrl(path, options.query);
  const started = performance.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.body
        ? { "content-type": "application/json" }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    throw new ApiNetworkError(error);
  }

  const latencyMs = performance.now() - started;

  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new ApiError(body.message ?? response.statusText, response.status, {
      code: body.error,
      details: body.details,
    });
  }

  if (response.status === 204 || schema === null) {
    return {
      data: undefined as T,
      status: response.status,
      headers: response.headers,
      latencyMs,
    };
  }

  const json: unknown = await response.json();
  const data = schema.parse(json);
  return {
    data,
    status: response.status,
    headers: response.headers,
    latencyMs,
  };
}
