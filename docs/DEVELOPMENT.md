# Development Guide

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for Cloudflare)
- Node.js 18+ (for some tooling)

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd rda-status
bun install
```

### 2. Environment Variables

Copy example files:
```bash
cp .dev.vars.example .dev.vars
cp .env.example .env
```

Configure `.dev.vars` (backend):
```bash
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:5173
PRODUCTION_URL=https://your-domain.com
ENVIRONMENT=development
MAILGUN_API_KEY=      # Optional, for email
GOOGLE_MAPS_API_KEY=  # For road snapping
```

Configure `.env` (frontend):
```bash
VITE_GOOGLE_MAPS_API_KEY=your-maps-api-key
VITE_GOOGLE_MAP_ID=your-map-id
```

### 3. Database Setup

```bash
# Generate migration (if schema changed)
bun run db:generate

# Apply migrations to local D1
bun run db:migrate
```

### 4. Start Development

```bash
bun run dev
```

Opens at http://localhost:5173

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | TypeScript check + Vite build |
| `bun run preview` | Preview production build |
| `bun run deploy` | Deploy to Cloudflare |
| `bun run check` | Type check + build + dry-run deploy |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:migrate` | Apply migrations locally |
| `bun run db:migrate:prod` | Apply migrations to production |
| `bun run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── worker/           # Backend (Hono API)
│   ├── index.ts      # Entry point
│   ├── auth/         # Better-Auth config
│   ├── middleware/   # Auth middleware
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   └── db/           # Schema & migrations
│
├── react-app/        # Frontend (React)
│   ├── pages/        # Route components
│   ├── components/   # Reusable UI
│   ├── stores/       # Zustand state
│   ├── lib/          # Utilities
│   └── data/         # Mock data
│
└── shared/           # Shared types
```

## Development Workflow

### Adding a New Page

1. Create component in `src/react-app/pages/`:
```typescript
// src/react-app/pages/MyPage.tsx
export function MyPage() {
  return <div>My Page</div>;
}
```

2. Export from `src/react-app/pages/index.ts`:
```typescript
export { MyPage } from "./MyPage";
```

3. Add route in `src/react-app/App.tsx`:
```typescript
<Route path="/my-page" element={<MyPage />} />
```

### Adding a Protected Page

```typescript
<Route path="/admin" element={
  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
    <AdminPage />
  </ProtectedRoute>
} />
```

### Adding an API Endpoint

1. Create route file in `src/worker/routes/`:
```typescript
// src/worker/routes/reports.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

const reportsRoutes = new Hono<{ Bindings: Env }>();

reportsRoutes.get("/", async (c) => {
  // List reports
});

reportsRoutes.post("/", authMiddleware(), async (c) => {
  // Create report (requires auth)
});

export { reportsRoutes };
```

2. Mount in `src/worker/index.ts`:
```typescript
import { reportsRoutes } from "./routes/reports";
app.route("/api/v1/reports", reportsRoutes);
```

### Modifying Database Schema

1. Edit `src/worker/db/schema.ts`
2. Generate migration:
```bash
bun run db:generate
```
3. Review generated SQL in `src/worker/db/migrations/`
4. Apply locally:
```bash
bun run db:migrate
```

## Testing

### Manual Testing

1. Start dev server: `bun run dev`
2. Test auth flow:
   - Register: http://localhost:5173/register
   - Login: http://localhost:5173/login
3. Test protected routes (requires login)

### API Testing

```bash
# Health check
curl http://localhost:5173/api/

# Register
curl -X POST http://localhost:5173/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test"}'

# Login
curl -X POST http://localhost:5173/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Debugging

### Vite Debug Mode

Open http://localhost:5173/__debug for Vite debugging tools.

### Cloudflare Workers Logs

```bash
wrangler tail
```

### Database Inspection

```bash
bun run db:studio
```

## Code Style

- TypeScript strict mode
- Path aliases: `@/` maps to `src/react-app/`
- Tailwind CSS for styling
- Radix UI for accessible components
- Zustand for state (no Redux)

## Deployment

### Preview Deploy

```bash
bun run check  # Type check + build + dry-run
```

### Production Deploy

```bash
bun run deploy
```

### Database Migrations (Production)

```bash
bun run db:migrate:prod
```

## Troubleshooting

### "Cannot find module" errors
```bash
bun install
```

### Database migration errors
```bash
# Reset local database
rm -rf .wrangler/state
bun run db:migrate
```

### Auth not working
- Check `BETTER_AUTH_SECRET` is set (32+ chars)
- Check `BETTER_AUTH_URL` matches your dev server
- Clear browser cookies

### Map not loading
- Check `GOOGLE_MAPS_API_KEY` in both `.dev.vars` and `.env`
- Verify API key has Maps JavaScript API enabled
