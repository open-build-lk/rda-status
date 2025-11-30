import { useState, useEffect } from "react";
import { LatLngExpression } from "leaflet";

export interface RoadSegmentData {
  id: string;
  reportId: string | null;
  roadNo: string | null;
  roadName: string | null;
  province: string | null;
  reason: string | null;
  fromKm: number | null;
  toKm: number | null;
  path: Array<{ lat: number; lng: number }>;
  midpoint: { lat: number; lng: number } | null;
  damageType: string | null;
  severity: number | null;
  description: string | null;
  status: string | null;
}

export interface ProcessedRoadSegment {
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

export function useRoadSegmentsAPI() {
  const [segments, setSegments] = useState<RoadSegmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/map/segments")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch segments");
        return res.json() as Promise<RoadSegmentData[]>;
      })
      .then(setSegments)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { segments, isLoading, error };
}

// Process raw API data into format expected by map component
export function useRoadSegments(): {
  segments: ProcessedRoadSegment[];
  isLoading: boolean;
  error: string | null;
} {
  const { segments: rawSegments, isLoading, error } = useRoadSegmentsAPI();

  const segments: ProcessedRoadSegment[] = rawSegments
    .filter((seg) => {
      // Filter out segments with no path or single point
      return seg.path && seg.path.length >= 2;
    })
    .map((seg) => {
      // Convert path to Leaflet format [lat, lng]
      const path: LatLngExpression[] = seg.path.map((p) => [p.lat, p.lng]);

      // Calculate midpoint from the actual path
      const midIndex = Math.floor(seg.path.length / 2);
      const midpointRaw = seg.path[midIndex] || seg.path[0];
      const midpoint: LatLngExpression = [midpointRaw.lat, midpointRaw.lng];

      return {
        id: seg.id,
        roadNo: seg.roadNo || "Unknown",
        roadName: seg.roadName,
        province: seg.province || "Unknown",
        path,
        midpoint,
        damageType: seg.damageType || "other",
        severity: seg.severity || 2,
        description:
          seg.description ||
          `${seg.roadNo} from km ${seg.fromKm} to km ${seg.toKm}`,
        reason: seg.reason || seg.description || "Unknown",
      };
    });

  return { segments, isLoading, error };
}
