import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReportDetailSheet } from "@/components/admin/ReportDetailSheet";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Loader2,
  RefreshCw,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Check,
  X,
  Building2,
  Download,
} from "lucide-react";
import { ReportCard } from "@/components/admin/ReportCard";
import { RejectReasonSheet } from "@/components/admin/RejectReasonSheet";
import { UpdateProgressSheet } from "@/components/admin/UpdateProgressSheet";
import { ClassifyReportSheet } from "@/components/admin/ClassifyReportSheet";
import { StatusSummary } from "@/components/admin/StatusSummary";
import { ExportReportsDialog } from "@/components/admin/ExportReportsDialog";
import { provinces } from "@/data/sriLankaLocations";
import { useAuthStore } from "@/stores/auth";

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
  // Legacy anonymous fields (deprecated)
  anonymousName?: string | null;
  anonymousEmail?: string | null;
  anonymousContact?: string | null;
  // New submitter fields from user table
  submitterId?: string | null;
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterPhone?: string | null;
  isVerifiedSubmitter: boolean | number;
  sourceType: string;
  workflowData: string | null; // JSON string
  createdAt: string;
  updatedAt: string;
  provinceId: string | null;
  districtId: string | null;
  provinceName: string | null;
  districtName: string | null;
  roadLocation: string | null;
  mediaCount?: number;
  // Classification fields
  roadNumberInput: string | null;
  roadClass: string | null;
  classificationStatus: string | null;
  assignedOrgId: string | null;
  assignedOrgName?: string | null;
  assignedOrgCode?: string | null;
  // Manual location flag
  locationPickedManually?: boolean | number | null;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  province: string | null;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="w-3 h-3" />,
  verified: <CheckCircle className="w-3 h-3" />,
  in_progress: <AlertTriangle className="w-3 h-3" />,
  resolved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const damageTypeLabels: Record<string, string> = {
  tree_fall: "Tree Fall",
  bridge_collapse: "Bridge Collapse",
  landslide: "Landslide",
  flooding: "Flooding",
  road_breakage: "Road Breakage",
  washout: "Washout",
  collapse: "Collapse",
  blockage: "Blockage",
  other: "Other",
};

const passabilityOptions = [
  { value: "unspecified", label: "Not specified" },
  { value: "unpassable", label: "Unpassable" },
  { value: "foot", label: "Foot only" },
  { value: "bike", label: "Bike" },
  { value: "3wheeler", label: "3-Wheeler" },
  { value: "car", label: "Car" },
  { value: "bus", label: "Bus" },
  { value: "truck", label: "Truck" },
];

const columnHelper = createColumnHelper<Report>();

