import type { PhotoWithMetadata } from "./exif-utils";

const GROUPING_RADIUS_METERS = 50;
const MAX_PHOTOS_PER_INCIDENT = 5;

export interface LocationGroup {
  id: string;
  photos: PhotoWithMetadata[];
  centroid: { latitude: number; longitude: number };
}

export function haversineDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateCentroid(
  photos: PhotoWithMetadata[]
): { latitude: number; longitude: number } {
  const withGps = photos.filter((p) => p.gps);
  if (withGps.length === 0) return { latitude: 0, longitude: 0 };

  const sum = withGps.reduce(
    (acc, p) => ({
      lat: acc.lat + p.gps!.latitude,
      lng: acc.lng + p.gps!.longitude,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    latitude: sum.lat / withGps.length,
    longitude: sum.lng / withGps.length,
  };
}

export function groupPhotosByLocation(photos: PhotoWithMetadata[]): {
  groups: LocationGroup[];
  orphaned: PhotoWithMetadata[];
} {
  const withGps = photos.filter((p) => p.gps !== null);
  const orphaned = photos.filter((p) => p.gps === null);
  const processed = new Set<string>();
  const rawGroups: PhotoWithMetadata[][] = [];

  // Cluster by proximity
  for (const photo of withGps) {
    if (processed.has(photo.id)) continue;

    const group = [photo];
    processed.add(photo.id);

    for (const other of withGps) {
      if (processed.has(other.id)) continue;

      const distance = haversineDistance(photo.gps!, other.gps!);
      if (distance <= GROUPING_RADIUS_METERS) {
        group.push(other);
        processed.add(other.id);
      }
    }

    rawGroups.push(group);
  }

  // Split groups exceeding MAX_PHOTOS_PER_INCIDENT
  const groups: LocationGroup[] = [];
  for (const rawGroup of rawGroups) {
    // Sort by timestamp for consistent splitting
    const sorted = [...rawGroup].sort(
      (a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0)
    );

    for (let i = 0; i < sorted.length; i += MAX_PHOTOS_PER_INCIDENT) {
      const chunk = sorted.slice(i, i + MAX_PHOTOS_PER_INCIDENT);
      groups.push({
        id: crypto.randomUUID(),
        photos: chunk,
        centroid: calculateCentroid(chunk),
      });
    }
  }

  return { groups, orphaned };
}
