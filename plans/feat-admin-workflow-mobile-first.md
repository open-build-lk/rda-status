# Admin Workflow for Citizen Reports (Mobile-First)

## Overview

Transform the admin Citizen Reports view into a mobile-friendly workflow system that enables field officers to efficiently triage and manage incoming reports. Focus on clear visual indicators of report location/problem and intuitive status transitions that work seamlessly on touch devices.

**Key Insight:** Most users are field officers on mobile devices in the field - Kanban drag-drop won't work. The solution must be a mobile-optimized list/card view with natural tap-to-change-status interactions.

## Problem Statement

Current AdminReports.tsx has several issues for field workflows:
1. **Table is desktop-focused** - 10+ columns don't fit on mobile screens
2. **Status dropdown is buried** - Requires precise tap, easy to miss on mobile
3. **No visual problem indicators** - Can't quickly see damage type, severity, location
4. **No district grouping** - Field officers see all 25 districts when they only manage 1-3
5. **No quick actions** - Every status change requires opening a dropdown

## Proposed Solution

### Mobile-First Card List View

Replace the table with a card-based list optimized for mobile:

```
┌─────────────────────────────────────────┐
│ 🔴 CR-20251207-ABC123                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 🌊 Flooding • Severity 4                │
│ 📍 Galle Road, Colombo                  │
│ 🕐 2 hours ago                          │
│                                         │
│ [✓ Verify]  [✗ Reject]  [⋯ More]       │
└─────────────────────────────────────────┘
```

**Key Features:**
- **Color-coded status dot** (🔴 New, 🟡 In Progress, 🟢 Verified, ⚫ Resolved)
- **Damage type icon** (🌊 Flooding, 🌳 Tree Fall, ⛰️ Landslide, etc.)
- **Severity indicator** (1-5 with color gradient)
- **Location prominently displayed**
- **Quick action buttons** - One tap to verify/reject
- **Swipe gestures** (optional) - Swipe right = verify, swipe left = reject

### District Filtering

Top of page shows district filter:
```
┌─────────────────────────────────────────┐
│ District: [Colombo ▼]  Status: [All ▼]  │
│ ─────────────────────────────────────── │
│ 📊 12 New • 5 In Progress • 3 Verified │
└─────────────────────────────────────────┘
```

### Status Transition Flow

Natural tap-based status changes:

```
NEW ──────────────────────────────────────►
    │
    ├──► [Verify] → VERIFIED ──► IN_PROGRESS ──► RESOLVED
    │                   │
    └──► [Reject] → REJECTED (requires reason)
```

**Quick Actions on Card:**
- **Verify** - Single tap, immediate transition
- **Reject** - Tap opens bottom sheet for reason selection
- **More** - Opens full detail drawer with all options

## Technical Approach

### Database Changes

No schema changes needed - use existing columns:
- `status` - Already supports all required values
- `districtId` / `provinceId` - For filtering (via locationName parsing)
- `stateTransitions` - For audit logging

### API Enhancements

**New Endpoint: Batch Status Update**
```typescript
// POST /api/v1/admin/reports/batch-status
{
  reportIds: string[],
  status: "verified" | "rejected" | "in_progress" | "resolved",
  reason?: string // Required for rejected
}
```

**Enhanced GET with District Filter**
```typescript
// GET /api/v1/admin/reports?district=colombo&status=new&limit=50
```

### Frontend Components

```
src/react-app/
├── pages/
│   └── AdminReports.tsx (enhanced)
│
├── components/
│   └── admin/
│       ├── ReportCard.tsx          # Mobile-friendly report card
│       ├── StatusActions.tsx       # Quick action buttons
│       ├── RejectReasonSheet.tsx   # Bottom sheet for rejection
│       ├── DistrictFilter.tsx      # District selector
│       └── StatusSummary.tsx       # Count badges by status
```

## Implementation Phases

### Phase 1: Mobile Card View (Priority)

**Goal:** Replace table with mobile-friendly card list

**Tasks:**
- [ ] Create `ReportCard.tsx` component with visual indicators
- [ ] Add damage type icons mapping
- [ ] Implement severity color gradient
- [ ] Show location prominently (extracted from locationName)
- [ ] Add responsive layout (cards on mobile, compact table on desktop)

