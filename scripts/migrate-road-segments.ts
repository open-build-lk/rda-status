// Data migration script for road segments
// This prepares data from hardcoded files for database import

import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "../src/react-app/data/initialRoadSegments";
import { snappedRoadPaths } from "../src/react-app/data/snappedRoadPaths";

export interface MigrationSegment {
  id: string;
  reportId: string;
  roadNo: string;
  roadName: string;
  province: string;
  reason: string;
  damageType: string;
  severity: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fromKm: number;
  toKm: number;
  snappedPath: Array<{ lat: number; lng: number }>;
  dataSource: string;
}

export function prepareMigrationData(): MigrationSegment[] {
  return initialRoadSegments.map((seg) => {
    // Use pre-computed snapped path, or fall back to straight line
    const path = snappedRoadPaths[seg.id] || [
      { lat: seg.fromLat, lng: seg.fromLng },
      { lat: seg.toLat, lng: seg.toLng },
    ];

    return {
      id: seg.id,
      reportId: `report-${seg.id}`,
      roadNo: seg.roadNo,
      roadName: seg.roadName,
      province: seg.province,
      reason: seg.reason,
      damageType: mapReasonToDamageType(seg.reason),
      severity: mapReasonToSeverity(seg.reason),
      startLat: seg.fromLat,
      startLng: seg.fromLng,
      endLat: seg.toLat,
      endLng: seg.toLng,
      fromKm: seg.fromKm,
      toKm: seg.toKm,
      snappedPath: path,
      dataSource: seg.dataSource,
    };
  });
}
