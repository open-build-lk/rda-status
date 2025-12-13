# feat: Manual Location Picker for GPS-less Photos

## Overview

Allow authenticated non-citizen users to manually pick a location on a map when uploading images that don't have GPS tags. The feature includes a searchable map interface for precise pin placement and displays a clear warning badge on reports indicating the location was manually selected.

## Problem Statement

Field officers and other authorized users sometimes capture photos without GPS data (camera settings, older devices, indoor photos). Currently, these "orphaned photos" cannot be included in damage reports since the system requires GPS coordinates. This creates gaps in damage documentation, especially for incidents where photo evidence exists but location data is missing.

## Proposed Solution

Add a location picker component that:
1. Detects orphaned photos (no GPS data) during bulk upload
2. Shows an interactive map for non-citizen users to manually select location
3. Provides search functionality to find locations quickly
4. Allows precise pin placement with zoom/pan controls
5. Marks reports with a visible "Location Picked Manually" warning badge

## Technical Approach

### Architecture

**Frontend Changes:**
- New `LocationPickerModal.tsx` component using existing react-leaflet setup
- Modify `GroupReviewCard.tsx` to handle orphaned photos
- Add warning badge to `ReportCard.tsx` and `ReportDetailSheet.tsx`
- Update `bulkUpload.ts` store for manual location state

**Backend Changes:**
- Add `locationPickedManually` boolean column to `damage_reports` table
- Update report creation API to accept new field
- Return field in report queries

**Key Dependencies (already installed):**
- `leaflet`: ^1.9.4
- `react-leaflet`: ^5.0.0
- Nominatim API for geocoding (already used)

### Implementation Phases

#### Phase 1: Database Schema

**Migration file:** `src/worker/db/migrations/XXXX_add_location_picked_manually.sql`

```sql
ALTER TABLE damage_reports ADD COLUMN location_picked_manually INTEGER DEFAULT 0;
```

**Update schema.ts:**
```typescript
// src/worker/db/schema.ts:~line 85
locationPickedManually: integer("location_picked_manually", { mode: "boolean" }).default(false),
```

---

#### Phase 2: Location Picker Component

**New file:** `src/react-app/components/bulk-upload/LocationPickerModal.tsx`

```typescript
interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number; address?: string }) => void;
  initialCenter?: [number, number];
}
```

**Features:**
- Search box with Nominatim forward geocoding (debounced 300ms)
- Interactive map centered on Sri Lanka bounds
- Click-to-place or draggable marker
- Reverse geocoding to show selected address
- "Confirm Location" button (disabled until pin placed)
- Zoom level validation (require zoom 15+ for precision)

**UX Pattern:** Fixed center pin with moving map (better mobile UX than draggable marker)

---

#### Phase 3: Bulk Upload Integration

**Modify:** `src/react-app/components/bulk-upload/GroupReviewCard.tsx`

When orphaned photos detected and user is non-citizen:
1. Show "Pick Location" button instead of location display
2. Open `LocationPickerModal` on click
3. After confirmation, update incident with manual coordinates
4. Set `locationPickedManually: true` flag

**Modify:** `src/react-app/stores/bulkUpload.ts`

```typescript
// Add to BulkIncident interface
locationPickedManually?: boolean;
```

---

#### Phase 4: Warning Badge Display

**Modify:** `src/react-app/components/admin/ReportDetailSheet.tsx` (~line 907)

```tsx
{report.locationPickedManually && (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium">
    <MapPin className="w-3 h-3" />
    Location Picked Manually
  </span>
)}
```

**Modify:** `src/react-app/components/admin/ReportCard.tsx`

Add similar badge near location info.

---

#### Phase 5: Backend Support

**Modify:** `src/worker/routes/reports.ts`

Update `createReportSchema`:
```typescript
locationPickedManually: z.boolean().optional().default(false),
```

Update insert to include field. Return field in queries.

---

## Acceptance Criteria

### Functional Requirements

