import {
  mockFundamentals,
  mockMacro,
  mockNews,
  mockPrices,
  mockSignals,
  mockSectors,
} from "@/lib/mocks/data";
import type {
  FundamentalsProvider,
  LicensedSocialProvider,
  MacroProvider,
  MarketDataProvider,
  NewsProvider,
  ProviderResult,
  SectorProvider,
  SignalProvider,
} from "@/lib/api/types";

const now = () => new Date().toISOString();

function toResult<T>(
  data: T,
  source: string,
  status: ProviderResult<T>["status"],
  notes: string,
): ProviderResult<T> {
  return {
    data,
    source,
    status,
    updatedAt: now(),
    notes,
  };
}

class MockMarketProvider implements MarketDataProvider {
  async getPriceSeries({ ticker }: { ticker: string; benchmark?: string }) {
    return toResult(
      mockPrices[ticker] ?? mockPrices.DEFAULT,
      "Mock Market Data",
      "mock",
      "Mock mode uses deterministic 30-day price and benchmark series for demo stability.",
    );
  }
}

class MockFundamentalsProvider implements FundamentalsProvider {
  async getFundamentals({ ticker }: { ticker: string }) {
    return toResult(
      mockFundamentals[ticker] ?? { ...mockFundamentals.DEFAULT, ticker },
      "Mock Fundamentals",
      "mock",
      "Fundamentals snapshot is mocked when live keys are unavailable.",
    );
  }
}

class MockNewsProvider implements NewsProvider {
  async getNews({ ticker }: { ticker: string; query?: string }) {
    return toResult(
      mockNews[ticker] ?? mockNews.DEFAULT,
      "Mock News Feed",
      "mock",
      "News summaries are realistic mock records curated for demo scenarios.",
    );
  }
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRssItems(xml: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5);
  return items.map((match, index) => {
    const item = match[1];
    const title = decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? `RSS article ${index + 1}`);
    const link = decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "https://news.google.com");
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const description = decodeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "No summary available.");

    return {
      title,
      link,
      pubDate,
      description,
    };
  });
}

class RssNewsProvider implements NewsProvider {
  async getNews({ ticker, query }: { ticker: string; query?: string }) {
    const search = encodeURIComponent(query || ticker);
    const response = await fetch(`https://news.google.com/rss/search?q=${search}%20stock&hl=en-US&gl=US&ceid=US:en`, {
      next: { revalidate: 1800 },
    });
    const text = await response.text();
    const items = parseRssItems(text);

    if (!items.length) {
      throw new Error("RSS news unavailable");
    }

    return toResult(
      items.map((item, index) => ({
        id: `${ticker}-rss-${index}`,
        headline: item.title,
        source: "Google News RSS",
        url: item.link,
        date: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : now().slice(0, 10),
        summary: item.description.replace(/<[^>]+>/g, ""),
        sentiment: "neutral" as const,
      })),
      "Google News RSS",
      "live",
      "RSS headlines are fetched from a public news feed for attribution-rich fallback coverage.",
    );
  }
}

class MockMacroProvider implements MacroProvider {
  async getMacroContext({ query: _query }: { query: string }) {
    void _query;
    return toResult(
      mockMacro,
      "Mock Macro",
      "mock",
      "Macro context is mocked unless live macro data is configured.",
    );
  }
}

class MockSectorProvider implements SectorProvider {
  async getSectorContext({ ticker }: { ticker: string; sector?: string }) {
    return toResult(
      mockSectors[ticker] ?? mockSectors.DEFAULT,
      "Mock Sector Context",
      "mock",
      "Peer and sector context is generated from mock comparison baskets.",
    );
  }
}

class MockSignalProvider implements SignalProvider {
  async getSignals({ tickers }: { query: string; tickers: string[] }) {
    const primary = tickers[0];
    return toResult(
      mockSignals[primary] ?? mockSignals.DEFAULT,
      "Mock Signal Collector",
      "mock",
      "Signal collector uses curated open-source style signals for demo reliability. Social sources are represented via compliant public-signal placeholders.",
    );
  }
}

