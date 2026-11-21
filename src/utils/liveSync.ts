/**
 * Single multiplexed, auto-pausing Supabase Realtime Broadcast bus for customer-side.
 *
 * Scalability & Security Guarantees:
 * - Opens AT MOST 1 WebSocket channel (`rpc-live-broadcast-v1`) per active tab for all
 *   public catalog/CMS/slots invalidation signals (0 extra postgres_changes WAL slots).
 * - Automatically disconnects the WebSocket after 15s when the tab is hidden (`visibilitychange`)
 *   and re-syncs once on return with a 10s wake cooldown.
 * - Signal-only: validates event shape and NEVER passes untrusted payload content into UI state;
 *   subscribers re-fetch authoritative, RLS-protected rows directly from PostgreSQL.
 * - Trailing-edge per-key rate limiter + jitter coalesces burst writes and prevents thundering herds.
 */

import { supabase } from "./supabase";

export const LIVE_SYNC_CHANNEL_NAME = "rpc-live-broadcast-v1";

export type CatalogSyncKey = "packages" | "menu" | "inclusions";

type CmsListener = (sections: string[]) => void;
type CatalogListener = (key: CatalogSyncKey) => void;
type SlotsListener = () => void;
type WakeListener = () => void;

const HIDDEN_DISCONNECT_MS = 15_000;
const WAKE_COOLDOWN_MS = 10_000;
const DEBOUNCE_MS = 200;
const MIN_SPACING_MS = 2_500;
const MAX_JITTER_MS = 250;

const VALID_CATALOG_KEYS = new Set<string>(["packages", "menu", "inclusions"]);

const cmsListeners = new Set<CmsListener>();
const catalogListeners = new Set<CatalogListener>();
const slotsListeners = new Set<SlotsListener>();
const wakeListeners = new Set<WakeListener>();

let channel: ReturnType<typeof supabase.channel> | null = null;
let isConnected = false;
let wasPausedOrDisconnected = false;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let lastWakeAt = 0;
let visibilityAttached = false;

const keyTimers = new Map<string, ReturnType<typeof setTimeout>>();
const keyLastRunAt = new Map<string, number>();
const pendingCmsSections = new Set<string>();
let pendingCmsFull = false;

function hasAnyListeners(): boolean {
  return (
    cmsListeners.size > 0 ||
    catalogListeners.size > 0 ||
    slotsListeners.size > 0 ||
    wakeListeners.size > 0
  );
}

function dispatchCms(sections: string[]) {
  cmsListeners.forEach((fn) => {
    try {
      fn(sections);
    } catch (err) {
      console.error("[liveSync] cms listener error:", err);
    }
  });
}

function dispatchCatalog(key: CatalogSyncKey) {
  catalogListeners.forEach((fn) => {
    try {
      fn(key);
    } catch (err) {
      console.error("[liveSync] catalog listener error:", err);
    }
  });
}

function dispatchSlots() {
  slotsListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("[liveSync] slots listener error:", err);
    }
  });
}

function triggerWakeListeners() {
  const now = Date.now();
  if (lastWakeAt > 0 && now - lastWakeAt < WAKE_COOLDOWN_MS) {
    return;
  }
  lastWakeAt = now;
  wakeListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("[liveSync] wake listener error:", err);
    }
  });
}

function scheduleKeyed(rateKey: string, run: () => void) {
  if (keyTimers.has(rateKey)) return;

  const now = Date.now();
  const last = keyLastRunAt.get(rateKey) || 0;
  const elapsed = now - last;
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  const waitMs =
    elapsed >= MIN_SPACING_MS
      ? DEBOUNCE_MS + jitter
      : Math.max(DEBOUNCE_MS, MIN_SPACING_MS - elapsed) + jitter;

  const timer = setTimeout(() => {
    keyTimers.delete(rateKey);
    keyLastRunAt.set(rateKey, Date.now());
    run();
  }, waitMs);

  keyTimers.set(rateKey, timer);
}

function scheduleCms(sections: string[]) {
  if (sections.length === 0) {
    pendingCmsFull = true;
  } else {
    sections.forEach((s) => pendingCmsSections.add(s));
  }

  scheduleKeyed("cms", () => {
    const snapshot = pendingCmsFull ? [] : Array.from(pendingCmsSections);
    pendingCmsSections.clear();
    pendingCmsFull = false;
    dispatchCms(snapshot);
  });
}

function teardownChannel(markPaused: boolean) {
  if (channel) {
    const ch = channel;
    channel = null;
    isConnected = false;
    supabase.removeChannel(ch);
  }
  if (markPaused) {
    wasPausedOrDisconnected = true;
  }
}

