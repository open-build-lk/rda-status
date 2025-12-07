import { formatDistanceToNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Camera,
  MoreHorizontal,
  Check,
  X,
  ArrowRight,
  CheckCircle,
  RotateCcw,
  Pencil,
} from "lucide-react";
import { getAllowedTransitions } from "@/lib/statusTransitions";

interface WorkflowData {
  progressPercent?: number;
  estimatedCostLkr?: number | null;
  notes?: string;
}

interface Report {
  id: string;
  reportNumber: string;
  damageType: string;
  severity: number;
  status: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  description: string;
  passabilityLevel: string | null;
  workflowData: string | null;
  createdAt: string;
  provinceName: string | null;
  districtName: string | null;
  roadLocation: string | null;
  mediaCount?: number;
}

interface ReportCardProps {
  report: Report;
  userRole: string;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onMarkInProgress: (id: string) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onUpdateProgress: (id: string) => void;
  onViewDetails: (id: string) => void;
  isUpdating?: boolean;
}

// Damage type icons using emoji for mobile clarity
const damageTypeIcons: Record<string, string> = {
  tree_fall: "🌳",
  bridge_collapse: "🌉",
  landslide: "⛰️",
  flooding: "🌊",
  road_breakage: "🛣️",
  washout: "💧",
  collapse: "🏚️",
  blockage: "🚧",
  other: "❓",
};

const damageTypeLabels: Record<string, string> = {
  tree_fall: "Tree Fall",
  bridge_collapse: "Bridge",
  landslide: "Landslide",
  flooding: "Flooding",
  road_breakage: "Road Damage",
  washout: "Washout",
  collapse: "Collapse",
  blockage: "Blockage",
  other: "Other",
};

// Status styling
const statusConfig: Record<string, { dot: string; bg: string; text: string }> = {
  new: {
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400"
  },
  verified: {
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400"
  },
  in_progress: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400"
  },
  resolved: {
    dot: "bg-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900/20",
    text: "text-gray-700 dark:text-gray-400"
  },
  rejected: {
    dot: "bg-red-400",
    bg: "bg-red-50/50 dark:bg-red-900/10",
    text: "text-red-500 dark:text-red-400 line-through"
  },
};

// Severity dots component
function SeverityIndicator({ severity }: { severity: number }) {
  const colors = [
    "bg-green-400",  // 1 - Minor
    "bg-lime-400",   // 2 - Low
    "bg-yellow-400", // 3 - Medium
    "bg-orange-400", // 4 - High
    "bg-red-500",    // 5 - Critical
  ];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={`w-2 h-2 rounded-full ${
            level <= severity ? colors[severity - 1] : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

// Format currency in LKR
function formatLkr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ReportCard({
  report,
  userRole,
  onVerify,
  onReject,
  onMarkInProgress,
  onResolve,
  onReopen,
  onUpdateProgress,
  onViewDetails,
  isUpdating,
}: ReportCardProps) {
  const status = statusConfig[report.status] || statusConfig.new;
  const icon = damageTypeIcons[report.damageType] || "❓";
  const typeLabel = damageTypeLabels[report.damageType] || report.damageType;

  // Parse workflow data
  const workflow: WorkflowData = report.workflowData
    ? JSON.parse(report.workflowData)
    : {};
  const progressPercent = workflow.progressPercent ?? 0;
  const estimatedCostLkr = workflow.estimatedCostLkr;

  // Get allowed transitions for this user's role and current status
  const allowedTransitions = getAllowedTransitions(userRole, report.status);
  const canVerify = allowedTransitions.includes("verified");
  const canReject = allowedTransitions.includes("rejected");
  const canMarkInProgress = allowedTransitions.includes("in_progress");
  const canResolve = allowedTransitions.includes("resolved");
  const canReopen = allowedTransitions.includes("new");

  // Format location - prioritize roadLocation, then construct from district/province
  const location = report.roadLocation
    || (report.districtName && report.provinceName
        ? `${report.districtName}, ${report.provinceName}`
        : report.districtName || report.provinceName || "Unknown location");

  return (
    <div
      className={`rounded-lg border shadow-sm overflow-hidden ${status.bg} transition-all ${
        isUpdating ? "opacity-60" : ""
      }`}
    >
      {/* Header with status dot and report number */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => onViewDetails(report.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${status.dot}`} />
            <span className="font-mono text-sm font-medium">{report.reportNumber}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text} capitalize`}>
            {report.status.replace("_", " ")}
          </span>
        </div>

        {/* Damage type and severity */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-sm">{typeLabel}</span>
          <div className="flex items-center gap-1.5">
            <SeverityIndicator severity={report.severity} />
            <span className="text-xs text-gray-500">
              {report.severity >= 4 ? "High" : report.severity >= 3 ? "Med" : "Low"}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Time and photos */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{formatDistanceToNow(new Date(report.createdAt))} ago</span>
          {report.mediaCount && report.mediaCount > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {report.mediaCount} photo{report.mediaCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Progress and Cost - show for in_progress/resolved or when data exists */}
        {(report.status === "in_progress" || report.status === "resolved" || progressPercent > 0 || estimatedCostLkr) && (
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    progressPercent >= 100
                      ? "bg-green-500"
                      : progressPercent >= 50
                      ? "bg-blue-500"
                      : "bg-yellow-500"
                  }`}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">
                {progressPercent}%
              </span>
            </div>

            {/* Cost estimate */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Est. Cost:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatLkr(estimatedCostLkr)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons - Color scheme:
          - Blue = Primary forward action (Verify, Start Progress)
          - Green = Completion action (Resolved)
          - Red outline = Negative action (Reject)
          - Gray outline = Secondary/back actions (Reopen, Back to Verified)
      */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          {/* NEW status: Verify (blue) + Reject (red outline) */}
          {report.status === "new" && canVerify && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onVerify(report.id);
              }}
              disabled={isUpdating}
            >
              <Check className="w-4 h-4 mr-1" />
              Verify
            </Button>
          )}

          {report.status === "new" && canReject && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onReject(report.id);
              }}
              disabled={isUpdating}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          )}

          {/* VERIFIED status: Start Progress (blue) */}
          {report.status === "verified" && canMarkInProgress && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onMarkInProgress(report.id);
              }}
              disabled={isUpdating}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Start Progress
            </Button>
          )}

          {/* IN_PROGRESS status: Update Progress (blue) + Resolved (green) + Back (outline) */}
          {report.status === "in_progress" && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateProgress(report.id);
              }}
              disabled={isUpdating}
            >
              <Pencil className="w-4 h-4 mr-1" />
              Progress
            </Button>
          )}

          {report.status === "in_progress" && canResolve && (
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(report.id);
              }}
              disabled={isUpdating}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Done
            </Button>
          )}

          {report.status === "in_progress" && canVerify && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onVerify(report.id);
              }}
              disabled={isUpdating}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}

          {/* RESOLVED status: Reopen (outline) */}
          {report.status === "resolved" && canMarkInProgress && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onMarkInProgress(report.id);
              }}
              disabled={isUpdating}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reopen
            </Button>
          )}

          {/* REJECTED status: Reopen to New (outline) */}
          {report.status === "rejected" && canReopen && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onReopen(report.id);
              }}
              disabled={isUpdating}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reopen
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(report.id);
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