class AlphaVantageMarketProvider implements MarketDataProvider {
  async getPriceSeries({ ticker, benchmark = "SPY" }: { ticker: string; benchmark?: string }) {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ALPHA_VANTAGE_API_KEY");
    }

    const [assetRes, benchmarkRes] = await Promise.all([
      fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${apiKey}`,
        { next: { revalidate: 3600 } },
      ),
      fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${benchmark}&outputsize=compact&apikey=${apiKey}`,
        { next: { revalidate: 3600 } },
      ),
    ]);

    const [assetJson, benchmarkJson] = await Promise.all([assetRes.json(), benchmarkRes.json()]);
    const assetSeries = assetJson["Time Series (Daily)"];
    const benchmarkSeries = benchmarkJson["Time Series (Daily)"];

    if (!assetSeries || !benchmarkSeries) {
      throw new Error("Live market data unavailable");
    }

    const points = Object.keys(assetSeries)
      .slice(0, 30)
      .reverse()
      .map((date: string) => ({
        date,
        close: Number(assetSeries[date]["4. close"]),
        benchmarkClose: Number(benchmarkSeries[date]?.["4. close"] ?? 0),
        volume: Number(assetSeries[date]["5. volume"]),
      }));

    return toResult(
      { ticker, benchmarkTicker: benchmark, points },
      "Alpha Vantage",
      "live",
      "Daily adjusted pricing fetched live.",
    );
  }
}

class FinnhubFundamentalsProvider implements FundamentalsProvider {
  async getFundamentals({ ticker }: { ticker: string }) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error("Missing FINNHUB_API_KEY");
    }

    const [profileRes, metricRes, earningsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${apiKey}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${ticker}&token=${apiKey}`, {
        next: { revalidate: 3600 },
      }),
    ]);

    const [profile, metric, earnings] = await Promise.all([
      profileRes.json(),
      metricRes.json(),
      earningsRes.json(),
    ]);

    if (!profile?.ticker || !metric?.metric) {
      throw new Error("Live fundamentals unavailable");
    }

    const nextEarningsDate = Array.isArray(earnings?.earningsCalendar)
      ? earnings.earningsCalendar[0]?.date ?? null
      : null;

    return toResult(
      {
        ticker,
        companyName: profile.name ?? ticker,
        sector: profile.finnhubIndustry ?? "Unknown",
        industry: profile.finnhubIndustry ?? "Unknown",
        marketCap: Number(profile.marketCapitalization ?? 0) * 1_000_000,
        peRatio: Number(metric.metric.peNormalizedAnnual ?? metric.metric.peTTM ?? 0) || null,
        revenueGrowth: Number(metric.metric.revenueGrowthTTMYoy ?? 0) || null,
        grossMargin: Number(metric.metric.grossMarginAnnual ?? 0) || null,
        operatingMargin: Number(metric.metric.operatingMarginAnnual ?? 0) || null,
        dividendYield: Number(metric.metric.dividendYieldIndicatedAnnual ?? 0) || null,
        nextEarningsDate,
        beta: Number(metric.metric.beta ?? 0) || null,
      },
      "Finnhub",
      "live",
      "Company profile and valuation metrics fetched live.",
    );
  }
}

class NewsApiProvider implements NewsProvider {
  async getNews({ ticker, query }: { ticker: string; query?: string }) {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing NEWS_API_KEY");
    }

    const search = encodeURIComponent(query || ticker);
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${search}&language=en&pageSize=6&sortBy=publishedAt&apiKey=${apiKey}`,
      { next: { revalidate: 1800 } },
    );
    const json = await response.json();

    if (!json?.articles) {
      throw new Error("Live news unavailable");
    }

    return toResult(
      json.articles.slice(0, 5).map((
        article: {
          title?: string;
          source?: { name?: string };
          url?: string;
          publishedAt?: string;
          description?: string;
        },
        index: number,
      ) => ({
        id: `${ticker}-${index}`,
        headline: article.title ?? "Untitled article",
        source: article.source?.name ?? "News API",
        url: article.url ?? "https://newsapi.org",
        date: article.publishedAt?.slice(0, 10) ?? now().slice(0, 10),
        summary: article.description ?? "No summary available.",
        sentiment: "neutral" as const,
      })),
      "News API",
      "live",
      "Headline feed fetched live.",
    );
  }
}

