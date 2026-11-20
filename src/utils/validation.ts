export const MAX_GCASH_REF_LENGTH = 13;
export const MIN_GCASH_REF_LENGTH = 9;
export const MAX_BANK_REF_LENGTH = 20;
export const MIN_BANK_REF_LENGTH = 8;

export const FULL_NAME_VALID_REGEX = /^[a-zA-ZÀ-ÿ\sñÑ.'-]+$/;
export const MAX_FULL_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

/**
 * Normalizes a payment reference input as the user types/pastes,
 * or when toggling between GCash (digits) and Bank Transfer (uppercase alphanumeric).
 */
export const sanitizeTransactionReferenceInput = (
  value: string,
  method: "GCash" | "Bank Transfer"
): string => {
  const raw = String(value || "");
  if (method === "GCash") {
    return raw.replace(/\D/g, "").slice(0, MAX_GCASH_REF_LENGTH);
  }
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_BANK_REF_LENGTH);
};

/**
 * Validates GCash (9–13 digits) and Bank Transfer (8–20 uppercase alphanumeric) reference numbers.
 * Returns "" when valid, otherwise a user-facing error message.
 */
export const validateTransactionReference = (
  ref: string,
  method: "GCash" | "Bank Transfer"
): string => {
  const clean = ref.trim();
  if (!clean) {
    return "Please enter your transaction reference number.";
  }

  if (method === "GCash") {
    if (!/^\d+$/.test(clean)) {
      return "GCash reference numbers must contain digits only (no spaces or letters).";
    }
    if (clean.length < MIN_GCASH_REF_LENGTH || clean.length > MAX_GCASH_REF_LENGTH) {
      return `GCash reference numbers must be between ${MIN_GCASH_REF_LENGTH} and ${MAX_GCASH_REF_LENGTH} digits.`;
    }
    return "";
  }

  if (!/^[A-Z0-9]+$/.test(clean.toUpperCase())) {
    return "Bank reference numbers may only contain letters and numbers.";
  }
  if (clean.length < MIN_BANK_REF_LENGTH || clean.length > MAX_BANK_REF_LENGTH) {
    return `Bank transfer reference numbers must be between ${MIN_BANK_REF_LENGTH} and ${MAX_BANK_REF_LENGTH} characters.`;
  }
  if (!/^([A-Z]{0,4}\d{6,20}|\d{8,20})$/.test(clean.toUpperCase())) {
    return "Please enter a valid bank transaction reference number (digits, optionally prefixed by bank code).";
  }
  return "";
};

/**
 * Parses `packages.additional_pax_price` without coercing explicit 0 to 500.
 * Falls back to `fallback` (default 500) only when null, undefined, blank, or non-numeric.
 */
export const parseAdditionalPaxPrice = (raw: unknown, fallback = 500): number => {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
  }
  const str = String(raw).trim();
  if (!str) return fallback;
  const cleaned = str.replace(/[^0-9.-]+/g, "");
  if (!cleaned) return fallback;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/**
 * Validates customer full names including Filipino diacritics (ñ/Ñ) and suffixes (Jr., Ma., -).
 */
export const validateFullName = (name: string): string => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "Full name is required.";
  if (trimmed.length < 2) return "Full name must be at least 2 characters long.";
  if (trimmed.length > MAX_FULL_NAME_LENGTH) {
    return `Full name must not exceed ${MAX_FULL_NAME_LENGTH} characters.`;
  }
  if (!FULL_NAME_VALID_REGEX.test(trimmed)) {
    return "Please enter a valid full name (letters, spaces, ñ, periods, hyphens, and apostrophes only).";
  }
  if (!/[a-zA-ZÀ-ÿñÑ]/.test(trimmed)) {
    return "Full name must contain at least one letter.";
  }
  return "";
};

/**
 * Structural RFC-compatible email validation (supports any valid 2–24 char TLD & 1+ char local part).
 */
export const validateEmailAddress = (email: string): string => {
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed) return "Please enter your email address.";
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return "Email address is too long (maximum 254 characters).";
  }
  if (/\s/.test(trimmed)) {
    return "Email address cannot contain spaces.";
  }
  if (trimmed.includes("..")) {
    return "Email address cannot contain consecutive dots.";
  }
  const emailRegex =
    /^[^\s@]+@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., juandelacruz@gmail.com).";
  }
  return "";
};

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

export const parseLocalDateParts = (dateStr: string): CalendarDateParts | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const datePart = dateStr.trim().split("T")[0];
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
};

export const formatDatePartsYMD = (year: number, month: number, day: number): string => {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/**
 * Adds/subtracts whole calendar days without UTC-midnight or DST day shifts.
 * Sets local time to 12:00 PM so `.toLocaleDateString()` stays exact across timezones.
 */
export const addCalendarDays = (dateStr: string, deltaDays: number): Date | null => {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day + deltaDays, 12, 0, 0);
};

export const getManilaTodayParts = (): CalendarDateParts => {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const parsed = parseLocalDateParts(formatted);
    if (parsed) return parsed;
  } catch {}
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
};

export const getManilaTodayYMD = (): string => {
  const { year, month, day } = getManilaTodayParts();
  return formatDatePartsYMD(year, month, day);
};

export const addDaysToYMD = (ymd: string, deltaDays: number): string => {
  const parts = parseLocalDateParts(ymd);
  if (!parts) return ymd;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays));
  return formatDatePartsYMD(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
};

/**
 * Exact integer calendar-day delta (eventDate - Manila today), DST & timezone independent.
 */
export const diffCalendarDaysFromManilaToday = (eventDateStr: string): number | null => {
  const ev = parseLocalDateParts(eventDateStr);
  if (!ev) return null;
  const today = getManilaTodayParts();
  const evUtc = Date.UTC(ev.year, ev.month - 1, ev.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((evUtc - todayUtc) / 86_400_000);
};
