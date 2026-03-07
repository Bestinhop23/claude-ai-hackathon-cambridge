import type { FundamentalsRecord, NewsRecord, PriceSeries } from "@/lib/api/types";
import { computeMarketDerived } from "@/lib/analytics/market";
import { mockGeographicThemes } from "@/lib/mocks/data";
import type { SignalRecord } from "@/lib/api/types";

export function buildGeographicSignals(input: {
  query: string;
  focusTickers: string[];
  trendDirection: "improving" | "mixed" | "softening";
}) {
  const signals = mockGeographicThemes.globalAi.map((item) => ({
    ...item,
    affectedStocks: item.affectedStocks.filter((ticker) => input.focusTickers.includes(ticker)).length
      ? item.affectedStocks.filter((ticker) => input.focusTickers.includes(ticker))
      : item.affectedStocks,
  }));

  if (input.query.toLowerCase().includes("consumer")) {
    return signals.map((signal) =>
      signal.region === "Latin America"
        ? {
            ...signal,
            status: "watch" as const,
            summary: "Consumer and FX trends are stabilizing slightly, but demand is still uneven.",
          }
        : signal,
    );
  }

  return signals;
}

export function buildStockNarratives(input: {
  focus: Array<{
    fundamentals: FundamentalsRecord;
    prices: PriceSeries;
  }>;
  sectorSignal: string;
  signals: SignalRecord[];
  news: NewsRecord[];
}) {
  return input.focus.map(({ fundamentals, prices }) => {
    const derived = computeMarketDerived(prices, fundamentals, input.sectorSignal);
    const region =
      fundamentals.industry === "Semiconductors" || fundamentals.industry === "Memory"
        ? "East Asia / North America"
        : fundamentals.sector === "Information Technology"
          ? "North America"
          : "Global";

    const summary =
      derived.relativePerformance1M >= 0
        ? `${fundamentals.companyName} is holding leadership because current demand and operating execution still look stronger than the broader market average.`
        : `${fundamentals.companyName} is underperforming the benchmark, which suggests investors want clearer proof that the current thesis is still intact.`;

    const expectedEffect =
      derived.relativePerformance1M >= 0
        ? `If the current drivers persist, the stock can keep benefiting from positive revisions, though the setup remains sensitive to any execution slip because valuation is already carrying expectations.`
        : `The stock likely needs better demand visibility or a calmer rate backdrop before sentiment improves meaningfully.`;
    const signalBullets = input.signals
      .filter((signal) => signal.affectedTickers.includes(fundamentals.ticker))
      .slice(0, 2)
      .map((signal) => `${signal.kind}: ${signal.title}`);

    return {
      ticker: fundamentals.ticker,
      name: fundamentals.companyName,
      region,
      summary,
      expectedEffect,
      currentDrivers: [
        `${fundamentals.sector} demand backdrop`,
        `1M relative performance ${derived.relativePerformance1M.toFixed(1)} pts`,
        fundamentals.nextEarningsDate
          ? `Next earnings ${fundamentals.nextEarningsDate}`
          : "No confirmed earnings date in current dataset",
        ...signalBullets,
      ],
      confidence:
        derived.volatilityEstimate > 45 ? "medium" as const : derived.relativePerformance1M >= 0 ? "high" as const : "medium" as const,
      relatedArticles: input.news
        .filter((item) => item.headline || item.summary)
        .slice(0, 3)
        .map((item) => ({
          headline: item.headline,
          source: item.source,
          url: item.url,
          whyItMatters:
            item.sentiment === "positive"
              ? `This coverage supports the current outlook for ${fundamentals.ticker} by reinforcing a favorable demand or execution narrative.`
              : item.sentiment === "negative"
                ? `This coverage matters because it can pressure sentiment for ${fundamentals.ticker} if investors see it as a sign of deteriorating conditions.`
                : `This coverage adds context for ${fundamentals.ticker} and helps explain why investors may remain cautious or selective.`,
        })),
      chart: prices.points.map((point) => ({
        date: point.date,
        close: point.close,
        benchmarkClose: point.benchmarkClose,
      })),
    };
  });
}
