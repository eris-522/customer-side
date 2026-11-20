const ALLOWED_GOOGLE_MAPS_HOSTS = new Set([
  "www.google.com",
  "maps.google.com",
]);

/**
 * Sanitizes CMS- or user-provided URLs used in links/buttons so schemes like
 * `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and backslashes
 * (which trigger react-router open-redirect bypasses) are rejected.
 */
export function sanitizeSafeHref(
  raw: string | null | undefined,
  fallback = "/"
): string {
  const val = String(raw || "").trim();
  if (!val || /\\/.test(val)) return fallback;

  if (val.startsWith("/")) {
    return val.startsWith("//") ? fallback : val;
  }

  if (val.startsWith("#")) {
    return val;
  }

  try {
    const parsed = new URL(val);
    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:"
    ) {
      return val;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

/**
 * Validates that an iframe embed URL is strictly HTTPS on Google Maps `/maps/embed`.
 */
export function sanitizeGoogleMapsEmbedUrl(
  raw: string | null | undefined,
  fallback: string
): string {
  const val = String(raw || "").trim();
  if (!val) return fallback;

  try {
    const parsed = new URL(val);
    if (
      parsed.protocol === "https:" &&
      ALLOWED_GOOGLE_MAPS_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.pathname.startsWith("/maps/embed")
    ) {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
