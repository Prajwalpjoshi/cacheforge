import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface DocSection {
  slug: string;
  title: string;
  /** Path relative to the monorepo root (two levels above apps/web). */
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
  { slug: "getting-started", title: "Getting Started", file: "README.md" },
  { slug: "architecture", title: "Architecture", file: "docs/architecture.md" },
  {
    slug: "caching",
    title: "Caching, Invalidation, Rate Limiting & Pub/Sub",
    file: "docs/caching.md",
  },
  {
    slug: "performance",
    title: "Observability & Benchmark Methodology",
    file: "docs/performance.md",
  },
  {
    slug: "decisions",
    title: "Decisions (ADR log)",
    file: "docs/decisions.md",
  },
];

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export async function readDocSection(slug: string): Promise<string | null> {
  const section = DOC_SECTIONS.find((entry) => entry.slug === slug);
  if (!section) return null;
  try {
    return await readFile(path.join(REPO_ROOT, section.file), "utf-8");
  } catch {
    return null;
  }
}
