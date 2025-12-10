import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { user, userInvitations, session } from "../db/schema";
import { eq } from "drizzle-orm";
import { recordAuditEntries } from "../services/audit";

const invitationsRoutes = new Hono<{ Bindings: Env }>();

// Schema for accepting invitation
const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(100),
  designation: z.string().max(100).optional(),
});

// GET /api/v1/invitations/:token - Get invitation details (public)
invitationsRoutes.get("/:token", async (c) => {
  const db = createDb(c.env.DB);
  const { token } = c.req.param();

  const [invitation] = await db
    .select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      designation: userInvitations.designation,
      status: userInvitations.status,
      expiresAt: userInvitations.expiresAt,
    })
    .from(userInvitations)
    .where(eq(userInvitations.token, token));

  if (!invitation) {
    return c.json({ error: "Invitation not found" }, 404);
  }

  // Check if expired
  if (new Date() > new Date(invitation.expiresAt)) {
    // Update status to expired if not already
    if (invitation.status === "pending") {
      await db
        .update(userInvitations)
        .set({ status: "expired" })
        .where(eq(userInvitations.token, token));
    }
    return c.json({ error: "Invitation has expired" }, 410);
  }

  if (invitation.status !== "pending") {
    return c.json({ error: `Invitation has already been ${invitation.status}` }, 400);
  }

  return c.json({
    email: invitation.email,
    role: invitation.role,
    designation: invitation.designation,
    expiresAt: invitation.expiresAt,
  });
});

// POST /api/v1/invitations/accept - Accept invitation and create user + session
invitationsRoutes.post(
  "/accept",
  zValidator("json", acceptInviteSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { token, name, designation } = c.req.valid("json");

    // Get invitation
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.token, token));

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      if (invitation.status === "pending") {
        await db
          .update(userInvitations)
          .set({ status: "expired" })
          .where(eq(userInvitations.token, token));
      }
      return c.json({ error: "Invitation has expired" }, 410);
    }

    if (invitation.status !== "pending") {
      return c.json({ error: `Invitation has already been ${invitation.status}` }, 400);
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, invitation.email));

    if (existingUser) {
      return c.json({ error: "User with this email already exists" }, 400);
    }

    const now = new Date();
    const userId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    try {
      // Create user (use user-provided designation, or fallback to invite-provided)
      const userDesignation = designation || invitation.designation || null;
      await db.insert(user).values({
        id: userId,
        name,
        email: invitation.email,
        role: invitation.role,
        designation: userDesignation,
        emailVerified: true, // They verified by clicking invite link
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      });

      // Create session for immediate login
      await db.insert(session).values({
        id: sessionId,
        userId,
        token: sessionToken,
        expiresAt: sessionExpiry,
        createdAt: now,
        updatedAt: now,
        ipAddress: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });

      // Mark invitation as accepted
      await db
        .update(userInvitations)
        .set({
          status: "accepted",
          acceptedAt: now,
        })
        .where(eq(userInvitations.token, token));

      // Record audit entry for invitation accepted
      await recordAuditEntries(db, [{
        targetType: "invitation",
        targetId: invitation.id,
        fieldName: "status",
        oldValue: "pending",
        newValue: "accepted",
        performedBy: userId, // The newly created user
        performerRole: invitation.role,
        metadata: { email: invitation.email, acceptedAt: now.toISOString() },
      }]);

      // Set session cookie in response headers (better-auth compatible format)
      const isProduction = c.req.url.startsWith("https://");
      const cookieFlags = isProduction
        ? "Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly"
        : "Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly";
      c.header("Set-Cookie", `better-auth.session_token=${sessionToken}; ${cookieFlags}`);

      // Return success with user info (session token still included for reference)
      return c.json({
        success: true,
        user: {
          id: userId,
          name,
          email: invitation.email,
          role: invitation.role,
        },
        session: {
          token: sessionToken,
          expiresAt: sessionExpiry,
        },
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return c.json({
        error: "Failed to create account. Please try again or contact support.",
        details: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  }
);

export { invitationsRoutes };
