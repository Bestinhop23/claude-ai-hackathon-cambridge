"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";

const Globe = dynamic(() => import("@/components/maps/globe-client"), {
  ssr: false,
});

export function GlobeView({ signals }: { signals: AnalysisResponse["raw"]["geographicSignals"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3D Globe</CardTitle>
        <p className="text-sm text-[var(--muted)]">Regional opportunity and risk markers rendered on a 3D globe.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[520px] min-h-[520px] overflow-hidden rounded-[28px]">
          <Globe signals={signals} />
        </div>
      </CardContent>
    </Card>
  );
}
