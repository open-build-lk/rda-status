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
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
        Map Legend
      </h3>

      {/* Blocked road indicator */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-8 rounded"
            style={{ backgroundColor: "#DC2626" }}
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Blocked Road
          </span>
        </div>
      </div>

      {/* Damage types section */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Damage Type
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {DAMAGE_TYPES.map((item) => (
            <div key={item.type} className="flex items-center gap-1.5">
              <span className="text-sm">{item.emoji}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
