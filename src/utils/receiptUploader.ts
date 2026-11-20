import { supabase } from "./supabase";

export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface CompressedImageResult {
  dataUrl: string;
  blob: Blob;
}

/**
 * Validates and compresses an image file client-side using an HTML Canvas.
 * Blocks oversized files and SVGs, and returns both a JPEG Data URL preview
 * and a lightweight JPEG Blob for private Storage upload.
 */
export async function compressReceiptImage(
  file: File,
  maxDimension = 900,
  quality = 0.7
): Promise<CompressedImageResult> {
  if (!file || typeof file.size !== "number") {
    throw new Error("Invalid file selected.");
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Image file exceeds the 10 MB maximum size limit.");
  }
  const mime = (file.type || "").toLowerCase();
  if (!mime || mime === "image/svg+xml" || !ALLOWED_UPLOAD_MIME_TYPES.has(mime)) {
    throw new Error("Please upload a valid JPG, PNG, or WebP image.");
  }

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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Browser image processor is unavailable."));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              reject(new Error("Failed to encode receipt image."));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to decode image file."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
  });
}

/**
 * Uploads a receipt or complaint image blob strictly to the private 'receipts' bucket.
 * Returns a canonical `receipts://<path>` reference on success, or throws on failure.
 */
export async function uploadReceiptImage(
  blob: Blob,
  userId: string,
  folder: "receipts" | "complaints" = "receipts"
): Promise<string> {
  const sanitizedUser = (userId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedUser) {
    throw new Error("Authenticated user session required to upload payment proof.");
  }
  if (!blob || blob.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Compressed receipt exceeds upload size limit.");
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filePath = `${folder}/${sanitizedUser}/${timestamp}_${randomSuffix}.jpg`;

  const { data, error } = await supabase.storage.from("receipts").upload(filePath, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error || !data?.path) {
    throw new Error(error?.message || "Could not upload receipt image to secure storage.");
  }

  return `receipts://${data.path}`;
}

/**
 * Uploads a client e-signature PNG Data URL strictly to the private 'receipts' bucket.
 * Returns a canonical `receipts://signatures/...` reference on success, or throws on failure.
 */
export async function uploadSignatureDataUrl(
  dataUrl: string,
  userId: string
): Promise<string> {
  if (!dataUrl || !dataUrl.toLowerCase().startsWith("data:image/png;base64,")) {
    throw new Error("Invalid contract signature format.");
  }
  const sanitizedUser = (userId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedUser) {
    throw new Error("Authenticated user session required to store contract signature.");
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob || blob.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Signature image exceeds maximum allowed size.");
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filePath = `signatures/${sanitizedUser}/${timestamp}_${randomSuffix}.png`;

  const { data, error } = await supabase.storage.from("receipts").upload(filePath, blob, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error || !data?.path) {
    throw new Error(error?.message || "Could not upload e-signature to secure storage.");
  }

  return `receipts://${data.path}`;
}
