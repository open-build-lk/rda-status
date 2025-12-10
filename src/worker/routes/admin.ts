import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { damageReports, roadSegments, mediaAttachments, user, userInvitations, locations, organizations, classificationHistory, userOrganizations, stateTransitions } from "../db/schema";
import { eq, desc, or, isNull, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { sendEmail, getInvitationEmailHtml } from "../services/email";
import { recordAuditEntries, createFieldChangeEntries } from "../services/audit";
import { getAuth } from "../middleware/auth";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "../../react-app/data/initialRoadSegments";
import { snappedRoadPaths } from "../../react-app/data/snappedRoadPaths";
import { authMiddleware, requireRole } from "../middleware/auth";
import { isValidTransition, getAllowedTransitions } from "../../shared/constants";

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

// GET /api/v1/admin/reports - Get all citizen reports for review
// Requires field_officer, planner, admin or super_admin role
adminRoutes.get("/reports", requireRole("field_officer", "planner", "admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);

  // Create aliases for joining locations table twice
  const provinceLocation = alias(locations, "province_location");
  const districtLocation = alias(locations, "district_location");

  const rawReports = await db
    .select({
      id: damageReports.id,
      reportNumber: damageReports.reportNumber,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      status: damageReports.status,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      locationName: damageReports.locationName,
      description: damageReports.description,
      passabilityLevel: damageReports.passabilityLevel,
      anonymousName: damageReports.anonymousName,
      anonymousEmail: damageReports.anonymousEmail,
      anonymousContact: damageReports.anonymousContact,
      isVerifiedSubmitter: damageReports.isVerifiedSubmitter,
      sourceType: damageReports.sourceType,
      workflowData: damageReports.workflowData,
      createdAt: damageReports.createdAt,
      updatedAt: damageReports.updatedAt,
      provinceId: damageReports.provinceId,
      districtId: damageReports.districtId,
      provinceName: provinceLocation.nameEn,
      districtName: districtLocation.nameEn,
    })
    .from(damageReports)
    .leftJoin(provinceLocation, eq(damageReports.provinceId, provinceLocation.id))
    .leftJoin(districtLocation, eq(damageReports.districtId, districtLocation.id))
    .orderBy(desc(damageReports.createdAt));

  // Parse locationName to extract district and province if not already populated
  const reports = rawReports.map(report => {
    let districtName = report.districtName;
    let provinceName = report.provinceName;
    let roadLocation = report.locationName;

    // If district/province not populated but locationName exists, parse it
    // Format is typically: "Road Name (district, province)" or "(district, province)"
    if ((!districtName || !provinceName) && report.locationName) {
      const match = report.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        districtName = districtName || match[1].trim();
        provinceName = provinceName || match[2].trim();
        // Extract road/location name (part before the parentheses)
        const roadMatch = report.locationName.match(/^([^(]+)/);
        if (roadMatch) {
          roadLocation = roadMatch[1].trim() || report.locationName;
        }
      }
    }

    return {
      ...report,
      districtName: districtName || null,
      provinceName: provinceName || null,
      roadLocation: roadLocation || null,
    };
  });

  return c.json(reports);
});

// GET /api/v1/admin/reports/unverified - Get all unverified citizen reports for map view
// Requires field_officer, planner, admin or super_admin role
adminRoutes.get("/reports/unverified", requireRole("field_officer", "planner", "admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);

  const reports = await db
    .select({
      id: damageReports.id,
      reportNumber: damageReports.reportNumber,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      locationName: damageReports.locationName,
      damageType: damageReports.damageType,
      severity: damageReports.severity,
      status: damageReports.status,
      passabilityLevel: damageReports.passabilityLevel,
      isSingleLane: damageReports.isSingleLane,
      description: damageReports.description,
      createdAt: damageReports.createdAt,
      anonymousName: damageReports.anonymousName,
      anonymousEmail: damageReports.anonymousEmail,
      anonymousContact: damageReports.anonymousContact,
      sourceType: damageReports.sourceType,
    })
    .from(damageReports)
    .where(eq(damageReports.status, "new"))
    .orderBy(desc(damageReports.createdAt));

  // Parse locationName to extract province and district
  const reportsWithLocation = reports.map(report => {
    let districtName = null;
    let provinceName = null;
    let roadLocation = report.locationName;

    if (report.locationName) {
      const match = report.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        districtName = match[1].trim();
        provinceName = match[2].trim();
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

// GET /api/v1/admin/reports/:id - Get single report with media, submitter info, and audit trail
// Requires field_officer, planner, admin or super_admin role
adminRoutes.get("/reports/:id", requireRole("field_officer", "planner", "admin", "super_admin"), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.param();

  // Create alias for the performer user
  const performerUser = alias(user, "performer_user");

  const [result] = await db
    .select({
      report: damageReports,
      submitterName: user.name,
      submitterEmail: user.email,
      submitterPhone: user.phone,
      assignedOrgName: organizations.name,
      assignedOrgCode: organizations.code,
    })
    .from(damageReports)
    .leftJoin(user, eq(damageReports.submitterId, user.id))
    .leftJoin(organizations, eq(damageReports.assignedOrgId, organizations.id))
    .where(eq(damageReports.id, id));

  if (!result) {
    return c.json({ error: "Report not found" }, 404);
  }

  const media = await db
    .select()
    .from(mediaAttachments)
    .where(eq(mediaAttachments.reportId, id));

  // Get audit trail with performer names
  const auditTrail = await db
    .select({
      id: stateTransitions.id,
      fieldName: stateTransitions.fieldName,
      oldValue: stateTransitions.oldValue,
      newValue: stateTransitions.newValue,
      fromStatus: stateTransitions.fromStatus,
      toStatus: stateTransitions.toStatus,
      performedBy: stateTransitions.userId,
      performerName: performerUser.name,
      reason: stateTransitions.reason,
      createdAt: stateTransitions.createdAt,
    })
    .from(stateTransitions)
    .leftJoin(performerUser, eq(stateTransitions.userId, performerUser.id))
    .where(eq(stateTransitions.reportId, id))
    .orderBy(desc(stateTransitions.createdAt));

  return c.json({
    ...result.report,
    submitterName: result.submitterName,
    submitterEmail: result.submitterEmail,
    submitterPhone: result.submitterPhone,
    assignedOrgName: result.assignedOrgName,
    assignedOrgCode: result.assignedOrgCode,
    media,
    auditTrail,
  });
});

// Update report status schema
const updateStatusSchema = z.object({
  status: z.enum(["new", "verified", "in_progress", "resolved", "rejected"]),
});

// Workflow data schema (flexible JSON for progress, cost, location, etc.)
const workflowDataSchema = z.object({
  progressPercent: z.number().min(0).max(100).optional(),
  estimatedCostLkr: z.number().min(0).nullable().optional(),
  notes: z.string().optional(),
  // Location data (stored here instead of FK-constrained columns)
  province: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
}).passthrough(); // Allow additional fields for flexibility

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
  workflowData: workflowDataSchema.nullable().optional(),
  // Location fields (province/district are stored in workflowData JSON)
  locationName: z.string().nullable().optional(),
  roadNumberInput: z.string().nullable().optional(),
  roadClass: z.string().nullable().optional(),
  // Incident detail fields
  isSingleLane: z.boolean().nullable().optional(),
  needsSafetyBarriers: z.boolean().nullable().optional(),
  blockedDistanceMeters: z.number().nullable().optional(),
  // Organization assignment
  assignedOrgId: z.string().nullable().optional(),
});

// PATCH /api/v1/admin/reports/:id/status - Update report status
// Requires field_officer, planner, admin or super_admin role
adminRoutes.patch(
  "/reports/:id/status",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  zValidator("json", updateStatusSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();
    const { status: newStatus } = c.req.valid("json");

    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Validate status transition based on user role
    const userRole = auth?.role || "citizen";
    if (!isValidTransition(userRole, report.status, newStatus)) {
      const allowed = getAllowedTransitions(userRole, report.status);
      return c.json(
        {
          error: `Invalid status transition from '${report.status}' to '${newStatus}'`,
          allowedTransitions: allowed,
        },
        400
      );
    }

    await db
      .update(damageReports)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(damageReports.id, id));

    return c.json({ success: true, status: newStatus });
  }
);

// PATCH /api/v1/admin/reports/:id - Update report (all fields) with audit trail
// Requires field_officer, planner, admin or super_admin role
adminRoutes.patch(
  "/reports/:id",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  zValidator("json", updateReportSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();
    const updates = c.req.valid("json");
    const now = new Date();

    console.log("[PATCH /reports/:id] Updating report:", id);
    console.log("[PATCH /reports/:id] Updates received:", JSON.stringify(updates, null, 2));

    try {

    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Validate status transition if status is being updated
    if (updates.status !== undefined && updates.status !== report.status) {
      const userRole = auth?.role || "citizen";
      if (!isValidTransition(userRole, report.status, updates.status)) {
        const allowed = getAllowedTransitions(userRole, report.status);
        return c.json(
          {
            error: `Invalid status transition from '${report.status}' to '${updates.status}'`,
            allowedTransitions: allowed,
          },
          400
        );
      }
    }

    // Track changes for audit trail
    const auditEntries: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
      fromStatus?: string | null;
      toStatus?: string | null;
    }> = [];

    // Build update object with only provided fields and track changes
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (updates.status !== undefined && updates.status !== report.status) {
      updateData.status = updates.status;
      auditEntries.push({
        fieldName: "status",
        oldValue: report.status,
        newValue: updates.status,
        fromStatus: report.status,
        toStatus: updates.status,
      });

      // Set resolution tracking timestamps based on status change
      if (updates.status === "in_progress" && !report.inProgressAt) {
        updateData.inProgressAt = now;
      }
      if (updates.status === "resolved" && !report.resolvedAt) {
        updateData.resolvedAt = now;
      }
    }

    if (updates.damageType !== undefined && updates.damageType !== report.damageType) {
      updateData.damageType = updates.damageType;
      auditEntries.push({
        fieldName: "damageType",
        oldValue: report.damageType,
        newValue: updates.damageType,
      });
    }

    if (updates.severity !== undefined && updates.severity !== report.severity) {
      updateData.severity = updates.severity;
      auditEntries.push({
        fieldName: "severity",
        oldValue: String(report.severity),
        newValue: String(updates.severity),
      });
    }

    if (updates.description !== undefined && updates.description !== report.description) {
      updateData.description = updates.description;
      auditEntries.push({
        fieldName: "description",
        oldValue: report.description,
        newValue: updates.description,
      });
    }

    if (updates.passabilityLevel !== undefined && updates.passabilityLevel !== report.passabilityLevel) {
      updateData.passabilityLevel = updates.passabilityLevel;
      auditEntries.push({
        fieldName: "passabilityLevel",
        oldValue: report.passabilityLevel,
        newValue: updates.passabilityLevel,
      });
    }

    // Handle locationName - just save it directly without combining with province/district
    // Province and district are UI-only for now (FK constraints prevent saving to provinceId/districtId)
    if (updates.locationName !== undefined && updates.locationName !== report.locationName) {
      updateData.locationName = updates.locationName;
      auditEntries.push({
        fieldName: "locationName",
        oldValue: report.locationName,
        newValue: updates.locationName,
      });
    }

    if (updates.roadNumberInput !== undefined && updates.roadNumberInput !== report.roadNumberInput) {
      updateData.roadNumberInput = updates.roadNumberInput;
      auditEntries.push({
        fieldName: "roadNumberInput",
        oldValue: report.roadNumberInput,
        newValue: updates.roadNumberInput,
      });
    }

    if (updates.roadClass !== undefined && updates.roadClass !== report.roadClass) {
      updateData.roadClass = updates.roadClass;
      auditEntries.push({
        fieldName: "roadClass",
        oldValue: report.roadClass,
        newValue: updates.roadClass,
      });
    }

    // Handle incident detail fields
    if (updates.isSingleLane !== undefined && updates.isSingleLane !== report.isSingleLane) {
      updateData.isSingleLane = updates.isSingleLane;
      auditEntries.push({
        fieldName: "isSingleLane",
        oldValue: report.isSingleLane !== null ? String(report.isSingleLane) : null,
        newValue: updates.isSingleLane !== null ? String(updates.isSingleLane) : null,
      });
    }

    if (updates.needsSafetyBarriers !== undefined && updates.needsSafetyBarriers !== report.needsSafetyBarriers) {
      updateData.needsSafetyBarriers = updates.needsSafetyBarriers;
      auditEntries.push({
        fieldName: "needsSafetyBarriers",
        oldValue: report.needsSafetyBarriers !== null ? String(report.needsSafetyBarriers) : null,
        newValue: updates.needsSafetyBarriers !== null ? String(updates.needsSafetyBarriers) : null,
      });
    }

    if (updates.blockedDistanceMeters !== undefined && updates.blockedDistanceMeters !== report.blockedDistanceMeters) {
      updateData.blockedDistanceMeters = updates.blockedDistanceMeters;
      auditEntries.push({
        fieldName: "blockedDistanceMeters",
        oldValue: report.blockedDistanceMeters !== null ? String(report.blockedDistanceMeters) : null,
        newValue: updates.blockedDistanceMeters !== null ? String(updates.blockedDistanceMeters) : null,
      });
    }

    // Handle organization assignment
    if (updates.assignedOrgId !== undefined && updates.assignedOrgId !== report.assignedOrgId) {
      updateData.assignedOrgId = updates.assignedOrgId;
      auditEntries.push({
        fieldName: "assignedOrgId",
        oldValue: report.assignedOrgId,
        newValue: updates.assignedOrgId,
      });
    }

    // Handle workflowData - merge with existing data and track meaningful changes
    if (updates.workflowData !== undefined && updates.workflowData !== null) {
      const existingWorkflow = report.workflowData ? JSON.parse(report.workflowData as string) : {};
      const mergedWorkflow = { ...existingWorkflow, ...updates.workflowData };
      updateData.workflowData = JSON.stringify(mergedWorkflow);

      // Track individual workflow field changes
      for (const [key, newVal] of Object.entries(updates.workflowData)) {
        const oldVal = existingWorkflow[key];
        if (oldVal !== newVal) {
          auditEntries.push({
            fieldName: `workflow.${key}`,
            oldValue: oldVal !== undefined ? String(oldVal) : null,
            newValue: newVal !== undefined && newVal !== null ? String(newVal) : null,
          });
        }
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 1) { // more than just updatedAt
      await db
        .update(damageReports)
        .set(updateData)
        .where(eq(damageReports.id, id));
    }

    // Record audit entries
    // Note: The database has to_status as NOT NULL (SQLite limitation), so for non-status
    // field changes, we use the report's current status as both from_status and to_status
    if (auditEntries.length > 0) {
      const currentStatus = report.status;
      await db.insert(stateTransitions).values(
        auditEntries.map((entry) => ({
          id: crypto.randomUUID(),
          reportId: id,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          // For status changes, use the actual from/to status
          // For other field changes, use the current status as placeholder (NOT NULL constraint)
          fromStatus: entry.fromStatus ?? currentStatus,
          toStatus: entry.toStatus ?? currentStatus,
          userId: auth?.userId || null,
          userRole: auth?.role || null,
          createdAt: now,
        }))
      );
    }

    // Fetch updated report
    const [updated] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    console.log("[PATCH /reports/:id] Success! Updated report:", updated?.reportNumber);
    return c.json({ success: true, report: updated });

    } catch (error) {
      console.error("[PATCH /reports/:id] Error updating report:", error);
      console.error("[PATCH /reports/:id] Error details:", error instanceof Error ? error.message : String(error));
      return c.json({ error: "Failed to update report", details: error instanceof Error ? error.message : String(error) }, 500);
    }
  }
);

// ============ CLASSIFICATION MANAGEMENT ============

// GET /api/v1/admin/reports/pending-classification - Get reports needing manual classification
adminRoutes.get(
  "/reports/pending-classification",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);

    const reports = await db
      .select({
        id: damageReports.id,
        reportNumber: damageReports.reportNumber,
        latitude: damageReports.latitude,
        longitude: damageReports.longitude,
        locationName: damageReports.locationName,
        damageType: damageReports.damageType,
        status: damageReports.status,
        roadNumberInput: damageReports.roadNumberInput,
        roadClass: damageReports.roadClass,
        classificationStatus: damageReports.classificationStatus,
        createdAt: damageReports.createdAt,
      })
      .from(damageReports)
      .where(
        or(
          eq(damageReports.classificationStatus, "pending"),
          isNull(damageReports.classificationStatus)
        )
      )
      .orderBy(desc(damageReports.createdAt));

    return c.json(reports);
  }
);

