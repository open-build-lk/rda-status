// Sri Lanka bounds for validation
export const SRI_LANKA_BOUNDS = {
  north: 9.85,
  south: 5.85,
  east: 82.0,
  west: 79.5,
} as const;

// Report ID prefix
export const REPORT_ID_PREFIX = "RD";

// Project ID prefix
export const PROJECT_ID_PREFIX = "RP";

// Default priority weights
export const DEFAULT_PRIORITY_WEIGHTS = {
  severity: 0.30,
  trafficImpact: 0.20,
  populationAffected: 0.15,
  strategicImportance: 0.15,
  safetyRisk: 0.10,
  reportAge: 0.05,
  alternativeRoutes: 0.05,
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 50 * 1024 * 1024, // 50MB
  maxPhotosPerReport: 10,
  maxVideosPerReport: 2,
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedVideoTypes: ["video/mp4", "video/quicktime"],
} as const;

// JWT settings
export const JWT_SETTINGS = {
  expiresIn: "7d",
  algorithm: "HS256",
} as const;

// Rate limits
export const RATE_LIMITS = {
  anonymousSubmissionsPerHour: 5,
  authenticatedSubmissionsPerHour: 20,
  apiRequestsPerMinute: 60,
} as const;

// Duplicate detection radius (in meters)
export const DUPLICATE_DETECTION_RADIUS = 50;

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

// Status colors for UI
export const STATUS_COLORS = {
  new: "#3b82f6",
  under_review: "#f59e0b",
  verified: "#10b981",
  rejected: "#ef4444",
  linked_to_project: "#8b5cf6",
  resolved: "#6b7280",
} as const;

// Severity colors for UI
export const SEVERITY_COLORS = {
  1: "#22c55e", // Low - Green
  2: "#eab308", // Medium - Yellow
  3: "#f97316", // High - Orange
  4: "#dc2626", // Critical - Red
} as const;

// Severity labels
export const SEVERITY_LABELS = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
} as const;

// Report statuses
export const REPORT_STATUSES = [
  "new",
  "verified",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type ReportStatusType = typeof REPORT_STATUSES[number];

// Role types for status transitions
export type UserRoleType =
  | "citizen"
  | "field_officer"
  | "planner"
  | "admin"
  | "super_admin"
  | "stakeholder";

// Status transition rules per role
// Maps: role -> current_status -> allowed_next_statuses
export const STATUS_TRANSITIONS: Record<string, Record<string, readonly string[]>> = {
  field_officer: {
    new: ["verified", "rejected"],
    verified: ["in_progress"],
    in_progress: ["resolved", "verified"], // Can revert if needed
    resolved: [],
    rejected: [],
  },
  planner: {
    new: ["verified", "rejected"],
    verified: ["in_progress"],
    in_progress: ["resolved", "verified"],
    resolved: ["in_progress"], // Can reopen
    rejected: ["new"], // Can re-review
  },
  admin: {
    new: ["verified", "rejected", "in_progress"],
    verified: ["in_progress", "rejected", "new"],
    in_progress: ["resolved", "verified", "rejected"],
    resolved: ["in_progress", "verified"],
    rejected: ["new", "verified"],
  },
  super_admin: {
    // Super admin can do all transitions
    new: ["verified", "rejected", "in_progress", "resolved"],
    verified: ["new", "rejected", "in_progress", "resolved"],
    in_progress: ["new", "verified", "rejected", "resolved"],
    resolved: ["new", "verified", "in_progress", "rejected"],
    rejected: ["new", "verified", "in_progress", "resolved"],
  },
} as const;

// Get allowed transitions for a role and current status
export function getAllowedTransitions(
  role: string,
  currentStatus: string
): readonly string[] {
  // Citizens and stakeholders cannot change status
  if (role === "citizen" || role === "stakeholder") {
    return [];
  }

  const roleTransitions = STATUS_TRANSITIONS[role];
  if (!roleTransitions) {
    return [];
  }

  return roleTransitions[currentStatus] || [];
}

// Check if a transition is valid
export function isValidTransition(
  role: string,
  currentStatus: string,
  newStatus: string
): boolean {
  const allowed = getAllowedTransitions(role, currentStatus);
  return allowed.includes(newStatus);
}
