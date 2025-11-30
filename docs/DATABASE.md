# Database Schema

RDA Status uses Cloudflare D1 (SQLite) with Drizzle ORM.

## Tables Overview

```
┌─────────────────┐     ┌─────────────────┐
│      user       │────<│     session     │
└────────┬────────┘     └─────────────────┘
         │              ┌─────────────────┐
         ├─────────────<│     account     │
         │              └─────────────────┘
         │              ┌─────────────────┐
         ├─────────────<│  verification   │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ damage_reports  │────<│  road_segments  │
└────────┬────────┘     └─────────────────┘
         │              ┌─────────────────┐
         ├─────────────<│media_attachments│
         │              └─────────────────┘
         │              ┌─────────────────┐
         ├─────────────<│state_transitions│
         │              └─────────────────┘
         │              ┌─────────────────┐
         ├─────────────<│    comments     │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│report_project   │────>│rebuild_projects │
│    _links       │     └────────┬────────┘
└─────────────────┘              │
                                 ├───────<│  milestones   │
                                 ├───────<│media_attach.  │
                                 └───────<│   comments    │

┌─────────────────┐
│   locations     │◄───┐ (self-reference)
└─────────────────┘────┘

┌─────────────────┐
│ priority_config │
└─────────────────┘
```

## Table Definitions

### user (Better-Auth)

```typescript
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  // Custom fields
  phone: text("phone"),
  role: text("role").notNull().default("citizen"),
  provinceScope: text("province_scope"),
  districtScope: text("district_scope"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastLogin: integer("last_login", { mode: "timestamp" }),
});
```

### locations

Hierarchical geographic data with self-reference.

```typescript
export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),  // Self-reference
  level: text("level").notNull(), // country, province, district, city, gn_division
  nameEn: text("name_en").notNull(),
  nameSi: text("name_si"),
  nameTa: text("name_ta"),
  boundaryGeojson: text("boundary_geojson"),
  centroidLat: real("centroid_lat"),
  centroidLng: real("centroid_lng"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});
```

### damage_reports

Core table for infrastructure damage.

```typescript
export const damageReports = sqliteTable("damage_reports", {
  id: text("id").primaryKey(),
  reportNumber: text("report_number").notNull().unique(),
  submitterId: text("submitter_id").references(() => user.id),
  anonymousName: text("anonymous_name"),
  anonymousContact: text("anonymous_contact"),
  sourceType: text("source_type").notNull(),  // citizen, field_officer, other_agency
  sourceChannel: text("source_channel").notNull(), // web, mobile_web, bulk_upload

  // Location
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  provinceId: text("province_id").references(() => locations.id),
  districtId: text("district_id").references(() => locations.id),
  cityId: text("city_id").references(() => locations.id),
  landmark: text("landmark"),

  // Asset
  assetType: text("asset_type").notNull(), // road, bridge, culvert, rail_track
  assetId: text("asset_id"),

  // Damage
  damageObservedAt: integer("damage_observed_at", { mode: "timestamp" }),
  damageType: text("damage_type").notNull(),
  severity: integer("severity").notNull(), // 1-4
  description: text("description").notNull(),

  // Impact
  operationalImpact: text("operational_impact"),
  routeCategory: text("route_category"),
  estimatedPopulation: integer("estimated_population"),
  estimatedEconomicLoss: real("estimated_economic_loss"),

  // Status
  status: text("status").notNull().default("new"),
  priorityScore: real("priority_score"),
  priorityVersion: text("priority_version"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### rebuild_projects

Reconstruction project tracking.

```typescript
export const rebuildProjects = sqliteTable("rebuild_projects", {
  id: text("id").primaryKey(),
  projectCode: text("project_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ownerDepartment: text("owner_department"),
  projectManagerId: text("project_manager_id").references(() => user.id),

  // Location
  provinceId: text("province_id").references(() => locations.id),
  districtId: text("district_id").references(() => locations.id),
  cityId: text("city_id").references(() => locations.id),
  geoExtent: text("geo_extent"), // GeoJSON

  // Status
  status: text("status").notNull().default("planned"),

  // Timeline
  plannedStart: text("planned_start"),
  plannedEnd: text("planned_end"),
  actualStart: text("actual_start"),
  actualEnd: text("actual_end"),
  progressPercent: real("progress_percent").default(0),

  // Budget
  fundingSource: text("funding_source"),
  estimatedBudget: real("estimated_budget"),
  actualExpenditure: real("actual_expenditure"),
  contractorInfo: text("contractor_info"), // JSON

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

## Indexes

```sql
-- Damage reports
CREATE INDEX reports_status_idx ON damage_reports(status);
CREATE INDEX reports_severity_idx ON damage_reports(severity);
CREATE INDEX reports_province_idx ON damage_reports(province_id);
CREATE INDEX reports_district_idx ON damage_reports(district_id);
CREATE INDEX reports_asset_type_idx ON damage_reports(asset_type);
CREATE INDEX reports_priority_idx ON damage_reports(priority_score);
CREATE INDEX reports_location_idx ON damage_reports(latitude, longitude);

-- Locations
CREATE INDEX locations_level_idx ON locations(level);
CREATE INDEX locations_parent_idx ON locations(parent_id);

-- Projects
CREATE INDEX projects_status_idx ON rebuild_projects(status);
CREATE INDEX projects_province_idx ON rebuild_projects(province_id);
```

## Enums & Values

### Report Status
```
new → under_review → verified → linked_to_project → resolved
                  └→ rejected
```

### Project Status
```
planned → design → tendering → in_progress → completed
                            └→ on_hold    → cancelled
```

### Severity Levels
| Level | Name | Description |
|-------|------|-------------|
| 1 | Low | Minor damage, passable |
| 2 | Medium | Partial blockage |
| 3 | High | Major damage, alternate route needed |
| 4 | Critical | Complete blockage, emergency |

### Asset Types
- `road`, `bridge`, `culvert`, `rail_track`, `rail_station`, `level_crossing`, `other`

### Damage Types
- `flooding`, `landslide`, `washout`, `collapse`, `cracking`, `erosion`, `blockage`, `track_misalignment`, `other`

## Migrations

```bash
# Generate new migration
bun run db:generate

# Apply migrations locally
bun run db:migrate

# Apply to production
bun run db:migrate:prod

# Open Drizzle Studio
bun run db:studio
```

## Drizzle Configuration

`drizzle.config.ts`:
```typescript
export default defineConfig({
  out: "./src/worker/db/migrations",
  schema: "./src/worker/db/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
});
```
