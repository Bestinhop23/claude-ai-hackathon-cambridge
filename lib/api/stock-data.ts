import {
  actionSchema,
  articleSchema,
  chartPointSchema,
  companyProfilePayloadSchema,
  earningsRowSchema,
  exchangeRatesSchema,
  flightSchema,
  quoteSnapshotSchema,
  searchResultSchema,
  sentimentPayloadSchema,
  shipSchema,
} from "@/lib/schemas/stock-data";
import {
  mockArticles,
  mockCharts,
  mockEarnings,
  mockExchangeRates,
  mockFlights,
  mockProfiles,
  mockQuotes,
  mockRelevantNewsQueries,
  mockSearchResults,
  mockSentiment,
  mockShips,
} from "@/lib/mocks/market-data";
import { getPerplexityResearch } from "@/lib/research/perplexity";
import { getClaudeSentiment } from "@/lib/summarization/claude-sentiment";

function dataMode() {
  return process.env.CLEARVIEW_DATA_MODE ?? "mock";
}

function symbolOrDefault(symbol?: string) {
  return symbol?.toUpperCase() ?? "NVDA";
}

function mockQuote(symbols: string[]) {
  return symbols.map((symbol) =>
    quoteSnapshotSchema.parse(
      mockQuotes[symbol] ?? {
        symbol,
        shortName: `${symbol} Holdings`,
        price: 100,
        change: 0.4,
        changePercent: 0.4,
        currency: "USD",
        marketState: "REGULAR",
      },
    ),
  );
}

function mockChart(symbol: string) {
  return (mockCharts[symbol] ?? mockCharts.NVDA).map((point) => chartPointSchema.parse(point));
}

function mockSearch(query: string) {
  const lowered = query.toLowerCase();
  return mockSearchResults.filter((item) => item.symbol.toLowerCase().includes(lowered) || item.name.toLowerCase().includes(lowered));
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
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10);
  return items.map((match, index) => {
    const item = match[1];
    return {
      id: `rss-${index}`,
      headline: decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? `RSS article ${index + 1}`),
      source: "Google News RSS",
      url: decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "https://news.google.com"),
      imageUrl: null,
      date: (() => {
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
        return pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      })(),
      summary: decodeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "No summary available.").replace(/<[^>]+>/g, ""),
    };
  });
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.text();
}

async function withFallback<T>(live: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (dataMode() !== "live") {
    return fallback();
  }

  try {
    return await live();
  } catch {
    return fallback();
  }
}

