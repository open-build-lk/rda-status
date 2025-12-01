// User Roles
export const UserRole = {
  PUBLIC: "public",
  CITIZEN: "citizen",
  FIELD_OFFICER: "field_officer",
  PLANNER: "planner",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  STAKEHOLDER: "stakeholder",
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

// Asset Types
export const AssetType = {
  ROAD: "road",
  BRIDGE: "bridge",
  CULVERT: "culvert",
  RAIL_TRACK: "rail_track",
  RAIL_STATION: "rail_station",
  LEVEL_CROSSING: "level_crossing",
  OTHER: "other",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

// Damage Types
export const DamageType = {
  TREE_FALL: "tree_fall",
  BRIDGE_COLLAPSE: "bridge_collapse",
  LANDSLIDE: "landslide",
  FLOODING: "flooding",
  ROAD_BREAKAGE: "road_breakage",
  WASHOUT: "washout",
  COLLAPSE: "collapse",
  CRACKING: "cracking",
  EROSION: "erosion",
  BLOCKAGE: "blockage",
  TRACK_MISALIGNMENT: "track_misalignment",
  OTHER: "other",
} as const;
export type DamageType = (typeof DamageType)[keyof typeof DamageType];

// Passability Levels (ordered from least passable to most passable)
export const PassabilityLevel = {
  UNPASSABLE: "unpassable",
  FOOT: "foot",
  BIKE: "bike",
  THREE_WHEELER: "3wheeler",
  CAR: "car",
  BUS: "bus",
  TRUCK: "truck",
} as const;
export type PassabilityLevel = (typeof PassabilityLevel)[keyof typeof PassabilityLevel];

// Submission Source
export const SubmissionSource = {
  CITIZEN_WEB: "citizen_web",
  CITIZEN_MOBILE: "citizen_mobile",
  OFFICIAL: "official",
} as const;
export type SubmissionSource = (typeof SubmissionSource)[keyof typeof SubmissionSource];

// Severity Levels
export const Severity = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

// Road Operational Impact
export const RoadOperationalImpact = {
  FULL_CLOSURE: "full_closure",
  ONE_LANE_CLOSED: "one_lane_closed",
  RESTRICTED_ACCESS: "restricted_access",
  NO_IMPACT: "no_impact",
} as const;
export type RoadOperationalImpact =
  (typeof RoadOperationalImpact)[keyof typeof RoadOperationalImpact];

// Rail Operational Impact
export const RailOperationalImpact = {
  TRACK_CLOSED: "track_closed",
  SPEED_RESTRICTION: "speed_restriction",
  DELAYS_ONLY: "delays_only",
  NO_IMPACT: "no_impact",
} as const;
export type RailOperationalImpact =
  (typeof RailOperationalImpact)[keyof typeof RailOperationalImpact];

// Route Categories
export const RouteCategory = {
  NATIONAL_HIGHWAY: "national_highway",
  MAIN_RAIL_CORRIDOR: "main_rail_corridor",
  PROVINCIAL_ROAD: "provincial_road",
  LOCAL_ROAD: "local_road",
} as const;
export type RouteCategory = (typeof RouteCategory)[keyof typeof RouteCategory];

// Report Status
export const ReportStatus = {
  NEW: "new",
  UNDER_REVIEW: "under_review",
  VERIFIED: "verified",
  REJECTED: "rejected",
  LINKED_TO_PROJECT: "linked_to_project",
  RESOLVED: "resolved",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

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
