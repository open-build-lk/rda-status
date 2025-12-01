# fix: Ensure approved reports show on map, unapproved don't

## Overview

The current workflow has a critical gap: when admins approve citizen reports (changing status to "verified"), they don't appear on the map because:
1. The main map endpoint (`/api/v1/map/segments`) returns ALL segments regardless of status
2. There's no mechanism to create road segments from approved damage reports
3. A verified endpoint exists but is unused

## Problem Statement

**Current Flow (Broken):**
```
Citizen submits report → status="new" → Admin approves → status="verified" → Map shows nothing new
```

The disconnect: Citizen reports create `damage_reports` entries, but the map displays `road_segments`. There's no automatic creation of road segments when reports are approved.

## Root Cause Analysis

### Gap #1: No Road Segment Creation for Citizen Reports
- Citizen reports only create entries in `damage_reports` table
- Map displays data from `road_segments` table (joined with damage_reports)
- No process creates road segments when a report is approved
- The imported data (64 initial segments) had both tables populated manually

### Gap #2: Map Endpoint Has No Status Filter
**File:** `src/worker/routes/map.ts:85-133`
```typescript
// Current: Returns ALL segments, no status check
const results = await db.select({...})
  .from(roadSegments)
  .leftJoin(damageReports, eq(roadSegments.reportId, damageReports.id));
```

### Gap #3: Unused Verified Endpoint
**File:** `src/worker/routes/map.ts:135-172`
- `/api/v1/map/segments/verified` exists with proper filtering
- Frontend never calls it

## Proposed Solution

### Approach: Two Display Modes

1. **Road Segments** (line-based) - For official/imported data with start/end coordinates
2. **Citizen Incidents** (point-based) - For citizen reports with single location

Since citizen reports have single lat/lng (not road segments with start/end), display them as point markers on the map when verified.

## Technical Approach

### Phase 1: Fix Map to Only Show Verified Data

#### 1.1 Update main segments endpoint to filter by status
**File:** `src/worker/routes/map.ts`

```typescript
// GET /api/v1/map/segments - Only return verified segments
mapRoutes.get("/segments", async (c) => {
  const db = createDb(c.env.DB);

  const results = await db
    .select({...})
    .from(roadSegments)
    .innerJoin(damageReports, eq(roadSegments.reportId, damageReports.id))
    .where(eq(damageReports.status, "verified")); // ADD THIS

  return c.json(processedResults);
});
```

#### 1.2 Add verified citizen incidents to map
**File:** `src/worker/routes/map.ts`

The `/api/v1/map/incidents` endpoint already exists and filters by status="verified". Ensure frontend uses it.

### Phase 2: Display Citizen Reports on Map

#### 2.1 Update DisasterMap to fetch and display incidents
**File:** `src/react-app/components/map/DisasterMap.tsx`

```typescript
// Fetch both segments (lines) AND incidents (points)
const { segments } = useRoadSegments();
const { incidents } = useCitizenIncidents(); // NEW HOOK

// Render segments as polylines (existing)
// Render incidents as markers (new)
```

#### 2.2 Create useCitizenIncidents hook
**File:** `src/react-app/hooks/useCitizenIncidents.ts`

```typescript
export function useCitizenIncidents() {
  // Fetch from /api/v1/map/incidents
  // Return verified citizen reports as point markers
}
```

### Phase 3: Update Stats to Reflect Both Data Types

#### 3.1 Update Home.tsx stats computation
**File:** `src/react-app/pages/Home.tsx`

```typescript
// Combine stats from:
// 1. Road segments (verified)
// 2. Citizen incidents (verified)
const stats = useMemo(() => {
  const totalAffected = segments.length + incidents.length;
  // ... compute flooding, landslides from both sources
}, [segments, incidents]);
```

## Acceptance Criteria

- [ ] Only verified road segments appear on map (status="verified")
- [ ] Verified citizen reports appear as point markers on map
- [ ] Unapproved reports (status="new") do NOT appear on map
- [ ] Rejected reports (status="rejected") do NOT appear on map
- [ ] Stats bar reflects only verified data
- [ ] When admin approves a report, it appears on map after refresh
- [ ] RoadTable sidebar shows only verified segments

## Files to Modify

| File | Change |
|------|--------|
| `src/worker/routes/map.ts` | Add status="verified" filter to segments endpoint |
| `src/react-app/hooks/useCitizenIncidents.ts` | Create new hook (NEW FILE) |
| `src/react-app/stores/citizenIncidents.ts` | Create new store (NEW FILE) |
| `src/react-app/components/map/DisasterMap.tsx` | Add citizen incident markers |
| `src/react-app/pages/Home.tsx` | Include incidents in stats |
| `src/react-app/components/road-table/RoadTable.tsx` | May need to include incidents |

## Testing Plan

1. **Start with empty database** (already done)
2. **Submit a citizen report** via /report page
3. **Verify report does NOT appear on map** (status="new")
4. **Admin approves report** via /admin/reports
5. **Verify report NOW appears on map** as point marker
6. **Verify stats update** to show 1 affected location

## Success Metrics

- Zero unapproved reports visible on public map
- 100% of verified reports visible on map
- Stats accurately reflect verified data only

## References

### Internal Files
- `src/worker/routes/map.ts:85-133` - Main segments endpoint (needs filter)
- `src/worker/routes/map.ts:174-199` - Incidents endpoint (already filtered correctly)
- `src/worker/routes/reports.ts:119-197` - Report submission
- `src/worker/routes/admin.ts:197-271` - Admin approval endpoints
- `src/worker/db/schema.ts:37-94` - damage_reports schema
- `src/worker/db/schema.ts:227-251` - road_segments schema

### Database Relationships
```
damage_reports (1) ←── road_segments (many)
                  └── media_attachments (many)
```

### Status Values
```typescript
type Status = "new" | "verified" | "in_progress" | "resolved" | "rejected";
// Only "verified" should appear on public map
```
