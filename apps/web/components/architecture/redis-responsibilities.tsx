import { Database, RefreshCw, Timer, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CARDS: {
  title: string;
  icon: LucideIcon;
  items: string[];
}[] = [
  {
    title: "Cache",
    icon: Database,
    items: ["cache-aside reads", "product/list keys", "TTL: 60s / 30s"],
  },
  {
    title: "Rate Limiting",
    icon: Timer,
    items: ["fixed-window counter", "read/write limits", "Redis-backed"],
  },
  {
    title: "Pub/Sub",
    icon: Radio,
    items: ["product write events", "cacheforge:events channel"],
  },
  {
    title: "Resilience",
    icon: RefreshCw,
    items: ["fail-open on Redis outage", "BYPASS behavior", "auto recovery"],
  },
];

/** docs/caching.md and docs/architecture.md's four cache-kit responsibilities — one Redis connection, decorated onto Fastify as cache/readRateLimiter/writeRateLimiter/pubsub. */
export function RedisResponsibilities() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.title}
          className="flex flex-col gap-2 rounded-lg border border-status-down/20 bg-status-down/5 p-4"
        >
          <div className="flex items-center gap-2">
            <card.icon
              aria-hidden="true"
              className="size-4 shrink-0 text-status-down"
            />
            <p className="text-sm font-semibold text-foreground">
              {card.title}
            </p>
          </div>
          <ul className="flex flex-col gap-1 text-xs leading-5 text-muted">
            {card.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
