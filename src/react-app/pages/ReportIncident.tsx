import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { AlertCircle, Check, MapPin, Loader2, Navigation, Images } from "lucide-react";
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
import { IncidentCategorySelect } from "@/components/forms/IncidentCategorySelect";
import { PassabilityScale } from "@/components/forms/PassabilityScale";
import { RoadNumberInput } from "@/components/forms/RoadNumberInput";
import { useIncidentReportStore } from "@/stores/incidentReport";
import { useAuthStore } from "@/stores/auth";
import {
  provinces,
  getDistrictsForProvince,
  findProvinceByCoords,
} from "@/data/sriLankaLocations";

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

export function ReportIncident() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    damageType,
    passabilityLevel,
    isSingleLane,
    needsSafetyBarriers,
    blockedDistanceMeters,
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
    setDamageType,
    setPassabilityLevel,
    setIsSingleLane,
    setNeedsSafetyBarriers,
    setBlockedDistance,
    setAnonymousName,
    setAnonymousEmail,
    setAnonymousContact,
    setDescription,
    setSubmitting,
    setSubmitError,
    setSubmittedReport,
    reset,
    roadNumberInput,
    selectedRoad,
    setRoadNumberInput,
    setSelectedRoad,
  } = useIncidentReportStore();

  // Prefill contact info from signed-in user when available (but keep editable)
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
    // Only auto-detect if location info hasn't been set yet
    if (province || locationName) return;

    // First, try to detect province from coordinates
    const detectedProvince = findProvinceByCoords(latitude, longitude);
    const detectedProvinceId = detectedProvince?.id || null;
    if (detectedProvinceId) {
      setProvince(detectedProvinceId);
    }

    // Fetch reverse geocoding for location name
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
          "User-Agent": "SriLankaRoadStatus/1.0",
          "Accept-Language": "en",
        },
      }
    )
      .then((res) => res.json() as Promise<NominatimResponse>)
      .then((data) => {
        if (data.address) {
          const addr = data.address;
          // Build location name
          const parts: string[] = [];
          if (addr.road) parts.push(addr.road);
          const area = addr.neighbourhood || addr.suburb || addr.village || addr.town;
          if (area && !parts.includes(area)) parts.push(area);
          if (parts.length > 0) {
            setLocationName(parts.join(", "));
          }

          // Try to detect district from address (use the locally detected province, not state)
          if (detectedProvinceId) {
            const districts = getDistrictsForProvince(detectedProvinceId);
            // Try multiple address fields that might contain district info
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
              
              // Try flexible matching: exact match, includes, or district includes name
              const matchedDistrict = districts.find((d) => {
                const dName = d.name.toLowerCase();
                return (
                  dName === normalized ||
                  dName.includes(normalized) ||
                  normalized.includes(dName)
                );
              });

              if (matchedDistrict) {
                setDistrict(matchedDistrict.id);
                break; // Found a match, stop searching
              }
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

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (photos.length === 0) {
      setSubmitError(t("report:validation.photoRequired"));
      return;
    }
    if (!damageType) {
      setSubmitError(t("report:validation.incidentTypeRequired"));
      return;
    }
    if (!latitude || !longitude) {
      setSubmitError(t("report:validation.locationRequired"));
      return;
    }
    // For non-signed-in users, require name and email
    if (!user) {
      if (!anonymousName.trim()) {
        setSubmitError(t("report:validation.nameRequired"));
        return;
      }
      if (!anonymousEmail.trim()) {
        setSubmitError(t("report:validation.emailRequired"));
        return;
      }
      if (!isValidEmail(anonymousEmail)) {
        setSubmitError(t("report:validation.emailInvalid"));
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
        throw new Error(t("report:submit.uploadError"));
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
        damageType,
        passabilityLevel: passabilityLevel || undefined,
        isSingleLane,
        needsSafetyBarriers,
        blockedDistanceMeters: blockedDistanceMeters || undefined,
        anonymousName: anonymousName || undefined,
        anonymousEmail: anonymousEmail || undefined,
        anonymousContact: anonymousContact || undefined,
        description: description || undefined,
        mediaKeys,
        // Road classification data
        roadId: selectedRoad?.id || undefined,
        roadNumberInput: roadNumberInput || undefined,
        roadClass: selectedRoad?.roadClass || undefined,
      };

      const reportResponse = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
        credentials: "include",
      });

      if (!reportResponse.ok) {
        throw new Error(t("report:submit.error"));
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
              <CardTitle className="text-green-600">{t("report:submit.success")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {showVerificationMessage ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t("report:submit.verificationSent")}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {anonymousEmail}
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t("report:submit.checkEmail")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  {t("report:submit.successMessage")}
                </p>
              )}

              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={() => navigate("/")}>
                  {t("report:submit.viewMap")}
                </Button>
                <Button onClick={handleNewReport}>
                  {t("report:submit.reportAnother")}
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

  // Progressive disclosure: show sections as user completes previous ones
  const hasPhotos = photos.length > 0;
  const hasGeoPhoto = photos.some((p) => !!p.coords);
  const hasLocation = Boolean(latitude && longitude && hasGeoPhoto);
  const hasCategory = !!damageType;
  // For signed-in users, contact info is optional. For anonymous, name + email required.
  const hasContactInfo = user
    ? true
    : (anonymousName.trim() !== "" && anonymousEmail.trim() !== "" && isValidEmail(anonymousEmail));
  const readyForSubmit = hasPhotos && hasLocation && hasCategory && hasContactInfo;

  const submitBlocker = !hasPhotos
    ? t("report:checklist.addPhoto")
    : !hasGeoPhoto
      ? t("report:checklist.retakeWithGps")
      : !hasCategory
        ? t("report:checklist.selectType")
        : !hasContactInfo
          ? t("report:checklist.addContact")
          : null;

  const alerts: { type: "error" | "warning"; text: string }[] = [];
  if (submitError) alerts.push({ type: "error", text: submitError });
  if (!hasPhotos) alerts.push({ type: "warning", text: t("report:alerts.addPhoto") });
  if (hasPhotos && !hasGeoPhoto) {
    alerts.push({
      type: "error",
      text: t("report:alerts.noGps"),
    });
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("report:title")}</h1>
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
        {/* Step 1: Photos + location */}
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
              {t("report:photos.title")}
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
                {t("report:location.locationDetected")}
              </div>
            )}

            {!hasGeoPhoto && hasPhotos && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                {t("report:photos.gpsHint")}
              </div>
            )}

            {/* Bulk upload link */}
            {!hasPhotos && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to="/report/bulk"
                  className="flex items-center justify-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Images className="h-4 w-4" />
                  {t("report:photos.bulkUpload")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1.5: Location Verification - shown after photos with coordinates */}
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
                {t("report:location.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingLocation && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("report:location.detectingLocation")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="province">{t("report:location.province")}</Label>
                  <Select
                    value={province || ""}
                    onValueChange={(value) => setProvince(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("report:location.selectProvince")} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {t(`locations:provinces.${p.id}`, { defaultValue: p.name })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">{t("report:location.district")}</Label>
                  <Select
                    value={district || ""}
                    onValueChange={(value) => setDistrict(value || null)}
                    disabled={!province}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={province ? t("report:location.selectDistrict") : t("report:location.selectProvinceFirst")} />
                    </SelectTrigger>
                    <SelectContent>
                      {province &&
                        getDistrictsForProvince(province).map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {t(`locations:districts.${d.id}`, { defaultValue: d.name })}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <RoadNumberInput
                value={roadNumberInput}
                selectedRoad={selectedRoad}
                onChange={setRoadNumberInput}
                onRoadSelect={setSelectedRoad}
              />

              <div className="space-y-2">
                <Label htmlFor="locationName">{t("report:location.roadNumber")}</Label>
                <Input
                  id="locationName"
                  placeholder={t("report:location.roadNumberPlaceholder")}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  {t("report:location.autoDetected")}
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
                  {t("report:location.viewOnMap")}
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Incident Details - shown after photos */}
        {/* Step 2: Incident Details */}
        <Card className="relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                hasCategory
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {hasCategory ? "✓" : "2"}
              </span>
              {t("report:details.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className={clsx("space-y-6", !hasLocation && "opacity-60 pointer-events-none")}>
            <IncidentCategorySelect
              value={damageType}
              onChange={setDamageType}
            />

            <PassabilityScale
              value={passabilityLevel}
              onChange={setPassabilityLevel}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="singleLane"
                checked={isSingleLane}
                onChange={(e) => setIsSingleLane(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="singleLane" className="text-sm font-normal">
                {t("report:details.singleLane")}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="safetyBarriers"
                checked={needsSafetyBarriers}
                onChange={(e) => setNeedsSafetyBarriers(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300"
              />
              <div>
                <Label htmlFor="safetyBarriers" className="text-sm font-normal">
                  {t("report:details.needsBarriers")}
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("report:details.barriersHint")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockedDistance">{t("report:details.blockedDistance")}</Label>
              <Input
                id="blockedDistance"
                type="number"
                placeholder={t("report:details.blockedDistancePlaceholder")}
                value={blockedDistanceMeters || ""}
                onChange={(e) => setBlockedDistance(e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            {/* Additional Details - shown here for signed-in users since contact section is hidden */}
            {user && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="description">{t("report:details.additionalDetails")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("report:details.additionalDetailsPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </CardContent>
          {!hasLocation && (
            <div className="absolute inset-0 rounded-xl bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center text-sm text-gray-100">
              {t("report:blockers.completePhoto")}
            </div>
          )}
        </Card>

        {/* Step 3: Contact Info - Only shown for anonymous users */}
        {!user && (
          <Card className="relative animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                  hasContactInfo
                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                    : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                }`}>
                  {hasContactInfo ? "✓" : "3"}
                </span>
                {t("report:contact.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className={clsx("space-y-4", (!hasLocation || !hasCategory) && "opacity-60 pointer-events-none")}>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("report:contact.verificationNote")}
              </p>

              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("report:contact.name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t("report:contact.namePlaceholder")}
                  value={anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("report:contact.email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("report:contact.emailPlaceholder")}
                  value={anonymousEmail}
                  onChange={(e) => setAnonymousEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">{t("report:contact.phone")}</Label>
                <Input
                  id="contact"
                  type="tel"
                  placeholder={t("report:contact.phonePlaceholder")}
                  value={anonymousContact}
                  onChange={(e) => setAnonymousContact(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("report:details.additionalDetails")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("report:details.additionalDetailsPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            {(!hasLocation || !hasCategory) && (
              <div className="absolute inset-0 rounded-xl bg-gray-900/30 backdrop-blur-[2px] flex items-center justify-center text-sm text-gray-100 px-6 text-center">
                {t("report:blockers.completePhotoAndDetails")}
              </div>
            )}
          </Card>
        )}

        {/* Step 3 (signed-in) / Step 4 (anonymous): Review & Submit */}
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                readyForSubmit
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
              }`}>
                {readyForSubmit ? "✓" : user ? "3" : "4"}
              </span>
              {t("report:review.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">{t("report:review.checklist")}</h3>
              <div className="space-y-1.5">
                <ChecklistRow label={t("report:review.photoWithGps")} done={hasPhotos && hasGeoPhoto} />
                <ChecklistRow label={t("report:review.incidentSelected")} done={hasCategory} />
                {!user && <ChecklistRow label={t("report:review.contactRequired")} done={hasContactInfo} />}
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
                  {t("report:submit.submitting")}
                </>
              ) : (
                t("report:submit.button")
              )}
            </Button>

            {!readyForSubmit && submitBlocker && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t("report:review.complete")}: {submitBlocker}
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
