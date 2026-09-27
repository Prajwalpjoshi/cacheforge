export interface DecisionEntry {
  date: string;
  title: string;
  tag: string;
  context: string;
  decision: string;
  reason: string;
  tradeoff: string;
}

export interface ParsedDecisions {
  intro: string;
  entries: DecisionEntry[];
}

/**
 * A tag is derived from keywords already present in the entry's own text —
 * never invented — purely so a long ADR log is scannable at a glance.
 * Order matters: earlier rules win when an entry's text matches more than
 * one (e.g. an entry about Redis config discovered via a test run should
 * read as "Caching", not "Testing").
 */
const TAG_RULES: [RegExp, string][] = [
  [/pnpm|corepack|packagemanager/i, "Build Tool"],
  [/\.env|environment variable/i, "Configuration"],
  [/vitest|fileparallelism|test isolation|integration test/i, "Testing"],
  [/redis|cache-kit|rate.?limit|pub\/?sub|disableofflinequeue/i, "Caching"],
  [/prisma|postgres|database|migration/i, "Database"],
  [/benchmark|throughput|latenc|percentile/i, "Performance"],
  [/requestmetric|observability|metrics/i, "Observability"],
  [/docs page|documentation|turbopack|tracing/i, "Docs & Build"],
  [
    /next\.js|route group|design token|cache components|create-next-app|api explorer|cache explorer/i,
    "Frontend",
  ],
  [/fastify|plugin|decorate/i, "Backend"],
];

function deriveTag(text: string): string {
  for (const [pattern, tag] of TAG_RULES) {
    if (pattern.test(text)) return tag;
  }
  return "Engineering";
}

type FieldLabel = "Context" | "Decision" | "Reason" | "Trade-off";

function extractFields(body: string) {
  const pattern = /\*\*(Context|Decision|Reason|Trade-off):\*\*/g;
  const hits = [...body.matchAll(pattern)];
  const fields: Record<string, string> = {
    context: "",
    decision: "",
    reason: "",
    tradeoff: "",
  };
  const keyFor: Record<FieldLabel, string> = {
    Context: "context",
    Decision: "decision",
    Reason: "reason",
    "Trade-off": "tradeoff",
  };

  hits.forEach((hit, index) => {
    const label = hit[1] as FieldLabel;
    const contentStart = (hit.index ?? 0) + hit[0].length;
    const contentEnd =
      index + 1 < hits.length ? (hits[index + 1].index ?? body.length) : body.length;
    fields[keyFor[label]] = body.slice(contentStart, contentEnd).trim();
  });

  return fields as {
    context: string;
    decision: string;
    reason: string;
    tradeoff: string;
  };
}

/**
 * Parses docs/decisions.md's ADR-style log (Context / Decision / Reason /
 * Trade-off under each `## YYYY-MM-DD — Title` heading) into structured
 * entries for DecisionCard, so the raw file can still render as the
 * source-of-truth fallback without needing to duplicate its prose here.
 */
export function parseDecisions(markdown: string): ParsedDecisions {
  const headingPattern = /^## (.+)$/gm;
  const matches = [...markdown.matchAll(headingPattern)];

  const introEnd = matches.length > 0 ? (matches[0].index ?? markdown.length) : markdown.length;
  const intro = markdown
    .slice(0, introEnd)
    .replace(/^# .+$/m, "")
    .trim();

  const entries: DecisionEntry[] = matches.map((match, index) => {
    const headingText = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? markdown.length) : markdown.length;
    const body = markdown.slice(start, end).trim();

    const [date, ...titleParts] = headingText.split(" — ");
    const title = titleParts.join(" — ").trim();
    const fields = extractFields(body);

    return {
      date: date.trim(),
      title,
      tag: deriveTag(`${title} ${fields.context} ${fields.reason}`),
      ...fields,
    };
  });

  return { intro, entries };
}
