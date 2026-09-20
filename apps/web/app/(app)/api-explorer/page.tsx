import type { Metadata } from "next";
import { ApiExplorerView } from "@/components/api-explorer/api-explorer-view";

export const metadata: Metadata = {
  title: "API Explorer — CacheForge",
};

export default function ApiExplorerPage() {
  return <ApiExplorerView />;
}