// GET /api/v1/admin/organizations - Get all organizations
adminRoutes.get(
  "/organizations",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);

    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        code: organizations.code,
        type: organizations.type,
        province: organizations.province,
        roadClasses: organizations.roadClasses,
      })
      .from(organizations)
      .where(eq(organizations.isActive, true))
      .orderBy(organizations.type, organizations.code);

    // Sort: national orgs first (RDA, UDA), then provincial alphabetically
    const sorted = orgs.sort((a, b) => {
      if (a.type === "national" && b.type !== "national") return -1;
      if (a.type !== "national" && b.type === "national") return 1;
      if (a.type === "national" && b.type === "national") {
        // RDA first, then UDA
        if (a.code === "RDA") return -1;
        if (b.code === "RDA") return 1;
        if (a.code === "UDA") return -1;
        if (b.code === "UDA") return 1;
      }
      return a.code.localeCompare(b.code);
    });

    return c.json(sorted);
  }
);

// Classification schema
const classifyReportSchema = z.object({
  roadId: z.string().optional(),
  roadClass: z.enum(["A", "B", "C", "D", "E"]).optional(),
  assignedOrgId: z.string(),
  reason: z.string().max(500).optional(),
});

// PATCH /api/v1/admin/reports/:id/classify - Manually classify a report
adminRoutes.patch(
  "/reports/:id/classify",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  zValidator("json", classifyReportSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();
    const { roadId, roadClass, assignedOrgId, reason } = c.req.valid("json");
    const now = new Date();

    // Get current report
    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Record classification history
    await db.insert(classificationHistory).values({
      id: crypto.randomUUID(),
      reportId: id,
      previousRoadClass: report.roadClass || null,
      newRoadClass: roadClass || null,
      previousOrgId: report.assignedOrgId || null,
      newOrgId: assignedOrgId,
      changedBy: auth?.userId || "system",
      reason: reason || null,
      createdAt: now,
    });

    // Update the report
    const nowTs = Math.floor(now.getTime() / 1000);
    await c.env.DB.prepare(`
      UPDATE damage_reports
      SET road_id = ?,
          road_class = ?,
          assigned_org_id = ?,
          classification_status = 'manual_classified',
          classified_by = ?,
          classified_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      roadId || null,
      roadClass || null,
      assignedOrgId,
      auth?.userId || null,
      nowTs,
      nowTs,
      id
    ).run();

    return c.json({
      success: true,
      classificationStatus: "manual_classified",
      assignedOrgId,
      roadClass: roadClass || null,
    });
  }
);

// PATCH /api/v1/admin/reports/:id/unclassifiable - Mark report as unclassifiable
adminRoutes.patch(
  "/reports/:id/unclassifiable",
  requireRole("field_officer", "planner", "admin", "super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();
    const now = new Date();

    const [report] = await db
      .select()
      .from(damageReports)
      .where(eq(damageReports.id, id));

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    const nowTs = Math.floor(now.getTime() / 1000);
    await c.env.DB.prepare(`
      UPDATE damage_reports
      SET classification_status = 'unclassifiable',
          classified_by = ?,
          classified_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      auth?.userId || null,
      nowTs,
      nowTs,
      id
    ).run();

    return c.json({
      success: true,
      classificationStatus: "unclassifiable",
    });
  }
);

