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
      <div className="border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-800 dark:bg-gray-900 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto sm:gap-4">
            {/* Total blocked */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 sm:h-10 sm:w-10">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.totalBlocked}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Roads Affected
                </p>
              </div>
            </div>

            {/* Provinces */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 sm:h-10 sm:w-10">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.provinces}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Provinces
                </p>
              </div>
            </div>

            {/* Flooding */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30 sm:h-10 sm:w-10">
                <Droplets className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.flooding}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Flooding
                </p>
              </div>
            </div>

            {/* Landslides */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 sm:h-10 sm:w-10">
                <Mountain className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.landslides}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Landslides
                </p>
              </div>
            </div>
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
      <div className="relative flex flex-1 overflow-hidden">
        {/* Road table - desktop sidebar */}
        <div className="hidden w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 lg:block xl:w-96">
          <RoadTable />
        </div>

        {/* Map - hidden on mobile when menu is open */}
        {!showMobileList && (
          <div className="relative flex-1 lg:flex">
            <DisasterMap />
          </div>
        )}

        {/* Road table - mobile full-screen overlay */}
        {showMobileList && (
          <div className="flex-1 bg-white dark:bg-gray-900 lg:hidden">
            <RoadTable
              onProvinceClick={() => setShowMobileList(false)}
              onSegmentClick={() => setShowMobileList(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
