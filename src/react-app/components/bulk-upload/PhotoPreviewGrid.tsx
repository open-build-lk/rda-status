import { MapPin, X, Loader2 } from "lucide-react";
import type { PhotoWithMetadata } from "@/lib/exif-utils";
import clsx from "clsx";

interface PhotoPreviewGridProps {
  photos: PhotoWithMetadata[];
  onRemove?: (id: string) => void;
  isProcessing?: boolean;
  processingProgress?: number;
  showGpsStatus?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
}

export function PhotoPreviewGrid({
  photos,
  onRemove,
  isProcessing = false,
  processingProgress = 0,
  showGpsStatus = true,
  selectable = false,
  selectedIds = new Set(),
  onSelect,
}: PhotoPreviewGridProps) {
  if (photos.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Processing photos...
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={clsx(
                "relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800",
                selectable && "cursor-pointer",
                selectable &&
                  selectedIds.has(photo.id) &&
                  "ring-2 ring-primary-500 ring-offset-2"
              )}
              onClick={() => selectable && onSelect?.(photo.id)}
            >
              <img
                src={photo.preview}
                alt=""
                className="h-full w-full object-cover"
              />

              {/* GPS indicator */}
              {showGpsStatus && (
                <div
                  className={clsx(
                    "absolute bottom-1 left-1 flex items-center gap-0.5 rounded px-1 py-0.5 text-xs",
                    photo.gps
                      ? "bg-green-500/90 text-white"
                      : "bg-orange-500/90 text-white"
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  {photo.gps ? "GPS" : "No GPS"}
                </div>
              )}

              {/* Remove button */}
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(photo.id);
                  }}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors min-h-[24px] min-w-[24px]"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Selection checkbox */}
              {selectable && (
                <div
                  className={clsx(
                    "absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2",
                    selectedIds.has(photo.id)
                      ? "bg-primary-500 border-primary-500 text-white"
                      : "bg-white/80 border-gray-300"
                  )}
                >
                  {selectedIds.has(photo.id) && (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo count summary */}
      {photos.length > 0 && showGpsStatus && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <MapPin className="h-3.5 w-3.5" />
            {photos.filter((p) => p.gps).length} with GPS
          </span>
          {photos.filter((p) => !p.gps).length > 0 && (
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <MapPin className="h-3.5 w-3.5" />
              {photos.filter((p) => !p.gps).length} without GPS
            </span>
          )}
        </div>
      )}
    </div>
  );
}