// ============ USER MANAGEMENT (Super Admin Only) ============

// Validation schemas
const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["citizen", "field_officer", "planner", "admin", "super_admin", "stakeholder"]),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  role: z.enum(["citizen", "field_officer", "planner", "admin", "super_admin", "stakeholder"]).optional(),
  isActive: z.boolean().optional(),
  designation: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
});

// GET /api/v1/admin/users - List all users with their invitation status and organizations
adminRoutes.get("/users", requireRole("super_admin", "admin"), async (c) => {
  const db = createDb(c.env.DB);

  // Get all users with their primary organization
  const usersData = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      phone: user.phone,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  // Get all user-organization assignments with org details
  const allMemberships = await db
    .select({
      userId: userOrganizations.userId,
      orgId: userOrganizations.organizationId,
      orgCode: organizations.code,
      orgName: organizations.name,
      orgRole: userOrganizations.role,
      isPrimary: userOrganizations.isPrimary,
    })
    .from(userOrganizations)
    .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id));

  // Group memberships by user
  const membershipsByUser = new Map<string, typeof allMemberships>();
  for (const m of allMemberships) {
    if (!membershipsByUser.has(m.userId)) {
      membershipsByUser.set(m.userId, []);
    }
    membershipsByUser.get(m.userId)!.push(m);
  }

  // Attach organizations to users
  const users = usersData.map((u) => ({
    ...u,
    organizations: membershipsByUser.get(u.id) || [],
  }));

  // Get pending invitations (including expired ones for visibility)
  const allPendingInvitations = await db
    .select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      status: userInvitations.status,
      expiresAt: userInvitations.expiresAt,
      createdAt: userInvitations.createdAt,
    })
    .from(userInvitations)
    .where(eq(userInvitations.status, "pending"))
    .orderBy(desc(userInvitations.createdAt));

  // Mark expired invitations and separate them
  const now = new Date();
  const pendingInvitations = allPendingInvitations.map(inv => ({
    ...inv,
    isExpired: inv.expiresAt ? new Date(inv.expiresAt) < now : false,
  }));

  // Get all organizations for filter dropdown
  const orgs = await db
    .select({
      id: organizations.id,
      code: organizations.code,
      name: organizations.name,
      type: organizations.type,
    })
    .from(organizations)
    .where(eq(organizations.isActive, true))
    .orderBy(organizations.type, organizations.code);

  return c.json({ users, pendingInvitations, organizations: orgs });
});

