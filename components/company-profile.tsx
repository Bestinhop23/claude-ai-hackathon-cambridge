"use client";

import { StockLogo } from "@/components/stock-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CompanyProfile({
  profile,
}: {
  profile: {
    symbol: string;
    name: string;
    logoUrl: string | null;
    sector: string;
    industry: string;
    country: string;
    website: string | null;
    description: string;
    metrics: Array<{ label: string; value: string }>;
    peers: string[];
    recommendations: Array<{ period: string; buy: number; hold: number; sell: number; strongBuy: number; strongSell: number }>;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <StockLogo name={profile.name} logoUrl={profile.logoUrl} />
          <div>
            <CardTitle>{profile.name}</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">{profile.sector} • {profile.industry} • {profile.country}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-7">{profile.description}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {profile.metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-white/55 p-4">
              <p className="text-sm text-[var(--muted)]">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white/55 p-4">
          <p className="text-sm font-medium">Peers</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{profile.peers.join(", ")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
