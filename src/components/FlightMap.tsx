import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useFlights, useShips, type Flight, type Ship } from "@/hooks/useStockData";
import { Plane, Ship as ShipIcon, Loader2, RefreshCw, Filter, Shield } from "lucide-react";
import "leaflet/dist/leaflet.css";

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 6, { duration: 1.5 });
  }, [center, map]);
  return null;
}

function createPlaneIcon(heading: number, military: boolean, altitude: number): L.DivIcon {
  const color = military ? "#f59e0b" : altitude < 2000 ? "#22c55e" : altitude < 5000 ? "#3b82f6" : altitude < 8000 ? "#8b5cf6" : "#ef4444";
  const size = military ? 20 : 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><path d="M12 2L8 9H3l2 3.5L3 16h5l4 6 4-6h5l-2-3.5L21 9h-5L12 2z"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "plane-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createShipIcon(heading: number, type: string): L.DivIcon {
  const color = type === "Tanker" ? "#f97316" : type === "Container" ? "#3b82f6" : type === "Passenger" ? "#a855f7" : type === "Fishing" ? "#22c55e" : "#64748b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${color}" style="transform:rotate(${heading}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><path d="M12 2l-4 8h-4l2 5-1 3h14l-1-3 2-5h-4l-4-8z"/><path d="M4 20c2 2 4 2 8 2s6 0 8-2" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  return L.divIcon({
    html: svg,
    className: "ship-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

type MapLayer = "flights" | "ships" | "both";

const FlightMap = () => {
  const { data: flights = [], isLoading: flightsLoading, refetch: refetchFlights, dataUpdatedAt: flightsUpdated } = useFlights();
  const { data: ships = [], isLoading: shipsLoading, refetch: refetchShips, dataUpdatedAt: shipsUpdated } = useShips();
  const [selected, setSelected] = useState<Flight | Ship | null>(null);
  const [search, setSearch] = useState("");
  const [showMilitary, setShowMilitary] = useState(true);
  const [layer, setLayer] = useState<MapLayer>("flights");
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);

  const filteredFlights = useMemo(() => {
    let result = flights;
    if (!showMilitary) result = result.filter(f => !f.military);
    if (search) {
      const q = search.toUpperCase();
      result = result.filter(f =>
        f.callsign.toUpperCase().includes(q) || f.icao24.toUpperCase().includes(q) || f.registration.toUpperCase().includes(q) || f.type.toUpperCase().includes(q)
      );
    }
    return result;
  }, [flights, search, showMilitary]);

  const filteredShips = useMemo(() => {
    if (!search) return ships;
    const q = search.toUpperCase();
    return ships.filter(s => s.name.toUpperCase().includes(q) || s.mmsi.includes(q) || s.destination.toUpperCase().includes(q));
  }, [ships, search]);

  const militaryCount = useMemo(() => flights.filter(f => f.military).length, [flights]);

  const isLoading = layer === "flights" ? flightsLoading : layer === "ships" ? shipsLoading : flightsLoading || shipsLoading;
  const lastUpdate = (layer === "ships" ? shipsUpdated : flightsUpdated)
    ? new Date(layer === "ships" ? shipsUpdated : flightsUpdated).toLocaleTimeString()
    : "—";

  const handleRefresh = useCallback(() => {
    if (layer === "flights" || layer === "both") refetchFlights();
    if (layer === "ships" || layer === "both") refetchShips();
  }, [layer, refetchFlights, refetchShips]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-border">
      {/* Controls bar */}
      <div className="bg-card border-b border-border px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {layer !== "ships" && <Plane className="h-4 w-4 text-primary" />}
          {layer !== "flights" && <ShipIcon className="h-4 w-4 text-primary" />}
          <span className="text-sm font-semibold text-foreground">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline" />
            ) : (
              <>
                {layer !== "ships" && <>{filteredFlights.length.toLocaleString()} flights</>}
                {layer === "both" && " · "}
                {layer !== "flights" && <>{filteredShips.length.toLocaleString()} ships</>}
              </>
            )}
          </span>
        </div>

        {/* Layer toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
          {(["flights", "ships", "both"] as MapLayer[]).map(l => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                layer === l ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l === "flights" ? "✈ Flights" : l === "ships" ? "🚢 Ships" : "Both"}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={layer === "ships" ? "Search vessel/MMSI..." : "Search callsign/ICAO/type..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-secondary text-foreground text-sm rounded-md px-3 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary w-48"
        />

        {layer !== "ships" && (
          <button
            onClick={() => setShowMilitary(!showMilitary)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              showMilitary ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Military ({militaryCount})
          </button>
        )}

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {lastUpdate}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-3 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs space-y-1">
        {layer !== "ships" && (
          <>
            <p className="font-medium text-foreground mb-1">Altitude</p>
            {[
              { color: "#22c55e", label: "< 2,000m" },
              { color: "#3b82f6", label: "2k-5k m" },
              { color: "#8b5cf6", label: "5k-8k m" },
              { color: "#ef4444", label: "> 8,000m" },
              { color: "#f59e0b", label: "Military ✦" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </>
        )}
        {layer !== "flights" && (
          <>
            <p className="font-medium text-foreground mb-1 mt-2">Ship Types</p>
            {[
              { color: "#3b82f6", label: "Container" },
              { color: "#f97316", label: "Tanker" },
              { color: "#a855f7", label: "Passenger" },
              { color: "#22c55e", label: "Fishing" },
              { color: "#64748b", label: "Other" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-16rem)] min-h-[500px]">
        <MapContainer
          center={[30, 0]}
          zoom={3}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ background: "#0a0f1a" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.6}
          />
          <MapUpdater center={flyTo} />

          {/* Flights */}
          {(layer === "flights" || layer === "both") && filteredFlights.map((flight) => (
            <Marker
              key={`f-${flight.icao24}`}
              position={[flight.latitude, flight.longitude]}
              icon={createPlaneIcon(flight.heading, flight.military, flight.altitude)}
              eventHandlers={{
                click: () => {
                  setSelected(flight);
                  setFlyTo([flight.latitude, flight.longitude]);
                },
              }}
            >
              <Popup>
                <div className="text-xs space-y-2 min-w-[220px] p-1">
                  <div className="flex items-center gap-2 border-b pb-2 mb-2">
                    <Plane className="h-4 w-4 text-blue-500" />
                    <span className="font-bold text-sm">{flight.callsign || "Unknown"}</span>
                    {flight.military && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-600 text-[10px] rounded font-medium">MILITARY</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-gray-500">ICAO24</span><p className="font-mono font-medium">{flight.icao24}</p></div>
                    <div><span className="text-gray-500">Reg</span><p className="font-mono font-medium">{flight.registration || "—"}</p></div>
                    <div><span className="text-gray-500">Type</span><p className="font-mono font-medium">{flight.type || "—"}</p></div>
                    <div><span className="text-gray-500">Altitude</span><p className="font-mono font-medium">{flight.altitude.toLocaleString()}m</p></div>
                    <div><span className="text-gray-500">Speed</span><p className="font-mono font-medium">{Math.round(flight.velocity * 3.6)} km/h</p></div>
                    <div><span className="text-gray-500">Heading</span><p className="font-mono font-medium">{Math.round(flight.heading)}°</p></div>
                    <div><span className="text-gray-500">Vert Rate</span><p className="font-mono font-medium">{flight.verticalRate?.toFixed(1) ?? "—"} m/s</p></div>
                    <div><span className="text-gray-500">Squawk</span><p className="font-mono font-medium">{flight.squawk || "—"}</p></div>
                  </div>
                  <div className="border-t pt-1 mt-1">
                    <span className="text-gray-500">Position</span>
                    <p className="font-mono text-[11px]">{flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Ships */}
          {(layer === "ships" || layer === "both") && filteredShips.map((ship) => (
            <Marker
              key={`s-${ship.mmsi}`}
              position={[ship.latitude, ship.longitude]}
              icon={createShipIcon(ship.heading, ship.type)}
              eventHandlers={{
                click: () => {
                  setSelected(ship);
                  setFlyTo([ship.latitude, ship.longitude]);
                },
              }}
            >
              <Popup>
                <div className="text-xs space-y-2 min-w-[200px] p-1">
                  <div className="flex items-center gap-2 border-b pb-2 mb-2">
                    <ShipIcon className="h-4 w-4 text-blue-500" />
                    <span className="font-bold text-sm">{ship.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-gray-500">MMSI</span><p className="font-mono font-medium">{ship.mmsi}</p></div>
                    <div><span className="text-gray-500">Type</span><p className="font-medium">{ship.type}</p></div>
                    <div><span className="text-gray-500">Speed</span><p className="font-mono font-medium">{ship.speed.toFixed(1)} kn</p></div>
                    <div><span className="text-gray-500">Heading</span><p className="font-mono font-medium">{Math.round(ship.heading)}°</p></div>
                    <div><span className="text-gray-500">Dest</span><p className="font-medium">{ship.destination || "—"}</p></div>
                    <div><span className="text-gray-500">Status</span><p className="font-medium">{ship.status === 0 ? "Underway" : "Anchored"}</p></div>
                    {ship.flag && <div><span className="text-gray-500">Flag</span><p className="font-medium">{ship.flag}</p></div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected item panel */}
      {selected && (
        <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-6 text-sm">
          {"callsign" in selected ? (
            <>
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{(selected as Flight).callsign || (selected as Flight).icao24}</span>
                {(selected as Flight).military && <Shield className="h-3.5 w-3.5 text-amber-500" />}
              </div>
              <span className="font-mono text-foreground">{(selected as Flight).type}</span>
              <span className="font-mono text-foreground">{(selected as Flight).altitude.toLocaleString()}m</span>
              <span className="font-mono text-foreground">{Math.round((selected as Flight).velocity * 3.6)} km/h</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ShipIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{(selected as Ship).name}</span>
              </div>
              <span className="text-foreground">{(selected as Ship).type}</span>
              <span className="font-mono text-foreground">{(selected as Ship).speed.toFixed(1)} kn</span>
            </>
          )}
          <button onClick={() => setSelected(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      <style>{`
        .plane-marker, .ship-marker { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
};

export default FlightMap;
