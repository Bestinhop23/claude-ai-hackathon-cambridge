import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Loader2,
  RefreshCw,
  Plane,
  Ship as ShipIcon,
  CloudLightning,
  Satellite,
  Route,
  Clock3,
} from "lucide-react";
import { useFlights, useShips, type Flight, type Ship } from "@/hooks/useStockData";
import { supabase } from "@/integrations/supabase/client";
import GlobeDetailPanel, {
  type SelectedItem,
  type WeatherAlert,
  type SatelliteInfo,
} from "@/components/GlobeDetailPanel";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];
type TrackPoint = { lat: number; lon: number; at: number };
type TrackMap = Record<string, TrackPoint[]>;

const DEG = Math.PI / 180;
const DAY_MS = 24 * 60 * 60 * 1000;

const flightIconCache = new Map<string, L.DivIcon>();
const shipIconCache = new Map<string, L.DivIcon>();
const satelliteIconCache = new Map<string, L.DivIcon>();

const FLIGHT_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 8.2 9H3l2.3 3.5L3 16h5.2L12 22l3.8-6H21l-2.3-3.5L21 9h-5.2L12 2Z"/></svg>`;
const SHIP_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 8 9H4.2L6 14.2 4.8 18h14.4L18 14.2 19.8 9H16l-4-7Z"/><path d="M4 20c2 1.5 4 2 8 2s6-.5 8-2" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>`;
const SATELLITE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3.4"/><path d="M4 12h2.5M17.5 12H20M12 4v2.5M12 17.5V20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M17.7 6.3l-1.8 1.8M8.1 15.9l-1.8 1.8"/></svg>`;

const FLIGHT_CORRIDORS: Array<{ id: string; points: LatLng[] }> = [
  { id: "nyc-lhr", points: [[40.64, -73.78], [51.47, -0.45]] },
  { id: "lax-tyo", points: [[33.94, -118.4], [35.55, 139.78]] },
  { id: "sfo-sin", points: [[37.62, -122.38], [1.36, 103.99]] },
  { id: "fra-hkg", points: [[50.03, 8.57], [22.31, 113.91]] },
  { id: "dub-syd", points: [[25.25, 55.36], [-33.94, 151.18]] },
  { id: "cdg-jfk", points: [[49.0, 2.55], [40.64, -73.78]] },
  { id: "gru-mad", points: [[-23.43, -46.47], [40.49, -3.56]] },
];

const SHIPPING_CORRIDORS: Array<{ id: string; points: LatLng[] }> = [
  { id: "suez-east", points: [[31.26, 32.3], [22.3, 114.2]] },
  { id: "panama-west", points: [[9.0, -79.6], [33.74, -118.28]] },
  { id: "singapore-rotterdam", points: [[1.26, 103.84], [51.95, 4.14]] },
  { id: "shanghai-la", points: [[31.23, 121.49], [33.74, -118.28]] },
  { id: "gulf-europe", points: [[25.3, 55.3], [51.95, 4.14]] },
];