// POST /api/v1/admin/users/invite - Send invitation to new user with audit trail
adminRoutes.post(
  "/users/invite",
  requireRole("super_admin"),
  zValidator("json", inviteUserSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { email, role } = c.req.valid("json");

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (existingUser) {
      return c.json({ error: "User with this email already exists" }, 400);
    }

    // Check if there's already a pending invitation
    const [existingInvite] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.email, email));

    if (existingInvite && existingInvite.status === "pending") {
      return c.json({ error: "Pending invitation already exists for this email" }, 400);
    }

    // Generate invitation token and ID
    const inviteId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    await db.insert(userInvitations).values({
      id: inviteId,
      email,
      role,
      invitedBy: auth?.userId || null,
      token,
      status: "pending",
      expiresAt,
    });

    // Get inviter name for email
    const inviterName = auth?.name || "An administrator";

    // Build invitation URL
    const baseUrl = c.req.header("origin") || "https://road-lk.org";
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

    // Send invitation email
    try {
      await sendEmail(
        c.env,
        email,
        "You're Invited to Sri Lanka Road Status",
        getInvitationEmailHtml({
          inviterName,
          role,
          inviteUrl,
          expiresAt,
        })
      );
    } catch (error) {
      // If email fails, delete the invitation
      await db.delete(userInvitations).where(eq(userInvitations.id, inviteId));
      console.error("Failed to send invitation email:", error);
      return c.json({ error: "Failed to send invitation email" }, 500);
    }

    // Record audit entry for invitation created
    await recordAuditEntries(db, [{
      targetType: "invitation",
      targetId: inviteId,
      fieldName: "status",
      oldValue: null,
      newValue: "pending",
      performedBy: auth?.userId || null,
      performerRole: auth?.role || null,
      metadata: { email, role, expiresAt: expiresAt.toISOString() },
    }]);

    return c.json({
      success: true,
      invitation: {
        id: inviteId,
        email,
        role,
        expiresAt,
      },
    });
  }
);

