import { z } from "zod";

export const actionSchema = z.enum([
  "quote",
  "chart",
  "search",
  "earnings",
  "company-profile",
  "news",
  "relevant-news",
  "sentiment",
  "exchange-rates",
  "flights",
  "ships",
]);

export const quoteSnapshotSchema = z.object({
  symbol: z.string(),
  shortName: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  currency: z.string(),
  marketState: z.string(),
});

export const chartPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

export const searchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  type: z.string(),
});

export const earningsRowSchema = z.object({
  period: z.string(),
  actual: z.number(),
  estimate: z.number(),
  revenueActual: z.number().nullable(),
  revenueEstimate: z.number().nullable(),
});

export const analystRecommendationSchema = z.object({
  period: z.string(),
  buy: z.number(),
  hold: z.number(),
  sell: z.number(),
  strongBuy: z.number(),
  strongSell: z.number(),
});

export const profileMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const companyProfilePayloadSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  logoUrl: z.string().url().nullable(),
  sector: z.string(),
  industry: z.string(),
  country: z.string(),
  website: z.string().url().nullable(),
  description: z.string(),
  metrics: z.array(profileMetricSchema),
  peers: z.array(z.string()),
  recommendations: z.array(analystRecommendationSchema),
});

export const articleSchema = z.object({
  id: z.string(),
  headline: z.string(),
  source: z.string(),
  url: z.string().url(),
  imageUrl: z.string().url().nullable().optional(),
  date: z.string(),
  summary: z.string(),
  queryTag: z.string().optional(),
});

export const sentimentPayloadSchema = z.object({
  stance: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
  confidence: z.number().min(0).max(100),
  risk: z.string(),
  summary: z.string(),
  keyFactors: z.array(z.string()),
});

export const exchangeRatesSchema = z.object({
  base: z.string(),
  rates: z.record(z.string(), z.number()),
});

export const flightSchema = z.object({
  id: z.string(),
  callsign: z.string(),
  lat: z.number(),
  lon: z.number(),
  heading: z.number(),
  altitude: z.number(),
  speed: z.number(),
  origin: z.string(),
  destination: z.string(),
  isMilitary: z.boolean(),
});

export const shipSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  heading: z.number(),
  speed: z.number(),
  type: z.string(),
  origin: z.string(),
  destination: z.string(),
});
