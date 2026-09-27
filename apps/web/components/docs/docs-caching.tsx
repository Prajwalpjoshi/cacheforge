import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RedisResponsibilities } from "@/components/architecture/redis-responsibilities";
import { WithCacheAsideDiagram } from "@/components/diagrams/cache-aside-comparison";
import { WriteInvalidationDiagram } from "@/components/docs/write-invalidation-diagram";
import { RateLimitDiagram } from "@/components/docs/rate-limit-diagram";
import { ResilienceDiagram } from "@/components/docs/resilience-diagram";
import { TechnicalDetails } from "@/components/docs/technical-details";
import { MarkdownContent } from "@/components/docs/markdown-content";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeCacheStatus } from "@/lib/status";

/**
 * A progressive read of docs/caching.md, following the same pattern as
 * DocsArchitecture: plain-English explanation and diagrams first — reusing
 * the same primitives already built for the Getting Started visual guide
 * and /architecture — then the full unedited markdown file as the source
 * of truth. Every fact (keys, TTLs, behavior) is drawn from
 * docs/caching.md; nothing here invents one.
 */
export function DocsCaching({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Why Redis?</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          CacheForge uses Redis for fast repeated reads, request rate
          limiting, event publishing, and graceful operation when Redis is
          unavailable. PostgreSQL stays the source of truth — Redis is a
          pure performance layer the API is always correct without, only
          slower.
        </p>
      </div>

      <Card>
        <CardContent>
          <RedisResponsibilities />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Cache-aside flow
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Every product read checks Redis first — a hit returns immediately
          with no database call, a miss reads PostgreSQL and repopulates the
          cache.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GET /api/products/:id</CardTitle>
        </CardHeader>
        <CardContent>
          <WithCacheAsideDiagram />
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-status-neutral/20 bg-status-neutral/5 px-3 py-2.5">
            <StatusBadge descriptor={describeCacheStatus("BYPASS")} />
            <p className="text-xs text-muted">
              Redis unavailable — the request continues through PostgreSQL
              directly instead of failing.
            </p>
          </div>
          <TechnicalDetails>
            <p>
              Single product:{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cacheforge:product:{"{id}"}
              </code>
              , TTL 60s. Paginated/filtered lists:{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                cacheforge:products:list:*
              </code>
              , TTL 30s, invalidated together via a tracked tag set rather
              than guessing which list keys a write affects — never the
              blocking{" "}
              <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-[11px] text-foreground">
                KEYS
              </code>{" "}
              command.
            </p>
          </TechnicalDetails>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Write &amp; invalidation</CardTitle>
          <CardDescription>
            POST / PUT / DELETE /api/products — invalidation and the pub/sub
            event only fire after the database mutation commits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WriteInvalidationDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate limiting</CardTitle>
        </CardHeader>
        <CardContent>
          <RateLimitDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resilience — Redis failure</CardTitle>
        </CardHeader>
        <CardContent>
          <ResilienceDiagram />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Full source-of-truth documentation
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Every fact above comes from this file — including the full cache
          key table, pub/sub message shapes, and cache administration
          endpoints.
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
