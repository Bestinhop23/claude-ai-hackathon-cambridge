import Link from "next/link";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { QueryForm } from "@/components/query-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runAnalysis } from "@/lib/orchestration/analyze";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; mode?: "concise" | "detailed" }>;
}) {
  const params = await searchParams;
  const query = params.query ?? "NVDA";
  const mode = params.mode === "detailed" ? "detailed" : "concise";
  const data = await runAnalysis({ query, mode });

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Analysis Dashboard</p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl">Structured brief for {query}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant={mode === "concise" ? "default" : "outline"}>
            <Link href={`/analysis?query=${encodeURIComponent(query)}&mode=concise`}>Concise</Link>
          </Button>
          <Button asChild variant={mode === "detailed" ? "default" : "outline"}>
            <Link href={`/analysis?query=${encodeURIComponent(query)}&mode=detailed`}>Detailed</Link>
          </Button>
        </div>
      </div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <QueryForm initialQuery={query} initialMode={mode} />
        </CardContent>
      </Card>
      <AnalysisDashboard data={data} />
    </main>
  );
}
