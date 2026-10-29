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
    if (item.notifType === "logistics") {
      const travel = Number(item.logistics_info?.travelFee) || 0;
      const hauling = Number(item.logistics_info?.haulingFee) || 0;
      const logTimestamp = item.logistics_info?.updated_at || "";
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

  const sortedNotifications = [...notifications].sort((a, b) => {
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
          className="absolute right-0 mt-4 w-80 md:w-96 glass-card border border-white/10 shadow-2xl z-[100] max-h-[400px] overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-white/10 sticky top-0 bg-[#070707] z-10 flex items-center justify-between">
            <h3 className="font-serif text-lg text-gold-400 italic">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={() => {
                    const newlyRead: string[] = [];
                    notifications.forEach(n => {
                      const key = getNotifKey(n);
                      if (!readIds.includes(key)) newlyRead.push(key);
                    });
                    setReadDuringSession(prev => [...prev, ...newlyRead]);
                    newlyRead.forEach(id => onDismiss && onDismiss(id));
                  }}
                  className="text-[10px] font-bold text-gold-400 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-rich-black text-left scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <Bell className="text-white/10 mb-4" size={32} />
                <p className="text-white/40 text-sm font-medium">No updates right now.</p>
              </div>
            ) : (
              sortedNotifications.map((notif) => {
                const notifKey = getNotifKey(notif);
                const isExpanded = expandedId === notifKey;
                const travelFeeVal = Number(notif.logistics_info?.travelFee) || 0;
                const haulingFeeVal = Number(notif.logistics_info?.haulingFee) || 0;
                const isLogisticsUpdate =
                  notif.notifType === 'logistics' ||
                  (!notif.notifType && (travelFeeVal > 0 || haulingFeeVal > 0));
                const isCancelled =
                  !isLogisticsUpdate &&
                  ['Cancelled', 'Declined', 'Rejected'].includes(notif.status);
                const isConfirmed =
                  !isLogisticsUpdate &&
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
                    className={`p-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer group ${isUnreadNotif && !isCancelled ? 'bg-white/5' : ''} ${isCancelled ? 'bg-red-950/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div>
                        <p className="text-sm text-white/90 font-semibold">
                          {notif.notifType === 'substitution' ? (
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
                              Booking for {notif.event_date} was <span className={isCancelled ? "text-red-400" : "text-green-400"}>{notif.status}</span>.
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
                        {isCancelled && reason && (
                          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-md">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Reason</p>
                            <p className="text-xs text-white/80 italic">"{reason}"</p>
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