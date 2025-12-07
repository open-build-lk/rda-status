import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { damageReports, mediaAttachments } from "../db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { authMiddleware, optionalAuthMiddleware, getAuth } from "../middleware/auth";

const reportsRoutes = new Hono<{ Bindings: Env }>();

// Helper to reverse geocode coordinates to location name using Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: {
          "User-Agent": "SriLankaRoadStatus/1.0 (road-lk.org)",
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json() as {
      address?: {
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        state_district?: string;
        country?: string;
      };
      display_name?: string;
    };

    if (!data.address) return null;

    const addr = data.address;
    // Build a concise location string
    const parts: string[] = [];

    // Road name if available
    if (addr.road) parts.push(addr.road);

    // Area (suburb/neighbourhood/village)
    const area = addr.neighbourhood || addr.suburb || addr.village || addr.town;
    if (area && !parts.includes(area)) parts.push(area);

    // City/District
    const city = addr.city || addr.county || addr.state_district;
    if (city && !parts.includes(city)) parts.push(city);

    // Province/State
    if (addr.state && !parts.includes(addr.state)) parts.push(addr.state);

    return parts.length > 0 ? parts.join(", ") : null;
  } catch (error) {
    console.error("Reverse geocode error:", error);
    return null;
  }
}

// Helper to send verification email via Mailgun
async function sendVerificationEmail(
  env: Env,
  to: string,
  reportNumber: string,
  verifyUrl: string
) {
  const domain = "mail.road-lk.org";
  const from = `Sri Lanka Road Status <noreply@${domain}>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Verify Your Report</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 8px;">
          Thank you for submitting report <strong>${reportNumber}</strong>.
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Please click the button below to verify your email and confirm your report.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
          Verify Report
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 24px;">
          This link will expire in 24 hours. If you didn't submit this report, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const formData = new FormData();
  formData.append("from", from);
  formData.append("to", to);
  formData.append("subject", `Verify your incident report ${reportNumber}`);
  formData.append("html", html);

  const response = await fetch(
    `https://api.mailgun.net/v3/${domain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Mailgun error:", error);
    throw new Error(`Failed to send verification email: ${response.status}`);
  }

  return response.json();
}

// Validation schemas
const createReportSchema = z.object({
  // Required
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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

  // Location info (optional - user-provided or auto-detected)
  province: z.string().max(50).optional(),
  district: z.string().max(50).optional(),
  locationName: z.string().max(200).optional(), // Road/location name

  // Optional
  anonymousName: z.string().max(100).optional(),
  anonymousEmail: z.string().email().optional(),
  anonymousContact: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  passabilityLevel: z
    .enum(["unpassable", "foot", "bike", "3wheeler", "car", "bus", "truck"])
    .optional(),
  // Legacy fields (kept for backward compatibility)
  isSingleLane: z.boolean().optional(),
  needsSafetyBarriers: z.boolean().optional(),
  blockedDistanceMeters: z.number().min(0).max(10000).optional(),
  // Flexible incident details (new way - any additional fields go here)
  incidentDetails: z.record(z.unknown()).optional(),
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

    // Use user-provided location name or fall back to reverse geocoding
    const locationName = data.locationName || await reverseGeocode(data.latitude, data.longitude);

    // Create the damage report
    await db.insert(damageReports).values({
      id: reportId,
      reportNumber,
      submitterId: auth?.userId || null,
      anonymousName: data.anonymousName || null,
      anonymousEmail: data.anonymousEmail || null,
      anonymousContact: data.anonymousContact || null,
      sourceType: "citizen",
      sourceChannel: "mobile_web",
      latitude: data.latitude,
      longitude: data.longitude,
      // Store province/district info in locationName if provided
      locationName: locationName
        ? (data.province && data.district
            ? `${locationName} (${data.district}, ${data.province})`
            : data.province
            ? `${locationName} (${data.province})`
            : locationName)
        : null,
      assetType: "road",
      damageType: data.damageType,
      severity: 2, // Default medium severity for citizen reports
      description: data.description || `Citizen report: ${data.damageType}`,
      status: "new",
      passabilityLevel: data.passabilityLevel || "unpassable",
      isSingleLane: data.isSingleLane || false,
      needsSafetyBarriers: data.needsSafetyBarriers || false,
      blockedDistanceMeters: data.blockedDistanceMeters || null,
      // Store all incident details as JSON (includes legacy + new fields)
      incidentDetails: JSON.stringify({
        isSingleLane: data.isSingleLane || false,
        needsSafetyBarriers: data.needsSafetyBarriers || false,
        blockedDistanceMeters: data.blockedDistanceMeters || null,
        ...data.incidentDetails,
      }),
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
              isNull(mediaAttachments.reportId)
            )
          );
      }
    }

    // Send verification email for anonymous users with email
    if (!auth && data.anonymousEmail && claimToken) {
      try {
        const baseUrl = c.env.PRODUCTION_URL || c.req.header("origin") || "http://localhost:5173";
        const verifyUrl = `${baseUrl}/api/v1/reports/verify?token=${claimToken}`;
        await sendVerificationEmail(c.env, data.anonymousEmail, reportNumber, verifyUrl);
      } catch (error) {
        console.error("Failed to send verification email:", error);
        // Don't fail the request if email fails
      }
    }

    return c.json({
      id: reportId,
      reportNumber,
      claimToken,
      promptSignup: !auth,
      verificationEmailSent: !auth && !!data.anonymousEmail,
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
      needsSafetyBarriers: damageReports.needsSafetyBarriers,
      incidentDetails: damageReports.incidentDetails,
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

// GET /api/v1/reports/verify - Verify anonymous report via email link
reportsRoutes.get("/verify", async (c) => {
  const db = createDb(c.env.DB);
  const token = c.req.query("token");

  if (!token) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Invalid Verification Link</h1>
          <p>This link is missing or invalid.</p>
        </body>
      </html>
    `, 400);
  }

  // Find report with this claim token
  const [report] = await db
    .select()
    .from(damageReports)
    .where(eq(damageReports.claimToken, token));

  if (!report) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Link Expired</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>Link Expired or Already Used</h1>
          <p>This verification link has expired or has already been used.</p>
        </body>
      </html>
    `, 400);
  }

  // Mark report as verified
  await db
    .update(damageReports)
    .set({
      isVerifiedSubmitter: true,
      claimToken: null, // Clear the token so it can't be used again
      updatedAt: new Date(),
    })
    .where(eq(damageReports.id, report.id));

  // Redirect to success page
  const baseUrl = c.env.PRODUCTION_URL || c.req.header("origin") || "http://localhost:5173";
  return c.redirect(`${baseUrl}/report-verified?report=${report.reportNumber}`);
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