class MergedNewsProvider implements NewsProvider {
  constructor(
    private readonly primary: NewsProvider,
    private readonly fallback: NewsProvider,
  ) {}

  async getNews(input: { ticker: string; query?: string }) {
    try {
      return await this.primary.getNews(input);
    } catch {
      return this.fallback.getNews(input);
    }
  }
}

class FallbackMacroProvider implements MacroProvider {
  async getMacroContext({ query: _query }: { query: string }) {
    void _query;
    return toResult(
      mockMacro,
      "Scenario Macro Model",
      "stale",
      "Macro adapter uses a curated fallback until a live macro source is connected.",
    );
  }
}

class FallbackSectorProvider implements SectorProvider {
  async getSectorContext({ ticker }: { ticker: string; sector?: string }) {
    return toResult(
      mockSectors[ticker] ?? mockSectors.DEFAULT,
      "Scenario Sector Model",
      "stale",
      "Sector context uses a fallback comparison basket.",
    );
  }
}

class FallbackSignalProvider implements SignalProvider {
  async getSignals({ tickers }: { query: string; tickers: string[] }) {
    const primary = tickers[0];
    return toResult(
      mockSignals[primary] ?? mockSignals.DEFAULT,
      "Fallback Signal Collector",
      "stale",
      "Open-source signal collector falls back to curated signals when live connectors are not configured.",
    );
  }
}

class LicensedSocialPlaceholderProvider implements LicensedSocialProvider {
  async getLicensedSocialSignals({
    tickers,
    platforms,
  }: {
    query: string;
    tickers: string[];
    platforms: Array<"x" | "facebook" | "instagram" | "reddit" | "linkedin">;
  }) {
    return toResult(
      tickers.map((ticker, index) => ({
        id: `licensed-social-${ticker}-${index}`,
        kind: "social" as const,
        source: `Licensed Social Connector (${platforms.join(", ")})`,
        sourceUrl: "https://example.com/licensed-social",
        title: `${ticker} social connector ready`,
        summary:
          "No licensed social feed is configured in this environment yet. Attach approved platform credentials or enterprise feeds to populate this connector.",
        region: "Global",
        affectedTickers: [ticker],
        impactDirection: "neutral" as const,
        confidence: "low" as const,
        observedAt: now(),
      })),
      "Licensed Social Placeholder",
      "missing",
      "Connector boundary exists for approved social APIs or licensed feeds; unauthorized scraping is not used.",
    );
  }
}

function liveModeEnabled() {
  return process.env.CLEARVIEW_DATA_MODE === "live";
}

function getMockProviders() {
  return {
    market: new MockMarketProvider(),
    fundamentals: new MockFundamentalsProvider(),
    news: new MockNewsProvider(),
    macro: new MockMacroProvider(),
    sector: new MockSectorProvider(),
    signals: new MockSignalProvider(),
    licensedSocial: new LicensedSocialPlaceholderProvider(),
  };
}

export function getProviders() {
  if (!liveModeEnabled()) {
    return getMockProviders();
  }

  return {
    market: new AlphaVantageMarketProvider(),
    fundamentals: new FinnhubFundamentalsProvider(),
    news: new MergedNewsProvider(new NewsApiProvider(), new RssNewsProvider()),
    macro: new FallbackMacroProvider(),
    sector: new FallbackSectorProvider(),
    signals: new FallbackSignalProvider(),
    licensedSocial: new LicensedSocialPlaceholderProvider(),
  };
}

export function getMockFallbackProviders() {
  return getMockProviders();
}

export async function withMockFallback<T>(fn: () => Promise<ProviderResult<T>>, fallback: () => Promise<ProviderResult<T>>) {
  try {
    return await fn();
  } catch {
    return fallback();
  }
}
