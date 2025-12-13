import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { damageReports, roadSegments, organizations } from "../db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { snapToRoads, calculateMidpoint } from "../services/roadsService";

const mapRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const snapRoadSchema = z.object({
  startLat: z.number(),
  startLng: z.number(),
  endLat: z.number(),
  endLng: z.number(),
});

const createSegmentSchema = z.object({
  reportId: z.string(),
  startLat: z.number(),
  startLng: z.number(),
  endLat: z.number(),
  endLng: z.number(),
  roadName: z.string().optional(),
});

// POST /api/v1/map/snap-road - Get snapped road path between two points
mapRoutes.post("/snap-road", zValidator("json", snapRoadSchema), async (c) => {
  const { startLat, startLng, endLat, endLng } = c.req.valid("json");

  const snappedPath = await snapToRoads(
    startLat,
    startLng,
    endLat,
    endLng,
    c.env.GOOGLE_MAPS_API_KEY
  );

  return c.json({
    path: snappedPath,
    midpoint: calculateMidpoint(snappedPath),
  });
});

// POST /api/v1/map/segments - Create a new road segment
mapRoutes.post(
  "/segments",
  zValidator("json", createSegmentSchema),
  async (c) => {
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    // Snap the road path
    const snappedPath = await snapToRoads(
      body.startLat,
      body.startLng,
      body.endLat,
      body.endLng,
      c.env.GOOGLE_MAPS_API_KEY
    );

    const segmentId = crypto.randomUUID();

    await db.insert(roadSegments).values({
      id: segmentId,
      reportId: body.reportId,
      startLat: body.startLat,
      startLng: body.startLng,
      endLat: body.endLat,
      endLng: body.endLng,
      snappedPath: JSON.stringify(snappedPath),
      roadName: body.roadName || null,
      createdAt: new Date(),
    });

    return c.json({
      id: segmentId,
      path: snappedPath,
      midpoint: calculateMidpoint(snappedPath),
    });
  }
);

// GET /api/v1/map/segments - Get only verified road segments for public display
mapRoutes.get("/segments", async (c) => {
  const db = createDb(c.env.DB);

  // Get segments with their associated damage reports - ONLY verified ones
  const results = await db
    .select({
      id: roadSegments.id,
      reportId: roadSegments.reportId,
      snappedPath: roadSegments.snappedPath,
      roadName: roadSegments.roadName,
      roadNo: roadSegments.roadNo,
      province: roadSegments.province,
      reason: roadSegments.reason,
      fromKm: roadSegments.fromKm,
      toKm: roadSegments.toKm,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      description: damageReports.description,
      status: damageReports.status,
      reportedAt: damageReports.createdAt,
    })
    .from(roadSegments)
    .innerJoin(damageReports, eq(roadSegments.reportId, damageReports.id))
    .where(
      or(
        eq(damageReports.status, "verified"),
        eq(damageReports.status, "in_progress")
      )
    );

  // Format for frontend
  const formatted = results.map((s) => {
    const path = JSON.parse(s.snappedPath || "[]");
    return {
      id: s.id,
      reportId: s.reportId,
      roadName: s.roadName,
      roadNo: s.roadNo,
      province: s.province,
      reason: s.reason,
      fromKm: s.fromKm,
      toKm: s.toKm,
      path,
      midpoint: calculateMidpoint(path),
      damageType: s.damageType,
      severity: s.severity,
      description: s.description,
      status: s.status,
      reportedAt: s.reportedAt,
    };
  });

  return c.json(formatted);
});

