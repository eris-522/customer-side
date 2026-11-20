/**
 * Client cache & TTL revalidation for public catalog data
 * (packages, menu items, inclusions).
 *
 * - Persists to `sessionStorage` + in-memory with a 10-minute TTL so route
 *   navigation and page reloads do not re-query PostgreSQL unnecessarily.
 * - Deduplicates concurrent in-flight fetches.
 * - Uses visibility/focus cooldown checks instead of opening public Realtime WebSockets.
 */

import { supabase } from "./supabase";

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const FOCUS_REVALIDATE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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
    if (parsed && typeof parsed.timestamp === "number" && Date.now() - parsed.timestamp < DEFAULT_TTL) {
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

const listeners = new Set<CatalogListener>();
let lastFocusCheckAt = 0;
let visibilityHandlersAttached = false;

function handleFocusOrVisibility() {
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    return;
  }
  const now = Date.now();
  if (now - lastFocusCheckAt < FOCUS_REVALIDATE_COOLDOWN_MS) {
    return;
  }
  lastFocusCheckAt = now;

  const expiredKeys: CatalogKey[] = [];
  if (!packagesCache || now - packagesCache.timestamp >= DEFAULT_TTL) {
    expiredKeys.push("packages");
  }
  if (!menuCache || now - menuCache.timestamp >= DEFAULT_TTL) {
    expiredKeys.push("menu");
  }
  if (!inclusionsCache || now - inclusionsCache.timestamp >= DEFAULT_TTL) {
    expiredKeys.push("inclusions");
  }

  for (const key of expiredKeys) {
    catalogCache.invalidate(key);
    listeners.forEach((fn) => {
      try {
        fn(key);
      } catch (err) {
        console.error("Catalog listener error:", err);
      }
    });
  }
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
      writeStorage("packages", null);
    }
    if (!key || key === "menu") {
      menuCache = null;
      writeStorage("menu", null);
    }
    if (!key || key === "inclusions") {
      inclusionsCache = null;
      writeStorage("inclusions", null);
    }
  },

  async fetchPackages(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh) {
      const cached = this.getPackages();
      if (cached) return cached;
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

        this.setPackages(sortedPackages);
        return sortedPackages;
      } finally {
        inFlightPackages = null;
      }
    })();

    return inFlightPackages;
  },

  async fetchMenuItems(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh) {
      const cached = this.getMenuItems();
      if (cached) return cached;
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
        this.setMenuItems(items);
        return items;
      } finally {
        inFlightMenu = null;
      }
    })();

    return inFlightMenu;
  },

  async fetchInclusions(forceRefresh = false): Promise<Record<string, string[]>> {
    if (!forceRefresh) {
      const cached = this.getInclusions();
      if (cached) return cached;
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

        this.setInclusions(grouped);
        return grouped;
      } finally {
        inFlightInclusions = null;
      }
    })();

    return inFlightInclusions;
  },

  /**
   * Subscribes to TTL expiration checks on tab focus/visibility (`packages`, `menu`, `inclusions`)
   * without opening anonymous Realtime WebSocket connections.
   */
  subscribe(listener: CatalogListener): () => void {
    listeners.add(listener);
    attachVisibilityHandlers();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        detachVisibilityHandlers();
      }
    };
  },
};
