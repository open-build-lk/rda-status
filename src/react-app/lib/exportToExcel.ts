import * as XLSX from 'xlsx';

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
  provinceName: string | null;
  districtName: string | null;
  roadLocation: string | null;
  mediaCount?: number;
  roadNumberInput: string | null;
  roadClass: string | null;
  classificationStatus: string | null;
  assignedOrgName?: string | null;
  assignedOrgCode?: string | null;
  resolvedAt?: string | null;
  inProgressAt?: string | null;
}

export interface ExportField {
  key: string;
  label: string;
  category: 'basic' | 'location' | 'classification' | 'workflow' | 'submitter' | 'timestamps';
  transform?: (value: any, report: Report) => any;
}

export interface ExportOptions {
  fields: string[];
  reports: Report[];
  fileName?: string;
}

const damageTypeLabels: Record<string, string> = {
  tree_fall: 'Tree Fall',
  bridge_collapse: 'Bridge Collapse',
  landslide: 'Landslide',
  flooding: 'Flooding',
  road_breakage: 'Road Breakage',
  washout: 'Washout',
  collapse: 'Collapse',
  blockage: 'Blockage',
  other: 'Other'
};

const passabilityLabels: Record<string, string> = {
  unpassable: 'Unpassable',
  foot: 'Foot Traffic Only',
  bike: 'Bike/Motorcycle',
  '3wheeler': '3-Wheeler',
  car: 'Car',
  bus: 'Bus',
  truck: 'Truck'
};

const statusLabels: Record<string, string> = {
  new: 'New',
  verified: 'Verified',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected'
};

export function getExportableFields(): ExportField[] {
  return [
    // Basic Information
    { key: 'reportNumber', label: 'Report Number', category: 'basic' },
    { key: 'damageType', label: 'Damage Type', category: 'basic' },
    { key: 'severity', label: 'Severity', category: 'basic' },
    { key: 'status', label: 'Status', category: 'basic' },
    { key: 'description', label: 'Description', category: 'basic' },
    { key: 'passabilityLevel', label: 'Passability Level', category: 'basic' },

    // Location Data
    { key: 'locationName', label: 'Location Name', category: 'location' },
    { key: 'latitude', label: 'Latitude', category: 'location' },
    { key: 'longitude', label: 'Longitude', category: 'location' },
    { key: 'provinceName', label: 'Province', category: 'location' },
    { key: 'districtName', label: 'District', category: 'location' },
    { key: 'roadLocation', label: 'Road Location', category: 'location' },

    // Classification
    { key: 'roadClass', label: 'Road Class', category: 'classification' },
    { key: 'roadNumberInput', label: 'Road Number', category: 'classification' },
    { key: 'classificationStatus', label: 'Classification Status', category: 'classification' },
    { key: 'assignedOrgName', label: 'Assigned Organization', category: 'classification' },
    { key: 'assignedOrgCode', label: 'Organization Code', category: 'classification' },

    // Workflow & Progress
    { key: 'workflowData.progressPercent', label: 'Progress (%)', category: 'workflow' },
    { key: 'workflowData.estimatedCostLkr', label: 'Estimated Cost (LKR)', category: 'workflow' },
    { key: 'workflowData.notes', label: 'Workflow Notes', category: 'workflow' },
    { key: 'mediaCount', label: 'Media Count', category: 'workflow' },

    // Submitter Information
    { key: 'submitterName', label: 'Submitter Name', category: 'submitter' },
    { key: 'submitterEmail', label: 'Submitter Email', category: 'submitter' },
    { key: 'submitterPhone', label: 'Submitter Phone', category: 'submitter' },
    { key: 'isVerifiedSubmitter', label: 'Verified Submitter', category: 'submitter' },
    { key: 'sourceType', label: 'Source Type', category: 'submitter' },

    // Timestamps
    { key: 'createdAt', label: 'Created At', category: 'timestamps' },
    { key: 'updatedAt', label: 'Updated At', category: 'timestamps' },
    { key: 'resolvedAt', label: 'Resolved At', category: 'timestamps' },
    { key: 'inProgressAt', label: 'In Progress At', category: 'timestamps' },
  ];
}

function getNestedValue(obj: any, path: string): any {
  if (!path.includes('.')) {
    return obj[path];
  }

  const [first, ...rest] = path.split('.');
  let value = obj[first];

  // Parse JSON strings (workflowData)
  if (typeof value === 'string' && first === 'workflowData') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value ? getNestedValue(value, rest.join('.')) : null;
}

function formatDate(timestamp: string | number): string {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return String(timestamp);
  }
}

export function prepareReportData(
  reports: Report[],
  fields: ExportField[]
): any[][] {
  return reports.map(report => {
    return fields.map(field => {
      const value = getNestedValue(report, field.key);

      // Handle null/undefined
      if (value === null || value === undefined) return '';

      // Apply custom transform if defined
      if (field.transform) {
        return field.transform(value, report);
      }

      // Date formatting
      if (field.key.includes('At') || field.key.includes('Date')) {
        return formatDate(value);
      }

      // Boolean to Yes/No
      if (field.key === 'isVerifiedSubmitter') {
        return value ? 'Yes' : 'No';
      }

      // Damage type mapping
      if (field.key === 'damageType') {
        return damageTypeLabels[value] || value;
      }

      // Status mapping
      if (field.key === 'status') {
        return statusLabels[value] || value;
      }

      // Passability level mapping
      if (field.key === 'passabilityLevel') {
        return passabilityLabels[value] || value;
      }

      // Classification status mapping
      if (field.key === 'classificationStatus') {
        const labels: Record<string, string> = {
          pending: 'Pending',
          auto_classified: 'Auto Classified',
          manual_classified: 'Manual Classified',
          legacy: 'Legacy',
          unclassifiable: 'Unclassifiable'
        };
        return labels[value] || value;
      }

      // Source type mapping
      if (field.key === 'sourceType') {
        const labels: Record<string, string> = {
          citizen: 'Citizen',
          field_officer: 'Field Officer',
          other_agency: 'Other Agency'
        };
        return labels[value] || value;
      }

      // Coordinate formatting
      if (field.key === 'latitude' || field.key === 'longitude') {
        return parseFloat(value).toFixed(6);
      }

      // Estimated cost formatting
      if (field.key === 'workflowData.estimatedCostLkr') {
        return value ? parseFloat(value).toFixed(2) : '';
      }

      return value;
    });
  });
}

export function exportToExcel(options: ExportOptions): void {
  const { reports, fields, fileName = 'citizen-reports.xlsx' } = options;

  // Get selected field definitions
  const allFields = getExportableFields();
  const selectedFieldDefs = allFields.filter(f => fields.includes(f.key));

  // Prepare data (2D array)
  const headers = selectedFieldDefs.map(f => f.label);
  const data = prepareReportData(reports, selectedFieldDefs);

  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  ws['!cols'] = selectedFieldDefs.map(f => ({
    wch: f.key === 'description' ? 50 :
         f.key.includes('Name') ? 25 :
         f.key.includes('Date') || f.key.includes('At') ? 20 :
         f.key === 'locationName' ? 40 :
         15
  }));

  // Create workbook and add worksheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Citizen Reports');

  // Generate file and trigger download
  XLSX.writeFile(wb, fileName);
}
