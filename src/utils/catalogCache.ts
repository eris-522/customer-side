/**
 * In-memory client cache for public catalog data (packages, menu items, inclusions).
 * Prevents redundant Supabase requests when users navigate between routes (Home -> Menu -> Packages -> Home).
 */

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let packagesCache: CacheEntry<any[]> | null = null;
let menuCache: CacheEntry<any[]> | null = null;
let inclusionsCache: CacheEntry<Record<string, string[]>> | null = null;

export const catalogCache = {
  getPackages(): any[] | null {
    if (packagesCache && Date.now() - packagesCache.timestamp < DEFAULT_TTL) {
      return packagesCache.data;
    }
    return null;
  },

  setPackages(data: any[]) {
    packagesCache = { data, timestamp: Date.now() };
  },

  getMenuItems(): any[] | null {
    if (menuCache && Date.now() - menuCache.timestamp < DEFAULT_TTL) {
      return menuCache.data;
    }
    return null;
  },

  setMenuItems(data: any[]) {
    menuCache = { data, timestamp: Date.now() };
  },

  getInclusions(): Record<string, string[]> | null {
    if (inclusionsCache && Date.now() - inclusionsCache.timestamp < DEFAULT_TTL) {
      return inclusionsCache.data;
    }
    return null;
  },

  setInclusions(data: Record<string, string[]>) {
    inclusionsCache = { data, timestamp: Date.now() };
  },

  invalidate(key?: "packages" | "menu" | "inclusions") {
    if (!key || key === "packages") packagesCache = null;
    if (!key || key === "menu") menuCache = null;
    if (!key || key === "inclusions") inclusionsCache = null;
  },
};

