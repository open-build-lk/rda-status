const DAMAGE_TYPES = [
  { type: "flooding", label: "Flooding", emoji: "🌊" },
  { type: "landslide", label: "Landslide", emoji: "⛰️" },
  { type: "washout", label: "Washout", emoji: "💧" },
  { type: "collapse", label: "Collapse", emoji: "🚧" },
  { type: "blockage", label: "Blockage", emoji: "🚜" },
  { type: "other", label: "Other", emoji: "⚠️" },
];

export function MapLegend() {
  return (
    <div className="absolute bottom-2 left-2 z-[1000] rounded-lg bg-white p-2.5 shadow-lg dark:bg-gray-800 sm:bottom-4 sm:left-4 sm:p-4">
      <h3 className="mb-2 text-xs font-semibold text-gray-900 dark:text-white sm:mb-3 sm:text-sm">
        Map Legend
      </h3>

      {/* Blocked road indicator */}
      <div className="mb-2.5 sm:mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="h-1 w-6 rounded sm:h-1.5 sm:w-8"
            style={{ backgroundColor: "#DC2626" }}
          />
          <span className="text-[10px] text-gray-600 dark:text-gray-300 sm:text-xs">
            Blocked Road
          </span>
        </div>
      </div>

      {/* Damage types section */}
      <div>
        <h4 className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 sm:mb-2 sm:text-xs">
          Damage Type
        </h4>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {DAMAGE_TYPES.map((item) => (
            <div key={item.type} className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm">{item.emoji}</span>
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
