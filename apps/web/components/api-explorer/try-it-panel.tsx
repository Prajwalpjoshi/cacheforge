"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";
import type { EndpointDefinition } from "@/lib/api-explorer/catalog";
import {
  coerceBody,
  executeRequest,
  type ExplorerResult,
} from "@/lib/api-explorer/execute-request";
import { buildCurlCommand } from "@/lib/api-explorer/build-curl-command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EndpointFieldInputs } from "./endpoint-field-inputs";
import { ResponseViewer } from "./response-viewer";

const METHOD_TONE: Record<
  EndpointDefinition["method"],
  "accent" | "success" | "warning" | "danger"
> = {
  GET: "accent",
  POST: "success",
  PUT: "warning",
  DELETE: "danger",
};

function defaultsFor(
  fields: { name: string; defaultValue?: string }[],
): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue ?? ""]),
  );
}

export function TryItPanel({ endpoint }: { endpoint: EndpointDefinition }) {
  const [pathValues, setPathValues] = useState<Record<string, string>>(() =>
    defaultsFor(endpoint.pathParams),
  );
  const [queryValues, setQueryValues] = useState<Record<string, string>>(() =>
    defaultsFor(endpoint.query),
  );
  const [bodyValues, setBodyValues] = useState<Record<string, string>>(() =>
    defaultsFor(endpoint.body ?? []),
  );
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // The parent renders this component with `key={endpoint.id}`, so
  // switching endpoints remounts it with fresh state rather than
  // needing an effect to reset these values.

  const missingRequired = [...endpoint.pathParams, ...(endpoint.body ?? [])]
    .filter((field) => field.required)
    .some((field) => !(pathValues[field.name] || bodyValues[field.name]));

  async function handleSend() {
    setSending(true);
    try {
      const response = await executeRequest({
        endpoint,
        pathValues,
        queryValues,
        bodyValues: endpoint.body ? bodyValues : null,
      });
      setResult(response);
    } finally {
      setSending(false);
    }
  }

  function handleCopyCurl() {
    const command = buildCurlCommand({
      endpoint,
      pathValues,
      queryValues,
      body: endpoint.body ? coerceBody(endpoint.body, bodyValues) : undefined,
    });
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={METHOD_TONE[endpoint.method]}>{endpoint.method}</Badge>
        <span className="font-mono text-sm text-foreground">
          {endpoint.path}
        </span>
      </div>
      <p className="text-sm text-muted">{endpoint.description}</p>

      {endpoint.pathParams.length > 0 && (
        <EndpointFieldInputs
          fields={endpoint.pathParams}
          values={pathValues}
          onChange={(name, value) =>
            setPathValues((prev) => ({ ...prev, [name]: value }))
          }
        />
      )}
      {endpoint.query.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Query parameters
          </p>
          <EndpointFieldInputs
            fields={endpoint.query}
            values={queryValues}
            onChange={(name, value) =>
              setQueryValues((prev) => ({ ...prev, [name]: value }))
            }
          />
        </div>
      )}
      {endpoint.body && endpoint.body.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Body
          </p>
          <EndpointFieldInputs
            fields={endpoint.body}
            values={bodyValues}
            onChange={(name, value) =>
              setBodyValues((prev) => ({ ...prev, [name]: value }))
            }
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void handleSend()}
          loading={sending}
          disabled={missingRequired}
        >
          <Send className="size-3.5" aria-hidden="true" />
          Send
        </Button>
        <Button variant="secondary" onClick={handleCopyCurl}>
          <Copy className="size-3.5" aria-hidden="true" />
          {copied ? "Copied" : "Copy as curl"}
        </Button>
      </div>

      {result && (
        <div className="border-t border-border pt-4">
          <ResponseViewer result={result} />
        </div>
      )}
    </div>
  );
}
