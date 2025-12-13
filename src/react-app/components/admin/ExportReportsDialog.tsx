import { useState } from "react";
import { Table } from "@tanstack/react-table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportToExcel";

interface Report {
  id: string;
  reportNumber: string;
  damageType: string;
  severity: number;
  status: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  description: string;
  passabilityLevel: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterPhone?: string | null;
  isVerifiedSubmitter: boolean | number;
  sourceType: string;
  workflowData: string | null;
  createdAt: string;
  updatedAt: string;
  provinceId: string | null;
  districtId: string | null;
  provinceName: string | null;
  districtName: string | null;
  roadLocation: string | null;
  mediaCount?: number;
  roadNumberInput: string | null;
  roadClass: string | null;
  classificationStatus: string | null;
  assignedOrgId: string | null;
  assignedOrgName?: string | null;
  assignedOrgCode?: string | null;
  resolvedAt?: string | null;
  inProgressAt?: string | null;
  locationPickedManually?: boolean | number | null;
}

interface ExportReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: Report[];
  filteredReports: Report[];
  table: Table<Report>;
  currentFilters: {
    province?: string;
    district?: string;
    status?: string;
    organization?: string;
  };
}

const FIELD_CATEGORIES = {
  basic: {
    label: "Basic Information",
    fields: [
      { key: 'reportNumber', label: 'Report Number' },
      { key: 'damageType', label: 'Damage Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
      { key: 'passabilityLevel', label: 'Passability Level' },
    ]
  },
  location: {
    label: "Location Data",
    defaultSelected: true,
    fields: [
      { key: 'locationName', label: 'Location Name' },
      { key: 'latitude', label: 'Latitude' },
      { key: 'longitude', label: 'Longitude' },
      { key: 'provinceName', label: 'Province' },
      { key: 'districtName', label: 'District' },
      { key: 'roadLocation', label: 'Road Location' },
    ]
  },
  classification: {
    label: "Classification",
    fields: [
      { key: 'roadClass', label: 'Road Class' },
      { key: 'roadNumberInput', label: 'Road Number' },
      { key: 'classificationStatus', label: 'Classification Status' },
      { key: 'assignedOrgName', label: 'Assigned Organization' },
      { key: 'assignedOrgCode', label: 'Organization Code' },
    ]
  },
  workflow: {
    label: "Workflow & Progress",
    fields: [
      { key: 'workflowData.progressPercent', label: 'Progress (%)' },
      { key: 'workflowData.estimatedCostLkr', label: 'Estimated Cost (LKR)' },
      { key: 'workflowData.notes', label: 'Workflow Notes' },
      { key: 'mediaCount', label: 'Media Count' },
    ]
  },
  submitter: {
    label: "Submitter Information",
    fields: [
      { key: 'submitterName', label: 'Submitter Name' },
      { key: 'submitterEmail', label: 'Submitter Email' },
      { key: 'submitterPhone', label: 'Submitter Phone' },
      { key: 'isVerifiedSubmitter', label: 'Verified Submitter' },
      { key: 'sourceType', label: 'Source Type' },
    ]
  },
  timestamps: {
    label: "Timestamps",
    fields: [
      { key: 'createdAt', label: 'Created At' },
      { key: 'updatedAt', label: 'Updated At' },
      { key: 'resolvedAt', label: 'Resolved At' },
      { key: 'inProgressAt', label: 'In Progress At' },
    ]
  },
};

export function ExportReportsDialog({
  open,
  onOpenChange,
  reports,
  filteredReports,
  table,
  currentFilters,
}: ExportReportsDialogProps) {
  // Default to location fields selected
  const defaultFields = FIELD_CATEGORIES.location.fields.map(f => f.key);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(defaultFields));
  const [exportScope, setExportScope] = useState<'current' | 'filtered' | 'all'>('filtered');
  const [isExporting, setIsExporting] = useState(false);

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(fieldKey);
      } else {
        next.delete(fieldKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFieldKeys = Object.values(FIELD_CATEGORIES)
      .flatMap(cat => cat.fields.map(f => f.key));
    setSelectedFields(new Set(allFieldKeys));
  };

  const handleDeselectAll = () => {
    setSelectedFields(new Set());
  };

  const handleCategoryToggle = (categoryKey: keyof typeof FIELD_CATEGORIES, checked: boolean) => {
    const category = FIELD_CATEGORIES[categoryKey];
    const categoryFieldKeys = category.fields.map(f => f.key);

    setSelectedFields(prev => {
      const next = new Set(prev);
      if (checked) {
        categoryFieldKeys.forEach(key => next.add(key));
      } else {
        categoryFieldKeys.forEach(key => next.delete(key));
      }
      return next;
    });
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Determine data to export based on scope
      let reportsToExport: Report[];
      switch (exportScope) {
        case 'current':
          reportsToExport = table.getRowModel().rows.map(r => r.original);
          break;
        case 'filtered':
          reportsToExport = filteredReports;
          break;
        case 'all':
          reportsToExport = reports;
          break;
      }

      // Generate filename with filters and date
      const timestamp = new Date().toISOString().split('T')[0];
      const filterParts = [];
      if (currentFilters.province) filterParts.push(currentFilters.province);
      if (currentFilters.district) filterParts.push(currentFilters.district);
      if (currentFilters.status) filterParts.push(currentFilters.status);
      const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('-')}` : '';
      const fileName = `citizen-reports${filterSuffix}_${timestamp}.xlsx`;

      // Call export utility
      exportToExcel({
        reports: reportsToExport,
        fields: Array.from(selectedFields),
        fileName,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    // Reset to defaults when closing
    setSelectedFields(new Set(defaultFields));
    setExportScope('filtered');
    onOpenChange(false);
  };

  const currentPageCount = table.getRowModel().rows.length;
  const filteredCount = filteredReports.length;
  const totalCount = reports.length;

  const isCategoryFullySelected = (categoryKey: keyof typeof FIELD_CATEGORIES) => {
    const category = FIELD_CATEGORIES[categoryKey];
    return category.fields.every(f => selectedFields.has(f.key));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Export Citizen Reports</DrawerTitle>
          <DrawerDescription>
            Select fields to export and choose the data scope
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Export Scope Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Scope:</Label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  exportScope === 'current'
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="current"
                  checked={exportScope === 'current'}
                  onChange={(e) => setExportScope(e.target.value as 'current')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">Current page only ({currentPageCount} reports)</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  exportScope === 'filtered'
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="filtered"
                  checked={exportScope === 'filtered'}
                  onChange={(e) => setExportScope(e.target.value as 'filtered')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">All filtered data ({filteredCount} reports)</span>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  exportScope === 'all'
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="export-scope"
                  value="all"
                  checked={exportScope === 'all'}
                  onChange={(e) => setExportScope(e.target.value as 'all')}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">All reports ({totalCount} reports)</span>
              </label>
            </div>
          </div>

          {/* Field Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Fields to Export:</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="h-7 text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Categorized Fields */}
            <div className="space-y-4">
              {Object.entries(FIELD_CATEGORIES).map(([categoryKey, category]) => {
                const key = categoryKey as keyof typeof FIELD_CATEGORIES;
                const isFullySelected = isCategoryFullySelected(key);
                const isPartiallySelected = category.fields.some(f => selectedFields.has(f.key)) && !isFullySelected;

                return (
                  <div key={categoryKey} className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFullySelected}
                        ref={el => {
                          if (el) el.indeterminate = isPartiallySelected;
                        }}
                        onChange={(e) => handleCategoryToggle(key, e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="font-medium text-sm">{category.label}</span>
                    </label>
                    <div className="space-y-1.5 ml-6">
                      {category.fields.map(field => (
                        <label
                          key={field.key}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFields.has(field.key)}
                            onChange={(e) => handleFieldToggle(field.key, e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span className="text-sm">{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
            </DrawerClose>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleExport}
              disabled={selectedFields.size === 0 || isExporting}
            >
              {isExporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!isExporting && <Download className="w-4 h-4 mr-2" />}
              Export to Excel
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
