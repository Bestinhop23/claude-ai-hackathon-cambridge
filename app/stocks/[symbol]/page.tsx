import { notFound } from "next/navigation";
import { CompanyProfile } from "@/components/company-profile";
import { EarningsInfo } from "@/components/earnings-info";
import { NewsSentiment } from "@/components/news-sentiment";
import { StockChart } from "@/components/stock-chart";
import { StockLogo } from "@/components/stock-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runStockDataAction } from "@/lib/api/stock-data";
import { formatPercent } from "@/lib/utils";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  if (!symbol) notFound();

  const quote = await runStockDataAction(new URLSearchParams({ action: "quote", symbol }));
  const chart = await runStockDataAction(new URLSearchParams({ action: "chart", symbol }));
  const profile = await runStockDataAction(new URLSearchParams({ action: "company-profile", symbol }));
  const earnings = await runStockDataAction(new URLSearchParams({ action: "earnings", symbol }));
  const news = await runStockDataAction(new URLSearchParams({ action: "news", symbol }));
  const relevantNews = await runStockDataAction(new URLSearchParams({ action: "relevant-news", symbol }));
  const sentiment = await runStockDataAction(new URLSearchParams({ action: "sentiment", symbol }));

  const snapshot = (quote.data as Array<{ symbol: string; shortName: string; price: number; changePercent: number }>)[0];
  const profileData = profile.data as {
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

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <StockLogo name={profileData.name} logoUrl={profileData.logoUrl} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Stock Detail</p>
                <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-4xl">{snapshot.symbol}</h1>
                <p className="text-sm text-[var(--muted)]">{snapshot.shortName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold">${snapshot.price.toFixed(2)}</p>
              <p className={`${snapshot.changePercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatPercent(snapshot.changePercent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="panel-grid">
        <Card className="grid-span-12">
          <CardHeader>
            <CardTitle>Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <StockChart data={chart.data as Array<{ date: string; value: number }>} ranges={["1D", "1W", "1M", "6M", "1Y", "5Y"]} activeRange="1M" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 panel-grid">
        <div className="grid-span-12 grid-span-6">
          <CompanyProfile profile={profileData} />
        </div>
        <div className="grid-span-12 grid-span-6">
          <EarningsInfo earnings={earnings.data as Array<{ period: string; actual: number; estimate: number }>} />
        </div>
      </div>

      <div className="mt-6 panel-grid">
        <div className="grid-span-12">
          <NewsSentiment
            sentiment={sentiment.data as { stance: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number; risk: string; summary: string; keyFactors: string[] }}
            relevantNews={relevantNews.data as { queries: string[]; articles: Array<{ id: string; headline: string; source: string; url: string; summary: string; queryTag?: string }> }}
            latestNews={news.data as Array<{ id: string; headline: string; source: string; url: string; summary: string }>}
          />
        </div>
      </div>
    </main>
  );
}
