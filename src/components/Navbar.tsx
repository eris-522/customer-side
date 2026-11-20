import { motion, AnimatePresence } from "motion/react";
import {
  Menu as MenuIcon,
  X,
  Bell,
  ChevronDown,
  ChevronRight,
  House,
  UtensilsCrossed,
  Package,
  Info,
  CircleHelp,
  Phone,
  CalendarPlus,
  ClipboardList,
  LogOut,
  LogIn,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import {
  getSessionUser,
  checkAccountStatus,
  clearSessionGuardCache,
} from "../utils/sessionGuard";
import { NotificationCenter } from "./NotificationCenter";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { ThemeToggle } from "./ThemeToggle";
import { clearSignedUrlCache } from "../utils/storageMedia";

export const navLinks = [
  { name: "Home", href: "/" },
  { name: "Menu", href: "/menu" },
  { name: "Packages", href: "/packages" },
  { name: "About", href: "/about" },
  { name: "FAQs", href: "/faqs" },
  { name: "Contact", href: "/contact" },
  { name: "Book", href: "/booking" },
];

const mobileNavIcons: Record<string, LucideIcon> = {
  Home: House,
  Menu: UtensilsCrossed,
  Packages: Package,
  About: Info,
  FAQs: CircleHelp,
  Contact: Phone,
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.removeItem('read_notifs');
    } catch {}
    if (!user?.id) {
      setReadIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`) || '[]');
      setReadIds(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
      setReadIds([]);
    }
  }, [user?.id]);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/auth";
  const mode = new URLSearchParams(location.search).get("mode");

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const fetchNotifsRef = useRef<((force?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktop = desktopNotifRef.current?.contains(target);
      const clickedMobile = mobileNotifRef.current?.contains(target);
      // The phone bottom sheet is portaled to <body>, so check it separately
      const clickedSheet = (target as Element)?.closest?.("[data-notif-root]");

      if (!clickedDesktop && !clickedMobile && !clickedSheet) {
        setIsNotifOpen(false);
      }
    };

    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  const getNotifKey = (b: any) => {
    if (b.notifKey) return b.notifKey;
    if (b.notifType === "excess_headcount") {
      return `${b.id}-excess-headcount-${b.excessBilling?.excess_guest_fee}-${b.notifTimestamp}`;
    }
    if (b.notifType === "excess_headcount_removed") {
      return `${b.id}-excess-removed-${b.notifTimestamp}`;
    }
    if (b.notifType === "rain_laundry") {
      return `${b.id}-rain-laundry-${b.rainAction}-${b.notifTimestamp || b.logistics_info?.rainLaundryLastActionAt}`;
    }
    if (b.notifType === "day_of_overtime") {
      return `${b.id}-dayof-ot-${b.dayOfOT?.total_day_of_fee}-${b.notifTimestamp}`;
    }
    if (b.notifType === "logistics") {
      const travelFee = Number(b.logistics_info?.travelFee) || 0;
      const haulingFee = Number(b.logistics_info?.haulingFee) || 0;
      const logTimestamp = b.logistics_info?.logistics_fees_updated_at || "";
      return `${b.id}-logistics-${travelFee}-${haulingFee}${logTimestamp ? `-${logTimestamp}` : ""}`;
    }
    return `${b.id}-${b.status}`;
  };
  const unreadCount = notifications.filter((b: any) => !readIds.includes(getNotifKey(b))).length;

  // Determine which button should have the "active" (gold) style.
  // On the auth page, the active button matches the current mode (login vs signup).
  // On other pages, "Sign Up" is the default primary call-to-action.
  const isLoginActive = isAuthPage && mode !== "signup";
  const isSignupActive = !isAuthPage || (isAuthPage && mode === "signup");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close overlays whenever the route changes (e.g. browser back gesture on mobile)
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false);
  }, [location.pathname]);

  // Escape closes whichever overlay is on top
  useEffect(() => {
    if (!isMobileMenuOpen && !isNotifOpen && !showLogoutConfirm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showLogoutConfirm) setShowLogoutConfirm(false);
      else if (isNotifOpen) setIsNotifOpen(false);
      else setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen, isNotifOpen, showLogoutConfirm]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const sessionUser = await getSessionUser();
      if (!isMounted) return;

      if (sessionUser) {
        const statusLower = await checkAccountStatus(sessionUser.id);
        if (statusLower === "inactive" || statusLower === "archived") {
          clearSessionGuardCache(sessionUser.id);
          await supabase.auth.signOut();
          if (isMounted) setUser(null);
          return;
        }
      }

      if (isMounted) setUser(sessionUser ?? null);
    };

    initAuth();

    if (window.location.hash.includes("type=recovery") && window.location.pathname !== "/auth") {
      navigate(`/auth?mode=reset${window.location.hash}`, { replace: true });
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/auth") {
          navigate("/auth?mode=reset", { replace: true });
        }
        if (event === "SIGNED_OUT") {
          clearSessionGuardCache();
          clearSignedUrlCache();
          setNotifications([]);
          setReadIds([]);
        } else if (event === "SIGNED_IN" && session?.user) {
          // Defer async database calls to avoid Supabase Auth mutex deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const statusLower = await checkAccountStatus(session.user.id);
              if (statusLower === "inactive" || statusLower === "archived") {
                clearSessionGuardCache(session.user.id);
                await supabase.auth.signOut();
                if (isMounted) setUser(null);
              }
            } catch (err) {
              console.error("Status check error in Navbar:", err);
            }
          }, 0);
        }
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription?.unsubscribe();
    };
  }, []);

  // Fetch updates related to the user's booking statuses
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, status, cancelled_by, cancellation_reason, event_date, created_at, logistics_info, overtime_info, food_allergies, dish_substitutions, modification_requests, final_balance_status')
        .eq('user_id', user.id);
      
      if (data) {
        // Filter out bookings cancelled by the customer so they don't receive a notification for their own action
        const normalizedData = data.map((b: any) => {
          let logInfo = b.logistics_info;
          if (typeof logInfo === "string") {
            try {
              logInfo = JSON.parse(logInfo);
            } catch {}
          }
          if ((!logInfo || Object.keys(logInfo).length === 0) && typeof b.food_allergies === 'string' && b.food_allergies.includes('__PAYMENT_METADATA__:')) {
            try {
              const parsed = JSON.parse(b.food_allergies.split('__PAYMENT_METADATA__:')[1]);
              if (parsed?.logistics) logInfo = parsed.logistics;
              else if (parsed?.logistics_info) logInfo = parsed.logistics_info;
            } catch {}
          }
          return { ...b, logistics_info: logInfo };
        });

        const expandedNotifications: any[] = [];

        normalizedData.forEach((b: any) => {
          const isCustomerCancelled = b.status === 'Cancelled' && b.cancelled_by === 'Customer';
          const isStatusNotif =
            !isCustomerCancelled &&
            ['Confirmed', 'Accepted', 'Approved', 'Cancelled', 'Declined', 'Rejected'].includes(b.status);

          if (isStatusNotif) {
            const statusTime =
              b.logistics_info?.confirmed_at ||
              b.created_at;
            expandedNotifications.push({
              ...b,
              notifType: 'status',
              notifKey: `${b.id}-${b.status}`,
              notifTimestamp: statusTime,
            });
          }

          const travelFee = Number(b.logistics_info?.travelFee) || 0;
          const haulingFee = Number(b.logistics_info?.haulingFee) || 0;
          const logisticsFeesUpdatedAt = b.logistics_info?.logistics_fees_updated_at;
          const hasLogisticsUpdate = Boolean(logisticsFeesUpdatedAt && (travelFee > 0 || haulingFee > 0));

          if (hasLogisticsUpdate && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'logistics',
              notifKey: `${b.id}-logistics-${travelFee}-${haulingFee}-${logisticsFeesUpdatedAt}`,
              notifTimestamp: logisticsFeesUpdatedAt,
            });
          }

          // Check for rain / laundry fee charged or removed by coordinator
          const rainLog = b.logistics_info;
          if (Array.isArray(rainLog?.rainLaundryHistory) && rainLog.rainLaundryHistory.length > 0 && !isCustomerCancelled) {
            rainLog.rainLaundryHistory.forEach((item: any) => {
              expandedNotifications.push({
                ...b,
                notifType: 'rain_laundry',
                notifKey: `${b.id}-rain-laundry-${item.action}-${item.timestamp}`,
                notifTimestamp: item.timestamp || b.created_at,
                rainAction: item.action,
                rainFee: item.fee ?? 2000,
                rainNote: item.note,
              });
            });
          } else if (rainLog?.rainLaundryLastAction && rainLog?.rainLaundryLastActionAt && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'rain_laundry',
              notifKey: `${b.id}-rain-laundry-${rainLog.rainLaundryLastAction}-${rainLog.rainLaundryLastActionAt}`,
              notifTimestamp: rainLog.rainLaundryLastActionAt,
              rainAction: rainLog.rainLaundryLastAction,
              rainFee: rainLog.rainLaundryLastAction === 'charged' ? (Number(rainLog.rainLaundryFee) || 2000) : 0,
            });
          } else if (rainLog?.rainLaundryApplied && rainLog?.rainLaundryAppliedAt && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'rain_laundry',
              notifKey: `${b.id}-rain-laundry-charged-${rainLog.rainLaundryAppliedAt}`,
              notifTimestamp: rainLog.rainLaundryAppliedAt,
              rainAction: 'charged',
              rainFee: Number(rainLog.rainLaundryFee) || 2000,
            });
          }

          // Check for day-of event overtime surcharge applied by admin
          let bOt = b.overtime_info;
          if (typeof bOt === "string") {
            try { bOt = JSON.parse(bOt); } catch (e) {}
          }
          if ((!bOt || Object.keys(bOt).length === 0) && typeof b.food_allergies === "string" && b.food_allergies.includes("__PAYMENT_METADATA__:")) {
            try {
              const meta = JSON.parse(b.food_allergies.split("__PAYMENT_METADATA__:")[1]);
              if (meta?.overtime) bOt = meta.overtime;
            } catch (e) {}
          }
          const dayOfOTData = bOt?.day_of;
          const dayOfOTFee = Number(dayOfOTData?.total_day_of_fee) || 0;
          if (dayOfOTFee > 0 && !isCustomerCancelled) {
            const otKey = `${b.id}-dayof-ot-${dayOfOTFee}-${dayOfOTData.applied_at || dayOfOTData.actual_end_time}`;
            expandedNotifications.push({
              ...b,
              notifType: 'day_of_overtime',
              notifKey: otKey,
              notifTimestamp: dayOfOTData.applied_at || b.created_at,
              dayOfOT: dayOfOTData,
            });
          }

          // Check for dish substitutions & restored availability sent by Coordinator
          if (Array.isArray(b.dish_substitutions) && b.dish_substitutions.length > 0 && !isCustomerCancelled) {
            b.dish_substitutions.forEach((sub: any) => {
              if (sub.restored) {
                const resKey = `${b.id}-restored-${sub.id || sub.restored_at || sub.original_dish}`;
                expandedNotifications.push({
                  ...b,
                  notifType: 'dish_restored',
                  notifKey: resKey,
                  notifTimestamp: sub.restored_at || sub.substituted_at || b.created_at,
                  original_dish: sub.original_dish,
                  restored_to_menu: Boolean(sub.restored_to_menu),
                });
                return;
              }
              if (sub.original_dish === sub.replacement_dish) return;
              const subKey = `${b.id}-sub-${sub.id || sub.substituted_at || sub.original_dish}`;
              expandedNotifications.push({
                ...b,
                notifType: 'substitution',
                notifKey: subKey,
                notifTimestamp: sub.substituted_at || b.created_at,
                original_dish: sub.original_dish,
                replacement_dish: sub.replacement_dish,
                subReason: sub.reason,
                subNote: sub.client_note,
              });
            });
          }

          // Check for modification requests reviewed/acknowledged or reverted by Coordinator
          if (Array.isArray(b.modification_requests) && b.modification_requests.length > 0 && !isCustomerCancelled) {
            b.modification_requests.forEach((mod: any) => {
              if (mod.status === 'Approved' || mod.status === 'Rejected') {
                const modKey = `${b.id}-mod-${mod.id}-${mod.status}`;
                expandedNotifications.push({
                  ...b,
                  notifType: 'modification',
                  notifKey: modKey,
                  notifTimestamp: mod.reviewed_at || mod.created_at || b.created_at,
                  modStatus: mod.status,
                  modReason: mod.review_note || '',
                });
              }
            });
          }

          // Check for final balance verification by Coordinator
          if (b.final_balance_status === 'Verified' && !isCustomerCancelled) {
            expandedNotifications.push({
              ...b,
              notifType: 'balance_verified',
              notifKey: `${b.id}-balance-verified`,
              notifTimestamp: b.logistics_info?.updated_at || b.created_at,
            });
          }

          // Check for post-event excess headcount surcharge applied or removed by coordinator
          const postLog = b.logistics_info;
          if (Array.isArray(postLog?.excessHeadcountHistory) && postLog.excessHeadcountHistory.length > 0 && !isCustomerCancelled) {
            postLog.excessHeadcountHistory.forEach((item: any) => {
              const feeVal = Number(item.fee) || 0;
              if (item.action === 'charged' && feeVal > 0) {
                expandedNotifications.push({
                  ...b,
                  notifType: 'excess_headcount',
                  notifKey: `${b.id}-excess-headcount-${feeVal}-${item.timestamp}`,
                  notifTimestamp: item.timestamp || b.created_at,
                  excessAction: item.action,
                  excessFee: feeVal,
                  excessBilling: postLog.post_event_billing || {
                    excess_guest_fee: feeVal,
                    actual_headcount_served: item.actual_headcount,
                    guaranteed_headcount: item.guaranteed_headcount,
                    excess_guests: item.excess_guests,
                    due_date: item.due_date,
                    payment_status: postLog.post_event_billing?.payment_status || "Unpaid",
                  },
                });
              } else if (item.action === 'removed') {
                expandedNotifications.push({
                  ...b,
                  notifType: 'excess_headcount_removed',
                  notifKey: `${b.id}-excess-removed-${item.timestamp}`,
                  notifTimestamp: item.timestamp || b.created_at,
                  excessAction: item.action,
                  excessFee: 0,
                  excessBilling: postLog.post_event_billing,
                });
              }
            });
          } else {
            const postEvent = postLog?.post_event_billing || (b as any)?.post_event_billing;
            const excessFee = Number(postEvent?.excess_guest_fee) || 0;
            if (postEvent && excessFee > 0 && !isCustomerCancelled) {
              const notifTs = postEvent.updated_at || postEvent.billed_at || postEvent.last_action_at || b.created_at;
              const notifKey = `${b.id}-excess-headcount-${excessFee}-${notifTs}`;
              expandedNotifications.push({
                ...b,
                notifType: 'excess_headcount',
                notifKey,
                notifTimestamp: notifTs,
                excessBilling: postEvent,
              });
            } else if (postEvent?.last_action === 'removed' && postEvent?.last_action_at && !isCustomerCancelled) {
              const notifKey = `${b.id}-excess-removed-${postEvent.last_action_at}`;
              expandedNotifications.push({
                ...b,
                notifType: 'excess_headcount_removed',
                notifKey,
                notifTimestamp: postEvent.last_action_at,
                excessBilling: postEvent,
              });
            }
          }

          // Check for post-event Equipment Damage & Loss Invoice (Clause 13)
          if (Array.isArray(postLog?.damageHistory) && postLog.damageHistory.length > 0 && !isCustomerCancelled) {
            postLog.damageHistory.forEach((dEntry: any) => {
              const dFee = Number(dEntry.total_fee) || 0;
              if ((dEntry.action === 'charged' || dEntry.action === 'updated') && dFee > 0) {
                expandedNotifications.push({
                  ...b,
                  notifType: 'damage_invoice',
                  notifKey: `${b.id}-damage-invoice-${dFee}-${dEntry.timestamp}`,
                  notifTimestamp: dEntry.timestamp || b.created_at,
                  damageFee: dFee,
                  damageItemCount: dEntry.item_count || (Array.isArray(postLog?.damage_appraisal?.items) ? postLog.damage_appraisal.items.length : 1),
                  damageDueDate: dEntry.due_date || postLog?.damage_appraisal?.due_date || "Post-Event",
                  damageAppraisal: postLog?.damage_appraisal,
                });
              } else if (dEntry.action === 'removed') {
                expandedNotifications.push({
                  ...b,
                  notifType: 'damage_invoice_removed',
                  notifKey: `${b.id}-damage-removed-${dEntry.timestamp}`,
                  notifTimestamp: dEntry.timestamp || b.created_at,
                  damageFee: 0,
                });
              }
            });
          } else if (postLog?.damage_appraisal && Number(postLog.damage_appraisal.total_damage_fee) > 0 && !isCustomerCancelled) {
            const dApp = postLog.damage_appraisal;
            const dFee = Number(dApp.total_damage_fee) || 0;
            const dTs = dApp.updated_at || dApp.appraised_at || b.created_at;
            expandedNotifications.push({
              ...b,
              notifType: 'damage_invoice',
              notifKey: `${b.id}-damage-invoice-${dFee}-${dTs}`,
              notifTimestamp: dTs,
              damageFee: dFee,
              damageItemCount: Array.isArray(dApp.items) ? dApp.items.length : 1,
              damageDueDate: dApp.due_date || "Post-Event",
              damageAppraisal: dApp,
            });
          }

          // Check for Coordinator Resolution on Post-Event Complaints (Clause 19)
          if (Array.isArray(postLog?.post_event_complaints) && postLog.post_event_complaints.length > 0) {
            postLog.post_event_complaints.forEach((cmp: any) => {
              if (
                cmp &&
                (cmp.status === 'Resolved' ||
                  cmp.status === 'Under Investigation' ||
                  cmp.status === 'Dismissed' ||
                  Boolean(cmp.resolution_notes))
              ) {
                const resTs = cmp.resolved_at || postLog?.updated_at || b.created_at;
                expandedNotifications.push({
                  ...b,
                  notifType: 'complaint_resolved',
                  notifKey: `${b.id}-complaint-res-${cmp.id}-${cmp.status}-${resTs}`,
                  notifTimestamp: resTs,
                  complaintItem: cmp,
                });
              }
            });
          }
        });

        // Sort primarily by the most recent update so new confirmations sit at the top
        const sorted = expandedNotifications.sort((a: any, b: any) => {
          const timeA = new Date(a.notifTimestamp || a.created_at || 0).getTime();
          const timeB = new Date(b.notifTimestamp || b.created_at || 0).getTime();
          return timeB - timeA;
        });
        setNotifications(sorted);
      }
    };

    const FOCUS_COOLDOWN_MS = 60_000;
    let lastNotifFetchTime = 0;
    let inFlightNotif = false;
    let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
    let realtimeConnected = false;

    const triggerNotificationsFetch = async (force = false) => {
      if (inFlightNotif) return;
      if (!force && Date.now() - lastNotifFetchTime < FOCUS_COOLDOWN_MS) return;
      inFlightNotif = true;
      lastNotifFetchTime = Date.now();
      try {
        await fetchNotifications();
      } finally {
        inFlightNotif = false;
      }
    };

    fetchNotifsRef.current = triggerNotificationsFetch;
    triggerNotificationsFetch(true);

    // Fallback polling ONLY when Realtime WebSocket is disconnected
    const fallbackPollId = setInterval(() => {
      if (!realtimeConnected && document.visibilityState === "visible") {
        triggerNotificationsFetch(false);
      }
    }, 60_000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        triggerNotificationsFetch(false);
      }
    };
    const handleLocalBookingSync = () => {
      triggerNotificationsFetch(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("customerBookingsUpdated", handleLocalBookingSync);

    // Instant cross-tab sync via BroadcastChannel and localStorage
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("roxan_catering_events");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "BOOKINGS_UPDATED") {
          triggerNotificationsFetch(true);
        }
      };
    } catch (e) {}

    const handleStorageChange = (ev: StorageEvent) => {
      if (ev.key === "roxan_last_booking_update") {
        triggerNotificationsFetch(true);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Real-time subscription to catch instant Admin updates or status changes
    const channelName = `user-bookings-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        const payloadUserId = payload.new?.user_id || payload.old?.user_id;
        if (!payloadUserId || payloadUserId === user.id) {
          if (realtimeDebounce) clearTimeout(realtimeDebounce);
          realtimeDebounce = setTimeout(() => {
            triggerNotificationsFetch(true);
            window.dispatchEvent(new CustomEvent('bookingsRealtimeUpdated'));
          }, 200);
        }
      })
      .subscribe((status: string) => {
        realtimeConnected = status === 'SUBSCRIBED';
      });

    return () => {
      clearInterval(fallbackPollId);
      if (realtimeDebounce) clearTimeout(realtimeDebounce);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("customerBookingsUpdated", handleLocalBookingSync);
      window.removeEventListener("storage", handleStorageChange);
      try {
        bc?.close();
      } catch (e) {}
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleLogoutClick = () => {
    setIsMobileMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    clearSignedUrlCache();
    setNotifications([]);
    setReadIds([]);
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNotifClick = () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState && fetchNotifsRef.current) {
      fetchNotifsRef.current(true);
    }
  };

  const handleDismissNotif = (id: string) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const newIds = [...prev, id];
      if (user?.id) {
        try {
          localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(newIds));
        } catch {}
      }
      return newIds;
    });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        <div className="pointer-events-auto w-full">
          <AnnouncementBanner />
        </div>
        <nav 
          className={`w-full transition-all duration-500 h-16 flex items-center pointer-events-auto ${
            isScrolled
              ? "glass-card border-b border-[#CFC3AE] dark:border-white/10 shadow-md backdrop-blur-md"
              : "bg-[#EAE3D5]/95 dark:bg-transparent border-b border-[#CFC3AE]/80 dark:border-transparent backdrop-blur-md dark:backdrop-blur-none shadow-xs dark:shadow-none"
          }`}
        >
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-10 flex justify-between items-center gap-2">

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0"
            >
              <Link to="/" className="flex flex-col">
                <span className="text-base sm:text-xl font-serif tracking-[0.14em] sm:tracking-[0.2em] text-gold-500 dark:text-gold-400 font-bold uppercase truncate">ROXAN POLICARPIO</span>
                <span className="text-xs sm:text-sm tracking-wide text-gold-600 dark:text-gold-300/90 -mt-0.5 sm:-mt-1 font-semibold">Events & Catering</span>
              </Link>
            </motion.div>

            <div className="hidden lg:flex items-center gap-7">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {link.name === "Book" && user ? (
                    <div className="relative group">
                      <Link
                        to="/booking"
                        className={`text-base tracking-wide font-semibold transition-colors flex items-center gap-1 ${
                          location.pathname.includes("/booking") || location.pathname.includes("/my-inquiries")
                            ? "text-gold-500 dark:text-gold-400 font-bold"
                            : "text-stone-700 dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400"
                        }`}
                      >
                        Book <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
                      </Link>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top translate-y-2 group-hover:translate-y-0 z-50">
                        <div className="glass-card border border-gold-400/20 py-2 w-48 flex flex-col gap-1 shadow-2xl rounded-xl">
                          <Link to="/booking" className="px-4 py-2 text-sm font-semibold tracking-wide text-stone-700 dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">New Booking</Link>
                          <Link to="/my-inquiries" className="px-4 py-2 text-sm font-semibold tracking-wide text-stone-700 dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left">My Inquiries</Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      to={link.href}
                      aria-current={location.pathname === link.href ? "page" : undefined}
                      className={`text-base tracking-wide font-semibold transition-colors ${
                        location.pathname === link.href
                          ? "text-gold-500 dark:text-gold-400 font-bold"
                          : "text-stone-700 dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400"
                      }`}
                    >
                      {link.name}
                    </Link>
                  )}
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 pl-2"
              >
                <ThemeToggle variant="compact" />

                {user ? (
                  <>
                    <div className="relative inline-block align-middle ml-1" ref={desktopNotifRef}>
                      <button
                        onClick={handleNotifClick}
                        aria-label="Notifications"
                        className="text-stone-700 dark:text-white/70 hover:text-gold-500 dark:hover:text-gold-400 transition-colors relative flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <NotificationCenter 
                        isOpen={isNotifOpen} 
                        onClose={() => setIsNotifOpen(false)} 
                        notifications={notifications} 
                        unreadCount={unreadCount} 
                        readIds={readIds}
                        onDismiss={handleDismissNotif}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="ml-3 px-5 py-2 border border-gold-400/30 text-stone-800 dark:text-white/90 text-sm tracking-wide font-bold hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-all inline-block rounded-lg cursor-pointer"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 ml-2">
                    <Link
                      to="/auth?mode=login"
                      className={`text-sm tracking-wide font-bold transition-colors px-4 py-2 rounded-lg ${
                        isLoginActive
                          ? "gold-gradient text-white shadow-md"
                          : "text-stone-700 dark:text-white/90 hover:text-gold-500 dark:hover:text-gold-400"
                      }`}
                    >
                      Login
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      className={`text-sm tracking-wide font-bold transition-all px-5 py-2 rounded-lg shadow-md ${
                        isSignupActive
                          ? "gold-gradient text-white hover:brightness-105"
                          : "text-stone-700 dark:text-white/90 hover:text-gold-500 dark:hover:text-gold-400"
                      }`}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 lg:hidden shrink-0">
              <ThemeToggle variant="compact" />
              {user && (
                <div className="relative" ref={mobileNotifRef}>
                  <button
                    type="button"
                    onClick={handleNotifClick}
                    aria-label="Notifications"
                    className="text-gold-500 dark:text-gold-400 transition-colors relative min-w-11 min-h-11 flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] leading-none font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-[var(--bg-primary)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationCenter 
                    isOpen={isNotifOpen} 
                    onClose={() => setIsNotifOpen(false)} 
                    notifications={notifications} 
                    unreadCount={unreadCount} 
                    readIds={readIds}
                    onDismiss={handleDismissNotif}
                    mobileSheet
                  />
                </div>
              )}
              <button 
                type="button"
                className="text-gold-500 dark:text-gold-400 min-w-11 min-h-11 -mr-2 flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  setIsNotifOpen(false);
                  setIsMobileMenuOpen(true);
                }}
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-drawer"
              >
                <MenuIcon size={24} />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Site navigation">
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              id="mobile-nav-drawer"
              key="mobile-nav-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 500) setIsMobileMenuOpen(false);
              }}
              className="fixed top-0 right-0 bottom-0 w-[min(86vw,360px)] bg-rich-black border-l border-[#CFC3AE] dark:border-white/10 shadow-2xl flex flex-col overscroll-contain"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between gap-2 px-5 h-16 border-b border-[#CFC3AE] dark:border-white/10 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-serif tracking-[0.14em] text-gold-500 dark:text-gold-400 font-bold uppercase truncate">Roxan Policarpio</p>
                  <p className="text-xs text-stone-600 dark:text-white/60 font-semibold truncate">
                    {user?.email ? user.email : "Events & Catering"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-stone-700 dark:text-white/80 min-w-11 min-h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Links */}
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="Mobile">
                <ul className="flex flex-col gap-0.5">
                  {navLinks
                    .filter((link) => link.name !== "Book")
                    .map((link) => {
                      const Icon = mobileNavIcons[link.name] || ChevronRight;
                      const active = location.pathname === link.href;
                      return (
                        <li key={link.name}>
                          <Link
                            to={link.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-3.5 px-3 min-h-12 rounded-xl text-[15px] font-semibold tracking-wide transition-colors ${
                              active
                                ? "bg-gold-400/15 text-gold-600 dark:text-gold-300"
                                : "text-stone-800 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <Icon size={19} className={active ? "text-gold-500 dark:text-gold-400" : "text-stone-500 dark:text-white/50"} />
                            <span className="flex-1">{link.name}</span>
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-gold-500 dark:bg-gold-400" />}
                          </Link>
                        </li>
                      );
                    })}
                </ul>

                {user && (
                  <>
                    <p className="px-3 pt-5 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-white/45">My Account</p>
                    <ul className="flex flex-col gap-0.5">
                      <li>
                        <Link
                          to="/my-inquiries"
                          aria-current={location.pathname === "/my-inquiries" ? "page" : undefined}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3.5 px-3 min-h-12 rounded-xl text-[15px] font-semibold tracking-wide transition-colors ${
                            location.pathname === "/my-inquiries"
                              ? "bg-gold-400/15 text-gold-600 dark:text-gold-300"
                              : "text-stone-800 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                        >
                          <ClipboardList size={19} className={location.pathname === "/my-inquiries" ? "text-gold-500 dark:text-gold-400" : "text-stone-500 dark:text-white/50"} />
                          <span className="flex-1">My Inquiries</span>
                          {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[11px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={handleLogoutClick}
                          className="w-full flex items-center gap-3.5 px-3 min-h-12 rounded-xl text-[15px] font-semibold tracking-wide text-stone-800 dark:text-white/85 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                        >
                          <LogOut size={19} className="text-stone-500 dark:text-white/50" />
                          <span className="flex-1">Log Out</span>
                        </button>
                      </li>
                    </ul>
                  </>
                )}

                <p className="px-3 pt-5 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-white/45">Appearance</p>
                <div className="px-3">
                  <ThemeToggle variant="segmented" />
                </div>
              </nav>

              {/* Thumb-reachable primary actions */}
              <div className="shrink-0 border-t border-[#CFC3AE] dark:border-white/10 px-4 pt-4 pb-safe flex flex-col gap-2.5">
                <Link
                  to="/booking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="gold-gradient text-white dark:text-black min-h-12 rounded-xl flex items-center justify-center gap-2 text-[15px] font-bold tracking-wide shadow-md"
                >
                  <CalendarPlus size={18} /> Book an Event
                </Link>
                {!user && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      to="/auth?mode=login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`min-h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold tracking-wide border transition-colors ${
                        isAuthPage && mode !== "signup"
                          ? "border-gold-500 text-gold-600 dark:text-gold-300"
                          : "border-[#CFC3AE] dark:border-white/15 text-stone-800 dark:text-white/85"
                      }`}
                    >
                      <LogIn size={16} /> Log In
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`min-h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold tracking-wide border transition-colors ${
                        isAuthPage && mode === "signup"
                          ? "border-gold-500 text-gold-600 dark:text-gold-300"
                          : "border-[#CFC3AE] dark:border-white/15 text-stone-800 dark:text-white/85"
                      }`}
                    >
                      <UserPlus size={16} /> Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 overscroll-contain"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              className="glass-card bg-rich-black border border-white/10 px-6 pt-6 pb-safe sm:p-8 max-w-sm w-full text-center relative overflow-hidden rounded-t-2xl sm:rounded-xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-400" />
              <h3 className="text-2xl sm:text-3xl font-serif mb-2 italic">Confirm <span className="gold-text-gradient">Logout</span></h3>
              <p className="text-sm opacity-80 mb-6 sm:mb-8 font-medium leading-relaxed">
                {user?.email
                  ? `Log out ${user.email}? This will end your current session.`
                  : "Are you sure you want to log out? This will end your current session."}
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 min-h-12 py-3 border border-gold-400/30 text-stone-700 dark:text-white/70 hover:text-stone-900 dark:hover:text-white hover:border-gold-400 transition-all text-sm font-bold tracking-wide rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 min-h-12 py-3 gold-gradient text-white dark:text-black font-bold tracking-wide text-sm hover:brightness-105 transition-all rounded-md cursor-pointer shadow-md"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
