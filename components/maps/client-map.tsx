"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

const planeIcon = (isMilitary: boolean) =>
  L.divIcon({
    html: `<div style="transform: rotate(0deg); color:${isMilitary ? "#b91c1c" : "#1f5d46"}; font-size:18px;">&#9992;</div>`,
    className: "",
    iconSize: [20, 20],
  });

const shipIcon = L.divIcon({
  html: `<div style="color:#1459a6; font-size:18px;">&#9973;</div>`,
  className: "",
  iconSize: [20, 20],
});

export default function ClientMap({
  flights,
  ships,
}: {
  flights: Array<{ id: string; callsign: string; lat: number; lon: number; heading: number; origin: string; destination: string; isMilitary: boolean }>;
  ships: Array<{ id: string; name: string; lat: number; lon: number; heading: number; type: string; origin: string; destination: string }>;
}) {
  return (
    <MapContainer center={[22, 10]} zoom={2} className="h-full w-full">
      <TileLayer
        attribution='&copy; Esri'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      {flights.map((flight) => (
        <Marker key={flight.id} position={[flight.lat, flight.lon]} icon={planeIcon(flight.isMilitary)}>
          <Popup>
            <div className="text-sm">
              <strong>{flight.callsign}</strong>
              <div>{flight.origin} to {flight.destination}</div>
              <div>{flight.isMilitary ? "Military" : "Civilian"}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      {ships.map((ship) => (
        <Marker key={ship.id} position={[ship.lat, ship.lon]} icon={shipIcon}>
          <Popup>
            <div className="text-sm">
              <strong>{ship.name}</strong>
              <div>{ship.type}</div>
              <div>{ship.origin} to {ship.destination}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
