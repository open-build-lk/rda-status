import { formatDistanceToNow, format } from "date-fns";
import { User, Clock, ArrowRight } from "lucide-react";
import clsx from "clsx";

interface AuditEntry {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedBy: string | null;
  performerName: string | null;
  reason: string | null;
  createdAt: Date | string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  reportCreatedAt?: Date | string;
  reporterName?: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  damageType: "Damage Type",
  severity: "Severity",
  passabilityLevel: "Passability",
  description: "Description",
  "workflow.progressPercent": "Progress",
  "workflow.estimatedCostLkr": "Estimated Cost",
  "workflow.notes": "Notes",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  verified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  tree_fall: "Tree Fall",
  bridge_collapse: "Bridge Collapse",
  landslide: "Landslide",
  flooding: "Flooding",
  road_breakage: "Road Breakage",
  washout: "Washout",
  collapse: "Collapse",
  blockage: "Blockage",
  other: "Other",
};

const SEVERITY_LABELS: Record<string, string> = {
  "1": "Minor",
  "2": "Moderate",
  "3": "Significant",
  "4": "Severe",
  "5": "Critical",
};

const PASSABILITY_LABELS: Record<string, string> = {
  unpassable: "Unpassable",
  foot: "Foot Traffic Only",
  bike: "Bikes Only",
  "3wheeler": "3-Wheelers",
  car: "Cars",
  bus: "Buses",
  truck: "Trucks",
};

function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";

  if (fieldName === "status") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
  if (fieldName === "damageType") {
    return DAMAGE_TYPE_LABELS[value] || value;
  }
  if (fieldName === "severity") {
    return SEVERITY_LABELS[value] || value;
  }
  if (fieldName === "passabilityLevel") {
    return PASSABILITY_LABELS[value] || value;
  }
  if (fieldName === "workflow.progressPercent") {
    return `${value}%`;
  }
  if (fieldName === "workflow.estimatedCostLkr") {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return `LKR ${num.toLocaleString()}`;
    }
  }
  if (fieldName === "description" && value.length > 50) {
    return value.substring(0, 50) + "...";
  }

  return value;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded text-xs font-medium",
        STATUS_COLORS[status] || "bg-gray-100 text-gray-700"
      )}
    >
      {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function ValueDisplay({ fieldName, value }: { fieldName: string; value: string | null }) {
  if (fieldName === "status" && value) {
    return <StatusBadge status={value} />;
  }
  return <span className="font-medium">{formatValue(fieldName, value)}</span>;
}

export function AuditTimeline({ entries, reportCreatedAt, reporterName }: AuditTimelineProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedEntries.length === 0 && !reportCreatedAt && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No activity recorded yet.
        </p>
      )}

      {sortedEntries.map((entry, index) => {
        const date = new Date(entry.createdAt);
        const fieldLabel = FIELD_LABELS[entry.fieldName] || entry.fieldName;

        return (
          <div key={entry.id} className="relative pl-6">
            {/* Timeline line */}
            {(index < sortedEntries.length - 1 || reportCreatedAt) && (
              <div className="absolute left-[9px] top-6 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Timeline dot */}
            <div className="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
            </div>

            <div className="pb-4">
              {/* Header */}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {entry.performerName || "System"}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  changed {fieldLabel}
                </span>
              </div>

              {/* Value change */}
              <div className="mt-1.5 flex items-center gap-2 text-sm">
                <ValueDisplay fieldName={entry.fieldName} value={entry.oldValue} />
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                <ValueDisplay fieldName={entry.fieldName} value={entry.newValue} />
              </div>

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

      {/* Report creation entry */}
      {reportCreatedAt && (
        <div className="relative pl-6">
          <div className="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border-2 border-green-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>

          <div className="pb-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {reporterName || "Anonymous"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                created report
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span title={format(new Date(reportCreatedAt), "PPpp")}>
                {formatDistanceToNow(new Date(reportCreatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
