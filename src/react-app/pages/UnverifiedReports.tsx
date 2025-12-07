import { useState } from "react";
import { UnverifiedReportsMap } from "@/components/map/UnverifiedReportsMap";

export function UnverifiedReports() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Unverified Citizen Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review and verify incoming citizen damage reports
        </p>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <UnverifiedReportsMap
          onReportSelect={setSelectedReportId}
          selectedReportId={selectedReportId}
        />
      </div>
    </div>
  );
}
