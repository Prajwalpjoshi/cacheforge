import type { BenchmarkRunSummary } from "@cacheforge/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatClockTime, formatMs, formatThroughput } from "@/lib/format";

export function BenchmarkHistoryTable({
  runs,
  onSelect,
}: {
  runs: BenchmarkRunSummary[];
  onSelect: (id: string) => void;
}) {
  if (runs.length === 0) {
    return (
      <EmptyState
        title="No benchmark runs yet"
        description="Run your first benchmark to compare database and Redis performance."
      />
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Time</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Target</TableHeaderCell>
            <TableHeaderCell>Iterations</TableHeaderCell>
            <TableHeaderCell>Concurrency</TableHeaderCell>
            <TableHeaderCell>Average</TableHeaderCell>
            <TableHeaderCell>P95</TableHeaderCell>
            <TableHeaderCell>Throughput</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="font-mono text-xs text-muted">
                {formatClockTime(run.createdAt)}
              </TableCell>
              <TableCell>
                <Badge tone="accent">{run.mode}</Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {run.targetRoute}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {run.iterations}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {run.concurrency}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatMs(run.avgMs)}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatMs(run.p95Ms)}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatThroughput(run.throughputRps)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelect(run.id)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
