"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const partnerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const patientIcon = L.divIcon({
  className: "",
  html: `<div style="background:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #10b981"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface Partner {
  _id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

interface Props {
  patientLat: number;
  patientLng: number;
  partners: Partner[];
  selectedId?: string | null;
  onSelect?: (partnerId: string) => void;
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

export default function PartnersMap({ patientLat, patientLng, partners, selectedId, onSelect }: Props) {
  const points: Array<[number, number]> = [
    [patientLat, patientLng],
    ...partners.map((p) => [p.latitude, p.longitude] as [number, number]),
  ];

  return (
    <MapContainer
      center={[patientLat, patientLng]}
      zoom={13}
      className="h-80 w-full rounded-xl"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[patientLat, patientLng]} icon={patientIcon}>
        <Popup>You are here</Popup>
      </Marker>

      {partners.map((p) => (
        <Marker
          key={p._id}
          position={[p.latitude, p.longitude]}
          icon={partnerIcon}
          eventHandlers={onSelect ? { click: () => onSelect(p._id) } : undefined}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-slate-600">{p.address}</p>
              {p.distanceKm !== undefined && (
                <p className="text-xs text-emerald-700">
                  {p.distanceKm.toFixed(2)} km away
                </p>
              )}
              {selectedId === p._id && (
                <p className="text-xs font-medium text-emerald-700">Selected</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      <FitBounds points={points} />
    </MapContainer>
  );
}
