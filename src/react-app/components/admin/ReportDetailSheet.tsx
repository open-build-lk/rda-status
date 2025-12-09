import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Loader2,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Save,
  History,
  Building2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import clsx from "clsx";
import { AuditTimeline } from "./AuditTimeline";
import { RoadNumberInput, type SelectedRoad } from "@/components/forms/RoadNumberInput";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import {
  provinces,
  getDistrictsForProvince,
} from "@/data/sriLankaLocations";

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

interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  province: string | null;
}

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
  // Additional incident details
  isSingleLane: boolean | number | null;
  needsSafetyBarriers: boolean | number | null;
  blockedDistanceMeters: number | null;
  // Submitter info from user table (via FK)
  submitterId: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  submitterPhone: string | null;
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
  roadNumberInput: string | null;
  roadClass: string | null;
  classificationStatus: string | null;
  assignedOrgId: string | null;
  assignedOrgName: string | null;
  assignedOrgCode: string | null;
}

interface AuditEntry {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  performedBy: string | null;
  performerName: string | null;
  reason: string | null;
  createdAt: string;
}

interface ReportWithMedia extends Report {
  media: MediaAttachment[];
  auditTrail: AuditEntry[];
}

interface ReportDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string | null;
  onUpdate: (report: Report) => void;
}

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

const severityLabels: Record<number, string> = {
  1: "Minor",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
};

