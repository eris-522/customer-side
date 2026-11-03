import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const STATUS_TTL_MS = 60 * 1000; // 60 seconds

interface CachedStatus {
  status: string;
  timestamp: number;
}

interface CachedProfile {
  profile: any;
  timestamp: number;
}

const statusCache = new Map<string, CachedStatus>();
const profileCache = new Map<string, CachedProfile>();
const inFlightStatus = new Map<string, Promise<string>>();
const inFlightProfile = new Map<string, Promise<any>>();

/**
 * Reads the active user from the local session first (0 network round-trips
 * when unauthenticated or when the JWT is still valid), avoiding redundant
 * GoTrue `/auth/v1/user` hits across concurrent components.
 */
export async function getSessionUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) {
    return null;
  }
  return data.session.user;
}

export function setCachedAccountStatus(userId: string, status: string) {
  const normalized = (status || "").toLowerCase().trim();
  statusCache.set(userId, { status: normalized, timestamp: Date.now() });
}

export function clearSessionGuardCache(userId?: string) {
  if (userId) {
    statusCache.delete(userId);
    profileCache.delete(userId);
  } else {
    statusCache.clear();
    profileCache.clear();
  }
}

/**
 * Deduplicated, cached account status lookup (`active` / `inactive` / `archived`).
 * Prevents App, Navbar, AuthPage, BookingPage, and MyInquiriesPage from firing
 * duplicate `profiles` queries simultaneously on mount or login.
 */
export async function checkAccountStatus(
  userId: string,
  forceRefresh = false,
): Promise<string> {
  if (!userId) return "";

  if (!forceRefresh) {
    const cached = statusCache.get(userId);
    if (cached && Date.now() - cached.timestamp < STATUS_TTL_MS) {
      return cached.status;
    }
  }

  const existing = inFlightStatus.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", userId)
        .maybeSingle();

      const statusLower = (profile?.status || "").toLowerCase().trim();
      statusCache.set(userId, { status: statusLower, timestamp: Date.now() });
      return statusLower;
    } finally {
      inFlightStatus.delete(userId);
    }
  })();

  inFlightStatus.set(userId, promise);
  return promise;
}

/**
 * Deduplicated, cached full profile fetch for BookingPage, also seeding statusCache.
 */
export async function fetchUserProfile(
  userId: string,
  forceRefresh = false,
): Promise<any | null> {
  if (!userId) return null;

  if (!forceRefresh) {
    const cached = profileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < STATUS_TTL_MS) {
      return cached.profile;
    }
  }

  const existing = inFlightProfile.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        profileCache.set(userId, { profile, timestamp: Date.now() });
        setCachedAccountStatus(userId, profile.status || "");
      }
      return profile ?? null;
    } finally {
      inFlightProfile.delete(userId);
    }
  })();

  inFlightProfile.set(userId, promise);
  return promise;
}

