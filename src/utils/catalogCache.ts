/**
 * Client cache & instant Broadcast-invalidated SWR revalidation for public catalog data
 * (packages, menu items, inclusions).
 *
 * - Persists to `sessionStorage` + in-memory with a 10-minute TTL so SPA navigation
 *   does not re-query PostgreSQL unnecessarily.
 * - On fresh page load / F5, serves warm cache immediately (0ms) and performs 1 background
 *   SWR check per key, notifying active views only if data actually changed.
 * - Subscribes via the single multiplexed `liveSync` channel (`rpc-live-broadcast-v1`) so
 *   Admin catalog edits immediately invalidate caches (and re-fetch only for mounted views).
 */

import { supabase } from "./supabase";
import {
  subscribeCatalogSync,
  subscribeWakeSync,
  isLiveSyncConnected,
} from "./liveSync";

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const FOCUS_REVALIDATE_COOLDOWN_MS = 15 * 1000; // 15 seconds (disconnected fallback only)

export type CatalogKey = "packages" | "menu" | "inclusions";
type CatalogListener = (changedKey: CatalogKey) => void;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const STORAGE_KEYS: Record<CatalogKey, string> = {
  packages: "rpc_catalog_packages_v1",
  menu: "rpc_catalog_menu_v1",
  inclusions: "rpc_catalog_inclusions_v1",
};

function readStorage<T>(key: CatalogKey): CacheEntry<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (
      parsed &&
      typeof parsed.timestamp === "number" &&
      Date.now() - parsed.timestamp < DEFAULT_TTL
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

function writeStorage<T>(key: CatalogKey, entry: CacheEntry<T> | null) {
  if (typeof window === "undefined") return;
  try {
    if (!entry) {
      sessionStorage.removeItem(STORAGE_KEYS[key]);
    } else {
      sessionStorage.setItem(STORAGE_KEYS[key], JSON.stringify(entry));
    }
  } catch {}
}

let packagesCache: CacheEntry<any[]> | null = readStorage<any[]>("packages");
let menuCache: CacheEntry<any[]> | null = readStorage<any[]>("menu");
let inclusionsCache: CacheEntry<Record<string, string[]>> | null =
  readStorage<Record<string, string[]>>("inclusions");

let inFlightPackages: Promise<any[]> | null = null;
let inFlightMenu: Promise<any[]> | null = null;
let inFlightInclusions: Promise<Record<string, string[]>> | null = null;

const validatedThisPageLoad: Record<CatalogKey, boolean> = {
  packages: false,
  menu: false,
  inclusions: false,
};

const inFlightSWR: Partial<Record<CatalogKey, Promise<void>>> = {};

const listeners = new Set<CatalogListener>();
let lastFocusCheckAt = 0;
let lastWakeRevalidateAt = 0;
let visibilityHandlersAttached = false;
let syncAttached = false;

function notifyListeners(key: CatalogKey) {
  listeners.forEach((fn) => {
    try {
      fn(key);
    } catch (err) {
      console.error("Catalog listener error:", err);
    }
  });
}

function revalidateInBackground(key: CatalogKey): Promise<void> {
  if (inFlightSWR[key]) return inFlightSWR[key]!;

  const task = (async () => {
    try {
      if (key === "packages") {
        const prevJson = JSON.stringify(packagesCache?.data || []);
        const fresh = await catalogCache.fetchPackages(true);
        if (JSON.stringify(fresh) !== prevJson) {
          notifyListeners("packages");
        }
      } else if (key === "menu") {
        const prevJson = JSON.stringify(menuCache?.data || []);
        const fresh = await catalogCache.fetchMenuItems(true);
        if (JSON.stringify(fresh) !== prevJson) {
          notifyListeners("menu");
        }
      } else if (key === "inclusions") {
        const prevJson = JSON.stringify(inclusionsCache?.data || {});
        const fresh = await catalogCache.fetchInclusions(true);
        if (JSON.stringify(fresh) !== prevJson) {
          notifyListeners("inclusions");
        }
      }
    } finally {
      delete inFlightSWR[key];
    }
  })();

  inFlightSWR[key] = task;
  return task;
}

function ensureSyncAttached() {
  if (syncAttached || typeof window === "undefined") return;
  syncAttached = true;

  subscribeCatalogSync((key) => {
    catalogCache.invalidate(key);
    notifyListeners(key);
  });

  subscribeWakeSync(() => {
    const now = Date.now();
    if (now - lastWakeRevalidateAt < FOCUS_REVALIDATE_COOLDOWN_MS) return;
    lastWakeRevalidateAt = now;

    catalogCache.invalidate();
    if (listeners.size === 0) return;
    (["packages", "menu", "inclusions"] as CatalogKey[]).forEach(notifyListeners);
  });
}

function handleFocusOrVisibility() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return;
  }
  // When WebSocket broadcast channel is live, focus switches need 0 DB queries
  if (isLiveSyncConnected()) {
    return;
  }
  const now = Date.now();
  if (now - lastFocusCheckAt < FOCUS_REVALIDATE_COOLDOWN_MS) {
    return;
  }
  lastFocusCheckAt = now;

  (["packages", "menu", "inclusions"] as CatalogKey[]).forEach((key) => {
    catalogCache.invalidate(key);
    notifyListeners(key);
  });
}

