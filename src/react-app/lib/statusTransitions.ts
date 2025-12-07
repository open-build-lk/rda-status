// Status transition rules per role
// Maps: role -> current_status -> allowed_next_statuses

const STATUS_TRANSITIONS: Record<string, Record<string, readonly string[]>> = {
  field_officer: {
    new: ["verified", "rejected"],
    verified: ["in_progress"],
    in_progress: ["resolved", "verified"],
    resolved: [],
    rejected: [],
  },
  planner: {
    new: ["verified", "rejected"],
    verified: ["in_progress"],
    in_progress: ["resolved", "verified"],
    resolved: ["in_progress"],
    rejected: ["new"],
  },
  admin: {
    new: ["verified", "rejected", "in_progress"],
    verified: ["in_progress", "rejected", "new"],
    in_progress: ["resolved", "verified", "rejected"],
    resolved: ["in_progress", "verified"],
    rejected: ["new", "verified"],
  },
  super_admin: {
    new: ["verified", "rejected", "in_progress", "resolved"],
    verified: ["new", "rejected", "in_progress", "resolved"],
    in_progress: ["new", "verified", "rejected", "resolved"],
    resolved: ["new", "verified", "in_progress", "rejected"],
    rejected: ["new", "verified", "in_progress", "resolved"],
  },
};

export function getAllowedTransitions(
  role: string,
  currentStatus: string
): readonly string[] {
  if (role === "citizen" || role === "stakeholder") {
    return [];
  }

  const roleTransitions = STATUS_TRANSITIONS[role];
  if (!roleTransitions) {
    return [];
  }

  return roleTransitions[currentStatus] || [];
}
