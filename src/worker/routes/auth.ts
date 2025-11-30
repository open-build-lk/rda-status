import { Hono } from "hono";
import { createAuth } from "../auth";

const authRoutes = new Hono<{ Bindings: Env }>();

// Mount better-auth handler for all auth routes
// Better-auth handles: /sign-up, /sign-in, /sign-out, /session, etc.
authRoutes.all("/*", async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export { authRoutes };
