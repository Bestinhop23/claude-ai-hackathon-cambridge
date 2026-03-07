import { z } from "zod";

const citationSchema = z.object({
  title: z.string(),
  url: z.string().url(),
});

const researchResponseSchema = z.object({
  overview: z.string(),
  findings: z.array(
    z.object({
      topic: z.string(),
      takeaway: z.string(),
      impactOnAssets: z.array(z.string()),
      whyItMatters: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      citations: z.array(citationSchema),
    }),
  ),
});

export type ResearchPayload = z.infer<typeof researchResponseSchema>;

function mockResearch(query: string, tickers: string[]): ResearchPayload {
  return {
    overview:
      "Perplexity-style research view indicates that infrastructure demand, logistics stability, and policy sensitivity remain the three main variables shaping the current setup.",
    findings: [
      {
        topic: "Infrastructure demand",
        takeaway: "Demand linked to compute, networking, and power capacity remains the strongest supportive thread.",
        impactOnAssets: tickers,
        whyItMatters: "If demand remains durable, opportunity framing stays constructive for the core names tied to AI infrastructure.",
        confidence: "high",
        citations: [
          { title: `${query} infrastructure demand`, url: "https://example.com/research/infrastructure-demand" },
        ],
      },
      {
        topic: "Policy and regulation",
        takeaway: "Trade and export rules remain a live source of fragility for globally exposed technology names.",
        impactOnAssets: tickers.slice(0, 2),
        whyItMatters: "This can cap upside or increase volatility even when the fundamental demand picture still looks healthy.",
        confidence: "medium",
        citations: [
          { title: `${query} policy risk`, url: "https://example.com/research/policy-risk" },
        ],
      },
    ],
  };
}

export async function getPerplexityResearch(input: {
  query: string;
  tickers: string[];
}): Promise<ResearchPayload> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const model = process.env.PERPLEXITY_MODEL || "sonar";

  if (!apiKey || process.env.CLEARVIEW_RESEARCH_PROVIDER !== "perplexity") {
    return mockResearch(input.query, input.tickers);
  }

  const prompt = `
Return strict JSON with keys: overview, findings.
Each finding must include: topic, takeaway, impactOnAssets, whyItMatters, confidence, citations.
Query: ${input.query}
Tickers: ${input.tickers.join(", ")}
Focus on market drivers, open opportunities, catalysts, operational risks, policy risks, logistics, weather, transport, and macro sensitivity.
Keep it plain English and grounded.`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return mockResearch(input.query, input.tickers);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      return mockResearch(input.query, input.tickers);
    }

    return researchResponseSchema.parse(JSON.parse(content));
  } catch {
    return mockResearch(input.query, input.tickers);
  }
}
