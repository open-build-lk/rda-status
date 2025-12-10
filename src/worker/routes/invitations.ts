import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { user, userInvitations } from "../db/schema";
import { eq } from "drizzle-orm";
import { recordAuditEntries } from "../services/audit";

const invitationsRoutes = new Hono<{ Bindings: Env }>();

// Schema for accepting invitation
const acceptInviteSchema = z.object({
  token: z.string().uuid(),
  magicToken: z.string().min(32).max(32), // Magic link token - 32 char string (better-auth format)
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

// POST /api/v1/invitations/accept - Accept invitation and create user
// The magicToken was created when the invitation was sent and is used for auto-login
invitationsRoutes.post(
  "/accept",
  zValidator("json", acceptInviteSchema),
  async (c) => {
    const db = createDb(c.env.DB);
    const { token, magicToken: _magicToken, name, designation } = c.req.valid("json");
    // Note: magicToken is validated but not used server-side
    // Frontend sends it here for validation, then uses it for redirect to /api/auth/magic-link/verify

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
        performedBy: userId,
        performerRole: invitation.role,
        metadata: { email: invitation.email, acceptedAt: now.toISOString() },
      }]);

      // Return success - frontend will redirect to magic-link/verify with the magicToken
      return c.json({
        success: true,
        user: {
          id: userId,
          name,
          email: invitation.email,
          role: invitation.role,
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
