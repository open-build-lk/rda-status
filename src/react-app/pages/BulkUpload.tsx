import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Upload, AlertCircle, Trash2, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropZone } from "@/components/bulk-upload/FileDropZone";
import { PhotoPreviewGrid } from "@/components/bulk-upload/PhotoPreviewGrid";
import { GroupReviewCard } from "@/components/bulk-upload/GroupReviewCard";
import { SubmissionProgress } from "@/components/bulk-upload/SubmissionProgress";
import { LocationPickerModal } from "@/components/bulk-upload/LocationPickerModal";
import { extractBatch } from "@/lib/exif-utils";
import { groupPhotosByLocation } from "@/lib/location-grouping";
import {
  useBulkUploadStore,
  type BulkSubmissionResult,
} from "@/stores/bulkUpload";
import { useAuthStore } from "@/stores/auth";
import clsx from "clsx";

const MAX_PHOTOS = 50;

export function BulkUpload() {
  const navigate = useNavigate();
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [selectedOrphanIds, setSelectedOrphanIds] = useState<string[]>([]);
  const [isOrphanLocationPickerOpen, setIsOrphanLocationPickerOpen] = useState(false);
  const { user } = useAuthStore();

  // Determine sourceType based on user role
  const sourceType = user?.role === "citizen" ? "citizen" : "field_officer";

  const {
    currentStep,
    allPhotos,
    orphanedPhotos,
    incidents,
    isProcessing,
    processingProgress,
    isSubmitting,
    uploadProgress,
    submissionResults,
    submitError,
    addPhotos,
    removePhoto,
    setGroups,
    updateIncident,
    setStep,
    setProcessing,
    setSubmitting,
    updateUploadProgress,
    setSubmissionResults,
    setSubmitError,
    clearSubmissionState,
    reset,
    createIncidentFromOrphans,
  } = useBulkUploadStore();

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setProcessing(true, 0);
      try {
        const processed = await extractBatch(files, (progress) => {
          setProcessing(true, progress);
        });
        addPhotos(processed);
      } catch (error) {
        console.error("Failed to process photos:", error);
      } finally {
        setProcessing(false);
      }
    },
    [addPhotos, setProcessing]
  );

  // Handle proceeding to review
  const handleProceedToReview = useCallback(() => {
    const { groups, orphaned } = groupPhotosByLocation(allPhotos);
    setGroups(groups, orphaned);
    setExpandedIndex(0);
  }, [allPhotos, setGroups]);

  // Handle submission
  const handleSubmit = useCallback(async () => {
    const incidentsToSubmit = incidents.filter((inc) => inc.isComplete);
    if (incidentsToSubmit.length === 0) {
      setSubmitError("No incidents ready to submit");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setStep("submit");

    const results: BulkSubmissionResult[] = [];

    for (const incident of incidentsToSubmit) {
      try {
        updateUploadProgress(incident.groupId, 10);

        // Check if photos have valid file data (may be missing after page refresh)
        const invalidPhotos = incident.photos.filter((p) => !p.file || !(p.file instanceof Blob));
        if (invalidPhotos.length > 0) {
          throw new Error(
            "Photo data expired. Please go back and re-add your photos. " +
            "(This happens when the page is refreshed after adding photos.)"
          );
        }

        // Step 1: Upload photos in batches of 5 (API limit)
        const BATCH_SIZE = 5;
        const allKeys: string[] = [];
        const totalPhotos = incident.photos.length;

        for (let i = 0; i < totalPhotos; i += BATCH_SIZE) {
          const batch = incident.photos.slice(i, i + BATCH_SIZE);
          const formData = new FormData();
          for (const photo of batch) {
            formData.append("photos", photo.file!, `photo-${photo.id}.jpg`);
          }

          const uploadResponse = await fetch("/api/v1/upload/photos", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error((errorData as { error?: string }).error || "Photo upload failed");
          }

          const uploadData = (await uploadResponse.json()) as { keys: string[] };
          allKeys.push(...uploadData.keys);

          // Update progress based on batch completion
          const batchProgress = 10 + Math.round(((i + batch.length) / totalPhotos) * 40);
          updateUploadProgress(incident.groupId, batchProgress);
        }

        updateUploadProgress(incident.groupId, 50);
        const uploadedKeys = allKeys;

        // Step 2: Create report
        const reportPayload = {
          latitude: incident.centroid.latitude,
          longitude: incident.centroid.longitude,
          province: incident.province || undefined,
          district: incident.district || undefined,
          locationName: incident.locationName || undefined,
          damageType: incident.damageType,
          passabilityLevel: incident.passabilityLevel || undefined,
          // Road classification data
          roadId: incident.selectedRoad?.id || undefined,
          roadNumberInput: incident.roadNumberInput || undefined,
          roadClass: incident.selectedRoad?.roadClass || undefined,
          // Legacy fields for backward compatibility
          isSingleLane: incident.incidentDetails.isSingleLane || false,
          needsSafetyBarriers: incident.incidentDetails.needsSafetyBarriers || false,
          blockedDistanceMeters: incident.incidentDetails.blockedDistanceMeters || undefined,
          // Flexible JSON for all incident details
          incidentDetails: incident.incidentDetails,
          description: incident.description || undefined,
          mediaKeys: uploadedKeys,
          // Flag for manually picked location
          locationPickedManually: incident.locationPickedManually || false,
        };

        const reportResponse = await fetch("/api/v1/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reportPayload),
          credentials: "include",
        });

        if (!reportResponse.ok) {
          const errorData = await reportResponse.json().catch(() => ({}));
          throw new Error((errorData as { error?: string }).error || `Report creation failed (${reportResponse.status})`);
        }

        const report = (await reportResponse.json()) as { id: string; reportNumber: string };
        updateUploadProgress(incident.groupId, 100);

        results.push({
          groupId: incident.groupId,
          success: true,
          reportId: report.id,
          reportNumber: report.reportNumber,
        });
      } catch (error) {
        results.push({
          groupId: incident.groupId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setSubmissionResults(results);
    setSubmitting(false);
  }, [
    incidents,
    sourceType,
    setSubmitting,
    setSubmitError,
    setStep,
    updateUploadProgress,
    setSubmissionResults,
  ]);

  // Handle retry
  const handleRetry = useCallback(
    async (groupIds: string[]) => {
      const incidentsToRetry = incidents.filter((inc) =>
        groupIds.includes(inc.groupId)
      );
      if (incidentsToRetry.length === 0) return;

      setSubmitting(true);
      setStep("submit");

      // Remove failed results before retrying
      const existingSuccessResults = submissionResults.filter(
        (r) => r.success && !groupIds.includes(r.groupId)
      );

      const newResults: BulkSubmissionResult[] = [...existingSuccessResults];

      for (const incident of incidentsToRetry) {
        try {
          updateUploadProgress(incident.groupId, 10);

          // Check if photos have valid file data (may be missing after page refresh)
          const invalidPhotos = incident.photos.filter((p) => !p.file || !(p.file instanceof Blob));
          if (invalidPhotos.length > 0) {
            throw new Error(
              "Photo data expired. Please go back and re-add your photos. " +
              "(This happens when the page is refreshed after adding photos.)"
            );
          }

          // Upload photos in batches of 5 (API limit)
          const BATCH_SIZE = 5;
          const allKeys: string[] = [];
          const totalPhotos = incident.photos.length;

          for (let i = 0; i < totalPhotos; i += BATCH_SIZE) {
            const batch = incident.photos.slice(i, i + BATCH_SIZE);
            const formData = new FormData();
            for (const photo of batch) {
              formData.append("photos", photo.file!, `photo-${photo.id}.jpg`);
            }

            const uploadResponse = await fetch("/api/v1/upload/photos", {
              method: "POST",
              body: formData,
              credentials: "include",
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({}));
              throw new Error((errorData as { error?: string }).error || "Photo upload failed");
            }

            const uploadData = (await uploadResponse.json()) as { keys: string[] };
            allKeys.push(...uploadData.keys);

            const batchProgress = 10 + Math.round(((i + batch.length) / totalPhotos) * 40);
            updateUploadProgress(incident.groupId, batchProgress);
          }

          updateUploadProgress(incident.groupId, 50);

          const reportPayload = {
            latitude: incident.centroid.latitude,
            longitude: incident.centroid.longitude,
            province: incident.province || undefined,
            district: incident.district || undefined,
            locationName: incident.locationName || undefined,
            damageType: incident.damageType,
            passabilityLevel: incident.passabilityLevel || undefined,
            // Road classification data
            roadId: incident.selectedRoad?.id || undefined,
            roadNumberInput: incident.roadNumberInput || undefined,
            roadClass: incident.selectedRoad?.roadClass || undefined,
            // Legacy fields for backward compatibility
            isSingleLane: incident.incidentDetails.isSingleLane || false,
            needsSafetyBarriers: incident.incidentDetails.needsSafetyBarriers || false,
            blockedDistanceMeters: incident.incidentDetails.blockedDistanceMeters || undefined,
            // Flexible JSON for all incident details
            incidentDetails: incident.incidentDetails,
            description: incident.description || undefined,
            mediaKeys: allKeys,
            // Flag for manually picked location
            locationPickedManually: incident.locationPickedManually || false,
          };

          const reportResponse = await fetch("/api/v1/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reportPayload),
            credentials: "include",
          });

          if (!reportResponse.ok) {
            const errorData = await reportResponse.json().catch(() => ({}));
            throw new Error((errorData as { error?: string }).error || `Report creation failed (${reportResponse.status})`);
          }

          const report = (await reportResponse.json()) as { id: string; reportNumber: string };
          updateUploadProgress(incident.groupId, 100);

          newResults.push({
            groupId: incident.groupId,
            success: true,
            reportId: report.id,
            reportNumber: report.reportNumber,
          });
        } catch (error) {
          newResults.push({
            groupId: incident.groupId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      setSubmissionResults(newResults);
      setSubmitting(false);
    },
    [
      incidents,
      sourceType,
      submissionResults,
      setSubmitting,
      setStep,
      updateUploadProgress,
      setSubmissionResults,
    ]
  );

  // Calculate ready count
  const readyCount = incidents.filter((inc) => inc.isComplete).length;
  const hasGpsPhotos = allPhotos.some((p) => p.gps !== null);

  // Non-citizen users can proceed without GPS photos (they can pick location manually)
  const canPickLocationManually = user && user.role !== "citizen";
  const canProceedToReview = allPhotos.length > 0 && (hasGpsPhotos || canPickLocationManually);

  // Toggle orphan photo selection
  const toggleOrphanSelection = (photoId: string) => {
    setSelectedOrphanIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  // Select all orphaned photos
  const selectAllOrphans = () => {
    setSelectedOrphanIds(orphanedPhotos.map((p) => p.id));
  };

  // Handle location confirmation for orphaned photos
  const handleOrphanLocationConfirm = (location: { lat: number; lng: number; address?: string }) => {
    if (selectedOrphanIds.length === 0) return;
    createIncidentFromOrphans(selectedOrphanIds, location);
    setSelectedOrphanIds([]);
    setIsOrphanLocationPickerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Bulk Upload</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-3">
          <StepIndicator
            step={1}
            label="Select"
            isActive={currentStep === "select"}
            isComplete={currentStep !== "select"}
          />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator
            step={2}
            label="Review"
            isActive={currentStep === "review"}
            isComplete={currentStep === "submit" || currentStep === "complete"}
          />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator
            step={3}
            label="Submit"
            isActive={currentStep === "submit" || currentStep === "complete"}
            isComplete={currentStep === "complete"}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6 pb-8">
        {/* Step 1: Select Photos */}
        {currentStep === "select" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Select Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select photos with GPS data from your gallery. Photos at the
                  same location will be grouped into incidents automatically.
                </p>
                <FileDropZone
                  onFilesSelected={handleFilesSelected}
                  maxFiles={MAX_PHOTOS}
                  currentCount={allPhotos.length}
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Photo preview */}
            {(allPhotos.length > 0 || isProcessing) && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Selected Photos</CardTitle>
                    {allPhotos.length > 0 && !isProcessing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reset}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <PhotoPreviewGrid
                    photos={allPhotos}
                    onRemove={removePhoto}
                    isProcessing={isProcessing}
                    processingProgress={processingProgress}
                  />
                </CardContent>
              </Card>
            )}

            {/* Warning for no GPS */}
            {allPhotos.length > 0 && !hasGpsPhotos && (
              <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                canPickLocationManually
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
              }`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {canPickLocationManually
                    ? "No photos have GPS data. You can proceed and pick locations manually on the map."
                    : "No photos have GPS data. Please select photos with location information, or they won't be grouped into incidents."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review Groups */}
        {currentStep === "review" && (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {incidents.length} location groups created
                  </span>
                  <span
                    className={clsx(
                      readyCount === incidents.length
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {readyCount} ready to submit
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Orphaned photos section */}
            {orphanedPhotos.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Photos Without GPS ({orphanedPhotos.length})
                    </CardTitle>
                    {canPickLocationManually && orphanedPhotos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllOrphans}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {canPickLocationManually ? (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Select photos and pick a location to create an incident.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {orphanedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() => toggleOrphanSelection(photo.id)}
                            className={clsx(
                              "relative h-16 w-16 cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                              selectedOrphanIds.includes(photo.id)
                                ? "border-primary-500 ring-2 ring-primary-200"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            )}
                          >
                            <img
                              src={photo.preview}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            {selectedOrphanIds.includes(photo.id) && (
                              <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                                <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {selectedOrphanIds.length > 0 && (
                        <div className="space-y-2">
                          <Button
                            onClick={() => setIsOrphanLocationPickerOpen(true)}
                            className="w-full"
                            size="sm"
                          >
                            <MapPinned className="h-4 w-4 mr-2" />
                            Pick Location for {selectedOrphanIds.length} Photo{selectedOrphanIds.length !== 1 ? "s" : ""}
                          </Button>
                          {/* Copy from existing incident option */}
                          {incidents.filter(inc => inc.centroid.latitude !== 0).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-gray-500 w-full">Or use location from:</span>
                              {incidents
                                .filter(inc => inc.centroid.latitude !== 0)
                                .map((inc, idx) => (
                                  <Button
                                    key={inc.groupId}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                      createIncidentFromOrphans(selectedOrphanIds, {
                                        lat: inc.centroid.latitude,
                                        lng: inc.centroid.longitude,
                                        address: inc.locationName,
                                      });
                                      setSelectedOrphanIds([]);
                                    }}
                                  >
                                    Location {idx + 1}
                                    {inc.locationName && ` (${inc.locationName.slice(0, 20)}${inc.locationName.length > 20 ? "..." : ""})`}
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-100">
                      These photos cannot be included without GPS data.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Group cards */}
            <div className="space-y-3">
              {incidents.map((incident, index) => (
                <GroupReviewCard
                  key={incident.groupId}
                  incident={incident}
                  index={index}
                  total={incidents.length}
                  isExpanded={expandedIndex === index}
                  onToggle={() =>
                    setExpandedIndex(expandedIndex === index ? -1 : index)
                  }
                  onUpdate={(data) => updateIncident(incident.groupId, data)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Submit */}
        {(currentStep === "submit" || currentStep === "complete") && (
          <SubmissionProgress
            incidents={incidents.filter((inc) => inc.isComplete)}
            uploadProgress={uploadProgress}
            results={submissionResults}
            isSubmitting={isSubmitting}
            onRetry={handleRetry}
            onBackToReview={() => {
              clearSubmissionState();
              setStep("review");
            }}
            onStartNew={() => {
              reset();
            }}
            onDone={() => {
              reset();
              navigate("/");
            }}
            onViewReports={() => navigate("/admin/reports")}
          />
        )}

        {/* Error display */}
        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Action buttons - in scrollable content */}
        {currentStep === "select" && canProceedToReview && (
          <Button
            onClick={handleProceedToReview}
            disabled={isProcessing}
            className="w-full min-h-[48px] text-base"
          >
            {hasGpsPhotos ? "Group by Location" : "Continue to Review"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        {currentStep === "review" && (
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={readyCount === 0 || isSubmitting}
              className="w-full min-h-[48px] text-base"
            >
              Submit {readyCount} Report{readyCount !== 1 ? "s" : ""}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              className="w-full min-h-[48px] text-base"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Selection
            </Button>
          </div>
        )}
      </div>

      {/* Location picker modal for orphaned photos */}
      <LocationPickerModal
        isOpen={isOrphanLocationPickerOpen}
        onClose={() => setIsOrphanLocationPickerOpen(false)}
        onConfirm={handleOrphanLocationConfirm}
      />
    </div>
  );
}

function StepIndicator({
  step,
  label,
  isActive,
  isComplete,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={clsx(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          isComplete
            ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
            : isActive
            ? "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        )}
      >
        {isComplete ? "✓" : step}
      </div>
      <span
        className={clsx(
          "text-xs",
          isActive || isComplete
            ? "text-gray-900 dark:text-gray-100"
            : "text-gray-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}
