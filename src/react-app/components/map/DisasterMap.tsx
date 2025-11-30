import { useState, useEffect } from "react";
import { Map, InfoWindow } from "@vis.gl/react-google-maps";
import { MapProvider } from "./MapProvider";
import { RoadSegmentOverlay } from "./RoadSegmentOverlay";
import { DamageTypeMarker } from "./DamageTypeMarker";
import { MapLegend } from "./MapLegend";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "@/data/initialRoadSegments";

interface RoadSegmentData {
  id: string;
  roadNo: string;
  roadName: string | null;
  province: string;
  segment: {
    path: google.maps.LatLngLiteral[];
    midpoint: google.maps.LatLngLiteral;
  };
  damageType: string;
  severity: number;
  description: string;
  status: string;
}

export function DisasterMap() {
  const [selectedSegment, setSelectedSegment] =
    useState<RoadSegmentData | null>(null);
  const [segments, setSegments] = useState<RoadSegmentData[]>([]);
  const [loadingCount, setLoadingCount] = useState(0);

  // Sri Lanka center coordinates
  const center = { lat: 7.8731, lng: 80.7718 };

  // Load and snap road segments
  useEffect(() => {
    const filteredSegments = initialRoadSegments.filter((seg) => {
      // Filter out segments where start and end are the same (point damage)
      return seg.fromLat !== seg.toLat || seg.fromLng !== seg.toLng;
    });

    // Initialize with straight lines first
    const initialSegments = filteredSegments.map((seg) => {
      const path = [
        { lat: seg.fromLat, lng: seg.fromLng },
        { lat: seg.toLat, lng: seg.toLng },
      ];
      const midpoint = {
        lat: (seg.fromLat + seg.toLat) / 2,
        lng: (seg.fromLng + seg.toLng) / 2,
      };

      return {
        id: seg.id,
        roadNo: seg.roadNo,
        roadName: seg.roadName,
        province: seg.province,
        segment: { path, midpoint },
        damageType: mapReasonToDamageType(seg.reason),
        severity: mapReasonToSeverity(seg.reason),
        description: `${seg.reason} - ${seg.roadNo} from km ${seg.fromKm} to km ${seg.toKm}`,
        status: "verified",
      };
    });

    setSegments(initialSegments);
    setLoadingCount(filteredSegments.length);

    // Fetch snapped paths for each segment
    filteredSegments.forEach(async (seg) => {
      try {
        const response = await fetch("/api/v1/map/snap-road", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startLat: seg.fromLat,
            startLng: seg.fromLng,
            endLat: seg.toLat,
            endLng: seg.toLng,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update the segment with snapped path
          setSegments((prev) =>
            prev.map((s) =>
              s.id === seg.id
                ? {
                    ...s,
                    segment: {
                      path: data.path,
                      midpoint: data.midpoint,
                    },
                  }
                : s
            )
          );
        }
      } catch (error) {
        console.error(`Failed to snap road ${seg.id}:`, error);
      } finally {
        setLoadingCount((prev) => prev - 1);
      }
    });
  }, []);

  const mapId = import.meta.env.VITE_GOOGLE_MAP_ID;

  return (
    <MapProvider>
      <div className="relative h-full w-full">
        {loadingCount > 0 && (
          <div className="absolute right-4 top-4 z-20 rounded-lg bg-white px-3 py-2 text-sm shadow-lg">
            Snapping roads to map... ({loadingCount} remaining)
          </div>
        )}
        <Map
          defaultCenter={center}
          defaultZoom={8}
          mapId={mapId}
          style={{ width: "100%", height: "100%" }}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* Road segment polylines */}
          {segments.map((seg) => (
            <RoadSegmentOverlay
              key={`segment-${seg.id}`}
              segment={{
                id: seg.id,
                path: seg.segment.path,
                damageType: seg.damageType,
                severity: seg.severity,
              }}
              onClick={() => setSelectedSegment(seg)}
            />
          ))}

          {/* Damage type markers at segment midpoints */}
          {segments.map((seg) => (
            <DamageTypeMarker
              key={`marker-${seg.id}`}
              position={seg.segment.midpoint}
              damageType={seg.damageType}
              severity={seg.severity}
              onClick={() => setSelectedSegment(seg)}
            />
          ))}

          {/* Info window for selected segment */}
          {selectedSegment && (
            <InfoWindow
              position={selectedSegment.segment.midpoint}
              onCloseClick={() => setSelectedSegment(null)}
            >
              <div className="max-w-xs p-2">
                <h3 className="mb-1 text-base font-bold capitalize">
                  {selectedSegment.damageType.replace("_", " ")}
                </h3>
                <p className="mb-1 text-sm font-medium text-gray-700">
                  {selectedSegment.roadNo} - {selectedSegment.roadName}
                </p>
                <p className="mb-1 text-xs text-gray-500">
                  {selectedSegment.province} Province
                </p>
                <p className="mb-2 text-sm">{selectedSegment.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      selectedSegment.severity === 4
                        ? "bg-red-100 text-red-700"
                        : selectedSegment.severity === 3
                          ? "bg-orange-100 text-orange-700"
                          : selectedSegment.severity === 2
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                    }`}
                  >
                    Severity: {selectedSegment.severity}
                  </span>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                    {selectedSegment.status}
                  </span>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>

        <MapLegend />
      </div>
    </MapProvider>
  );
}
