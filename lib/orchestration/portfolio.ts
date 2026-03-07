import { computePortfolioDerived } from "@/lib/analytics/market";
import { getMockFallbackProviders, getProviders, withMockFallback } from "@/lib/api/providers";
import { portfolioRequestSchema, portfolioResponseSchema, type PortfolioResponse } from "@/lib/schemas/portfolio";

const macroSensitivityMap: Record<string, string[]> = {
  NVDA: ["AI capex", "Real yields", "Export policy"],
  AAPL: ["Consumer demand", "FX", "Supply chain"],
  MSFT: ["Enterprise IT budgets", "Cloud demand", "AI monetization"],
  QQQ: ["Large-cap tech breadth", "Rates", "Risk appetite"],
};

export async function runPortfolioAnalysis(input: { holdings: Array<{ ticker: string; weight: number }> }): Promise<PortfolioResponse> {
  const request = portfolioRequestSchema.parse(input);
  const providers = getProviders();
  const fallbackProviders = getMockFallbackProviders();

  const enrichedHoldings = await Promise.all(
    request.holdings.map(async (holding) => {
      const fundamentals = await withMockFallback(
        () => providers.fundamentals.getFundamentals({ ticker: holding.ticker }),
        () => fallbackProviders.fundamentals.getFundamentals({ ticker: holding.ticker }),
      );

      return {
        ticker: holding.ticker,
        weight: holding.weight,
        name: fundamentals.data.companyName,
        sector: fundamentals.data.sector,
        macroSensitivity: macroSensitivityMap[holding.ticker] ?? ["Rates", "Growth expectations"],
        status: {
          source: fundamentals.source,
          category: `holding:${holding.ticker}`,
          status: fundamentals.status,
          updatedAt: fundamentals.updatedAt,
          notes: fundamentals.notes,
        },
      };
    }),
  );

  const derived = computePortfolioDerived(enrichedHoldings);
  const leadSector = derived.sectorExposure[0];
  const topHolding = [...enrichedHoldings].sort((a, b) => b.weight - a.weight)[0];

  const response = {
    holdings: enrichedHoldings.map((holding) => ({
      ticker: holding.ticker,
      weight: holding.weight,
      name: holding.name,
      sector: holding.sector,
      macroSensitivity: holding.macroSensitivity,
    })),
    totalWeight: derived.totalWeight,
    weightGap: derived.weightGap,
    sectorExposure: derived.sectorExposure,
    topRisks: [
      {
        risk: "Concentration in a single theme",
        whyItMatters: `The portfolio is tilted toward ${leadSector?.sector ?? "one sector"}, which can amplify both gains and drawdowns when leadership narrows.`,
        exposedAssetsOrThemes: enrichedHoldings.filter((item) => item.sector === leadSector?.sector).map((item) => item.ticker),
        deteriorationSignals: ["Breadth fades", "One holding begins driving most daily movement"],
        severity: leadSector && leadSector.weight >= 50 ? "high" : "medium",
        probability: "medium",
      },
      {
        risk: "Top holding dominates outcomes",
        whyItMatters: `${topHolding.ticker} is the largest position at ${topHolding.weight}%, which means company-specific surprises can disproportionately affect the portfolio.`,
        exposedAssetsOrThemes: [topHolding.ticker],
        deteriorationSignals: ["Position-specific gap moves", "Earnings miss or guidance reset"],
        severity: topHolding.weight >= 35 ? "high" : "medium",
        probability: "medium",
      },
    ],
    topOpportunities: [
      {
        assetOrTheme: leadSector?.sector ?? "Portfolio mix",
        thesis: "The current allocation is positioned to benefit if market leadership remains concentrated in durable cash-flow and infrastructure-linked names.",
        supportingEvidence: [
          `Largest sector weight: ${leadSector?.weight.toFixed(1) ?? "0"}%`,
          `Top holding: ${topHolding.ticker} at ${topHolding.weight.toFixed(1)}%`,
        ],
        keyCatalysts: ["Upcoming earnings across the largest positions", "Any improvement in macro breadth"],
        mainRisks: ["Leadership rotation away from current winners", "Rates move higher"],
        timeHorizon: "Next 1 to 2 quarters",
        confidence: "medium",
      },
    ],
    watchItems: [
      derived.weightGap === 0
        ? "Weights are internally consistent at 100%."
        : `Weights sum to ${derived.totalWeight.toFixed(1)}%, so the portfolio input should be normalized before making conclusions.`,
      `${topHolding.ticker} is the highest-conviction position; monitor its earnings and relative performance first.`,
      `Sector exposure is led by ${leadSector?.sector ?? "mixed sectors"} at ${leadSector?.weight.toFixed(1) ?? "0"}%.`,
    ],
    portfolioImplications:
      "This mix can work if leadership stays concentrated, but the view makes clear where single-name and single-sector dependence begins to dominate portfolio behavior.",
    dataStatus: enrichedHoldings.map((holding) => holding.status),
    generatedAt: new Date().toISOString(),
  };

  return portfolioResponseSchema.parse(response);
}