// PATCH /api/v1/admin/users/:id - Update user role, status, designation, etc. with audit trail
adminRoutes.patch(
  "/users/:id",
  requireRole("super_admin", "admin"),
  zValidator("json", updateUserSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();
    const updates = c.req.valid("json");

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id));

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent self-modification of role/status (but allow updating own name, designation, phone)
    if (id === auth?.userId) {
      const isChangingRole = updates.role !== undefined && updates.role !== existingUser.role;
      const isChangingStatus = updates.isActive !== undefined && updates.isActive !== Boolean(existingUser.isActive);
      if (isChangingRole || isChangingStatus) {
        return c.json({ error: "Cannot modify your own role or status" }, 400);
      }
    }

    // Track changes for audit trail
    const auditEntries = createFieldChangeEntries(
      "user",
      id,
      {
        name: existingUser.name,
        role: existingUser.role,
        isActive: existingUser.isActive,
        designation: existingUser.designation,
        phone: existingUser.phone,
      },
      updates,
      auth?.userId || null,
      auth?.role || null,
      { targetEmail: existingUser.email }
    );

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.designation !== undefined) updateData.designation = updates.designation;
    if (updates.phone !== undefined) updateData.phone = updates.phone;

    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id));

    // Record audit entries
    if (auditEntries.length > 0) {
      await recordAuditEntries(db, auditEntries);
    }

    // Fetch updated user
    const [updated] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      })
      .from(user)
      .where(eq(user.id, id));

    return c.json({ success: true, user: updated });
  }
);