**Files to modify:**
| File | Changes |
|------|---------|
| `src/react-app/pages/AdminReports.tsx` | Add card view mode, responsive switching |
| `src/react-app/components/admin/ReportCard.tsx` | NEW - Card component |

### Phase 2: Quick Status Actions

**Goal:** One-tap status transitions

**Tasks:**
- [ ] Add Verify/Reject buttons to each card
- [ ] Create bottom sheet for rejection reason
- [ ] Implement optimistic updates (instant UI feedback)
- [ ] Add undo toast for accidental taps
- [ ] Log transitions to stateTransitions table

**Files to modify:**
| File | Changes |
|------|---------|
| `src/react-app/components/admin/StatusActions.tsx` | NEW - Action buttons |
| `src/react-app/components/admin/RejectReasonSheet.tsx` | NEW - Reason selector |
| `src/worker/routes/admin.ts` | Add rejection reason to PATCH endpoint |

### Phase 3: District Filtering

**Goal:** Field officers see only their districts

**Tasks:**
- [ ] Add district filter dropdown at top of page
- [ ] Parse locationName to extract district (already done in map.ts pattern)
- [ ] Show status summary counts (12 New, 5 In Progress, etc.)
- [ ] Persist selected district in localStorage
- [ ] Future: Enforce district scope based on user.districtScope

**Files to modify:**
| File | Changes |
|------|---------|
| `src/react-app/components/admin/DistrictFilter.tsx` | NEW - Filter component |
| `src/react-app/components/admin/StatusSummary.tsx` | NEW - Count badges |
| `src/react-app/pages/AdminReports.tsx` | Integrate filters |

### Phase 4: Status Workflow Enforcement

**Goal:** Prevent invalid status transitions

**Tasks:**
- [ ] Define allowed transitions per role
- [ ] Validate transitions in API
- [ ] Show only valid next-status options in UI
- [ ] Add transition confirmation for critical changes

**Status Transition Rules:**
```typescript
const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
  field_officer: {
    new: ["verified", "rejected"],
    verified: ["in_progress"],
    in_progress: ["resolved", "verified"], // Can revert if needed
  },
  admin: {
    // All transitions allowed
    new: ["verified", "rejected", "in_progress"],
    verified: ["in_progress", "rejected", "new"],
    in_progress: ["resolved", "verified", "rejected"],
    resolved: ["in_progress", "verified"],
    rejected: ["new", "verified"],
  },
  super_admin: {
    // All transitions + removed
    "*": ["new", "verified", "in_progress", "resolved", "rejected", "removed"],
  },
};
```

### Phase 5: Bulk Actions (Future)

**Goal:** Handle disaster scenarios with many reports

**Tasks:**
- [ ] Add multi-select mode (checkbox on cards)
- [ ] Show floating action bar when items selected
- [ ] Bulk verify / bulk reject with shared reason
- [ ] Batch API endpoint

## Acceptance Criteria

### Functional Requirements

- [ ] Reports display as cards on mobile (< 768px)
- [ ] Reports display as compact rows on desktop (≥ 768px)
- [ ] Each card shows: status indicator, damage type, severity, location, age
- [ ] Verify button changes status new → verified with single tap
- [ ] Reject button opens reason selector, then changes status
- [ ] District filter limits visible reports
- [ ] Status counts update in real-time after changes
- [ ] All status changes logged to stateTransitions

### Non-Functional Requirements

- [ ] Page loads in < 2 seconds on 3G connection
- [ ] Status change reflects in UI within 200ms (optimistic)
- [ ] Works on screens as small as 320px width
- [ ] Touch targets minimum 44x44px
- [ ] Undo available for 5 seconds after status change

## UI Mockups

### Mobile Card View

