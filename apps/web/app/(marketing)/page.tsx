import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Gauge,
  Radio,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  WithoutCachingDiagram,
  WithCacheAsideDiagram,
} from "@/components/diagrams/cache-aside-comparison";
import { SystemDiagram } from "@/components/diagrams/system-diagram";

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
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-14 px-6 py-10 sm:py-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
        <div className="flex flex-col gap-5">
          <p className="font-mono text-sm uppercase text-accent">
            Observe. Cache. Measure. Optimize.
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            <span className="text-foreground">Cache</span>
            <span className="text-accent">Forge</span>
          </h1>
          <p className="max-w-[620px] text-base leading-7 text-muted sm:text-lg sm:leading-8">
            A production-style API performance lab for understanding database
            latency, Redis caching, and measurable performance improvements —
            against a real PostgreSQL database and a real Redis instance, not a
            simulation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/architecture">
                Explore Architecture
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="relative mx-auto w-full max-w-xs shrink-0 sm:max-w-sm lg:mx-0 lg:w-auto lg:max-w-none"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-accent/10 blur-3xl" />
          <SystemDiagram compact />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Repeated database access is the tax you don&apos;t see
          </h2>
          <p className="text-sm leading-6 text-muted">
            A read-heavy API that hits PostgreSQL for every request pays that
            latency on every request — even when the underlying data barely
            changes. CacheForge models this with a small product catalog and
            makes both the cost and the fix visible and measurable.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <WithoutCachingDiagram />
          <WithCacheAsideDiagram />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xl font-semibold text-foreground">
          What&apos;s actually implemented
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CAPABILITIES.map((capability) => (
            <div
              key={capability.title}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-sm"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                <capability.icon aria-hidden="true" className="size-4" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {capability.title}
              </h3>
              <p className="text-xs leading-5 text-muted">{capability.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-lg border border-status-hit/20 bg-status-hit/5 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">
            See it running against real data
          </h2>
          <p className="text-sm text-muted">
            Explore the dashboard, run benchmarks, and inspect cache behavior.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard">
            Open Dashboard
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
