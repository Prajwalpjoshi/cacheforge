import Link from "next/link";
import { DOC_SECTIONS } from "@/lib/docs";
import { cn } from "@/lib/utils";

export function DocsNav({ activeSlug }: { activeSlug: string }) {
  return (
    <nav aria-label="Documentation sections" className="flex flex-col gap-0.5">
      {DOC_SECTIONS.map((section) => (
        <Link
          key={section.slug}
          href={`/docs?doc=${section.slug}`}
          aria-current={section.slug === activeSlug ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-sm transition-colors",
            section.slug === activeSlug
              ? "bg-accent/10 text-accent"
              : "text-muted hover:bg-surface-raised hover:text-foreground",
          )}
        >
          {section.title}
        </Link>
      ))}
    </nav>
  );
}
