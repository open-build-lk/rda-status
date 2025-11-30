# RDA Status - Application Architecture

Sri Lanka Road Network Damage Tracking System

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 6** build tooling
- **React Router DOM 7** for routing
- **Zustand** for state management
- **Tailwind CSS 4** for styling
- **Leaflet + React-Leaflet** for maps
- **Radix UI** for accessible components

### Backend
- **Hono** web framework
- **Cloudflare Workers** serverless runtime
- **Cloudflare D1** SQLite database
- **Drizzle ORM** for type-safe queries
- **Better-Auth** for authentication
- **Zod** for validation

### Infrastructure
- Cloudflare Workers (compute)
- Cloudflare D1 (database)
- Cloudflare R2 (media storage)

## Directory Structure

```
src/
├── worker/                    # Backend API
│   ├── index.ts               # Hono app entry
│   ├── auth/                  # Better-Auth configuration
│   ├── middleware/            # Auth middleware
│   ├── routes/                # API routes
│   ├── services/              # Business logic
│   └── db/                    # Database schema & migrations
│
├── react-app/                 # Frontend
│   ├── pages/                 # Route components
│   ├── components/            # Reusable UI
│   ├── stores/                # Zustand state
│   ├── lib/                   # Utilities
│   └── data/                  # Mock data
│
└── shared/                    # Shared types
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `user` | User accounts (Better-Auth) |
| `session` | Active sessions |
| `account` | Auth credentials |
| `verification` | Email/password tokens |
| `locations` | Hierarchical geography (province > district > city) |
| `damage_reports` | Infrastructure damage submissions |
| `road_segments` | GPS paths snapped to roads |
| `media_attachments` | Photos/videos (R2 storage) |
| `rebuild_projects` | Reconstruction projects |
| `milestones` | Project phases |
| `report_project_links` | Report-to-project associations |
| `state_transitions` | Audit trail |
| `comments` | Notes on reports/projects |
| `priority_config` | Scoring algorithm versions |

### Key Relationships

```
damage_reports ──┬── media_attachments
                 ├── road_segments
                 ├── state_transitions
                 ├── comments
                 └── report_project_links ─── rebuild_projects
                                                    │
                                                    ├── milestones
                                                    ├── media_attachments
                                                    └── comments
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `*` | `/api/auth/*` | Better-Auth endpoints |
| `POST` | `/api/v1/map/snap-road` | Snap GPS to road network |
| `POST` | `/api/v1/map/segments` | Create road segment |
| `GET` | `/api/v1/map/segments` | List all segments |
| `GET` | `/api/v1/map/segments/verified` | Verified segments only |

## Authentication

### Flow
1. User registers via `/api/auth/sign-up`
2. Better-Auth creates user + session
3. Session cookie set (httpOnly, 7-day expiry)
4. Middleware validates session on protected routes

### User Roles
- `citizen` - Default, can submit reports
- `field_officer` - Verify reports in field
- `planner` - Manage projects
- `admin` - System administration
- `super_admin` - Full access
- `stakeholder` - View-only access

### Middleware
```typescript
authMiddleware()        // Requires authentication
optionalAuthMiddleware() // Auth optional
requireRole('admin')    // Role-based access
```

## Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/` | Home (Map + Table) | Public |
| `/reports` | Damage Reports List | Public |
| `/submit` | Submit Report Form | Public |
| `/login` | Login | Public |
| `/register` | Registration | Public |
| `/dashboard` | Analytics | Authenticated |
| `/projects` | Rebuild Projects | Planner+ |

## State Management

### Auth Store
```typescript
useAuthStore()
├── user: User | null
├── isLoading: boolean
├── isInitialized: boolean
├── login(email, password)
├── register(data)
├── logout()
└── refreshSession()
```

### Map Store
```typescript
useMapViewStore()
├── selectedProvince
├── selectedSegmentId
├── expandedProvinces
├── selectProvince(id)
├── selectSegment(id)
└── clearSelection()
```

## Environment Variables

### Backend (.dev.vars)
```
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:5173
PRODUCTION_URL=https://your-domain.com
ENVIRONMENT=development
MAILGUN_API_KEY=<for email>
GOOGLE_MAPS_API_KEY=<for road snapping>
```

### Frontend (.env)
```
VITE_GOOGLE_MAPS_API_KEY=<maps api key>
VITE_GOOGLE_MAP_ID=<map id>
```

## Build & Deploy

```bash
# Development
bun run dev

# Type check & build
bun run build

# Deploy to Cloudflare
bun run deploy

# Database migrations
bun run db:generate   # Generate migration
bun run db:migrate    # Apply locally
```

## Key Features

1. **Interactive Map** - Leaflet-based visualization of damaged roads
2. **Damage Reporting** - Public form for citizens to report issues
3. **Road Snapping** - GPS coordinates snapped to actual roads via Google API
4. **Project Tracking** - Monitor reconstruction efforts
5. **Role-Based Access** - Different views for citizens, officers, planners
6. **Session Auth** - Secure cookie-based authentication via Better-Auth
