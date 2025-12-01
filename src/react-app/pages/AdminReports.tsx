import { useEffect, useState, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  User,
  Mail,
  Phone,
  Calendar,
  Image as ImageIcon,
} from "lucide-react";

interface MediaAttachment {
  id: string;
  reportId: string;
  mediaType: string;
  storageKey: string;
  originalFilename: string | null;
  fileSize: number | null;
  capturedLat: number | null;
  capturedLng: number | null;
  createdAt: string;
}

interface Report {
  id: string;
  reportNumber: string;
  damageType: string;
  severity: number;
  status: string;
  latitude: number;
  longitude: number;
  description: string;
  passabilityLevel: string | null;
  anonymousName: string | null;
  anonymousEmail: string | null;
  anonymousContact: string | null;
  isVerifiedSubmitter: boolean | number;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportWithMedia extends Report {
  media: MediaAttachment[];
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
  { value: "", label: "Not specified" },
  { value: "3wheeler", label: "3-Wheeler" },
  { value: "car", label: "Car" },
  { value: "truck", label: "Truck" },
  { value: "impassable", label: "Impassable" },
];

const columnHelper = createColumnHelper<Report>();

export function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);

  // Drawer state for viewing report details
  const [selectedReport, setSelectedReport] = useState<ReportWithMedia | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReportDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/v1/admin/reports/${id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch report details");
      }
      const data = (await response.json()) as ReportWithMedia;
      setSelectedReport(data);
      setDrawerOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load report details");
    } finally {
      setLoadingDetails(false);
    }
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
    try {
      await updateReport(id, { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    setSaving(true);
    try {
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
          return (
            <Select
              value={status}
              onValueChange={(value: string) =>
                handleQuickStatusChange(info.row.original.id, value)
              }
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                    statusColors[status] || statusColors.new
                  }`}
                >
                  {statusIcons[status]}
                  {status.replace("_", " ")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          );
        },
        filterFn: (row, id, value) => {
          if (value === "all") return true;
          return row.getValue(id) === value;
        },
      }),
      columnHelper.accessor("passabilityLevel", {
        header: "Passability",
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm">{value}</span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-sm line-clamp-2 max-w-[200px]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("sourceType", {
        header: "Source",
        cell: (info) => (
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("latitude", {
        header: "Location",
        cell: (info) => (
          <a
            href={`https://www.google.com/maps?q=${info.getValue()},${info.row.original.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm"
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
            onClick={() => setEditingReport({ ...info.row.original })}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: reports,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">All Reports</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-[200px]"
          />
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) || "all"}
            onValueChange={(value: string) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchReports} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Showing {table.getRowModel().rows.length} of {reports.length} reports
      </div>

      {/* Table */}
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
                  onClick={() => fetchReportDetails(row.original.id)}
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
          Page {table.getState().pagination.pageIndex + 1} of{" "}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report: {editingReport?.reportNumber}</DialogTitle>
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
                    value={editingReport.passabilityLevel || ""}
                    onValueChange={(value: string) =>
                      setEditingReport({
                        ...editingReport,
                        passabilityLevel: value || null,
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

      {/* Report Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-xl">
                  Report: {selectedReport?.reportNumber}
                </DrawerTitle>
                <DrawerDescription>
                  Submitted {selectedReport?.createdAt && formatDistanceToNow(new Date(selectedReport.createdAt))} ago
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedReport && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      statusColors[selectedReport.status] || statusColors.new
                    }`}
                  >
                    {statusIcons[selectedReport.status]}
                    {selectedReport.status.replace("_", " ")}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedReport) {
                      setEditingReport({ ...selectedReport });
                      setDrawerOpen(false);
                    }
                  }}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </DrawerHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : selectedReport ? (
            <div className="overflow-y-auto p-4 space-y-6">
              {/* Images Section */}
              {selectedReport.media && selectedReport.media.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Photos ({selectedReport.media.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedReport.media.map((m) => (
                      <a
                        key={m.id}
                        href={`/api/v1/media/${m.storageKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={`/api/v1/media/${m.storageKey}`}
                          alt={m.originalFilename || "Report image"}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Report Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Incident Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 border-b pb-2">Incident Details</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Damage Type</Label>
                      <p className="font-medium">
                        {damageTypeLabels[selectedReport.damageType] || selectedReport.damageType}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Severity</Label>
                      <p className="font-medium">
                        <span className={
                          selectedReport.severity >= 4 ? "text-red-600" :
                          selectedReport.severity >= 3 ? "text-orange-600" :
                          selectedReport.severity >= 2 ? "text-yellow-600" :
                          "text-green-600"
                        }>
                          {selectedReport.severity}/5
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Passability</Label>
                      <p className="font-medium">
                        {selectedReport.passabilityLevel || "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Source</Label>
                      <p className="font-medium capitalize">
                        {selectedReport.sourceType.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Description</Label>
                    <p className="text-sm mt-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      {selectedReport.description || "No description provided"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Location</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono">
                        {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline inline-flex items-center gap-1 text-sm"
                      >
                        <MapPin className="w-3 h-3" />
                        View on Map
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right Column - Reporter Info & Timestamps */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 border-b pb-2">Reporter Information</h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <p className="font-medium">{selectedReport.anonymousName || "Anonymous"}</p>
                      </div>
                    </div>

                    {selectedReport.anonymousEmail && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Email</Label>
                          <p className="font-medium">{selectedReport.anonymousEmail}</p>
                        </div>
                      </div>
                    )}

                    {selectedReport.anonymousContact && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Contact</Label>
                          <p className="font-medium">{selectedReport.anonymousContact}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        selectedReport.isVerifiedSubmitter
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {selectedReport.isVerifiedSubmitter ? "Verified Submitter" : "Unverified"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">Timestamps</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Created: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Updated: {new Date(selectedReport.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DrawerFooter className="border-t">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
