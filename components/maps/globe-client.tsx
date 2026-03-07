"use client";

import Globe from "react-globe.gl";

const regionCoordinates: Record<string, { lat: number; lng: number }> = {
  "North America": { lat: 39, lng: -98 },
  Europe: { lat: 50, lng: 10 },
  "East Asia": { lat: 35, lng: 120 },
  "Middle East": { lat: 25, lng: 45 },
  "Latin America": { lat: -14, lng: -58 },
  Global: { lat: 10, lng: 0 },
};

export default function GlobeClient({
  signals,
}: {
  signals: Array<{ region: string; label: string; status: "opportunity" | "watch" | "risk"; summary: string; affectedStocks: string[] }>;
}) {
  const points = signals.map((signal) => {
    const coords = regionCoordinates[signal.region] ?? regionCoordinates.Global;
    return {
      ...coords,
      size: signal.status === "opportunity" ? 0.55 : signal.status === "risk" ? 0.42 : 0.48,
      color: signal.status === "opportunity" ? "#1f7a52" : signal.status === "risk" ? "#b64646" : "#d4a15a",
      label: `<strong>${signal.region}</strong><br/>${signal.label}<br/>${signal.summary}<br/>${signal.affectedStocks.join(", ")}`,
    };
  });

  return (
    <Globe
      width={900}
      height={520}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
      backgroundColor="rgba(0,0,0,0)"
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointAltitude="size"
      pointColor="color"
      pointLabel="label"
      atmosphereColor="#d4a15a"
      atmosphereAltitude={0.2}
    />
  );
}
