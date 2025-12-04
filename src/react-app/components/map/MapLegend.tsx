const INFRASTRUCTURE_TYPES = [
  { type: "government_building", label: "Government", emoji: "🏛️" },
  { type: "school", label: "School", emoji: "🏫" },
  { type: "hospital", label: "Hospital", emoji: "🏥" },
  { type: "utility", label: "Utility", emoji: "⚡" },
];

const DAMAGE_LEVELS = [
  { level: "minor", label: "Minor", color: "#FBBF24" },
  { level: "major", label: "Major", color: "#F97316" },
  { level: "destroyed", label: "Destroyed", color: "#DC2626" },
];

export function MapLegend() {
  return (
    <div className="absolute bottom-2 left-2 z-[1000] rounded-lg bg-white p-2.5 shadow-lg dark:bg-gray-800 sm:bottom-4 sm:left-4 sm:p-4">
      <h3 className="mb-2 text-xs font-semibold text-gray-900 dark:text-white sm:mb-3 sm:text-sm">
        Map Legend
      </h3>

      {/* Infrastructure types section */}
      <div className="mb-2.5 sm:mb-4">
        <h4 className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-xs">
          Infrastructure Type
        </h4>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {INFRASTRUCTURE_TYPES.map((item) => (
            <div key={item.type} className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm">{item.emoji}</span>
              <span className="text-[10px] text-gray-600 dark:text-gray-300 sm:text-xs">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Damage levels section */}
      <div>
        <h4 className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-xs">
          Damage Level
        </h4>
        <div className="flex flex-col gap-1 sm:gap-1.5">
          {DAMAGE_LEVELS.map((item) => (
            <div key={item.level} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="h-3 w-3 rounded-full sm:h-4 sm:w-4"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-gray-600 dark:text-gray-300 sm:text-xs">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