```
┌─────────────────────────────────────────┐
│ Admin Reports                    [≡]    │
├─────────────────────────────────────────┤
│ District: [Colombo ▼]                   │
│ ─────────────────────────────────────── │
│ 🔴 12 New  🟡 5 Progress  🟢 3 Verified │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 CR-20251207-WOJ4Q9              │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ ⛰️ Landslide • ●●●●○ High          │ │
│ │ 📍 Arangala Junction, Gampaha      │ │
│ │ 🕐 2 hours ago • 📷 3 photos       │ │
│ │                                     │ │
│ │ [✓ Verify]  [✗ Reject]  [⋯]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 CR-20251207-ABC123              │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ 🌊 Flooding • ●●●○○ Medium         │ │
│ │ 📍 Galle Road, Colombo             │ │
│ │ 🕐 5 hours ago • 📷 1 photo        │ │
│ │                                     │ │
│ │ [✓ Verify]  [✗ Reject]  [⋯]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Rejection Reason Bottom Sheet

```
┌─────────────────────────────────────────┐
│                                         │
│  (existing report cards, dimmed)        │
│                                         │
├─────────────────────────────────────────┤
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│  Reject Report CR-20251207-WOJ4Q9       │
│                                         │
│  Select reason:                         │
│  ○ Duplicate report                     │
│  ○ Insufficient information             │
│  ○ Location outside jurisdiction        │
│  ○ Not road infrastructure damage       │
│  ○ Spam / Invalid submission            │
│  ○ Other (add note)                     │
│                                         │
│  [Cancel]              [Reject Report]  │
│                                         │
└─────────────────────────────────────────┘
```

### Desktop Compact View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ District: [Colombo ▼]  Status: [All ▼]  │ 🔴 12  🟡 5  🟢 3  ⚫ 45  🔴 2    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Status │ Report #        │ Type      │ Severity │ Location           │ Age  │ Actions      │
├────────┼─────────────────┼───────────┼──────────┼────────────────────┼──────┼──────────────┤
│ 🔴 New │ CR-20251207-WOJ │ ⛰️ Lands. │ ●●●●○    │ Arangala, Gampaha  │ 2h   │ [✓] [✗] [⋯] │
│ 🔴 New │ CR-20251207-ABC │ 🌊 Flood  │ ●●●○○    │ Galle Rd, Colombo  │ 5h   │ [✓] [✗] [⋯] │
│ 🟡 WIP │ CR-20251206-XYZ │ 🌳 Tree   │ ●●○○○    │ Marine Dr, Colombo │ 1d   │ [→] [⋯]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Damage Type Icons

| Type | Icon | Color |
|------|------|-------|
| tree_fall | 🌳 | green |
| bridge_collapse | 🌉 | gray |
| landslide | ⛰️ | brown |
| flooding | 🌊 | blue |
| road_breakage | 🛣️ | orange |
| washout | 💧 | cyan |
| collapse | 🏚️ | red |
| blockage | 🚧 | yellow |
| other | ❓ | gray |

## Status Colors

| Status | Dot | Background |
|--------|-----|------------|
| new | 🔴 | red-100 |
| verified | 🟢 | green-100 |
| in_progress | 🟡 | yellow-100 |
| resolved | ⚫ | gray-100 |
| rejected | 🔴 | red-50 (strikethrough) |
| removed | ⬛ | hidden by default |

## References

### Internal Files
- Current admin reports: `/src/react-app/pages/AdminReports.tsx`
- Admin API routes: `/src/worker/routes/admin.ts`
- Status types: `/src/shared/types.ts:116-126`
- State transitions schema: `/src/worker/db/schema.ts:146-167`
- Location data: `/src/react-app/data/sriLankaLocations.ts`
- Drawer component: `/src/react-app/components/ui/drawer.tsx`

### External References
- Vaul drawer (already in use): https://vaul.emilkowal.ski/
- Tailwind CSS responsive: https://tailwindcss.com/docs/responsive-design
- Touch target guidelines: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

## Open Questions

1. **District Assignment:** How are field officers assigned to districts? (Currently no enforcement)
2. **Rejection Reasons:** Are the 6 reasons above sufficient? Should they be configurable?
3. **Undo Duration:** 5 seconds for undo toast - is this enough?
4. **Desktop View:** Keep existing table or switch to cards on all devices?
5. **Real-time Updates:** Should new reports auto-appear or require manual refresh?

## Design Decisions

1. **Cards over Kanban** - Mobile users can't effectively drag-drop; tap actions are more natural
2. **Optimistic Updates** - Status changes reflect immediately; server confirms async
3. **Undo over Confirm** - Faster workflow; users can undo mistakes within 5 seconds
4. **District Filter over Scope Enforcement** - Start with voluntary filtering; add enforcement later
5. **Bottom Sheet over Modal** - More mobile-native for rejection reason selection

---

*Generated: 2025-12-07*
*Status: Draft - Awaiting Review*
