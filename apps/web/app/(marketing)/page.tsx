import Link from "next/link";
import {
  Activity,
  ArrowRightLeft,
  Gauge,
  Radio,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowDiagram } from "@/components/marketing/flow-diagram";
import { PerformancePreview } from "@/components/marketing/performance-preview";

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

const CAPABILITIES = [
  {
    icon: ArrowRightLeft,
    title: "Cache-aside",
    body: "Reads check Redis first, fall through to PostgreSQL on a miss, and repopulate the cache — 60s TTL for single products, 30s for list queries.",
  },
  {
    icon: Activity,
    title: "Metrics",
    body: "Every request persists a RequestMetric row; /api/metrics/summary aggregates P50/P95/P99, error rate, and cache hit rate in SQL.",
  },
  {
    icon: Gauge,
    title: "Benchmarking",
    body: "The Performance Lab runs DB-only, cache-only, and side-by-side comparisons in-process, with nearest-rank percentiles and real throughput.",
  },
  {
    icon: ShieldAlert,
    title: "Rate limiting",
    body: "A Redis-backed fixed-window limiter protects write endpoints and the benchmark runner itself, returning 429 with Retry-After.",
  },
  {
    icon: Radio,
    title: "Pub/Sub",
    body: "Product writes publish domain events on a single Redis channel — the same mechanism a real event-driven cache layer would use.",
  },
  {
    icon: Timer,
    title: "Resilience",
    body: "If Redis becomes unreachable, reads fail open to PostgreSQL and /api/health reports degraded — the API never goes down with it.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-6 py-16 sm:py-20">
      <section className="flex flex-col gap-6">
        <p className="font-mono text-sm text-accent">
          Observe. Cache. Measure. Optimize.
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          CacheForge
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          A production-style API performance lab for understanding database
          latency, Redis caching, and measurable performance improvements —
          against a real PostgreSQL database and a real Redis instance, not a
          simulation.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/architecture">Explore Architecture</Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Repeated database access is the tax you don&apos;t see
          </h2>
          <p className="text-sm leading-6 text-muted">
            A read-heavy API that hits PostgreSQL for every request pays that
            latency on every request — even when the underlying data barely
            changes. CacheForge models this with a small product catalog and
            makes both the cost and the fix visible and measurable.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <FlowDiagram
            title="Without caching"
            steps={[
              { label: "Client" },
              { label: "API" },
              { label: "PostgreSQL" },
            ]}
          />
          <FlowDiagram
            title="With cache-aside"
            tone="accent"
            steps={[
              { label: "Client" },
              { label: "API" },
              { label: "Redis" },
              { label: "PostgreSQL", detail: "on cache miss" },
            ]}
          />
        </div>
      </section>

      <section
        aria-label="How CacheForge is built"
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

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-foreground">
          What&apos;s actually implemented
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
            >
              <capability.icon
                aria-hidden="true"
                className="size-5 text-accent"
              />
              <h3 className="text-sm font-semibold text-foreground">
                {capability.title}
              </h3>
              <p className="text-sm leading-6 text-muted">{capability.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          Real, measured performance
        </h2>
        <PerformancePreview />
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-foreground">Architecture</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Next.js talks only to the Fastify API; the API is the only thing that
          talks to PostgreSQL and Redis. Routes stay thin, services hold the
          cache-aside and benchmark logic, and repositories are the only layer
          that touches Prisma.
        </p>
        <div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/architecture">View full architecture</Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col items-start gap-4 border-t border-border pt-10">
        <h2 className="text-xl font-semibold text-foreground">
          See it running against real data
        </h2>
        <Button asChild size="lg">
          <Link href="/dashboard">Open Dashboard</Link>
        </Button>
      </section>
    </div>
  );
}
