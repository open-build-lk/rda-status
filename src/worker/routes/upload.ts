import { Hono } from "hono";
import { createDb } from "../db";
import { mediaAttachments } from "../db/schema";
import { optionalAuthMiddleware, getAuth } from "../middleware/auth";

const uploadRoutes = new Hono<{ Bindings: Env }>();

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Maximum photos per submission
const MAX_PHOTOS = 5;
// Allowed MIME types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/v1/upload/photos - Upload photos for incident report
uploadRoutes.post("/photos", optionalAuthMiddleware(), async (c) => {
  const formData = await c.req.formData();
  const files = formData.getAll("photos") as File[];

  if (!files || files.length === 0) {
    return c.json({ error: "No photos provided" }, 400);
  }

  if (files.length > MAX_PHOTOS) {
    return c.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, 400);
  }

  const db = createDb(c.env.DB);
  const auth = getAuth(c);
  const uploadedKeys: string[] = [];
  const now = new Date();

  for (const file of files) {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` },
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        400
      );
    }

    // Generate unique storage key
    const fileId = crypto.randomUUID();
    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const storageKey = `reports/pending/${fileId}.${extension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(storageKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalFilename: file.name,
        uploadedBy: auth?.userId || "anonymous",
      },
    });

    // Create media attachment record (report_id will be set later when report is created)
    const attachmentId = crypto.randomUUID();
    await db.insert(mediaAttachments).values({
      id: attachmentId,
      reportId: null, // Will be linked when report is submitted
      mediaType: "image",
      storageKey,
      originalFilename: file.name,
      fileSize: file.size,
      isPublic: true,
      uploadedAt: now,
    });

    uploadedKeys.push(storageKey);
  }

  return c.json({
    keys: uploadedKeys,
    count: uploadedKeys.length,
  });
});

// GET /api/v1/upload/photo/:key - Get signed URL for photo
uploadRoutes.get("/photo/*", async (c) => {
  const key = c.req.path.replace("/api/v1/upload/photo/", "");

  if (!key) {
    return c.json({ error: "Storage key required" }, 400);
  }

  const object = await c.env.MEDIA_BUCKET.get(key);

  if (!object) {
    return c.json({ error: "Photo not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

export { uploadRoutes };
