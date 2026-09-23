import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DocSection {
  slug: string;
  title: string;
  /** Short, real description of the section — shown under its title in the category nav and in the documentation table's "For" column. */
  description: string;
  /** Path relative to apps/web/content/, populated by scripts/copy-docs.mjs (pre-dev/pre-build) from the real docs/ + README.md at the monorepo root. */
  file: string;
}

/**
 * Real navigation covering the documentation that actually exists —
 * PROJECT_SPEC.md's "docs/" strategy names four files plus the root
 * README; there is no separate API/Testing/Deployment doc to link to,
 * so this list does not invent one (PROJECT_SPEC.md §22, and the
 * instruction not to introduce claims the docs don't support).
 */
export const DOC_SECTIONS: DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Overview & quick start",
    file: "readme.md",
  },
  {
    slug: "architecture",
    title: "Architecture",
    description: "System design",
    file: "docs/architecture.md",
  },
  {
    slug: "caching",
    title: "Caching, Invalidation, Rate Limiting & Pub/Sub",
    description: "Caching strategy",
    file: "docs/caching.md",
  },
  {
    slug: "performance",
    title: "Observability & Benchmark Methodology",
    description: "Metrics & benchmarks",
    file: "docs/performance.md",
  },
  {
    slug: "decisions",
    title: "Decisions (ADR log)",
    description: "Architecture decisions",
    file: "docs/decisions.md",
  },
];

// Statically scoped under this project's own directory (never `..` out
// of it) so Next's output-file tracer can correctly and narrowly trace
// this read instead of falling back to tracing the whole monorepo.
const CONTENT_ROOT = path.join(process.cwd(), "content");

export async function readDocSection(slug: string): Promise<string | null> {
  const section = DOC_SECTIONS.find((entry) => entry.slug === slug);
  if (!section) return null;
  try {
    return await readFile(path.join(CONTENT_ROOT, section.file), "utf-8");
  } catch {
    return null;
  }
}
