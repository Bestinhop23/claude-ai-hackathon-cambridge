import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataStatusPanel } from "@/components/data-status-panel";
import type { PortfolioResponse } from "@/lib/schemas/portfolio";

export function PortfolioDashboard({ data }: { data: PortfolioResponse }) {
  return (
    <div className="space-y-6">
      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-8">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-fraunces)] text-3xl">Portfolio Watchlist View</CardTitle>
            <p className="text-sm text-[var(--muted)]">
              Allocation, concentration, macro sensitivity, and the main watch items for the current mix.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total weight" value={`${data.totalWeight.toFixed(1)}%`} />
              <Stat label="Weight gap" value={`${data.weightGap.toFixed(1)}%`} warn={data.weightGap !== 0} />
              <Stat label="Largest sector" value={`${data.sectorExposure[0]?.sector ?? "N/A"} ${data.sectorExposure[0]?.weight.toFixed(1) ?? 0}%`} />
            </div>
            <div className="rounded-[28px] bg-[var(--accent-soft)] p-5 text-[var(--accent)]">{data.portfolioImplications}</div>
          </CardContent>
        </Card>
        <DataStatusPanel status={data.dataStatus} />
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.holdings.map((holding) => (
              <div key={holding.ticker} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{holding.ticker}</p>
                    <p className="text-sm text-[var(--muted)]">{holding.name}</p>
                  </div>
                  <Badge variant="neutral">{holding.weight}%</Badge>
                </div>
                <p className="text-sm text-[var(--muted)]">{holding.sector}</p>
                <p className="mt-2 text-sm leading-6">Macro sensitivity: {holding.macroSensitivity.join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Sector Exposure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sectorExposure.map((sector) => (
              <div key={sector.sector}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>{sector.sector}</span>
                  <span>{sector.weight.toFixed(1)}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/70">
                  <div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(sector.weight, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Top Portfolio Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topRisks.map((risk) => (
              <div key={risk.risk} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{risk.risk}</p>
                  <Badge variant={risk.severity === "high" ? "danger" : "warning"}>{risk.severity}</Badge>
                </div>
                <p className="text-sm leading-6">{risk.whyItMatters}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Top Portfolio Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.topOpportunities.map((item) => (
              <div key={item.assetOrTheme} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{item.assetOrTheme}</p>
                  <Badge variant="success">{item.confidence}</Badge>
                </div>
                <p className="text-sm leading-6">{item.thesis}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">Catalysts: {item.keyCatalysts.join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Watch Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.watchItems.map((item) => (
            <div key={item} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4 text-sm leading-6">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/60 p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${warn ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
}
