import type { CacheStatsResponse } from "@cacheforge/contracts";
import { StatTile } from "@/components/ui/stat-tile";
import { formatInteger, formatPercent } from "@/lib/format";

export function CacheStatsPanel({ stats }: { stats: CacheStatsResponse }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Hits" value={formatInteger(stats.hits)} />
      <StatTile label="Misses" value={formatInteger(stats.misses)} />
      <StatTile label="Hit rate" value={formatPercent(stats.hitRate)} />
      <StatTile label="Memory used" value={stats.usedMemoryHuman} />
      <StatTile
        label="Connected clients"
        value={formatInteger(stats.connectedClients)}
      />
    </div>
  );
}
