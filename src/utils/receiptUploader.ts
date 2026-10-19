import { supabase } from "./supabase";

export interface CompressedImageResult {
  dataUrl: string;
  blob: Blob;
}

/**
 * Compresses an image file client-side using an HTML Canvas.
 * Returns both a base64 Data URL (for instant UI preview) and a lightweight Blob (for Storage upload).
 */
export async function compressReceiptImage(
  file: File,
  maxDimension = 900,
  quality = 0.7
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback if 2d context not available
          fetch(event.target?.result as string)
            .then((res) => res.blob())
            .then((blob) => resolve({ dataUrl: event.target?.result as string, blob }))
            .catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              // Fallback blob generation
              fetch(dataUrl)
                .then((res) => res.blob())
                .then((b) => resolve({ dataUrl, blob: b }))
                .catch(reject);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a receipt image blob to Supabase Storage.
 * Attempts standard buckets ('receipts', 'public', 'images', 'cms').
 * Returns the public URL, or null if storage is unavailable (allowing fallback to Data URL).
 */
export async function uploadReceiptImage(
  blob: Blob,
  userId?: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedUser = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, "") : "guest";
    const filePath = `receipts/${sanitizedUser}/${timestamp}_${randomSuffix}.jpg`;

    // Candidate storage buckets in order of preference
    const candidateBuckets = ["receipts", "public", "images", "cms"];

    for (const bucket of candidateBuckets) {
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(filePath, blob, {
          contentType: "image/jpeg",
          cacheControl: "31536000", // 1 year CDN cache
          upsert: true,
        });

        if (!error && data) {
          const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(data.path);
          if (pubData?.publicUrl) {
            console.log(`Receipt successfully uploaded to bucket '${bucket}':`, pubData.publicUrl);
            return pubData.publicUrl;
          }
        }
      } catch (bucketErr) {
        // Continue to try next candidate bucket
      }
    }
  } catch (err) {
    console.warn("Storage upload failed, falling back to data URL:", err);
  }

  return null;
}

