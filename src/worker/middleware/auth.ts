import { Context, Next } from "hono";
import { createAuth } from "../auth";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  name: string;
  provinceScope?: string | null;
  districtScope?: string | null;
}

// Extend Hono's Variables to include auth
declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

// Auth middleware - requires authentication via better-auth session
export function authMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const auth = createAuth(c.env);

    // Get session from better-auth
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Check if user is active
    if (!session.user.isActive) {
      return c.json({ error: "Account is disabled" }, 403);
    }

    // Set auth context with user info from session
    c.set("auth", {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role || "citizen",
      name: session.user.name,
      provinceScope: session.user.provinceScope,
      districtScope: session.user.districtScope,
    } as AuthContext);

    await next();
  };
}

// Optional auth middleware - adds auth context if session present
export function optionalAuthMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const auth = createAuth(c.env);

    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session?.user && session.user.isActive) {
      c.set("auth", {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role || "citizen",
        name: session.user.name,
        provinceScope: session.user.provinceScope,
        districtScope: session.user.districtScope,
      } as AuthContext);
    }

    await next();
  };
}

// Role-based access middleware
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as AuthContext | undefined;

    if (!auth) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!allowedRoles.includes(auth.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
}

// Helper to get auth context
export function getAuth(c: Context): AuthContext | undefined {
  return c.get("auth") as AuthContext | undefined;
}