- [ ] Non-citizen users see "Pick Location" option for orphaned photos
- [ ] Location picker modal opens with Sri Lanka-centered map
- [ ] Search box finds locations via Nominatim geocoding
- [ ] User can click map to place pin
- [ ] Marker is draggable for fine adjustment
- [ ] Selected address shown via reverse geocoding
- [ ] Confirmation requires zoom level 15+
- [ ] Reports created with `locationPickedManually: true`
- [ ] Warning badge visible on report cards
- [ ] Warning badge visible on report detail sheets
- [ ] Warning badge uses amber/warning color scheme

### Non-Functional Requirements

- [ ] Map loads within 2 seconds on 3G connection
- [ ] Search debounced to respect Nominatim rate limits
- [ ] Touch-friendly for mobile (44px minimum tap targets)
- [ ] Keyboard accessible for search input
- [ ] Works offline: show coordinate input fallback

### Quality Gates

- [ ] TypeScript types updated in shared/types.ts
- [ ] Database migration tested on D1
- [ ] Component renders correctly on mobile viewport
- [ ] Badge colors pass contrast accessibility check

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Map tiles fail to load | Show fallback with manual lat/lng input fields |
| Nominatim search returns no results | Show "No locations found" message |
| User picks location outside Sri Lanka | Show error, prevent confirmation |
| User cancels location picker | Return to review step, orphaned photos remain |
| User refreshes page during picking | Location picker state resets (acceptable) |
| Mixed GPS and orphaned photos | GPS photos grouped normally, orphaned get manual location |

## Role-Based Access

| Role | Can Pick Location | Report Status After Submit |
|------|-------------------|---------------------------|
| citizen | No (v1) | N/A |
| field_officer | Yes | verified |
| planner | Yes | verified |
| admin | Yes | verified |
| super_admin | Yes | verified |
| stakeholder | Yes | verified |

**Note:** Citizens excluded in v1 to prevent location fabrication. Consider adding with additional verification in v2.

## Files to Create/Modify

### New Files
- `src/react-app/components/bulk-upload/LocationPickerModal.tsx`
- `src/worker/db/migrations/XXXX_add_location_picked_manually.sql`

### Modified Files
- `src/worker/db/schema.ts` - Add locationPickedManually column
- `src/worker/routes/reports.ts` - Accept and store new field
- `src/worker/routes/admin.ts` - Return new field in queries
- `src/react-app/stores/bulkUpload.ts` - Add manual location state
- `src/react-app/components/bulk-upload/GroupReviewCard.tsx` - Add picker trigger
- `src/react-app/components/admin/ReportDetailSheet.tsx` - Add warning badge
- `src/react-app/components/admin/ReportCard.tsx` - Add warning badge
- `src/shared/types.ts` - Update Report type

## Dependencies & Risks

### Dependencies
- Nominatim API availability (free tier, 1 req/sec limit)
- Existing CartoDB tile server uptime

### Risks
| Risk | Mitigation |
|------|------------|
| Nominatim rate limiting | Debounce search, cache results |
| Mobile touch conflicts (drag pin vs pan map) | Use fixed-center-pin pattern |
| Field officers pick incorrect locations | Show clear "manual" badge for admin review |
| Offline field conditions | Provide coordinate input fallback |

## Success Metrics

- Reduction in orphaned (discarded) photos during bulk upload
- Increase in reports submitted with previously GPS-less photos
- No increase in location accuracy disputes from admins

## Future Considerations

- Allow citizens with additional verification workflow
- GPS override for known-inaccurate coordinates
- Batch location assignment for multiple orphaned photos
- Offline map tile caching for field use
- Admin tool to retroactively add locations to orphaned reports

## References

### Internal
- `src/react-app/lib/exif-utils.ts:10-30` - PhotoWithMetadata interface
- `src/react-app/lib/location-grouping.ts:15-40` - Orphaned photos handling
- `src/react-app/components/map/DisasterMap.tsx` - Existing map patterns
- `src/react-app/components/bulk-upload/GroupReviewCard.tsx:150-220` - Nominatim usage

### External
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Map UI Design Best Practices](https://www.eleken.co/blog-posts/map-ui-design)
- [WCAG Touch Target Guidelines](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
