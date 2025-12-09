import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDb } from "../db";
import { roads } from "../db/schema";
import { like, or, eq } from "drizzle-orm";

const roadsRoutes = new Hono<{ Bindings: Env }>();

// Validation schema for suggest endpoint
const suggestSchema = z.object({
  q: z.string().min(1).max(20),
  limit: z.coerce.number().min(1).max(20).optional().default(10),
});

// GET /api/v1/roads/suggest - Auto-suggest roads based on query
roadsRoutes.get("/suggest", zValidator("query", suggestSchema), async (c) => {
  const { q, limit } = c.req.valid("query");
  const db = createDb(c.env.DB);

  // Normalize query for matching
  const normalizedQuery = q.toUpperCase().trim();

  // Search by road number (prefix match) or road name (contains match)
  const results = await db
    .select({
      id: roads.id,
      roadNumber: roads.roadNumber,
      roadClass: roads.roadClass,
      name: roads.name,
    })
    .from(roads)
    .where(
      or(
        like(roads.roadNumber, `${normalizedQuery}%`),
        like(roads.name, `%${q}%`)
      )
    )
    .orderBy(roads.roadNumber)
    .limit(limit);

  return c.json(results);
});

// GET /api/v1/roads/:roadNumber - Get road by number
roadsRoutes.get("/:roadNumber", async (c) => {
  const roadNumber = c.req.param("roadNumber").toUpperCase().trim();
  const db = createDb(c.env.DB);

  const road = await db.query.roads.findFirst({
    where: (roads, { eq }) => eq(roads.roadNumber, roadNumber),
  });

  if (!road) {
    return c.json({ error: "Road not found" }, 404);
  }

  return c.json(road);
});

// GET /api/v1/roads - List all roads (with pagination)
roadsRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const roadClass = c.req.query("class");
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  let query = db
    .select({
      id: roads.id,
      roadNumber: roads.roadNumber,
      roadClass: roads.roadClass,
      name: roads.name,
    })
    .from(roads);

  if (roadClass) {
    query = query.where(eq(roads.roadClass, roadClass.toUpperCase())) as typeof query;
  }

  const results = await query
    .orderBy(roads.roadNumber)
    .limit(limit)
    .offset(offset);

  return c.json({
    data: results,
    page,
    limit,
    hasMore: results.length === limit,
  });
});

export default roadsRoutes;
