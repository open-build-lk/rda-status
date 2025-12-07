import { useRef, useState, useCallback } from "react";
import { Upload, ImagePlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  currentCount?: number;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// Only allow JPEG/PNG/WebP - iOS will auto-convert HEIC when these are specified
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Accept attribute for file input - forces iOS to convert HEIC to JPEG automatically
const ACCEPT_TYPES = "image/jpeg,image/png,image/webp";

export function FileDropZone({
  onFilesSelected,
  maxFiles = 50,
  currentCount = 0,
  disabled = false,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxFiles - currentCount;

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Please use JPEG, PNG, or WebP format`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 10MB)`);
          continue;
        }
        valid.push(file);
      }

      // Limit to remaining slots
      if (valid.length > remaining) {
        errors.push(`Only ${remaining} more photos allowed`);
        return { valid: valid.slice(0, remaining), errors };
      }

      return { valid, errors };
    },
    [remaining]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        setError(errors[0]);
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input - explicit types force iOS to auto-convert HEIC */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_TYPES}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
          "min-h-[200px]",
          isDragging && !disabled
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
            : "border-gray-300 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={clsx(
              "rounded-full p-4",
              isDragging
                ? "bg-primary-100 dark:bg-primary-900"
                : "bg-gray-100 dark:bg-gray-800"
            )}
          >
            {isDragging ? (
              <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            ) : (
              <ImagePlus className="h-8 w-8 text-gray-500 dark:text-gray-400" />
            )}
          </div>

          <div>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">
              {isDragging ? "Drop photos here" : "Select photos from gallery"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {remaining > 0
                ? `Up to ${remaining} photos remaining`
                : "Maximum photos reached"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled || remaining <= 0}
            className="mt-2 min-h-[44px] min-w-[120px]"
          >
            Browse Photos
          </Button>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            JPEG, PNG, WebP • Max 10MB each
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
