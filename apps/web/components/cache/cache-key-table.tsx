import { Trash2 } from "lucide-react";
import type { CacheKeyInfo } from "@cacheforge/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

function formatTtl(ttlSeconds: number | null): string {
  if (ttlSeconds === null) return "no expiry";
  if (ttlSeconds < 60) return `${ttlSeconds}s`;
  return `${Math.floor(ttlSeconds / 60)}m ${ttlSeconds % 60}s`;
}

export function CacheKeyTable({
  keys,
  onDelete,
  deletingKey,
  openKey,
  onOpenKeyChange,
  deleteError,
}: {
  keys: CacheKeyInfo[];
  onDelete: (key: string) => void;
  deletingKey: string | null;
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
  deleteError: string | null;
}) {
  if (keys.length === 0) {
    return (
      <EmptyState
        title="No cache entries"
        description="Trigger a product read from the API Explorer or Dashboard to populate the cache, then come back here."
      />
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>TTL</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.map((key) => (
            <TableRow key={key.key}>
              <TableCell className="font-mono text-xs">{key.key}</TableCell>
              <TableCell className="font-mono text-xs text-muted">
                {key.type}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatTtl(key.ttlSeconds)}
              </TableCell>
              <TableCell>
                <ConfirmDialog
                  title="Delete this cache key?"
                  description={`This immediately removes "${key.key}" from Redis. The next read for the underlying data will be a cache MISS.`}
                  confirmLabel="Delete key"
                  loading={deletingKey === key.key}
                  onConfirm={() => onDelete(key.key)}
                  open={openKey === key.key}
                  onOpenChange={(open) =>
                    onOpenKeyChange(open ? key.key : null)
                  }
                  error={openKey === key.key ? deleteError : null}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete key ${key.key}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
