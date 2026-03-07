import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchStockData(action: string, params: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("stock-data", {
    body: { action, params },
  });
  if (error) throw new Error(error.message || "Failed to fetch stock data");
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface YahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  exchange?: string;
  quoteType?: string;
  currency?: string;
  averageDailyVolume3Month?: number;
  preMarketPrice?: number | null;
  preMarketChange?: number | null;
  preMarketChangePercent?: number | null;
  postMarketPrice?: number | null;
  postMarketChange?: number | null;
  postMarketChangePercent?: number | null;
  hasPrePostMarketData?: boolean;
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: async () => {
      const data = await fetchStockData("quote", { symbols: symbol });
      return (data?.quoteResponse?.result?.[0] as YahooQuote) || null;
    },
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useMultiQuote(symbols: string[]) {
  return useQuery({
    queryKey: ["multi-quote", symbols.join(",")],
    queryFn: async () => {
      const data = await fetchStockData("quote", { symbols });
      return (data?.quoteResponse?.result || []) as YahooQuote[];
    },
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useChart(symbol: string, range: string, interval: string) {
  return useQuery({
    queryKey: ["chart", symbol, range, interval],
    queryFn: async () => {
      const data = await fetchStockData("chart", { symbol, range, interval });
      const result = data?.chart?.result?.[0];
      if (!result) return [];
      const timestamps: number[] = result.timestamp || [];
      const closes: number[] = result.indicators?.quote?.[0]?.close || [];
      return timestamps.map((t: number, i: number) => ({
        timestamp: t,
        price: closes[i],
      }));
    },
    enabled: !!symbol,
    staleTime: 60000,
  });
}

export function useSymbolSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const data = await fetchStockData("search", { q: query });
      return data?.quotes || [];
    },
    enabled: query.length >= 2,
    staleTime: 120000,
  });
}

export interface EarningsEvent {
  date: number;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  quarter: number | null;
}

export function useEarnings(symbol: string) {
  return useQuery({
    queryKey: ["earnings", symbol],
    queryFn: async () => {
      const data = await fetchStockData("earnings", { symbol });
      return (data?.earnings || []) as EarningsEvent[];
    },
    enabled: !!symbol,
    staleTime: 300000,
  });
}

export function useCompanyProfile(symbol: string) {
  return useQuery({
    queryKey: ["company-profile", symbol],
    queryFn: async () => {
      const data = await fetchStockData("company-profile", { symbol });
      return data;
    },
    enabled: !!symbol,
    staleTime: 600000,
  });
}

export function useNews(symbol: string, companyName?: string) {
  return useQuery({
    queryKey: ["news", symbol],
    queryFn: async () => {
      const data = await fetchStockData("news", { symbol, companyName });
      return data?.articles || [];
    },
    enabled: !!symbol,
    staleTime: 300000,
  });
}

export function useRelevantNews(symbol: string, companyName?: string) {
  return useQuery({
    queryKey: ["relevant-news", symbol],
    queryFn: async () => {
      const data = await fetchStockData("relevant-news", { symbol, companyName });
      return { articles: data?.articles || [], queries: data?.queries || [] };
    },
    enabled: !!symbol,
    staleTime: 600000,
  });
}

export function useSentiment(symbol: string, articles: any[]) {
  return useQuery({
    queryKey: ["sentiment", symbol, articles?.length],
    queryFn: async () => {
      const data = await fetchStockData("sentiment", { symbol, articles: articles.slice(0, 8) });
      return data?.sentiment || null;
    },
    enabled: !!symbol && articles?.length > 0,
    staleTime: 600000,
  });
}

export interface Flight {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  geoAltitude: number;
  squawk: string;
  registration: string;
  type: string;
  military: boolean;
  category: string;
}

