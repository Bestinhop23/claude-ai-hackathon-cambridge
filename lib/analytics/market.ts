import type { FundamentalsRecord, PriceSeries } from "@/lib/api/types";

export function computeMarketDerived(series: PriceSeries, fundamentals: FundamentalsRecord, sectorSignal: string) {
  const first = series.points[0];
  const last = series.points[series.points.length - 1];
  const priceChange1M = ((last.close - first.close) / first.close) * 100;
  const benchmarkChange1M = ((last.benchmarkClose - first.benchmarkClose) / first.benchmarkClose) * 100;
  const relativePerformance1M = priceChange1M - benchmarkChange1M;

  const returns = series.points.slice(1).map((point, index) => {
    const previous = series.points[index].close;
    return (point.close - previous) / previous;
  });

  const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / Math.max(returns.length, 1);
  const volatilityEstimate = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const peak = Math.max(...series.points.map((point) => point.close));
  const drawdownEstimate = ((last.close - peak) / peak) * 100;

  const earningsProximityDays = fundamentals.nextEarningsDate
    ? Math.round(
        (new Date(fundamentals.nextEarningsDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  let trendDirection: "improving" | "mixed" | "softening" = "mixed";
  if (priceChange1M > 6 && relativePerformance1M > 1) {
    trendDirection = "improving";
  } else if (priceChange1M < 0 || relativePerformance1M < -2) {
    trendDirection = "softening";
  }

  const valuationContext =
    fundamentals.peRatio == null
      ? "Valuation multiples are not available for this asset."
      : `${fundamentals.companyName} trades near ${fundamentals.peRatio.toFixed(1)}x earnings, which frames the setup as ${fundamentals.peRatio > 35 ? "demanding and execution-sensitive" : "reasonable relative to growth durability"}.`;

  return {
    trendDirection,
    priceChange1M,
    relativePerformance1M,
    volatilityEstimate,
    drawdownEstimate,
    earningsProximityDays,
    sectorSignal,
    valuationContext,
  };
}

export function computePortfolioDerived(
  holdings: Array<{
    ticker: string;
    weight: number;
    sector: string;
    macroSensitivity: string[];
  }>,
) {
  const totalWeight = holdings.reduce((sum, holding) => sum + holding.weight, 0);
  const sectorExposure = Object.values(
    holdings.reduce<Record<string, { sector: string; weight: number }>>((acc, holding) => {
      const current = acc[holding.sector] ?? { sector: holding.sector, weight: 0 };
      current.weight += holding.weight;
      acc[holding.sector] = current;
      return acc;
    }, {}),
  ).sort((a, b) => b.weight - a.weight);

  return {
    totalWeight,
    weightGap: 100 - totalWeight,
    sectorExposure,
  };
}
