import { apiUrl } from "@/lib/api/client";
import type { EndpointDefinition } from "./catalog";

export interface BuildCurlInput {
  endpoint: EndpointDefinition;
  pathValues: Record<string, string>;
  queryValues: Record<string, string>;
  body: Record<string, unknown> | undefined;
}

/** Reconstructs the exact request executeRequest() sends, as a copyable curl command — useful for reproducing a call outside the browser. */
export function buildCurlCommand({
  endpoint,
  pathValues,
  queryValues,
  body,
}: BuildCurlInput): string {
  let path = endpoint.path;
  for (const field of endpoint.pathParams) {
    path = path.replace(
      `:${field.name}`,
      encodeURIComponent(pathValues[field.name] ?? ""),
    );
  }

  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryValues)) {
    if (value !== "") query[key] = value;
  }
  const url = apiUrl(path, query);

  const parts = [`curl -X ${endpoint.method}`, `'${url}'`];
  if (body && Object.keys(body).length > 0) {
    parts.push("-H 'content-type: application/json'");
    parts.push(`-d '${JSON.stringify(body)}'`);
  }
  return parts.join(" ");
}
