import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { DOC_SECTIONS, readDocSection } from "@/lib/docs";
import { DocsNav } from "@/components/docs/docs-nav";
import { MarkdownContent } from "@/components/docs/markdown-content";

export const metadata: Metadata = {
  title: "Documentation — CacheForge",
};

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc } = await searchParams;
  const activeSlug = DOC_SECTIONS.some((section) => section.slug === doc)
    ? (doc as string)
    : DOC_SECTIONS[0].slug;

  const content = await readDocSection(activeSlug);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Documentation</h1>
        <p className="text-sm text-muted">
          Rendered directly from this repository&apos;s own markdown — the same
          files committed under <code className="font-mono text-xs">docs/</code>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardContent className="p-3">
            <DocsNav activeSlug={activeSlug} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {content === null ? (
              <ErrorState
                title="Documentation unavailable"
                message="This section's markdown file could not be read from the repository."
              />
            ) : (
              <MarkdownContent content={content} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