function attachVisibilityHandlers() {
  if (visibilityHandlersAttached || typeof window === "undefined") return;
  window.addEventListener("focus", handleFocusOrVisibility);
  document.addEventListener("visibilitychange", handleFocusOrVisibility);
  visibilityHandlersAttached = true;
}

function detachVisibilityHandlers() {
  if (!visibilityHandlersAttached || typeof window === "undefined") return;
  window.removeEventListener("focus", handleFocusOrVisibility);
  document.removeEventListener("visibilitychange", handleFocusOrVisibility);
  visibilityHandlersAttached = false;
}

export const catalogCache = {
  getPackages(): any[] | null {
    if (packagesCache && Date.now() - packagesCache.timestamp < DEFAULT_TTL) {
      return packagesCache.data;
    }
    const stored = readStorage<any[]>("packages");
    if (stored) {
      packagesCache = stored;
      return stored.data;
    }
    return null;
  },

  setPackages(data: any[]) {
    const entry = { data, timestamp: Date.now() };
    packagesCache = entry;
    writeStorage("packages", entry);
  },

  getMenuItems(): any[] | null {
    if (menuCache && Date.now() - menuCache.timestamp < DEFAULT_TTL) {
      return menuCache.data;
    }
    const stored = readStorage<any[]>("menu");
    if (stored) {
      menuCache = stored;
      return stored.data;
    }
    return null;
  },

  setMenuItems(data: any[]) {
    const entry = { data, timestamp: Date.now() };
    menuCache = entry;
    writeStorage("menu", entry);
  },

  getInclusions(): Record<string, string[]> | null {
    if (inclusionsCache && Date.now() - inclusionsCache.timestamp < DEFAULT_TTL) {
      return inclusionsCache.data;
    }
    const stored = readStorage<Record<string, string[]>>("inclusions");
    if (stored) {
      inclusionsCache = stored;
      return stored.data;
    }
    return null;
  },

  setInclusions(data: Record<string, string[]>) {
    const entry = { data, timestamp: Date.now() };
    inclusionsCache = entry;
    writeStorage("inclusions", entry);
  },

  invalidate(key?: CatalogKey) {
    if (!key || key === "packages") {
      packagesCache = null;
      validatedThisPageLoad.packages = false;
      writeStorage("packages", null);
    }
    if (!key || key === "menu") {
      menuCache = null;
      validatedThisPageLoad.menu = false;
      writeStorage("menu", null);
    }
    if (!key || key === "inclusions") {
      inclusionsCache = null;
      validatedThisPageLoad.inclusions = false;
      writeStorage("inclusions", null);
    }
  },

  async fetchPackages(forceRefresh = false): Promise<any[]> {
    ensureSyncAttached();
    if (!forceRefresh) {
      const cached = this.getPackages();
      if (cached) {
        if (!validatedThisPageLoad.packages) {
          void revalidateInBackground("packages");
        }
        return cached;
      }
    }
    if (inFlightPackages) return inFlightPackages;

    inFlightPackages = (async () => {
      try {
        const { data, error } = await supabase
          .from("packages")
          .select(
            "id, name, price, pax, additional_pax_price, inclusions, status, tag, image_url, category_limits",
          )
          .neq("status", "Archived")
          .neq("status", "none")
          .neq("status", "None");

        if (error) {
          console.error("Error fetching packages:", error.message);
          return packagesCache?.data || [];
        }

        const sortedPackages = [...(data || [])].sort((a: any, b: any) => {
          const priceA = parseFloat(String(a.price || "0").replace(/[^0-9.-]+/g, ""));
          const priceB = parseFloat(String(b.price || "0").replace(/[^0-9.-]+/g, ""));
          return priceA - priceB;
        });

        validatedThisPageLoad.packages = true;
        this.setPackages(sortedPackages);
        return sortedPackages;
      } finally {
        inFlightPackages = null;
      }
    })();

    return inFlightPackages;
  },

  async fetchMenuItems(forceRefresh = false): Promise<any[]> {
    ensureSyncAttached();
    if (!forceRefresh) {
      const cached = this.getMenuItems();
      if (cached) {
        if (!validatedThisPageLoad.menu) {
          void revalidateInBackground("menu");
        }
        return cached;
      }
    }
    if (inFlightMenu) return inFlightMenu;

    inFlightMenu = (async () => {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("id, name, category, status, sub_category, image_url")
          .neq("status", "Archived");

        if (error) {
          console.error("Error fetching menu items:", error.message);
          return menuCache?.data || [];
        }

        const items = data || [];
        validatedThisPageLoad.menu = true;
        this.setMenuItems(items);
        return items;
      } finally {
        inFlightMenu = null;
      }
    })();

    return inFlightMenu;
  },

  async fetchInclusions(forceRefresh = false): Promise<Record<string, string[]>> {
    ensureSyncAttached();
    if (!forceRefresh) {
      const cached = this.getInclusions();
      if (cached) {
        if (!validatedThisPageLoad.inclusions) {
          void revalidateInBackground("inclusions");
        }
        return cached;
      }
    }
    if (inFlightInclusions) return inFlightInclusions;

    inFlightInclusions = (async () => {
      try {
        const { data, error } = await supabase
          .from("inclusions")
          .select("id, category, items")
          .not("category", "like", "__CMS_%");

        if (error) {
          console.error("Error fetching inclusions:", error.message);
          return inclusionsCache?.data || {};
        }

        const grouped: Record<string, string[]> = {};
        (data || []).forEach((row: any) => {
          if (row.category && !row.category.startsWith("__CMS_")) {
            if (!grouped[row.category]) grouped[row.category] = [];
            if (row.items && row.items.trim() !== "" && row.items !== "-") {
              if (!grouped[row.category].includes(row.items)) {
                grouped[row.category].push(row.items);
              }
            }
          }
        });

        validatedThisPageLoad.inclusions = true;
        this.setInclusions(grouped);
        return grouped;
      } finally {
        inFlightInclusions = null;
      }
    })();

    return inFlightInclusions;
  },

  /**
   * Subscribes to live Broadcast invalidations, SWR updates, and disconnected
   * focus fallback checks (`packages`, `menu`, `inclusions`).
   */
  subscribe(listener: CatalogListener): () => void {
    listeners.add(listener);
    ensureSyncAttached();
    attachVisibilityHandlers();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        detachVisibilityHandlers();
      }
    };
  },
};
