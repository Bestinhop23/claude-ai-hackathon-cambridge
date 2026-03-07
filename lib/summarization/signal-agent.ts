import type { SignalRecord } from "@/lib/api/types";

export function buildSignalSummary(signals: SignalRecord[], tickers: string[]) {
  const filtered = signals.filter((signal) => signal.affectedTickers.some((ticker) => tickers.includes(ticker)));
  const positive = filtered.filter((signal) => signal.impactDirection === "positive").length;
  const negative = filtered.filter((signal) => signal.impactDirection === "negative").length;

  const summary =
    positive > negative
      ? "Open-source signals lean supportive, with logistics, public discussion, and operational indicators mostly reinforcing the current thesis."
      : negative > positive
        ? "Open-source signals are mixed to soft, with enough operational or sentiment caution to keep the setup more fragile."
        : "Open-source signals are mixed, which means the thesis still depends more on fundamentals and execution than on outside confirmation.";

  return {
    summary,
    bullets: filtered.slice(0, 4).map((signal) => `${signal.source}: ${signal.title}`),
  };
}

export function buildOpportunityOverlay(signals: SignalRecord[]) {
  return signals
    .filter((signal) => signal.impactDirection === "positive")
    .slice(0, 3)
    .map((signal) => ({
      title: signal.title,
      implication: `This can be supportive for ${signal.affectedTickers.join(", ")} if ${signal.summary.toLowerCase()}`,
    }));
}
