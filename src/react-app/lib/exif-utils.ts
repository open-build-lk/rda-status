import exifr from "exifr";
import imageCompression from "browser-image-compression";

export interface PhotoWithMetadata {
  id: string;
  file: File;
  preview: string;
  gps: { latitude: number; longitude: number } | null;
  timestamp: Date | null;
  orientation: number | null;
}

// Compress image for upload
// For road damage reports, we don't need high-res images
// Target: ~200-400KB per image, 1280px max dimension
async function compressImage(file: File): Promise<File> {
  // Skip compression for already small files (< 200KB)
  if (file.size < 200 * 1024) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4, // Target ~400KB max
      maxWidthOrHeight: 1280, // Plenty for mobile viewing
      useWebWorker: true,
      preserveExif: true, // Keep GPS and timestamp
      initialQuality: 0.8, // Good quality/size balance
    });

    // Return original if compression made it larger (unlikely but possible for small files)
    if (compressed.size >= file.size) return file;

    console.log(
      `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
    );

    return new File([compressed], file.name, { type: compressed.type });
  } catch (error) {
    console.warn("Image compression failed:", error);
    return file;
  }
}

export async function extractPhotoMetadata(
  file: File
): Promise<PhotoWithMetadata> {
  const id = crypto.randomUUID();

  // Extract EXIF data
  let gps: { latitude: number; longitude: number } | null = null;
  let timestamp: Date | null = null;
  let orientation: number | null = null;

  try {
    const [gpsData, exifData] = await Promise.all([
      exifr.gps(file).catch(() => null),
      exifr
        .parse(file, {
          pick: ["DateTimeOriginal", "CreateDate", "Orientation"],
        })
        .catch(() => null),
    ]);

    gps = gpsData
      ? { latitude: gpsData.latitude, longitude: gpsData.longitude }
      : null;
    timestamp = exifData?.DateTimeOriginal || exifData?.CreateDate || null;
    orientation = exifData?.Orientation || null;
  } catch (error) {
    console.warn("EXIF extraction failed:", error);
  }

  // Compress the image
  const processedFile = await compressImage(file);

  // Create preview from processed file
  const preview = URL.createObjectURL(processedFile);

  return {
    id,
    file: processedFile,
    preview,
    gps,
    timestamp,
    orientation,
  };
}

export async function extractBatch(
  files: File[],
  onProgress?: (pct: number) => void
): Promise<PhotoWithMetadata[]> {
  const results: PhotoWithMetadata[] = [];
  const batchSize = 5;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(extractPhotoMetadata));
    results.push(...batchResults);

    onProgress?.(((i + batch.length) / files.length) * 100);

    // Allow browser to breathe between batches
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
