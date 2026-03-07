"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";

function statusColor(status: "opportunity" | "watch" | "risk") {
  if (status === "opportunity") return "fill-emerald-600";
  if (status === "risk") return "fill-rose-600";
  return "fill-amber-500";
}

export function WorldOpportunityMap({ signals }: { signals: AnalysisResponse["raw"]["geographicSignals"] }) {
  const [activeRegion, setActiveRegion] = useState(signals[0]?.region);
  const active = useMemo(
    () => signals.find((signal) => signal.region === activeRegion) ?? signals[0],
    [activeRegion, signals],
  );

  return (
    <Card className="grid-span-12 grid-span-6">
      <CardHeader>
        <CardTitle>Global Opportunity Map</CardTitle>
        <p className="text-sm text-[var(--muted)]">
          Geographic view of what is happening, where the opportunity sits, and which stocks are most exposed.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[28px] border border-[var(--border)] bg-[#f8f4eb] p-4">
          <svg viewBox="0 0 100 60" className="h-auto w-full">
            <path d="M6 19c8-7 16-10 24-10 5 0 10 1 16 3 5 1 9 1 15-1 5-2 9-4 14-4 9 0 17 5 22 12 2 3 4 7 4 11 0 6-6 10-13 10-9 0-15-4-24-4-5 0-10 1-16 3-6 2-11 4-17 4-8 0-15-4-19-10-3-4-5-9-6-14 0-1 0-3 0-4z" fill="rgba(20,59,45,0.08)" />
            {signals.map((signal) => (
              <g key={signal.region} onClick={() => setActiveRegion(signal.region)} className="cursor-pointer">
                <circle
                  cx={signal.x}
                  cy={signal.y}
                  r={active?.region === signal.region ? 3.6 : 2.8}
                  className={`${statusColor(signal.status)} transition-all`}
                />
                <circle
                  cx={signal.x}
                  cy={signal.y}
                  r={active?.region === signal.region ? 6.8 : 5.2}
                  fill="none"
                  stroke="rgba(20,59,45,0.18)"
                  strokeWidth="0.6"
                />
              </g>
            ))}
          </svg>
        </div>
        {active ? (
          <div className="rounded-[28px] border border-[var(--border)] bg-white/55 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{active.region}</p>
                <p className="text-sm text-[var(--muted)]">{active.label}</p>
              </div>
              <Badge variant={active.status === "opportunity" ? "success" : active.status === "risk" ? "danger" : "warning"}>
                {active.status}
              </Badge>
            </div>
            <p className="mb-4 text-sm leading-6">{active.summary}</p>
            <p className="mb-2 text-sm leading-6 text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Opportunities:</strong> {active.opportunities.join(", ")}
            </p>
            <p className="mb-2 text-sm leading-6 text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Affected stocks:</strong> {active.affectedStocks.join(", ")}
            </p>
            <p className="text-sm leading-6 text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Expected effect:</strong> {active.expectedEffect}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