// DELETE /api/v1/admin/users/invitations/:id - Cancel pending invitation with audit trail
adminRoutes.delete(
  "/users/invitations/:id",
  requireRole("super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();

    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, id));

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    if (invitation.status !== "pending") {
      return c.json({ error: "Can only cancel pending invitations" }, 400);
    }

    await db
      .update(userInvitations)
      .set({ status: "cancelled" })
      .where(eq(userInvitations.id, id));

    // Record audit entry for invitation cancelled
    await recordAuditEntries(db, [{
      targetType: "invitation",
      targetId: id,
      fieldName: "status",
      oldValue: "pending",
      newValue: "cancelled",
      performedBy: auth?.userId || null,
      performerRole: auth?.role || null,
      metadata: { email: invitation.email, role: invitation.role },
    }]);

    return c.json({ success: true });
  }
);

// POST /api/v1/admin/users/invitations/:id/resend - Resend invitation email
adminRoutes.post(
  "/users/invitations/:id/resend",
  requireRole("super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const { id } = c.req.param();

    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, id));

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    if (invitation.status !== "pending") {
      return c.json({ error: "Can only resend pending invitations" }, 400);
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomUUID();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update invitation with new token and expiry
    await db
      .update(userInvitations)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
      })
      .where(eq(userInvitations.id, id));

    // Get inviter name for email
    const inviterName = auth?.name || "An administrator";

    // Build invitation URL
    const baseUrl = c.req.header("origin") || "https://road-lk.org";
    const inviteUrl = `${baseUrl}/accept-invite?token=${newToken}`;

    // Send invitation email
    try {
      await sendEmail(
        c.env,
        invitation.email,
        "Reminder: You're Invited to Sri Lanka Road Status",
        getInvitationEmailHtml({
          inviterName,
          role: invitation.role,
          inviteUrl,
          expiresAt: newExpiresAt,
        })
      );
    } catch (error) {
      console.error("Failed to resend invitation email:", error);
      return c.json({ error: "Failed to send invitation email" }, 500);
    }

    // Record audit entry for invitation resent
    await recordAuditEntries(db, [{
      targetType: "invitation",
      targetId: id,
      fieldName: "resent",
      oldValue: null,
      newValue: newExpiresAt.toISOString(),
      performedBy: auth?.userId || null,
      performerRole: auth?.role || null,
      metadata: { email: invitation.email, role: invitation.role },
    }]);

    return c.json({ success: true, expiresAt: newExpiresAt });
  }
);

