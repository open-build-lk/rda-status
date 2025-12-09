import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  List,
  X,
  CheckCircle,
  Clock,
  Wrench,
} from "lucide-react";
import { DisasterMap } from "@/components/map";
import { RoadTable } from "@/components/road-table";
import { usePublicMetrics } from "@/hooks/usePublicMetrics";
import { useMapViewStore, StatusFilter } from "@/stores/mapView";
import { cn } from "@/lib/utils";

export function Home() {
  const { t } = useTranslation();
  const [showMobileList, setShowMobileList] = useState(false);
  const { metrics } = usePublicMetrics();
  const { statusFilter, setStatusFilter } = useMapViewStore();

  // Helper for clickable stat items
  const StatButton = ({
    filter,
    icon: Icon,
    value,
    label,
    bgColor,
    activeBgColor,
    textColor,
    className,
  }: {
    filter: StatusFilter;
    icon: React.ElementType;
    value: number | string;
    label: string;
    bgColor: string;
    activeBgColor: string;
    textColor: string;
    className?: string;
  }) => {
    const isActive = statusFilter === filter;
    return (
      <button
        onClick={() => setStatusFilter(filter)}
        className={cn(
          "flex items-center gap-1 rounded-lg px-1 py-1 transition-all sm:gap-2 sm:px-2",
          isActive
            ? `ring-2 ring-offset-1 ${activeBgColor}`
            : "hover:bg-gray-100 dark:hover:bg-gray-800",
          className
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
            bgColor
          )}
        >
          <Icon className={cn("h-3.5 w-3.5 sm:h-5 sm:w-5", textColor)} />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
            {value}
          </p>
          <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
            {label}
          </p>
        </div>
      </button>
    );
  };

  // Static stat display (non-clickable)
  const StatDisplay = ({
    icon: Icon,
    value,
    label,
    suffix,
    bgColor,
    textColor,
    className,
  }: {
    icon: React.ElementType;
    value: number | string;
    label: string;
    suffix?: string;
    bgColor: string;
    textColor: string;
    className?: string;
  }) => {
    return (
      <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
            bgColor
          )}
        >
          <Icon className={cn("h-3.5 w-3.5 sm:h-5 sm:w-5", textColor)} />
        </div>
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
            {value}
            {suffix && (
              <span className="ml-0.5 text-xs font-normal text-gray-500">
                {suffix}
              </span>
            )}
          </p>
          <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
            {label}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full max-h-full flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-800 dark:bg-gray-900 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto sm:gap-4">
            {/* Total Reports - clickable "all" filter */}
            <StatButton
              filter="all"
              icon={AlertTriangle}
              value={metrics?.summary.totalReports ?? 0}
              label={t("common:dashboard.totalReports", "Total Reports")}
              bgColor="bg-gray-200 dark:bg-gray-700"
              activeBgColor="ring-gray-500 bg-gray-100 dark:bg-gray-600"
              textColor="text-gray-700 dark:text-gray-300"
            />

            {/* Pending - clickable filter */}
            <StatButton
              filter="pending"
              icon={AlertTriangle}
              value={metrics?.summary.pending ?? 0}
              label={t("common:dashboard.pending", "Pending")}
              bgColor="bg-red-100 dark:bg-red-900/30"
              activeBgColor="ring-red-500 bg-red-50 dark:bg-red-900/40"
              textColor="text-red-600 dark:text-red-400"
            />

            {/* In Progress - clickable filter */}
            <StatButton
              filter="in_progress"
              icon={Wrench}
              value={metrics?.summary.inProgress ?? 0}
              label={t("common:dashboard.inProgress", "In Progress")}
              bgColor="bg-orange-100 dark:bg-orange-900/30"
              activeBgColor="ring-orange-500 bg-orange-50 dark:bg-orange-900/40"
              textColor="text-orange-600 dark:text-orange-400"
            />

            {/* Resolved - clickable filter */}
            <StatButton
              filter="resolved"
              icon={CheckCircle}
              value={metrics?.summary.resolved ?? 0}
              label={t("common:dashboard.resolved", "Resolved")}
              bgColor="bg-green-100 dark:bg-green-900/30"
              activeBgColor="ring-green-500 bg-green-50 dark:bg-green-900/40"
              textColor="text-green-600 dark:text-green-400"
            />

            {/* Avg Resolution Time - static display */}
            <StatDisplay
              icon={Clock}
              value={metrics?.performance.avgResolutionTimeDays ?? "-"}
              suffix="d"
              label={t("common:dashboard.avgResolution", "Avg Resolution")}
              bgColor="bg-purple-100 dark:bg-purple-900/30"
              textColor="text-purple-600 dark:text-purple-400"
              className="hidden sm:flex"
            />
          </div>

          {/* Mobile list toggle button */}
          <button
            onClick={() => setShowMobileList(!showMobileList)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:h-10 sm:w-10 lg:hidden"
            aria-label={showMobileList ? "Hide road list" : "Show road list"}
          >
            {showMobileList ? (
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <List className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Split view: Table + Map */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Road table - desktop sidebar */}
        <div className="hidden w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 lg:block xl:w-96">
          <RoadTable />
        </div>

        {/* Map - hidden on mobile when menu is open */}
        {!showMobileList && (
          <div className="relative min-w-0 flex-1">
            <DisasterMap />
          </div>
        )}

        {/* Road table - mobile full-screen overlay */}
        {showMobileList && (
          <div className="flex-1 bg-white dark:bg-gray-900 lg:hidden">
            <RoadTable onSegmentClick={() => setShowMobileList(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
