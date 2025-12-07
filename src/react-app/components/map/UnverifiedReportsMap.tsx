import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { DivIcon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { DAMAGE_ICONS } from "./DisasterMap";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnverifiedReport {
  id: string;
  reportNumber: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  damageType: string;
  severity: number;
  status: string;
  passabilityLevel: string | null;
  isSingleLane: boolean | null;
  description: string;
  createdAt: string;
  anonymousName: string | null;
  anonymousEmail: string | null;
  anonymousContact: string | null;
  sourceType: string;
  districtName: string | null;
  provinceName: string | null;
  roadLocation: string | null;
}

// Create marker icon for unverified reports
function createUnverifiedIcon(damageType: string, isSelected: boolean = false): DivIcon {
  const config = DAMAGE_ICONS[damageType] || DAMAGE_ICONS.other;

  return new DivIcon({
    html: `
      <div style="
        background: ${isSelected ? "#FEF3C7" : "white"};
        border: 3px solid ${isSelected ? "#F59E0B" : "#EF4444"};
        border-radius: 50%;
        width: ${isSelected ? "40px" : "36px"};
        height: ${isSelected ? "40px" : "36px"};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? "20px" : "18px"};
        box-shadow: 0 2px 8px rgba(239, 68, 68, ${isSelected ? 0.6 : 0.4});
        cursor: pointer;
        transform: ${isSelected ? "scale(1.1)" : "scale(1)"};
        transition: all 0.2s ease;
        animation: pulse 2s infinite;
      ">
        ${config.emoji}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      </style>
    `,
    className: "unverified-marker",
    iconSize: isSelected ? [40, 40] : [36, 36],
    iconAnchor: isSelected ? [20, 20] : [18, 18],
  });
}

// MapController - handles programmatic map panning
function MapController({ targetLocation }: { targetLocation: LatLngExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (targetLocation) {
      map.flyTo(targetLocation, 14, { duration: 1.5 });
    }
  }, [targetLocation, map]);

  return null;
}

interface UnverifiedReportsMapProps {
  onReportSelect?: (reportId: string) => void;
  selectedReportId?: string | null;
}

export function UnverifiedReportsMap({ onReportSelect, selectedReportId }: UnverifiedReportsMapProps) {
  const [reports, setReports] = useState<UnverifiedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetLocation, setTargetLocation] = useState<LatLngExpression | null>(null);

  // Sri Lanka center coordinates
  const center: LatLngExpression = [7.8731, 80.7718];

  const fetchUnverifiedReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/admin/reports/unverified", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch unverified reports");
      }
      const data = (await response.json()) as UnverifiedReport[];
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnverifiedReports();
  }, []);

  const handleMarkerClick = (report: UnverifiedReport) => {
    setTargetLocation([report.latitude, report.longitude]);
    onReportSelect?.(report.id);
  };

  if (loading) {
    return (
      <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
          <div className="text-gray-500">Loading unverified reports...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <p className="font-medium text-red-600 mb-2">Failed to load unverified reports</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchUnverifiedReports} variant="outline">
            Retry
          </Button>
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
        <MapController targetLocation={targetLocation} />

        {/* CartoDB Voyager - colorful, Google Maps-like */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Unverified report markers */}
        {reports.map((report) => {
          const isSelected = selectedReportId === report.id;
          return (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={createUnverifiedIcon(report.damageType, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => handleMarkerClick(report),
              }}
            >
              <Popup>
                <div className="min-w-64">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Unverified
                    </span>
                    <span className="text-xs text-gray-500">
                      {report.reportNumber}
                    </span>
                  </div>

                  <h3 className="mb-1 text-base font-bold capitalize">
                    {report.damageType.replace("_", " ")}
                  </h3>

                  <p className="mb-1 text-sm">
                    <span className="font-medium">Severity:</span>{" "}
                    <span className={
                      report.severity >= 4 ? "text-red-600 font-semibold" :
                      report.severity >= 3 ? "text-orange-600 font-semibold" :
                      report.severity >= 2 ? "text-yellow-600" :
                      "text-green-600"
                    }>
                      {report.severity}/5
                    </span>
                  </p>

                  {report.passabilityLevel && (
                    <p className="mb-1 text-sm">
                      <span className="font-medium">Passability:</span>{" "}
                      {report.passabilityLevel.replace("_", " ")}
                      {report.isSingleLane && " (Single lane)"}
                    </p>
                  )}

                  {report.roadLocation && (
                    <p className="mb-1 text-sm">
                      <span className="font-medium">Location:</span> {report.roadLocation}
                    </p>
                  )}

                  {(report.districtName || report.provinceName) && (
                    <p className="mb-1 text-xs text-gray-500">
                      {report.districtName && `${report.districtName}, `}
                      {report.provinceName}
                    </p>
                  )}

                  <p className="mb-2 text-sm">{report.description}</p>

                  {report.anonymousName && (
                    <p className="text-xs text-gray-500">
                      Reported by: {report.anonymousName}
                    </p>
                  )}

                  <p className="text-xs text-gray-500">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Stats overlay */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-[1000]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Unverified Reports
        </h3>
        <p className="text-2xl font-bold text-red-600">{reports.length}</p>
        <p className="text-xs text-gray-500">Awaiting verification</p>
      </div>
    </div>
  );
}
