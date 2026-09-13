const PILLARS = [
  {
    title: "Observe",
    body: "Every request is measured — method, route, status, latency, and whether it was served from Postgres or Redis.",
  },
  {
    title: "Cache",
    body: "A cache-aside layer in front of PostgreSQL, with TTLs, tag-based invalidation, and an explorable key namespace.",
  },
  {
    title: "Measure",
    body: "A Performance Lab runs real, in-process benchmarks and reports P50/P95/P99 and throughput — no fabricated numbers.",
  },
  {
    title: "Optimize",
    body: "Rate limiting, pub/sub, and graceful degradation when Redis is unavailable, all observable from the dashboard.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-20">
      <section className="flex flex-col gap-6">
        <p className="font-mono text-sm text-accent">Phase 1 — Foundation</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          CacheForge
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Observe. Cache. Measure. Optimize.
        </p>
        <p className="max-w-2xl text-base leading-7 text-muted">
          A production-style API performance and Redis caching platform,
          built to make the cost of not caching visible — and the mechanics
          of caching correctly explorable, with real measurements against a
          real PostgreSQL database and a real Redis instance.
        </p>
      </section>

      <section
        aria-label="What CacheForge demonstrates"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2"
      >
        {PILLARS.map((pillar) => (
          <div
            key={pillar.title}
            className="rounded-lg border border-border bg-surface p-6"
          >
            <h2 className="font-mono text-sm font-semibold text-accent">
              {pillar.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{pillar.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        <p>
          This is the foundation build. The dashboard, Performance Lab, Cache
          Explorer, API Explorer, System Health, Architecture, and
          Documentation pages are not implemented yet — see{" "}
          <code className="font-mono text-xs">PROJECT_SPEC.md</code> for the
          full plan and current phase status.
        </p>
      </section>
    </div>
  );
}