// GET /api/v1/admin/users/:id/audit-trail - Get audit trail for a user
adminRoutes.get(
  "/users/:id/audit-trail",
  requireRole("super_admin", "admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();

    // Check user exists
    const [existingUser] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, id));

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's organization membership IDs for audit lookup
    const userOrgMemberships = await db
      .select({ id: userOrganizations.id })
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, id));
    const membershipIds = userOrgMemberships.map(m => m.id);

    // Get invitations for this user's email
    const userInvites = await db
      .select({ id: userInvitations.id })
      .from(userInvitations)
      .where(eq(userInvitations.email, existingUser.email));
    const invitationIds = userInvites.map(i => i.id);

    // Alias for performer user lookup
    const performer = alias(user, "performer");

    // Build query for all audit entries related to this user:
    // 1. Direct user changes (targetType='user' AND targetId=userId)
    // 2. Their invitations (targetType='invitation' AND targetId IN invitationIds)
    // 3. Their org memberships (targetType='user_organization' AND targetId IN membershipIds)
    // 4. Changes they performed (userId=id)
    const conditions = [
      and(eq(stateTransitions.targetType, "user"), eq(stateTransitions.targetId, id)),
      eq(stateTransitions.userId, id),
    ];

    if (invitationIds.length > 0) {
      conditions.push(
        and(
          eq(stateTransitions.targetType, "invitation"),
          or(...invitationIds.map(invId => eq(stateTransitions.targetId, invId)))
        )
      );
    }

    if (membershipIds.length > 0) {
      conditions.push(
        and(
          eq(stateTransitions.targetType, "user_organization"),
          or(...membershipIds.map(memId => eq(stateTransitions.targetId, memId)))
        )
      );
    }

    const auditEntries = await db
      .select({
        id: stateTransitions.id,
        targetType: stateTransitions.targetType,
        targetId: stateTransitions.targetId,
        fieldName: stateTransitions.fieldName,
        oldValue: stateTransitions.oldValue,
        newValue: stateTransitions.newValue,
        reason: stateTransitions.reason,
        metadata: stateTransitions.metadata,
        createdAt: stateTransitions.createdAt,
        performedById: stateTransitions.userId,
        performerRole: stateTransitions.userRole,
        performerName: performer.name,
      })
      .from(stateTransitions)
      .leftJoin(performer, eq(stateTransitions.userId, performer.id))
      .where(or(...conditions))
      .orderBy(desc(stateTransitions.createdAt))
      .limit(100);

    // Parse metadata JSON and format response
    const formattedEntries = auditEntries.map(entry => ({
      ...entry,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    }));

    return c.json({
      userId: id,
      entries: formattedEntries,
    });
  }
);

// ============ USER-ORGANIZATION MANAGEMENT ============

// GET /api/v1/admin/users/:id/organizations - Get user's organization memberships
adminRoutes.get(
  "/users/:id/organizations",
  requireRole("super_admin", "admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();

    // Check user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, id));

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's organizations with details
    const memberships = await db
      .select({
        organizationId: userOrganizations.organizationId,
        role: userOrganizations.role,
        isPrimary: userOrganizations.isPrimary,
        assignedAt: userOrganizations.createdAt,
        orgName: organizations.name,
        orgCode: organizations.code,
        orgType: organizations.type,
        orgProvince: organizations.province,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.userId, id));

    return c.json(memberships);
  }
);

// Assign user to organization schema
const assignOrgSchema = z.object({
  organizationId: z.string(),
  role: z.enum(["member", "manager", "admin"]).default("member"),
  isPrimary: z.boolean().default(false),
});

// POST /api/v1/admin/users/:id/organizations - Assign user to organization
adminRoutes.post(
  "/users/:id/organizations",
  requireRole("super_admin", "admin"),
  zValidator("json", assignOrgSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();
    const { organizationId, role, isPrimary } = c.req.valid("json");

    // Check user exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, id));

    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check organization exists
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Check if assignment already exists
    const [existing] = await db
      .select()
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, id),
          eq(userOrganizations.organizationId, organizationId)
        )
      );

    if (existing) {
      return c.json({ error: "User is already a member of this organization" }, 400);
    }

    // If this is being set as primary, unset other primaries
    if (isPrimary) {
      await db
        .update(userOrganizations)
        .set({ isPrimary: false })
        .where(eq(userOrganizations.userId, id));
    }

    // Create assignment
    const assignmentId = crypto.randomUUID();
    await db.insert(userOrganizations).values({
      id: assignmentId,
      userId: id,
      organizationId,
      role,
      isPrimary,
    });

    // Fetch the created assignment with org details
    const [assignment] = await db
      .select({
        organizationId: userOrganizations.organizationId,
        role: userOrganizations.role,
        isPrimary: userOrganizations.isPrimary,
        assignedAt: userOrganizations.createdAt,
        orgName: organizations.name,
        orgCode: organizations.code,
        orgType: organizations.type,
      })
      .from(userOrganizations)
      .innerJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
      .where(eq(userOrganizations.id, assignmentId));

    // Record audit entry for organization assignment
    const auth = getAuth(c);
    await recordAuditEntries(db, [{
      targetType: "user_organization",
      targetId: assignmentId,
      fieldName: "assignment",
      oldValue: null,
      newValue: "created",
      performedBy: auth?.userId || null,
      performerRole: auth?.role || null,
      metadata: {
        userId: id,
        organizationId,
        orgName: assignment?.orgName,
        role,
        isPrimary,
      },
    }]);

    return c.json({ success: true, assignment });
  }
);

