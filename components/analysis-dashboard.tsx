"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataStatusPanel } from "@/components/data-status-panel";
import { Disclaimer } from "@/components/disclaimer";
import { ResearchPanel } from "@/components/research-panel";
import { SignalFeedPanel } from "@/components/signal-feed-panel";
import { StockImpactGrid } from "@/components/stock-impact-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorldOpportunityMap } from "@/components/world-opportunity-map";
import type { AnalysisResponse } from "@/lib/schemas/analysis";
import { formatCompactNumber, formatPercent } from "@/lib/utils";

function severityBadge(value: "low" | "medium" | "high") {
  if (value === "high") return "danger" as const;
  if (value === "medium") return "warning" as const;
  return "success" as const;
}

export function AnalysisDashboard({ data }: { data: AnalysisResponse }) {
  const primaryFundamentals = data.raw.fundamentals[0];
  const priceSeries = data.raw.prices.map((point) => ({
    date: point.date.slice(5),
    asset: point.close,
    benchmark: point.benchmarkClose,
  }));

  return (
    <div className="space-y-6">
      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-8 overflow-hidden">
          <CardHeader className="relative">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Executive Summary</p>
                <CardTitle className="font-[family-name:var(--font-fraunces)] text-3xl leading-tight sm:text-4xl">
                  Clear view on {data.request.query}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={data.brief.confidenceLevel === "high" ? "success" : "warning"}>
                  {data.brief.confidenceLevel} confidence
                </Badge>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 size-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="max-w-4xl text-lg leading-8 text-[var(--foreground)]/88">{data.brief.executiveSummary}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                icon={<TrendingUp className="size-4" />}
                label="1M Trend"
                value={formatPercent(data.derived.priceChange1M)}
                tone={data.derived.priceChange1M >= 0 ? "positive" : "negative"}
              />
              <MetricTile
                icon={data.derived.relativePerformance1M >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                label="Relative vs SPY"
                value={formatPercent(data.derived.relativePerformance1M)}
                tone={data.derived.relativePerformance1M >= 0 ? "positive" : "negative"}
              />
              <MetricTile icon={<Gauge className="size-4" />} label="Volatility" value={`${data.derived.volatilityEstimate.toFixed(1)}%`} tone="neutral" />
              <MetricTile
                icon={<CalendarClock className="size-4" />}
                label="Next Earnings"
                value={primaryFundamentals.nextEarningsDate ?? "Unavailable"}
                tone="neutral"
              />
            </div>
          </CardContent>
        </Card>
        <DataStatusPanel status={data.dataStatus} />
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-8">
          <CardHeader>
            <CardTitle>Trend Overview</CardTitle>
            <p className="text-sm text-[var(--muted)]">Price path against benchmark, with a calm framing rather than terminal noise.</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceSeries}>
                <defs>
                  <linearGradient id="assetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#143b2d" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#143b2d" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="benchFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b58b42" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#b58b42" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(17,32,24,0.08)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="benchmark" stroke="#b58b42" fill="url(#benchFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="asset" stroke="#143b2d" fill="url(#assetFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="grid-span-12 grid-span-4">
          <CardHeader>
            <CardTitle>What&apos;s Driving This</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-7 text-[var(--foreground)]/85">{data.brief.marketContext}</p>
            <ul className="space-y-3">
              {data.brief.currentTrends.map((trend) => (
                <li key={trend} className="rounded-3xl border border-[var(--border)] bg-white/50 p-4 text-sm leading-6">
                  {trend}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid">
        <WorldOpportunityMap signals={data.raw.geographicSignals} />
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.brief.opportunities.map((item) => (
              <div key={item.assetOrTheme} className="rounded-[28px] border border-[var(--border)] bg-white/55 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.assetOrTheme}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.timeHorizon}</p>
                  </div>
                  <Badge variant={item.confidence === "high" ? "success" : item.confidence === "medium" ? "warning" : "neutral"}>
                    {item.confidence}
                  </Badge>
                </div>
                <p className="mb-4 leading-7">{item.thesis}</p>
                <div className="space-y-3 text-sm text-[var(--muted)]">
                  <p><strong className="text-[var(--foreground)]">Evidence:</strong> {item.supportingEvidence.join(" ")}</p>
                  <p><strong className="text-[var(--foreground)]">Catalysts:</strong> {item.keyCatalysts.join(", ")}</p>
                  <p><strong className="text-[var(--foreground)]">Main risks:</strong> {item.mainRisks.join(", ")}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.brief.risks.map((risk) => (
              <div key={risk.risk} className="rounded-[28px] border border-[var(--border)] bg-white/55 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{risk.risk}</p>
                  <div className="flex gap-2">
                    <Badge variant={severityBadge(risk.severity)}>{risk.severity} severity</Badge>
                    <Badge variant={severityBadge(risk.probability)}>{risk.probability} probability</Badge>
                  </div>
                </div>
                <p className="mb-3 text-sm leading-6 text-[var(--foreground)]/86">{risk.whyItMatters}</p>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  <strong className="text-[var(--foreground)]">Watch for:</strong> {risk.deteriorationSignals.join(", ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>News & Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.raw.news.map((item) => (
              <div key={item.id} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium">{item.headline}</p>
                  <Badge variant={item.sentiment === "positive" ? "success" : item.sentiment === "negative" ? "danger" : "neutral"}>
                    {item.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{item.source} • {item.date}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:bg-[#f8f4eb]"
                  >
                    Article
                  </a>
                </div>
                <p className="mt-3 text-sm leading-6">{item.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-4">
          <CardHeader>
            <CardTitle>Catalysts Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.brief.catalysts.map((catalyst) => (
              <div key={catalyst.title} className="flex gap-4 rounded-3xl border border-[var(--border)] bg-white/55 p-4">
                <div className="mt-1 h-3 w-3 rounded-full bg-[var(--gold)]" />
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-medium">{catalyst.title}</p>
                    <Badge variant={catalyst.impact === "high" ? "warning" : "neutral"}>{catalyst.impact}</Badge>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{catalyst.dateLabel}</p>
                  <p className="mt-2 text-sm leading-6">{catalyst.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="grid-span-12 grid-span-4">
          <CardHeader>
            <CardTitle>Fundamentals Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FundamentalRow label="Company" value={primaryFundamentals.companyName} />
            <FundamentalRow label="Sector" value={primaryFundamentals.sector} />
            <FundamentalRow label="Market cap" value={formatCompactNumber(primaryFundamentals.marketCap)} />
            <FundamentalRow label="P/E" value={primaryFundamentals.peRatio?.toFixed(1) ?? "N/A"} />
            <FundamentalRow label="Revenue growth" value={primaryFundamentals.revenueGrowth != null ? formatPercent(primaryFundamentals.revenueGrowth) : "N/A"} />
            <FundamentalRow label="Operating margin" value={primaryFundamentals.operatingMargin != null ? formatPercent(primaryFundamentals.operatingMargin) : "N/A"} />
            <FundamentalRow label="Dividend yield" value={primaryFundamentals.dividendYield != null ? formatPercent(primaryFundamentals.dividendYield) : "N/A"} />
            <div className="rounded-3xl bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[var(--accent)]">{data.derived.valuationContext}</div>
          </CardContent>
        </Card>

        <Card className="grid-span-12 grid-span-4">
          <CardHeader>
            <CardTitle>Peer Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.raw.peers.map((peer) => (
              <div key={peer.ticker} className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-3 rounded-3xl border border-[var(--border)] bg-white/55 p-4 text-sm">
                <div>
                  <p className="font-medium">{peer.ticker}</p>
                  <p className="text-[var(--muted)]">{peer.name}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">1M move</p>
                  <p>{formatPercent(peer.priceReturn1M)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">P/E</p>
                  <p>{peer.peRatio?.toFixed(1) ?? "N/A"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid">
        <ResearchPanel research={data.raw.research} />
      </section>

      <section className="panel-grid">
        <SignalFeedPanel signals={data.raw.signals} />
      </section>

      <section className="panel-grid">
        <StockImpactGrid narratives={data.raw.stockNarratives} />
      </section>

      <section className="panel-grid">
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Uncertainty & What To Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-[#fbf7ef] p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--accent)]" />
                <p className="font-medium">Uncertainty</p>
              </div>
              <p className="text-sm leading-6">{data.brief.uncertainty}</p>
            </div>
            <div className="rounded-3xl bg-white/55 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-700" />
                <p className="font-medium">What to watch next</p>
              </div>
              <ul className="space-y-3 text-sm leading-6">
                {data.brief.whatToWatch.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <Disclaimer />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-[var(--muted)]">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-rose-700" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function FundamentalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white/55 px-4 py-3 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