function normalizeLongitude(lon: number) {
  if (!Number.isFinite(lon)) return 0;
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function isEmergencySquawk(squawk?: string) {
  return squawk === "7700" || squawk === "7600" || squawk === "7500";
}

function isMilitaryShip(ship: Ship) {
  const typeText = String(ship.type || "").toLowerCase();
  return /(military|navy|warship|coast guard|patrol)/.test(typeText);
}

function createFlightIcon(flight: Flight, selected: boolean) {
  const heading = Math.round((Number(flight.heading) || 0) / 5) * 5;
  const state = isEmergencySquawk(flight.squawk)
    ? "alert"
    : flight.military
      ? "military"
      : "neutral";
  const key = `${heading}:${state}:${selected ? 1 : 0}`;
  const cached = flightIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    html: `<div class="ops-flight-marker is-${state} ${selected ? "is-selected" : ""}" style="--heading:${heading}deg">${FLIGHT_SVG}</div>`,
    className: "ops-div-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  flightIconCache.set(key, icon);
  return icon;
}

function createShipIcon(ship: Ship, selected: boolean) {
  const heading = ship.heading === 511 ? 0 : Math.round((Number(ship.heading) || 0) / 5) * 5;
  const state = isMilitaryShip(ship) ? "military" : "neutral";
  const key = `${heading}:${state}:${selected ? 1 : 0}`;
  const cached = shipIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    html: `<div class="ops-ship-marker is-${state} ${selected ? "is-selected" : ""}" style="--heading:${heading}deg">${SHIP_SVG}</div>`,
    className: "ops-div-icon",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  shipIconCache.set(key, icon);
  return icon;
}

function createSatelliteIcon(type: SatelliteInfo["type"], selected: boolean) {
  const key = `${type}:${selected ? 1 : 0}`;
  const cached = satelliteIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    html: `<div class="ops-satellite-marker is-${type} ${selected ? "is-selected" : ""}">${SATELLITE_SVG}</div>`,
    className: "ops-div-icon",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  satelliteIconCache.set(key, icon);
  return icon;
}

function appendTrackPoints(previous: TrackMap, updates: Array<{ id: string; lat: number; lon: number }>, now: number) {
  const cutoff = now - DAY_MS;
  const next: TrackMap = {};

  for (const [id, points] of Object.entries(previous)) {
    const pruned = points.filter((point) => point.at >= cutoff);
    if (pruned.length) next[id] = pruned;
  }

  for (const update of updates) {
    if (!Number.isFinite(update.lat) || !Number.isFinite(update.lon)) continue;

    const points = next[update.id] ? [...next[update.id]] : [];
    const normalizedLon = normalizeLongitude(update.lon);
    const last = points[points.length - 1];

    const movedEnough =
      !last ||
      Math.abs(last.lat - update.lat) > 0.015 ||
      Math.abs(last.lon - normalizedLon) > 0.015 ||
      now - last.at > 4 * 60 * 1000;

    if (movedEnough) {
      points.push({ lat: update.lat, lon: normalizedLon, at: now });
      next[update.id] = points.slice(-320);
    }
  }

  return next;
}

function buildProjectedRoute(
  latitude: number,
  longitude: number,
  heading: number,
  speedKmH: number,
  horizonHours: number,
  steps = 20,
): LatLng[] {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || speedKmH <= 0) {
    return [[latitude, longitude]];
  }

  const headingRad = (Number(heading) || 0) * DEG;
  const points: LatLng[] = [[latitude, longitude]];
  let lat = latitude;
  let lon = longitude;
  const stepHours = horizonHours / steps;

  for (let i = 0; i < steps; i += 1) {
    const distanceKm = speedKmH * stepHours;
    const dLat = (Math.cos(headingRad) * distanceKm) / 111.32;
    const dLon =
      (Math.sin(headingRad) * distanceKm) /
      (111.32 * Math.max(Math.cos(lat * DEG), 0.08));

    lat += dLat;
    lon = normalizeLongitude(lon + dLon);
    points.push([Math.max(-85, Math.min(85, lat)), lon]);
  }

  return points;
}

function buildSatelliteRoute(sat: SatelliteInfo, hours = 6) {
  const samples = 80;

  if (sat.type === "geo") {
    const points: LatLng[] = [];
    for (let lon = -180; lon <= 180; lon += 3) {
      points.push([Math.max(-75, Math.min(75, sat.latitude)), lon]);
    }
    return points;
  }

  const periodMinutesByType: Record<SatelliteInfo["type"], number> = {
    leo: 95,
    meo: 720,
    geo: 1436,
    station: 90,
  };

  const periodHours = (periodMinutesByType[sat.type] || 95) / 60;
  const degreesPerHour = 360 / Math.max(periodHours, 1);
  const amplitude = Math.max(5, Math.min(75, Number(sat.inclination) || 25));
  const direction = sat.id.length % 2 === 0 ? 1 : -1;

  const normalizedRatio = Math.max(-1, Math.min(1, sat.latitude / amplitude));
  const phase = Math.asin(normalizedRatio);

  const points: LatLng[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = -hours + (i / (samples - 1)) * hours * 2;
    const lon = normalizeLongitude(sat.longitude + direction * degreesPerHour * t);
    const lat = amplitude * Math.sin((lon - sat.longitude) * DEG + phase);
    points.push([Math.max(-85, Math.min(85, lat)), lon]);
  }

  return points;
}

