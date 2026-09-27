import { BranchDiagram } from "@/components/diagrams/branch-diagram";

/** docs/caching.md's fixed-window rate limiter — a shared Redis counter (not per-process memory), so the limit means the same thing regardless of how many API instances are running. */
export function RateLimitDiagram() {
  return (
    <div className="flex flex-col gap-3">
      <BranchDiagram
        entry="Request → /api/*"
        question="Redis fixed-window counter within limit?"
        outcomes={[
          {
            label: "Yes — within limit",
            tone: "success",
            steps: ["INCR counter", "Request forwarded to API"],
          },
          {
            label: "No — limit exceeded",
            tone: "neutral",
            steps: ["429 Too Many Requests", "Retry-After header"],
          },
        ]}
      />
      <p className="text-xs text-muted">
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          /api/health
        </code>{" "}
        is excluded; write methods (POST/PUT/PATCH/DELETE) get a stricter
        limit than reads. Thresholds are configuration
        (
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          RATE_LIMIT_MAX
        </code>
        /
        <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
          RATE_LIMIT_WRITE_MAX
        </code>
        ) — the shipped defaults are 300 reads / 60 writes per 60s window,
        not a hard requirement.
      </p>
    </div>
  );
}
