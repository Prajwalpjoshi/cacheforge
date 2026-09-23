"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Database,
  FileText,
  Layers,
  LineChart,
  ScrollText,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DocSection } from "@/lib/docs";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "getting-started": FileText,
  architecture: Layers,
  caching: Database,
  performance: LineChart,
  decisions: ScrollText,
};

export function DocsExplorer({
  sections,
  activeSlug,
}: {
  sections: DocSection[];
  activeSlug: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sections;
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(normalized) ||
        section.description.toLowerCase().includes(normalized),
    );
  }, [sections, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Documentation
          </h1>
          <p className="text-sm text-muted">
            Rendered directly from this repository&apos;s own markdown — the
            same files committed under{" "}
            <code className="font-mono text-xs">docs/</code>.
          </p>
        </div>

        <div className="relative w-full shrink-0 sm:w-72">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documentation..."
            aria-label="Search documentation categories"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <nav
        aria-label="Documentation sections"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {filteredSections.map((section) => {
          const Icon = SECTION_ICONS[section.slug] ?? FileText;
          const isActive = section.slug === activeSlug;
          return (
            <Link
              key={section.slug}
              href={`/docs?doc=${section.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-4 transition-colors",
                isActive
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-surface hover:border-accent/30 hover:bg-surface-raised",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "bg-surface-raised text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isActive ? "text-accent" : "text-foreground",
                )}
              >
                {section.title}
              </span>
              <span className="text-xs leading-5 text-muted">
                {section.description}
              </span>
            </Link>
          );
        })}
        {filteredSections.length === 0 && (
          <p className="col-span-full py-2 text-sm text-muted">
            No documentation sections match &ldquo;{query}&rdquo;.
          </p>
        )}
      </nav>
    </div>
  );
}
