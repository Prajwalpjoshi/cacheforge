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
import { EmptyState } from "@/components/ui/empty-state";
import { formatClockTime, formatMs } from "@/lib/format";
import {
  describeCacheStatus,
  describeDataSource,
  describeHttpStatus,
} from "@/lib/status";

export function RecentRequestsTable({
  requests,
}: {
  requests: RequestMetricDTO[];
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No traffic yet"
        description="Try the API Explorer to generate real requests, then come back here."
      />
    );
  }

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
              <TableCell className="font-mono text-xs">
                {request.route}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {request.method}
              </TableCell>
              <TableCell>
                <StatusBadge
                  descriptor={describeHttpStatus(request.statusCode)}
                />
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatMs(request.durationMs)}
              </TableCell>
              <TableCell>
                <StatusBadge
                  descriptor={describeCacheStatus(request.cacheStatus)}
                />
              </TableCell>
              <TableCell>
                <StatusBadge descriptor={describeDataSource(request.source)} />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted">
                {formatClockTime(request.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
