import { useState, useCallback, useRef } from "react";

interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  isActive: boolean;
}

interface UseCameraReturn extends CameraState {
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useCamera(): UseCameraReturn {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isActive: false,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      // Stop any existing stream
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setState({
        stream,
        error: null,
        isActive: true,
      });

      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return true;
    } catch (error) {
      let errorMessage: string;
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage = "Camera access denied. Please enable camera in your browser settings.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera found on this device.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera is in use by another application.";
        } else {
          errorMessage = `Camera error: ${error.message}`;
        }
      } else {
        errorMessage = "An unknown error occurred while accessing the camera.";
      }

      setState({
        stream: null,
        error: errorMessage,
        isActive: false,
      });
      return false;
    }
  }, [state.stream]);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState({
      stream: null,
      error: null,
      isActive: false,
    });
  }, [state.stream]);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !state.stream) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.85 // Quality for compression
      );
    });
  }, [state.stream]);

  return {
    ...state,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
  };
}
