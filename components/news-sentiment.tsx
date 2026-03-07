"use client";

import { useState } from "react";
import { Brain, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewsSentiment({
  sentiment,
  relevantNews,
  latestNews,
}: {
  sentiment: { stance: "BULLISH" | "BEARISH" | "NEUTRAL"; confidence: number; risk: string; summary: string; keyFactors: string[] };
  relevantNews: { queries: string[]; articles: Array<{ id: string; headline: string; source: string; url: string; summary: string; queryTag?: string }> };
  latestNews: Array<{ id: string; headline: string; source: string; url: string; summary: string }>;
}) {
  const [selected, setSelected] = useState<{ headline: string; summary: string; url: string } | null>(null);

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(217,119,87,0.22)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[rgba(217,119,87,0.14)] p-2 text-[var(--accent)]">
              <Brain className="size-4" />
            </div>
            <div>
              <CardTitle>Claude Sentiment Analysis</CardTitle>
              <p className="text-sm text-[var(--muted)]">AI-curated outlook using news and signal evidence.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={sentiment.stance === "BULLISH" ? "success" : sentiment.stance === "BEARISH" ? "danger" : "neutral"}>
              {sentiment.stance}
            </Badge>
            <Badge variant="warning">{sentiment.confidence}% confidence</Badge>
          </div>
          <p className="text-sm leading-7">{sentiment.summary}</p>
          <p className="text-sm text-[var(--muted)]"><strong className="text-[var(--foreground)]">Risk:</strong> {sentiment.risk}</p>
          <ul className="space-y-2 text-sm">
            {sentiment.keyFactors.map((factor) => (
              <li key={factor}>• {factor}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relevant News Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {relevantNews.queries.map((query) => (
              <Badge key={query} variant="warning">{query}</Badge>
            ))}
          </div>
          {relevantNews.articles.map((article) => (
            <button key={article.id} type="button" onClick={() => setSelected(article)} className="block w-full rounded-2xl border border-[var(--border)] bg-white/55 p-4 text-left">
              <p className="font-medium">{article.headline}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{article.source}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest News</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestNews.map((article) => (
            <button key={article.id} type="button" onClick={() => setSelected(article)} className="block w-full rounded-2xl border border-[var(--border)] bg-white/55 p-4 text-left">
              <p className="font-medium">{article.headline}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{article.source}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-xl font-semibold">{selected.headline}</p>
            <p className="mt-4 text-sm leading-7">{selected.summary}</p>
            <a href={selected.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center text-sm font-medium text-[var(--accent)]">
              Open article
              <ExternalLink className="ml-2 size-4" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
