import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { mapRoutes } from "./routes/map";
import { adminRoutes } from "./routes/admin";

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

export default app;
