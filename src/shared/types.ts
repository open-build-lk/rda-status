// User Roles (simplified for infrastructure recovery)
export const UserRole = {
  PUBLIC: "public",
  CITIZEN: "citizen",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Source Types
export const SourceType = {
  CITIZEN: "citizen",
  FIELD_OFFICER: "field_officer",
  OTHER_AGENCY: "other_agency",
} as const;
export type SourceType = (typeof SourceType)[keyof typeof SourceType];

// Source Channels
export const SourceChannel = {
  WEB: "web",
  MOBILE_WEB: "mobile_web",
  BULK_UPLOAD: "bulk_upload",
} as const;
export type SourceChannel = (typeof SourceChannel)[keyof typeof SourceChannel];

// Infrastructure Categories (for building/facility damage reports)
export const INFRASTRUCTURE_CATEGORIES = [
  'government_building',
  'school',
  'hospital',
  'utility'
] as const;
export type InfrastructureCategory = typeof INFRASTRUCTURE_CATEGORIES[number];

export const INFRASTRUCTURE_CATEGORY_LABELS: Record<InfrastructureCategory, string> = {
  government_building: 'Government Building',
  school: 'School / Educational',
  hospital: 'Hospital / Healthcare',
  utility: 'Utilities & Services'
};

// Damage Levels (citizen-friendly 3-level scale)
export const DAMAGE_LEVELS = ['minor', 'major', 'destroyed'] as const;
export type DamageLevel = typeof DAMAGE_LEVELS[number];

export const DAMAGE_LEVEL_LABELS: Record<DamageLevel, { label: string; description: string; color: string }> = {
  minor: {
    label: 'Minor Damage',
    description: 'Building is usable but needs repair',
    color: 'yellow'
  },
  major: {
    label: 'Major Damage',
    description: 'Building is unusable but can be repaired',
    color: 'orange'
  },
  destroyed: {
    label: 'Destroyed',
    description: 'Building collapsed or beyond repair',
    color: 'red'
  }
};

// Priority Levels (used for both citizen and admin priority)
export const PRIORITY_LEVELS = ['high', 'medium', 'low'] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

export const PRIORITY_LEVEL_LABELS: Record<PriorityLevel, { label: string; color: string }> = {
  high: { label: 'High Priority', color: 'red' },
  medium: { label: 'Medium Priority', color: 'yellow' },
  low: { label: 'Low Priority', color: 'green' }
};

// Damage Types (for infrastructure - what kind of damage occurred)
export const DamageType = {
  ROOF_DAMAGE: "roof_damage",
  WALL_COLLAPSE: "wall_collapse",
  FOUNDATION_CRACK: "foundation_crack",
  FLOODING_DAMAGE: "flooding_damage",
  STRUCTURAL_CRACK: "structural_crack",
  COMPLETE_COLLAPSE: "complete_collapse",
  FIRE_DAMAGE: "fire_damage",
  WATER_DAMAGE: "water_damage",
  OTHER: "other",
} as const;
export type DamageType = (typeof DamageType)[keyof typeof DamageType];

// Submission Source
export const SubmissionSource = {
  CITIZEN_WEB: "citizen_web",
  CITIZEN_MOBILE: "citizen_mobile",
  OFFICIAL: "official",
} as const;
export type SubmissionSource = (typeof SubmissionSource)[keyof typeof SubmissionSource];

// Report Status (simplified workflow)
export const REPORT_STATUSES = [
  'new',         // Just submitted by citizen
  'verified',    // Admin confirmed as valid report
  'in_progress', // Work has started
  'resolved',    // Repair completed
  'rejected'     // Invalid or duplicate report
] as const;
export type ReportStatus = typeof REPORT_STATUSES[number];

export const ReportStatus = {
  NEW: "new",
  VERIFIED: "verified",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;

// Project Status
export const ProjectStatus = {
  PLANNED: "planned",
  DESIGN: "design",
  TENDERING: "tendering",
  IN_PROGRESS: "in_progress",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

// Milestone Status
export const MilestoneStatus = {
  NOT_STARTED: "not_started",
  ON_TRACK: "on_track",
  DELAYED: "delayed",
  COMPLETED: "completed",
} as const;
export type MilestoneStatus =
  (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

// Milestone Types
export const MilestoneType = {
  PROJECT_START: "project_start",
  DESIGN_COMPLETE: "design_complete",
  PERMITS_APPROVED: "permits_approved",
  CONSTRUCTION_START: "construction_start",
  HALFWAY_COMPLETE: "halfway_complete",
  CONSTRUCTION_COMPLETE: "construction_complete",
  INSPECTION_PASSED: "inspection_passed",
  PROJECT_DELIVERED: "project_delivered",
} as const;
export type MilestoneType =
  (typeof MilestoneType)[keyof typeof MilestoneType];

// Location Levels
export const LocationLevel = {
  COUNTRY: "country",
  PROVINCE: "province",
  DISTRICT: "district",
  CITY: "city",
  GN_DIVISION: "gn_division",
} as const;
export type LocationLevel =
  (typeof LocationLevel)[keyof typeof LocationLevel];

// Link Types (for report-project associations)
export const LinkType = {
  PRIMARY: "primary",
  RELATED: "related",
  CONTRIBUTING: "contributing",
} as const;
export type LinkType = (typeof LinkType)[keyof typeof LinkType];

// Media Types
export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];
