import Link from "next/link";
import { ActivitySquare, ArrowRight, Boxes, Database, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { DOC_SECTIONS } from "@/lib/docs";
import { DocsVisualGuide } from "@/components/docs/docs-visual-guide";

const QUICK_START_STEPS = [
  { step: "1", title: "Install", command: "pnpm install" },
  { step: "2", title: "Start services", command: "docker compose up -d" },
  { step: "3", title: "Start the app", command: "pnpm dev" },
  { step: "4", title: "Open the dashboard", command: "http://localhost:3000" },
];

const HERO_HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Real-world example",
    detail: "Product catalog API",
  },
  {
    icon: Database,
    title: "End-to-end system",
    detail: "PostgreSQL + Redis",
  },
  {
    icon: ActivitySquare,
    title: "Measure & optimize",
    detail: "Benchmarks & insights",
  },
];

/**
 * The curated landing view for the "Getting Started" tab — mirrors the
 * real root README.md (tagline, intro paragraph, Status section, and
 * documentation table) as dedicated cards instead of raw markdown, since
 * that section reads as this page's index rather than a long-form doc.
 * Between the hero and the Status card sits DocsVisualGuide, a visual
 * "how it works" tour built from the same diagram primitives used on
 * /architecture. Every other tab still renders its file through
 * MarkdownContent unchanged.
 */
export function DocsGettingStarted() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex flex-col gap-4">
            <Badge tone="accent" className="w-fit">
              DOCS
            </Badge>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                CacheForge
              </h2>
              <p className="mt-1 text-base font-semibold text-muted">
                Observe. Cache. Measure. Optimize.
              </p>
            </div>
            <p className="max-w-[560px] text-sm leading-6 text-muted">
              A production-style API performance and Redis caching platform.
              It models a small product catalog API and uses it to
              demonstrate — with real measurements, not fabricated numbers —
              how a Redis cache-aside layer, rate limiting, and pub/sub
              actually behave in front of PostgreSQL.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <div
                  key={highlight.title}
                  className="flex items-start gap-2.5 rounded-md border border-border bg-surface-raised/60 p-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <highlight.icon aria-hidden="true" className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {highlight.title}
                    </p>
                    <p className="text-xs text-muted">{highlight.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative hidden shrink-0 items-center justify-center lg:flex lg:w-48"
          >
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" />
            <Boxes className="relative size-32 text-accent/40" />
          </div>
        </CardContent>
      </Card>

      <DocsVisualGuide />

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_START_STEPS.map((item) => (
              <div
                key={item.step}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised/40 p-3"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  {item.step}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <code className="w-fit rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                  {item.command}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-status-hit/20 bg-status-hit/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-status-hit/10 text-status-hit">
              <ActivitySquare aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Status
              </h3>
              <p className="text-sm leading-6 text-muted">
                <strong className="text-foreground">
                  Phase 6 — deployment readiness verification.
                </strong>{" "}
                The full stack (Fastify API + Next.js frontend, real
                PostgreSQL/Redis, observability, and the Performance Lab)
                built in Phases 1–5 has been audited for production
                readiness: real production builds, a real{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground">
                  node dist/server.js
                </code>{" "}
                +{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground">
                  next start
                </code>{" "}
                run, environment-variable inventory, a secret scan, and
                Redis/PostgreSQL failure injection against the
                production-mode servers.
              </p>
              <p className="text-sm leading-6 text-muted">
                <strong className="text-foreground">
                  Production deployment complete.
                </strong>{" "}
                The API is deployed on Render, PostgreSQL is Neon, Redis is
                Upstash, and the frontend is deployed on Netlify. The
                production health endpoint is operational and reports both
                PostgreSQL and Redis as up — see{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground">
                  DEPLOYMENT_READINESS.md
                </code>{" "}
                for the pre-deployment checklist and verdict, and{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground">
                  docs/decisions.md
                </code>{" "}
                for what changed and why during this phase.
              </p>
              <p className="text-sm leading-6 text-muted">
                See{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5 font-mono text-xs text-foreground">
                  PROJECT_SPEC.md
                </code>{" "}
                for the complete architecture, API specification, and phased
                implementation plan — it is the single source of truth for
                this project.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground">
            Documentation
          </h3>
          <p className="mt-1 text-sm text-muted">
            Browse the documentation files in this repository.
          </p>
          <TableContainer className="mt-4">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Document</TableHeaderCell>
                  <TableHeaderCell>For</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {DOC_SECTIONS.map((section) => (
                  <TableRow key={section.slug}>
                    <TableCell>
                      <code className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-foreground">
                        {section.file}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted">
                      {section.description}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/docs?doc=${section.slug}`}>
                          Read
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </div>
  );
}
