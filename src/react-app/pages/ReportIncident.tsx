import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { AlertCircle, Check, MapPin, Loader2, Navigation, Building2, School, Hospital, Zap } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { PhotoGallery, type Photo } from "@/components/camera/PhotoGallery";
import { useIncidentReportStore } from "@/stores/incidentReport";
import { useAuthStore } from "@/stores/auth";
import {
  provinces,
  getDistrictsForProvince,
  findProvinceByCoords,
} from "@/data/sriLankaLocations";
import {
  INFRASTRUCTURE_CATEGORIES,
  INFRASTRUCTURE_CATEGORY_LABELS,
  DAMAGE_LEVELS,
  DAMAGE_LEVEL_LABELS,
  PRIORITY_LEVELS,
  type InfrastructureCategory,
  type DamageLevel,
  type PriorityLevel,
} from "../../shared/types";

const MAX_PHOTOS = 5;

interface UploadResult {
  keys: string[];
  count: number;
}

interface ReportResult {
  id: string;
  reportNumber: string;
  claimToken: string | null;
  promptSignup: boolean;
}

const categoryIcons: Record<InfrastructureCategory, React.ReactNode> = {
  government_building: <Building2 className="w-6 h-6" />,
  school: <School className="w-6 h-6" />,
  hospital: <Hospital className="w-6 h-6" />,
  utility: <Zap className="w-6 h-6" />,
};

const damageLevelColors: Record<DamageLevel, string> = {
  minor: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  major: "border-orange-500 bg-orange-50 dark:bg-orange-900/20",
  destroyed: "border-red-500 bg-red-50 dark:bg-red-900/20",
};

const priorityColors: Record<PriorityLevel, string> = {
  high: "border-red-500 bg-red-50 dark:bg-red-900/20",
  medium: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  low: "border-green-500 bg-green-50 dark:bg-green-900/20",
};

