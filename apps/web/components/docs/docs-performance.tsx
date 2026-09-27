import type { ReactNode } from "react";
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
 * A progressive read of docs/performance.md, following the same pattern as
 * DocsArchitecture and DocsCaching: plain-English explanation and diagrams
 * first — reusing BenchmarkFlowDiagram and ObservabilityFlowDiagram
 * (already built for /architecture) — then a concise summary in place of
 * the full raw markdown file. Every fact, including the one real benchmark
 * run, is drawn from docs/performance.md; nothing here invents a number.
 */
export function DocsPerformance() {
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
                  <TableCell>Min</TableCell>
                  <TableCell>1.91 ms</TableCell>
                  <TableCell>1.30 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Average</TableCell>
                  <TableCell>2.54 ms</TableCell>
                  <TableCell>1.69 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P50</TableCell>
                  <TableCell>2.50 ms</TableCell>
                  <TableCell>1.43 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P95</TableCell>
                  <TableCell>3.49 ms</TableCell>
                  <TableCell>2.19 ms</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>P99</TableCell>
                  <TableCell>3.49 ms</TableCell>
                  <TableCell>6.72 ms</TableCell>
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
          A concise summary of every benchmark concept — the diagrams and
          measured results above are the deep reference.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SourceSection
          title="Definition"
          items={[
            <>
              Measures{" "}
              <strong className="text-foreground">
                database vs cache performance
              </strong>
              .
            </>,
            <>Uses the real API service/repository code.</>,
          ]}
        />

        <SourceSection
          title="What is Measured?"
          items={[
            <>
              Measures <strong className="text-foreground">latency</strong>{" "}
              and <strong className="text-foreground">throughput</strong>.
            </>,
            <>Runs inside the API process.</>,
          ]}
        />

        <SourceSection
          title="DB_ONLY"
          items={[
            <>
              Reads data directly from{" "}
              <strong className="text-foreground">PostgreSQL</strong>.
            </>,
            <>Does not use Redis cache.</>,
          ]}
        />

        <SourceSection
          title="CACHE_ONLY"
          items={[
            <>
              Reads data using the{" "}
              <strong className="text-foreground">Redis cache</strong>.
            </>,
            <>
              First request is a <strong className="text-foreground">MISS</strong>,
              later requests are <strong className="text-foreground">HITs</strong>.
            </>,
          ]}
        />

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Main Difference</TableHeaderCell>
                    <TableHeaderCell>DB_ONLY</TableHeaderCell>
                    <TableHeaderCell>CACHE_ONLY</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Data source</TableCell>
                    <TableCell>PostgreSQL</TableCell>
                    <TableCell>Redis cache</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Uses cache</TableCell>
                    <TableCell>No</TableCell>
                    <TableCell>Yes</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Request pattern</TableCell>
                    <TableCell>Always reads PostgreSQL directly</TableCell>
                    <TableCell>First request MISS, later requests HIT</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Compares</TableCell>
                    <TableCell colSpan={2}>Latency and throughput</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <SourceSection
          title="Percentiles"
          items={[
            <>
              Measures{" "}
              <strong className="text-foreground">P50, P95, and P99</strong>{" "}
              latency.
            </>,
            <>Uses the actual recorded latency values.</>,
          ]}
        />

        <SourceSection
          title="Throughput"
          items={[
            <>
              Measures how many{" "}
              <strong className="text-foreground">
                requests per second (req/s)
              </strong>{" "}
              can be processed.
            </>,
          ]}
        />

        <SourceSection
          title="Concurrency"
          items={[
            <>Controls how many requests run at the same time.</>,
            <>
              Maximum concurrency is{" "}
              <strong className="text-foreground">20</strong>.
            </>,
          ]}
        />

        <SourceSection
          title="Benchmark Isolation"
          items={[
            <>
              Benchmarks only{" "}
              <strong className="text-foreground">read data</strong>.
            </>,
            <>It does not create, update, or delete products.</>,
          ]}
        />

        <SourceSection
          title="Persistence"
          items={[
            <>
              Completed benchmark results are saved in{" "}
              <strong className="text-foreground">PostgreSQL</strong>.
            </>,
            <>Failed benchmarks are not saved.</>,
          ]}
        />

        <SourceSection
          className="md:col-span-2"
          title="Real Measured Result"
          items={[
            <>
              DB average: <strong className="text-foreground">2.54 ms</strong>
            </>,
            <>
              Cache average:{" "}
              <strong className="text-foreground">1.69 ms</strong>
            </>,
            <>
              DB throughput:{" "}
              <strong className="text-foreground">393 req/s</strong>
            </>,
            <>
              Cache throughput:{" "}
              <strong className="text-foreground">589 req/s</strong>
            </>,
            <>
              Cache hit rate:{" "}
              <strong className="text-foreground">96.7%</strong>
            </>,
          ]}
        />

        <SourceSection
          className="md:col-span-2"
          title="Limitation"
          items={[
            <>
              Results depend on the{" "}
              <strong className="text-foreground">
                machine, Docker resources, database size, and test
                configuration
              </strong>
              .
            </>,
            <>
              These results are{" "}
              <strong className="text-foreground">local measurements</strong>,
              not production guarantees.
            </>,
          ]}
        />
      </div>
    </div>
  );
}

/** One card in the Performance tab's concise closing summary, replacing what used to be the full raw markdown file. */
function SourceSection({
  title,
  items,
  className,
}: {
  title: ReactNode;
  items: ReactNode[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
