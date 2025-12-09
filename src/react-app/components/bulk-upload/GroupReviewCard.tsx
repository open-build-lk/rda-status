import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, ChevronUp, Check, ExternalLink, Calendar } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentCategorySelect } from "@/components/forms/IncidentCategorySelect";
import { PassabilityScale } from "@/components/forms/PassabilityScale";
import { RoadNumberInput } from "@/components/forms/RoadNumberInput";
import {
  provinces,
  getDistrictsForProvince,
  findProvinceByCoords,
} from "@/data/sriLankaLocations";
import type { BulkIncident } from "@/stores/bulkUpload";
import clsx from "clsx";

interface GroupReviewCardProps {
  incident: BulkIncident;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<BulkIncident>) => void;
}

export function GroupReviewCard({
  incident,
  index,
  total,
  isExpanded,
  onToggle,
  onUpdate,
}: GroupReviewCardProps) {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Store onUpdate in a ref to avoid re-running effects when the callback changes
  // (since it's an inline function in the parent that gets recreated every render)
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Import the SelectedRoad type from bulkUpload store
  type SelectedRoadType = NonNullable<BulkIncident["selectedRoad"]>;

  // Try to detect road number from road name string and fetch full road info
  const detectRoadAndFetchInfo = async (roadName: string): Promise<{ roadNumberInput: string; selectedRoad: SelectedRoadType | null } | null> => {
    // First, try to extract road number directly from the name
    // Patterns: "A1", "B234", "A 1", "Colombo - Kandy Road (A1)"
    const patterns = [
      /\b([ABCDE]\d+)\b/i,                    // A1, B234
      /\b([ABCDE])\s*-?\s*(\d+)\b/i,          // A-1, A 1
      /\(([ABCDE]\d+)\)/i,                     // (A1)
    ];

    let detectedRoadNumber: string | null = null;

    for (const pattern of patterns) {
      const match = roadName.match(pattern);
      if (match) {
        detectedRoadNumber = match[1].toUpperCase() + (match[2] || "");
        break;
      }
    }

    // If no direct match from name, try searching our roads database by keywords
    if (!detectedRoadNumber) {
      const keywords = roadName
        .replace(/road|street|mawatha|lane|avenue/gi, "")
        .trim()
        .split(/[\s,\-]+/)
        .filter((k) => k.length > 2);

      if (keywords.length > 0) {
        try {
          const searchTerm = keywords.slice(0, 2).join(" ");
          const response = await fetch(`/api/v1/roads/suggest?q=${encodeURIComponent(searchTerm)}&limit=1`);
          if (response.ok) {
            const results = await response.json() as Array<{ id: string; roadNumber: string; roadClass: string; name: string | null }>;
            if (results.length > 0) {
              // We got a full road result from keyword search
              return {
                roadNumberInput: results[0].roadNumber,
                selectedRoad: results[0],
              };
            }
          }
        } catch {
          // Ignore search errors
        }
      }
      return null;
    }

    // We have a road number - now fetch the full road info
    try {
      const response = await fetch(`/api/v1/roads/suggest?q=${encodeURIComponent(detectedRoadNumber)}&limit=1`);
      if (response.ok) {
        const results = await response.json() as Array<{ id: string; roadNumber: string; roadClass: string; name: string | null }>;
        if (results.length > 0 && results[0].roadNumber.toUpperCase() === detectedRoadNumber.toUpperCase()) {
          return {
            roadNumberInput: results[0].roadNumber,
            selectedRoad: results[0],
          };
        }
      }
    } catch {
      // Ignore fetch errors
    }

    // Return just the road number without full road info
    return {
      roadNumberInput: detectedRoadNumber,
      selectedRoad: null,
    };
  };

  // Auto-detect province, location, and road on mount
  useEffect(() => {
    if (incident.province || incident.locationName) return;
    if (!incident.centroid.latitude || !incident.centroid.longitude) return;

    // Detect province from coordinates
    const detected = findProvinceByCoords(
      incident.centroid.latitude,
      incident.centroid.longitude
    );
    if (detected) {
      onUpdateRef.current({ province: detected.id });
    }

    // Fetch reverse geocoding
    interface NominatimAddress {
      road?: string;
      neighbourhood?: string;
      suburb?: string;
      village?: string;
      town?: string;
      county?: string;
      state_district?: string;
      city?: string;
    }

    setIsLoadingLocation(true);
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${incident.centroid.latitude}&lon=${incident.centroid.longitude}&zoom=16&addressdetails=1`,
      {
        headers: {
          "User-Agent": "SriLankaRoadStatus/1.0",
          "Accept-Language": "en",
        },
      }
    )
      .then((res) => res.json() as Promise<{ address?: NominatimAddress }>)
      .then(async (data) => {
        if (data.address) {
          const addr = data.address;
          const parts: string[] = [];
          if (addr.road) parts.push(addr.road);
          const area =
            addr.neighbourhood || addr.suburb || addr.village || addr.town;
          if (area && !parts.includes(area)) parts.push(area);
          if (parts.length > 0) {
            onUpdateRef.current({ locationName: parts.join(", ") });
          }

          // Try to detect road number and get full road info from the road name
          if (addr.road && !incident.roadNumberInput && !incident.selectedRoad) {
            const roadInfo = await detectRoadAndFetchInfo(addr.road);
            if (roadInfo) {
              onUpdateRef.current({
                roadNumberInput: roadInfo.roadNumberInput,
                selectedRoad: roadInfo.selectedRoad,
              });
            }
          }

          // Try to detect district from multiple address fields
          if (detected) {
            const districts = getDistrictsForProvince(detected.id);
            const possibleDistrictNames = [
              addr.county,
              addr.state_district,
              addr.city,
              addr.town,
            ].filter((n): n is string => !!n);

            for (const rawName of possibleDistrictNames) {
              // Normalize: remove "District" suffix and extra whitespace
              const normalized = rawName
                .toLowerCase()
                .replace(/\s*district\s*/gi, "")
                .trim();

              // Try flexible matching
              const matchedDistrict = districts.find((d) => {
                const dName = d.name.toLowerCase();
                return (
                  dName === normalized ||
                  dName.includes(normalized) ||
                  normalized.includes(dName)
                );
              });

              if (matchedDistrict) {
                onUpdateRef.current({ district: matchedDistrict.id });
                break;
              }
            }
          }
        }
      })
      .catch((err) => console.error("Reverse geocoding failed:", err))
      .finally(() => setIsLoadingLocation(false));
  }, [incident.centroid, incident.province, incident.locationName, incident.roadNumberInput, incident.selectedRoad]);

  // Check if incident has minimum required fields
  const isComplete = !!(
    incident.damageType &&
    incident.centroid.latitude &&
    incident.centroid.longitude
  );

  useEffect(() => {
    if (isComplete !== incident.isComplete) {
      onUpdateRef.current({ isComplete });
    }
  }, [isComplete, incident.isComplete]);

  return (
    <Card className="overflow-hidden">
      {/* Header - always visible */}
      <CardHeader
        className={clsx(
          "cursor-pointer transition-colors py-3 px-4",
          isExpanded ? "bg-gray-50 dark:bg-gray-800/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                isComplete
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}
            >
              {isComplete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div>
              <CardTitle className="text-base">
                Location {index + 1} of {total}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {incident.photos.length} photo
                {incident.photos.length !== 1 ? "s" : ""}
                {incident.locationName && ` • ${incident.locationName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete && (
              <span className="rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                Ready
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="space-y-4 pt-4">
          {/* Photo thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {incident.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <img
                  src={photo.preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {photo.gps && (
                  <div className="absolute bottom-0.5 left-0.5 rounded bg-green-500/90 px-1 py-0.5">
                    <MapPin className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Location info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {incident.centroid.latitude.toFixed(5)},{" "}
                  {incident.centroid.longitude.toFixed(5)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${incident.centroid.latitude},${incident.centroid.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {incident.incidentDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(incident.incidentDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`province-${incident.groupId}`} className="text-sm">
                  Province
                </Label>
                <Select
                  value={incident.province || ""}
                  onValueChange={(value) =>
                    onUpdate({ province: value || null, district: null })
                  }
                >
                  <SelectTrigger id={`province-${incident.groupId}`} className="h-10">
                    <SelectValue placeholder="Select" />
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

              <div className="space-y-1.5">
                <Label htmlFor={`district-${incident.groupId}`} className="text-sm">
                  District
                </Label>
                <Select
                  value={incident.district || ""}
                  onValueChange={(value) =>
                    onUpdate({ district: value || null })
                  }
                  disabled={!incident.province}
                >
                  <SelectTrigger id={`district-${incident.groupId}`} className="h-10">
                    <SelectValue
                      placeholder={incident.province ? "Select" : "Province first"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {incident.province &&
                      getDistrictsForProvince(incident.province).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Road Number Picker */}
            <RoadNumberInput
              value={incident.roadNumberInput || ""}
              selectedRoad={incident.selectedRoad}
              onChange={(value) => onUpdate({ roadNumberInput: value })}
              onRoadSelect={(road) => onUpdate({ selectedRoad: road })}
            />

            <div className="space-y-1.5">
              <Label htmlFor={`location-${incident.groupId}`} className="text-sm">
                Location Name
              </Label>
              <Input
                id={`location-${incident.groupId}`}
                placeholder={isLoadingLocation ? "Detecting..." : "Enter location name"}
                value={incident.locationName}
                onChange={(e) => onUpdate({ locationName: e.target.value })}
                className="h-10"
              />
            </div>
          </div>

          {/* Incident details */}
          <div className="space-y-4 pt-2">
            <IncidentCategorySelect
              value={incident.damageType}
              onChange={(type) => onUpdate({ damageType: type })}
            />

            <PassabilityScale
              value={incident.passabilityLevel}
              onChange={(level) => onUpdate({ passabilityLevel: level })}
            />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`singleLane-${incident.groupId}`}
                  checked={incident.incidentDetails.isSingleLane || false}
                  onChange={(e) =>
                    onUpdate({
                      incidentDetails: {
                        ...incident.incidentDetails,
                        isSingleLane: e.target.checked,
                      },
                    })
                  }
                  className="h-5 w-5 rounded border-gray-300"
                />
                <Label
                  htmlFor={`singleLane-${incident.groupId}`}
                  className="text-sm font-normal"
                >
                  Single lane traffic possible
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={`safetyBarriers-${incident.groupId}`}
                  checked={incident.incidentDetails.needsSafetyBarriers || false}
                  onChange={(e) =>
                    onUpdate({
                      incidentDetails: {
                        ...incident.incidentDetails,
                        needsSafetyBarriers: e.target.checked,
                      },
                    })
                  }
                  className="h-5 w-5 mt-0.5 rounded border-gray-300"
                />
                <div>
                  <Label
                    htmlFor={`safetyBarriers-${incident.groupId}`}
                    className="text-sm font-normal"
                  >
                    Needs safety barriers
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Road is carefully usable but requires barriers
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`blockedDistance-${incident.groupId}`}
                className="text-sm"
              >
                Blocked distance (meters)
              </Label>
              <Input
                id={`blockedDistance-${incident.groupId}`}
                type="number"
                placeholder="e.g., 50"
                value={incident.incidentDetails.blockedDistanceMeters || ""}
                onChange={(e) =>
                  onUpdate({
                    incidentDetails: {
                      ...incident.incidentDetails,
                      blockedDistanceMeters: e.target.value
                        ? Number(e.target.value)
                        : null,
                    },
                  })
                }
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`description-${incident.groupId}`} className="text-sm">
                Additional Details
              </Label>
              <Textarea
                id={`description-${incident.groupId}`}
                placeholder="Describe the incident..."
                value={incident.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
