import { useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LatLngBounds } from "leaflet";
import {
  useRoadSegments,
  RoadSegmentData,
  DAMAGE_ICONS,
} from "@/components/map/DisasterMap";
import { useMapViewStore } from "@/stores/mapView";
import { cn } from "@/lib/utils";

interface ProvinceGroup {
  province: string;
  segments: RoadSegmentData[];
  bounds: LatLngBounds;
}

// Red color for blocked roads
const BLOCKED_COLOR = "#DC2626";

export function RoadTable() {
  const segments = useRoadSegments();
  const {
    selectedProvince,
    selectedSegmentId,
    expandedProvinces,
    selectProvince,
    selectSegment,
  } = useMapViewStore();

  // Group segments by province and calculate bounds
  const provinceGroups = useMemo<ProvinceGroup[]>(() => {
    const groups: Record<string, RoadSegmentData[]> = {};

    segments.forEach((seg) => {
      if (!groups[seg.province]) {
        groups[seg.province] = [];
      }
      groups[seg.province].push(seg);
    });

    return Object.entries(groups)
      .map(([province, segs]) => {
        // Calculate bounds for this province
        const lats: number[] = [];
        const lngs: number[] = [];

        segs.forEach((seg) => {
          seg.path.forEach((point) => {
            const [lat, lng] = point as [number, number];
            lats.push(lat);
            lngs.push(lng);
          });
        });

        const bounds = new LatLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        );

        return {
          province,
          segments: segs.sort((a, b) => a.roadNo.localeCompare(b.roadNo)),
          bounds,
        };
      })
      .sort((a, b) => b.segments.length - a.segments.length); // Sort by count descending
  }, [segments]);

  const handleProvinceClick = (group: ProvinceGroup) => {
    selectProvince(group.province, group.bounds);
  };

  const handleSegmentClick = (segment: RoadSegmentData) => {
    selectSegment(segment.id, segment.midpoint);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Affected Roads
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {segments.length} road segments in {provinceGroups.length} provinces
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
                  {group.province}
                </span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {group.segments.length}
                </span>
              </button>

              {/* Expanded segment list */}
              {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-800/50">
                  {group.segments.map((segment) => {
                    const isSegmentSelected = selectedSegmentId === segment.id;
                    const damageIcon =
                      DAMAGE_ICONS[segment.damageType] || DAMAGE_ICONS.other;

                    return (
                      <button
                        key={segment.id}
                        onClick={() => handleSegmentClick(segment)}
                        className={cn(
                          "flex w-full items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700",
                          isSegmentSelected &&
                            "bg-blue-100 dark:bg-blue-900/30"
                        )}
                      >
                        {/* Damage type emoji */}
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base"
                          style={{
                            backgroundColor: `${BLOCKED_COLOR}15`,
                            border: `2px solid ${BLOCKED_COLOR}`,
                          }}
                        >
                          {damageIcon.emoji}
                        </span>

                        {/* Road info */}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {segment.roadNo}
                          </span>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {segment.roadName || segment.reason}
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
