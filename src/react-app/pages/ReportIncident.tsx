import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2, Navigation } from "lucide-react";
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
    setBlockedDistance,
    setAnonymousName,
    setAnonymousEmail,
    setAnonymousContact,
    setDescription,
    setSubmitting,
    setSubmitError,
    setSubmittedReport,
    reset,
  } = useIncidentReportStore();

  // Fetch location info when coordinates change
  useEffect(() => {
    if (latitude && longitude && !province && !isLoadingLocation) {
      // First, try to detect province from coordinates
      const detectedProvince = findProvinceByCoords(latitude, longitude);
      if (detectedProvince) {
        setProvince(detectedProvince.id);
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

            // Try to detect district from address
            const districtName = addr.county || addr.state_district || addr.city;
            if (districtName && province) {
              const districts = getDistrictsForProvince(province);
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
    }
  }, [latitude, longitude]);

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
      setSubmitError("Please take at least one photo");
      return;
    }
    if (!damageType) {
      setSubmitError("Please select an incident category");
      return;
    }
    if (!latitude || !longitude) {
      setSubmitError("Location is required. Please take a photo with GPS enabled.");
      return;
    }
    // For non-signed-in users, require name and email
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
        damageType,
        passabilityLevel: passabilityLevel || undefined,
        isSingleLane,
        blockedDistanceMeters: blockedDistanceMeters || undefined,
        anonymousName: anonymousName || undefined,
        anonymousEmail: anonymousEmail || undefined,
        anonymousContact: anonymousContact || undefined,
        description: description || undefined,
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
                  Thank you for reporting this incident. Your report will be reviewed by our team.
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

  // Progressive disclosure: show sections as user completes previous ones
  const hasPhotos = photos.length > 0;
  const hasCategory = !!damageType;
  // For signed-in users, contact info is optional. For anonymous, name + email required.
  const hasContactInfo = user
    ? true
    : (anonymousName.trim() !== "" && anonymousEmail.trim() !== "" && isValidEmail(anonymousEmail));

  // Main form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Report Incident</h1>
        </div>
      </div>

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
              Take Photos of the Incident
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery
              photos={photos}
              onRemove={removePhoto}
              onAddMore={() => setShowCamera(true)}
              maxPhotos={MAX_PHOTOS}
            />

            {latitude && longitude && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <MapPin className="w-4 h-4" />
                Location captured
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 1.5: Location Verification - shown after photos with coordinates */}
        {hasPhotos && latitude && longitude && (
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
                <Label htmlFor="locationName">Road / Location Name</Label>
                <Input
                  id="locationName"
                  placeholder="e.g., Kandy Road near Town Hall"
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

        {/* Step 2: Incident Details - shown after photos */}
        {hasPhotos && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                  hasCategory
                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                    : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                }`}>
                  {hasCategory ? "✓" : "2"}
                </span>
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  Single lane traffic possible
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blockedDistance">Blocked distance (meters)</Label>
                <Input
                  id="blockedDistance"
                  type="number"
                  placeholder="e.g., 50"
                  value={blockedDistanceMeters || ""}
                  onChange={(e) => setBlockedDistance(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contact Info - shown after category selected */}
        {hasPhotos && hasCategory && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-sm flex items-center justify-center ${
                  hasContactInfo
                    ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                    : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                }`}>
                  {hasContactInfo ? "✓" : "3"}
                </span>
                Contact Info
                {user && <span className="text-xs text-gray-500 font-normal">(optional)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We'll send you a verification link to confirm your report.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">
                  Your Name {!user && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={user?.name || anonymousName}
                  onChange={(e) => setAnonymousName(e.target.value)}
                  disabled={!!user}
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
                  value={user?.email || anonymousEmail}
                  onChange={(e) => setAnonymousEmail(e.target.value)}
                  disabled={!!user}
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

              <div className="space-y-2">
                <Label htmlFor="description">Additional Details</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error message */}
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}
      </div>

      {/* Fixed submit button - only show when ready */}
      {hasPhotos && hasCategory && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
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
          </div>
        </div>
      )}
    </div>
  );
}
