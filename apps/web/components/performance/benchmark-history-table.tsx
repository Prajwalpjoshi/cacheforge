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
import { formatClockTime, formatMs, formatThroughput } from "@/lib/format";
import { benchmarkModeTone } from "@/lib/benchmark-presentation";

/** Pure presentation — BenchmarkHistoryPanel owns loading/empty/error state and only renders this once `runs` is a non-empty page. */
export function BenchmarkHistoryTable({
  runs,
  onSelect,
}: {
  runs: BenchmarkRunSummary[];
  onSelect: (id: string) => void;
}) {
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
                <Badge tone={benchmarkModeTone(run.mode)}>{run.mode}</Badge>
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
