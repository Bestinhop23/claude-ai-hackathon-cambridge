export interface PriceSeries {
  ticker: string;
  benchmarkTicker: string;
  points: Array<{
    date: string;
    close: number;
    benchmarkClose: number;
    volume: number;
  }>;
}

export interface FundamentalsRecord {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  dividendYield: number | null;
  nextEarningsDate: string | null;
  beta: number | null;
}

export interface NewsRecord {
  id: string;
  headline: string;
  source: string;
  url: string;
  date: string;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface MacroRecord {
  regime: string;
  bulletPoints: string[];
  indicators: Array<{
    label: string;
    value: string;
  }>;
}

export interface SectorRecord {
  benchmark: string;
  sectorSignal: string;
  peers: Array<{
    ticker: string;
    name: string;
    priceReturn1M: number;
    peRatio: number | null;
    revenueGrowth: number | null;
  }>;
}

export interface SignalRecord {
  id: string;
  kind: "news" | "social" | "flight" | "shipping" | "weather";
  source: string;
  sourceUrl?: string;
  title: string;
  summary: string;
  region: string;
  affectedTickers: string[];
  impactDirection: "positive" | "neutral" | "negative";
  confidence: "low" | "medium" | "high";
  observedAt: string;
}

export interface ProviderResult<T> {
  data: T;
  status: "live" | "mock" | "stale" | "missing";
  source: string;
  updatedAt: string;
  notes: string;
}

export interface MarketDataProvider {
  getPriceSeries(input: { ticker: string; benchmark?: string }): Promise<ProviderResult<PriceSeries>>;
}

export interface FundamentalsProvider {
  getFundamentals(input: { ticker: string }): Promise<ProviderResult<FundamentalsRecord>>;
}

export interface NewsProvider {
  getNews(input: { ticker: string; query?: string }): Promise<ProviderResult<NewsRecord[]>>;
}

export interface MacroProvider {
  getMacroContext(input: { query: string }): Promise<ProviderResult<MacroRecord>>;
}

export interface SectorProvider {
  getSectorContext(input: { ticker: string; sector?: string }): Promise<ProviderResult<SectorRecord>>;
}

export interface SignalProvider {
  getSignals(input: { query: string; tickers: string[] }): Promise<ProviderResult<SignalRecord[]>>;
}

export interface LicensedSocialProvider {
  getLicensedSocialSignals(input: {
    query: string;
    tickers: string[];
    platforms: Array<"x" | "facebook" | "instagram" | "reddit" | "linkedin">;
  }): Promise<ProviderResult<SignalRecord[]>>;
}
