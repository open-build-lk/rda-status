import { useEffect } from "react";
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
import { useRoadSegments, ProcessedRoadSegment } from "@/hooks/useRoadSegments";
import { useCitizenIncidents, ProcessedIncident } from "@/hooks/useCitizenIncidents";
import { useMapViewStore } from "@/stores/mapView";

// Re-export for backwards compatibility
export type RoadSegmentData = ProcessedRoadSegment;
export type { ProcessedIncident };

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

// Status colors for markers
const STATUS_COLORS = {
  verified: "#DC2626",    // Red - pending/verified
  in_progress: "#F97316", // Orange - in progress
  resolved: "#16A34A",    // Green - resolved
  new: "#DC2626",         // Red - new
};

// Create marker icon for citizen incidents (point-based, not segment-based)
function createIncidentIcon(
  damageType: string,
  status: string = "verified",
  progressPercent?: number
): DivIcon {
  const config = DAMAGE_ICONS[damageType] || DAMAGE_ICONS.other;
  const borderColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.verified;

  // For resolved items, show a checkmark badge
  const badge = status === "resolved"
    ? `<div style="
        position: absolute;
        top: -4px;
        right: -4px;
        background: #16A34A;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        border: 1px solid white;
      ">✓</div>`
    : status === "in_progress" && progressPercent
      ? `<div style="
          position: absolute;
          top: -6px;
          right: -6px;
          background: #F97316;
          border-radius: 8px;
          padding: 1px 4px;
          font-size: 8px;
          color: white;
          font-weight: bold;
          border: 1px solid white;
        ">${progressPercent}%</div>`
      : "";

  return new DivIcon({
    html: `
      <div style="
        position: relative;
        background: white;
        border: 3px solid ${borderColor};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        cursor: pointer;
      ">
        ${config.emoji}
        ${badge}
      </div>
    `,
    className: "incident-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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

// Re-export useRoadSegments from the hook module for backwards compatibility with RoadTable
export { useRoadSegments } from "@/hooks/useRoadSegments";

// Helper to check if incident matches status filter
function matchesStatusFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "verified" || status === "new";
  return status === filter;
}

export function DisasterMap() {
  // Sri Lanka center coordinates
  const center: LatLngExpression = [7.8731, 80.7718];
  const { segments, isLoading: segmentsLoading, error: segmentsError } = useRoadSegments();
  const { incidents, isLoading: incidentsLoading, error: incidentsError } = useCitizenIncidents();
  const { selectedSegmentId, statusFilter } = useMapViewStore();

  // Filter incidents by status
  const filteredIncidents = incidents.filter((inc) =>
    matchesStatusFilter(inc.status, statusFilter)
  );

  const isLoading = segmentsLoading || incidentsLoading;
  const error = segmentsError || incidentsError;

  if (isLoading) {
    return (
      <div className="relative h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
        <div className="text-gray-500">Loading map data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-red-500 text-center">
          <p className="font-medium">Failed to load map data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

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

        {/* CartoDB Voyager - colorful, Google Maps-like */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
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

        {/* Citizen incident markers (status-colored borders) */}
        {filteredIncidents.map((incident) => (
          <Marker
            key={`incident-${incident.id}`}
            position={incident.position}
            icon={createIncidentIcon(
              incident.damageType,
              incident.status,
              incident.progressPercent
            )}
          >
            <Popup>
              <div className="min-w-48">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Citizen Report
                  </span>
                  {incident.status === "resolved" && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Resolved
                    </span>
                  )}
                  {incident.status === "in_progress" && (
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      In Progress {incident.progressPercent > 0 && `(${incident.progressPercent}%)`}
                    </span>
                  )}
                </div>
                <h3 className="mb-1 text-base font-bold capitalize">
                  {incident.damageType.replace("_", " ")}
                </h3>
                <p className="mb-1 text-sm">
                  <span className="font-medium">Passability:</span>{" "}
                  {incident.passabilityLevel.replace("_", " ")}
                  {incident.isSingleLane && " (Single lane)"}
                </p>
                <p className="mb-2 text-sm">{incident.description}</p>
                {incident.status === "resolved" && incident.resolvedAt && (
                  <p className="mb-1 text-xs font-medium text-green-600">
                    Fixed in {Math.round(
                      (new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )} days
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Reported: {new Date(incident.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <MapLegend />
    </div>
  );
}