export function useFlights() {
  return useQuery({
    queryKey: ["flights"],
    queryFn: async () => {
      const data = await fetchStockData("flights", {});
      return (data?.flights || []) as Flight[];
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: 2000,
  });
}

export interface Ship {
  mmsi: string;
  name: string;
  longitude: number;
  latitude: number;
  heading: number;
  speed: number;
  type: string;
  destination: string;
  flag?: string;
  status: number;
  statusText?: string;
}

export function useShips() {
  return useQuery({
    queryKey: ["ships"],
    queryFn: async () => {
      const data = await fetchStockData("ships", {});
      return (data?.ships || []) as Ship[];
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
}

// ─── Deep Analysis ───────────────────────────────────────

export interface SupplyChainNode {
  category: string;
  keyPlayers: string[];
  risk: "HIGH" | "MEDIUM" | "LOW";
  notes: string;
  sourceUrl?: string;
}

export interface DeepAnalysis {
  supplyChain: {
    upstream: SupplyChainNode[];
    downstream: SupplyChainNode[];
    criticalDependencies: string[];
    singlePointsOfFailure: string[];
  };
  verticalIntegration: {
    owned: string[];
    outsourced: string[];
    expansionOpportunities: string[];
    integrationScore: string;
  };
  horizontalCompetition: {
    directCompetitors: Array<{ symbol: string; name: string; threatLevel: string; notes: string; sourceUrl?: string }>;
    marketPosition: string;
    moats: string[];
  };
  weatherClimateRisks: Array<{ event: string; probability: string; impact: string; affectedOperations: string; sourceUrl?: string }>;
  geopoliticalRisks: Array<{ risk: string; severity: string; exposure: string; mitigants: string; sourceUrl?: string }>;
  predictionMarketSignals: Array<{ outcome: string; impliedProbability: string; timeframe: string; reasoning: string; sourceUrl?: string }>;
  macroSensitivity: Array<{ factor: string; sensitivity: string; direction: string; notes: string; sourceUrl?: string }>;
  catalysts: Array<{ event: string; date: string; impact: string; direction: string; sourceUrl?: string }>;
  overallRiskScore: string;
  executiveBrief: string;
}

export function useDeepAnalysis(symbol: string, companyName?: string, profile?: any) {
  return useQuery({
    queryKey: ["deep-analysis", symbol],
    queryFn: async () => {
      const data = await fetchStockData("deep-analysis", { symbol, companyName, profile });
      return (data?.analysis || null) as DeepAnalysis | null;
    },
    enabled: !!symbol,
    staleTime: 600000,
  });
}

// ─── Polymarket ──────────────────────────────────────────

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  outcomePrices: string[];
  outcomes: string[];
  volume: number;
  liquidity: number;
  endDate: string;
  active: boolean;
  slug: string;
  url: string;
}

export function usePolymarket(symbol: string, companyName?: string, profile?: any) {
  return useQuery({
    queryKey: ["polymarket", symbol],
    queryFn: async () => {
      const data = await fetchStockData("polymarket", { symbol, companyName, profile });
      return {
        markets: (data?.markets || []) as PolymarketMarket[],
        queries: (data?.queries || []) as string[],
        searchUrl: data?.searchUrl || `https://polymarket.com/search?query=${encodeURIComponent(symbol)}`,
      };
    },
    enabled: !!symbol,
    staleTime: 300000,
  });
}

export interface PolymarketSummary {
  summary: string;
  bullishFactors: string[];
  bearishFactors: string[];
  overallImpact: string;
}

export function usePolymarketSummary(symbol: string, companyName?: string, markets?: PolymarketMarket[], profile?: any) {
  return useQuery({
    queryKey: ["polymarket-summary", symbol, markets?.length],
    queryFn: async () => {
      const data = await fetchStockData("polymarket-summary", { symbol, companyName, markets: (markets || []).slice(0, 8), profile });
      return (data?.summary || null) as PolymarketSummary | null;
    },
    enabled: !!symbol && (markets?.length ?? 0) > 0,
    staleTime: 600000,
  });
}

// ─── Orchestrator / Analysis ─────────────────────────────

export interface AnalysisBrief {
  executiveSummary: string;
  trendOverview: { direction: string; strength: string; description: string };
  drivers: string[];
  opportunities: string[];
  risks: string[];
  catalysts: Array<{ event: string; expectedDate: string; potentialImpact: string }>;
  uncertainty: string;
  whatToWatch: string[];
}

export interface AnalysisResult {
  brief: AnalysisBrief | null;
  quote: YahooQuote | null;
  news: any[];
  profile: any;
  earnings: any[];
  sentiment: any;
  dataStatus: {
    quote: boolean;
    news: boolean;
    profile: boolean;
    earnings: boolean;
    aiAvailable: boolean;
  };
}

export function useAnalysis(symbol: string, companyName?: string) {
  return useQuery({
    queryKey: ["analysis", symbol],
    queryFn: async () => {
      const data = await fetchStockData("analyze", { symbol, companyName });
      return data as AnalysisResult;
    },
    enabled: !!symbol,
    staleTime: 300000,
  });
}

// ─── Research Layer ──────────────────────────────────────

export interface ResearchFinding {
  topic: string;
  takeaway: string;
  impactOnAssets: string;
  whyItMatters: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface ResearchResult {
  overview: string;
  findings: ResearchFinding[];
  catalysts: string[];
}

export function useResearch(symbol: string, companyName?: string, query?: string) {
  return useQuery({
    queryKey: ["research", symbol, query],
    queryFn: async () => {
      const data = await fetchStockData("research", { symbol, companyName, query });
      return (data?.research || null) as ResearchResult | null;
    },
    enabled: !!symbol,
    staleTime: 600000,
  });
}

export function useMarketMovers() {
  return useQuery({
    queryKey: ["market-movers"],
    queryFn: async () => {
      const data = await fetchStockData("market-movers", {});
      return {
        winners: (data?.winners || []) as YahooQuote[],
        losers: (data?.losers || []) as YahooQuote[],
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export interface MarketPick {
  symbol: string;
  name: string;
  thesis: string;
  direction: "BULLISH" | "BEARISH";
  newsTitle: string;
  newsSource: string;
  quote: YahooQuote | null;
}

export function useMarketPicks() {
  return useQuery({
    queryKey: ["market-picks"],
    queryFn: async () => {
      const data = await fetchStockData("market-picks", {});
      return {
        picks: (data?.picks || []) as MarketPick[],
        macro: data?.macro || "",
      };
    },
    staleTime: 300000,
  });
}

export interface MarketInsightStock {
  symbol: string;
  name: string;
  thesis: string;
  relevantMarket: string;
  impliedProbability: string;
}

export interface MarketInsightsResult {
  winners: MarketInsightStock[];
  losers: MarketInsightStock[];
  summary: string;
  markets: any[];
  searchUrl: string;
}

export function useMarketInsights() {
  return useQuery({
    queryKey: ["market-insights"],
    queryFn: async () => {
      const data = await fetchStockData("market-insights", {});
      return data as MarketInsightsResult;
    },
    staleTime: 600000,
  });
}

export const TIME_RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1W", range: "5d", interval: "30m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1wk" },
  { label: "5Y", range: "5y", interval: "1mo" },
] as const;
