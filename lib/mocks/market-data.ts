import type { z } from "zod";
import {
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

type QuoteSnapshot = z.infer<typeof quoteSnapshotSchema>;
type ChartPoint = z.infer<typeof chartPointSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;
type EarningsRow = z.infer<typeof earningsRowSchema>;
type CompanyProfilePayload = z.infer<typeof companyProfilePayloadSchema>;
type Article = z.infer<typeof articleSchema>;
type SentimentPayload = z.infer<typeof sentimentPayloadSchema>;
type ExchangeRates = z.infer<typeof exchangeRatesSchema>;
type Flight = z.infer<typeof flightSchema>;
type Ship = z.infer<typeof shipSchema>;

const today = new Date("2026-03-07T12:00:00.000Z");

function series(base: number, drift: number, vol: number, points = 40): ChartPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (points - 1 - i));
    return {
      date: date.toISOString(),
      value: Number((base + drift * i + Math.sin(i / 3) * vol).toFixed(2)),
    };
  });
}

export const mockQuotes: Record<string, QuoteSnapshot> = {
  NVDA: { symbol: "NVDA", shortName: "NVIDIA", price: 156.42, change: 2.31, changePercent: 1.5, currency: "USD", marketState: "REGULAR" },
  AAPL: { symbol: "AAPL", shortName: "Apple", price: 214.1, change: -1.22, changePercent: -0.57, currency: "USD", marketState: "REGULAR" },
  MSFT: { symbol: "MSFT", shortName: "Microsoft", price: 428.4, change: 1.98, changePercent: 0.46, currency: "USD", marketState: "REGULAR" },
  AMZN: { symbol: "AMZN", shortName: "Amazon", price: 188.5, change: 0.72, changePercent: 0.38, currency: "USD", marketState: "REGULAR" },
  GOOGL: { symbol: "GOOGL", shortName: "Alphabet", price: 176.8, change: -0.21, changePercent: -0.12, currency: "USD", marketState: "REGULAR" },
  QQQ: { symbol: "QQQ", shortName: "Invesco QQQ", price: 501.24, change: 1.14, changePercent: 0.23, currency: "USD", marketState: "REGULAR" },
  SPY: { symbol: "SPY", shortName: "SPDR S&P 500 ETF", price: 579.8, change: 0.52, changePercent: 0.09, currency: "USD", marketState: "REGULAR" },
};

export const mockCharts: Record<string, ChartPoint[]> = {
  NVDA: series(118, 1.05, 4.2),
  AAPL: series(208, 0.22, 1.4),
  MSFT: series(410, 0.46, 2.1),
  AMZN: series(180, 0.3, 1.8),
  GOOGL: series(169, 0.2, 1.6),
  QQQ: series(490, 0.35, 1.5),
  SPY: series(568, 0.28, 1.1),
};

export const mockSearchResults: SearchResult[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", type: "Equity" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", type: "Equity" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", type: "ETF" },
];

export const mockEarnings: Record<string, EarningsRow[]> = {
  NVDA: [
    { period: "2025 Q2", actual: 0.71, estimate: 0.64, revenueActual: 30100, revenueEstimate: 28700 },
    { period: "2025 Q3", actual: 0.82, estimate: 0.76, revenueActual: 33800, revenueEstimate: 32300 },
    { period: "2025 Q4", actual: 0.89, estimate: 0.84, revenueActual: 36100, revenueEstimate: 34900 },
    { period: "2026 Q1", actual: 0.95, estimate: 0.9, revenueActual: 38700, revenueEstimate: 37200 },
  ],
  DEFAULT: [
    { period: "2025 Q2", actual: 1.22, estimate: 1.18, revenueActual: 10000, revenueEstimate: 9800 },
    { period: "2025 Q3", actual: 1.29, estimate: 1.24, revenueActual: 10300, revenueEstimate: 10000 },
    { period: "2025 Q4", actual: 1.35, estimate: 1.31, revenueActual: 10700, revenueEstimate: 10400 },
    { period: "2026 Q1", actual: 1.39, estimate: 1.34, revenueActual: 11000, revenueEstimate: 10750 },
  ],
};