export function AdminReports() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userRole = user?.role || "citizen";
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);

  // View mode: cards (mobile) or table (desktop)
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    // Default to cards on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "cards";
    }
    return localStorage.getItem("adminReportsView") as "cards" | "table" || "cards";
  });

  // District filter
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Rejection sheet
  const [rejectingReport, setRejectingReport] = useState<Report | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  // Progress update sheet
  const [progressReport, setProgressReport] = useState<Report | null>(null);

  // Organization filter
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // Sheet state for viewing report details
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Classify sheet state
  const [classifyingReport, setClassifyingReport] = useState<Report | null>(null);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Save view preference
  useEffect(() => {
    localStorage.setItem("adminReportsView", viewMode);
  }, [viewMode]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/admin/reports", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = (await response.json()) as Report[];
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/v1/admin/organizations", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as Organization[];
        setOrganizations(data);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchOrganizations();
  }, []);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { new: 0, verified: 0, in_progress: 0, resolved: 0, rejected: 0 };
    const filteredByLocation = reports.filter((r) => {
      if (selectedProvince && r.provinceName?.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false;
      }
      if (selectedDistrict && r.districtName?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedOrgId && r.assignedOrgId !== selectedOrgId) {
        return false;
      }
      return true;
    });
    filteredByLocation.forEach((r) => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [reports, selectedProvince, selectedDistrict, selectedOrgId]);

  // Filter reports for card view
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Province filter
      if (selectedProvince && r.provinceName?.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false;
      }
      // District filter
      if (selectedDistrict && r.districtName?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      // Status filter
      if (selectedStatus && r.status !== selectedStatus) {
        return false;
      }
      // Organization filter
      if (selectedOrgId && r.assignedOrgId !== selectedOrgId) {
        return false;
      }
      // Global search
      if (globalFilter) {
        const search = globalFilter.toLowerCase();
        return (
          r.reportNumber.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search) ||
          r.damageType.toLowerCase().includes(search) ||
          r.locationName?.toLowerCase().includes(search) ||
          r.roadLocation?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [reports, selectedProvince, selectedDistrict, selectedStatus, selectedOrgId, globalFilter]);

  // Get districts for selected province
  const availableDistricts = useMemo(() => {
    if (!selectedProvince) return [];
    const province = provinces.find(
      (p) => p.name.toLowerCase() === selectedProvince.toLowerCase()
    );
    return province?.districts || [];
  }, [selectedProvince]);

  const openReportSheet = (id: string) => {
    setSelectedReportId(id);
    setSheetOpen(true);
  };

  const handleReportUpdate = (updated: Report) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
  };

  const updateReport = async (id: string, updates: Partial<Report>) => {
    const response = await fetch(`/api/v1/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to update report");
    }
    return response.json();
  };

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    setUpdatingReportId(id);
    try {
      await updateReport(id, { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleVerify = (id: string) => handleQuickStatusChange(id, "verified");
  const handleMarkInProgress = (id: string) => handleQuickStatusChange(id, "in_progress");
  const handleResolve = (id: string) => handleQuickStatusChange(id, "resolved");
  const handleReopen = (id: string) => handleQuickStatusChange(id, "new");

  const handleReject = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      setRejectingReport(report);
    }
  };

  const handleConfirmReject = async (_reason: string) => {
    void _reason; // Will be used when stateTransitions storage is implemented
    if (!rejectingReport) return;
    setUpdatingReportId(rejectingReport.id);
    try {
      // TODO: Store rejection reason in stateTransitions
      await updateReport(rejectingReport.id, { status: "rejected" });
      setReports((prev) =>
        prev.map((r) => (r.id === rejectingReport.id ? { ...r, status: "rejected" } : r))
      );
      setRejectingReport(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject");
      throw err; // Re-throw so the sheet knows it failed
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleUpdateProgress = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      setProgressReport(report);
    }
  };

  const handleConfirmProgress = async (progress: number, cost: number | null) => {
    if (!progressReport) return;
    setUpdatingReportId(progressReport.id);
    try {
      const workflowData = { progressPercent: progress, estimatedCostLkr: cost };
      // API expects workflowData as object, use direct fetch
      const response = await fetch(`/api/v1/admin/reports/${progressReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workflowData }),
      });
      if (!response.ok) {
        const errData = await response.json() as { error?: string };
        throw new Error(errData.error || "Failed to update progress");
      }
      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === progressReport.id
            ? { ...r, workflowData: JSON.stringify(workflowData) }
            : r
        )
      );
      setProgressReport(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update progress");
      throw err;
    } finally {
      setUpdatingReportId(null);
    }
  };

  // Classification handlers
  const handleClassify = (id: string) => {
    const report = reports.find((r) => r.id === id);
    if (report) {
      setClassifyingReport(report);
    }
  };

  const handleConfirmClassify = async (data: {
    roadId?: string;
    roadClass?: string;
    assignedOrgId: string;
    reason?: string;
  }) => {
    if (!classifyingReport) return;
    setUpdatingReportId(classifyingReport.id);
    try {
      const response = await fetch(`/api/v1/admin/reports/${classifyingReport.id}/classify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errData = await response.json() as { error?: string };
        throw new Error(errData.error || "Failed to classify report");
      }
      const result = await response.json() as { report: Report };
      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === classifyingReport.id ? { ...r, ...result.report } : r))
      );
      setClassifyingReport(null);
    } catch (err) {
      throw err; // Re-throw so the sheet knows it failed
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleMarkUnclassifiable = async () => {
    if (!classifyingReport) return;
    setUpdatingReportId(classifyingReport.id);
    try {
      const response = await fetch(`/api/v1/admin/reports/${classifyingReport.id}/unclassifiable`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        const errData = await response.json() as { error?: string };
        throw new Error(errData.error || "Failed to mark as unclassifiable");
      }
      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === classifyingReport.id
            ? { ...r, classificationStatus: "unclassifiable" }
            : r
        )
      );
      setClassifyingReport(null);
    } catch (err) {
      throw err;
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    setSaving(true);
    try {
      // Parse workflowData if it's a string (API expects object)
      const workflowData = editingReport.workflowData
        ? JSON.parse(editingReport.workflowData)
        : undefined;

      await updateReport(editingReport.id, {
        status: editingReport.status,
        damageType: editingReport.damageType,
        severity: editingReport.severity,
        description: editingReport.description,
        passabilityLevel: editingReport.passabilityLevel,
        anonymousName: editingReport.anonymousName,
        anonymousEmail: editingReport.anonymousEmail,
        anonymousContact: editingReport.anonymousContact,
        isVerifiedSubmitter: Boolean(editingReport.isVerifiedSubmitter),
        workflowData,
      });
      setReports((prev) =>
        prev.map((r) => (r.id === editingReport.id ? editingReport : r))
      );
      setEditingReport(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("reportNumber", {
        header: "Report #",
        cell: (info) => (
          <span className="font-mono text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("damageType", {
        header: "Type",
        cell: (info) => (
          <span className="text-sm">
            {damageTypeLabels[info.getValue()] || info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("severity", {
        header: "Severity",
        cell: (info) => {
          const severity = info.getValue();
          const colors = [
            "",
            "text-green-600",
            "text-lime-600",
            "text-yellow-600",
            "text-orange-600",
            "text-red-600",
          ];
          return (
            <span className={`font-medium ${colors[severity] || ""}`}>
              {severity}/5
            </span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const reportId = info.row.original.id;
          return (
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                  statusColors[status] || statusColors.new
                }`}
              >
                {statusIcons[status]}
                {status.replace("_", " ")}
              </span>
              {status === "new" && (
                <div className="flex gap-0.5 ml-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerify(reportId);
                    }}
                    disabled={updatingReportId === reportId}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReject(reportId);
                    }}
                    disabled={updatingReportId === reportId}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (value === "all") return true;
          return row.getValue(id) === value;
        },
      }),
      columnHelper.accessor("districtName", {
        header: "District",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm">{value}</span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          );
        },
      }),
      columnHelper.accessor("roadLocation", {
        header: "Location",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm max-w-[150px] truncate block" title={value}>
              {value}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          );
        },
      }),
      columnHelper.accessor("latitude", {
        header: "Map",
        cell: (info) => (
          <a
            href={`https://www.google.com/maps?q=${info.getValue()},${info.row.original.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="w-3 h-3" />
            View
          </a>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(info.getValue()))} ago
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingReport({ ...info.row.original });
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        ),
      }),
    ],
    [updatingReportId]
  );

  const table = useReactTable({
    data: filteredReports,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={fetchReports} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("admin.citizenReports")}</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden sm:flex items-center border rounded-lg p-0.5">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("table")}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={fetchReports} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-1">
            {/* Province filter */}
            <Select
              value={selectedProvince}
              onValueChange={(value) => {
                setSelectedProvince(value === "all" ? "" : value);
                setSelectedDistrict("");
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("admin.province")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allProvinces")}</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* District filter */}
            {selectedProvince && (
              <Select
                value={selectedDistrict}
                onValueChange={(value) => setSelectedDistrict(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("admin.district")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allDistricts")}</SelectItem>
                  {availableDistricts.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Organization filter */}
            {organizations.length > 0 && (
              <Select
                value={selectedOrgId}
                onValueChange={(value) => setSelectedOrgId(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[140px]">
                  <Building2 className="w-4 h-4 mr-1 opacity-50" />
                  <SelectValue placeholder={t("admin.organization")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allOrganizations")}</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <Input
              placeholder={t("admin.search")}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="flex-1 max-w-[200px]"
            />
          </div>

          {/* Export button - pushed to right */}
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={reports.length === 0}
            className="ml-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Status summary */}
        <StatusSummary
          counts={statusCounts}
          selectedStatus={selectedStatus}
          onStatusClick={setSelectedStatus}
        />
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        {t("admin.showingReports", { filtered: filteredReports.length, total: reports.length })}
      </div>

      {/* Card View (Mobile-first) */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              userRole={userRole}
              onVerify={handleVerify}
              onReject={handleReject}
              onMarkInProgress={handleMarkInProgress}
              onResolve={handleResolve}
              onReopen={handleReopen}
              onUpdateProgress={handleUpdateProgress}
              onViewDetails={openReportSheet}
              onClassify={handleClassify}
              isUpdating={updatingReportId === report.id}
            />
          ))}
          {filteredReports.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              {t("admin.noReportsFound")}
            </div>
          )}
        </div>
      )}

      {/* Table View (Desktop) */}
      {viewMode === "table" && (
        <>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={
                                header.column.getCanSort()
                                  ? "flex items-center gap-1 cursor-pointer select-none hover:text-gray-700"
                                  : ""
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <span className="text-gray-400">
                                  {{
                                    asc: <ChevronUp className="w-4 h-4" />,
                                    desc: <ChevronDown className="w-4 h-4" />,
                                  }[header.column.getIsSorted() as string] ?? (
                                    <ChevronsUpDown className="w-4 h-4" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => openReportSheet(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 whitespace-nowrap"
                          onClick={(e) => {
                            // Prevent row click when clicking on interactive elements
                            if ((e.target as HTMLElement).closest('button, select, a')) {
                              e.stopPropagation();
                            }
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t("admin.page")} {table.getState().pagination.pageIndex + 1} {t("admin.of")}{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Rejection Reason Sheet */}
      <RejectReasonSheet
        open={!!rejectingReport}
        onOpenChange={(open) => !open && setRejectingReport(null)}
        reportNumber={rejectingReport?.reportNumber || ""}
        onConfirmReject={handleConfirmReject}
      />

      {/* Update Progress Sheet */}
      <UpdateProgressSheet
        open={!!progressReport}
        onOpenChange={(open) => !open && setProgressReport(null)}
        reportNumber={progressReport?.reportNumber || ""}
        currentProgress={(() => {
          if (!progressReport?.workflowData) return 0;
          const workflow = JSON.parse(progressReport.workflowData);
          return workflow.progressPercent ?? 0;
        })()}
        currentCost={(() => {
          if (!progressReport?.workflowData) return null;
          const workflow = JSON.parse(progressReport.workflowData);
          return workflow.estimatedCostLkr ?? null;
        })()}
        onConfirm={handleConfirmProgress}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report: {editingReport?.reportNumber}</DialogTitle>
            <DialogDescription>
              Update the report details below. Changes will be saved when you click Save.
            </DialogDescription>
          </DialogHeader>
          {editingReport && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingReport.status}
                    onValueChange={(value: string) =>
                      setEditingReport({ ...editingReport, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Damage Type</Label>
                  <Select
                    value={editingReport.damageType}
                    onValueChange={(value: string) =>
                      setEditingReport({ ...editingReport, damageType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(damageTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity (1-5)</Label>
                  <Select
                    value={String(editingReport.severity)}
                    onValueChange={(value: string) =>
                      setEditingReport({
                        ...editingReport,
                        severity: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Minor</SelectItem>
                      <SelectItem value="2">2 - Low</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - High</SelectItem>
                      <SelectItem value="5">5 - Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Passability Level</Label>
                  <Select
                    value={editingReport.passabilityLevel || "unspecified"}
                    onValueChange={(value: string) =>
                      setEditingReport({
                        ...editingReport,
                        passabilityLevel: value === "unspecified" ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {passabilityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingReport.description}
                  onChange={(e) =>
                    setEditingReport({
                      ...editingReport,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Work Progress</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Progress (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={(() => {
                        const workflow = editingReport.workflowData
                          ? JSON.parse(editingReport.workflowData)
                          : {};
                        return workflow.progressPercent ?? "";
                      })()}
                      onChange={(e) => {
                        const workflow = editingReport.workflowData
                          ? JSON.parse(editingReport.workflowData)
                          : {};
                        const value = e.target.value === "" ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setEditingReport({
                          ...editingReport,
                          workflowData: JSON.stringify({
                            ...workflow,
                            progressPercent: value,
                          }),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Est. Cost (LKR)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 1500000"
                      value={(() => {
                        const workflow = editingReport.workflowData
                          ? JSON.parse(editingReport.workflowData)
                          : {};
                        return workflow.estimatedCostLkr ?? "";
                      })()}
                      onChange={(e) => {
                        const workflow = editingReport.workflowData
                          ? JSON.parse(editingReport.workflowData)
                          : {};
                        const value = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0);
                        setEditingReport({
                          ...editingReport,
                          workflowData: JSON.stringify({
                            ...workflow,
                            estimatedCostLkr: value,
                          }),
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Reporter Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editingReport.anonymousName || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          anonymousName: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingReport.anonymousEmail || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          anonymousEmail: e.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input
                      value={editingReport.anonymousContact || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          anonymousContact: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Verified Submitter</Label>
                    <Select
                      value={editingReport.isVerifiedSubmitter ? "true" : "false"}
                      onValueChange={(value: string) =>
                        setEditingReport({
                          ...editingReport,
                          isVerifiedSubmitter: value === "true",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-2 text-sm text-gray-500">
                <div className="flex gap-4">
                  <span>Lat: {editingReport.latitude.toFixed(6)}</span>
                  <span>Lng: {editingReport.longitude.toFixed(6)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${editingReport.latitude},${editingReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    View on Map
                  </a>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingReport(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Details Sheet */}
      <ReportDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        reportId={selectedReportId}
        onUpdate={handleReportUpdate}
      />

      {/* Classify Report Sheet */}
      {classifyingReport && (
        <ClassifyReportSheet
          open={!!classifyingReport}
          onOpenChange={(open) => !open && setClassifyingReport(null)}
          reportId={classifyingReport.id}
          reportNumber={classifyingReport.reportNumber}
          roadNumberInput={classifyingReport.roadNumberInput}
          locationName={classifyingReport.locationName}
          onConfirm={handleConfirmClassify}
          onMarkUnclassifiable={handleMarkUnclassifiable}
        />
      )}

      {/* Export Reports Dialog */}
      <ExportReportsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reports={reports}
        filteredReports={filteredReports}
        table={table}
        currentFilters={{
          province: selectedProvince,
          district: selectedDistrict,
          status: selectedStatus || undefined,
          organization: selectedOrgId,
        }}
      />
    </div>
  );
}
