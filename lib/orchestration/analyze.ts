import { computeMarketDerived } from "@/lib/analytics/market";
import { getMockFallbackProviders, getProviders, withMockFallback } from "@/lib/api/providers";
import { analysisResponseSchema, analyzeRequestSchema, type AnalysisResponse } from "@/lib/schemas/analysis";
import { interpretQuery } from "@/lib/orchestration/interpreter";
import { getPerplexityResearch } from "@/lib/research/perplexity";
import { generateBrief } from "@/lib/summarization/brief";
import { getClaudeSentiment } from "@/lib/summarization/claude-sentiment";
import { buildGeographicSignals, buildStockNarratives } from "@/lib/summarization/geography";

function pickFocusTickers(input: {
  kind: "ticker" | "theme" | "watchlist";
  primaryTicker: string;
  symbols: string[];
  peerTickers: string[];
}) {
  if (input.kind === "watchlist") {
    return Array.from(new Set(input.symbols)).slice(0, 4);
  }

  return Array.from(new Set([input.primaryTicker, ...input.peerTickers])).slice(0, 4);
}

export async function runAnalysis(input: { query: string; mode: "concise" | "detailed" }): Promise<AnalysisResponse> {
  const request = analyzeRequestSchema.parse(input);
  const interpreted = interpretQuery(request.query);
  const providers = getProviders();
  const fallbackProviders = getMockFallbackProviders();

  const preFocusTickers =
    interpreted.kind === "watchlist"
      ? interpreted.symbols.slice(0, 4)
      : [interpreted.primaryTicker];

  const [prices, fundamentals, news, macro, sector, signals] = await Promise.all([
    withMockFallback(
      () => providers.market.getPriceSeries({ ticker: interpreted.primaryTicker }),
      () => fallbackProviders.market.getPriceSeries({ ticker: interpreted.primaryTicker }),
    ),
    withMockFallback(
      () => providers.fundamentals.getFundamentals({ ticker: interpreted.primaryTicker }),
      () => fallbackProviders.fundamentals.getFundamentals({ ticker: interpreted.primaryTicker }),
    ),
    withMockFallback(
      () => providers.news.getNews({ ticker: interpreted.primaryTicker, query: interpreted.queryLabel }),
      () => fallbackProviders.news.getNews({ ticker: interpreted.primaryTicker, query: interpreted.queryLabel }),
    ),
    withMockFallback(
      () => providers.macro.getMacroContext({ query: interpreted.queryLabel }),
      () => fallbackProviders.macro.getMacroContext({ query: interpreted.queryLabel }),
    ),
    withMockFallback(
      () => providers.sector.getSectorContext({ ticker: interpreted.primaryTicker }),
      () => fallbackProviders.sector.getSectorContext({ ticker: interpreted.primaryTicker }),
    ),
    withMockFallback(
      () => providers.signals.getSignals({ query: interpreted.queryLabel, tickers: preFocusTickers }),
      () => fallbackProviders.signals.getSignals({ query: interpreted.queryLabel, tickers: preFocusTickers }),
    ),
  ]);

  const derived = computeMarketDerived(prices.data, fundamentals.data, sector.data.sectorSignal);
  const focusTickers = pickFocusTickers({
    kind: interpreted.kind,
    primaryTicker: interpreted.primaryTicker,
    symbols: interpreted.symbols,
    peerTickers: sector.data.peers.map((peer) => peer.ticker),
  });

  const focusData = await Promise.all(
    focusTickers.map(async (ticker) => {
      const [focusPrices, focusFundamentals] = await Promise.all([
        withMockFallback(
          () => providers.market.getPriceSeries({ ticker }),
          () => fallbackProviders.market.getPriceSeries({ ticker }),
        ),
        withMockFallback(
          () => providers.fundamentals.getFundamentals({ ticker }),
          () => fallbackProviders.fundamentals.getFundamentals({ ticker }),
        ),
      ]);

      return {
        prices: focusPrices.data,
        fundamentals: focusFundamentals.data,
      };
    }),
  );

  const geographicSignals = buildGeographicSignals({
    query: interpreted.queryLabel,
    focusTickers,
    trendDirection: derived.trendDirection,
  });
  const research = await getPerplexityResearch({
    query: interpreted.queryLabel,
    tickers: focusTickers,
  });
  const stockNarratives = buildStockNarratives({
    focus: focusData,
    sectorSignal: sector.data.sectorSignal,
    signals: signals.data,
    news: news.data,
  });
  const sentiment = await getClaudeSentiment({
    query: interpreted.queryLabel,
    tickers: focusTickers,
    news: news.data,
    signals: signals.data,
    research,
  });
  const brief = generateBrief({
    mode: request.mode,
    kind: interpreted.kind,
    query: interpreted.queryLabel,
    fundamentals: fundamentals.data,
    macro: macro.data,
    sector: sector.data,
    news: news.data,
    signals: signals.data,
    sentimentSummary: sentiment.marketSummary,
    research,
    derived,
  });

  const enrichedStockNarratives = stockNarratives.map((item) => ({
    ...item,
    expectedEffect: sentiment.tickerImpact[item.ticker] ?? item.expectedEffect,
  }));

  const response = {
    request: {
      ...request,
      kind: interpreted.kind,
    },
    brief,
    raw: {
      prices: prices.data.points,
      fundamentals: [fundamentals.data],
      macroSummary: macro.data.bulletPoints,
      news: news.data,
      peers: sector.data.peers,
      stockNarratives: enrichedStockNarratives,
      geographicSignals,
      signals: signals.data,
      research,
    },
    derived: {
      trendDirection: derived.trendDirection,
      priceChange1M: derived.priceChange1M,
      relativePerformance1M: derived.relativePerformance1M,
      volatilityEstimate: derived.volatilityEstimate,
      drawdownEstimate: derived.drawdownEstimate,
      earningsProximityDays: derived.earningsProximityDays,
      sectorSignal: derived.sectorSignal,
      valuationContext: derived.valuationContext,
    },
    dataStatus: [prices, fundamentals, news, macro, sector, signals].map((result, index) => ({
      source: result.source,
      category: ["prices", "fundamentals", "news", "macro", "sector", "signals"][index],
      status: result.status,
      updatedAt: result.updatedAt,
      notes: result.notes,
    })),
    generatedAt: new Date().toISOString(),
  };

  return analysisResponseSchema.parse(response);
}
