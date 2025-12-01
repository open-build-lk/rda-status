import { useEffect, useState } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/useCamera";
import { useGeolocation } from "@/hooks/useGeolocation";

interface CameraCaptureProps {
  onCapture: (blob: Blob, coords: { lat: number; lng: number } | null) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, onClose, disabled }: CameraCaptureProps) {
  const { error, isActive, startCamera, stopCamera, capturePhoto, videoRef } = useCamera();
  const { latitude, longitude, getCurrentPosition, loading: gpsLoading } = useGeolocation();
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    getCurrentPosition();

    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = async () => {
    const blob = await capturePhoto();
    if (blob) {
      setCapturedBlob(blob);
      setCapturedPreview(URL.createObjectURL(blob));
    }
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const coords = latitude && longitude ? { lat: latitude, lng: longitude } : null;
      onCapture(capturedBlob, coords);
      stopCamera();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
        <div className="text-white text-center max-w-sm">
          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={() => startCamera()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white">
          <X className="w-6 h-6" />
        </Button>
        <div className="text-white text-sm">
          {gpsLoading ? (
            <span className="text-yellow-400">Getting location...</span>
          ) : latitude && longitude ? (
            <span className="text-green-400">Location captured</span>
          ) : (
            <span className="text-red-400">No location</span>
          )}
        </div>
      </div>

      {/* Camera/Preview */}
      <div className="flex-1 relative overflow-hidden">
        {capturedPreview ? (
          <img
            src={capturedPreview}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/50">
        {capturedPreview ? (
          <div className="flex justify-center gap-8">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetake}
              className="rounded-full w-16 h-16"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={disabled}
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-6 h-6" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleCapture}
              disabled={!isActive || disabled}
              className="rounded-full w-20 h-20 bg-white hover:bg-gray-200"
            >
              <div className="w-16 h-16 rounded-full border-4 border-gray-800" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
