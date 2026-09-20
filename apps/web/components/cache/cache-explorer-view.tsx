"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCacheKeys,
  useCacheStats,
  useDeleteCacheKey,
} from "@/lib/hooks/use-cache";
import { useHealth } from "@/lib/hooks/use-health";
import { getErrorMessage } from "@/lib/api/error-message";
import { CacheStatsPanel } from "./cache-stats-panel";
import { CacheKeyTable } from "./cache-key-table";

const REDIS_UNAVAILABLE_MESSAGE =
  "Redis is unreachable. The rest of the API keeps working from PostgreSQL while this is degraded.";

/**
 * GET /api/cache/stats degrades to a *valid-looking* 200 with all-zero
 * counters when Redis is down (cache-kit's own getStats() fails open),
 * unlike GET /api/cache/keys, which genuinely errors. Zeroes and "no
 * traffic yet" are visually identical, so this page cross-checks the
 * one endpoint that tells the truth unconditionally — GET /api/health
 * — rather than trusting each cache endpoint's own success/failure to
 * mean what it looks like it means.
 */
export function CacheExplorerView() {
  const [pattern, setPattern] = useState("");
  const appliedPattern = pattern.trim() || undefined;

  const healthQuery = useHealth();
  const statsQuery = useCacheStats();
  const keysQuery = useCacheKeys(appliedPattern);
  const deleteMutation = useDeleteCacheKey();

  const redisDown = healthQuery.data?.data.redis === "down";

  const [openKey, setOpenKey] = useState<string | null>(null);

  const allKeys = keysQuery.data?.pages.flatMap((page) => page.data.keys) ?? [];

  function handleDelete(key: string) {
    deleteMutation.mutate(key, {
      onSuccess: () => setOpenKey(null),
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Cache Explorer
        </h1>
        <p className="text-sm text-muted">
          Inspect live Redis keys in the{" "}
          <code className="font-mono text-xs">cacheforge:</code> namespace and
          manually expire one to observe the next read become a MISS.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cache stats</CardTitle>
        </CardHeader>
        <CardContent>
          {statsQuery.isPending || healthQuery.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : statsQuery.isError || redisDown ? (
            <ErrorState
              title="Redis unavailable"
              message={
                statsQuery.isError
                  ? getErrorMessage(statsQuery.error)
                  : REDIS_UNAVAILABLE_MESSAGE
              }
              onRetry={() => {
                void statsQuery.refetch();
                void healthQuery.refetch();
              }}
            />
          ) : (
            <CacheStatsPanel stats={statsQuery.data.data} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
          <CardDescription>
            Only keys within the{" "}
            <code className="font-mono text-xs">cacheforge:</code> namespace are
            ever listed or deletable.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pattern">Pattern filter</Label>
              <Input
                id="pattern"
                placeholder="cacheforge:product:*"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {keysQuery.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : keysQuery.isError ? (
            <ErrorState
              title="Redis unavailable"
              message={
                getErrorMessage(keysQuery.error) || REDIS_UNAVAILABLE_MESSAGE
              }
              onRetry={() => void keysQuery.refetch()}
            />
          ) : (
            <>
              <CacheKeyTable
                keys={allKeys}
                onDelete={handleDelete}
                deletingKey={
                  deleteMutation.isPending
                    ? (deleteMutation.variables ?? null)
                    : null
                }
                openKey={openKey}
                onOpenKeyChange={setOpenKey}
                deleteError={
                  deleteMutation.isError
                    ? getErrorMessage(deleteMutation.error)
                    : null
                }
              />
              {keysQuery.hasNextPage && (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={keysQuery.isFetchingNextPage}
                    onClick={() => void keysQuery.fetchNextPage()}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
