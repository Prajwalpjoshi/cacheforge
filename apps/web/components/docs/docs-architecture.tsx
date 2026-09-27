import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemDiagram } from "@/components/diagrams/system-diagram";
import { StatusCallout } from "@/components/architecture/status-callout";
import { BackendLayersDiagram } from "@/components/architecture/backend-layers-diagram";
import { ProductRequestFlowDiagram } from "@/components/architecture/product-request-flow-diagram";
import { RedisResponsibilities } from "@/components/architecture/redis-responsibilities";
import { DataLayerDiagram } from "@/components/architecture/data-layer-diagram";
import { ObservabilityFlowDiagram } from "@/components/architecture/observability-flow-diagram";
import { BenchmarkFlowDiagram } from "@/components/architecture/benchmark-flow-diagram";
import { FrontendArchitectureDiagram } from "@/components/architecture/frontend-architecture-diagram";
import { ContractValidationDiagram } from "@/components/architecture/contract-validation-diagram";
import { EngineeringBoundaries } from "@/components/architecture/engineering-boundaries";
import { WriteInvalidationDiagram } from "@/components/docs/write-invalidation-diagram";
import { MarkdownContent } from "@/components/docs/markdown-content";

/**
 * The visual-first read of docs/architecture.md: diagrams and short
 * explanations first, the full markdown file — unedited, still the
 * source of truth — last. Every fact shown here is drawn from that same
 * file; nothing below invents a component, a number, or a behavior it
 * doesn't already describe.
 */
export function DocsArchitecture({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-6">
      <StatusCallout />

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          How the system fits together
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          A visual tour of the request path, the cache and data layers, and
          the frontend that consumes them — the full prose write-up follows
          below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SystemDiagram animated />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend request flow</CardTitle>
          <CardDescription>
            One-directional layering — routes never touch Prisma or Redis
            directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackendLayersDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens when you request a product?</CardTitle>
          <CardDescription>
            GET /api/products/:id, exactly as implemented in
            product.service.ts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductRequestFlowDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Write &amp; invalidation flow</CardTitle>
          <CardDescription>
            POST / PUT / DELETE /api/products — cache invalidation and the
            pub/sub event only fire after the database mutation commits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WriteInvalidationDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redis responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <RedisResponsibilities />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data layer</CardTitle>
        </CardHeader>
        <CardContent>
          <DataLayerDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observability pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ObservabilityFlowDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Lab</CardTitle>
        </CardHeader>
        <CardContent>
          <BenchmarkFlowDiagram />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frontend architecture</CardTitle>
        </CardHeader>
        <CardContent>
          <FrontendArchitectureDiagram />
        </CardContent>
      </Card>

      <ContractValidationDiagram />

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Key engineering boundaries
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Rules the codebase enforces, not just documents.
        </p>
        <div className="mt-4">
          <EngineeringBoundaries />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Detailed documentation
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          The full write-up this page&apos;s diagrams are drawn from — the
          source of truth for anything not visualized above.
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
