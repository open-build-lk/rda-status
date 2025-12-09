import { formatDistanceToNow, format } from "date-fns";
import { User, Clock, ArrowRight, Building2, Mail, Shield, UserPlus, UserMinus } from "lucide-react";
import clsx from "clsx";

interface UserAuditEntry {
  id: string;
  targetType: string;
  targetId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
  performedById: string | null;
  performerRole: string | null;
  performerName: string | null;
}

interface UserAuditTimelineProps {
  entries: UserAuditEntry[];
  userCreatedAt?: Date | string;
}

const FIELD_LABELS: Record<string, string> = {
  role: "Role",
  isActive: "Account Status",
  name: "Name",
  designation: "Designation",
  phone: "Phone",
  status: "Status",
  assignment: "Organization",
  isPrimary: "Primary Organization",
};

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  field_officer: "Field Officer",
  planner: "Planner",
  admin: "Admin",
  super_admin: "Super Admin",
  stakeholder: "Stakeholder",
  member: "Member",
  manager: "Manager",
};

const TARGET_ICONS: Record<string, typeof User> = {
  user: Shield,
  invitation: Mail,
  user_organization: Building2,
};

const ROLE_COLORS: Record<string, string> = {
  citizen: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  field_officer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  planner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  stakeholder: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";

  if (fieldName === "role") {
    return ROLE_LABELS[value] || value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (fieldName === "isActive") {
    return value === "true" || value === "1" ? "Active" : "Disabled";
  }
  if (fieldName === "status") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (fieldName === "isPrimary") {
    return value === "true" || value === "1" ? "Yes" : "No";
  }
  if (fieldName === "assignment") {
    return value === "created" ? "Assigned" : value === "removed" ? "Removed" : value;
  }

  return value;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded text-xs font-medium",
        ROLE_COLORS[role] || "bg-gray-100 text-gray-700"
      )}
    >
      {ROLE_LABELS[role] || role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function ValueDisplay({ fieldName, value }: { fieldName: string; value: string | null }) {
  if (fieldName === "role" && value) {
    return <RoleBadge role={value} />;
  }
  if (fieldName === "isActive" && value) {
    const isActive = value === "true" || value === "1";
    return (
      <span
        className={clsx(
          "px-2 py-0.5 rounded text-xs font-medium",
          isActive
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
        )}
      >
        {isActive ? "Active" : "Disabled"}
      </span>
    );
  }
  return <span className="font-medium">{formatValue(fieldName, value)}</span>;
}

function getEntryDescription(entry: UserAuditEntry): { action: string; detail: string | null; icon: typeof User } {
  const metadata = entry.metadata || {};

  if (entry.targetType === "invitation") {
    if (entry.fieldName === "status") {
      if (entry.newValue === "pending") {
        return {
          action: "Invitation sent",
          detail: metadata.email as string || null,
          icon: Mail,
        };
      }
      if (entry.newValue === "accepted") {
        return {
          action: "Invitation accepted",
          detail: null,
          icon: UserPlus,
        };
      }
      if (entry.newValue === "cancelled") {
        return {
          action: "Invitation cancelled",
          detail: metadata.email as string || null,
          icon: UserMinus,
        };
      }
    }
  }

  if (entry.targetType === "user_organization") {
    const orgName = metadata.orgName as string || "";
    if (entry.fieldName === "assignment") {
      if (entry.newValue === "created") {
        return {
          action: `Added to ${orgName}`,
          detail: `as ${ROLE_LABELS[metadata.role as string] || metadata.role}`,
          icon: Building2,
        };
      }
      if (entry.newValue === "removed") {
        return {
          action: `Removed from organization`,
          detail: metadata.previousRole ? `was ${ROLE_LABELS[metadata.previousRole as string] || metadata.previousRole}` : null,
          icon: UserMinus,
        };
      }
    }
    if (entry.fieldName === "role") {
      return {
        action: `Organization role changed`,
        detail: null,
        icon: Building2,
      };
    }
    if (entry.fieldName === "isPrimary") {
      return {
        action: entry.newValue === "true" || entry.newValue === "1" ? "Set as primary organization" : "Removed as primary",
        detail: null,
        icon: Building2,
      };
    }
  }

  if (entry.targetType === "user") {
    return {
      action: `${FIELD_LABELS[entry.fieldName] || entry.fieldName} changed`,
      detail: null,
      icon: Shield,
    };
  }

  return {
    action: `${entry.fieldName} changed`,
    detail: null,
    icon: TARGET_ICONS[entry.targetType] || User,
  };
}

export function UserAuditTimeline({ entries, userCreatedAt }: UserAuditTimelineProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedEntries.length === 0 && !userCreatedAt && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No activity recorded yet.
        </p>
      )}

      {sortedEntries.map((entry, index) => {
        const date = new Date(entry.createdAt);
        const { action, detail, icon: Icon } = getEntryDescription(entry);
        const showValueChange = entry.targetType === "user" && entry.oldValue !== null;

        return (
          <div key={entry.id} className="relative pl-6">
            {/* Timeline line */}
            {(index < sortedEntries.length - 1 || userCreatedAt) && (
              <div className="absolute left-[9px] top-5 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 top-1 w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <Icon className="w-2.5 h-2.5 text-gray-500" />
            </div>

            <div className="pb-3">
              {/* Header */}
              <div className="flex items-start gap-2 text-sm">
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.performerName || "System"}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                    {action}
                  </span>
                  {detail && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      {detail}
                    </span>
                  )}
                </div>
              </div>

              {/* Value change for user field updates */}
              {showValueChange && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <ValueDisplay fieldName={entry.fieldName} value={entry.oldValue} />
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <ValueDisplay fieldName={entry.fieldName} value={entry.newValue} />
                </div>
              )}

              {/* Reason if provided */}
              {entry.reason && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 italic">
                  "{entry.reason}"
                </p>
              )}

              {/* Timestamp */}
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span title={format(date, "PPpp")}>
                  {formatDistanceToNow(date, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Account creation entry */}
      {userCreatedAt && (
        <div className="relative pl-6">
          <div className="absolute left-0 top-1 w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border-2 border-green-500 flex items-center justify-center">
            <UserPlus className="w-2.5 h-2.5 text-green-500" />
          </div>

          <div className="pb-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Account created
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span title={format(new Date(userCreatedAt), "PPpp")}>
                {formatDistanceToNow(new Date(userCreatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
