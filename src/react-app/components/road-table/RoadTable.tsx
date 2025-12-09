import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, CheckCircle, Wrench } from "lucide-react";
import { LatLngBounds } from "leaflet";
import { useCitizenIncidents, ProcessedIncident } from "@/hooks/useCitizenIncidents";
import { DAMAGE_ICONS } from "@/components/map/DisasterMap";
import { useMapViewStore, StatusFilter } from "@/stores/mapView";
import { cn } from "@/lib/utils";

// Status colors for list items
const STATUS_COLORS = {
  verified: "#DC2626",    // Red - pending/verified
  in_progress: "#F97316", // Orange - in progress
  resolved: "#16A34A",    // Green - resolved
  new: "#DC2626",         // Red - new
};

// Helper to check if incident matches status filter
function matchesStatusFilter(status: string, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "verified" || status === "new";
  return status === filter;
}

interface ProvinceGroup {
  province: string;
  reports: ProcessedIncident[];
  bounds: LatLngBounds;
  counts: {
    pending: number;
    in_progress: number;
    resolved: number;
  };
}

interface RoadTableProps {
  onSegmentClick?: () => void;
}

export function RoadTable(props: RoadTableProps = {}) {
  const { onSegmentClick } = props;
  const { t } = useTranslation();
  const { incidents, isLoading, error } = useCitizenIncidents();
  const {
    selectedProvince,
    selectedSegmentId,
    expandedProvinces,
    statusFilter,
    selectProvince,
    selectSegment,
  } = useMapViewStore();

  // Group incidents by province and calculate bounds + counts
  const provinceGroups = useMemo<ProvinceGroup[]>(() => {
    const groups: Record<string, ProcessedIncident[]> = {};

    // Filter incidents by status filter first
    const filteredIncidents = incidents.filter((inc) =>
      matchesStatusFilter(inc.status, statusFilter)
    );

    filteredIncidents.forEach((inc) => {
      if (!groups[inc.provinceName]) {
        groups[inc.provinceName] = [];
      }
      groups[inc.provinceName].push(inc);
    });

    return Object.entries(groups)
      .map(([province, reps]) => {
        // Calculate bounds for this province
        const lats: number[] = [];
        const lngs: number[] = [];

        reps.forEach((rep) => {
          const [lat, lng] = rep.position as [number, number];
          lats.push(lat);
          lngs.push(lng);
        });

        const bounds = new LatLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );

        // Calculate status counts for this province (from all incidents, not filtered)
        const allProvinceIncidents = incidents.filter(
          (inc) => inc.provinceName === province
        );
        const counts = {
          pending: allProvinceIncidents.filter(
            (inc) => inc.status === "verified" || inc.status === "new"
          ).length,
          in_progress: allProvinceIncidents.filter(
            (inc) => inc.status === "in_progress"
          ).length,
          resolved: allProvinceIncidents.filter(
            (inc) => inc.status === "resolved"
          ).length,
        };

        return {
          province,
          reports: reps.sort((a, b) => {
            // Sort by district first, then by report number
            const districtCompare = a.districtName.localeCompare(b.districtName);
            if (districtCompare !== 0) return districtCompare;
            return a.reportNumber.localeCompare(b.reportNumber);
          }),
          bounds,
          counts,
        };
      })
      .filter((group) => group.reports.length > 0) // Only show provinces with matching reports
      .sort((a, b) => b.reports.length - a.reports.length); // Sort by count descending
  }, [incidents, statusFilter]);

  const handleProvinceClick = (group: ProvinceGroup) => {
    selectProvince(group.province, group.bounds);
  };

  const handleReportClick = (report: ProcessedIncident) => {
    selectSegment(report.id, report.position);
    onSegmentClick?.();
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("report:home.activeIncidents")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("messages.loading")}</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">{t("messages.loading")}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("report:home.activeIncidents")}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-red-500 text-center text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Calculate total filtered count
  const totalFilteredCount = provinceGroups.reduce(
    (sum, group) => sum + group.reports.length,
    0
  );

  // Get status filter label
  const filterLabel =
    statusFilter === "all"
      ? t("report:home.activeIncidents")
      : statusFilter === "pending"
        ? t("common:dashboard.pending", "Pending")
        : statusFilter === "resolved"
          ? t("common:dashboard.resolved", "Resolved")
          : t("common:dashboard.inProgress", "In Progress");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {filterLabel}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("report:home.citizenReports", { count: totalFilteredCount, provinces: provinceGroups.length })}
        </p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {provinceGroups.map((group) => {
          const isExpanded = expandedProvinces.has(group.province);
          const isSelected = selectedProvince === group.province;

          return (
            <div key={group.province}>
              {/* Province header */}
              <button
                onClick={() => handleProvinceClick(group)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800",
                  isSelected && "bg-blue-50 dark:bg-blue-900/20"
                )}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                )}
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                  {t(`locations:provinces.${group.province}`, { defaultValue: group.province })}
                </span>
                {/* Status count badges */}
                <div className="flex items-center gap-1">
                  {group.counts.pending > 0 && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {group.counts.pending}
                    </span>
                  )}
                  {group.counts.in_progress > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <Wrench className="h-2.5 w-2.5" />
                      {group.counts.in_progress}
                    </span>
                  )}
                  {group.counts.resolved > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {group.counts.resolved}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded report list */}
              {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-800/50">
                  {group.reports.map((report) => {
                    const isReportSelected = selectedSegmentId === report.id;
                    const damageIcon =
                      DAMAGE_ICONS[report.damageType] || DAMAGE_ICONS.other;
                    const statusColor =
                      STATUS_COLORS[report.status as keyof typeof STATUS_COLORS] ||
                      STATUS_COLORS.verified;

                    return (
                      <button
                        key={report.id}
                        onClick={() => handleReportClick(report)}
                        className={cn(
                          "flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700",
                          isReportSelected &&
                            "bg-blue-100 dark:bg-blue-900/30"
                        )}
                      >
                        {/* Damage type emoji with status-colored border */}
                        <div className="relative flex-shrink-0">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                            style={{
                              backgroundColor: `${statusColor}15`,
                              border: `2px solid ${statusColor}`,
                            }}
                          >
                            {damageIcon.emoji}
                          </span>
                          {/* Status badge */}
                          {report.status === "resolved" && (
                            <CheckCircle
                              className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white text-green-600 dark:bg-gray-800"
                            />
                          )}
                          {report.status === "in_progress" && (
                            <Wrench
                              className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white text-orange-600 dark:bg-gray-800"
                            />
                          )}
                        </div>

                        {/* Report info */}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {report.roadLocation || report.districtName}
                          </span>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {report.districtName} • {report.reportNumber}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
