import { useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { DivIcon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapLegend } from "./MapLegend";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "@/data/initialRoadSegments";
import { snappedRoadPaths } from "@/data/snappedRoadPaths";
import { useMapViewStore } from "@/stores/mapView";

export interface RoadSegmentData {
  id: string;
  roadNo: string;
  roadName: string | null;
  province: string;
  path: LatLngExpression[];
  midpoint: LatLngExpression;
  damageType: string;
  severity: number;
  description: string;
  reason: string;
}

// All blocked roads are red
const BLOCKED_ROAD_COLOR = "#DC2626";

// Damage type icons (using emoji for simplicity, could use custom icons)
export const DAMAGE_ICONS: Record<string, { emoji: string; color: string }> = {
  flooding: { emoji: "🌊", color: "#3B82F6" },
  landslide: { emoji: "⛰️", color: "#92400E" },
  washout: { emoji: "💧", color: "#3B82F6" },
  collapse: { emoji: "🚧", color: "#DC2626" },
  blockage: { emoji: "🚜", color: "#F97316" },
  other: { emoji: "⚠️", color: "#6B7280" },
};

function createDamageIcon(
  damageType: string,
  isSelected: boolean = false
): DivIcon {
  const config = DAMAGE_ICONS[damageType] || DAMAGE_ICONS.other;

  return new DivIcon({
    html: `
      <div style="
        background: ${isSelected ? "#3B82F6" : "white"};
        border: 3px solid ${isSelected ? "#1D4ED8" : BLOCKED_ROAD_COLOR};
        border-radius: 50%;
        width: ${isSelected ? "40px" : "32px"};
        height: ${isSelected ? "40px" : "32px"};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? "20px" : "16px"};
        box-shadow: 0 2px 8px rgba(0,0,0,${isSelected ? 0.5 : 0.3});
        cursor: pointer;
        transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
        transition: all 0.2s ease;
      ">
        ${config.emoji}
      </div>
    `,
    className: "damage-marker",
    iconSize: isSelected ? [40, 40] : [32, 32],
    iconAnchor: isSelected ? [20, 20] : [16, 16],
  });
}

// MapController - handles programmatic map panning
function MapController() {
  const map = useMap();
  const { targetBounds, targetLocation, targetZoom, clearMapTarget } =
    useMapViewStore();

  useEffect(() => {
    if (targetLocation && targetZoom) {
      map.flyTo(targetLocation, targetZoom, { duration: 1.5 });
      // Clear target after animation starts
      setTimeout(() => clearMapTarget(), 100);
    } else if (targetBounds) {
      map.flyToBounds(targetBounds, {
        padding: [50, 50],
        duration: 1.5,
        maxZoom: 12,
      });
      // Clear target after animation starts
      setTimeout(() => clearMapTarget(), 100);
    }
  }, [targetBounds, targetLocation, targetZoom, map, clearMapTarget]);

  return null;
}

// Hook to get processed segments - exported for use in RoadTable
export function useRoadSegments(): RoadSegmentData[] {
  return useMemo<RoadSegmentData[]>(() => {
    return initialRoadSegments
      .filter((seg) => {
        // Filter out segments where start and end are the same (point damage)
        return seg.fromLat !== seg.toLat || seg.fromLng !== seg.toLng;
      })
      .map((seg) => {
        // Use pre-computed snapped path, or fall back to straight line
        const rawPath = snappedRoadPaths[seg.id] || [
          { lat: seg.fromLat, lng: seg.fromLng },
          { lat: seg.toLat, lng: seg.toLng },
        ];

        // Convert to Leaflet format [lat, lng]
        const path: LatLngExpression[] = rawPath.map((p) => [p.lat, p.lng]);

        // Calculate midpoint from the actual path
        const midIndex = Math.floor(rawPath.length / 2);
        const midpointRaw = rawPath[midIndex] || {
          lat: (seg.fromLat + seg.toLat) / 2,
          lng: (seg.fromLng + seg.toLng) / 2,
        };
        const midpoint: LatLngExpression = [midpointRaw.lat, midpointRaw.lng];

        return {
          id: seg.id,
          roadNo: seg.roadNo,
          roadName: seg.roadName,
          province: seg.province,
          path,
          midpoint,
          damageType: mapReasonToDamageType(seg.reason),
          severity: mapReasonToSeverity(seg.reason),
          description: `${seg.roadNo} from km ${seg.fromKm} to km ${seg.toKm}`,
          reason: seg.reason,
        };
      });
  }, []);
}

export function DisasterMap() {
  // Sri Lanka center coordinates
  const center: LatLngExpression = [7.8731, 80.7718];
  const segments = useRoadSegments();
  const { selectedSegmentId } = useMapViewStore();

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Map controller for programmatic panning */}
        <MapController />

        {/* OpenStreetMap tiles - FREE! */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Road segment polylines */}
        {segments.map((seg) => {
          const isSelected = selectedSegmentId === seg.id;
          return (
            <Polyline
              key={`segment-${seg.id}`}
              positions={seg.path}
              pathOptions={{
                color: isSelected ? "#3B82F6" : BLOCKED_ROAD_COLOR,
                weight: isSelected ? 8 : 5,
                opacity: isSelected ? 1 : 0.8,
              }}
            >
              <Popup>
                <div className="min-w-48">
                  <h3 className="mb-1 text-base font-bold capitalize">
                    {seg.damageType.replace("_", " ")}
                  </h3>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    {seg.roadNo} - {seg.roadName}
                  </p>
                  <p className="mb-1 text-xs text-gray-500">
                    {seg.province} Province
                  </p>
                  <p className="mb-2 text-sm">{seg.reason}</p>
                  <p className="text-xs text-gray-500">{seg.description}</p>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Damage type markers at segment midpoints */}
        {segments.map((seg) => {
          const isSelected = selectedSegmentId === seg.id;
          return (
            <Marker
              key={`marker-${seg.id}`}
              position={seg.midpoint}
              icon={createDamageIcon(seg.damageType, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup>
                <div className="min-w-48">
                  <h3 className="mb-1 text-base font-bold capitalize">
                    {seg.damageType.replace("_", " ")}
                  </h3>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    {seg.roadNo} - {seg.roadName}
                  </p>
                  <p className="mb-1 text-xs text-gray-500">
                    {seg.province} Province
                  </p>
                  <p className="mb-2 text-sm">{seg.reason}</p>
                  <p className="text-xs text-gray-500">{seg.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <MapLegend />
    </div>
  );
}
