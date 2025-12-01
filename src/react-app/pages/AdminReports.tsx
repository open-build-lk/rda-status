import { useEffect, useState } from "react";
import { formatDistanceToNow } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface Report {
  id: string;
  reportNumber: string;
  damageType: string;
  status: string;
  latitude: number;
  longitude: number;
  description: string;
  passabilityLevel: string | null;
  anonymousName: string | null;
  anonymousEmail: string | null;
  anonymousContact: string | null;
  isVerifiedSubmitter: boolean;
  sourceType: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="w-4 h-4" />,
  verified: <CheckCircle className="w-4 h-4" />,
  in_progress: <AlertTriangle className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
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

export function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const updateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingId(reportId);
    try {
      const response = await fetch(`/api/v1/admin/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = statusFilter === "all"
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  const citizenReports = filteredReports.filter((r) => r.sourceType === "citizen");

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
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchReports} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Citizen Reports</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
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

      <p className="text-sm text-gray-500">
        Showing {citizenReports.length} citizen report{citizenReports.length !== 1 ? "s" : ""}
      </p>

      {citizenReports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No reports found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {citizenReports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">
                      {report.reportNumber}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(report.createdAt))} ago
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        statusColors[report.status] || statusColors.new
                      }`}
                    >
                      {statusIcons[report.status]}
                      {report.status.replace("_", " ")}
                    </span>
                    {report.isVerifiedSubmitter && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium">
                    {damageTypeLabels[report.damageType] || report.damageType}
                  </span>
                  {report.passabilityLevel && (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded text-sm">
                      {report.passabilityLevel}
                    </span>
                  )}
                </div>

                {report.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <a
                    href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary-600"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Map
                  </a>

                  {report.anonymousName && (
                    <span className="inline-flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {report.anonymousName}
                    </span>
                  )}

                  {report.anonymousEmail && (
                    <a
                      href={`mailto:${report.anonymousEmail}`}
                      className="inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      <Mail className="w-4 h-4" />
                      {report.anonymousEmail}
                    </a>
                  )}

                  {report.anonymousContact && (
                    <a
                      href={`tel:${report.anonymousContact}`}
                      className="inline-flex items-center gap-1 hover:text-primary-600"
                    >
                      <Phone className="w-4 h-4" />
                      {report.anonymousContact}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-sm text-gray-500">Update status:</span>
                  <Select
                    value={report.status}
                    onValueChange={(value: string) => updateStatus(report.id, value)}
                    disabled={updatingId === report.id}
                  >
                    <SelectTrigger className="w-[140px]">
                      {updatingId === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
