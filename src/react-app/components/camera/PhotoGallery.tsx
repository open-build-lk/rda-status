import { X, MapPin, Camera } from "lucide-react";
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
}

export function PhotoGallery({ photos, onRemove, onAddMore, maxPhotos }: PhotoGalleryProps) {
  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Photos ({photos.length}/{maxPhotos})
        </span>
        {photos.length > 0 && photos[0].coords && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Location from photo
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
                Primary
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
            <span className="text-xs">Add</span>
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
            <span>Take a photo of the incident</span>
          </div>
        </Button>
      )}
    </div>
  );
}
