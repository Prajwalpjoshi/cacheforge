import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FlowDiagram } from "@/components/diagrams/flow-diagram";
import { BranchDiagram } from "@/components/diagrams/branch-diagram";
import { SystemDiagram } from "@/components/diagrams/system-diagram";
import { ComponentRoles } from "@/components/architecture/component-roles";

export const metadata: Metadata = {
  title: "Architecture — CacheForge",
};

export default function ArchitecturePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Architecture</h1>
        <p className="text-sm text-muted">
          The actual implementation, not an aspirational diagram — see{" "}
          <Link href="/docs" className="text-accent hover:underline">
            Documentation
          </Link>{" "}
          for the full prose write-up in{" "}
          <code className="font-mono text-xs">docs/</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend request path</CardTitle>
          <CardDescription>
            One-directional layering — routes never touch Prisma or Redis
            directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlowDiagram
            title="Every /api/* request"
            steps={[
              { label: "Route" },
              { label: "Controller" },
              { label: "Service" },
              { label: "Repository" },
              { label: "PostgreSQL" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache-aside read path</CardTitle>
          <CardDescription>
            GET /api/products and GET /api/products/:id, exactly as implemented
            in product.service.ts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BranchDiagram
            entry="GET /api/products/:id"
            question="Redis HIT?"
            outcomes={[
              {
                label: "Yes — HIT",
                tone: "success",
                steps: ["Return cached JSON", "cacheStatus: HIT"],
              },
              {
                label: "No — MISS or BYPASS",
                tone: "neutral",
                steps: [
                  "Query PostgreSQL",
                  "SET cacheforge:product:{id} EX 60",
                  "Return row · cacheStatus: MISS",
                ],
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Write and invalidation path</CardTitle>
          <CardDescription>
            POST/PUT/DELETE /api/products — cache and events only ever fire
            after the database mutation has committed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlowDiagram
            title="Every product write"
            tone="accent"
            steps={[
              { label: "PostgreSQL mutation" },
              {
                label: "Cache invalidation",
                detail: "DEL key + invalidate list tag",
              },
              { label: "Publish event", detail: "cacheforge:events" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Component roles</CardTitle>
        </CardHeader>
        <CardContent>
          <ComponentRoles />
        </CardContent>
      </Card>
    </div>
  );
}
