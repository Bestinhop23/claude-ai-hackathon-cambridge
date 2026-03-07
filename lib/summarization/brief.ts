import type { FundamentalsRecord, MacroRecord, NewsRecord, SectorRecord } from "@/lib/api/types";
import type { AnalysisMode, Brief } from "@/lib/schemas/analysis";
import { buildOpportunityOverlay, buildSignalSummary } from "@/lib/summarization/signal-agent";
import type { SignalRecord } from "@/lib/api/types";

type SummarizerInput = {
  mode: AnalysisMode;
  kind: "ticker" | "theme" | "watchlist";
  query: string;
  fundamentals: FundamentalsRecord;
  macro: MacroRecord;
  sector: SectorRecord;
  news: NewsRecord[];
  signals: SignalRecord[];
  sentimentSummary: string;
  research: {
    overview: string;
    findings: Array<{
      topic: string;
      takeaway: string;
      impactOnAssets: string[];
      whyItMatters: string;
      confidence: "low" | "medium" | "high";
      citations: Array<{ title: string; url: string }>;
    }>;
  };
  derived: {
    trendDirection: "improving" | "mixed" | "softening";
    priceChange1M: number;
    relativePerformance1M: number;
    volatilityEstimate: number;
    drawdownEstimate: number;
    earningsProximityDays: number | null;
    valuationContext: string;
  };
};

function confidenceLevel(input: SummarizerInput): "low" | "medium" | "high" {
  if (input.derived.volatilityEstimate > 50 || input.news.some((item) => item.sentiment === "negative")) {
    return "medium";
  }
  return input.kind === "ticker" ? "high" : "medium";
}

export function generateBrief(input: SummarizerInput): Brief {
  const companyLabel = input.kind === "theme" ? input.query : input.fundamentals.companyName;
  const confidence = confidenceLevel(input);
  const detailed = input.mode === "detailed";
  const signalView = buildSignalSummary(input.signals, [input.fundamentals.ticker]);
  const signalOpportunities = buildOpportunityOverlay(input.signals);
  const earningsLine =
    input.derived.earningsProximityDays == null
      ? "No near-term earnings date is available in the current dataset."
      : `Next earnings is roughly ${input.derived.earningsProximityDays} days away, which can reshape the risk-reward quickly.`;

  return {
    executiveSummary: `${companyLabel} is in a ${input.derived.trendDirection} setup: price action is ${input.derived.relativePerformance1M >= 0 ? "outpacing" : "lagging"} the benchmark, the main narrative is still tied to ${input.sector.sectorSignal.toLowerCase()}, and the decision case is most sensitive to execution durability rather than market hype. ${input.research.overview}`,
    marketContext: `${input.macro.regime}. ${input.macro.bulletPoints[0]} ${input.sentimentSummary} ${input.research.findings[0]?.takeaway ?? ""} ${detailed ? input.macro.bulletPoints[1] : ""}`.trim(),
    currentTrends: [
      `Recent price performance is ${input.derived.priceChange1M.toFixed(1)}% over the last month versus ${input.derived.relativePerformance1M.toFixed(1)} percentage points relative performance.`,
      input.sector.sectorSignal,
      signalView.summary,
      earningsLine,
    ],
    opportunities: [
      {
        assetOrTheme: companyLabel,
        thesis:
          input.derived.relativePerformance1M >= 0
            ? "Leadership is being reinforced by durable demand and a market willing to pay for execution quality."
            : "A softer tape could still create an opportunity if fundamentals remain firmer than the price action implies.",
        supportingEvidence: [
          `Revenue growth context: ${input.fundamentals.revenueGrowth ?? 0}%`,
          `Operating margin context: ${input.fundamentals.operatingMargin ?? 0}%`,
          input.news[0]?.headline ?? "Recent coverage remains constructive on the core thesis.",
          ...signalView.bullets.slice(0, 2),
          ...(input.research.findings[0] ? [`Research: ${input.research.findings[0].takeaway}`] : []),
        ],
        keyCatalysts: [
          input.fundamentals.nextEarningsDate
            ? `Earnings on or around ${input.fundamentals.nextEarningsDate}`
            : "The next company update on demand and margins",
          "Any confirmation that sector demand breadth is expanding",
          ...signalOpportunities.map((item) => item.title),
          ...input.research.findings.slice(0, 2).map((item) => item.topic),
        ],
        mainRisks: [
          "Valuation compression if rates move higher",
          "Execution or supply constraints interrupting the current narrative",
        ],
        timeHorizon: detailed ? "1 to 3 quarters" : "Next quarter",
        confidence,
      },
    ],
    risks: [
      {
        risk: "Narrative concentration",
        whyItMatters:
          "When a large share of expectations is tied to one theme, even good results can disappoint if they are merely in line.",
        exposedAssetsOrThemes: [companyLabel, input.fundamentals.sector],
        deteriorationSignals: [
          "Relative performance fades for several weeks",
          "Management commentary turns more cautious on demand visibility",
        ],
        severity: input.fundamentals.peRatio != null && input.fundamentals.peRatio > 35 ? "high" : "medium",
        probability: "medium",
      },
      {
        risk: "Macro valuation pressure",
        whyItMatters: "Higher real yields and tighter financial conditions can compress multiples even when operations remain solid.",
        exposedAssetsOrThemes: [companyLabel, "Long-duration growth"],
        deteriorationSignals: ["10Y yield re-accelerates higher", "Market breadth narrows further"],
        severity: "medium",
        probability: "medium",
      },
    ],
    catalysts: [
      {
        title: "Next earnings update",
        dateLabel: input.fundamentals.nextEarningsDate ?? "Date not available",
        impact: "high",
        description: "Watch for demand durability, margin profile, and any change in forward commentary.",
      },
      {
        title: "Macro rate and inflation prints",
        dateLabel: "Next 2-4 weeks",
        impact: "medium",
        description: "A calmer rate backdrop would help support premium multiple assets.",
      },
      {
        title: "Sector breadth confirmation",
        dateLabel: "Ongoing",
        impact: "medium",
        description: "Broader participation would make the current setup more resilient.",
      },
    ],
    portfolioImplications:
      "The main portfolio question is not whether the thesis exists, but how much concentration and valuation sensitivity you are willing to carry while the setup stays fundamentally strong but still expectation-heavy.",
    whatToWatch: [
      "Benchmark-relative performance after major headlines",
      "Changes in management tone on demand visibility or pricing",
      "Macro data that affects the rate backdrop",
      "Whether supporting peers confirm or contradict the leadership story",
      ...input.research.findings.slice(0, 2).map((item) => item.whyItMatters),
    ],
    uncertainty: `${input.derived.valuationContext} Facts are separated from inference here, but data coverage is still only as strong as the connected providers and the freshness of news flow.`,
    confidenceLevel: confidence,
    sourcesUsed: [
      input.fundamentals.companyName,
      "Price history",
      "Fundamentals snapshot",
      "News summaries",
      "Macro context",
      "Sector comparison",
    ],
  };
}
