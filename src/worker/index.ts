import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { mapRoutes } from "./routes/map";
import { adminRoutes } from "./routes/admin";
import { reportsRoutes } from "./routes/reports";
import { uploadRoutes } from "./routes/upload";
import { invitationsRoutes } from "./routes/invitations";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health check
app.get("/api/", (c) => c.json({ name: "OpenRebuildLK API", version: "1.0.0" }));

// Mount routes
// Better-auth routes mounted at /api/auth (standard better-auth path)
app.route("/api/auth", authRoutes);
app.route("/api/v1/map", mapRoutes);
app.route("/api/v1/admin", adminRoutes);
app.route("/api/v1/reports", reportsRoutes);
app.route("/api/v1/upload", uploadRoutes);
app.route("/api/v1/invitations", invitationsRoutes);

// Catch-all route to serve SPA for non-API routes
// This is required when using run_worker_first: true
app.get("*", (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
