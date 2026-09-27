import { ActivitySquare, Gauge, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { BenchmarkFlowDiagram } from "@/components/architecture/benchmark-flow-diagram";
import { ObservabilityFlowDiagram } from "@/components/architecture/observability-flow-diagram";
import { Term } from "@/components/architecture/term";
import { TechnicalDetails } from "@/components/docs/technical-details";
import { MarkdownContent } from "@/components/docs/markdown-content";

const METRIC_CARDS: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: LineChart,
    title: "Latency",
    detail: "Response time of the measured operation.",
  },
  {
    icon: Gauge,
    title: "Throughput",
    detail: "Completed operations per second.",
  },
  {
    icon: ActivitySquare,
    title: "Cache Impact",
    detail: "HIT, MISS, and BYPASS behavior.",
  },
];

/**
 * A progressive read of docs/performance.md — reuses BenchmarkFlowDiagram
 * and ObservabilityFlowDiagram (already built for /architecture) and
 * quotes the one real, reproducible benchmark run the file documents. The
 * table below is exactly docs/performance.md's "A real measured run"
 * table; nothing here is a fabricated or rounded-for-effect number.
 */
export function DocsPerformance({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          See how CacheForge measures API performance
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          And proves whether caching actually helps — by measuring the real
          system running this code, never a simulated or hand-typed number.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {METRIC_CARDS.map((metric) => (
          <div
            key={metric.title}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-accent/10 text-accent">
              <metric.icon aria-hidden="true" className="size-4" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              {metric.title}
            </p>
            <p className="text-xs text-muted">{metric.detail}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How performance is measured</CardTitle>
        </CardHeader>
        <CardContent>
          <BenchmarkFlowDiagram />
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <Term word="DB_ONLY" definition="reads directly from PostgreSQL." />
            <Term
              word="CACHE_ONLY"
              definition="uses the same cache-aside service path the real API uses."
            />
            <Term
              word="COMPARISON"
              definition="measures both paths against the same target."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example local benchmark</CardTitle>
          <CardDescription>
            30 iterations, concurrency 1, products.get target — measured on
            local Docker PostgreSQL + Redis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Metric</TableHeaderCell>
                  <TableHeaderCell>DB_ONLY</TableHeaderCell>
                  <TableHeaderCell>CACHE_ONLY</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Average</TableCell>
                  <TableCell>2.54 ms</TableCell>
                  <TableCell>1.69 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P95</TableCell>
                  <TableCell>3.49 ms</TableCell>
                  <TableCell>2.19 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Throughput</TableCell>
                  <TableCell>393 req/s</TableCell>
                  <TableCell>589 req/s</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cache hit rate</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>96.7% (29/30)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <p className="mt-3 text-xs text-muted">
            <strong className="text-foreground">
              ~33% lower average latency · ~37% lower P95 · ~50% higher
              throughput
            </strong>{" "}
            with the cache warm.
          </p>
          <p className="mt-1 text-xs text-muted">
            These measurements come from the local Docker environment and are
            not universal production guarantees.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observability flow</CardTitle>
        </CardHeader>
        <CardContent>
          <ObservabilityFlowDiagram />
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4">
            <Term word="Average" definition="Average measured latency." />
            <Term
              word="P95"
              definition="95% of measured operations are at or below this latency."
            />
            <Term
              word="P99"
              definition="99% of measured operations are at or below this latency."
            />
            <Term word="Throughput" definition="Operations completed per second." />
          </div>
          <TechnicalDetails>
            <p>
              Percentiles use the nearest-rank method — always an actual
              observed sample, never interpolated between two. Concurrency
              defaults to 1 (capped at 20); iterations are capped at 1000,
              both enforced by validation rather than silently clamped.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Full source-of-truth documentation
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Every fact above comes from this file — including exactly how
          throughput, concurrency, and persistence work.
        </p>
      </div>
      <Card>
        <CardContent>
          <MarkdownContent content={content} />
        </CardContent>
      </Card>
    </div>
  );
}
