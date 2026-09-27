import { ArrowDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeCacheStatus } from "@/lib/status";

const OUTCOMES: {
  status: "HIT" | "MISS" | "BYPASS";
  steps: string[];
}[] = [
  {
    status: "HIT",
    steps: ["Redis has the key", "Return cached value"],
  },
  {
    status: "MISS",
    steps: [
      "Redis reachable, key absent",
      "Query PostgreSQL",
      "SET Redis (TTL 60s)",
      "Return value",
    ],
  },
  {
    status: "BYPASS",
    steps: [
      "Redis unreachable",
      "Query PostgreSQL directly",
      "Return value (not cached)",
    ],
  },
];

/** docs/architecture.md's product.service.ts cache-aside read — cache.getOrSet(...) falls through to the repository "only on a real miss or a Redis bypass," so HIT/MISS/BYPASS are the three outcomes of one Redis check, exactly as the API's own x-cache-status header models them (lib/status.ts's describeCacheStatus). */
export function ProductRequestFlowDiagram() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm font-semibold text-foreground">
        GET /api/products/:id
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-sm font-semibold text-accent">
        Product Service — cache.getOrSet(...)
      </div>
      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {OUTCOMES.map((outcome) => (
          <div
            key={outcome.status}
            className="flex flex-col items-center gap-2"
          >
            <StatusBadge descriptor={describeCacheStatus(outcome.status)} />
            <div className="flex flex-col items-center gap-1">
              {outcome.steps.map((step, index) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <div className="rounded-md border border-border bg-surface px-3 py-1.5 text-center font-mono text-xs text-foreground">
                    {step}
                  </div>
                  {index < outcome.steps.length - 1 && (
                    <ArrowDown
                      aria-hidden="true"
                      className="size-3 text-muted-foreground"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ArrowDown aria-hidden="true" className="size-4 text-muted-foreground" />
      <div className="rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm font-semibold text-foreground">
        HTTP Response — x-cache-status header
      </div>
    </div>
  );
}
