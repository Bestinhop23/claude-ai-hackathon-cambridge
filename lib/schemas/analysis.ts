import { z } from "zod";

export const analysisModeSchema = z.enum(["concise", "detailed"]).default("concise");
export type AnalysisMode = z.infer<typeof analysisModeSchema>;

export const analyzeRequestSchema = z.object({
  query: z.string().min(1).max(120),
  mode: analysisModeSchema,
});

export const pricePointSchema = z.object({
  date: z.string(),
  close: z.number(),
  benchmarkClose: z.number(),
  volume: z.number(),
});

export const statusSourceSchema = z.object({
  source: z.string(),
  category: z.string(),
  status: z.enum(["live", "mock", "stale", "missing"]),
  updatedAt: z.string(),
  notes: z.string(),
});

export const opportunitySchema = z.object({
  assetOrTheme: z.string(),
  thesis: z.string(),
  supportingEvidence: z.array(z.string()),
  keyCatalysts: z.array(z.string()),
  mainRisks: z.array(z.string()),
  timeHorizon: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export const riskSchema = z.object({
  risk: z.string(),
  whyItMatters: z.string(),
  exposedAssetsOrThemes: z.array(z.string()),
  deteriorationSignals: z.array(z.string()),
  severity: z.enum(["low", "medium", "high"]),
  probability: z.enum(["low", "medium", "high"]),
});

export const catalystSchema = z.object({
  title: z.string(),
  dateLabel: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  description: z.string(),
});

export const briefSchema = z.object({
  executiveSummary: z.string(),
  marketContext: z.string(),
  currentTrends: z.array(z.string()),
  opportunities: z.array(opportunitySchema),
  risks: z.array(riskSchema),
  catalysts: z.array(catalystSchema),
  portfolioImplications: z.string(),
  whatToWatch: z.array(z.string()),
  uncertainty: z.string(),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  sourcesUsed: z.array(z.string()),
});

export const fundamentalsSnapshotSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  sector: z.string(),
  industry: z.string(),
  marketCap: z.number(),
  peRatio: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
  grossMargin: z.number().nullable(),
  operatingMargin: z.number().nullable(),
  dividendYield: z.number().nullable(),
  nextEarningsDate: z.string().nullable(),
  beta: z.number().nullable(),
});

export const newsItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  source: z.string(),
  url: z.string().url(),
  date: z.string(),
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

export const peerMetricSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  priceReturn1M: z.number(),
  peRatio: z.number().nullable(),
  revenueGrowth: z.number().nullable(),
});

export const stockNarrativeSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  region: z.string(),
  summary: z.string(),
  expectedEffect: z.string(),
  currentDrivers: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  relatedArticles: z.array(
    z.object({
      headline: z.string(),
      source: z.string(),
      url: z.string().url(),
      whyItMatters: z.string(),
    }),
  ),
  chart: z.array(
    z.object({
      date: z.string(),
      close: z.number(),
      benchmarkClose: z.number(),
    }),
  ),
});

export const geographicSignalSchema = z.object({
  region: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  status: z.enum(["opportunity", "watch", "risk"]),
  summary: z.string(),
  opportunities: z.array(z.string()),
  affectedStocks: z.array(z.string()),
  expectedEffect: z.string(),
});

export const signalRecordSchema = z.object({
  id: z.string(),
  kind: z.enum(["news", "social", "flight", "shipping", "weather"]),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  title: z.string(),
  summary: z.string(),
  region: z.string(),
  affectedTickers: z.array(z.string()),
  impactDirection: z.enum(["positive", "neutral", "negative"]),
  confidence: z.enum(["low", "medium", "high"]),
  observedAt: z.string(),
});

export const researchFindingSchema = z.object({
  topic: z.string(),
  takeaway: z.string(),
  impactOnAssets: z.array(z.string()),
  whyItMatters: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  citations: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
    }),
  ),
});

export const researchPayloadSchema = z.object({
  overview: z.string(),
  findings: z.array(researchFindingSchema),
});

export const analysisResponseSchema = z.object({
  request: analyzeRequestSchema.extend({
    kind: z.enum(["ticker", "theme", "watchlist"]),
  }),
  brief: briefSchema,
  raw: z.object({
    prices: z.array(pricePointSchema),
    fundamentals: z.array(fundamentalsSnapshotSchema),
    macroSummary: z.array(z.string()),
    news: z.array(newsItemSchema),
    peers: z.array(peerMetricSchema),
    stockNarratives: z.array(stockNarrativeSchema),
    geographicSignals: z.array(geographicSignalSchema),
    signals: z.array(signalRecordSchema),
    research: researchPayloadSchema,
  }),
  derived: z.object({
    trendDirection: z.enum(["improving", "mixed", "softening"]),
    priceChange1M: z.number(),
    relativePerformance1M: z.number(),
    volatilityEstimate: z.number(),
    drawdownEstimate: z.number(),
    earningsProximityDays: z.number().nullable(),
    sectorSignal: z.string(),
    valuationContext: z.string(),
  }),
  dataStatus: z.array(statusSourceSchema),
  generatedAt: z.string(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type Brief = z.infer<typeof briefSchema>;
