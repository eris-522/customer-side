import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  unreadCount: number;
  readIds?: string[];
  onDismiss?: (id: string) => void;
}

export function NotificationCenter({ isOpen, onClose, notifications, unreadCount, readIds = [], onDismiss }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readDuringSession, setReadDuringSession] = useState<string[]>([]);

  const getNotifKey = (item: any) => {
    if (item.notifKey) return item.notifKey;
    if (item.notifType === "excess_headcount") {
      return `${item.id}-excess-headcount-${item.excessBilling?.excess_guest_fee}-${item.notifTimestamp}`;
    }
    if (item.notifType === "excess_headcount_removed") {
      return `${item.id}-excess-removed-${item.notifTimestamp}`;
    }
    if (item.notifType === "rain_laundry") {
      return `${item.id}-rain-laundry-${item.rainAction}-${item.notifTimestamp || item.logistics_info?.rainLaundryLastActionAt}`;
    }
    if (item.notifType === "day_of_overtime") return item.notifKey || `${item.id}-dayof-ot-${item.dayOfOT?.total_day_of_fee}-${item.notifTimestamp}`;
    if (item.notifType === "logistics") {
      const travel = Number(item.logistics_info?.travelFee) || 0;
      const hauling = Number(item.logistics_info?.haulingFee) || 0;
      const logTimestamp = item.logistics_info?.logistics_fees_updated_at || "";
      return `${item.id}-logistics-${travel}-${hauling}${logTimestamp ? `-${logTimestamp}` : ""}`;
    }
    return `${item.id}-${item.status}`;
  };

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setReadDuringSession([]);
      }, 200);
    }
  }, [isOpen]);

  const formatNotifDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const sortedNotifications = [...notifications].sort((a: any, b: any) => {
    const keyA = getNotifKey(a);
    const keyB = getNotifKey(b);
    const isUnreadA = !readIds.includes(keyA) || readDuringSession.includes(keyA);
    const isUnreadB = !readIds.includes(keyB) || readDuringSession.includes(keyB);

    if (isUnreadA && !isUnreadB) return -1;
    if (!isUnreadA && isUnreadB) return 1;

    const timeA = new Date(a.notifTimestamp || a.logistics_info?.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.notifTimestamp || b.logistics_info?.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-4 w-80 md:w-96 glass-card border border-[#E6DFD3] dark:border-white/10 shadow-2xl z-[100] max-h-[400px] overflow-hidden flex flex-col rounded-xl"
        >
          <div className="p-4 border-b border-[#E6DFD3] dark:border-white/10 sticky top-0 bg-stone-100/95 dark:bg-[#070707] z-10 flex items-center justify-between backdrop-blur-md">
            <h3 className="font-serif text-lg text-gold-500 dark:text-gold-400 italic">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={() => {
                    const newlyRead: string[] = [];
                    notifications.forEach((n: any) => {
                      const key = getNotifKey(n);
                      if (!readIds.includes(key)) newlyRead.push(key);
                    });
                    setReadDuringSession(prev => [...prev, ...newlyRead]);
                    newlyRead.forEach((id: string) => onDismiss && onDismiss(id));
                  }}
                  className="text-[10px] font-bold text-gold-500 dark:text-gold-400 hover:text-stone-900 dark:hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors text-stone-500 dark:text-white/50 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-rich-black text-left scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <Bell className="text-stone-300 dark:text-white/10 mb-4" size={32} />
                <p className="text-stone-500 dark:text-white/40 text-sm font-medium">No updates right now.</p>
              </div>
            ) : (
              sortedNotifications.map((notif: any) => {
                const notifKey = getNotifKey(notif);
                const isExpanded = expandedId === notifKey;
                const travelFeeVal = Number(notif.logistics_info?.travelFee) || 0;
                const haulingFeeVal = Number(notif.logistics_info?.haulingFee) || 0;
                const isLogisticsUpdate = notif.notifType === 'logistics';
                const isCancelled =
                  !isLogisticsUpdate &&
                  ['Cancelled', 'Declined', 'Rejected'].includes(notif.status);
                const isConfirmed =
                  !isLogisticsUpdate &&
                  notif.notifType === 'status' &&
                  ['Confirmed', 'Accepted', 'Approved'].includes(notif.status);
                const reason = notif.reason || notif.reject_reason || notif.cancellation_reason || notif.admin_notes;
                const isUnreadNotif = !readIds.includes(notifKey);

                return (
                  <div 
                    key={notifKey} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : notifKey);
                      if (isUnreadNotif && onDismiss) {
                        setReadDuringSession(prev => [...prev, notifKey]);
                        onDismiss(notifKey);
                      }
                    }}
                    className={`p-4 border-b border-[#E6DFD3] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group ${isUnreadNotif && !isCancelled ? 'bg-gold-500/5 dark:bg-white/5' : ''} ${isCancelled ? 'bg-red-500/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div>
                        <p className="text-sm text-white/90 font-semibold">
                          {notif.notifType === 'dish_restored' ? (
                            <>
                              Dish Available Again for {notif.event_date}:{" "}
                              <span className="text-green-400 font-bold">
                                "{notif.original_dish}" {notif.restored_to_menu ? "restored to your menu" : "is available again"}
                              </span>
                            </>
                          ) : notif.notifType === 'substitution' ? (
                            <>
                              Dish Substituted for {notif.event_date}:{" "}
                              <span className="text-amber-400 font-bold">
                                "{notif.original_dish}" ➔ "{notif.replacement_dish}"
                              </span>
                            </>
                          ) : notif.notifType === 'modification' ? (
                            <>
                              Menu &amp; Event Changes for {notif.event_date}:{" "}
                              <span className={notif.modStatus === 'Approved' ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                                {notif.modStatus === 'Approved' ? "Confirmed by Coordinator" : "Declined / Reverted"}
                              </span>
                            </>
                          ) : notif.notifType === 'excess_headcount' ? (
                            <>
                              Excess Headcount Surcharge Applied for {notif.event_date}:{" "}
                              <span className="text-rose-400 font-bold">
                                +₱{Number(notif.excessFee ?? notif.excessBilling?.excess_guest_fee ?? 0).toLocaleString()}
                              </span>
                            </>
                          ) : notif.notifType === 'excess_headcount_removed' ? (
                            <>
                              Excess Headcount Surcharge Removed for {notif.event_date}:{" "}
                              <span className="text-emerald-400 font-bold">
                                Waived / Cleared
                              </span>
                            </>
                          ) : notif.notifType === 'damage_invoice' ? (
                            <>
                              Equipment Damage Invoice Issued for {notif.event_date}:{" "}
                              <span className="text-orange-400 font-bold">
                                +₱{Number(notif.damageFee ?? notif.damageAppraisal?.total_damage_fee ?? 0).toLocaleString()}
                              </span>
                            </>
                          ) : notif.notifType === 'damage_invoice_removed' ? (
                            <>
                              Equipment Damage Invoice Cleared for {notif.event_date}:{" "}
                              <span className="text-emerald-400 font-bold">
                                Waived / Cleared
                              </span>
                            </>
                          ) : notif.notifType === 'complaint_resolved' ? (
                            <>
                              Post-Event Feedback Update ({notif.event_date}):{" "}
                              <span className="text-gold-400 font-bold">
                                {notif.complaintItem?.status || "Updated"}
                              </span>
                            </>
                          ) : notif.notifType === 'day_of_overtime' ? (
                            <>
                              Overtime Surcharge Applied for {notif.event_date}:{" "}
                              <span className="text-amber-400 font-bold">
                                +{notif.dayOfOT?.billable_ot_hours}h OT (₱{Number(notif.dayOfOT?.total_day_of_fee || 0).toLocaleString()})
                              </span>
                            </>
                          ) : notif.notifType === 'rain_laundry' ? (
                            <>
                              {notif.rainAction === 'removed' ? (
                                <>
                                  Rain Laundry Surcharge Removed for {notif.event_date}:{" "}
                                  <span className="text-emerald-400 font-bold">
                                    -₱{Number(notif.rainFee || 2000).toLocaleString()} (Waived)
                                  </span>
                                </>
                              ) : (
                                <>
                                  Rain Laundry Surcharge Applied for {notif.event_date}:{" "}
                                  <span className="text-amber-400 font-bold">
                                    +₱{Number(notif.rainFee || 2000).toLocaleString()}
                                  </span>
                                </>
                              )}
                            </>
                          ) : notif.notifType === 'balance_verified' ? (
                            <>
                              Final Balance for {notif.event_date} was{" "}
                              <span className="text-green-400 font-bold">Verified &amp; Settled</span>.
                            </>
                          ) : isLogisticsUpdate ? (
                            <>
                              Logistics fees updated for {notif.event_date}:{" "}
                              <span className="text-gold-400 font-bold">
                                {travelFeeVal > 0 || haulingFeeVal > 0 ? (
                                  <>
                                    {travelFeeVal > 0 && `Travel: ₱${travelFeeVal.toLocaleString()}`}
                                    {travelFeeVal > 0 && haulingFeeVal > 0 && " • "}
                                    {haulingFeeVal > 0 && `Hauling: ₱${haulingFeeVal.toLocaleString()}`}
                                  </>
                                ) : (
                                  "₱0 Surcharge"
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              Booking for {notif.event_date} was <span className={isCancelled ? "text-red-400 font-bold" : "text-emerald-800 dark:text-green-400 font-bold"}>{notif.status}</span>.
                            </>
                          )}
                          {isUnreadNotif && (
                            <span className="inline-block ml-2 w-2 h-2 rounded-full bg-gold-400 animate-pulse"></span>
                          )}
                        </p>
                        <span className="text-[10px] text-white/40 mt-1 block">
                          {formatNotifDate(notif.notifTimestamp || notif.logistics_info?.updated_at || notif.created_at)}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium bg-gold-400/10 text-gold-400 px-2 py-0.5 rounded shrink-0">
                        {isExpanded ? "Hide" : "View"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 animate-in slide-in-from-top-1 fade-in duration-200">
                        {notif.notifType === 'excess_headcount' && (
                          <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/25 rounded-md space-y-1.5 text-xs text-rose-200">
                            <div className="text-rose-300 font-bold">
                              <span>Excess Headcount Surcharge: +₱{Number(notif.excessFee ?? notif.excessBilling?.excess_guest_fee ?? 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] text-[#4A3828] dark:text-white/80">
                              Actual headcount served was <strong>{notif.excessActual ?? notif.excessBilling?.actual_headcount_served} guests</strong> vs <strong>{notif.excessGuaranteed ?? notif.excessBilling?.guaranteed_headcount} guaranteed</strong> (+{notif.excessGuests ?? notif.excessBilling?.excess_guests} attendee(s) beyond guaranteed count @ ₱500/pax).
                            </p>
                            <p className="text-[10px] text-[#881337] dark:text-rose-300/80">
                              Due Date: <span className="font-semibold">{notif.excessDueDate || notif.excessBilling?.due_date || "Next Day"}</span> • Status: <strong className="text-[#9F1239] dark:text-rose-300">{notif.excessBilling?.payment_status || "Unpaid"}</strong>
                            </p>
                            <p className="text-[10px] text-[#7A4510] dark:text-gold-400 font-medium pt-1 border-t border-rose-500/20">
                              ✓ You can settle this excess surcharge directly in the Payments section below.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'excess_headcount_removed' && (
                          <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md space-y-1.5 text-xs text-emerald-200">
                            <div className="font-bold text-emerald-300">
                              Excess Headcount Surcharge Removed (Waived)
                            </div>
                            <p className="text-[11px] text-white/80">
                              The post-event excess headcount surcharge for {notif.event_date} was waived/cleared by the catering coordinator.
                            </p>
                            <p className="text-[10px] text-gold-400 font-medium pt-1 border-t border-emerald-500/20">
                              ✓ Surcharge cleared. No further excess balance is due.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'damage_invoice' && (
                          <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/25 rounded-md space-y-1.5 text-xs text-orange-200">
                            <div className="text-orange-300 font-bold">
                              Equipment Damage &amp; Loss Invoice: +₱{Number(notif.damageFee ?? notif.damageAppraisal?.total_damage_fee ?? 0).toLocaleString()}
                            </div>
                            <p className="text-[11px] text-[#4A3828] dark:text-white/80">
                              {notif.damageItemCount || 1} damaged or missing catering item(s) were appraised during post-event warehouse reconciliation (Clause 13).
                            </p>
                            <p className="text-[10px] text-[#7C2D12] dark:text-orange-300/80">
                              Due Date: <span className="font-semibold">{notif.damageDueDate || notif.damageAppraisal?.due_date || "Post-Event"}</span> • Status: <strong className="text-[#9A3412] dark:text-orange-300">{notif.damageAppraisal?.payment_status || "Unpaid"}</strong>
                            </p>
                            <p className="text-[10px] text-[#7A4510] dark:text-gold-400 font-medium pt-1 border-t border-orange-500/20">
                              ✓ View itemized photos and settle this separate post-event invoice in My Inquiries.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'damage_invoice_removed' && (
                          <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md space-y-1.5 text-xs text-emerald-200">
                            <div className="font-bold text-emerald-300">
                              Equipment Damage Invoice Cleared (Waived)
                            </div>
                            <p className="text-[11px] text-white/80">
                              The post-event equipment damage appraisal for {notif.event_date} was cleared by the coordinator.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'complaint_resolved' && (
                          <div className="mb-3 p-3 bg-gold-400/10 border border-gold-400/25 rounded-md space-y-1.5 text-xs">
                            <div className="font-bold text-gold-300">
                              {notif.complaintItem?.subject || "Post-Event Feedback"} · {notif.complaintItem?.status || "Updated"}
                            </div>
                            {notif.complaintItem?.resolution_notes && (
                              <p className="text-[11px] text-white/85">
                                &ldquo;{notif.complaintItem.resolution_notes}&rdquo;
                              </p>
                            )}
                            <p className="text-[10px] text-gold-400 font-medium pt-1 border-t border-gold-400/20">
                              ✓ View full resolution details under Feedback &amp; Disputes in My Inquiries.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'day_of_overtime' && (
                          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-amber-300 font-bold">
                              <span>Day-of Event Overtime Billed: +₱{Number(notif.dayOfOT?.total_day_of_fee || 0).toLocaleString()}</span>
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20">Contract 1m = 1h OT</span>
                            </div>
                            <p className="text-[11px] text-white/80">
                              Event ended at <strong>{notif.dayOfOT?.actual_end_time}</strong> ({notif.dayOfOT?.minutes_over} mins over scheduled end • {notif.dayOfOT?.billable_ot_hours} billable hours).
                            </p>
                            {Array.isArray(notif.dayOfOT?.services_billed) && notif.dayOfOT.services_billed.length > 0 && (
                              <p className="text-[10px] text-white/60">
                                Extended Services: {notif.dayOfOT.services_billed.map((s: any) => `${s.name} (+₱${Number(s.subtotal).toLocaleString()})`).join(" • ")}
                              </p>
                            )}
                            <p className="text-[10px] text-gold-400 font-medium pt-1 border-t border-amber-500/20">
                              ✓ Added to your final invoice balance. You can review the updated ledger below.
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'rain_laundry' && (
                          <div className={`mb-3 p-3 border rounded-md space-y-1.5 text-xs ${
                            notif.rainAction === 'removed'
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-200"
                          }`}>
                            <div className="font-bold">
                              <span className={notif.rainAction === 'removed' ? "text-emerald-300" : "text-amber-300"}>
                                {notif.rainAction === 'removed'
                                  ? "Rain Laundry Charge Removed (-₱2,000)"
                                  : "Outdoor Rain / Laundry Surcharge (+₱2,000)"}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/80">
                              {notif.rainAction === 'removed'
                                ? "The ₱2,000.00 rain laundry surcharge was removed by the catering coordinator. Your final invoice balance has been adjusted."
                                : "A ₱2,000.00 laundry charge was applied for soiled banquet linens due to rain without client-provided tents at your outdoor venue."}
                            </p>
                            <p className="text-[10px] text-gold-400 font-medium pt-1 border-t border-white/10">
                              {notif.rainAction === 'removed'
                                ? "✓ Final balance recalculated and reduced in your ledger."
                                : "✓ Added to your final invoice balance. You can review the updated breakdown below."}
                            </p>
                          </div>
                        )}
                        {isCancelled && reason && (
                          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-md">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Reason</p>
                            <p className="text-xs text-white/80 italic">"{reason}"</p>
                          </div>
                        )}
                        {notif.notifType === 'dish_restored' && (
                          <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-xs space-y-1">
                            <p className="text-emerald-300 font-semibold">
                              Good news! "{notif.original_dish}" is back in stock for your event date.
                            </p>
                            <p className="text-white/80 text-[11px]">
                              {notif.restored_to_menu
                                ? `The coordinator has restored "${notif.original_dish}" directly to your selected menu.`
                                : `You may reselect "${notif.original_dish}" anytime before the 14-day cutoff in My Inquiries.`}
                            </p>
                          </div>
                        )}
                        {notif.notifType === 'substitution' && (
                          <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs space-y-1">
                            <p className="text-amber-300 font-semibold">
                              Replacement: {notif.replacement_dish} (was {notif.original_dish})
                            </p>
                            <p className="text-white/80 text-[11px]">
                              Reason: {notif.subReason || "Market ingredient availability"}
                            </p>
                            {notif.subNote && (
                              <p className="text-white/60 text-[10px] italic">
                                "{notif.subNote}"
                              </p>
                            )}
                          </div>
                        )}
                        {notif.notifType === 'modification' && (
                          <div className="mb-3 p-2.5 bg-gold-400/10 border border-gold-400/30 rounded-md text-xs space-y-1">
                            <p className="text-gold-300 font-semibold">
                              Status: {notif.modStatus}
                            </p>
                            {notif.modReason && (
                              <p className="text-white/80 text-[11px]">
                                Coordinator note: {notif.modReason}
                              </p>
                            )}
                          </div>
                        )}
                        {isLogisticsUpdate && notif.notifType === 'logistics' && (
                          <div className="mb-3 p-2.5 bg-gold-400/10 border border-gold-400/30 rounded-md text-xs space-y-1">
                            <p className="text-gold-300 font-semibold">
                              {travelFeeVal > 0 && `Out-of-Town Travel Fee: ₱${travelFeeVal.toLocaleString()}`}
                              {travelFeeVal > 0 && haulingFeeVal > 0 && " • "}
                              {haulingFeeVal > 0 && `Hauling Fee: ₱${haulingFeeVal.toLocaleString()}`}
                            </p>
                            <p className="text-white/70 text-[11px]">
                              Coordinator updated your logistics surcharges. The balance has been recalculated in My Inquiries.
                            </p>
                          </div>
                        )}
                        {!isCancelled && isConfirmed && !isLogisticsUpdate && (
                          <p className="text-xs text-white/60 mb-3">
                            We're excited to host your event! We will be in touch shortly.
                          </p>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/my-inquiries');
                            onClose();
                          }}
                          className="text-[10px] font-bold bg-gold-400 text-black px-3 py-1.5 rounded w-full hover:brightness-110 transition-colors"
                        >
                          View Inquiry Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}