async function liveQuote(symbols: string[]) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error("Missing ALPHA_VANTAGE_API_KEY");

  const quotes = await Promise.all(
    symbols.map(async (symbol) => {
      const json = await fetchJson(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`,
      );
      const quote = json["Global Quote"];
      if (!quote) throw new Error("Missing quote data");

      return quoteSnapshotSchema.parse({
        symbol,
        shortName: symbol,
        price: Number(quote["05. price"]),
        change: Number(quote["09. change"]),
        changePercent: Number(String(quote["10. change percent"] ?? "0").replace("%", "")),
        currency: "USD",
        marketState: "REGULAR",
      });
    }),
  );

  return quotes;
}

async function liveChart(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error("Missing ALPHA_VANTAGE_API_KEY");

  const json = await fetchJson(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`,
  );
  const series = json["Time Series (Daily)"];
  if (!series) throw new Error("Missing chart data");

  return Object.keys(series)
    .slice(0, 60)
    .reverse()
    .map((date) =>
      chartPointSchema.parse({
        date,
        value: Number(series[date]["5. adjusted close"] ?? series[date]["4. close"]),
      }),
    );
}

async function liveSearch(query: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error("Missing ALPHA_VANTAGE_API_KEY");

  const json = await fetchJson(
    `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`,
  );
  const matches = Array.isArray(json.bestMatches) ? json.bestMatches : [];
  return matches.slice(0, 8).map((item: Record<string, string>) =>
    searchResultSchema.parse({
      symbol: item["1. symbol"],
      name: item["2. name"],
      exchange: item["4. region"],
      type: item["3. type"],
    }),
  );
}

async function liveCompanyProfile(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("Missing FINNHUB_API_KEY");

  const [profile, metric, recommendation, peers] = await Promise.all([
    fetchJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
    fetchJson(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`),
    fetchJson(`https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
    fetchJson(`https://finnhub.io/api/v1/stock/peers?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
  ]);

  return companyProfilePayloadSchema.parse({
    symbol,
    name: profile.name ?? symbol,
    logoUrl: profile.logo || null,
    sector: profile.finnhubIndustry ?? "Unknown",
    industry: profile.finnhubIndustry ?? "Unknown",
    country: profile.country ?? "Unknown",
    website: profile.weburl || null,
    description: `${profile.name ?? symbol} operates in ${profile.finnhubIndustry ?? "its sector"} and is monitored here for market drivers, risks, and catalysts.`,
    metrics: [
      { label: "Market Cap", value: profile.marketCapitalization ? `$${Number(profile.marketCapitalization).toFixed(1)}B` : "N/A" },
      { label: "P/E", value: metric.metric?.peNormalizedAnnual ? `${Number(metric.metric.peNormalizedAnnual).toFixed(1)}x` : "N/A" },
      { label: "Revenue Growth", value: metric.metric?.revenueGrowthTTMYoy ? `${Number(metric.metric.revenueGrowthTTMYoy).toFixed(1)}%` : "N/A" },
      { label: "Gross Margin", value: metric.metric?.grossMarginAnnual ? `${Number(metric.metric.grossMarginAnnual).toFixed(1)}%` : "N/A" },
      { label: "Operating Margin", value: metric.metric?.operatingMarginAnnual ? `${Number(metric.metric.operatingMarginAnnual).toFixed(1)}%` : "N/A" },
      { label: "Beta", value: metric.metric?.beta ? Number(metric.metric.beta).toFixed(2) : "N/A" },
    ],
    peers: Array.isArray(peers) ? peers.slice(0, 8) : [],
    recommendations: Array.isArray(recommendation)
      ? recommendation.slice(0, 3).map((item: Record<string, number | string>) => ({
          period: String(item.period ?? "recent"),
          buy: Number(item.buy ?? 0),
          hold: Number(item.hold ?? 0),
          sell: Number(item.sell ?? 0),
          strongBuy: Number(item.strongBuy ?? 0),
          strongSell: Number(item.strongSell ?? 0),
        }))
      : [],
  });
}

async function liveEarnings(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error("Missing FINNHUB_API_KEY");

  const json = await fetchJson(`https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`);
  if (!Array.isArray(json)) throw new Error("Missing earnings data");

  return json.slice(0, 8).reverse().map((item: Record<string, number | string | null>) =>
    earningsRowSchema.parse({
      period: String(item.period ?? item.date ?? "unknown"),
      actual: Number(item.actual ?? 0),
      estimate: Number(item.estimate ?? 0),
      revenueActual: item.revenueActual == null ? null : Number(item.revenueActual),
      revenueEstimate: item.revenueEstimate == null ? null : Number(item.revenueEstimate),
    }),
  );
}

async function liveNews(symbol: string, query: string) {
  const apiKey = process.env.NEWS_API_KEY;
  if (apiKey) {
    const json = await fetchJson(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query || symbol)}&language=en&pageSize=8&sortBy=publishedAt&apiKey=${apiKey}`,
    );
    if (!Array.isArray(json.articles)) throw new Error("Missing news articles");

    return json.articles.slice(0, 8).map((item: Record<string, unknown>, index: number) =>
      articleSchema.parse({
        id: `news-${symbol}-${index}`,
        headline: String(item.title ?? "Untitled"),
        source: String((item.source as { name?: string } | undefined)?.name ?? "News API"),
        url: String(item.url ?? "https://newsapi.org"),
        imageUrl: item.urlToImage ? String(item.urlToImage) : null,
        date: String(item.publishedAt ?? new Date().toISOString()).slice(0, 10),
        summary: String(item.description ?? "No summary available."),
      }),
    );
  }

  const xml = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(`${query || symbol} stock`)}&hl=en-US&gl=US&ceid=US:en`);
  return parseRssItems(xml).map((item) => articleSchema.parse(item));
}

async function liveRelevantNews(symbol: string, query: string) {
  const research = await getPerplexityResearch({ query, tickers: [symbol] });
  const queries = research.findings.map((finding) => finding.topic).slice(0, 4);
  const articles = await Promise.all(
    queries.map(async (searchQuery) => {
      const items = await liveNews(symbol, `${symbol} ${searchQuery}`);
      return items.slice(0, 2).map((item: Awaited<ReturnType<typeof liveNews>>[number]) =>
        articleSchema.parse({
          ...item,
          queryTag: searchQuery,
        }),
      );
    }),
  );

  return {
    queries,
    articles: articles.flat(),
  };
}

async function liveSentiment(symbol: string) {
  const articles = await liveNews(symbol, symbol);
  const research = await getPerplexityResearch({ query: symbol, tickers: [symbol] });
  const result = await getClaudeSentiment({
    query: symbol,
    tickers: [symbol],
    news: articles.map((item: Awaited<ReturnType<typeof liveNews>>[number]) => ({
      id: item.id,
      headline: item.headline,
      source: item.source,
      url: item.url,
      date: item.date,
      summary: item.summary,
      sentiment: "neutral" as const,
    })),
    signals: [],
    research,
  });

  const text = result.tickerImpact[symbol] ?? result.marketSummary;
  return sentimentPayloadSchema.parse({
    stance: text.toLowerCase().includes("supportive") ? "BULLISH" : text.toLowerCase().includes("fragile") ? "BEARISH" : "NEUTRAL",
    confidence: 68,
    risk: "Sentiment remains dependent on the freshness and quality of the connected evidence.",
    summary: result.marketSummary,
    keyFactors: research.findings.map((finding) => finding.takeaway).slice(0, 4),
  });
}

async function liveExchangeRates() {
  const json = await fetchJson("https://open.er-api.com/v6/latest/USD");
  return exchangeRatesSchema.parse({
    base: json.base_code ?? "USD",
    rates: json.rates ?? mockExchangeRates.rates,
  });
}

export async function runStockDataAction(params: URLSearchParams) {
  const action = actionSchema.parse(params.get("action"));
  const symbol = symbolOrDefault(params.get("symbol") ?? undefined);
  const symbols = (params.get("symbols") ?? symbol)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const query = params.get("query") ?? symbol;

  switch (action) {
    case "quote":
      return {
        data: await withFallback(() => liveQuote(symbols), () => mockQuote(symbols)),
      };
    case "chart":
      return {
        data: await withFallback(() => liveChart(symbol), () => mockChart(symbol)),
      };
    case "search":
      return {
        data: await withFallback(() => liveSearch(query), () => mockSearch(query).map((item) => searchResultSchema.parse(item))),
      };
    case "earnings":
      return {
        data: await withFallback(() => liveEarnings(symbol), () => (mockEarnings[symbol] ?? mockEarnings.DEFAULT).map((row) => earningsRowSchema.parse(row))),
      };
    case "company-profile":
      return {
        data: await withFallback(() => liveCompanyProfile(symbol), () => companyProfilePayloadSchema.parse(mockProfiles[symbol] ?? { ...mockProfiles.DEFAULT, symbol })),
      };
    case "news":
      return {
        data: await withFallback(() => liveNews(symbol, query), () => (mockArticles[symbol] ?? mockArticles.DEFAULT).map((item) => articleSchema.parse(item))),
      };
    case "relevant-news":
      return {
        data: await withFallback(
          () => liveRelevantNews(symbol, query),
          () => ({
            queries: mockRelevantNewsQueries[symbol] ?? mockRelevantNewsQueries.DEFAULT,
            articles: (mockArticles[symbol] ?? mockArticles.DEFAULT).map((item, index) =>
              articleSchema.parse({
                ...item,
                queryTag: (mockRelevantNewsQueries[symbol] ?? mockRelevantNewsQueries.DEFAULT)[index % 4],
              }),
            ),
          }),
        ),
      };
    case "sentiment":
      return {
        data: await withFallback(() => liveSentiment(symbol), () => sentimentPayloadSchema.parse(mockSentiment[symbol] ?? mockSentiment.DEFAULT)),
      };
    case "exchange-rates":
      return {
        data: await withFallback(() => liveExchangeRates(), () => exchangeRatesSchema.parse(mockExchangeRates)),
      };
    case "flights":
      return { data: mockFlights.map((item) => flightSchema.parse(item)) };
    case "ships":
      return { data: mockShips.map((item) => shipSchema.parse(item)) };
  }
}
