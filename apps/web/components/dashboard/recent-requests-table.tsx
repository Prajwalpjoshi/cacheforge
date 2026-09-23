import type { RequestMetricDTO } from "@cacheforge/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClockTime, formatMs } from "@/lib/format";
import {
  describeCacheStatus,
  describeDataSource,
  describeHttpStatus,
} from "@/lib/status";

/** Pure presentation — RecentRequestsPanel owns loading/empty/error state and only renders this once `requests` is a non-empty page. */
export function RecentRequestsTable({
  requests,
}: {
  requests: RequestMetricDTO[];
}) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Endpoint</TableHeaderCell>
            <TableHeaderCell>Method</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Latency</TableHeaderCell>
            <TableHeaderCell>Cache</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Time</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="py-2 font-mono text-xs">
                {request.route}
              </TableCell>
              <TableCell className="py-2 font-mono text-xs">
                {request.method}
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge
                  descriptor={describeHttpStatus(request.statusCode)}
                />
              </TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums">
                {formatMs(request.durationMs)}
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge
                  descriptor={describeCacheStatus(request.cacheStatus)}
                />
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge descriptor={describeDataSource(request.source)} />
              </TableCell>
              <TableCell className="py-2 font-mono text-xs text-muted">
                {formatClockTime(request.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
