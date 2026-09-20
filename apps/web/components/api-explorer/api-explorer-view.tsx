"use client";

import { useState } from "react";
import { ENDPOINTS } from "@/lib/api-explorer/catalog";
import { Card, CardContent } from "@/components/ui/card";
import { EndpointList } from "./endpoint-list";
import { TryItPanel } from "./try-it-panel";

export function ApiExplorerView() {
  const [selectedId, setSelectedId] = useState(ENDPOINTS[0].id);
  const endpoint = ENDPOINTS.find((e) => e.id === selectedId) ?? ENDPOINTS[0];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">API Explorer</h1>
        <p className="text-sm text-muted">
          Every request below goes to this instance&apos;s real API — nothing
          here is simulated.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardContent className="p-3">
            <EndpointList selectedId={endpoint.id} onSelect={setSelectedId} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <TryItPanel key={endpoint.id} endpoint={endpoint} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
