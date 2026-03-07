import { FlightShipMap } from "@/components/flight-ship-map";
import { GlobeView } from "@/components/globe-view";
import { ResearchPanel } from "@/components/research-panel";
import { SignalFeedPanel } from "@/components/signal-feed-panel";
import { StockImpactGrid } from "@/components/stock-impact-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorldOpportunityMap } from "@/components/world-opportunity-map";
import { runStockDataAction } from "@/lib/api/stock-data";
import { runAnalysis } from "@/lib/orchestration/analyze";

export default async function MapPage() {
  const data = await runAnalysis({ query: "AI infrastructure", mode: "detailed" });
  const flights = await runStockDataAction(new URLSearchParams({ action: "flights" }));
  const ships = await runStockDataAction(new URLSearchParams({ action: "ships" }));

  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Map View</p>
        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl">
          Global signals, regional opportunities, and stock exposure
        </h1>
      </div>

      <section className="panel-grid mb-6">
        <div className="grid-span-12">
          <GlobeView signals={data.raw.geographicSignals} />
        </div>
      </section>

      <section className="panel-grid mb-6">
        <WorldOpportunityMap signals={data.raw.geographicSignals} />
        <Card className="grid-span-12 grid-span-6">
          <CardHeader>
            <CardTitle>Map Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7">{data.brief.marketContext}</p>
            <div className="rounded-[28px] bg-[var(--accent-soft)] p-5 text-sm leading-7 text-[var(--accent)]">
              This page combines regional markers, a 3D globe, transport overlays, open-source signal feeds, research findings, and stock-level impact summaries in one view.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="panel-grid mb-6">
        <ResearchPanel research={data.raw.research} />
      </section>

      <section className="panel-grid mb-6">
        <div className="grid-span-12">
          <FlightShipMap
            flights={flights.data as Array<{ id: string; callsign: string; lat: number; lon: number; heading: number; origin: string; destination: string; isMilitary: boolean }>}
            ships={ships.data as Array<{ id: string; name: string; lat: number; lon: number; heading: number; type: string; origin: string; destination: string }>}
          />
        </div>
      </section>

      <section className="panel-grid mb-6">
        <SignalFeedPanel signals={data.raw.signals} />
      </section>

      <section className="panel-grid">
        <StockImpactGrid narratives={data.raw.stockNarratives} />
      </section>
    </main>
  );
}
