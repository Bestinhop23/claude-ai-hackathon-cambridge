"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";

export function ResearchPanel({ research }: { research: AnalysisResponse["raw"]["research"] }) {
  return (
    <Card className="grid-span-12">
      <CardHeader>
        <CardTitle>Research Layer</CardTitle>
        <p className="text-sm text-[var(--muted)]">Perplexity-informed findings feeding the opportunity, sentiment, and summary layers.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[28px] bg-[var(--accent-soft)] p-5 text-sm leading-7 text-[var(--accent)]">{research.overview}</div>
        <div className="grid gap-4 lg:grid-cols-2">
          {research.findings.map((finding) => (
            <div key={finding.topic} className="rounded-[28px] border border-[var(--border)] bg-white/55 p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-semibold">{finding.topic}</p>
                <span className="rounded-full bg-[#f8f4eb] px-3 py-1 text-xs uppercase tracking-[0.12em]">{finding.confidence}</span>
              </div>
              <p className="text-sm leading-6">{finding.takeaway}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Why it matters:</strong> {finding.whyItMatters}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Affected assets:</strong> {finding.impactOnAssets.join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {finding.citations.map((citation) => (
                  <a
                    key={citation.url}
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs transition hover:bg-[#f8f4eb]"
                  >
                    {citation.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
