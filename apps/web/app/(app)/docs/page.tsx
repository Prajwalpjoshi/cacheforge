import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { DOC_SECTIONS, readDocSection } from "@/lib/docs";
import { DocsExplorer } from "@/components/docs/docs-explorer";
import { DocsGettingStarted } from "@/components/docs/docs-getting-started";
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
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-4 sm:p-6">
      <DocsExplorer sections={DOC_SECTIONS} activeSlug={activeSlug} />

      {content === null ? (
        <Card>
          <CardContent>
            <ErrorState
              title="Documentation unavailable"
              message="This section's markdown file could not be read from the repository."
            />
          </CardContent>
        </Card>
      ) : activeSlug === "getting-started" ? (
        <DocsGettingStarted />
      ) : (
        <Card>
          <CardContent>
            <MarkdownContent content={content} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
