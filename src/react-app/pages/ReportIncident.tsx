import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { PhotoGallery, type Photo } from "@/components/camera/PhotoGallery";
import { IncidentCategorySelect } from "@/components/forms/IncidentCategorySelect";
import { PassabilityScale } from "@/components/forms/PassabilityScale";
import { useIncidentReportStore } from "@/stores/incidentReport";
import { useAuthStore } from "@/stores/auth";

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
    damageType,
    passabilityLevel,
    isSingleLane,
    blockedDistanceMeters,
    anonymousName,
    anonymousContact,
    description,
    isSubmitting,
    submitError,
    submittedReportId,
    claimToken,
    addPhoto,
    removePhoto,
    setDamageType,
    setPassabilityLevel,
    setIsSingleLane,
    setBlockedDistance,
    setAnonymousName,
    setAnonymousContact,
    setDescription,
    setSubmitting,
    setSubmitError,
    setSubmittedReport,
    reset,
  } = useIncidentReportStore();

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
        damageType,
        passabilityLevel: passabilityLevel || undefined,
        isSingleLane,
        blockedDistanceMeters: blockedDistanceMeters || undefined,
        anonymousName: anonymousName || undefined,
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
              <p className="text-gray-600 dark:text-gray-400">
                Thank you for reporting this incident. Your report will be reviewed by our team.
              </p>

              {claimToken && !user && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                    Want to track your report status?
                  </p>
                  <Button
                    onClick={() => navigate("/register", { state: { claimToken, reportId: submittedReportId } })}
                    variant="outline"
                    size="sm"
                  >
                    Create Account
                  </Button>
                </div>
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
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-sm flex items-center justify-center">
                1
              </span>
              Take Photos
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
                Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Incident Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-sm flex items-center justify-center">
                2
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

        {/* Step 3: Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-sm flex items-center justify-center">
                3
              </span>
              Contact Info
              <span className="text-xs text-gray-500 font-normal">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={user?.name || anonymousName}
                onChange={(e) => setAnonymousName(e.target.value)}
                disabled={!!user}
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

        {/* Error message */}
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}
      </div>

      {/* Fixed submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-md mx-auto">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || photos.length === 0 || !damageType}
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
    </div>
  );
}
