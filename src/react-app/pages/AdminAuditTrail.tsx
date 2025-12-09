import { useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  History,
  FileText,
  User,
  Mail,
  Building2,
  ArrowRight,
  Clock,
  Shield,
  Filter,
  X,
} from "lucide-react";

interface AuditEntry {
  id: string;
  targetType: string;
  targetId: string;
  reportId: string | null;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  performedById: string | null;
  performerRole: string | null;
  performerName: string | null;
  performerEmail: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const TARGET_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  report: { label: "Report", icon: FileText, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  user: { label: "User", icon: User, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  invitation: { label: "Invitation", icon: Mail, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  user_organization: { label: "Organization", icon: Building2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  damageType: "Damage Type",
  severity: "Severity",
  passabilityLevel: "Passability",
  description: "Description",
  role: "Role",
  isActive: "Account Status",
  name: "Name",
  designation: "Designation",
  phone: "Phone",
  assignment: "Assignment",
  isPrimary: "Primary Org",
  "workflow.progressPercent": "Progress",
  "workflow.estimatedCostLkr": "Est. Cost",
  "workflow.notes": "Notes",
};

const ROLE_LABELS: Record<string, string> = {
  citizen: "Citizen",
  field_officer: "Field Officer",
  planner: "Planner",
  admin: "Admin",
  super_admin: "Super Admin",
  stakeholder: "Stakeholder",
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";

  if (fieldName === "status" || fieldName === "fromStatus" || fieldName === "toStatus") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (fieldName === "role") {
    return ROLE_LABELS[value] || value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (fieldName === "isActive") {
    return value === "true" || value === "1" ? "Active" : "Disabled";
  }
  if (fieldName === "isPrimary") {
    return value === "true" || value === "1" ? "Yes" : "No";
  }
  if (fieldName === "assignment") {
    return value === "created" ? "Assigned" : value === "removed" ? "Removed" : value;
  }
  if (fieldName === "workflow.progressPercent") {
    return `${value}%`;
  }
  if (fieldName === "workflow.estimatedCostLkr") {
    const num = parseFloat(value);
    if (!isNaN(num)) return `LKR ${num.toLocaleString()}`;
  }
  if (value.length > 60) {
    return value.substring(0, 60) + "...";
  }

  return value;
}

function getEntryDescription(entry: AuditEntry): string {
  const metadata = entry.metadata || {};
  const fieldLabel = FIELD_LABELS[entry.fieldName] || entry.fieldName;

  if (entry.targetType === "invitation") {
    if (entry.newValue === "pending") return `Invitation sent to ${metadata.email || "user"}`;
    if (entry.newValue === "accepted") return `Invitation accepted`;
    if (entry.newValue === "cancelled") return `Invitation cancelled`;
  }

  if (entry.targetType === "user_organization") {
    const orgName = metadata.orgName as string || "";
    if (entry.fieldName === "assignment") {
      if (entry.newValue === "created") return `Added to ${orgName}`;
      if (entry.newValue === "removed") return `Removed from organization`;
    }
    if (entry.fieldName === "isPrimary") {
      return entry.newValue === "true" ? "Set as primary org" : "Removed as primary";
    }
  }

  return `${fieldLabel} changed`;
}

export function AdminAuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAuditTrail = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (targetTypeFilter !== "all") {
        params.set("targetType", targetTypeFilter);
      }

      const response = await fetch(`/api/v1/admin/audit-trail?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view the audit trail");
        }
        throw new Error("Failed to fetch audit trail");
      }

      const data = await response.json() as { entries: AuditEntry[]; pagination: Pagination };
      setEntries(data.entries);
      setPagination(data.pagination);
      setCurrentPage(data.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail(1);
  }, [targetTypeFilter]);

  const handlePageChange = (newPage: number) => {
    fetchAuditTrail(newPage);
  };

  if (error) {
    return (
      <div className="p-4">
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => fetchAuditTrail(currentPage)} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            Audit Trail
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete history of all changes in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter by type */}
          <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="invitation">Invitations</SelectItem>
              <SelectItem value="user_organization">Organizations</SelectItem>
            </SelectContent>
          </Select>
          {targetTypeFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTargetTypeFilter("all")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={() => fetchAuditTrail(currentPage)} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {pagination && (
        <div className="text-sm text-gray-500">
          Showing {entries.length} of {pagination.totalCount} entries
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Entries */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No audit entries found
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const config = TARGET_TYPE_CONFIG[entry.targetType] || TARGET_TYPE_CONFIG.report;
            const Icon = config.icon;
            const date = new Date(entry.createdAt);
            const description = getEntryDescription(entry);

            return (
              <div
                key={entry.id}
                className="border rounded-lg p-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {description}
                      </span>
                    </div>

                    {/* Value change */}
                    {entry.oldValue !== null && entry.newValue !== null && entry.fieldName !== "assignment" && (
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {formatValue(entry.fieldName, entry.oldValue)}
                        </span>
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                        <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {formatValue(entry.fieldName, entry.newValue)}
                        </span>
                      </div>
                    )}

                    {/* Target ID for reports */}
                    {entry.targetType === "report" && entry.targetId && (
                      <div className="mt-1 text-xs text-gray-500">
                        Report: <span className="font-mono">{entry.targetId.substring(0, 8)}...</span>
                      </div>
                    )}

                    {/* Reason */}
                    {entry.reason && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 italic">
                        "{entry.reason}"
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {/* Performer */}
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span>{entry.performerName || entry.performerEmail || "System"}</span>
                        {entry.performerRole && (
                          <span className="text-gray-400">
                            ({ROLE_LABELS[entry.performerRole] || entry.performerRole})
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span title={format(date, "PPpp")}>
                          {formatDistanceToNow(date, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
