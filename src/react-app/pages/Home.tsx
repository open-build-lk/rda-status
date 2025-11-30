import { useMemo, useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Mountain,
  Droplets,
  List,
  X,
} from "lucide-react";
import { DisasterMap } from "@/components/map";
import { RoadTable } from "@/components/road-table";
import {
  initialRoadSegments,
  mapReasonToDamageType,
  mapReasonToSeverity,
} from "@/data/initialRoadSegments";
import { cn } from "@/lib/utils";

export function Home() {
  const [showMobileList, setShowMobileList] = useState(false);

  // Compute stats from initial road segments
  const stats = useMemo(() => {
    // Filter to only road segments (not point damage)
    const segments = initialRoadSegments.filter(
      (seg) => seg.fromLat !== seg.toLat || seg.fromLng !== seg.toLng
    );

    // Count by damage type
    const damageTypes: Record<string, number> = {};
    segments.forEach((seg) => {
      const type = mapReasonToDamageType(seg.reason);
      damageTypes[type] = (damageTypes[type] || 0) + 1;
    });

    // Count by severity
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    segments.forEach((seg) => {
      const severity = mapReasonToSeverity(seg.reason);
      if (severity === 4) severityCounts.critical++;
      else if (severity === 3) severityCounts.high++;
      else if (severity === 2) severityCounts.medium++;
      else severityCounts.low++;
    });

    // Unique provinces
    const provinces = new Set(segments.map((seg) => seg.province));

    return {
      totalBlocked: segments.length,
      provinces: provinces.size,
      flooding: damageTypes.flooding || 0,
      landslides: damageTypes.landslide || 0,
      critical: severityCounts.critical,
      high: severityCounts.high,
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Stats bar */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* Total blocked */}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalBlocked}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Roads Affected
                </p>
              </div>
            </div>

            {/* Provinces */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.provinces}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Provinces
                </p>
              </div>
            </div>

            {/* Flooding */}
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Droplets className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.flooding}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Flooding
                </p>
              </div>
            </div>

            {/* Landslides */}
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Mountain className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.landslides}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Landslides
                </p>
              </div>
            </div>
          </div>

          {/* Severity badges + mobile list toggle */}
          <div className="flex items-center gap-2">
            {stats.critical > 0 && (
              <span className="hidden rounded-full bg-red-800 px-2.5 py-1 text-xs font-medium text-white sm:inline-flex">
                {stats.critical} Critical
              </span>
            )}
            {stats.high > 0 && (
              <span className="hidden rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white sm:inline-flex">
                {stats.high} High
              </span>
            )}

            {/* Mobile list toggle button */}
            <button
              onClick={() => setShowMobileList(!showMobileList)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 lg:hidden"
              aria-label={showMobileList ? "Hide road list" : "Show road list"}
            >
              {showMobileList ? (
                <>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Close</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Roads</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Split view: Table + Map */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Road table - desktop sidebar */}
        <div className="hidden w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 lg:block xl:w-96">
          <RoadTable />
        </div>

        {/* Road table - mobile overlay */}
        <div
          className={cn(
            "absolute inset-0 z-20 transform transition-transform duration-300 ease-in-out lg:hidden",
            showMobileList ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full w-full bg-white dark:bg-gray-900 sm:w-80 sm:border-r sm:border-gray-200 sm:shadow-lg dark:sm:border-gray-700">
            <RoadTable />
          </div>
          {/* Backdrop on mobile when list is open */}
          <div
            className={cn(
              "absolute inset-0 -z-10 bg-black/50 transition-opacity sm:hidden",
              showMobileList ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setShowMobileList(false)}
          />
        </div>

        {/* Map */}
        <div className="relative flex-1">
          <DisasterMap />
        </div>
      </div>
    </div>
  );
}