export function ReportDetailSheet({
  open,
  onOpenChange,
  reportId,
  onUpdate,
}: ReportDetailSheetProps) {
  const [report, setReport] = useState<ReportWithMedia | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Form state - mirror of report for editing
  const [formData, setFormData] = useState<Partial<Report>>({});

  // Organizations for assignment
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [editAssignedOrgId, setEditAssignedOrgId] = useState<string>("");

  // Location edit state
  const [editProvince, setEditProvince] = useState<string>("");
  const [editDistrict, setEditDistrict] = useState<string>("");
  const [editLocationName, setEditLocationName] = useState<string>("");
  const [editRoadNumberInput, setEditRoadNumberInput] = useState<string>("");
  const [editSelectedRoad, setEditSelectedRoad] = useState<SelectedRoad | null>(null);

  const fetchReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/reports/${reportId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = (await response.json()) as ReportWithMedia;
      setReport(data);
      setFormData({
        status: data.status,
        damageType: data.damageType,
        severity: data.severity,
        passabilityLevel: data.passabilityLevel,
        description: data.description,
        workflowData: data.workflowData,
        isSingleLane: data.isSingleLane,
        needsSafetyBarriers: data.needsSafetyBarriers,
        blockedDistanceMeters: data.blockedDistanceMeters,
      });
      setHasChanges(false);
      setImageIndex(0);
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (open && reportId) {
      fetchReport();
    }
  }, [open, reportId, fetchReport]);

  // Fetch organizations when sheet opens
  useEffect(() => {
    if (open && organizations.length === 0) {
      fetch("/api/v1/admin/organizations", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setOrganizations(data as Organization[]))
        .catch((err) => console.error("Failed to load organizations:", err));
    }
  }, [open, organizations.length]);

  // Reset location form when report changes
  useEffect(() => {
    if (report) {
      setEditLocationName(report.locationName || "");
      setEditRoadNumberInput(report.roadNumberInput || "");
      setEditAssignedOrgId(report.assignedOrgId || "");
      // Get province/district from workflowData JSON
      let province = "";
      let district = "";
      if (report.workflowData) {
        try {
          const workflow = JSON.parse(report.workflowData);
          province = workflow.province || "";
          district = workflow.district || "";
        } catch {
          // Ignore parse errors
        }
      }
      setEditProvince(province);
      setEditDistrict(district);
      // If the report has road info, construct the selected road object
      if (report.roadNumberInput && report.roadClass) {
        setEditSelectedRoad({
          id: "", // We don't have the road ID from the report
          roadNumber: report.roadNumberInput,
          roadClass: report.roadClass,
          name: null,
        });
      } else {
        setEditSelectedRoad(null);
      }
    }
  }, [report]);

  const updateField = <K extends keyof Report>(field: K, value: Report[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateWorkflowField = (field: string, value: unknown) => {
    const workflow = formData.workflowData
      ? JSON.parse(formData.workflowData)
      : {};
    setFormData((prev) => ({
      ...prev,
      workflowData: JSON.stringify({ ...workflow, [field]: value }),
    }));
    setHasChanges(true);
  };

  const getWorkflowValue = (field: string, defaultValue: unknown = null) => {
    if (!formData.workflowData) return defaultValue;
    try {
      const workflow = JSON.parse(formData.workflowData);
      return workflow[field] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      // Build workflowData with province/district included
      const existingWorkflow = formData.workflowData
        ? JSON.parse(formData.workflowData)
        : {};
      const workflowWithLocation = {
        ...existingWorkflow,
        province: editProvince || null,
        district: editDistrict || null,
      };

      const saveData = {
        ...formData,
        workflowData: workflowWithLocation,
        locationName: editLocationName || null,
        roadNumberInput: editRoadNumberInput || null,
        roadClass: editSelectedRoad?.roadClass || null,
        assignedOrgId: editAssignedOrgId || null,
      };
      const response = await fetch(`/api/v1/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save");
      const result = (await response.json()) as { success: boolean; report: Report };
      onUpdate(result.report);
      setHasChanges(false);
      // Refetch to get updated audit trail
      await fetchReport();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const media = report?.media || [];
  const hasMultipleImages = media.length > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <SheetTitle className="sr-only">Loading Report Details</SheetTitle>
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : report ? (
          <>
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl">
                    {report.reportNumber}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Submitted {formatDistanceToNow(new Date(report.createdAt))} ago
                  </SheetDescription>
                </div>
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="shrink-0"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1.5" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Hero image */}
              {media.length > 0 && (
                <div className="relative bg-black">
                  <img
                    src={`/api/v1/upload/photo/${media[imageIndex].storageKey}`}
                    alt=""
                    className="w-full h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxOpen(true)}
                  />
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={() =>
                          setImageIndex((i) => (i > 0 ? i - 1 : media.length - 1))
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setImageIndex((i) => (i < media.length - 1 ? i + 1 : 0))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {media.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setImageIndex(i)}
                            className={clsx(
                              "w-2 h-2 rounded-full transition-colors",
                              i === imageIndex
                                ? "bg-white"
                                : "bg-white/50 hover:bg-white/70"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {/* Image counter */}
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {imageIndex + 1} / {media.length}
                  </div>
                </div>
              )}

              {/* Fullscreen Image Lightbox */}
              <ImageLightbox
                images={media.map((m) => ({
                  url: `/api/v1/upload/photo/${m.storageKey}`,
                  alt: m.originalFilename || undefined,
                }))}
                initialIndex={imageIndex}
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
              />

              <div className="p-6 space-y-6">
                {/* Status & Classification */}
                <div className="flex items-center gap-4">
                  <Select
                    value={formData.status || report.status}
                    onValueChange={(value) => updateField("status", value)}
                  >
                    <SelectTrigger className="w-auto h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>span]:line-clamp-none [&>svg]:shrink-0">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap",
                          statusColors[formData.status || report.status]
                        )}
                      >
                        {statusIcons[formData.status || report.status]}
                        <span className="capitalize">{(formData.status || report.status).replace("_", " ")}</span>
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

                  {report.roadNumberInput && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-sm font-medium whitespace-nowrap">
                      {report.roadNumberInput}
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {report.locationName && (
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {report.locationName}
                        </p>
                      )}
                      {(() => {
                        // Get province/district - prefer FK-joined names, fall back to workflowData
                        let provinceName = report.provinceName;
                        let districtName = report.districtName;
                        if (!provinceName || !districtName) {
                          // Try to get from workflowData
                          if (report.workflowData) {
                            try {
                              const workflow = JSON.parse(report.workflowData);
                              if (workflow.province && !provinceName) {
                                const prov = provinces.find(p => p.id === workflow.province);
                                provinceName = prov?.name || workflow.province;
                              }
                              if (workflow.district && !districtName) {
                                const prov = provinces.find(p => p.id === workflow.province);
                                const dist = prov?.districts.find(d => d.id === workflow.district);
                                districtName = dist?.name || workflow.district;
                              }
                            } catch {
                              // Ignore parse errors
                            }
                          }
                        }
                        return (provinceName || districtName) ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {[districtName, provinceName].filter(Boolean).join(", ")}
                          </p>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-mono text-gray-500">
                          {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline inline-flex items-center gap-1 text-xs"
                        >
                          Open in Maps <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Edit Section - Always visible */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Location Details
                  </h3>

                  {/* Province and District */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province">Province</Label>
                      <Select
                        value={editProvince}
                        onValueChange={(value) => {
                          setEditProvince(value);
                          setEditDistrict(""); // Reset district when province changes
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="province">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Select
                        value={editDistrict}
                        onValueChange={(value) => {
                          setEditDistrict(value);
                          setHasChanges(true);
                        }}
                        disabled={!editProvince}
                      >
                        <SelectTrigger id="district">
                          <SelectValue placeholder={editProvince ? "Select district" : "Select province first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {editProvince &&
                            getDistrictsForProvince(editProvince).map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Road Number Input */}
                  <RoadNumberInput
                    value={editRoadNumberInput}
                    selectedRoad={editSelectedRoad}
                    onChange={(value) => {
                      setEditRoadNumberInput(value);
                      setHasChanges(true);
                    }}
                    onRoadSelect={(road) => {
                      setEditSelectedRoad(road);
                      setHasChanges(true);
                    }}
                  />

                  {/* Location Name */}
                  <div className="space-y-2">
                    <Label htmlFor="locationName">Road / Location Name</Label>
                    <Input
                      id="locationName"
                      placeholder="e.g., Kandy Road near Town Hall"
                      value={editLocationName}
                      onChange={(e) => {
                        setEditLocationName(e.target.value);
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>

                {/* Organization Assignment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Organization Assignment
                  </h3>

                  <div className="space-y-2">
                    <Label>Assigned Organization</Label>
                    <Select
                      value={editAssignedOrgId}
                      onValueChange={(value) => {
                        setEditAssignedOrgId(value === "unassigned" ? "" : value);
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-gray-500">Not assigned</span>
                        </SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{org.code}</span>
                              <span className="text-gray-500">{org.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {report.assignedOrgName && editAssignedOrgId === report.assignedOrgId && (
                      <p className="text-xs text-gray-500">
                        Currently: {report.assignedOrgCode} - {report.assignedOrgName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Incident Details - Editable */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Incident Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Damage Type</Label>
                      <Select
                        value={formData.damageType || report.damageType}
                        onValueChange={(value) => updateField("damageType", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(damageTypeLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Severity</Label>
                      <Select
                        value={String(formData.severity ?? report.severity)}
                        onValueChange={(value) =>
                          updateField("severity", parseInt(value))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} - {severityLabels[n]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Passability</Label>
                    <Select
                      value={formData.passabilityLevel || "unspecified"}
                      onValueChange={(value) =>
                        updateField(
                          "passabilityLevel",
                          value === "unspecified" ? null : value
                        )
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
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

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Description</Label>
                    <Textarea
                      value={formData.description ?? report.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      className="resize-none"
                      placeholder="Add description..."
                    />
                  </div>

                  {/* Additional incident details */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isSingleLane"
                        checked={Boolean(formData.isSingleLane ?? report.isSingleLane)}
                        onChange={(e) => updateField("isSingleLane", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isSingleLane" className="text-sm font-normal cursor-pointer">
                        Single lane traffic possible
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="needsSafetyBarriers"
                        checked={Boolean(formData.needsSafetyBarriers ?? report.needsSafetyBarriers)}
                        onChange={(e) => updateField("needsSafetyBarriers", e.target.checked)}
                        className="h-4 w-4 mt-0.5 rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor="needsSafetyBarriers" className="text-sm font-normal cursor-pointer">
                          Needs safety barriers
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Road is carefully usable but requires barriers
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Blocked Distance (meters)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.blockedDistanceMeters ?? report.blockedDistanceMeters ?? ""}
                        onChange={(e) =>
                          updateField(
                            "blockedDistanceMeters",
                            e.target.value === "" ? null : parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9"
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Progress */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Work Progress
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Progress %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={getWorkflowValue("progressPercent", "") as string}
                        onChange={(e) =>
                          updateWorkflowField(
                            "progressPercent",
                            e.target.value === ""
                              ? 0
                              : Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="h-9"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Est. Cost (LKR)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={getWorkflowValue("estimatedCostLkr", "") as string}
                        onChange={(e) =>
                          updateWorkflowField(
                            "estimatedCostLkr",
                            e.target.value === "" ? null : parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9"
                        placeholder="e.g. 1500000"
                      />
                    </div>
                  </div>
                </div>

                {/* Reporter Information - Read-only from user table */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Reporter
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {report.submitterName || "Anonymous"}
                        </p>
                      </div>
                    </div>

                    {report.submitterEmail && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 shrink-0">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {report.submitterEmail}
                          </p>
                        </div>
                      </div>
                    )}

                    {report.submitterPhone && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 shrink-0">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {report.submitterPhone}
                          </p>
                        </div>
                      </div>
                    )}

                    {Boolean(report.isVerifiedSubmitter) && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3" />
                          Verified Submitter
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity / Audit Trail */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Activity
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <AuditTimeline
                      entries={report.auditTrail || []}
                      reportCreatedAt={report.createdAt}
                      reporterName={report.submitterName}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created: {new Date(report.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Updated: {new Date(report.updatedAt).toLocaleString()}
                  </div>
                  <div className="text-xs">
                    Source: <span className="capitalize">{report.sourceType.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer with save button */}
            {hasChanges && (
              <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between gap-4">
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  You have unsaved changes
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (report) {
                        setFormData({
                          status: report.status,
                          damageType: report.damageType,
                          severity: report.severity,
                          passabilityLevel: report.passabilityLevel,
                          description: report.description,
                          workflowData: report.workflowData,
                          isSingleLane: report.isSingleLane,
                          needsSafetyBarriers: report.needsSafetyBarriers,
                          blockedDistanceMeters: report.blockedDistanceMeters,
                        });
                        setHasChanges(false);
                      }
                    }}
                  >
                    Discard
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <SheetTitle className="sr-only">Report Details</SheetTitle>
            Select a report to view details
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
