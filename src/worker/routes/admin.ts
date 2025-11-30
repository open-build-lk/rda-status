import { Hono } from "hono";
import { createDb } from "../db";
import { damageReports, roadSegments } from "../db/schema";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "../../react-app/data/initialRoadSegments";
import { snappedRoadPaths } from "../../react-app/data/snappedRoadPaths";

const adminRoutes = new Hono<{ Bindings: Env }>();

// POST /api/v1/admin/import-segments - Import hardcoded segments to database
// Note: In production, add authMiddleware() and requireRole("admin", "super_admin")
adminRoutes.post("/import-segments", async (c) => {
  const db = createDb(c.env.DB);
  const now = new Date();

  // Prepare migration data inline
  const data = initialRoadSegments.map((seg) => {
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

  let imported = 0;
  const errors: string[] = [];

  for (const seg of data) {
    try {
      // Create damage report
      await db.insert(damageReports).values({
        id: seg.reportId,
        reportNumber: `IMPORT-${seg.id}`,
        sourceType: "other_agency",
        sourceChannel: "bulk_upload",
        latitude: seg.startLat,
        longitude: seg.startLng,
        assetType: "road",
        damageType: seg.damageType,
        severity: seg.severity,
        description: seg.reason,
        status: "verified",
        createdAt: now,
        updatedAt: now,
      });

      // Create road segment
      await db.insert(roadSegments).values({
        id: seg.id,
        reportId: seg.reportId,
        roadNo: seg.roadNo,
        roadName: seg.roadName,
        province: seg.province,
        reason: seg.reason,
        startLat: seg.startLat,
        startLng: seg.startLng,
        endLat: seg.endLat,
        endLng: seg.endLng,
        fromKm: seg.fromKm,
        toKm: seg.toKm,
        snappedPath: JSON.stringify(seg.snappedPath),
        dataSource: seg.dataSource,
        createdAt: now,
      });

      imported++;
    } catch (error) {
      errors.push(`${seg.id}: ${String(error)}`);
    }
  }

  return c.json({
    success: errors.length === 0,
    imported,
    total: data.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// GET /api/v1/admin/segments-count - Check how many segments exist
adminRoutes.get("/segments-count", async (c) => {
  const db = createDb(c.env.DB);
  const results = await db.select().from(roadSegments);
  return c.json({ count: results.length });
});

export { adminRoutes };
