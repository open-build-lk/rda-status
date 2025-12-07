interface StatusCounts {
  new: number;
  verified: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

interface StatusSummaryProps {
  counts: StatusCounts;
  selectedStatus: string | null;
  onStatusClick: (status: string | null) => void;
}

const statusConfig = [
  { key: "new", label: "New", dotClass: "bg-red-500", activeClass: "ring-red-500" },
  { key: "verified", label: "Verified", dotClass: "bg-green-500", activeClass: "ring-green-500" },
  { key: "in_progress", label: "In Progress", dotClass: "bg-yellow-500", activeClass: "ring-yellow-500" },
  { key: "resolved", label: "Resolved", dotClass: "bg-gray-500", activeClass: "ring-gray-500" },
  { key: "rejected", label: "Rejected", dotClass: "bg-red-400", activeClass: "ring-red-400" },
];

export function StatusSummary({ counts, selectedStatus, onStatusClick }: StatusSummaryProps) {
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All button */}
      <button
        onClick={() => onStatusClick(null)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          selectedStatus === null
            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        }`}
      >
        All
        <span className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded-full">
          {total}
        </span>
      </button>

      {/* Status buttons */}
      {statusConfig.map(({ key, label, dotClass, activeClass }) => {
        const count = counts[key as keyof StatusCounts];
        if (count === 0 && selectedStatus !== key) return null; // Hide empty statuses unless selected

        return (
          <button
            key={key}
            onClick={() => onStatusClick(selectedStatus === key ? null : key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              selectedStatus === key
                ? `ring-2 ${activeClass} bg-white dark:bg-gray-900`
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{count}</span>
            <span className="hidden sm:inline bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
