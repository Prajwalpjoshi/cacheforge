#!/usr/bin/env node
// Copies the monorepo's real README.md/docs/*.md into apps/web/content/
// before dev/build, so lib/docs.ts can read them from a path that is
// statically scoped under this project's own directory (Next's output
// file tracer cannot safely narrow a read that reaches outside the
// project root via `..` — see next.config.ts and docs/decisions.md).
// The copy is generated, git-ignored, and never hand-edited, so the
// real docs/ directory remains the single source of truth.

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");
const CONTENT_DIR = path.join(APP_ROOT, "content");

async function main() {
  await rm(CONTENT_DIR, { recursive: true, force: true });
  await mkdir(path.join(CONTENT_DIR, "docs"), { recursive: true });

  await cp(
    path.join(REPO_ROOT, "README.md"),
    path.join(CONTENT_DIR, "readme.md"),
  );

  const docsDir = path.join(REPO_ROOT, "docs");
  const entries = await readdir(docsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    await cp(path.join(docsDir, entry), path.join(CONTENT_DIR, "docs", entry));
  }

  console.log(
    `[copy-docs] copied README.md + ${entries.length} docs/*.md into apps/web/content/`,
  );
}

await main();
