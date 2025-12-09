import { useState, useEffect, useCallback } from "react";
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
import { Loader2, Route, Building2, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface Organization {
  id: string;
  name: string;
  code: string;
  type: string;
  province: string | null;
  roadClasses: string | null;
}

interface RoadSuggestion {
  id: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
}

interface ClassifyReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  reportNumber: string;
  roadNumberInput: string | null;
  locationName: string | null;
  onConfirm: (data: {
    roadId?: string;
    roadClass?: string;
    assignedOrgId: string;
    reason?: string;
  }) => Promise<void>;
  onMarkUnclassifiable: () => Promise<void>;
}

const ROAD_CLASS_COLORS: Record<string, string> = {
  A: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  B: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  C: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  D: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  E: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const ROAD_CLASSES = [
  { value: "A", label: "A - National Trunk", org: "RDA" },
  { value: "B", label: "B - National Secondary", org: "RDA" },
  { value: "E", label: "E - Expressway", org: "RDA" },
  { value: "C", label: "C - Provincial Main", org: "Provincial" },
  { value: "D", label: "D - Provincial Secondary", org: "Provincial" },
];

export function ClassifyReportSheet({
  open,
  onOpenChange,
  reportId: _reportId,
  reportNumber,
  roadNumberInput,
  locationName,
  onConfirm,
  onMarkUnclassifiable,
}: ClassifyReportSheetProps) {
  void _reportId; // Reserved for future use
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [roadSearch, setRoadSearch] = useState(roadNumberInput || "");
  const [roadSuggestions, setRoadSuggestions] = useState<RoadSuggestion[]>([]);
  const [isSearchingRoads, setIsSearchingRoads] = useState(false);
  const [selectedRoad, setSelectedRoad] = useState<RoadSuggestion | null>(null);
  const [roadClass, setRoadClass] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations
  useEffect(() => {
    if (open && organizations.length === 0) {
      setIsLoadingOrgs(true);
      fetch("/api/v1/admin/organizations", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => setOrganizations(data as Organization[]))
        .catch((err) => console.error("Failed to load organizations:", err))
        .finally(() => setIsLoadingOrgs(false));
    }
  }, [open, organizations.length]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setRoadSearch(roadNumberInput || "");
      setSelectedRoad(null);
      setRoadClass("");
      setSelectedOrgId("");
      setReason("");
      setError(null);
      setRoadSuggestions([]);
    }
  }, [open, roadNumberInput]);

  // Search roads
  const searchRoads = useCallback(async (query: string) => {
    if (query.length < 1) {
      setRoadSuggestions([]);
      return;
    }
    setIsSearchingRoads(true);
    try {
      const res = await fetch(`/api/v1/roads/suggest?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        setRoadSuggestions(await res.json());
      }
    } catch (err) {
      console.error("Road search failed:", err);
    } finally {
      setIsSearchingRoads(false);
    }
  }, []);

  // Debounced road search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (roadSearch && !selectedRoad) {
        searchRoads(roadSearch);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [roadSearch, selectedRoad, searchRoads]);

  // Auto-select org based on road class
  useEffect(() => {
    if (roadClass && organizations.length > 0) {
      if (["A", "B", "E"].includes(roadClass)) {
        const rda = organizations.find((o) => o.code === "RDA");
        if (rda) setSelectedOrgId(rda.id);
      }
    }
  }, [roadClass, organizations]);

  const handleSelectRoad = (road: RoadSuggestion) => {
    setSelectedRoad(road);
    setRoadSearch(road.roadNumber);
    setRoadClass(road.roadClass);
    setRoadSuggestions([]);
  };

  const handleClearRoad = () => {
    setSelectedRoad(null);
    setRoadSearch("");
    setRoadClass("");
  };

  const handleConfirm = async () => {
    if (!selectedOrgId) {
      setError("Please select an organization");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        roadId: selectedRoad?.id,
        roadClass: roadClass || undefined,
        assignedOrgId: selectedOrgId,
        reason: reason || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to classify report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkUnclassifiable = async () => {
    setIsSubmitting(true);
    try {
      await onMarkUnclassifiable();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as unclassifiable");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter organizations based on road class
  const filteredOrgs = roadClass
    ? organizations.filter((org) => {
        if (["A", "B", "E"].includes(roadClass)) {
          return org.type === "national";
        }
        if (["C", "D"].includes(roadClass)) {
          return org.type === "provincial";
        }
        return true;
      })
    : organizations;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Classify Report
          </DrawerTitle>
          <DrawerDescription>
            {reportNumber}
            {locationName && ` - ${locationName}`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Road Number Input */}
          {roadNumberInput && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-xs text-gray-500">User entered:</span>
              <p className="font-medium">{roadNumberInput}</p>
            </div>
          )}

          {/* Road Search */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Route className="w-4 h-4" />
              Match to Road
            </Label>

            {selectedRoad ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    ROAD_CLASS_COLORS[selectedRoad.roadClass]
                  )}
                >
                  {selectedRoad.roadNumber}
                </span>
                {selectedRoad.name && (
                  <span className="text-sm flex-1 truncate">{selectedRoad.name}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearRoad}
                  className="h-7 px-2"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by road number (e.g., A1, B84)"
                  value={roadSearch}
                  onChange={(e) => setRoadSearch(e.target.value)}
                />
                {isSearchingRoads && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
                {roadSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {roadSuggestions.map((road) => (
                      <button
                        key={road.id}
                        type="button"
                        onClick={() => handleSelectRoad(road)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            ROAD_CLASS_COLORS[road.roadClass]
                          )}
                        >
                          {road.roadNumber}
                        </span>
                        {road.name && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {road.name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Road Class Manual Selection */}
          <div className="space-y-2">
            <Label>Road Class</Label>
            <Select value={roadClass} onValueChange={setRoadClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select road class" />
              </SelectTrigger>
              <SelectContent>
                {ROAD_CLASSES.map((rc) => (
                  <SelectItem key={rc.value} value={rc.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "w-5 h-5 rounded flex items-center justify-center text-xs font-medium",
                          ROAD_CLASS_COLORS[rc.value]
                        )}
                      >
                        {rc.value}
                      </span>
                      {rc.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Organization Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Assign to Organization
            </Label>
            {isLoadingOrgs ? (
              <div className="flex items-center gap-2 p-3 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading organizations...
              </div>
            ) : (
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {filteredOrgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{org.code}</span>
                        <span className="text-gray-500">{org.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {roadClass && (
              <p className="text-xs text-gray-500">
                {["A", "B", "E"].includes(roadClass)
                  ? "National roads (A/B/E) are managed by RDA"
                  : "Provincial roads (C/D) are managed by Provincial Road Authorities"}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Why this classification was chosen..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DrawerFooter className="border-t space-y-2">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DrawerClose>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedOrgId}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Classify
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full text-gray-500"
            onClick={handleMarkUnclassifiable}
            disabled={isSubmitting}
          >
            Mark as Unclassifiable
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