// PATCH /api/v1/admin/users/:id/organizations/:orgId - Update membership
adminRoutes.patch(
  "/users/:id/organizations/:orgId",
  requireRole("super_admin", "admin"),
  zValidator("json", z.object({
    role: z.enum(["member", "manager", "admin"]).optional(),
    isPrimary: z.boolean().optional(),
  })),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id, orgId } = c.req.param();
    const updates = c.req.valid("json");

    // Check membership exists
    const [membership] = await db
      .select()
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, id),
          eq(userOrganizations.organizationId, orgId)
        )
      );

    if (!membership) {
      return c.json({ error: "Membership not found" }, 404);
    }

    // If setting as primary, unset other primaries first
    if (updates.isPrimary) {
      await db
        .update(userOrganizations)
        .set({ isPrimary: false })
        .where(eq(userOrganizations.userId, id));
    }

    // Update membership
    const updateData: Record<string, unknown> = {};
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isPrimary !== undefined) updateData.isPrimary = updates.isPrimary;

    await db
      .update(userOrganizations)
      .set(updateData)
      .where(
        and(
          eq(userOrganizations.userId, id),
          eq(userOrganizations.organizationId, orgId)
        )
      );

    // Record audit entries for changed fields
    const auth = getAuth(c);
    const auditEntries = createFieldChangeEntries(
      "user_organization",
      membership.id,
      { role: membership.role, isPrimary: membership.isPrimary },
      updateData as { role?: string; isPrimary?: boolean },
      auth?.userId || null,
      auth?.role || null,
      { userId: id, organizationId: orgId }
    );
    if (auditEntries.length > 0) {
      await recordAuditEntries(db, auditEntries);
    }

    return c.json({ success: true });
  }
);

// DELETE /api/v1/admin/users/:id/organizations/:orgId - Remove user from organization
adminRoutes.delete(
  "/users/:id/organizations/:orgId",
  requireRole("super_admin", "admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id, orgId } = c.req.param();

    // Check membership exists
    const [membership] = await db
      .select()
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, id),
          eq(userOrganizations.organizationId, orgId)
        )
      );

    if (!membership) {
      return c.json({ error: "Membership not found" }, 404);
    }

    // Delete the membership
    await db
      .delete(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, id),
          eq(userOrganizations.organizationId, orgId)
        )
      );

    // Record audit entry for organization removal
    const auth = getAuth(c);
    await recordAuditEntries(db, [{
      targetType: "user_organization",
      targetId: membership.id,
      fieldName: "assignment",
      oldValue: "active",
      newValue: "removed",
      performedBy: auth?.userId || null,
      performerRole: auth?.role || null,
      metadata: {
        userId: id,
        organizationId: orgId,
        previousRole: membership.role,
        wasPrimary: membership.isPrimary,
      },
    }]);

    return c.json({ success: true });
  }
);

// ============ UNIVERSAL AUDIT TRAIL ============

// GET /api/v1/admin/audit-trail - Get all audit entries with pagination
adminRoutes.get(
  "/audit-trail",
  requireRole("super_admin"),
  async (c) => {
    const db = createDb(c.env.DB);
    const url = new URL(c.req.url);

    // Pagination params
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    // Filter params
    const targetType = url.searchParams.get("targetType"); // report, user, invitation, user_organization
    const performerId = url.searchParams.get("performerId");

    // Alias for performer user lookup
    const performer = alias(user, "performer");

    // Build conditions
    const conditions = [];
    if (targetType) {
      conditions.push(eq(stateTransitions.targetType, targetType));
    }
    if (performerId) {
      conditions.push(eq(stateTransitions.userId, performerId));
    }

    // This is a workaround since D1 doesn't have COUNT()
    const allIds = await db
      .select({ id: stateTransitions.id })
      .from(stateTransitions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalCount = allIds.length;

    // Get paginated entries
    const entries = await db
      .select({
        id: stateTransitions.id,
        targetType: stateTransitions.targetType,
        targetId: stateTransitions.targetId,
        reportId: stateTransitions.reportId,
        fieldName: stateTransitions.fieldName,
        oldValue: stateTransitions.oldValue,
        newValue: stateTransitions.newValue,
        fromStatus: stateTransitions.fromStatus,
        toStatus: stateTransitions.toStatus,
        reason: stateTransitions.reason,
        metadata: stateTransitions.metadata,
        createdAt: stateTransitions.createdAt,
        performedById: stateTransitions.userId,
        performerRole: stateTransitions.userRole,
        performerName: performer.name,
        performerEmail: performer.email,
      })
      .from(stateTransitions)
      .leftJoin(performer, eq(stateTransitions.userId, performer.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stateTransitions.createdAt))
      .limit(limit)
      .offset(offset);

    // Parse metadata JSON
    const formattedEntries = entries.map(entry => ({
      ...entry,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    }));

    return c.json({
      entries: formattedEntries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  }
);

export { adminRoutes };
