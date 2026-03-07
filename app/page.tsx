import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, ShieldCheck, Telescope } from "lucide-react";
import { CurrencySelector } from "@/components/currency-selector";
import { Disclaimer } from "@/components/disclaimer";
import { MarketOverview } from "@/components/market-overview";
import { QueryForm } from "@/components/query-form";
import { StockSearch } from "@/components/stock-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
      <header className="mb-12 flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">ClearView</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Professional-style market briefs for everyday investors.</p>
        </div>
        <div className="flex gap-2">
          <CurrencySelector />
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/map">Map view</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/portfolio">Portfolio view</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/analysis?query=NVDA&mode=concise">Open demo</Link>
          </Button>
        </div>
      </header>

      <section className="panel-grid items-stretch">
        <div className="grid-span-12 grid-span-8 flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center rounded-full border border-[var(--border)] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Single orchestrator. Multi-source evidence. Plain-English output.
          </div>
          <h1 className="max-w-4xl font-[family-name:var(--font-fraunces)] text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            Accessible investment decision support with clarity, structure, and visible uncertainty.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--foreground)]/78">
            Enter a ticker, market theme, watchlist, or mini portfolio. ClearView pulls multiple data streams, normalizes
            them, computes derived signals, and returns a concise investment brief covering what is happening, why it is
            happening, the main risks, strongest opportunities, catalysts, and what to watch next.
          </p>
          <div className="mt-8 max-w-4xl">
            <QueryForm />
          </div>
          <div className="mt-4 max-w-xl">
            <StockSearch />
          </div>
          <div className="mt-6 max-w-3xl">
            <Disclaimer />
          </div>
        </div>

        <Card className="grid-span-12 grid-span-4 overflow-hidden">
          <CardHeader>
            <CardTitle>Demo-Ready Flow</CardTitle>
            <p className="text-sm text-[var(--muted)]">Credible enough for a room, approachable enough for a first-time investor.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Feature
              icon={<Telescope className="size-5" />}
              title="Clear brief structure"
              text="What is happening, why it matters, the opportunities, the risks, catalysts, and the uncertainty."
            />
            <Feature
              icon={<ChartNoAxesCombined className="size-5" />}
              title="Visual evidence"
              text="Trend charts, map signals, peer context, valuation tiles, and source status are visible instead of hidden."
            />
            <Feature
              icon={<ShieldCheck className="size-5" />}
              title="Trust-preserving UX"
              text="No deterministic claims and no trading language, with a visible data quality layer for every analysis."
            />
            <Button asChild className="w-full">
              <Link href="/analysis?query=AI%20infrastructure&mode=detailed">
                Analyze a market theme
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        <ValueCard
          title="More rigorous than chat"
          copy="Structured sections, explicit source usage, and confidence plus uncertainty surfaced in the interface."
        />
        <ValueCard
          title="More approachable than a terminal"
          copy="A calm visual system, strong hierarchy, and plain-English writing for non-expert investors."
        />
        <ValueCard
          title="Mock-first, live-ready"
          copy="Runs cleanly without API keys, but the adapter layer supports swapping in live providers when available."
        />
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Market Overview</p>
          <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl">Live-style market cards</h2>
        </div>
        <MarketOverview />
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-white/55 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-2xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">{text}</p>
    </div>
  );
}

function ValueCard({ title, copy }: { title: string; copy: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-7 text-[var(--muted)]">{copy}</p>
      </CardContent>
    </Card>
  );
}
