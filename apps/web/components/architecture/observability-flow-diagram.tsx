import { FlowDiagram } from "@/components/diagrams/flow-diagram";

/** docs/architecture.md's Observability pipeline section — request-context.plugin.ts measures every request and fire-and-forgets a RequestMetric insert from Fastify's onResponse hook, which fires after the response has already been sent. */
export function ObservabilityFlowDiagram() {
  return (
    <div className="flex flex-col gap-3">
      <FlowDiagram
        title="Every API request"
        tone="accent"
        steps={[
          { label: "API Request" },
          { label: "request-context plugin" },
          { label: "Measure duration", detail: "process.hrtime.bigint()" },
          { label: "Cache status", detail: "HIT / MISS / BYPASS" },
          { label: "Structured log", detail: "Pino" },
          { label: "RequestMetric", detail: "fire-and-forget insert" },
          { label: "PostgreSQL" },
          { label: "Dashboard" },
        ]}
      />
      <p className="text-xs text-muted">
        Metrics persistence happens{" "}
        <strong className="text-foreground">after the response is sent</strong>{" "}
        (Fastify&apos;s <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">onResponse</code>{" "}
        hook) — it can never add latency the caller experiences, and a
        failed insert is logged and discarded rather than surfaced as an
        error on an already-completed request.
      </p>
    </div>
  );
}
