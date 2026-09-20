const POINTS = [
  "DB_ONLY calls the product repository directly, bypassing Redis entirely — every iteration is a real PostgreSQL query.",
  "CACHE_ONLY calls the real cache-aside service path (the same code GET /api/products/:id and GET /api/products use), explicitly invalidating the target first so iteration 1 is a genuine cache miss.",
  "COMPARISON runs DB_ONLY immediately followed by CACHE_ONLY against the same target, then computes improvement percentages from those two real result sets.",
  "Latency is measured with process.hrtime.bigint() immediately around the repository/service call — never Date.now(), and never including the outer HTTP request's own overhead.",
  "Throughput is iterations divided by total wall-clock time for the whole run (including concurrency), not derived from averaging individual latencies.",
  "Percentiles use the nearest-rank method (index = ceil(p/100 * n) - 1) — always an actual observed sample, never interpolated.",
  "A run measures service/data-access performance, not browser or network latency — it executes entirely inside the API process.",
  "Results depend on this machine, its current load, and the size of the product catalog — a local, reproducible measurement, not a universal production guarantee.",
];

export function Methodology() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        How the numbers above are actually produced — see{" "}
        <code className="font-mono text-xs">docs/performance.md</code> for the
        full write-up.
      </p>
      <ul className="space-y-2">
        {POINTS.map((point) => (
          <li key={point} className="flex gap-2 text-sm text-muted">
            <span aria-hidden="true" className="text-accent">
              →
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
