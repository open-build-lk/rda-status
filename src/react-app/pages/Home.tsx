import { useMemo, useState } from "react";
import {
  Building2,
  School,
  Stethoscope,
  Zap,
  List,
  X,
} from "lucide-react";
import { DisasterMap } from "@/components/map";
import { RoadTable } from "@/components/road-table";
import { useCitizenIncidents } from "@/hooks/useCitizenIncidents";

export function Home() {
  const [showMobileList, setShowMobileList] = useState(false);
  const { incidents } = useCitizenIncidents();

  // Compute stats from infrastructure damage reports
  const stats = useMemo(() => {
    // Count by infrastructure category
    const categories: Record<string, number> = {
      government_building: 0,
      school: 0,
      hospital: 0,
      utility: 0,
    };

    // Count by damage level
    const damageLevels: Record<string, number> = {
      minor: 0,
      major: 0,
      destroyed: 0,
    };

    incidents.forEach((inc) => {
      const category = inc.infrastructureCategory || "other";
      categories[category] = (categories[category] || 0) + 1;

      const level = inc.damageLevel || "minor";
      damageLevels[level] = (damageLevels[level] || 0) + 1;
    });

    return {
      total: incidents.length,
      government: categories.government_building,
      schools: categories.school,
      hospitals: categories.hospital,
      utilities: categories.utility,
      destroyed: damageLevels.destroyed,
      major: damageLevels.major,
    };
  }, [incidents]);

  return (
    <div className="flex h-full max-h-full flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-800 dark:bg-gray-900 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto sm:gap-4">
            {/* Total Reports */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 sm:h-10 sm:w-10">
                <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.total}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Total Reports
                </p>
              </div>
            </div>

            {/* Schools */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 sm:h-10 sm:w-10">
                <School className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.schools}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Schools
                </p>
              </div>
            </div>

            {/* Hospitals */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30 sm:h-10 sm:w-10">
                <Stethoscope className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.hospitals}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Hospitals
                </p>
              </div>
            </div>

            {/* Utilities */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30 sm:h-10 sm:w-10">
                <Zap className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {stats.utilities}
                </p>
                <p className="whitespace-nowrap text-[9px] text-gray-500 dark:text-gray-400 sm:text-xs">
                  Utilities
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
