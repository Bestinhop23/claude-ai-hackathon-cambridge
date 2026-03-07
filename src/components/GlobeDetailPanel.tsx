import { useEffect, useMemo, useState } from "react";
import {
  X,
  Plane,
  Anchor,
  CloudLightning,
  Satellite,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Flight, Ship } from "@/hooks/useStockData";

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  latitude: number;
  longitude: number;
  areaDesc: string;
  onset?: string;
  expires?: string;
}

export interface SatelliteInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  type: "leo" | "meo" | "geo" | "station";
  inclination: number;
}

export type SelectedItem =
  | { type: "flight"; data: Flight }
  | { type: "ship"; data: Ship }
  | { type: "weather"; data: WeatherAlert }
  | { type: "satellite"; data: SatelliteInfo };

interface Props {
  item: SelectedItem;
  onClose: () => void;
  historyHours: number;
}

const aircraftPhotoCache = new Map<string, string | null>();
const stockImpactCache = new Map<string, any>();
const stockImpactInFlight = new Map<string, Promise<any>>();

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function toItemKey(item: SelectedItem) {
  if (item.type === "flight") return `flight:${item.data.icao24}`;
  if (item.type === "ship") return `ship:${item.data.mmsi}`;
  if (item.type === "weather") return `weather:${item.data.id}`;
  return `satellite:${item.data.id}`;
}

function isRelevantForMarketImpact(item: SelectedItem) {
  if (item.type === "flight") {
    return (
      item.data.military ||
      item.data.squawk === "7700" ||
      item.data.squawk === "7600" ||
      item.data.squawk === "7500"
    );
  }

  if (item.type === "ship") {
    const typeText = String(item.data.type || "").toLowerCase();
    return /(military|navy|warship|coast guard|patrol|tanker|lng)/.test(typeText);
  }

  if (item.type === "weather") {
    return item.data.severity === "Extreme" || item.data.severity === "Severe";
  }

  return false;
}

function marketImpactSignature(item: SelectedItem) {
  if (item.type === "flight") {
    return [
      "flight",
      item.data.icao24,
      item.data.military ? "mil" : "civ",
      item.data.squawk || "none",
      item.data.type || "unknown",
    ].join(":");
  }

  if (item.type === "ship") {
    return ["ship", item.data.mmsi, String(item.data.type || "unknown")].join(":");
  }

  if (item.type === "weather") {
    return ["weather", item.data.id, item.data.event, item.data.severity].join(":");
  }

  return `satellite:${item.data.id}`;
}

function buildMarketImpactDescription(item: SelectedItem) {
  if (item.type === "flight") {
    const flight = item.data;
    return `Aircraft ${flight.callsign || flight.icao24} (${flight.type || "unknown"})${flight.military ? " [MILITARY]" : ""}, squawk ${flight.squawk || "none"}, altitude ${flight.altitude}m.`;
  }

  if (item.type === "ship") {
    const ship = item.data;
    return `Vessel ${ship.name || "unknown"} (${ship.type || "unknown"}) at ${Number(ship.speed || 0).toFixed(1)} kn toward ${ship.destination || "unknown"}.`;
  }

  if (item.type === "weather") {
    const weather = item.data;
    return `Weather event ${weather.event} (${weather.severity}) in ${weather.areaDesc}.`;
  }

  return "Satellite event";
}

async function fetchMarketImpact(eventType: string, description: string) {
  const { data } = await supabase.functions.invoke("stock-data", {
    body: {
      action: "stock-impact",
      params: { eventType, description },
    },
  });

  return data?.impact ?? null;
}

function DataRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="max-w-[65%] truncate text-right font-mono-nums text-xs text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export default function GlobeDetailPanel({ item, onClose, historyHours }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [impact, setImpact] = useState<any>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const itemKey = useMemo(() => toItemKey(item), [item]);
  const impactKey = useMemo(() => marketImpactSignature(item), [item]);
  const shouldAnalyze = useMemo(() => isRelevantForMarketImpact(item), [item]);

  useEffect(() => {
    setPhoto(null);

    if (item.type !== "flight") return;

    const aircraftHex = item.data.icao24?.toLowerCase();
    if (!aircraftHex) return;

    if (aircraftPhotoCache.has(aircraftHex)) {
      setPhoto(aircraftPhotoCache.get(aircraftHex) || null);
      return;
    }

    let cancelled = false;

    fetch(`https://api.planespotters.net/pub/photos/hex/${aircraftHex}`)
      .then((response) => response.json())
      .then((data) => {
        const imageUrl =
          data?.photos?.[0]?.thumbnail_large?.src || data?.photos?.[0]?.thumbnail?.src || null;
        aircraftPhotoCache.set(aircraftHex, imageUrl);
        if (!cancelled) setPhoto(imageUrl);
      })
      .catch(() => {
        aircraftPhotoCache.set(aircraftHex, null);
      });

    return () => {
      cancelled = true;
    };
  }, [itemKey, item]);

  useEffect(() => {
    setImpact(null);

    if (!shouldAnalyze) return;

    if (stockImpactCache.has(impactKey)) {
      setImpact(stockImpactCache.get(impactKey));
      return;
    }

    let cancelled = false;
    setImpactLoading(true);

    const pendingRequest =
      stockImpactInFlight.get(impactKey) ||
      fetchMarketImpact(item.type, buildMarketImpactDescription(item)).then((result) => {
        stockImpactCache.set(impactKey, result);
        stockImpactInFlight.delete(impactKey);
        return result;
      });

    stockImpactInFlight.set(impactKey, pendingRequest);

    pendingRequest
      .then((result) => {
        if (!cancelled) setImpact(result);
      })
      .finally(() => {
        if (!cancelled) setImpactLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [impactKey, item, shouldAnalyze]);

  const title =
    item.type === "flight"
      ? item.data.callsign || item.data.icao24
      : item.type === "ship"
        ? item.data.name || `MMSI ${item.data.mmsi}`
        : item.type === "weather"
          ? item.data.event
          : item.data.name;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-[1100] w-[380px] max-h-[75vh] overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {item.type === "flight" && <Plane className="h-4 w-4 text-foreground" />}
        {item.type === "ship" && <Anchor className="h-4 w-4 text-foreground" />}
        {item.type === "weather" && <CloudLightning className="h-4 w-4 text-foreground" />}
        {item.type === "satellite" && <Satellite className="h-4 w-4 text-foreground" />}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {item.type === "flight"
              ? "Flight"
              : item.type === "ship"
                ? "Shipping"
                : item.type === "weather"
                  ? "Weather"
                  : "Satellite"}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        </div>

        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close event popup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[calc(75vh-58px)] space-y-4 overflow-y-auto p-4">
        {photo && item.type === "flight" && (
          <img
            src={photo}
            alt={`${item.data.callsign || item.data.icao24} aircraft`}
            className="h-40 w-full rounded-lg border border-border object-cover"
            loading="lazy"
          />
        )}

        {item.type === "flight" && (
          <div className="space-y-2">
            <DataRow label="Registration" value={item.data.registration} />
            <DataRow label="Aircraft" value={item.data.type} />
            <DataRow label="ICAO24" value={item.data.icao24} />
            <DataRow label="Altitude" value={`${item.data.altitude.toLocaleString()} m`} />
            <DataRow label="Speed" value={`${Math.round(item.data.velocity * 3.6)} km/h`} />
            <DataRow label="Heading" value={`${Math.round(item.data.heading)}°`} />
            <DataRow label="Squawk" value={item.data.squawk || "—"} />
            <DataRow
              label="Routing window"
              value={historyHours === 0 ? "Live only" : `${historyHours}h trail + forecast`}
            />

            <div className="flex gap-2 pt-1">
              {item.data.registration && (
                <a
                  href={`https://www.flightradar24.com/data/aircraft/${item.data.registration}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <ExternalLink className="h-3 w-3" />
                  FlightRadar24
                </a>
              )}
            </div>
          </div>
        )}

        {item.type === "ship" && (
          <div className="space-y-2">
            <DataRow label="MMSI" value={item.data.mmsi} />
            <DataRow label="Type" value={String(item.data.type)} />
            <DataRow label="Speed" value={`${Number(item.data.speed || 0).toFixed(1)} kn`} />
            <DataRow
              label="Heading"
              value={item.data.heading === 511 ? "N/A" : `${Math.round(item.data.heading)}°`}
            />
            <DataRow label="Destination" value={item.data.destination || "—"} />
            <DataRow label="Status" value={String(item.data.status)} />
            <DataRow
              label="Routing window"
              value={historyHours === 0 ? "Live only" : `${historyHours}h trail + forecast`}
            />

            <div className="flex gap-2 pt-1">
              <a
                href={`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${item.data.mmsi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <ExternalLink className="h-3 w-3" />
                MarineTraffic
              </a>
            </div>
          </div>
        )}

        {item.type === "weather" && (
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                item.data.severity === "Extreme"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : item.data.severity === "Severe"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-foreground"
              }`}
            >
              <ShieldAlert className="h-3 w-3" />
              {item.data.severity}
            </div>

            <p className="text-sm font-medium leading-snug text-foreground">{item.data.headline}</p>

            <DataRow label="Event" value={item.data.event} />
            <DataRow label="Area" value={item.data.areaDesc} />
            <DataRow label="Onset" value={formatDate(item.data.onset)} />
            <DataRow label="Expires" value={formatDate(item.data.expires)} />
            <DataRow
              label="Location"
              value={`${item.data.latitude.toFixed(2)}°, ${item.data.longitude.toFixed(2)}°`}
            />
            <DataRow
              label="Weather history"
              value={historyHours === 0 ? "Live only" : `${historyHours}h snapshots`}
            />

            <p className="rounded-lg border border-border bg-secondary/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
              {item.data.description}
            </p>
          </div>
        )}

        {item.type === "satellite" && (
          <div className="space-y-2">
            <DataRow label="ID" value={item.data.id} />
            <DataRow label="Name" value={item.data.name} />
            <DataRow label="Type" value={item.data.type.toUpperCase()} />
            <DataRow label="Altitude" value={`${Math.round(item.data.altitude).toLocaleString()} km`} />
            <DataRow label="Velocity" value={`${Math.round(item.data.velocity).toLocaleString()} km/h`} />
            <DataRow label="Inclination" value={`${item.data.inclination.toFixed(1)}°`} />
            <DataRow
              label="Position"
              value={`${item.data.latitude.toFixed(2)}°, ${item.data.longitude.toFixed(2)}°`}
            />
            <DataRow
              label="Routing window"
              value={historyHours === 0 ? "Live only" : `${historyHours}h track`}
            />
          </div>
        )}

        {(shouldAnalyze || impactLoading || impact) && (
          <section className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="mb-2 text-xs font-semibold text-foreground">Market Impact Analysis</p>

            {impactLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing relevant equities...
              </div>
            ) : impact ? (
              <div className="space-y-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">{impact.summary}</p>

                <div className="space-y-1">
                  {impact.stocks?.map((stock: any, index: number) => (
                    <div
                      key={`${stock.symbol}-${index}`}
                      className="flex items-start gap-1.5 rounded-md border border-border bg-card/70 px-2 py-1.5 text-[11px]"
                    >
                      {stock.impact === "POSITIVE" ? (
                        <TrendingUp className="mt-0.5 h-3 w-3 flex-shrink-0 text-stock-up" />
                      ) : (
                        <TrendingDown className="mt-0.5 h-3 w-3 flex-shrink-0 text-stock-down" />
                      )}
                      <span className="min-w-10 font-mono-nums font-semibold text-foreground">{stock.symbol}</span>
                      <span className="text-muted-foreground">{stock.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : shouldAnalyze ? (
              <p className="text-[11px] text-muted-foreground">No material equity impact detected for this event.</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Analysis is only triggered for market-relevant events.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
