import type { NewsRecord, SignalRecord } from "@/lib/api/types";

type SentimentInput = {
  query: string;
  tickers: string[];
  news: NewsRecord[];
  signals: SignalRecord[];
  research?: {
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
};

type SentimentOutput = {
  marketSummary: string;
  tickerImpact: Record<string, string>;
};

function heuristicSentiment(input: SentimentInput): SentimentOutput {
  const positive = input.signals.filter((signal) => signal.impactDirection === "positive").length;
  const negative = input.signals.filter((signal) => signal.impactDirection === "negative").length;
  const marketSummary =
    positive > negative
      ? "Signals lean constructive overall, with external evidence mostly supportive of the current outlook."
      : negative > positive
        ? "Signals are cautious overall, so the outlook remains more sensitive to adverse surprises."
        : "Signals are mixed overall, so the outlook still depends on company execution and broader market conditions.";

  const tickerImpact = Object.fromEntries(
    input.tickers.map((ticker) => {
      const tickerSignals = input.signals.filter((signal) => signal.affectedTickers.includes(ticker));
      const pos = tickerSignals.filter((signal) => signal.impactDirection === "positive").length;
      const neg = tickerSignals.filter((signal) => signal.impactDirection === "negative").length;
      const text =
        pos > neg
          ? `${ticker} has a supportive external signal backdrop, which can help reinforce the existing thesis if fundamentals stay firm.`
          : neg > pos
            ? `${ticker} has a more fragile external signal backdrop, which can weigh on sentiment until new evidence improves.`
            : `${ticker} has a mixed external signal backdrop, so price reaction is likely to stay headline-sensitive.`;
      return [ticker, text];
    }),
  );

  return { marketSummary, tickerImpact };
}

export async function getClaudeSentiment(input: SentimentInput): Promise<SentimentOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  if (!apiKey || process.env.CLEARVIEW_SENTIMENT_PROVIDER !== "claude") {
    return heuristicSentiment(input);
  }

  const prompt = {
    query: input.query,
    tickers: input.tickers,
    news: input.news.map((item) => ({
      headline: item.headline,
      source: item.source,
      summary: item.summary,
      url: item.url,
    })),
    signals: input.signals.map((item) => ({
      kind: item.kind,
      source: item.source,
      summary: item.summary,
      affectedTickers: item.affectedTickers,
      impactDirection: item.impactDirection,
    })),
    research: input.research,
    instruction:
      "Return strict JSON with keys marketSummary and tickerImpact. Write plain-English sentiment/impact summaries for each ticker. Be explicit about uncertainty and do not make deterministic claims.",
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ],
      }),
    });

    if (!response.ok) {
      return heuristicSentiment(input);
    }

    const json = await response.json();
    const text = json?.content?.[0]?.text;
    if (!text) {
      return heuristicSentiment(input);
    }

    const parsed = JSON.parse(text) as SentimentOutput;
    if (!parsed.marketSummary || !parsed.tickerImpact) {
      return heuristicSentiment(input);
    }

    return parsed;
  } catch {
    return heuristicSentiment(input);
  }
}