function weatherClass(severity: string) {
  if (severity === "Extreme") return "is-extreme";
  if (severity === "Severe") return "is-severe";
  return "is-moderate";
}

function getItemLatLng(item: SelectedItem | null): LatLng | null {
  if (!item) return null;
  if (item.type === "flight") return [item.data.latitude, item.data.longitude];
  if (item.type === "ship") return [item.data.latitude, item.data.longitude];
  if (item.type === "weather") return [item.data.latitude, item.data.longitude];
  if (item.type === "satellite") return [item.data.latitude, item.data.longitude];
  return null;
}

function MapFocus({ selected }: { selected: SelectedItem | null }) {
  const map = useMap();

  const focusKey = selected
    ? selected.type === "flight"
      ? `f:${selected.data.icao24}`
      : selected.type === "ship"
        ? `s:${selected.data.mmsi}`
        : selected.type === "weather"
          ? `w:${selected.data.id}`
          : `sat:${selected.data.id}`
    : "";

  useEffect(() => {
    if (!selected) return;
    const next = getItemLatLng(selected);
    if (!next) return;

    const zoom = selected.type === "satellite" ? 4 : selected.type === "weather" ? 5 : 6;
    map.flyTo(next, Math.max(map.getZoom(), zoom), { duration: 1.1 });
  }, [focusKey, map, selected]);

  return null;
}

