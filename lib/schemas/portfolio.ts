import { z } from "zod";
import { briefSchema, statusSourceSchema } from "@/lib/schemas/analysis";

export const holdingSchema = z.object({
  ticker: z.string().min(1),
  weight: z.number().positive().max(100),
});

export const portfolioRequestSchema = z.object({
  holdings: z.array(holdingSchema).min(1),
});

export const portfolioResponseSchema = z.object({
  holdings: z.array(
    holdingSchema.extend({
      name: z.string(),
      sector: z.string(),
      macroSensitivity: z.array(z.string()),
    }),
  ),
  totalWeight: z.number(),
  weightGap: z.number(),
  sectorExposure: z.array(
    z.object({
      sector: z.string(),
      weight: z.number(),
    }),
  ),
  topRisks: briefSchema.shape.risks,
  topOpportunities: briefSchema.shape.opportunities,
  watchItems: z.array(z.string()),
  portfolioImplications: z.string(),
  dataStatus: z.array(statusSourceSchema),
  generatedAt: z.string(),
});

export type PortfolioResponse = z.infer<typeof portfolioResponseSchema>;
