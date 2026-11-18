import { supabase } from "./supabase";
import { ensureSharedBroadcastChannel } from "./catalogCache";

/**
 * Automatically restores reserved/allocated equipment supplies to warehouse equipment monitoring
 * whenever a customer cancels an event that was previously confirmed.
 *
 * The stock arithmetic, movement log and audit entry run server-side in the
 * `restore_booking_inventory_on_cancel` RPC (customers have no direct access to inventory tables
 * under RLS). The RPC only works for the caller's own booking, and only once it is Cancelled,
 * so call this AFTER the booking's status has been updated to "Cancelled".
 */
export const restoreBookingInventoryOnCancellation = async (
  bookingId: string | number,
  bookingName?: string,
  reason?: string
): Promise<boolean> => {
  const idStr = String(bookingId);

  try {
    const { data: restored, error } = await supabase.rpc("restore_booking_inventory_on_cancel", {
      p_booking_id: idStr,
      p_client_name: bookingName || null,
      p_reason: reason || null,
    });

    if (error) {
      console.error("[InventoryReturn] Error restoring equipment:", error.message);
      return false;
    }

    if (!restored) {
      console.log(`[InventoryReturn] No active deduction record found for booking #${idStr}.`);
      return false;
    }

    // Notify any listening admin portals via Supabase Broadcast & local BroadcastChannel
    try {
      const ch = ensureSharedBroadcastChannel();
      await ch.send({ type: "broadcast", event: "inventory_change", payload: { scope: "all", ts: Date.now() } });
      await ch.send({ type: "broadcast", event: "audit_change", payload: { action: "insert", ts: Date.now() } });
    } catch {}
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("equipment_monitoring_channel");
        bc.postMessage({
          type: "equipment_monitoring_sync",
          timestamp: Date.now(),
        });
        bc.close();
      } catch (e) {}
    }

    return true;
  } catch (err) {
    console.error("[InventoryReturn] Unexpected error restoring equipment:", err);
    return false;
  }
};
