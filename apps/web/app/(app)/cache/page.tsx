import type { Metadata } from "next";
import { CacheExplorerView } from "@/components/cache/cache-explorer-view";

export const metadata: Metadata = {
  title: "Cache Explorer — CacheForge",
};

export default function CachePage() {
  return <CacheExplorerView />;
}