// GET /api/v1/map/segments/verified - Get only verified road segments
mapRoutes.get("/segments/verified", async (c) => {
  const db = createDb(c.env.DB);

  const results = await db
    .select({
      id: roadSegments.id,
      reportId: roadSegments.reportId,
      snappedPath: roadSegments.snappedPath,
      roadName: roadSegments.roadName,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      description: damageReports.description,
      reportedAt: damageReports.createdAt,
    })
    .from(roadSegments)
    .innerJoin(damageReports, eq(roadSegments.reportId, damageReports.id))
    .where(
      or(
        eq(damageReports.status, "verified"),
        eq(damageReports.status, "in_progress")
      )
    );

  const formatted = results.map((s) => {
    const path = JSON.parse(s.snappedPath || "[]");
    return {
      id: s.id,
      reportId: s.reportId,
      roadName: s.roadName,
      segment: {
        path,
        midpoint: calculateMidpoint(path),
      },
      damageType: s.damageType,
      severity: s.severity,
      description: s.description,
      reportedAt: s.reportedAt,
    };
  });

  return c.json(formatted);
});

// GET /api/v1/map/incidents - Get all verified incident reports for public map display
// Includes verified, in_progress, and resolved (within last 365 days) reports from all sources
mapRoutes.get("/incidents", async (c) => {
  const db = createDb(c.env.DB);

  // Calculate 365 days ago for resolved items filter
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const oneYearAgoTimestamp = Math.floor(oneYearAgo.getTime() / 1000);

  const reports = await db
    .select({
      id: damageReports.id,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      locationName: damageReports.locationName,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      passabilityLevel: damageReports.passabilityLevel,
      isSingleLane: damageReports.isSingleLane,
      needsSafetyBarriers: damageReports.needsSafetyBarriers,
      blockedDistanceMeters: damageReports.blockedDistanceMeters,
      incidentDetails: damageReports.incidentDetails,
      description: damageReports.description,
      createdAt: damageReports.createdAt,
      updatedAt: damageReports.updatedAt,
      reportNumber: damageReports.reportNumber,
      status: damageReports.status,
      workflowData: damageReports.workflowData,
      resolvedAt: damageReports.resolvedAt,
      inProgressAt: damageReports.inProgressAt,
      assignedOrgId: damageReports.assignedOrgId,
      orgName: organizations.name,
      orgCode: organizations.code,
    })
    .from(damageReports)
    .leftJoin(organizations, eq(damageReports.assignedOrgId, organizations.id))
    .where(
      or(
        eq(damageReports.status, "verified"),
        eq(damageReports.status, "in_progress"),
        // Include resolved items within last 365 days
        and(
          eq(damageReports.status, "resolved"),
          sql`${damageReports.resolvedAt} >= ${oneYearAgoTimestamp}`
        )
      )
    )
    .orderBy(desc(damageReports.createdAt));

  // Parse locationName to extract province and district
  const reportsWithLocation = reports.map(report => {
    let districtName = null;
    let provinceName = null;
    let roadLocation = report.locationName;

    // Format is typically: "Road Name (district, province)" or "(district, province)"
    if (report.locationName) {
      const match = report.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        districtName = match[1].trim();
        provinceName = match[2].trim();
        // Extract road/location name (part before the parentheses)
        const roadMatch = report.locationName.match(/^([^(]+)/);
        if (roadMatch && roadMatch[1].trim()) {
          roadLocation = roadMatch[1].trim();
        }
      }
    }

    return {
      ...report,
      districtName,
      provinceName,
      roadLocation,
    };
  });

  return c.json(reportsWithLocation);
});

// GET /api/v1/map/last-updated - Get timestamp of most recently updated verified report
mapRoutes.get("/last-updated", async (c) => {
  const db = createDb(c.env.DB);

  const result = await db
    .select({
      updatedAt: damageReports.updatedAt,
    })
    .from(damageReports)
    .where(
      or(
        eq(damageReports.status, "verified"),
        eq(damageReports.status, "in_progress")
      )
    )
    .orderBy(desc(damageReports.updatedAt))
    .limit(1);

  if (result.length === 0) {
    return c.json({ lastUpdated: null });
  }

  return c.json({ lastUpdated: result[0].updatedAt });
});

export { mapRoutes };