export const mockProfiles: Record<string, CompanyProfilePayload> = {
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    logoUrl: "https://logo.clearbit.com/nvidia.com",
    sector: "Technology",
    industry: "Semiconductors",
    country: "United States",
    website: "https://www.nvidia.com",
    description: "NVIDIA designs GPUs, accelerated computing platforms, and AI infrastructure hardware and software.",
    metrics: [
      { label: "Market Cap", value: "$3.1T" },
      { label: "P/E", value: "47.8x" },
      { label: "Revenue Growth", value: "+71.4%" },
      { label: "Gross Margin", value: "74.1%" },
      { label: "Operating Margin", value: "58.2%" },
      { label: "Beta", value: "1.72" },
    ],
    peers: ["AMD", "AVGO", "MU", "MSFT"],
    recommendations: [
      { period: "2026-03", buy: 28, hold: 8, sell: 1, strongBuy: 19, strongSell: 0 },
    ],
  },
  DEFAULT: {
    symbol: "SPY",
    name: "Market Proxy",
    logoUrl: null,
    sector: "Multi-Sector",
    industry: "ETF",
    country: "United States",
    website: null,
    description: "A broad market proxy used as a fallback profile.",
    metrics: [
      { label: "Market Cap", value: "N/A" },
      { label: "P/E", value: "N/A" },
    ],
    peers: ["QQQ", "DIA"],
    recommendations: [],
  },
};

export const mockArticles: Record<string, Article[]> = {
  NVDA: [
    {
      id: "article-1",
      headline: "AI infrastructure orders remain strong across hyperscalers",
      source: "Open News Monitor",
      url: "https://example.com/articles/ai-infrastructure-orders",
      imageUrl: null,
      date: "2026-03-06",
      summary: "Demand remains concentrated in data-center buildouts, with a focus on compute, networking, and power availability.",
    },
    {
      id: "article-2",
      headline: "Export policy debates keep some semiconductor assumptions fragile",
      source: "Capital Brief",
      url: "https://example.com/articles/export-policy-semiconductors",
      imageUrl: null,
      date: "2026-03-05",
      summary: "Policy uncertainty is still a material variable for international demand expectations.",
    },
  ],
  DEFAULT: [
    {
      id: "article-3",
      headline: "Large-cap leadership remains narrow",
      source: "Macro Ledger",
      url: "https://example.com/articles/large-cap-leadership",
      imageUrl: null,
      date: "2026-03-06",
      summary: "Breadth remains selective even as index performance stays resilient.",
    },
  ],
};

export const mockRelevantNewsQueries: Record<string, string[]> = {
  NVDA: [
    "AI infrastructure power bottlenecks",
    "semiconductor export restrictions advanced accelerators",
    "hyperscaler capex accelerated computing demand",
    "data center cooling and networking constraints",
  ],
  DEFAULT: [
    "market breadth rate volatility mega cap leadership",
    "global supply chain logistics equity impact",
    "macro policy and valuation sensitivity",
    "industrial automation electrification demand",
  ],
};

export const mockSentiment: Record<string, SentimentPayload> = {
  NVDA: {
    stance: "BULLISH",
    confidence: 74,
    risk: "High expectations and policy uncertainty remain the main fragility.",
    summary: "The current evidence set still favors a constructive outlook because demand, margins, and external signals mostly reinforce the infrastructure buildout thesis.",
    keyFactors: [
      "Hyperscaler demand remains supportive",
      "Supply chain looks manageable rather than broken",
      "Policy risk still limits certainty",
    ],
  },
  DEFAULT: {
    stance: "NEUTRAL",
    confidence: 61,
    risk: "Leadership remains narrow, so sentiment can shift quickly.",
    summary: "The setup is balanced between resilient fundamentals and a market that still depends on a concentrated leadership group.",
    keyFactors: [
      "Rate sensitivity remains relevant",
      "Breadth is still selective",
      "Operational data is not signaling a major disruption",
    ],
  },
};

export const mockExchangeRates: ExchangeRates = {
  base: "USD",
  rates: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.78,
    INR: 87.2,
    JPY: 149.6,
  },
};

export const mockFlights: Flight[] = [
  {
    id: "flight-1",
    callsign: "DAL441",
    lat: 37.62,
    lon: -122.38,
    heading: 98,
    altitude: 32500,
    speed: 471,
    origin: "SFO",
    destination: "JFK",
    isMilitary: false,
  },
  {
    id: "flight-2",
    callsign: "RCH314",
    lat: 25.79,
    lon: -80.29,
    heading: 44,
    altitude: 28600,
    speed: 402,
    origin: "MIA",
    destination: "RMS",
    isMilitary: true,
  },
];

export const mockShips: Ship[] = [
  {
    id: "ship-1",
    name: "Pacific Meridian",
    lat: 1.21,
    lon: 103.8,
    heading: 72,
    speed: 18,
    type: "Container",
    origin: "Singapore",
    destination: "Busan",
  },
  {
    id: "ship-2",
    name: "Northern Atlas",
    lat: 31.22,
    lon: 32.3,
    heading: 180,
    speed: 14,
    type: "Tanker",
    origin: "Port Said",
    destination: "Jeddah",
  },
];
