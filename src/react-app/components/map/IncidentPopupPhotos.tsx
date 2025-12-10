import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

interface MediaAttachment {
  id: string;
  storageKey: string;
  mediaType: string;
  originalFilename: string | null;
}

interface IncidentPopupPhotosProps {
  reportId: string;
}

export function IncidentPopupPhotos({ reportId }: IncidentPopupPhotosProps) {
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMedia() {
      try {
        const res = await fetch(`/api/v1/reports/${reportId}`);
        if (!res.ok) {
          if (res.status === 403) {
            setMedia([]);
            return;
          }
          throw new Error("Failed to load");
        }
        const data = await res.json() as { media?: MediaAttachment[] };
        if (!cancelled) {
          setMedia(data.media || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load photos");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchMedia();

    return () => {
      cancelled = true;
    };
  }, [reportId]);

  // Handle keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null && prev < media.length - 1 ? prev + 1 : prev
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, media.length]);

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading photos...</span>
      </div>
    );
  }

  if (error || media.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-2 border-t border-gray-100 pt-2">
        <div className="mb-1 flex items-center gap-1 text-xs text-gray-500">
          <ImageIcon className="h-3 w-3" />
          <span>{media.length} photo{media.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {media.slice(0, 4).map((m, idx) => (
            <img
              key={m.id}
              src={`/api/v1/upload/photo/${m.storageKey}`}
              alt="Incident photo"
              className="h-16 w-16 flex-shrink-0 cursor-pointer rounded object-cover transition-opacity hover:opacity-80"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(idx);
              }}
            />
          ))}
          {media.length > 4 && (
            <button
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-500 transition-colors hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(4);
              }}
            >
              +{media.length - 4}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox - rendered via portal to escape popup container */}
      {lightboxIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous button */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Image */}
          <img
            src={`/api/v1/upload/photo/${media[lightboxIndex].storageKey}`}
            alt="Incident photo"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {lightboxIndex < media.length - 1 && (
            <button
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
