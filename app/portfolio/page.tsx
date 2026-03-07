import { PortfolioDashboard } from "@/components/portfolio-dashboard";
import { PortfolioInputForm } from "@/components/portfolio-input-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runPortfolioAnalysis } from "@/lib/orchestration/portfolio";

function parseHoldingsInput(input: string) {
  return input
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([A-Za-z.\-]+)\s+(\d+(?:\.\d+)?)%?$/);
      if (!match) {
        return null;
      }

      return {
        ticker: match[1].toUpperCase(),
        weight: Number(match[2]),
      };
    })
    .filter((item): item is { ticker: string; weight: number } => item !== null);
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ holdings?: string }>;
}) {
  const params = await searchParams;
  const holdingsInput = params.holdings ?? "AAPL 30%\nMSFT 20%\nQQQ 50%";
  const holdings = parseHoldingsInput(holdingsInput);
  const data = holdings.length ? await runPortfolioAnalysis({ holdings }) : null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Portfolio / Watchlist</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl">Manual holdings input with concentration and macro watchpoints</h1>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Paste holdings and weights</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioInputForm initialValue={holdingsInput} />
        </CardContent>
      </Card>
      {data ? (
        <PortfolioDashboard data={data} />
      ) : (
        <Card>
          <CardContent className="py-10 text-sm text-[var(--muted)]">
            Enter holdings in the format `AAPL 30%` on separate lines to generate the portfolio brief.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