const GlobeView = () => {
  const { data: flights = [], isLoading: flightsLoading, refetch: refetchFlights } = useFlights();
  const { data: ships = [], isLoading: shipsLoading, refetch: refetchShips } = useShips();

  const [weather, setWeather] = useState<WeatherAlert[]>([]);
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<Array<WeatherAlert & { capturedAt: number }>>([]);
  const [flightTracks, setFlightTracks] = useState<TrackMap>({});
  const [shipTracks, setShipTracks] = useState<TrackMap>({});
  const [satelliteTracks, setSatelliteTracks] = useState<TrackMap>({});

  const [overlayLoading, setOverlayLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [historyHours, setHistoryHours] = useState(6);

  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  const loadOpsData = useCallback(async () => {
    setOverlayLoading(true);

    try {
      const [weatherResponse, satellitesResponse] = await Promise.allSettled([
        supabase.functions.invoke("stock-data", { body: { action: "weather", params: {} } }),
        supabase.functions.invoke("stock-data", { body: { action: "satellites", params: {} } }),
      ]);

      const now = Date.now();

      if (weatherResponse.status === "fulfilled") {
        const alerts = (weatherResponse.value.data?.alerts || []) as WeatherAlert[];
        setWeather(alerts);

        setWeatherHistory((previous) => {
          const trimmed = previous.filter((entry) => entry.capturedAt >= now - DAY_MS);
          const additions = alerts.map((alert) => ({ ...alert, capturedAt: now }));
          return [...trimmed, ...additions].slice(-2500);
        });
      }

      if (satellitesResponse.status === "fulfilled") {
        setSatellites((satellitesResponse.value.data?.satellites || []) as SatelliteInfo[]);
      }
    } finally {
      setOverlayLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpsData();
    const interval = window.setInterval(loadOpsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadOpsData]);

  useEffect(() => {
    const now = Date.now();
    setFlightTracks((previous) =>
      appendTrackPoints(
        previous,
        flights.map((flight) => ({
          id: flight.icao24,
          lat: flight.latitude,
          lon: flight.longitude,
        })),
        now,
      ),
    );
  }, [flights]);

  useEffect(() => {
    const now = Date.now();
    setShipTracks((previous) =>
      appendTrackPoints(
        previous,
        ships.map((ship) => ({
          id: String(ship.mmsi),
          lat: ship.latitude,
          lon: ship.longitude,
        })),
        now,
      ),
    );
  }, [ships]);

  useEffect(() => {
    const now = Date.now();
    setSatelliteTracks((previous) =>
      appendTrackPoints(
        previous,
        satellites.map((sat) => ({
          id: sat.id,
          lat: sat.latitude,
          lon: sat.longitude,
        })),
        now,
      ),
    );
  }, [satellites]);

  useEffect(() => {
    if (!selectedItem) return;

    if (selectedItem.type === "flight") {
      const updated = flights.find((flight) => flight.icao24 === selectedItem.data.icao24);
      if (updated) setSelectedItem({ type: "flight", data: updated });
      return;
    }

    if (selectedItem.type === "ship") {
      const updated = ships.find((ship) => String(ship.mmsi) === String(selectedItem.data.mmsi));
      if (updated) setSelectedItem({ type: "ship", data: updated });
      return;
    }

    if (selectedItem.type === "weather") {
      const updated = weather.find((entry) => entry.id === selectedItem.data.id);
      if (updated) setSelectedItem({ type: "weather", data: updated });
      return;
    }

    const updated = satellites.find((entry) => entry.id === selectedItem.data.id);
    if (updated) setSelectedItem({ type: "satellite", data: updated });
  }, [flights, ships, satellites, weather, selectedItem]);

  const visibleFlights = useMemo(() => {
    const military = flights.filter((flight) => flight.military);
    const civil = flights.filter((flight) => !flight.military);
    return [...military, ...civil].slice(0, 650);
  }, [flights]);

  const visibleShips = useMemo(() => {
    const military = ships.filter((ship) => isMilitaryShip(ship));
    const civil = ships.filter((ship) => !isMilitaryShip(ship));
    return [...military, ...civil].slice(0, 650);
  }, [ships]);

  const historyCutoff = useMemo(() => Date.now() - historyHours * 60 * 60 * 1000, [historyHours]);

  const flightTrails = useMemo(() => {
    if (historyHours === 0) return [] as Array<{ id: string; points: LatLng[]; military: boolean }>;

    return visibleFlights
      .slice(0, 260)
      .map((flight) => {
        const points = (flightTracks[flight.icao24] || [])
          .filter((point) => point.at >= historyCutoff)
          .map((point) => [point.lat, point.lon] as LatLng);

        return { id: flight.icao24, points, military: flight.military };
      })
      .filter((route) => route.points.length > 1);
  }, [flightTracks, historyCutoff, historyHours, visibleFlights]);

  const shipTrails = useMemo(() => {
    if (historyHours === 0) return [] as Array<{ id: string; points: LatLng[]; military: boolean }>;

    return visibleShips
      .slice(0, 220)
      .map((ship) => {
        const points = (shipTracks[String(ship.mmsi)] || [])
          .filter((point) => point.at >= historyCutoff)
          .map((point) => [point.lat, point.lon] as LatLng);

        return { id: String(ship.mmsi), points, military: isMilitaryShip(ship) };
      })
      .filter((route) => route.points.length > 1);
  }, [historyCutoff, historyHours, shipTracks, visibleShips]);

  const satelliteTrails = useMemo(() => {
    if (historyHours === 0) return [] as Array<{ id: string; points: LatLng[] }>;

    return satellites
      .slice(0, 120)
      .map((sat) => {
        const points = (satelliteTracks[sat.id] || [])
          .filter((point) => point.at >= historyCutoff)
          .map((point) => [point.lat, point.lon] as LatLng);

        return { id: sat.id, points };
      })
      .filter((route) => route.points.length > 1);
  }, [historyCutoff, historyHours, satelliteTracks, satellites]);

  const weatherHistoryPoints = useMemo(() => {
    if (historyHours === 0) return [] as Array<WeatherAlert & { capturedAt: number }>;

    return weatherHistory
      .filter((entry) => entry.capturedAt >= historyCutoff)
      .slice(-700);
  }, [historyCutoff, historyHours, weatherHistory]);

  const satelliteRoutes = useMemo(
    () => satellites.slice(0, 36).map((satellite) => ({ id: satellite.id, points: buildSatelliteRoute(satellite, 6) })),
    [satellites],
  );

  const selectedProjection = useMemo(() => {
    if (!selectedItem) return null;

    if (selectedItem.type === "flight") {
      const flight = selectedItem.data;
      const history = (flightTracks[flight.icao24] || [])
        .filter((point) => point.at >= historyCutoff)
        .map((point) => [point.lat, point.lon] as LatLng);
      const projected = buildProjectedRoute(
        flight.latitude,
        flight.longitude,
        flight.heading,
        Math.max(0, flight.velocity * 3.6),
        2,
      );

      return [...history, ...projected.slice(1)];
    }

    if (selectedItem.type === "ship") {
      const ship = selectedItem.data;
      const history = (shipTracks[String(ship.mmsi)] || [])
        .filter((point) => point.at >= historyCutoff)
        .map((point) => [point.lat, point.lon] as LatLng);
      const projected = buildProjectedRoute(
        ship.latitude,
        ship.longitude,
        ship.heading === 511 ? 0 : ship.heading,
        Math.max(0, Number(ship.speed || 0) * 1.852),
        4,
      );

      return [...history, ...projected.slice(1)];
    }

    if (selectedItem.type === "satellite") {
      const sat = selectedItem.data;
      const history = (satelliteTracks[sat.id] || [])
        .filter((point) => point.at >= historyCutoff)
        .map((point) => [point.lat, point.lon] as LatLng);

      return [...history, ...buildSatelliteRoute(sat, 3).slice(1)];
    }

    return null;
  }, [flightTracks, historyCutoff, selectedItem, satelliteTracks, shipTracks]);

  const isLoading = flightsLoading || shipsLoading || overlayLoading;
  const militaryFlights = useMemo(
    () => visibleFlights.filter((flight) => flight.military).length,
    [visibleFlights],
  );
  const militaryShips = useMemo(
    () => visibleShips.filter((ship) => isMilitaryShip(ship)).length,
    [visibleShips],
  );

  const refreshAll = useCallback(() => {
    refetchFlights();
    refetchShips();
    loadOpsData();
  }, [loadOpsData, refetchFlights, refetchShips]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-background">
      <div className="z-[1000] flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-secondary/60 p-0.5">
          <button
            onClick={() => setShowFlights((value) => !value)}
            className={`ops-toggle ${showFlights ? "is-active" : ""}`}
          >
            <Plane className="h-3.5 w-3.5" />
            Flights
            <span className="font-mono-nums text-[10px] opacity-70">{visibleFlights.length}</span>
          </button>
          <button
            onClick={() => setShowShips((value) => !value)}
            className={`ops-toggle ${showShips ? "is-active" : ""}`}
          >
            <ShipIcon className="h-3.5 w-3.5" />
            Ships
            <span className="font-mono-nums text-[10px] opacity-70">{visibleShips.length}</span>
          </button>
          <button
            onClick={() => setShowWeather((value) => !value)}
            className={`ops-toggle ${showWeather ? "is-active" : ""}`}
          >
            <CloudLightning className="h-3.5 w-3.5" />
            Weather
            <span className="font-mono-nums text-[10px] opacity-70">{weather.length}</span>
          </button>
          <button
            onClick={() => setShowSatellites((value) => !value)}
            className={`ops-toggle ${showSatellites ? "is-active" : ""}`}
          >
            <Satellite className="h-3.5 w-3.5" />
            Satellites
            <span className="font-mono-nums text-[10px] opacity-70">{satellites.length}</span>
          </button>
          <button
            onClick={() => setShowRoutes((value) => !value)}
            className={`ops-toggle ${showRoutes ? "is-active" : ""}`}
          >
            <Route className="h-3.5 w-3.5" />
            Routes
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-mono-nums">MIL AIR {militaryFlights}</span>
          <span className="font-mono-nums">MIL SEA {militaryShips}</span>
          <button
            onClick={refreshAll}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Refresh operations layers"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100vh-11rem)] min-h-[560px] ops-map">
        <MapContainer
          center={[25, 8]}
          zoom={3}
          minZoom={2}
          maxZoom={9}
          worldCopyJump
          preferCanvas
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.85}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
          />

          <MapFocus selected={selectedItem} />

          {showRoutes && FLIGHT_CORRIDORS.map((route) => (
            <Polyline
              key={route.id}
              positions={route.points}
              pathOptions={{ className: "ops-route ops-route-flight" }}
            />
          ))}

          {showRoutes && SHIPPING_CORRIDORS.map((route) => (
            <Polyline
              key={route.id}
              positions={route.points}
              pathOptions={{ className: "ops-route ops-route-ship" }}
            />
          ))}

          {showRoutes && showSatellites && satelliteRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.points}
              pathOptions={{ className: "ops-route ops-route-satellite" }}
            />
          ))}

          {showFlights && historyHours > 0 && flightTrails.map((route) => (
            <Polyline
              key={`flight-trail-${route.id}`}
              positions={route.points}
              pathOptions={{ className: `ops-trail ops-trail-flight ${route.military ? "is-military" : ""}` }}
            />
          ))}

          {showShips && historyHours > 0 && shipTrails.map((route) => (
            <Polyline
              key={`ship-trail-${route.id}`}
              positions={route.points}
              pathOptions={{ className: `ops-trail ops-trail-ship ${route.military ? "is-military" : ""}` }}
            />
          ))}

          {showSatellites && historyHours > 0 && satelliteTrails.map((route) => (
            <Polyline
              key={`sat-trail-${route.id}`}
              positions={route.points}
              pathOptions={{ className: "ops-trail ops-trail-satellite" }}
            />
          ))}

          {selectedProjection && selectedProjection.length > 1 && (
            <Polyline
              positions={selectedProjection}
              pathOptions={{ className: "ops-route ops-route-selected" }}
            />
          )}

          {showWeather && historyHours > 0 && weatherHistoryPoints.map((entry, index) => (
            <CircleMarker
              key={`weather-history-${entry.id}-${entry.capturedAt}-${index}`}
              center={[entry.latitude, entry.longitude]}
              radius={2.2}
              pathOptions={{ className: `ops-weather-history ${weatherClass(entry.severity)}` }}
            />
          ))}

          {showWeather && weather.map((alert, index) => (
            <CircleMarker
              key={`weather-${alert.id}-${index}`}
              center={[alert.latitude, alert.longitude]}
              radius={alert.severity === "Extreme" ? 14 : alert.severity === "Severe" ? 11 : 8}
              pathOptions={{ className: `ops-weather-marker ${weatherClass(alert.severity)}` }}
              eventHandlers={{
                click: () => setSelectedItem({ type: "weather", data: alert }),
              }}
            />
          ))}

          {showFlights && visibleFlights.map((flight) => {
            const isSelected =
              selectedItem?.type === "flight" && selectedItem.data.icao24 === flight.icao24;

            return (
              <Marker
                key={`flight-${flight.icao24}`}
                position={[flight.latitude, flight.longitude]}
                icon={createFlightIcon(flight, isSelected)}
                eventHandlers={{ click: () => setSelectedItem({ type: "flight", data: flight }) }}
              />
            );
          })}

          {showShips && visibleShips.map((ship) => {
            const isSelected =
              selectedItem?.type === "ship" &&
              String(selectedItem.data.mmsi) === String(ship.mmsi);

            return (
              <Marker
                key={`ship-${ship.mmsi}`}
                position={[ship.latitude, ship.longitude]}
                icon={createShipIcon(ship, isSelected)}
                eventHandlers={{ click: () => setSelectedItem({ type: "ship", data: ship }) }}
              />
            );
          })}

          {showSatellites && satellites.map((satellite) => {
            const isSelected =
              selectedItem?.type === "satellite" && selectedItem.data.id === satellite.id;

            return (
              <Marker
                key={`satellite-${satellite.id}`}
                position={[satellite.latitude, satellite.longitude]}
                icon={createSatelliteIcon(satellite.type, isSelected)}
                eventHandlers={{ click: () => setSelectedItem({ type: "satellite", data: satellite }) }}
              />
            );
          })}
        </MapContainer>

        {selectedItem && (
          <GlobeDetailPanel
            item={selectedItem}
            historyHours={historyHours}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-card/95 px-4 py-2 text-xs backdrop-blur">
        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="w-24 font-mono-nums text-muted-foreground">
          {historyHours === 0 ? "Live" : `${historyHours}h history`}
        </span>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={historyHours}
          onChange={(event) => setHistoryHours(Number(event.target.value))}
          className="ops-slider"
        />
        <span className="text-[11px] text-muted-foreground">Trails + weather history + satellite tracks</span>
      </div>

      <style>{`
        .ops-map .leaflet-container {
          background: hsl(var(--background));
        }

        .ops-map .leaflet-control-zoom a {
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));
        }

        .ops-map .leaflet-control-attribution {
          background: hsl(var(--card) / 0.8);
          color: hsl(var(--muted-foreground));
          border-top: 1px solid hsl(var(--border));
        }

        .ops-map .leaflet-control-attribution a {
          color: hsl(var(--foreground));
        }

        .ops-div-icon {
          background: transparent !important;
          border: none !important;
        }

        .ops-flight-marker,
        .ops-ship-marker,
        .ops-satellite-marker {
          width: 100%;
          height: 100%;
          color: hsl(var(--muted-foreground));
          display: grid;
          place-items: center;
          filter: drop-shadow(0 2px 4px hsl(var(--background) / 0.85));
          transition: transform 140ms ease;
        }

        .ops-flight-marker svg,
        .ops-ship-marker svg,
        .ops-satellite-marker svg {
          width: 100%;
          height: 100%;
        }

        .ops-flight-marker svg,
        .ops-ship-marker svg {
          transform: rotate(var(--heading));
        }

        .ops-flight-marker.is-military,
        .ops-ship-marker.is-military {
          color: hsl(var(--primary));
        }

        .ops-flight-marker.is-alert {
          color: hsl(var(--destructive));
        }

        .ops-satellite-marker {
          color: hsl(var(--foreground));
          opacity: 0.8;
        }

        .ops-satellite-marker.is-selected,
        .ops-flight-marker.is-selected,
        .ops-ship-marker.is-selected {
          transform: scale(1.22);
        }

        .ops-route {
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ops-route-flight {
          stroke: hsl(var(--muted-foreground) / 0.33);
          stroke-width: 1.4;
          stroke-dasharray: 2 8;
        }

        .ops-route-ship {
          stroke: hsl(var(--muted-foreground) / 0.26);
          stroke-width: 1.8;
          stroke-dasharray: 8 10;
        }

        .ops-route-satellite {
          stroke: hsl(var(--foreground) / 0.22);
          stroke-width: 1.3;
          stroke-dasharray: 4 7;
        }

        .ops-route-selected {
          stroke: hsl(var(--primary));
          stroke-width: 2.2;
          stroke-dasharray: 6 8;
        }

        .ops-trail {
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ops-trail-flight {
          stroke: hsl(var(--muted-foreground) / 0.32);
          stroke-width: 1.5;
        }

        .ops-trail-ship {
          stroke: hsl(var(--muted-foreground) / 0.28);
          stroke-width: 1.8;
        }

        .ops-trail-satellite {
          stroke: hsl(var(--foreground) / 0.28);
          stroke-width: 1.2;
          stroke-dasharray: 1 8;
        }

        .ops-trail.is-military {
          stroke: hsl(var(--primary) / 0.75);
        }

        .ops-weather-marker {
          stroke-width: 1;
          stroke: hsl(var(--border));
        }

        .ops-weather-marker.is-extreme {
          fill: hsl(var(--destructive) / 0.5);
          stroke: hsl(var(--destructive));
        }

        .ops-weather-marker.is-severe {
          fill: hsl(var(--primary) / 0.4);
          stroke: hsl(var(--primary));
        }

        .ops-weather-marker.is-moderate {
          fill: hsl(var(--muted-foreground) / 0.28);
          stroke: hsl(var(--muted-foreground));
        }

        .ops-weather-history {
          stroke-width: 0;
        }

        .ops-weather-history.is-extreme,
        .ops-weather-history.is-severe,
        .ops-weather-history.is-moderate {
          fill: hsl(var(--foreground) / 0.2);
        }

        .ops-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 0.45rem;
          padding: 0.3rem 0.5rem;
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          transition: all 140ms ease;
        }

        .ops-toggle:hover {
          color: hsl(var(--foreground));
          background: hsl(var(--background));
        }

        .ops-toggle.is-active {
          color: hsl(var(--foreground));
          background: hsl(var(--background));
          box-shadow: 0 1px 0 hsl(var(--border));
        }

        .ops-slider {
          flex: 1;
          appearance: none;
          height: 0.35rem;
          border-radius: 999px;
          background: hsl(var(--secondary));
          cursor: pointer;
        }

        .ops-slider::-webkit-slider-thumb {
          appearance: none;
          width: 0.85rem;
          height: 0.85rem;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--foreground));
        }

        .ops-slider::-moz-range-thumb {
          width: 0.85rem;
          height: 0.85rem;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
};

export default GlobeView;