function connectChannel() {
  if (channel || typeof window === "undefined") return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    wasPausedOrDisconnected = true;
    return;
  }

  channel = supabase
    .channel(LIVE_SYNC_CHANNEL_NAME, {
      config: { broadcast: { self: false } },
    })
    .on("broadcast", { event: "cms_change" }, (msg: any) => {
      const rawSections = msg?.payload?.sections;
      const safeSections = Array.isArray(rawSections)
        ? rawSections.filter(
            (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 40,
          )
        : [];
      scheduleCms(safeSections);
    })
    .on("broadcast", { event: "catalog_change" }, (msg: any) => {
      const key = msg?.payload?.key;
      if (typeof key !== "string" || !VALID_CATALOG_KEYS.has(key)) return;
      const typedKey = key as CatalogSyncKey;
      scheduleKeyed(`catalog:${typedKey}`, () => dispatchCatalog(typedKey));
    })
    .on("broadcast", { event: "slots_change" }, () => {
      scheduleKeyed("slots", dispatchSlots);
    })
    .subscribe((status) => {
      isConnected = status === "SUBSCRIBED";
      if (status === "SUBSCRIBED") {
        if (wasPausedOrDisconnected) {
          wasPausedOrDisconnected = false;
          triggerWakeListeners();
        }
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        wasPausedOrDisconnected = true;
      }
    });
}

function handleVisibilityChange() {
  if (typeof document === "undefined") return;

  if (document.visibilityState === "hidden") {
    if (hiddenTimer) clearTimeout(hiddenTimer);
    hiddenTimer = setTimeout(() => {
      hiddenTimer = null;
      teardownChannel(true);
    }, HIDDEN_DISCONNECT_MS);
  } else if (document.visibilityState === "visible") {
    if (hiddenTimer) {
      clearTimeout(hiddenTimer);
      hiddenTimer = null;
    }
    if (!hasAnyListeners()) return;

    if (wasPausedOrDisconnected) {
      wasPausedOrDisconnected = false;
      triggerWakeListeners();
    }
    if (!channel) {
      connectChannel();
    }
  }
}

function attachVisibilityHandler() {
  if (visibilityAttached || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  visibilityAttached = true;
}

function detachVisibilityHandler() {
  if (!visibilityAttached || typeof document === "undefined") return;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  visibilityAttached = false;
}

function syncLifecycle() {
  if (hasAnyListeners()) {
    attachVisibilityHandler();
    connectChannel();
  } else {
    if (hiddenTimer) {
      clearTimeout(hiddenTimer);
      hiddenTimer = null;
    }
    keyTimers.forEach((t) => clearTimeout(t));
    keyTimers.clear();
    pendingCmsSections.clear();
    pendingCmsFull = false;
    wasPausedOrDisconnected = false;
    detachVisibilityHandler();
    teardownChannel(false);
  }
}

export function subscribeCmsSync(listener: CmsListener): () => void {
  cmsListeners.add(listener);
  syncLifecycle();
  return () => {
    cmsListeners.delete(listener);
    syncLifecycle();
  };
}

export function subscribeCatalogSync(listener: CatalogListener): () => void {
  catalogListeners.add(listener);
  syncLifecycle();
  return () => {
    catalogListeners.delete(listener);
    syncLifecycle();
  };
}

export function subscribeSlotsSync(listener: SlotsListener): () => void {
  slotsListeners.add(listener);
  syncLifecycle();
  return () => {
    slotsListeners.delete(listener);
    syncLifecycle();
  };
}

export function subscribeWakeSync(listener: WakeListener): () => void {
  wakeListeners.add(listener);
  syncLifecycle();
  return () => {
    wakeListeners.delete(listener);
    syncLifecycle();
  };
}

export function isLiveSyncConnected(): boolean {
  return isConnected;
}

export async function broadcastSlotsChange(): Promise<void> {
  try {
    const payload = { ts: Date.now() };
    if (channel && isConnected) {
      await channel.send({
        type: "broadcast",
        event: "slots_change",
        payload,
      });
    } else {
      const tempCh = channel || supabase.channel(LIVE_SYNC_CHANNEL_NAME);
      const res = await tempCh.httpSend("slots_change", payload);
      if ("error" in res) {
        console.warn("[liveSync] slots httpSend warning:", res.error);
      }
      if (!channel) {
        supabase.removeChannel(tempCh);
      }
    }
  } catch (err) {
    console.warn("[liveSync] slots broadcast warning:", err);
  }
}

export async function broadcastInventoryChange(
  scope: "items" | "deductions" | "movements" | "rules" | "pax_sync" | "all" = "all",
): Promise<void> {
  try {
    const payload = { scope, ts: Date.now() };
    if (channel && isConnected) {
      await channel.send({
        type: "broadcast",
        event: "inventory_change",
        payload,
      });
    } else {
      const tempCh = channel || supabase.channel(LIVE_SYNC_CHANNEL_NAME);
      const res = await tempCh.httpSend("inventory_change", payload);
      if ("error" in res) {
        console.warn("[liveSync] inventory httpSend warning:", res.error);
      }
      if (!channel) {
        supabase.removeChannel(tempCh);
      }
    }
  } catch (err) {
    console.warn("[liveSync] inventory broadcast warning:", err);
  }
}
