import { supabase } from "./supabase";

const SIGNED_URL_TTL_SECONDS = 3600;
const CACHE_TTL_MS = 50 * 60 * 1000;

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const inFlightSignedUrls = new Map<string, Promise<string | null>>();

export const SAFE_RASTER_DATA_URL_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,",
];

export function isSafeRasterDataUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const lower = value.trim().toLowerCase();
  return SAFE_RASTER_DATA_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function extractPrivateReceiptPath(ref: string | null | undefined): string | null {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("receipts://")) {
    return trimmed.slice("receipts://".length).replace(/^\/+/, "");
  }

  const storageMatch = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/receipts\/([^?#]+)/);
  if (storageMatch?.[1]) {
    try {
      return decodeURIComponent(storageMatch[1]).replace(/^\/+/, "");
    } catch {
      return storageMatch[1].replace(/^\/+/, "");
    }
  }

  if (/^(receipts|signatures|damage-evidence|complaints)\//.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isPrivateReceiptRef(ref: string | null | undefined): boolean {
  return extractPrivateReceiptPath(ref) !== null;
}

export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

export async function resolvePrivateReceiptUrl(
  ref: string | null | undefined
): Promise<string | null> {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().startsWith("data:")) {
    return isSafeRasterDataUrl(trimmed) ? trimmed : null;
  }

  const objectPath = extractPrivateReceiptPath(trimmed);
  if (!objectPath) {
    return /^https:\/\//i.test(trimmed) ? trimmed : null;
  }

  const now = Date.now();
  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const existing = inFlightSignedUrls.get(objectPath);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

      if (!error && data?.signedUrl) {
        signedUrlCache.set(objectPath, {
          url: data.signedUrl,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return data.signedUrl;
      }

      // Graceful fallback for legacy public URLs during Stage 1 -> Stage 2 transition
      if (/^https:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return null;
    } catch {
      return /^https:\/\//i.test(trimmed) ? trimmed : null;
    } finally {
      inFlightSignedUrls.delete(objectPath);
    }
  })();

  inFlightSignedUrls.set(objectPath, promise);
  return promise;
}
