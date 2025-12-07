import { Loader2, Check, X, RefreshCw, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BulkIncident, BulkSubmissionResult } from "@/stores/bulkUpload";
import clsx from "clsx";

interface SubmissionProgressProps {
  incidents: BulkIncident[];
  uploadProgress: Record<string, number>;
  results: BulkSubmissionResult[];
  isSubmitting: boolean;
  onRetry?: (groupIds: string[]) => void;
  onDone?: () => void;
  onViewReports?: () => void;
  onBackToReview?: () => void;
  onStartNew?: () => void;
}

export function SubmissionProgress({
  incidents,
  uploadProgress,
  results,
  isSubmitting,
  onRetry,
  onDone,
  onViewReports,
  onBackToReview,
  onStartNew,
}: SubmissionProgressProps) {
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const totalIncidents = incidents.length;

  // Determine the current state
  const isComplete = results.length === totalIncidents && !isSubmitting;
  const allFailed = isComplete && successCount === 0 && failedCount > 0;
  const allSucceeded = isComplete && successCount === totalIncidents;
  const partialSuccess = isComplete && successCount > 0 && failedCount > 0;

  // Stuck state: not submitting, but also not complete (shouldn't happen, but handle it)
  const isStuck = !isSubmitting && results.length < totalIncidents && results.length === 0;

  const getHeaderText = () => {
    if (isSubmitting) return "Submitting Reports...";
    if (isStuck) return "Submission Not Started";
    if (allSucceeded) return "All Reports Submitted!";
    if (allFailed) return "Submission Failed";
    if (partialSuccess) return "Partially Complete";
    return "Ready to Submit";
  };

  return (
    <div className="space-y-4">
      {/* Overall progress header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>{getHeaderText()}</span>
            {isSubmitting && (
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
            )}
            {allSucceeded && (
              <Check className="h-5 w-5 text-green-600" />
            )}
            {allFailed && (
              <X className="h-5 w-5 text-red-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress summary */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {results.length} of {totalIncidents} processed
            </span>
            {successCount > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" /> {successCount} successful
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <X className="h-4 w-4" /> {failedCount} failed
              </span>
            )}
          </div>

          {/* Overall progress bar */}
          {totalIncidents > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={clsx(
                  "h-full transition-all duration-300",
                  allSucceeded
                    ? "bg-green-500"
                    : allFailed
                    ? "bg-red-500"
                    : failedCount > 0
                    ? "bg-yellow-500"
                    : "bg-primary-500"
                )}
                style={{
                  width: `${(results.length / totalIncidents) * 100}%`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual incident progress */}
      <div className="space-y-2">
        {incidents.map((incident, index) => {
          const result = results.find((r) => r.groupId === incident.groupId);
          const progress = uploadProgress[incident.groupId] || 0;
          const isUploading =
            isSubmitting && !result && Object.keys(uploadProgress).includes(incident.groupId);

          return (
            <div
              key={incident.groupId}
              className={clsx(
                "flex items-center gap-3 rounded-lg border p-3",
                result?.success
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                  : result && !result.success
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  : "border-gray-200 dark:border-gray-700"
              )}
            >
              {/* Status icon */}
              <div
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  result?.success
                    ? "bg-green-100 dark:bg-green-900"
                    : result && !result.success
                    ? "bg-red-100 dark:bg-red-900"
                    : "bg-gray-100 dark:bg-gray-800"
                )}
              >
                {result?.success ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : result && !result.success ? (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                ) : (
                  <span className="text-sm text-gray-500">{index + 1}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {incident.locationName || `Location ${index + 1}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {incident.photos.length} photo{incident.photos.length !== 1 ? "s" : ""}
                  {result?.reportNumber && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                      #{result.reportNumber}
                    </span>
                  )}
                  {result?.error && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      {result.error}
                    </span>
                  )}
                </p>

                {/* Upload progress bar */}
                {isUploading && progress > 0 && progress < 100 && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-primary-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons - show when not actively submitting */}
      {!isSubmitting && (
        <div className="flex flex-col gap-3 pt-4">
          {/* Retry failed */}
          {failedCount > 0 && onRetry && (
            <Button
              onClick={() =>
                onRetry(results.filter((r) => !r.success).map((r) => r.groupId))
              }
              variant="outline"
              className="w-full min-h-[48px]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Failed ({failedCount})
            </Button>
          )}

          {/* View reports - only if some succeeded */}
          {successCount > 0 && onViewReports && (
            <Button
              onClick={onViewReports}
              variant="outline"
              className="w-full min-h-[48px]"
            >
              View Submitted Reports
            </Button>
          )}

          {/* Back to review - show when stuck or all failed */}
          {(isStuck || allFailed) && onBackToReview && (
            <Button
              onClick={onBackToReview}
              variant="outline"
              className="w-full min-h-[48px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Review
            </Button>
          )}

          {/* Start new upload - always show when complete or stuck */}
          {(isComplete || isStuck) && onStartNew && (
            <Button
              onClick={onStartNew}
              variant="outline"
              className="w-full min-h-[48px]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start New Upload
            </Button>
          )}

          {/* Done / Go home */}
          {(isComplete || isStuck) && onDone && (
            <Button onClick={onDone} className="w-full min-h-[48px]">
              {allSucceeded ? "Done" : "Return Home"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
