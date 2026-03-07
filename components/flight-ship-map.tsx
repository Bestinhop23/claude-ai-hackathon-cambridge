"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ClientMap = dynamic(() => import("@/components/maps/client-map"), {
  ssr: false,
});

export function FlightShipMap({
  flights,
  ships,
}: {
  flights: Array<{ id: string; callsign: string; lat: number; lon: number; heading: number; origin: string; destination: string; isMilitary: boolean }>;
  ships: Array<{ id: string; name: string; lat: number; lon: number; heading: number; type: string; origin: string; destination: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flights & Ships Map</CardTitle>
        <p className="text-sm text-[var(--muted)]">Leaflet view with simulated/live transport overlays similar to the Lovable map tab.</p>
      </CardHeader>
      <CardContent>
        <div className="h-[520px] min-h-[520px] overflow-hidden rounded-[28px]">
          <ClientMap flights={flights} ships={ships} />
        </div>
      </CardContent>
    </Card>
  );
}
