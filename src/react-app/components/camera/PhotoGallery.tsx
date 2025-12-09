import { X, MapPin, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export interface Photo {
  id: string;
  blob: Blob;
  preview: string;
  coords: { lat: number; lng: number } | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onRemove: (id: string) => void;
  onAddMore: () => void;
  maxPhotos: number;
  hasGeoPhoto?: boolean;
  locationRequired?: boolean;
  onRetryLocation?: () => void;
}

export function PhotoGallery({
  photos,
  onRemove,
  onAddMore,
  maxPhotos,
  hasGeoPhoto,
  locationRequired,
  onRetryLocation,
}: PhotoGalleryProps) {
  const { t } = useTranslation();
  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("report:photos.count", { current: photos.length, max: maxPhotos })}
        </span>
        {photos.length > 0 && hasGeoPhoto && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {t("report:photos.locationCaptured")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={photo.preview}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {index === 0 && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-600 text-white text-xs rounded">
                {t("report:photos.primary")}
              </div>
            )}
            <button
              onClick={() => onRemove(photo.id)}
              className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {photo.coords && (
              <div className="absolute bottom-1 left-1">
                <MapPin className="w-4 h-4 text-green-400 drop-shadow" />
              </div>
            )}
          </div>
        ))}

        {canAddMore && (
          <button
            onClick={onAddMore}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">{t("report:photos.add")}</span>
          </button>
        )}
      </div>

      {photos.length === 0 && (
        <Button
          onClick={onAddMore}
          variant="outline"
          className="w-full h-32 border-dashed"
        >
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8" />
            <span>{t("report:photos.takePhotoPrompt")}</span>
          </div>
        </Button>
      )}

      {locationRequired && photos.length > 0 && !hasGeoPhoto && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>{t("report:photos.noGpsError")}</p>
            {onRetryLocation && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 dark:text-red-300" onClick={onRetryLocation}>
                {t("report:photos.retakeWithGps")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
