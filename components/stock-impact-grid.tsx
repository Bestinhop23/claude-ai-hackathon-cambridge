"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";

export function StockImpactGrid({ narratives }: { narratives: AnalysisResponse["raw"]["stockNarratives"] }) {
  return (
    <Card className="grid-span-12">
      <CardHeader>
        <CardTitle>Stocks and Expected Effect</CardTitle>
        <p className="text-sm text-[var(--muted)]">
          API-backed price charts plus plain-English summaries of what is going on and how the current setup is likely to affect each stock.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {narratives.map((item) => (
          <div key={item.ticker} className="rounded-[28px] border border-[var(--border)] bg-white/55 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.ticker}</p>
                <p className="text-sm text-[var(--muted)]">{item.name} • {item.region}</p>
              </div>
              <Badge variant={item.confidence === "high" ? "success" : "warning"}>{item.confidence}</Badge>
            </div>
            <div className="mb-4 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={item.chart.map((point) => ({
                    date: point.date.slice(5),
                    close: point.close,
                    benchmark: point.benchmarkClose,
                  }))}
                >
                  <defs>
                    <linearGradient id={`stock-fill-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#143b2d" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#143b2d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="close" stroke="#143b2d" fill={`url(#stock-fill-${item.ticker})`} strokeWidth={2.4} />
                  <Area type="monotone" dataKey="benchmark" stroke="#b58b42" fill="none" strokeWidth={1.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-sm leading-6">
              <p>
                <strong className="text-[var(--foreground)]">What is going on:</strong> {item.summary}
              </p>
              <p>
                <strong className="text-[var(--foreground)]">Expected effect:</strong> {item.expectedEffect}
              </p>
              <p className="text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Current drivers:</strong> {item.currentDrivers.join(", ")}
              </p>
              <div className="pt-1">
                <p className="mb-2 text-sm font-medium text-[var(--foreground)]">Supporting articles</p>
                <div className="space-y-2">
                  {item.relatedArticles.map((article) => (
                    <div key={`${item.ticker}-${article.url}`} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{article.source}</p>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[var(--border)] bg-[#f8f4eb] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:bg-[#f1eadf]"
                        >
                          Open article
                        </a>
                      </div>
                      <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{article.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        <strong className="text-[var(--foreground)]">Why this matters:</strong> {article.whyItMatters}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
