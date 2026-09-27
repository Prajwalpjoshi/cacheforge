import { CheckCircle2, CircleSlash, RefreshCw } from "lucide-react";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";

/** docs/caching.md's fail-open behavior — verified against the real Docker Redis container, not mocked. Redis is optional infrastructure; PostgreSQL is not. */
export function ResilienceDiagram() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-status-hit/20 bg-status-hit/5 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2
              aria-hidden="true"
              className="size-4 shrink-0 text-status-hit"
            />
            <p className="text-sm font-semibold text-foreground">
              Redis available
            </p>
          </div>
          <FlowDiagram
            title="Normal path"
            tone="accent"
            steps={[
              { label: "Request" },
              { label: "Cache-aside path" },
              { label: "Redis" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-status-down/20 bg-status-down/5 p-4">
          <div className="flex items-center gap-2">
            <CircleSlash
              aria-hidden="true"
              className="size-4 shrink-0 text-status-down"
            />
            <p className="text-sm font-semibold text-foreground">
              Redis unavailable
            </p>
          </div>
          <FlowDiagram
            title="Failure path"
            steps={[
              { label: "Request" },
              { label: "BYPASS", detail: "cacheStatus: BYPASS" },
              { label: "PostgreSQL" },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5">
        <RefreshCw aria-hidden="true" className="size-4 shrink-0 text-accent" />
        <p className="text-xs text-muted">
          <strong className="text-foreground">Recovery is automatic</strong> —
          the next request after Redis comes back already shows{" "}
          <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
            redis: &quot;up&quot;
          </code>{" "}
          again, with cache-aside resuming (MISS then HIT).
        </p>
      </div>

      <p className="text-xs text-muted">
        Rate limiting also fails open (allows the request) rather than
        blocking all traffic when Redis is down. The one deliberate
        exception:{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          CACHE_ONLY
        </code>
        /
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          COMPARISON
        </code>{" "}
        benchmarks return 503 rather than silently run a degraded benchmark.
      </p>
    </div>
  );
}
