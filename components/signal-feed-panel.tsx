"use client";

import { Activity, CloudSun, Newspaper, Plane, Ship, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";

function iconFor(kind: AnalysisResponse["raw"]["signals"][number]["kind"]) {
  switch (kind) {
    case "weather":
      return <CloudSun className="size-4" />;
    case "flight":
      return <Plane className="size-4" />;
    case "shipping":
      return <Ship className="size-4" />;
    case "social":
      return <Users className="size-4" />;
    case "news":
      return <Newspaper className="size-4" />;
    default:
      return <Activity className="size-4" />;
  }
}

export function SignalFeedPanel({ signals }: { signals: AnalysisResponse["raw"]["signals"] }) {
  return (
    <Card className="grid-span-12">
      <CardHeader>
        <CardTitle>Signal Intelligence Feed</CardTitle>
        <p className="text-sm text-[var(--muted)]">
          Open-source and public signal inputs feeding the stock summary and opportunity layers.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {signals.map((signal) => (
          <div key={signal.id} className="rounded-[28px] border border-[var(--border)] bg-white/55 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                {iconFor(signal.kind)}
                <span className="text-sm uppercase tracking-[0.14em]">{signal.kind}</span>
              </div>
              <Badge variant={signal.impactDirection === "positive" ? "success" : signal.impactDirection === "negative" ? "danger" : "neutral"}>
                {signal.impactDirection}
              </Badge>
            </div>
            <p className="font-medium">{signal.title}</p>
            <p className="mt-2 text-sm leading-6">{signal.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span>{signal.source} • {signal.region} • {signal.affectedTickers.join(", ")}</span>
              {signal.sourceUrl ? (
                <a
                  href={signal.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs text-[var(--foreground)] transition hover:bg-[#f8f4eb]"
                >
                  Open source
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
