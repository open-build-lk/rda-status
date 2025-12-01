import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { damageReports, mediaAttachments } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, optionalAuthMiddleware, getAuth } from "../middleware/auth";

const reportsRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const createReportSchema = z.object({
  // Required
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-90).max(90),
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
  ]),

  // Optional
  anonymousName: z.string().max(100).optional(),
  anonymousContact: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  passabilityLevel: z
    .enum(["unpassable", "foot", "bike", "3wheeler", "car", "bus", "truck"])
    .optional(),
  isSingleLane: z.boolean().optional(),
  blockedDistanceMeters: z.number().min(0).max(10000).optional(),
  mediaKeys: z.array(z.string()).max(5).optional(), // R2 storage keys for uploaded photos
});

const claimReportSchema = z.object({
  claimToken: z.string().uuid(),
});

// Generate unique report number
function generateReportNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CR-${year}${month}${day}-${random}`;
}

// POST /api/v1/reports - Create new incident report (anonymous or authenticated)
reportsRoutes.post(
  "/",
  optionalAuthMiddleware(),
  zValidator("json", createReportSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const auth = getAuth(c);
    const data = c.req.valid("json");
    const now = new Date();

    // Generate claim token for anonymous users
    const claimToken = !auth ? crypto.randomUUID() : null;

    const reportId = crypto.randomUUID();
    const reportNumber = generateReportNumber();

    // Create the damage report
    await db.insert(damageReports).values({
      id: reportId,
      reportNumber,
      submitterId: auth?.userId || null,
      anonymousName: data.anonymousName || null,
      anonymousContact: data.anonymousContact || null,
      sourceType: "citizen",
      sourceChannel: "mobile_web",
      latitude: data.latitude,
      longitude: data.longitude,
      assetType: "road",
      damageType: data.damageType,
      severity: 2, // Default medium severity for citizen reports
      description: data.description || `Citizen report: ${data.damageType}`,
      status: "new",
      passabilityLevel: data.passabilityLevel || "unpassable",
      isSingleLane: data.isSingleLane || false,
      blockedDistanceMeters: data.blockedDistanceMeters || null,
      submissionSource: "citizen_mobile",
      isVerifiedSubmitter: !!auth,
      claimToken,
      createdAt: now,
      updatedAt: now,
    });

    // Link any uploaded media to this report
    if (data.mediaKeys && data.mediaKeys.length > 0) {
      for (const storageKey of data.mediaKeys) {
        await db
          .update(mediaAttachments)
          .set({ reportId })
          .where(
            and(
              eq(mediaAttachments.storageKey, storageKey),
              eq(mediaAttachments.reportId, null as unknown as string)
            )
          );
      }
    }

    return c.json({
      id: reportId,
      reportNumber,
      claimToken,
      promptSignup: !auth,
    });
  }
);

// GET /api/v1/reports - Get user's own reports (authenticated)
reportsRoutes.get("/", authMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const auth = getAuth(c);

  if (!auth) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const reports = await db
    .select({
      id: damageReports.id,
      reportNumber: damageReports.reportNumber,
      damageType: damageReports.damageType,
      status: damageReports.status,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      description: damageReports.description,
      passabilityLevel: damageReports.passabilityLevel,
      createdAt: damageReports.createdAt,
    })
    .from(damageReports)
    .where(eq(damageReports.submitterId, auth.userId))
    .orderBy(desc(damageReports.createdAt));

  return c.json(reports);
});

// GET /api/v1/reports/area - Get approved reports by location bounds (public)
reportsRoutes.get("/area", async (c) => {
  const db = createDb(c.env.DB);

  // Get approved citizen reports
  const reports = await db
    .select({
      id: damageReports.id,
      damageType: damageReports.damageType,
      latitude: damageReports.latitude,
      longitude: damageReports.longitude,
      description: damageReports.description,
      passabilityLevel: damageReports.passabilityLevel,
      isSingleLane: damageReports.isSingleLane,
      createdAt: damageReports.createdAt,
    })
    .from(damageReports)
    .where(
      and(
        eq(damageReports.status, "verified"),
        eq(damageReports.sourceType, "citizen")
      )
    )
    .orderBy(desc(damageReports.createdAt));

  return c.json(reports);
});

// POST /api/v1/reports/:id/claim - Claim anonymous report after signup
reportsRoutes.post(
  "/:id/claim",
  authMiddleware(),
  zValidator("json", claimReportSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.param();
    const { claimToken } = c.req.valid("json");
    const auth = getAuth(c);

    if (!auth) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    // Find report with matching ID and claim token
    const [report] = await db
      .select()
      .from(damageReports)
      .where(
        and(eq(damageReports.id, id), eq(damageReports.claimToken, claimToken))
      );

    if (!report) {
      return c.json({ error: "Invalid report or claim token" }, 400);
    }

    // Update report with user ID and clear claim token
    await db
      .update(damageReports)
      .set({
        submitterId: auth.userId,
        isVerifiedSubmitter: true,
        claimToken: null,
        updatedAt: new Date(),
      })
      .where(eq(damageReports.id, id));

    return c.json({ success: true });
  }
);

// GET /api/v1/reports/:id - Get single report details
reportsRoutes.get("/:id", optionalAuthMiddleware(), async (c) => {
  const db = createDb(c.env.DB);
  const { id } = c.req.param();
  const auth = getAuth(c);

  const [report] = await db
    .select()
    .from(damageReports)
    .where(eq(damageReports.id, id));

  if (!report) {
    return c.json({ error: "Report not found" }, 404);
  }

  // Only allow viewing if:
  // 1. Report is verified (public)
  // 2. User is the submitter
  // 3. User is admin
  const isOwner = auth && report.submitterId === auth.userId;
  const isAdmin = auth && (auth.role === "admin" || auth.role === "super_admin");
  const isVerified = report.status === "verified";

  if (!isVerified && !isOwner && !isAdmin) {
    return c.json({ error: "Not authorized to view this report" }, 403);
  }

  // Get associated media
  const media = await db
    .select()
    .from(mediaAttachments)
    .where(eq(mediaAttachments.reportId, id));

  return c.json({
    ...report,
    media,
  });
});

export { reportsRoutes };
