import { supabase } from "./supabase";

export const getInventoryItemStatus = (
  stock: number,
  minStock: number,
  rawStatus?: string
): string => {
  if (rawStatus && rawStatus.toLowerCase().trim() === "archived") return "Archived";
  if (stock <= 0) return "Low";
  if (stock <= minStock * 0.5) return "Low";
  if (stock <= minStock) return "Normal";
  return "High";
};

export interface InventoryDeductionItem {
  itemId: string | number;
  itemName: string;
  quantity: number;
  outsourcedQuantity?: number;
  unit: string;
}

/**
 * Automatically restores reserved/allocated equipment supplies to warehouse equipment monitoring
 * whenever a customer cancels an event that was previously confirmed.
 */
export const restoreBookingInventoryOnCancellation = async (
  bookingId: string | number,
  bookingName?: string,
  reason?: string
): Promise<boolean> => {
  const idStr = String(bookingId);

  try {
    // 1. Fetch active deduction record from Supabase
    const { data: deductionRow, error: fetchErr } = await supabase
      .from("inventory_deductions")
      .select("*")
      .eq("booking_id", idStr)
      .maybeSingle();

    if (fetchErr) {
      console.error("[InventoryReturn] Error querying deduction record:", fetchErr.message);
      return false;
    }

    if (!deductionRow) {
      console.log(`[InventoryReturn] No active deduction record found for booking #${idStr}.`);
      return false;
    }

    const itemsToRestore: InventoryDeductionItem[] = Array.isArray(deductionRow.items)
      ? deductionRow.items
      : [];

    // 2. Delete the deduction record first to prevent duplicate restorations
    const { error: delErr } = await supabase
      .from("inventory_deductions")
      .delete()
      .eq("booking_id", idStr);

    if (delErr) {
      console.error("[InventoryReturn] Error removing deduction record:", delErr.message);
    }

    // 3. Fetch current live inventory items from Supabase
    const { data: invRows, error: invErr } = await supabase
      .from("inventory")
      .select("*");

    if (invErr || !invRows) {
      console.error("[InventoryReturn] Error fetching inventory table:", invErr?.message);
      return false;
    }

    const clientName = bookingName || deductionRow.booking_name || "Client";
    const cancelReasonText =
      reason || `Customer cancelled confirmed booking #${idStr} - Equipment returned to inventory`;

    let totalRestoredUnits = 0;

    for (const item of itemsToRestore) {
      const invItem = invRows.find(
        (i: any) =>
          String(i.id) === String(item.itemId) ||
          String(i.name).toLowerCase() === String(item.itemName).toLowerCase()
      );

      if (!invItem) continue;

      if (Number(item.quantity) > 0) {
        const qtyToReturn = Number(item.quantity);
        const prevStock = Number(invItem.stock) || 0;
        const newStock = prevStock + qtyToReturn;
        const minStock = Number(invItem.min_stock) || 0;
        const newStatus = getInventoryItemStatus(newStock, minStock, invItem.status);

        // Update local object in case another record references the same item
        invItem.stock = newStock;
        invItem.status = newStatus;
        totalRestoredUnits += qtyToReturn;

        // Persist returned stock to Supabase
        await supabase
          .from("inventory")
          .update({ stock: newStock, status: newStatus })
          .eq("id", invItem.id);

        // Record stock movement audit
        const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await supabase.from("inventory_stock_movements").insert({
          id: movId,
          item_id: String(invItem.id),
          item_name: invItem.name,
          change: qtyToReturn,
          previous_stock: prevStock,
          new_stock: newStock,
          type: "Booking Return",
          reason: cancelReasonText,
          booking_id: idStr,
          booking_name: clientName,
          timestamp: new Date().toISOString(),
          user_name: "Customer (Self-Service Cancellation)",
        });
      }

      if (Number(item.outsourcedQuantity) > 0) {
        const outsourcedQty = Number(item.outsourcedQuantity);
        const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await supabase.from("inventory_stock_movements").insert({
          id: movId,
          item_id: String(invItem.id),
          item_name: invItem.name,
          change: 0,
          previous_stock: Number(invItem.stock) || 0,
          new_stock: Number(invItem.stock) || 0,
          type: "Outsourced Return",
          reason: `${outsourcedQty} ${item.unit || "pcs"} returned to external supplier (Booking #${idStr}) — not added to warehouse stock`,
          booking_id: idStr,
          booking_name: clientName,
          timestamp: new Date().toISOString(),
          user_name: "Customer (Self-Service Cancellation)",
        });
      }
    }

    // 4. Record customer cancellation in audit logs
    try {
      await supabase.from("audit_logs").insert({
        action: "Customer Cancelled Confirmed Booking",
        target: clientName,
        type: "Update",
        details: `Booking #${idStr} cancelled by customer. Automatically returned ${totalRestoredUnits} allocated equipment units back to equipment monitoring. Reason: ${cancelReasonText}`,
        user_name: "Customer (Self-Service Cancellation)",
      });
    } catch (e) {
      console.warn("[InventoryReturn] Non-critical audit log failure:", e);
    }

    // 5. Notify any listening admin tabs via BroadcastChannel
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