export function ReportIncident() {
  const navigate = useNavigate();
  const [showCamera, setShowCamera] = useState(false);

  const { user } = useAuthStore();
  const {
    photos,
    latitude,
    longitude,
    province,
    district,
    locationName,
    isLoadingLocation,
    infrastructureCategory,
    facilityName,
    damageLevel,
    citizenPriority,
    anonymousName,
    anonymousEmail,
    anonymousContact,
    description,
    isSubmitting,
    submitError,
    submittedReportId,
    addPhoto,
    removePhoto,
    setProvince,
    setDistrict,
    setLocationName,
    setIsLoadingLocation,
    setInfrastructureCategory,
    setFacilityName,
    setDamageLevel,
    setCitizenPriority,
    setAnonymousName,
    setAnonymousEmail,
    setAnonymousContact,
    setDescription,
    setSubmitting,
    setSubmitError,
    setSubmittedReport,
    reset,
  } = useIncidentReportStore();

  // Prefill contact info from signed-in user when available
  useEffect(() => {
    if (!user) return;
    if (!anonymousName.trim() && user.name) {
      setAnonymousName(user.name);
    }
    if (!anonymousEmail.trim() && user.email) {
      setAnonymousEmail(user.email);
    }
    if (!anonymousContact.trim() && user.phone) {
      setAnonymousContact(user.phone);
    }
  }, [user, anonymousName, anonymousEmail, anonymousContact, setAnonymousName, setAnonymousEmail, setAnonymousContact]);

  // Fetch location info when coordinates change
  useEffect(() => {
    if (!latitude || !longitude) return;
    if (isLoadingLocation) return;
    if (province || locationName) return;

    const detectedProvince = findProvinceByCoords(latitude, longitude);
    const detectedProvinceId = detectedProvince?.id || null;
    if (detectedProvinceId) {
      setProvince(detectedProvinceId);
    }

    setIsLoadingLocation(true);
    interface NominatimResponse {
      address?: {
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        village?: string;
        town?: string;
        city?: string;
        county?: string;
        state_district?: string;
        state?: string;
      };
    }

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
      {
        headers: {
          "User-Agent": "InfrastructureRecovery/1.0",
          "Accept-Language": "en",
        },
      }
    )
      .then((res) => res.json() as Promise<NominatimResponse>)
      .then((data) => {
        if (data.address) {
          const addr = data.address;
          const parts: string[] = [];
          if (addr.road) parts.push(addr.road);
          const area = addr.neighbourhood || addr.suburb || addr.village || addr.town;
          if (area && !parts.includes(area)) parts.push(area);
          if (parts.length > 0) {
            setLocationName(parts.join(", "));
          }

          const districtName = addr.county || addr.state_district || addr.city;
          if (districtName && detectedProvinceId) {
            const districts = getDistrictsForProvince(detectedProvinceId);
            const matchedDistrict = districts.find(
              (d) => d.name.toLowerCase() === districtName.toLowerCase()
            );
            if (matchedDistrict) {
              setDistrict(matchedDistrict.id);
            }
          }
        }
      })
      .catch((err) => console.error("Reverse geocoding failed:", err))
      .finally(() => setIsLoadingLocation(false));
  }, [latitude, longitude, province, locationName, isLoadingLocation, setProvince, setDistrict, setLocationName, setIsLoadingLocation]);

  const handlePhotoCapture = (blob: Blob, coords: { lat: number; lng: number } | null) => {
    const photo: Photo = {
      id: crypto.randomUUID(),
      blob,
      preview: URL.createObjectURL(blob),
      coords,
    };
    addPhoto(photo);
    setShowCamera(false);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setSubmitError("Please take at least one photo");
      return;
    }
    if (!infrastructureCategory) {
      setSubmitError("Please select a facility type");
      return;
    }
    if (!damageLevel) {
      setSubmitError("Please select a damage level");
      return;
    }
    if (!latitude || !longitude) {
      setSubmitError("Location is required. Please take a photo with GPS enabled.");
      return;
    }
    if (!user) {
      if (!anonymousName.trim()) {
        setSubmitError("Please enter your name");
        return;
      }
      if (!anonymousEmail.trim()) {
        setSubmitError("Please enter your email address");
        return;
      }
      if (!isValidEmail(anonymousEmail)) {
        setSubmitError("Please enter a valid email address");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload photos
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append("photos", photo.blob, `photo-${photo.id}.jpg`);
      });

      const uploadResponse = await fetch("/api/v1/upload/photos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photos");
      }

      const uploadResult: UploadResult = await uploadResponse.json();
      const mediaKeys: string[] = uploadResult.keys;

      // 2. Create report
      const reportData = {
        latitude,
        longitude,
        province: province || undefined,
        district: district || undefined,
        locationName: locationName || undefined,
        infrastructureCategory,
        facilityName: facilityName || undefined,
        damageLevel,
        citizenPriority: citizenPriority || undefined,
        description: description || undefined,
        anonymousName: anonymousName || undefined,
        anonymousEmail: anonymousEmail || undefined,
        anonymousContact: anonymousContact || undefined,
        mediaKeys,
      };

      const reportResponse = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
        credentials: "include",
      });

      if (!reportResponse.ok) {
        throw new Error("Failed to submit report");
      }

      const reportResult: ReportResult = await reportResponse.json();
      setSubmittedReport(reportResult.id, reportResult.claimToken);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submission failed");
      setSubmitting(false);
    }
  };

  const handleNewReport = () => {
    reset();
  };

  // Success state
  if (submittedReportId) {
    const showVerificationMessage = !user && anonymousEmail;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-green-600">Report Submitted!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {showVerificationMessage ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400">
                    We've sent a verification email to:
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {anonymousEmail}
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Please check your email and click the verification link to confirm your report.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Thank you for reporting this infrastructure damage. Your report will be reviewed by officials.
                </p>
              )}

              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={() => navigate("/")}>
                  View Map
                </Button>
                <Button onClick={handleNewReport}>
                  Report Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Camera view
  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onClose={() => setShowCamera(false)}
        disabled={photos.length >= MAX_PHOTOS}
      />
    );
  }

  // Progressive disclosure
  const hasPhotos = photos.length > 0;
  const hasGeoPhoto = photos.some((p) => !!p.coords);
  const hasLocation = Boolean(latitude && longitude && hasGeoPhoto);
  const hasFacility = !!infrastructureCategory;
  const hasDamageInfo = !!damageLevel;
  const hasContactInfo = user
    ? true
    : (anonymousName.trim() !== "" && anonymousEmail.trim() !== "" && isValidEmail(anonymousEmail));
  const readyForSubmit = hasPhotos && hasLocation && hasFacility && hasDamageInfo && hasContactInfo;

  const submitBlocker = !hasPhotos
    ? "Add at least one photo"
    : !hasGeoPhoto
      ? "Retake a photo with GPS"
      : !hasFacility
        ? "Select a facility type"
        : !hasDamageInfo
          ? "Select a damage level"
          : !hasContactInfo
            ? "Add a name and valid email"
            : null;

  const alerts: { type: "error" | "warning"; text: string }[] = [];
  if (submitError) alerts.push({ type: "error", text: submitError });
  if (!hasPhotos) alerts.push({ type: "warning", text: "Add at least one photo to start your report." });
  if (hasPhotos && !hasGeoPhoto) {
    alerts.push({
      type: "error",
      text: "We couldn't detect location from your photo. Enable GPS and retake, or allow location access.",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Report Infrastructure Damage</h1>
        <p className="text-sm text-gray-500 mt-1">Help us track damage to public facilities</p>
      </div>

      {/* Top alerts */}
      {alerts.length > 0 && (
        <div className="max-w-md mx-auto px-4 pt-3 space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={`${alert.type}-${idx}`}
              className={clsx(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                alert.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
        {/* Step 1: Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                hasPhotos
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {hasPhotos ? "✓" : "1"}
              </span>
              Take Photos of the Damage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery
              photos={photos}
              onRemove={removePhoto}
              onAddMore={() => setShowCamera(true)}
              maxPhotos={MAX_PHOTOS}
              hasGeoPhoto={hasGeoPhoto}
              locationRequired
              onRetryLocation={() => setShowCamera(true)}
            />

            {latitude && longitude && hasGeoPhoto && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <MapPin className="w-4 h-4" />
                Location captured
              </div>
            )}

            {!hasGeoPhoto && hasPhotos && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                We need at least one photo with GPS. Enable location for your camera, then retake.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1.5: Location Verification */}
        {hasPhotos && hasGeoPhoto && latitude && longitude && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                  province
                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                    : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                }`}>
                  {province ? "✓" : <Navigation className="w-3 h-3" />}
                </span>
                Verify Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting location...
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select
                    value={province || ""}
                    onValueChange={(value) => setProvince(value || null)}
                  >
                    <SelectTrigger>
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
                    value={district || ""}
                    onValueChange={(value) => setDistrict(value || null)}
                    disabled={!province}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={province ? "Select district" : "Select province first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {province &&
                        getDistrictsForProvince(province).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationName">Address / Area Name</Label>
                <Input
                  id="locationName"
                  placeholder="e.g., Near Town Hall, Main Street"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Auto-detected from GPS. Edit if needed.
                </p>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                <span className="font-medium">GPS:</span>{" "}
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary-600 hover:underline"
                >
                  View on map
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Facility Details */}
        <Card className="relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                hasFacility
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {hasFacility ? "✓" : "2"}
              </span>
              What was Damaged?
            </CardTitle>
          </CardHeader>
          <CardContent className={clsx("space-y-6", !hasLocation && "opacity-60 pointer-events-none")}>
            {/* Infrastructure Category Selection */}
            <div className="space-y-3">
              <Label>Facility Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {INFRASTRUCTURE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInfrastructureCategory(cat)}
                    className={clsx(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      infrastructureCategory === cat
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <div className={clsx(
                      "p-2 rounded-full",
                      infrastructureCategory === cat
                        ? "bg-primary-100 dark:bg-primary-900 text-primary-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                    )}>
                      {categoryIcons[cat]}
                    </div>
                    <span className="text-sm font-medium text-center">
                      {INFRASTRUCTURE_CATEGORY_LABELS[cat]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Facility Name */}
            <div className="space-y-2">
              <Label htmlFor="facilityName">Facility Name (optional)</Label>
              <Input
                id="facilityName"
                placeholder="e.g., Central Hospital, Town Hall, ABC School"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
              />
            </div>
          </CardContent>
          {!hasLocation && (
            <div className="absolute inset-0 rounded-xl bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center text-sm text-gray-100">
              Complete the photo step with GPS first.
            </div>
          )}
        </Card>

        {/* Step 3: Damage Details */}
        <Card className="relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                hasDamageInfo
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {hasDamageInfo ? "✓" : "3"}
              </span>
              Damage Details
            </CardTitle>
          </CardHeader>
          <CardContent className={clsx("space-y-6", (!hasLocation || !hasFacility) && "opacity-60 pointer-events-none")}>
            {/* Damage Level Selection */}
            <div className="space-y-3">
              <Label>How severe is the damage?</Label>
              <div className="space-y-2">
                {DAMAGE_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDamageLevel(level)}
                    className={clsx(
                      "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                      damageLevel === level
                        ? damageLevelColors[level] + " border-2"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <div className={clsx(
                      "w-4 h-4 rounded-full border-2",
                      damageLevel === level
                        ? level === 'minor' ? "bg-yellow-500 border-yellow-500"
                          : level === 'major' ? "bg-orange-500 border-orange-500"
                          : "bg-red-500 border-red-500"
                        : "border-gray-300"
                    )} />
                    <div>
                      <div className="font-medium">{DAMAGE_LEVEL_LABELS[level].label}</div>
                      <div className="text-sm text-gray-500">{DAMAGE_LEVEL_LABELS[level].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selection */}
            <div className="space-y-3">
              <Label>How urgent is this? (your assessment)</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_LEVELS.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setCitizenPriority(priority)}
                    className={clsx(
                      "p-3 rounded-lg border-2 transition-all text-center",
                      citizenPriority === priority
                        ? priorityColors[priority]
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="font-medium capitalize">{priority}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the damage, any safety concerns, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          {(!hasLocation || !hasFacility) && (
            <div className="absolute inset-0 rounded-xl bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center text-sm text-gray-100 px-6 text-center">
              Complete the previous steps first.
            </div>
          )}
        </Card>

        {/* Step 4: Contact Info */}
        <Card className="relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                hasContactInfo
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {hasContactInfo ? "✓" : "4"}
              </span>
              Contact Info
              {user && <span className="text-xs text-gray-500 font-normal">(optional)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className={clsx("space-y-4", (!hasLocation || !hasFacility || !hasDamageInfo) && "opacity-60 pointer-events-none")}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user
                ? "We pre-filled your details. You can edit before submitting."
                : "We'll send you a verification link to confirm your report."}
            </p>

            <div className="space-y-2">
              <Label htmlFor="name">
                Your Name {!user && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                required={!user}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email {!user && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={anonymousEmail}
                onChange={(e) => setAnonymousEmail(e.target.value)}
                required={!user}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Phone Number</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="07X XXX XXXX"
                value={anonymousContact}
                onChange={(e) => setAnonymousContact(e.target.value)}
              />
            </div>
          </CardContent>
          {(!hasLocation || !hasFacility || !hasDamageInfo) && (
            <div className="absolute inset-0 rounded-xl bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center text-sm text-gray-100 px-6 text-center">
              Complete the previous steps first.
            </div>
          )}
        </Card>

        {/* Step 5: Submit */}
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                readyForSubmit
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {readyForSubmit ? "✓" : "5"}
              </span>
              Review & Submit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Checklist</h3>
              <div className="space-y-1.5">
                <ChecklistRow label="Photo with GPS" done={hasPhotos && hasGeoPhoto} />
                <ChecklistRow label="Facility type selected" done={hasFacility} />
                <ChecklistRow label="Damage level selected" done={hasDamageInfo} />
                <ChecklistRow label={user ? "Contact info (optional)" : "Name and email added"} done={hasContactInfo} />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !readyForSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>

            {!readyForSubmit && submitBlocker && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Complete: {submitBlocker}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={clsx(
          "flex h-5 w-5 items-center justify-center rounded-full border",
          done
            ? "border-green-500 bg-green-100 text-green-600 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300"
            : "border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500"
        )}
      >
        {done && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className={done ? "text-gray-800 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
        {label}
      </span>
    </div>
  );
}
