import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { damageReports, roadSegments, mediaAttachments } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "../../react-app/data/initialRoadSegments";
import { snappedRoadPaths } from "../../react-app/data/snappedRoadPaths";
import { authMiddleware, requireRole } from "../middleware/auth";

const adminRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all admin routes - requires login
adminRoutes.use("/*", authMiddleware());

// POST /api/v1/admin/import-segments - Import hardcoded segments to database
// Requires admin or super_admin role
adminRoutes.post("/import-segments", requireRole("admin", "super_admin"), async (c) => {
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
// Requires admin or super_admin role
adminRoutes.get("/segments-count", requireRole("admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);
  const results = await db.select().from(roadSegments);
  return c.json({ count: results.length });
});

// GET /api/v1/admin/reports - Get all citizen reports for admin review
// Requires admin or super_admin role
adminRoutes.get("/reports", requireRole("admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);

  const reports = await db
    .select({
      id: damageReports.id,
      reportNumber: damageReports.reportNumber,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      status: damageReports.status,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      description: damageReports.description,
      passabilityLevel: damageReports.passabilityLevel,
      anonymousName: damageReports.anonymousName,
      anonymousEmail: damageReports.anonymousEmail,
      anonymousContact: damageReports.anonymousContact,
      isVerifiedSubmitter: damageReports.isVerifiedSubmitter,
      sourceType: damageReports.sourceType,
      createdAt: damageReports.createdAt,
      updatedAt: damageReports.updatedAt,
    })
    .from(damageReports)
    .orderBy(desc(damageReports.createdAt));

  return c.json(reports);
});

// GET /api/v1/admin/reports/:id - Get single report with media
// Requires admin or super_admin role
adminRoutes.get("/reports/:id", requireRole("admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.param();

  const [report] = await db
    .select()
    .from(damageReports)
    .where(eq(damageReports.id, id));

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  const media = await db
    .select()
    .from(mediaAttachments)
    .where(eq(mediaAttachments.reportId, id));

  return c.json({ ...report, media });
});

// Update report status schema
const updateStatusSchema = z.object({
  status: z.enum(["new", "verified", "in_progress", "resolved", "rejected"]),
});

// Update report schema (all editable fields)
const updateReportSchema = z.object({
  status: z.enum(["new", "verified", "in_progress", "resolved", "rejected"]).optional(),
  damageType: z.enum([
    "tree_fall",
    "bridge_collapse",
    "landslide",
    "flooding",
    "road_breakage",
    "washout",
    "collapse",
    "blockage",
    "other",
  ]).optional(),
  severity: z.number().min(1).max(5).optional(),
  description: z.string().optional(),
  passabilityLevel: z.string().nullable().optional(),
  anonymousName: z.string().nullable().optional(),
  anonymousEmail: z.string().nullable().optional(),
  anonymousContact: z.string().nullable().optional(),
  isVerifiedSubmitter: z.boolean().optional(),
});

// PATCH /api/v1/admin/reports/:id/status - Update report status
// Requires admin or super_admin role
adminRoutes.patch(
  "/reports/:id/status",
  requireRole("admin", "super_admin"),
  zValidator("json", updateStatusSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();
    const { status } = c.req.valid("json");

    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    await db
      .update(damageReports)
      .set({ status, updatedAt: new Date() })
      .where(eq(damageReports.id, id));

    return c.json({ success: true, status });
  }
);

// PATCH /api/v1/admin/reports/:id - Update report (all fields)
// Requires admin or super_admin role
adminRoutes.patch(
  "/reports/:id",
  requireRole("admin", "super_admin"),
  zValidator("json", updateReportSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();
    const updates = c.req.valid("json");

    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.damageType !== undefined) updateData.damageType = updates.damageType;
    if (updates.severity !== undefined) updateData.severity = updates.severity;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.passabilityLevel !== undefined) updateData.passabilityLevel = updates.passabilityLevel;
    if (updates.anonymousName !== undefined) updateData.anonymousName = updates.anonymousName;
    if (updates.anonymousEmail !== undefined) updateData.anonymousEmail = updates.anonymousEmail;
    if (updates.anonymousContact !== undefined) updateData.anonymousContact = updates.anonymousContact;
    if (updates.isVerifiedSubmitter !== undefined) updateData.isVerifiedSubmitter = updates.isVerifiedSubmitter ? 1 : 0;

    await db
      .update(damageReports)
      .set(updateData)
      .where(eq(damageReports.id, id));

    // Fetch updated report
    const [updated] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    return c.json({ success: true, report: updated });
  }
);

export { adminRoutes };
