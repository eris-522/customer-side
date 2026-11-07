import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import {
  CloudRain,
  Calendar,
  MapPin,
  Users,
  Package,
  ChevronRight,
  CreditCard,
  Eye,
  X,
  Clock,
  AlertTriangle,
  CheckCircle,
  Check,
  Building2,
  QrCode,
  UploadCloud,
  Copy,
  ShieldAlert,
  Lock,
  Sliders,
  Edit3,
  RefreshCw,
  AlertCircle,
  Utensils,
  Receipt,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { compressReceiptImage, uploadReceiptImage } from "../utils/receiptUploader";
import { calculateServiceWindow, OVERTIME_SERVICE_RATES } from "../utils/overtimeBilling";
import { restoreBookingInventoryOnCancellation } from "../utils/inventoryReturn";
import { catalogCache } from "../utils/catalogCache";
import {
  getSessionUser,
  checkAccountStatus,
  clearSessionGuardCache,
} from "../utils/sessionGuard";

// Helper to check if event is within 14 days
const getRuleCategory = (dbCategory: string, itemName: string) => {
  const cat = (dbCategory || "").toLowerCase();
  const name = (itemName || "").toLowerCase();

  if (name.includes("soup") || name.includes("broth") || name.includes("chowder") || name.includes("sinigang") || name.includes("nilaga") || name.includes("mami") || name.includes("sopas") || name.includes("tinola") || name.includes("lomi")) return "Soup";
  if (name.includes("vegetable") || name.includes("veggie") || name.includes("salad") || name.includes("pinakbet") || name.includes("pakbet") || name.includes("kangkong") || name.includes("laing")) return "Vegetable";
  if (name.includes("pasta") || name.includes("noodle") || name.includes("spaghetti") || name.includes("carbonara") || name.includes("pancit") || name.includes("palabok") || name.includes("bihon") || name.includes("sotanghon") || name.includes("canton") || name.includes("macaroni") || name.includes("lasagna")) return "Pasta";
  if (name.includes("rice")) return "Rice";

  if (cat.includes("appetizer")) return "Appetizer";
  if (cat.includes("soup")) return "Soup";
  if (cat.includes("pasta") || cat.includes("noodle")) return "Pasta";
  if (cat.includes("vegetable") || cat.includes("veggie")) return "Vegetable";
  if (cat.includes("rice")) return "Rice";
  if (cat.includes("dessert") || cat.includes("sweet")) return "Dessert";
  if (cat.includes("drink") || cat.includes("beverage")) return "Drinks";
  return "Main Course";
};

const getBookingDishCategory = (
  dishName: string,
  booking?: any,
  menuItemsList: any[] = [],
  customDishesList: any[] = []
): string => {
  if (!dishName) return "Main Course";

  // 0. Booking-scoped custom (off-menu) dishes from booking_custom_dishes are the source of truth
  const custom = customDishesList.find(
    (cd: any) => cd.name === dishName && (!booking || String(cd.booking_id) === String(booking.id))
  );
  if (custom?.category) return custom.category;

  // 1. Check if this dish is an active replacement in booking.dish_substitutions
  if (booking && Array.isArray(booking.dish_substitutions)) {
    const sub = booking.dish_substitutions.find((s: any) => s.replacement_dish === dishName);
    if (sub) {
      if (sub.category) return sub.category;
      if (sub.original_dish) {
        const origDef = menuItemsList.find((mi: any) => mi.name === sub.original_dish);
        if (origDef) {
          return getRuleCategory(origDef.category, origDef.name);
        }
      }
    }
  }

  // 2. Check if dish is in the menuItems database
  const def = menuItemsList.find((mi: any) => mi.name === dishName);
  if (def) {
    return getRuleCategory(def.category, def.name);
  }

  // 3. Fallback to name heuristic in getRuleCategory
  return getRuleCategory("", dishName);
};

const categoryOrder = ["Appetizer", "Soup", "Main Course", "Pasta", "Vegetable", "Rice", "Dessert", "Drinks"];

type InquiryTab = "payments" | "menu" | "breakdown";

export default function MyInquiriesPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [activeTabByBooking, setActiveTabByBooking] = useState<Record<string, InquiryTab>>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // 14-Day Modification Request Modal State
  const [menuItems, setMenuItems] = useState<any[]>([]);
  // Booking-scoped off-menu dishes added by the coordinator (never offered in the public booking screen)
  const [customDishes, setCustomDishes] = useState<any[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(false);
  const [modifyingBooking, setModifyingBooking] = useState<any | null>(null);
  const [modAdditionalPax, setModAdditionalPax] = useState<number>(0);
  const [modSelectedDishes, setModSelectedDishes] = useState<string[]>([]);
  const [modNotes, setModNotes] = useState<string>("");
  const [modError, setModError] = useState<string>("");
  const [isSubmittingMod, setIsSubmittingMod] = useState<boolean>(false);
  const [modSuccessMsg, setModSuccessMsg] = useState<string>("");
  const modToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerModErrorToast = (msg: string) => {
    if (modToastTimerRef.current) {
      clearTimeout(modToastTimerRef.current);
    }
    setModError(msg);
    modToastTimerRef.current = setTimeout(() => {
      setModError("");
    }, 3500);
  };

  const triggerModSuccessToast = (msg: string) => {
    if (modSuccessTimerRef.current) {
      clearTimeout(modSuccessTimerRef.current);
    }
    setModSuccessMsg(msg);
    modSuccessTimerRef.current = setTimeout(() => {
      setModSuccessMsg("");
    }, 4500);
  };

  const clearModErrorToast = () => {
    if (modToastTimerRef.current) {
      clearTimeout(modToastTimerRef.current);
      modToastTimerRef.current = null;
    }
    setModError("");
  };

  useEffect(() => {
    return () => {
      if (modToastTimerRef.current) {
        clearTimeout(modToastTimerRef.current);
      }
      if (modSuccessTimerRef.current) {
        clearTimeout(modSuccessTimerRef.current);
      }
    };
  }, []);

  // 15-Day Final Balance & Installment Payment Modal State
  const [payingBalanceBooking, setPayingBalanceBooking] = useState<any | null>(null);
  const [payingMilestone, setPayingMilestone] = useState<{
    index: number;
    title: string;
    amount: number;
    dueDate?: string;
  } | null>(null);
  const [payingExcessSurcharge, setPayingExcessSurcharge] = useState<{
    amount: number;
    dueDate?: string;
    excessGuests: number;
    guaranteedPax: number;
    actualPax: number;
  } | null>(null);
  const [balancePaymentMethod, setBalancePaymentMethod] = useState<"GCash" | "Bank Transfer">("GCash");
  const [balanceRef, setBalanceRef] = useState<string>("");
  const [balanceReceiptImage, setBalanceReceiptImage] = useState<string>("");
  const [balanceReceiptBlob, setBalanceReceiptBlob] = useState<Blob | null>(null);
  const [balanceReceiptName, setBalanceReceiptName] = useState<string>("");
  const [balanceError, setBalanceError] = useState<string>("");
  const [isSubmittingBalance, setIsSubmittingBalance] = useState<boolean>(false);
  const [copiedBalanceAccount, setCopiedBalanceAccount] = useState<string>("");

  const latestFetchIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let customDishesChannel: ReturnType<typeof supabase.channel> | null = null;
    let customDishesDebounce: ReturnType<typeof setTimeout> | null = null;
    const FOCUS_COOLDOWN_MS = 60_000;
    let lastFetchTimestamp = 0;
    let inFlightSilent = false;

    const fetchInquiries = async (silent = false) => {
      if (silent && inFlightSilent) return null;
      if (silent) inFlightSilent = true;
      const reqId = ++latestFetchIdRef.current;
      try {
        if (!silent) setLoading(true);
        const authUser = await getSessionUser();
        if (!authUser) {
          if (isMounted && !silent) setLoading(false);
          return null;
        }

        // Uses cached status (0 DB round-trips within 60s TTL; live deactivation handled by App's Realtime guard)
        const inquiriesStatus = await checkAccountStatus(authUser.id);
        if (inquiriesStatus === "archived" || inquiriesStatus === "inactive") {
          clearSessionGuardCache(authUser.id);
          await supabase.auth.signOut();
          navigate(
            inquiriesStatus === "inactive"
              ? "/auth?mode=login&deactivated=true"
              : "/auth?mode=login&archived=true",
          );
          return null;
        }

        lastFetchTimestamp = Date.now();

        const [bookingsRes, cachedOrFreshMenu] = await Promise.all([
          supabase
            .from("bookings")
            .select("*, packages (id, name, price, additional_pax_price, category_limits, inclusions)")
            .eq("user_id", authUser.id),
          catalogCache.fetchMenuItems(),
        ]);

        if (!isMounted || reqId !== latestFetchIdRef.current) return authUser;

        const { data: bookingsData, error } = bookingsRes;
        if (error) throw error;

        if (cachedOrFreshMenu) {
          setMenuItems(cachedOrFreshMenu);
        }

        if (bookingsData && bookingsData.length > 0) {
          const bookingIds = bookingsData.map((b: any) => b.id);
          const { data: customData } = await supabase
            .from("booking_custom_dishes")
            .select("id, booking_id, name, category, replaces_dish")
            .in("booking_id", bookingIds);
          if (!isMounted || reqId !== latestFetchIdRef.current) return authUser;
          setCustomDishes(customData || []);

          const sorted = [...bookingsData].sort((a, b) => {
            const dateA = new Date(a.created_at || a.event_date || 0).getTime();
            const dateB = new Date(b.created_at || b.event_date || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
          });
          setBookings(sorted);
          setModifyingBooking((prev: any) => {
            if (!prev) return null;
            const refreshed = sorted.find((b: any) => String(b.id) === String(prev.id));
            return refreshed ? { ...refreshed, packages: refreshed.packages || prev.packages } : prev;
          });
        } else {
          setBookings([]);
          setCustomDishes([]);
        }
        return authUser;
      } catch (err: any) {
        console.error("Critical error in fetchInquiries:", err);
        if (!silent && isMounted) {
          setErrorMsg(
            err.message ||
              "An unexpected error occurred while fetching your data.",
          );
        }
        return null;
      } finally {
        if (silent) inFlightSilent = false;
        if (isMounted && !silent) setLoading(false);
      }
    };

    // Instant refresh when Navbar's user-bookings Realtime channel detects an update
    const handleRealtimeBookingUpdate = () => {
      fetchInquiries(true);
    };

    // Throttled refresh when tab regains focus/visibility (60s cooldown prevents tab-switch query storms)
    const handleFocusOrVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchTimestamp >= FOCUS_COOLDOWN_MS
      ) {
        fetchInquiries(true);
      }
    };

    window.addEventListener("bookingsRealtimeUpdated", handleRealtimeBookingUpdate);
    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // Subscribe to shared catalog cache for live menu item updates
    const unsubscribeCatalog = catalogCache.subscribe((changedKey) => {
      if (changedKey === "menu") {
        catalogCache.fetchMenuItems(true).then((items) => {
          if (isMounted) setMenuItems(items);
        });
      }
    });

    fetchInquiries(false).then((authUser) => {
      if (!isMounted || !authUser) return;

      // Only subscribe to `booking_custom_dishes` here (bookings & menu are already covered globally)
      customDishesChannel = supabase
        .channel(`my-inquiries-dishes-${authUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "booking_custom_dishes" },
          () => {
            if (customDishesDebounce) clearTimeout(customDishesDebounce);
            customDishesDebounce = setTimeout(() => {
              fetchInquiries(true);
            }, 300);
          },
        )
        .subscribe();
    });

    return () => {
      isMounted = false;
      if (customDishesDebounce) clearTimeout(customDishesDebounce);
      unsubscribeCatalog();
      window.removeEventListener("bookingsRealtimeUpdated", handleRealtimeBookingUpdate);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      if (customDishesChannel) supabase.removeChannel(customDishesChannel);
    };
  }, []);

  useEffect(() => {
    if (!modifyingBooking) return;
    if (menuItems.length === 0 && !isLoadingMenu) {
      setIsLoadingMenu(true);
      catalogCache
        .fetchMenuItems()
        .then((data) => {
          if (data) setMenuItems(data);
          setIsLoadingMenu(false);
        });
    }
    if (modifyingBooking.package_id && modifyingBooking.packages?.category_limits === undefined) {
      supabase
        .from("packages")
        .select("id, name, price, additional_pax_price, category_limits, inclusions")
        .eq("id", modifyingBooking.package_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setModifyingBooking((prev: any) => (prev ? { ...prev, packages: data } : prev));
          }
        });
    }
  }, [modifyingBooking, menuItems.length]);

  const confirmCancelBooking = async () => {
    if (!cancelModalId) return;

    if (!cancelReason.trim()) {
      setCancelReasonError("Please provide a reason for cancellation.");
      return;
    }

    setCancellingId(cancelModalId);
    const finalReason = cancelReason.trim();

    const targetBooking = bookings.find((b) => b.id === cancelModalId);
    const wasConfirmed =
      targetBooking &&
      ["accepted", "approved", "confirmed"].includes(
        String(targetBooking.status || "")
          .toLowerCase()
          .trim(),
      );
    const formattedReason = wasConfirmed
      ? `[⚠️ LATE CANCELLATION - PREVIOUSLY CONFIRMED] ${finalReason}`
      : finalReason;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "Cancelled",
          cancellation_reason: formattedReason,
          cancelled_by: "Customer",
        })
        .eq("id", cancelModalId);

      if (error) throw error;

      // If the event was previously confirmed, automatically return the allocated equipment to equipment monitoring
      if (wasConfirmed) {
        const clientName =
          targetBooking?.customer_name ||
          targetBooking?.profiles?.name ||
          targetBooking?.profiles?.full_name ||
          "Client";
        try {
          await restoreBookingInventoryOnCancellation(
            cancelModalId,
            clientName,
            formattedReason
          );
        } catch (invErr) {
          console.error("Error returning inventory on customer cancellation:", invErr);
        }
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelModalId
            ? {
                ...b,
                status: "Cancelled",
                cancellation_reason: formattedReason,
                cancelled_by: "Customer",
              }
            : b,
        ),
      );
      window.dispatchEvent(new CustomEvent("customerBookingsUpdated"));
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      setErrorMsg(err.message || "Failed to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
      setCancelModalId(null);
      setCancelReason("");
      setCancelReasonError("");
    }
  };

  const handleOpenModifyModal = async (booking: any) => {
    const eventDateObj = new Date(`${booking.event_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 14) {
      triggerModErrorToast("Modifications locked: All changes require 14 days prior notice per contract.");
      return;
    }

    const existingModReqs = Array.isArray(booking.modification_requests)
      ? booking.modification_requests.filter((r: any) => r.status !== "Superseded")
      : [];
    const hasUnacknowledged = existingModReqs.some(
      (r: any) => r.status === "Applied" || r.status === "Pending"
    );
    if (hasUnacknowledged) {
      triggerModErrorToast("Cannot modify: Your previous modification request is awaiting coordinator acknowledgment.");
      return;
    }
    const latestModNote =
      existingModReqs.length > 0
        ? existingModReqs[existingModReqs.length - 1]?.notes || ""
        : "";
    const existingInstructions =
      booking.logistics_info?.client_special_instructions !== undefined
        ? booking.logistics_info.client_special_instructions
        : latestModNote;

    setModifyingBooking(booking);
    setModAdditionalPax(Number(booking.additional_pax) || 0);
    setModSelectedDishes(Array.isArray(booking.selected_menu_items) ? [...booking.selected_menu_items] : []);
    setModNotes(existingInstructions || "");
    clearModErrorToast();
    setModSuccessMsg("");

    // Ensure menuItems and package category_limits are loaded (handles HMR or empty cache)
    const needsMenu = menuItems.length === 0;
    const needsLimits = booking.package_id && booking.packages?.category_limits === undefined;

    if (needsMenu || needsLimits) {
      setIsLoadingMenu(true);
      try {
        const [mRes, pRes] = await Promise.all([
          needsMenu
            ? catalogCache.fetchMenuItems().then((data) => ({ data }))
            : Promise.resolve({ data: null }),
          needsLimits
            ? supabase.from("packages").select("id, name, price, additional_pax_price, category_limits, inclusions").eq("id", booking.package_id).single()
            : Promise.resolve({ data: null }),
        ]);
        if (mRes.data) setMenuItems(mRes.data);
        if (pRes.data) {
          setModifyingBooking((prev: any) => (prev ? { ...prev, packages: pRes.data } : prev));
        }
      } catch (e) {
        console.error("Failed to fetch menu options:", e);
      } finally {
        setIsLoadingMenu(false);
      }
    }
  };

  // Custom dishes for a specific booking
  const getCustomDishesFor = (bookingId: any) =>
    customDishes.filter((cd) => String(cd.booking_id) === String(bookingId));

  // Dishes the coordinator marked unavailable for this booking (chronological, cleared when set available again)
  const getUnavailableDishesFor = (booking: any): Set<string> => {
    const set = new Set<string>();
    if (!booking) return set;
    const activeMenu: string[] = Array.isArray(booking.selected_menu_items)
      ? booking.selected_menu_items
      : [];
    const restoredSet = new Set<string>();

    (Array.isArray(booking.dish_substitutions) ? booking.dish_substitutions : []).forEach(
      (s: any) => {
        if (!s?.original_dish) return;
        if (s.restored) {
          set.delete(s.original_dish);
          restoredSet.add(s.original_dish);
          return;
        }
        if (s.original_dish !== s.replacement_dish && !activeMenu.includes(s.original_dish)) {
          restoredSet.delete(s.original_dish);
          set.add(s.original_dish);
        }
      }
    );

    getCustomDishesFor(booking.id).forEach((cd) => {
      if (
        cd.replaces_dish &&
        !restoredSet.has(cd.replaces_dish) &&
        !activeMenu.includes(cd.replaces_dish)
      ) {
        set.add(cd.replaces_dish);
      }
    });
    return set;
  };

  const dishCategoryFor = (dishName: string, booking: any) =>
    getBookingDishCategory(dishName, booking, menuItems, getCustomDishesFor(booking?.id));

  const handleMenuToggle = (itemName: string) => {
    clearModErrorToast();
    const isSelected = modSelectedDishes.includes(itemName);
    if (!isSelected && getUnavailableDishesFor(modifyingBooking).has(itemName)) {
      triggerModErrorToast(`"${itemName}" is unavailable for your event date and was replaced by the coordinator.`);
      return;
    }
    const ruleCat = dishCategoryFor(itemName, modifyingBooking);
    const limits = modifyingBooking?.packages?.category_limits;
    const maxLimit = limits && limits[ruleCat] !== undefined ? Number(limits[ruleCat]) : null;

    if (!isSelected && maxLimit !== null && maxLimit > 0) {
      const currentInCat = modSelectedDishes.filter((name) => {
        return dishCategoryFor(name, modifyingBooking) === ruleCat;
      }).length;

      if (currentInCat >= maxLimit) {
        triggerModErrorToast(`You can only select up to ${maxLimit} dish(es) for ${ruleCat}. Deselect one to swap.`);
        return;
      }
    }

    const updated = isSelected
      ? modSelectedDishes.filter((i) => i !== itemName)
      : [...modSelectedDishes, itemName];

    setModSelectedDishes(updated);
  };

  const handleSubmitModification = async () => {
    if (!modifyingBooking) return;

    const eventDateObj = new Date(`${modifyingBooking.event_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 14) {
      triggerModErrorToast("Modifications locked: All changes require 14 days prior notice per contract.");
      return;
    }

    const currentReqs = Array.isArray(modifyingBooking?.modification_requests)
      ? modifyingBooking.modification_requests.filter((r: any) => r.status !== "Superseded")
      : [];
    if (currentReqs.some((r: any) => r.status === "Applied" || r.status === "Pending")) {
      triggerModErrorToast("Cannot submit: Your previous modification request is awaiting coordinator acknowledgment.");
      return;
    }

    // Validate package category limits just like Step 3 of the Booking screen
    const pkgLimits = modifyingBooking?.packages?.category_limits;
    if (pkgLimits && Object.keys(pkgLimits).length > 0 && menuItems.length > 0) {
      for (const cat of categoryOrder) {
        const reqMax = pkgLimits[cat] !== undefined ? Number(pkgLimits[cat]) : 0;
        if (reqMax <= 0) continue;
        const unavailable = getUnavailableDishesFor(modifyingBooking);
        const availableInCat = menuItems.filter(
          (mi) => mi.status !== "Archived" && mi.status !== "Not Available" && !unavailable.has(mi.name) && getRuleCategory(mi.category, mi.name) === cat
        );
        const customInCat = getCustomDishesFor(modifyingBooking.id).filter(
          (cd) =>
            cd.category === cat &&
            (!cd.replaces_dish || unavailable.has(cd.replaces_dish) || modSelectedDishes.includes(cd.name))
        );
        const dynamicMin = Math.min(reqMax, availableInCat.length + customInCat.length);
        const selectedCount = modSelectedDishes.filter((name) => {
          return dishCategoryFor(name, modifyingBooking) === cat;
        }).length;
        if (selectedCount < dynamicMin) {
          triggerModErrorToast(`Please select ${dynamicMin} dish(es) for ${cat} (${selectedCount}/${dynamicMin} selected).`);
          return;
        }
        if (selectedCount > reqMax) {
          triggerModErrorToast(`You can only have ${reqMax} dish(es) for ${cat} (${selectedCount} selected). Deselect one to continue.`);
          return;
        }
      }
    }

    const unavailableSelected = modSelectedDishes.filter((d) =>
      getUnavailableDishesFor(modifyingBooking).has(d)
    );
    if (unavailableSelected.length > 0) {
      triggerModErrorToast(`"${unavailableSelected[0]}" is unavailable for your event date. Please choose another dish.`);
      return;
    }

    const basePax = Number(modifyingBooking.guest_count) || 50;
    const prevAdditionalPax = Number(modifyingBooking.additional_pax) || 0;
    const extraPax = Math.max(0, Number(modAdditionalPax) || 0);
    const prevMenuItems: string[] = Array.isArray(modifyingBooking.selected_menu_items)
      ? modifyingBooking.selected_menu_items
      : [];
    const addedDishes = modSelectedDishes.filter((d) => !prevMenuItems.includes(d));
    const removedDishes = prevMenuItems.filter((d) => !modSelectedDishes.includes(d));
    const trimmedNotes = modNotes.trim();
    const prevNotes = String(modifyingBooking.logistics_info?.client_special_instructions || "").trim();

    if (
      extraPax === prevAdditionalPax &&
      addedDishes.length === 0 &&
      removedDishes.length === 0 &&
      trimmedNotes === prevNotes
    ) {
      triggerModErrorToast("No changes detected to save.");
      return;
    }

    setIsSubmittingMod(true);
    clearModErrorToast();

    const nowIso = new Date().toISOString();
    const requestedTotalGuests = basePax + extraPax;

    // Recalculate total cost & remaining balance matching Admin Dashboard calculateBudget
    const pkg = modifyingBooking.packages;
    const basePrice =
      pkg && pkg.price
        ? parseFloat(String(pkg.price).replace(/[^0-9.-]+/g, "")) || 0
        : 0;
    const addPrice =
      pkg && pkg.additional_pax_price
        ? parseFloat(String(pkg.additional_pax_price).replace(/[^0-9.-]+/g, "")) || 500
        : 500;

    let currentLogistics: any =
      modifyingBooking.logistics_info && typeof modifyingBooking.logistics_info === "object"
        ? { ...modifyingBooking.logistics_info }
        : {};
    let embeddedMeta: any = null;
    if (
      typeof modifyingBooking.food_allergies === "string" &&
      modifyingBooking.food_allergies.includes("__PAYMENT_METADATA__:")
    ) {
      try {
        embeddedMeta = JSON.parse(
          modifyingBooking.food_allergies.split("__PAYMENT_METADATA__:")[1]
        );
        if (Object.keys(currentLogistics).length === 0 && embeddedMeta?.logistics) {
          currentLogistics = { ...embeddedMeta.logistics };
        }
      } catch (e) {}
    }

    const travelFee = Number(currentLogistics?.travelFee) || 0;
    const haulingFee = Number(currentLogistics?.haulingFee) || 0;
    const corkageData = modifyingBooking.corkage_info || currentLogistics?.corkage || null;
    const corkageFee =
      Number(corkageData?.totalCorkageFee) ||
      ((corkageData?.hasLechonTable ? 1500 : 0) +
        Number(corkageData?.alcoholicBeveragesCount || 0) * 400 +
        Number(corkageData?.outsideFoodCount || 0) * 400) ||
      0;

    const prebookedOT = modifyingBooking.overtime_info?.prebooked;
    const dayOfOT = modifyingBooking.overtime_info?.day_of;
    const prebookedOTFee = Number(prebookedOT?.total_prebooked_fee) || 0;
    const dayOfOTFee = Number(dayOfOT?.total_day_of_fee) || 0;
    const totalOTFee = Number(modifyingBooking.overtime_info?.total_overtime_fee) || (prebookedOTFee + dayOfOTFee);

    const newTotalBudget = basePrice + extraPax * addPrice + travelFee + haulingFee + corkageFee + totalOTFee;
    const paymentScheme =
      modifyingBooking.payment_scheme || embeddedMeta?.scheme || "Standard 50%";
    const is50Percent = paymentScheme === "Standard 50%";
    const existingDownpayment =
      Number(modifyingBooking.downpayment_amount) ||
      Number(embeddedMeta?.downpayment) ||
      0;
    const downpaymentDue =
      existingDownpayment > 0
        ? existingDownpayment
        : Math.round(
            Math.max(0, newTotalBudget - travelFee - dayOfOTFee) *
              (is50Percent ? 0.5 : 0.2)
          );
    const newFinalBalance = Math.max(0, newTotalBudget - downpaymentDue);

    // Recalculate unpaid installment milestones if installment plan exists
    const rawSchedule =
      modifyingBooking.installment_schedule || embeddedMeta?.installments || null;
    let updatedSchedule = Array.isArray(rawSchedule)
      ? rawSchedule.map((m: any) => ({ ...m }))
      : null;

    if (updatedSchedule && updatedSchedule.length > 0) {
      let paidTotal = 0;
      const unpaidIndices: number[] = [];
      updatedSchedule.forEach((m: any, idx: number) => {
        if (m.status === "Verified" || m.status === "Paid") {
          paidTotal += Number(m.amount) || 0;
        } else {
          unpaidIndices.push(idx);
        }
      });

      if (unpaidIndices.length > 0) {
        const remainingToDistribute = Math.max(0, newFinalBalance - paidTotal);
        const perMilestone = Math.floor(remainingToDistribute / unpaidIndices.length);
        let acc = 0;
        unpaidIndices.forEach((mIdx, i) => {
          const isLast = i === unpaidIndices.length - 1;
          const amt = isLast ? remainingToDistribute - acc : perMilestone;
          acc += amt;
          updatedSchedule![mIdx] = {
            ...updatedSchedule![mIdx],
            amount: amt,
          };
        });
      }
    }

    const updatedLogistics: any = {
      ...currentLogistics,
      client_special_instructions: trimmedNotes,
      client_modified_at: nowIso,
    };

    let updatedAllergies = modifyingBooking.food_allergies || "";
    if (
      typeof updatedAllergies === "string" &&
      updatedAllergies.includes("__PAYMENT_METADATA__:")
    ) {
      try {
        const parts = updatedAllergies.split("__PAYMENT_METADATA__:");
        const meta = JSON.parse(parts[1]);
        meta.balance = newFinalBalance;
        meta.logistics = updatedLogistics;
        if (updatedSchedule) meta.installments = updatedSchedule;
        updatedAllergies = `${parts[0].trim() ? parts[0].trim() + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(meta)}`;
      } catch (e) {}
    }

    const newRequest = {
      id: `mod-${Date.now()}`,
      created_at: nowIso,
      days_before_event: diffDays,
      is_late: false,
      status: "Applied",
      base_guest_count: basePax,
      previous_guest_count: basePax + prevAdditionalPax,
      previous_additional_pax: prevAdditionalPax,
      requested_guest_count: requestedTotalGuests,
      requested_additional_pax: extraPax,
      previous_menu_items: prevMenuItems,
      requested_menu_items: modSelectedDishes,
      added_dishes: addedDishes,
      removed_dishes: removedDishes,
      notes: trimmedNotes,
    };

    const existingReqs = Array.isArray(modifyingBooking.modification_requests)
      ? modifyingBooking.modification_requests.map((r: any) =>
          r.status === "Pending" ? { ...r, status: "Superseded" } : r
        )
      : [];
    const updatedRequests = [...existingReqs, newRequest];

    // Preserve coordinator unavailability records so unavailable dishes stay locked until coordinator sets them available again
    const existingSubs = Array.isArray(modifyingBooking.dish_substitutions)
      ? modifyingBooking.dish_substitutions
      : [];
    const activeSubsAfterEdit = existingSubs.filter(
      (sub: any) => sub?.restored || sub?.original_dish !== sub?.replacement_dish
    );

    const updatePayload: any = {
      additional_pax: extraPax,
      selected_menu_items: modSelectedDishes,
      dish_substitutions: activeSubsAfterEdit,
      final_balance_amount: newFinalBalance,
      logistics_info: updatedLogistics,
      modification_requests: updatedRequests,
    };
    if (updatedSchedule) {
      updatePayload.installment_schedule = updatedSchedule;
    }
    if (updatedAllergies !== (modifyingBooking.food_allergies || "")) {
      updatePayload.food_allergies = updatedAllergies;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", modifyingBooking.id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === modifyingBooking.id
            ? {
                ...b,
                ...updatePayload,
              }
            : b
        )
      );

      window.dispatchEvent(new CustomEvent("customerBookingsUpdated"));
      setModifyingBooking(null);
      triggerModSuccessToast(
        "Booking updated! Your menu, headcount, and instructions have been saved and sent to our coordinator."
      );
    } catch (err: any) {
      console.error("Error applying booking modification:", err);
      triggerModErrorToast(err.message || "Failed to save booking modifications.");
    } finally {
      setIsSubmittingMod(false);
    }
  };

  const handleOpenBalanceModal = (booking: any, milestoneIndex?: number, milestone?: any) => {
    // If attempting to pay full balance, check if client already started paying in installments
    if (milestoneIndex === undefined && !milestone) {
      const schedule = booking.installment_schedule || booking.paymentData?.installments || [];
      const hasStarted = schedule.some(
        (inst: any) =>
          inst.status === "Verified" ||
          inst.status === "Paid" ||
          (Boolean(inst.receipt_url) && !booking.paymentData?.balanceReceipt) ||
          (inst.status === "Pending Verification" && !booking.paymentData?.balanceReceipt)
      );
      if (hasStarted && !booking.paymentData?.balanceReceipt) {
        return;
      }
    }
    setPayingBalanceBooking(booking);
    setPayingExcessSurcharge(null);
    if (milestoneIndex !== undefined && milestone) {
      setPayingMilestone({
        index: milestoneIndex,
        title: milestone.title || `Installment #${milestoneIndex + 1}`,
        amount: Number(milestone.amount) || 0,
        dueDate: milestone.dueDate || "",
      });
      setBalancePaymentMethod(milestone.payment_method === "Bank Transfer" ? "Bank Transfer" : "GCash");
      setBalanceRef(milestone.reference_number || "");
      setBalanceReceiptImage(milestone.receipt_url || "");
    } else {
      setPayingMilestone(null);
      setBalancePaymentMethod("GCash");
      setBalanceRef(booking.paymentData?.balanceRef || "");
      setBalanceReceiptImage(booking.paymentData?.balanceReceipt || "");
    }
    setBalanceReceiptBlob(null);
    setBalanceReceiptName("");
    setBalanceError("");
    setCopiedBalanceAccount("");
  };

  const handleOpenExcessPaymentModal = (booking: any, postEventBilling: any) => {
    if (!postEventBilling) return;
    setPayingBalanceBooking(booking);
    setPayingMilestone(null);
    setPayingExcessSurcharge({
      amount: Number(postEventBilling.excess_guest_fee) || 0,
      dueDate: postEventBilling.due_date || "",
      excessGuests: Number(postEventBilling.excess_guests) || 0,
      guaranteedPax:
        Number(postEventBilling.guaranteed_headcount) ||
        (Number(booking.guest_count) || 50) + (Number(booking.additional_pax) || 0),
      actualPax:
        Number(postEventBilling.actual_headcount_served) ||
        (Number(booking.guest_count) || 50) + (Number(booking.additional_pax) || 0),
    });
    setBalancePaymentMethod(
      postEventBilling.payment_method === "Bank Transfer" ? "Bank Transfer" : "GCash"
    );
    setBalanceRef(postEventBilling.reference_number || "");
    setBalanceReceiptImage(postEventBilling.receipt_url || "");
    setBalanceReceiptBlob(null);
    setBalanceReceiptName("");
    setBalanceError("");
    setCopiedBalanceAccount("");
  };

  const handleBalanceReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBalanceError("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }

    try {
      setBalanceError("");
      const { dataUrl, blob } = await compressReceiptImage(file);
      setBalanceReceiptImage(dataUrl);
      setBalanceReceiptBlob(blob);
      setBalanceReceiptName(file.name);
    } catch (err) {
      console.error("Receipt compression error:", err);
      setBalanceError("Failed to process image. Please try another image file.");
    }
  };

  const handleSubmitBalancePayment = async () => {
    if (!payingBalanceBooking) return;
    if (!balanceReceiptImage) {
      setBalanceError("Please upload your payment receipt or transfer slip.");
      return;
    }

    setIsSubmittingBalance(true);
    setBalanceError("");

    try {
      // Attempt to upload receipt image to Supabase Storage bucket first (avoids base64 database bloat)
      let finalReceiptUrl = balanceReceiptImage;
      if (balanceReceiptBlob) {
        const uploadedUrl = await uploadReceiptImage(balanceReceiptBlob, payingBalanceBooking.user_id);
        if (uploadedUrl) {
          finalReceiptUrl = uploadedUrl;
        }
      }

      if (payingExcessSurcharge !== null) {
        // === SUBMITTING PAYMENT PROOF FOR POST-EVENT EXCESS HEADCOUNT SURCHARGE ===
        const nowIso = new Date().toISOString();
        let currentLogistics: any =
          payingBalanceBooking.logistics_info &&
          typeof payingBalanceBooking.logistics_info === "object"
            ? { ...payingBalanceBooking.logistics_info }
            : {};

        let baseAllergies = payingBalanceBooking.food_allergies || "";
        let currentMeta: any = null;
        if (
          typeof baseAllergies === "string" &&
          baseAllergies.includes("__PAYMENT_METADATA__:")
        ) {
          const parts = baseAllergies.split("__PAYMENT_METADATA__:");
          baseAllergies = parts[0].trim();
          try {
            currentMeta = JSON.parse(parts[1]);
            if (Object.keys(currentLogistics).length === 0 && currentMeta?.logistics) {
              currentLogistics = { ...currentMeta.logistics };
            }
          } catch (e) {}
        }

        const existingPostEvent =
          currentLogistics.post_event_billing ||
          (payingBalanceBooking as any)?.post_event_billing ||
          {};

        const updatedPostEvent = {
          ...existingPostEvent,
          payment_status: "Pending Verification",
          payment_method: balancePaymentMethod,
          reference_number: balanceRef.trim(),
          receipt_url: finalReceiptUrl,
          submitted_at: nowIso,
          updated_at: nowIso,
        };

        const updatedLogistics = {
          ...currentLogistics,
          post_event_billing: updatedPostEvent,
          updated_at: nowIso,
        };

        const updatePayload: any = {
          logistics_info: updatedLogistics,
        };

        let updatedAllergies = payingBalanceBooking.food_allergies || "";
        if (currentMeta) {
          currentMeta.logistics = updatedLogistics;
          updatedAllergies = `${baseAllergies ? baseAllergies + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(currentMeta)}`;
          updatePayload.food_allergies = updatedAllergies;
        }

        const { error } = await supabase
          .from("bookings")
          .update(updatePayload)
          .eq("id", payingBalanceBooking.id);

        if (error) throw error;

        setBookings((prev) =>
          prev.map((b) =>
            b.id === payingBalanceBooking.id
              ? {
                  ...b,
                  logistics_info: updatedLogistics,
                  food_allergies: updatedAllergies,
                }
              : b
          )
        );

        try {
          const bc = new BroadcastChannel("roxan_catering_events");
          bc.postMessage({
            type: "BOOKINGS_UPDATED",
            bookingId: payingBalanceBooking.id,
            action: "excess_payment_submitted",
          });
          bc.close();
        } catch (e) {}
        try {
          localStorage.setItem("roxan_last_booking_update", String(Date.now()));
        } catch (e) {}

        triggerModSuccessToast(
          "Excess headcount surcharge receipt submitted! Our coordinator will verify your payment shortly."
        );
      } else if (payingMilestone !== null) {
        // === SUBMITTING PAYMENT PROOF FOR AN INDIVIDUAL INSTALLMENT MILESTONE ===
        const currentSchedule: any[] =
          payingBalanceBooking.installment_schedule ||
          payingBalanceBooking.paymentData?.installments ||
          [];

        const updatedSchedule = currentSchedule.map((item: any, idx: number) => {
          if (idx === payingMilestone.index) {
            return {
              ...item,
              status: "Pending Verification",
              payment_method: balancePaymentMethod,
              reference_number: balanceRef.trim(),
              receipt_url: finalReceiptUrl,
              submitted_at: new Date().toISOString(),
            };
          }
          return item;
        });

        // Update database with new installment schedule
        let { error } = await supabase
          .from("bookings")
          .update({
            installment_schedule: updatedSchedule,
          })
          .eq("id", payingBalanceBooking.id);

        // Fallback / sync metadata in food_allergies if used
        let baseAllergies = payingBalanceBooking.food_allergies || "";
        let currentMeta: any = {};
        if (baseAllergies.includes("__PAYMENT_METADATA__:")) {
          const parts = baseAllergies.split("__PAYMENT_METADATA__:");
          baseAllergies = parts[0].trim();
          try {
            currentMeta = JSON.parse(parts[1]);
          } catch (e) {}
        }
        currentMeta.installments = updatedSchedule;
        const updatedAllergies = `${baseAllergies ? baseAllergies + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(currentMeta)}`;

        const fb = await supabase
          .from("bookings")
          .update({ food_allergies: updatedAllergies })
          .eq("id", payingBalanceBooking.id);

        if (error && fb.error) throw error || fb.error;

        // Update local React state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payingBalanceBooking.id
              ? {
                  ...b,
                  installment_schedule: updatedSchedule,
                  food_allergies: updatedAllergies,
                }
              : b,
          ),
        );
      } else {
        // === SUBMITTING FULL FINAL BALANCE ===
        const checkSchedule: any[] =
          payingBalanceBooking.installment_schedule ||
          payingBalanceBooking.paymentData?.installments ||
          [];

        const hasStarted = checkSchedule.some(
          (inst: any) =>
            inst.status === "Verified" ||
            inst.status === "Paid" ||
            (Boolean(inst.receipt_url) && !payingBalanceBooking.paymentData?.balanceReceipt) ||
            (inst.status === "Pending Verification" && !payingBalanceBooking.paymentData?.balanceReceipt)
        );

        if (hasStarted && !payingBalanceBooking.paymentData?.balanceReceipt) {
          setBalanceError("You have already started paying via installment milestones. Full balance payment is no longer allowed.");
          setIsSubmittingBalance(false);
          return;
        }
        const currentSchedule: any[] =
          payingBalanceBooking.installment_schedule ||
          payingBalanceBooking.paymentData?.installments ||
          [];

        const updatedSchedule = currentSchedule.map((item: any) => {
          if (item.status === "Verified" || item.status === "Paid") return item;
          return {
            ...item,
            status: "Pending Verification",
            payment_method: balancePaymentMethod,
            reference_number: balanceRef.trim(),
            receipt_url: finalReceiptUrl,
            submitted_at: new Date().toISOString(),
          };
        });

        const updatePayload: any = {
          final_balance_status: "Pending Verification",
          final_balance_method: balancePaymentMethod,
          final_balance_reference: balanceRef.trim(),
          final_balance_receipt: finalReceiptUrl,
        };
        if (updatedSchedule.length > 0) {
          updatePayload.installment_schedule = updatedSchedule;
        }

        let { error } = await supabase
          .from("bookings")
          .update(updatePayload)
          .eq("id", payingBalanceBooking.id);

        // Resilient fallback if columns not yet in DB
        if (error && error.message.toLowerCase().includes("column")) {
          console.warn("Direct balance columns not yet in DB. Using fallback metadata sync.", error.message);
          let currentMeta: any = {};
          let baseAllergies = payingBalanceBooking.food_allergies || "";
          if (baseAllergies.includes("__PAYMENT_METADATA__:")) {
            const parts = baseAllergies.split("__PAYMENT_METADATA__:");
            baseAllergies = parts[0].trim();
            try {
              currentMeta = JSON.parse(parts[1]);
            } catch (e) {}
          }
          currentMeta.finalBalanceStatus = "Pending Verification";
          currentMeta.finalBalanceMethod = balancePaymentMethod;
          currentMeta.finalBalanceRef = balanceRef.trim();
          currentMeta.finalBalanceReceipt = finalReceiptUrl;
          if (updatedSchedule.length > 0) {
            currentMeta.installments = updatedSchedule;
          }
          const updatedAllergies = `${baseAllergies ? baseAllergies + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(currentMeta)}`;

          const fb = await supabase
            .from("bookings")
            .update({ food_allergies: updatedAllergies })
            .eq("id", payingBalanceBooking.id);
          error = fb.error;
        }

        if (error) throw error;

        // Update state locally
        setBookings((prev) =>
          prev.map((b) =>
            b.id === payingBalanceBooking.id
              ? {
                  ...b,
                  final_balance_status: "Pending Verification",
                  final_balance_method: balancePaymentMethod,
                  final_balance_reference: balanceRef.trim(),
                  final_balance_receipt: finalReceiptUrl,
                  installment_schedule: updatedSchedule.length > 0 ? updatedSchedule : b.installment_schedule,
                  food_allergies:
                    b.food_allergies && b.food_allergies.includes("__PAYMENT_METADATA__:")
                      ? (() => {
                          const parts = b.food_allergies.split("__PAYMENT_METADATA__:");
                          let m: any = {};
                          try {
                            m = JSON.parse(parts[1]);
                          } catch (e) {}
                          m.finalBalanceStatus = "Pending Verification";
                          m.finalBalanceMethod = balancePaymentMethod;
                          m.finalBalanceRef = balanceRef.trim();
                          m.finalBalanceReceipt = finalReceiptUrl;
                          if (updatedSchedule.length > 0) {
                            m.installments = updatedSchedule;
                          }
                          return `${parts[0].trim() ? parts[0].trim() + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(m)}`;
                        })()
                      : b.food_allergies,
                }
              : b,
          ),
        );
      }

      setPayingBalanceBooking(null);
      setPayingMilestone(null);
      setPayingExcessSurcharge(null);
    } catch (err: any) {
      console.error("Error submitting payment proof:", err);
      setBalanceError(err.message || "Failed to submit payment receipt.");
    } finally {
      setIsSubmittingBalance(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <p className="text-gold-400 tracking-[0.2em] uppercase text-sm animate-pulse">
          Loading Inquiries...
        </p>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (filter === "All") return true;
    const status = String(b.status || "Pending")
      .toLowerCase()
      .trim();
    if (filter === "Confirmed")
      return ["accepted", "approved", "confirmed"].includes(status);
    if (filter === "Cancelled")
      return ["cancelled", "declined", "rejected"].includes(status);
    if (filter === "Pending") return ["pending"].includes(status);
    return true;
  });

  const bookingToCancel = cancelModalId
    ? bookings.find((b) => b.id === cancelModalId)
    : null;
  const isCancelConfirmed =
    bookingToCancel &&
    ["accepted", "approved", "confirmed"].includes(
      String(bookingToCancel.status || "")
        .toLowerCase()
        .trim(),
    );

  return (
    <div className="min-h-screen bg-rich-black pt-32 pb-20 px-6 font-sans text-white">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center border-b border-white/10 pb-8">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gold-400 text-sm tracking-[0.3em] font-bold uppercase mb-4 block"
          >
            Your Reservations
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif"
          >
            My <span className="italic gold-text-gradient">Inquiries</span>
          </motion.h1>
        </header>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 mb-8 rounded-sm text-center max-w-2xl mx-auto">
            <p className="text-red-400 font-bold mb-1">
              Could not load bookings
            </p>
            <p className="text-red-400/80 text-sm">{errorMsg}</p>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {["All", "Pending", "Confirmed", "Cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all ${filter === f ? "bg-gold-400 text-black" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32 px-6 glass-card border border-white/10 flex flex-col items-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-gold-400/5 blur-[80px] pointer-events-none" />
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative">
              <Calendar className="text-white/40" size={40} strokeWidth={1} />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0a0a0a] rounded-full border border-white/10 flex items-center justify-center">
                <span className="text-gold-400 text-lg font-serif italic">
                  0
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-serif text-white mb-4">
              {filter === "All" ? "No Inquiries Yet" : `No ${filter} Bookings`}
            </h3>
            <p className="text-white/50 mb-10 tracking-wide font-medium max-w-md mx-auto leading-relaxed">
              {filter === "All"
                ? "Your booking history is currently empty. Start planning your special event with our curated catering collections today."
                : `You don't have any bookings marked as ${filter.toLowerCase()} at the moment.`}
            </p>

            {filter === "All" ? (
              <Link
                to="/booking"
                className="gold-gradient text-black px-12 py-4 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-flex items-center gap-3 shadow-[0_0_30px_rgba(197,160,89,0.15)]"
              >
                Start a Booking <ChevronRight size={16} />
              </Link>
            ) : (
              <button
                onClick={() => setFilter("All")}
                className="border border-white/20 text-white hover:border-gold-400 hover:text-gold-400 px-10 py-3 font-bold tracking-widest uppercase text-xs transition-all"
              >
                View All Inquiries
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking, i) => {
              const status = String(booking.status || "Pending").trim();
              const statusLower = status.toLowerCase();
              const isCancelled = [
                "cancelled",
                "declined",
                "rejected",
              ].includes(statusLower);
              const isApproved = ["accepted", "approved", "confirmed"].includes(
                statusLower,
              );
              const reason =
                booking.reason ||
                booking.reject_reason ||
                booking.cancellation_reason ||
                booking.admin_notes;

              // Compute complete financial breakdown upfront so payment tracker and breakdown cards reconcile identically
              const pkg = booking.packages;
              const basePrice = pkg && pkg.price ? parseFloat(String(pkg.price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
              const addPrice = pkg && pkg.additional_pax_price ? parseFloat(String(pkg.additional_pax_price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
              const extraPax = parseInt(booking.additional_pax) || 0;
              const additionalPaxTotal = addPrice * extraPax;

              let logData = booking.logistics_info || null;
              if ((!logData || Object.keys(logData).length === 0) && typeof booking.food_allergies === "string" && booking.food_allergies.includes("__PAYMENT_METADATA__:")) {
                try {
                  const meta = JSON.parse(booking.food_allergies.split("__PAYMENT_METADATA__:")[1]);
                  if (meta?.logistics) logData = meta.logistics;
                } catch (e) {}
              }

              const travelFee = Number(logData?.travelFee) || 0;
              const haulingFee = Number(logData?.haulingFee) || 0;
              const corkageData = (booking as any).corkage_info || logData?.corkage || null;
              const corkageFee = Number(corkageData?.totalCorkageFee) || (
                (corkageData?.hasLechonTable ? 1500 : 0) +
                (Number(corkageData?.alcoholicBeveragesCount || 0) * 400) +
                (Number(corkageData?.outsideFoodCount || 0) * 400)
              ) || 0;

              let otData = (booking as any).overtime_info;
              if (typeof otData === "string") {
                try { otData = JSON.parse(otData); } catch (e) {}
              }
              if ((!otData || Object.keys(otData).length === 0) && typeof booking.food_allergies === "string" && booking.food_allergies.includes("__PAYMENT_METADATA__:")) {
                try {
                  const meta = JSON.parse(booking.food_allergies.split("__PAYMENT_METADATA__:")[1]);
                  if (meta?.overtime) otData = meta.overtime;
                } catch (e) {}
              }

              const prebookedOT = otData?.prebooked;
              const dayOfOT = otData?.day_of;
              const prebookedOTFee = Number(prebookedOT?.total_prebooked_fee) || 0;
              const dayOfOTFee = Number(dayOfOT?.total_day_of_fee) || 0;
              const totalOTFee = Number(otData?.total_overtime_fee) || (prebookedOTFee + dayOfOTFee);

              const isOutdoor = Boolean(
                logData?.isOutdoor ||
                logData?.venueType === "Outdoor" ||
                (booking.event_location || "").toLowerCase().includes("outdoor") ||
                (booking.event_location || "").toLowerCase().includes("garden")
              );
              const rainLaundryFee = Number(logData?.rainLaundryFee) || (logData?.rainLaundryApplied ? 2000 : 0);
              const postEventBilling = logData?.post_event_billing || (booking as any)?.post_event_billing || null;
              const excessGuestFee = Number(postEventBilling?.excess_guest_fee) || 0;
              const isExcessSettled = Boolean(
                postEventBilling &&
                  (postEventBilling.payment_status === "Verified" ||
                    postEventBilling.payment_status === "Paid")
              );
              const isExcessUnderReview = Boolean(
                postEventBilling &&
                  !isExcessSettled &&
                  excessGuestFee > 0 &&
                  (postEventBilling.payment_status === "Pending Verification" ||
                    Boolean(postEventBilling.receipt_url))
              );
              const excessReceiptUrl = String(postEventBilling?.receipt_url || "");

      const totalAdditionalFees = travelFee + haulingFee + corkageFee + totalOTFee + rainLaundryFee;
              const totalEventCost = basePrice + additionalPaxTotal + totalAdditionalFees;

              const paymentData = (() => {
                let method = booking.payment_method || "";
                let scheme = booking.payment_scheme || "";
                let downpayment = Number(booking.downpayment_amount) || 0;
                let status = booking.payment_status || "Pending Verification";
                let receipt = booking.receipt_url || "";
                let ref = booking.reference_number || "";
                let balanceAmount = Number(booking.final_balance_amount) || 0;
                let balanceStatus = booking.final_balance_status || "Unpaid";
                let balanceMethod = booking.final_balance_method || "";
                let balanceRef = booking.final_balance_reference || "";
                let balanceReceipt = booking.final_balance_receipt || "";
                let installments = booking.installment_schedule || null;

                if (typeof booking.food_allergies === "string" && booking.food_allergies.includes("__PAYMENT_METADATA__:")) {
                  try {
                    const raw = booking.food_allergies.split("__PAYMENT_METADATA__:")[1];
                    const parsed = JSON.parse(raw);
                    if (!method) method = parsed.method || "";
                    if (!scheme) scheme = parsed.scheme || "";
                    if (!downpayment) downpayment = Number(parsed.downpayment) || 0;
                    if (!status || status === "Pending Verification") status = parsed.status || "Pending Verification";
                    if (!receipt) receipt = parsed.receipt || "";
                    if (!ref) ref = parsed.ref || "";
                    if (!balanceAmount) balanceAmount = Number(parsed.balance) || 0;
                    if (!balanceStatus || balanceStatus === "Unpaid") balanceStatus = parsed.finalBalanceStatus || "Unpaid";
                    if (!balanceMethod) balanceMethod = parsed.finalBalanceMethod || "";
                    if (!balanceRef) balanceRef = parsed.finalBalanceRef || "";
                    if (!balanceReceipt) balanceReceipt = parsed.finalBalanceReceipt || "";
                    if (!installments) installments = parsed.installments || null;
                  } catch (e) {}
                }

                if (!method && !downpayment && !receipt && !balanceAmount) return null;

                const is50Percent = (scheme || "Standard 50%") === "Standard 50%";
                // Fixed date-lock deposit strictly excludes post-booking additions (out-of-town travel fee & day-of overtime)
                const effectiveDownpayment = downpayment > 0
                  ? downpayment
                  : Math.round(Math.max(0, totalEventCost - travelFee - dayOfOTFee - rainLaundryFee) * (is50Percent ? 0.5 : 0.2));

                // If customer is on installment plan, sum verified/paid milestones
                let paidMilestones = 0;
                if (Array.isArray(installments)) {
                  installments.forEach((inst: any) => {
                    if (inst.status === "Verified" || inst.status === "Paid") {
                      paidMilestones += Number(inst.amount) || 0;
                    }
                  });
                }

                // Balance due must ALWAYS accurately equal Total Event Cost minus Downpayment (and any paid milestones)
                const computedBalanceDue = Math.max(0, totalEventCost - effectiveDownpayment - paidMilestones);

                return {
                  method: method || "Payment",
                  scheme: scheme || "Standard 50%",
                  downpayment: effectiveDownpayment,
                  paidMilestones,
                  status,
                  receipt,
                  ref,
                  balanceAmount: computedBalanceDue,
                  balanceStatus,
                  balanceMethod,
                  balanceRef,
                  balanceReceipt,
                  installments,
                };
              })();

              const bookingKey = String(booking.id || i);
              const shortId = booking.id ? String(booking.id).split("-")[0] : "N/A";
              const cardHeadingId = `booking-heading-${bookingKey}`;
              const packageTitle = booking.packages?.name || "Custom Package";
              const totalGuests = (Number(booking.guest_count) || 0) + extraPax;

              const rawDatePart = booking.event_date ? String(booking.event_date).split("T")[0] : "";
              const eventDateObj = rawDatePart ? new Date(`${rawDatePart}T00:00:00`) : new Date(NaN);
              const isValidEventDate = !isNaN(eventDateObj.getTime());
              const formattedEventDate = isValidEventDate
                ? eventDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : booking.event_date || "Date TBD";

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysUntilEvent = isValidEventDate
                ? Math.ceil((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              const finalDeadline = isValidEventDate
                ? new Date(eventDateObj.getTime() - 15 * 24 * 60 * 60 * 1000)
                : null;
              const daysUntilDeadline = finalDeadline
                ? Math.ceil((finalDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const formattedDeadline = finalDeadline
                ? finalDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "";

              const isModificationLocked = daysUntilEvent <= 14;
              const daysLeftToModify = Math.max(0, daysUntilEvent - 14);
              const cutoffDate = isValidEventDate
                ? new Date(eventDateObj.getTime() - 14 * 24 * 60 * 60 * 1000)
                : null;
              const formattedCutoffDate = cutoffDate
                ? cutoffDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "";

              const prebookedCateringHours = Number(prebookedOT?.catering_hours) || 0;
              const serviceWin = calculateServiceWindow(booking.event_time, prebookedCateringHours);
              const serviceTimeLabel = serviceWin.hasExtraHours
                ? `${serviceWin.extendedWindowText} (+${prebookedCateringHours}h OT)`
                : serviceWin.standardWindowText;

              const isOutsideTaytay = Boolean(
                logData?.isOutsideTaytay !== undefined
                  ? logData.isOutsideTaytay
                  : (booking.event_location || "").toLowerCase().includes("taytay") === false
              );
              const isTravelFeePending = !isCancelled && isOutsideTaytay && travelFee === 0;

              const currentMenuList: string[] = Array.isArray(booking.selected_menu_items)
                ? booking.selected_menu_items
                : [];
              const substitutions: any[] = Array.isArray(booking.dish_substitutions)
                ? booking.dish_substitutions.filter(
                    (sub: any) =>
                      !sub?.restored &&
                      sub?.original_dish !== sub?.replacement_dish &&
                      sub?.replacement_dish &&
                      currentMenuList.includes(sub.replacement_dish)
                  )
                : [];
              const modRequests: any[] = Array.isArray(booking.modification_requests)
                ? booking.modification_requests.filter((r: any) => r.status !== "Superseded")
                : [];
              const latestRequest = modRequests.length > 0 ? modRequests[modRequests.length - 1] : null;
              const hasUnacknowledgedModification = modRequests.some(
                (r: any) => r.status === "Applied" || r.status === "Pending"
              );
              const unacknowledgedMod = modRequests.find(
                (r: any) => r.status === "Applied" || r.status === "Pending"
              );
              const activeInstructions =
                (logData?.client_special_instructions || "").trim() ||
                (latestRequest?.notes || "").trim();

              const installmentList: any[] = Array.isArray(paymentData?.installments)
                ? paymentData.installments
                : [];
              const isMultiInstallment = installmentList.length > 1;
              const singleMilestone = installmentList.length === 1 ? installmentList[0] : null;
              const hasStartedInstallments = Boolean(
                isMultiInstallment &&
                  installmentList.some(
                    (inst: any) =>
                      inst.status === "Verified" ||
                      inst.status === "Paid" ||
                      (Boolean(inst.receipt_url) && !paymentData?.balanceReceipt) ||
                      (inst.status === "Pending Verification" && !paymentData?.balanceReceipt)
                  )
              );
              const isBalanceSettled = Boolean(
                paymentData &&
                  (paymentData.balanceStatus === "Verified" ||
                    (!isMultiInstallment &&
                      (singleMilestone?.status === "Verified" || singleMilestone?.status === "Paid")) ||
                    (isMultiInstallment &&
                      installmentList.every(
                        (inst: any) => inst.status === "Verified" || inst.status === "Paid"
                      )))
              );
              const isBalanceUnderReview = Boolean(
                paymentData &&
                  !isBalanceSettled &&
                  (paymentData.balanceStatus === "Pending Verification" ||
                    (!isMultiInstallment && singleMilestone?.status === "Pending Verification"))
              );
              const singleSettlementReceipt =
                paymentData?.balanceReceipt || (!isMultiInstallment ? singleMilestone?.receipt_url || "" : "");
              const settledMilestonesCount = isMultiInstallment
                ? installmentList.filter(
                    (inst: any) =>
                      inst.status === "Verified" ||
                      inst.status === "Paid" ||
                      paymentData?.balanceStatus === "Verified"
                  ).length
                : 0;

              const openSingleSettlementModal = () => {
                if (!paymentData) return;
                if (
                  singleMilestone &&
                  !paymentData.balanceReceipt &&
                  (Boolean(singleMilestone.receipt_url) ||
                    singleMilestone.status === "Pending Verification")
                ) {
                  handleOpenBalanceModal({ ...booking, paymentData }, 0, singleMilestone);
                } else {
                  handleOpenBalanceModal({ ...booking, paymentData });
                }
              };

              const availableTabs: {
                key: InquiryTab;
                label: string;
                badge?: string;
                alertDot?: boolean;
              }[] = [
                ...((paymentData || excessGuestFee > 0)
                  ? [
                      {
                        key: "payments" as InquiryTab,
                        label: "Payments",
                        badge: isMultiInstallment
                          ? `${settledMilestonesCount}/${installmentList.length}`
                          : undefined,
                        alertDot: Boolean(
                          !isCancelled &&
                            ((!isBalanceSettled &&
                              !isBalanceUnderReview &&
                              daysUntilDeadline !== null &&
                              daysUntilDeadline <= 7) ||
                              (excessGuestFee > 0 && !isExcessSettled && !isExcessUnderReview))
                        ),
                      },
                    ]
                  : []),
                {
                  key: "menu",
                  label: "Menu & Details",
                  badge: String(currentMenuList.length),
                  alertDot: Boolean(
                    !isCancelled && (substitutions.length > 0 || hasUnacknowledgedModification)
                  ),
                },
                {
                  key: "breakdown",
                  label: "Cost Breakdown",
                  alertDot: isTravelFeePending,
                },
              ];

              const defaultTab: InquiryTab =
                !isCancelled && (paymentData || excessGuestFee > 0) ? "payments" : "breakdown";
              const storedTab = activeTabByBooking[bookingKey];
              const activeTab: InquiryTab =
                storedTab && availableTabs.some((t) => t.key === storedTab)
                  ? storedTab
                  : defaultTab;

              const selectTab = (tabKey: InquiryTab) => {
                setActiveTabByBooking((prev) => ({ ...prev, [bookingKey]: tabKey }));
              };

              const handleTabKeyDown = (
                e: React.KeyboardEvent<HTMLButtonElement>,
                currentIdx: number
              ) => {
                let nextIdx: number | null = null;
                if (e.key === "ArrowRight") {
                  nextIdx = (currentIdx + 1) % availableTabs.length;
                } else if (e.key === "ArrowLeft") {
                  nextIdx = (currentIdx - 1 + availableTabs.length) % availableTabs.length;
                } else if (e.key === "Home") {
                  nextIdx = 0;
                } else if (e.key === "End") {
                  nextIdx = availableTabs.length - 1;
                }
                if (nextIdx !== null) {
                  e.preventDefault();
                  const nextTab = availableTabs[nextIdx];
                  selectTab(nextTab.key);
                  document.getElementById(`tab-${bookingKey}-${nextTab.key}`)?.focus();
                }
              };

              return (
                <motion.article
                  key={bookingKey}
                  aria-labelledby={cardHeadingId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card border border-white/10 rounded-lg relative overflow-hidden hover:border-gold-400/25 transition-colors"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute top-0 left-0 w-1 h-full ${
                      isCancelled
                        ? "bg-red-500/80"
                        : isApproved
                        ? "bg-emerald-500"
                        : "bg-gold-400"
                    }`}
                  />

                  {/* 1. Event Hero Header */}
                  <div className="p-5 sm:p-6 pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h2
                            id={cardHeadingId}
                            className="text-xl sm:text-2xl font-serif text-white leading-snug"
                          >
                            {packageTitle}
                          </h2>
                          <span className="text-[11px] text-white/40 font-mono">
                            #{shortId}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border ${
                            isCancelled
                              ? "border-red-500/40 text-red-400 bg-red-500/10"
                              : isApproved
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : "border-gold-400/40 text-gold-300 bg-gold-400/10"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCancelled
                                ? "bg-red-400"
                                : isApproved
                                ? "bg-emerald-400"
                                : "bg-gold-400"
                            }`}
                          />
                          {statusLower === "pending" ? "Pending Review" : status}
                        </span>
                        {isApproved && (booking.updated_at || booking.created_at) && (
                          <span className="text-[10px] text-white/40">
                            Confirmed{" "}
                            {new Date(booking.updated_at || booking.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Event Metadata Strip */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/80">
                      <div className="inline-flex flex-wrap items-center gap-2">
                        <Calendar size={15} className="text-gold-400 shrink-0" aria-hidden="true" />
                        <span className="font-medium text-white">{formattedEventDate}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                            serviceWin.hasExtraHours
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-white/5 border-white/10 text-white/70"
                          }`}
                        >
                          {serviceTimeLabel}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-2">
                        <Users size={15} className="text-gold-400 shrink-0" aria-hidden="true" />
                        <span className="font-medium">
                          {totalGuests} Guests
                          {extraPax > 0 && (
                            <span className="text-gold-300/90 text-xs ml-1.5 font-normal">
                              ({booking.guest_count || 50} + {extraPax} extra)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="inline-flex items-start gap-2 min-w-0 max-w-full">
                        <MapPin size={15} className="text-gold-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="text-white/70 leading-snug line-clamp-1">
                          {booking.event_location || "Location TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Exception-Only Alert Strip (Cancelled, Dish Substitutions, Mod Status) */}
                  {(isCancelled ||
                    substitutions.length > 0 ||
                    unacknowledgedMod ||
                    latestRequest?.status === "Rejected") && (
                    <div className="px-5 sm:px-6 pb-4 space-y-2">
                      {isCancelled && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <p className="text-red-300">
                            <strong className="font-bold text-red-400">Cancellation Reason:</strong>{" "}
                            {reason || "No reason provided"}
                          </p>
                          <span className="text-[10px] text-red-300/60 uppercase tracking-wider font-semibold shrink-0">
                            {new Date(booking.updated_at || booking.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        </div>
                      )}


                      {!isCancelled && substitutions.length > 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2 min-w-0">
                            <RefreshCw
                              size={14}
                              className="text-amber-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <p className="text-white/85 leading-relaxed">
                              <strong className="text-amber-300">Coordinator Dish Update:</strong>{" "}
                              {substitutions
                                .map((s: any) => `${s.original_dish} → ${s.replacement_dish}`)
                                .join(" · ")}
                            </p>
                          </div>
                          {activeTab !== "menu" && (
                            <button
                              type="button"
                              onClick={() => selectTab("menu")}
                              className="text-[11px] font-bold uppercase tracking-wider text-amber-300 hover:text-white transition-colors self-start sm:self-auto shrink-0 min-h-7 px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                            >
                              Review Menu →
                            </button>
                          )}
                        </div>
                      )}

                      {!isCancelled && unacknowledgedMod && (
                        <div className="p-3 bg-amber-500/[0.08] border border-amber-500/25 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Clock
                              size={14}
                              className="text-amber-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <div className="space-y-0.5">
                              <p className="text-amber-200 font-semibold">
                                Menu / headcount update awaiting coordinator acknowledgment
                              </p>
                              {(unacknowledgedMod.added_dishes?.length > 0 ||
                                (unacknowledgedMod.requested_additional_pax !== undefined &&
                                  unacknowledgedMod.requested_additional_pax !==
                                    unacknowledgedMod.previous_additional_pax)) && (
                                <p className="text-[11px] text-white/65">
                                  {unacknowledgedMod.added_dishes?.length > 0 && (
                                    <span>
                                      Swapped:{" "}
                                      {unacknowledgedMod.removed_dishes?.length > 0
                                        ? `${unacknowledgedMod.removed_dishes.join(", ")} → `
                                        : ""}
                                      <strong className="text-emerald-300">
                                        {unacknowledgedMod.added_dishes.join(", ")}
                                      </strong>
                                    </span>
                                  )}
                                  {unacknowledgedMod.added_dishes?.length > 0 &&
                                    unacknowledgedMod.requested_additional_pax !== undefined &&
                                    unacknowledgedMod.requested_additional_pax !==
                                      unacknowledgedMod.previous_additional_pax &&
                                    " · "}
                                  {unacknowledgedMod.requested_additional_pax !== undefined &&
                                    unacknowledgedMod.requested_additional_pax !==
                                      unacknowledgedMod.previous_additional_pax && (
                                      <span>
                                        Guests: {unacknowledgedMod.requested_guest_count} total
                                      </span>
                                    )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {!isCancelled && latestRequest && latestRequest.status === "Rejected" && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2 text-xs">
                          <AlertCircle
                            size={14}
                            className="text-red-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-red-300 font-semibold">
                              Recent modification reverted by coordinator
                            </p>
                            {latestRequest.review_note && (
                              <p className="text-white/75 text-[11px] italic mt-0.5">
                                &ldquo;{latestRequest.review_note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Unified 3-Column Financial Summary Strip */}
                  <div className={`mx-5 sm:mx-6 mb-4 rounded-md bg-white/[0.03] border border-white/10 grid grid-cols-1 ${excessGuestFee > 0 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"} divide-y sm:divide-y-0 sm:divide-x divide-white/10`}>
                    <div className="px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45">
                        Estimated Total
                      </p>
                      <p className="text-lg sm:text-xl font-serif font-bold text-white tabular-nums mt-0.5">
                        ₱{totalEventCost.toLocaleString()}
                      </p>
                      <p className="text-[11px] mt-0.5">
                        {isTravelFeePending ? (
                          <span className="text-amber-300/90">Out-of-town travel fee TBD</span>
                        ) : totalAdditionalFees > 0 ? (
                          <span className="text-white/50">
                            Includes +₱{totalAdditionalFees.toLocaleString()} add-ons &amp; fees
                          </span>
                        ) : (
                          <span className="text-white/45">Standard package rate</span>
                        )}
                      </p>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45">
                          {paymentData ? `Deposit · ${paymentData.method}` : "Deposit"}
                        </p>
                        {paymentData?.receipt && (
                          <button
                            type="button"
                            aria-describedby={cardHeadingId}
                            onClick={() => setViewingReceiptUrl(paymentData.receipt)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 hover:text-gold-200 transition-colors min-h-6 px-1.5 -my-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 cursor-pointer"
                          >
                            <Eye size={11} aria-hidden="true" /> View Slip
                          </button>
                        )}
                      </div>
                      <p className="text-lg sm:text-xl font-serif font-bold text-white/95 tabular-nums mt-0.5">
                        {paymentData ? `₱${paymentData.downpayment.toLocaleString()}` : "—"}
                      </p>
                      <p className="text-[11px] mt-0.5">
                        {paymentData ? (
                          <span
                            className={
                              paymentData.status === "Verified"
                                ? "text-emerald-400 font-medium"
                                : "text-gold-300 font-medium"
                            }
                          >
                            {paymentData.status}
                          </span>
                        ) : (
                          <span className="text-white/40">No deposit recorded</span>
                        )}
                      </p>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45">
                        Balance Due
                      </p>
                      <p
                        className={`text-lg sm:text-xl font-serif font-bold tabular-nums mt-0.5 ${
                          isCancelled
                            ? "text-white/40"
                            : isBalanceSettled
                            ? "text-emerald-400"
                            : "text-gold-400"
                        }`}
                      >
                        {paymentData ? `₱${paymentData.balanceAmount.toLocaleString()}` : "—"}
                      </p>
                      <p className="text-[11px] mt-0.5">
                        {isCancelled ? (
                          <span className="text-white/40">Booking cancelled</span>
                        ) : !paymentData ? (
                          <span className="text-white/40">Pending computation</span>
                        ) : isBalanceSettled ? (
                          <span className="text-emerald-400 font-medium">Settled &amp; Verified</span>
                        ) : isBalanceUnderReview ? (
                          <span className="text-amber-300 font-medium">Receipt under review</span>
                        ) : formattedDeadline ? (
                          <span
                            className={
                              daysUntilDeadline !== null && daysUntilDeadline <= 0
                                ? "text-red-400 font-semibold"
                                : daysUntilDeadline !== null && daysUntilDeadline <= 7
                                ? "text-amber-300 font-medium"
                                : "text-white/60"
                            }
                          >
                            Due {formattedDeadline}
                            {daysUntilDeadline !== null &&
                              (daysUntilDeadline > 0
                                ? ` · ${daysUntilDeadline}d left`
                                : ` · ${Math.abs(daysUntilDeadline)}d overdue`)}
                          </span>
                        ) : (
                          <span className="text-white/50">Unpaid</span>
                        )}
                      </p>
                    </div>

                    {excessGuestFee > 0 && (
                      <div className="px-4 py-3 bg-rose-500/[0.03]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-300/80">
                            Excess Surcharge
                          </p>
                          {excessReceiptUrl && (
                            <button
                              type="button"
                              aria-describedby={cardHeadingId}
                              onClick={() => setViewingReceiptUrl(excessReceiptUrl)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 hover:text-gold-200 transition-colors min-h-6 px-1.5 -my-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 cursor-pointer"
                            >
                              <Eye size={11} aria-hidden="true" /> View Slip
                            </button>
                          )}
                        </div>
                        <p
                          className={`text-lg sm:text-xl font-serif font-bold tabular-nums mt-0.5 ${
                            isCancelled
                              ? "text-white/40"
                              : isExcessSettled
                              ? "text-emerald-400"
                              : isExcessUnderReview
                              ? "text-amber-300"
                              : "text-rose-400"
                          }`}
                        >
                          ₱{excessGuestFee.toLocaleString()}
                        </p>
                        <p className="text-[11px] mt-0.5">
                          {isCancelled ? (
                            <span className="text-white/40">Booking cancelled</span>
                          ) : isExcessSettled ? (
                            <span className="text-emerald-400 font-medium">Settled &amp; Verified</span>
                          ) : isExcessUnderReview ? (
                            <span className="text-amber-300 font-medium">Receipt under review</span>
                          ) : (
                            <span className="text-rose-300 font-medium">
                              Unpaid{postEventBilling?.due_date ? ` · Due ${postEventBilling.due_date}` : ""}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4. Accessible Tab Navigation Bar */}
                  <div className="px-5 sm:px-6 border-t border-b border-white/10 bg-black/25 flex items-center gap-1 overflow-x-auto">
                    <div
                      role="tablist"
                      aria-labelledby={cardHeadingId}
                      className="flex items-center gap-1 sm:gap-2 min-w-max"
                    >
                      {availableTabs.map((tab, tabIdx) => {
                        const isSelected = activeTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            id={`tab-${bookingKey}-${tab.key}`}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            aria-controls={`panel-${bookingKey}-${tab.key}`}
                            tabIndex={isSelected ? 0 : -1}
                            onClick={() => selectTab(tab.key)}
                            onKeyDown={(e) => handleTabKeyDown(e, tabIdx)}
                            className={`min-h-10 px-3 sm:px-4 py-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors inline-flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-400 ${
                              isSelected
                                ? "border-gold-400 text-gold-300"
                                : "border-transparent text-white/50 hover:text-white/85"
                            }`}
                          >
                            {tab.key === "payments" && (
                              <CreditCard size={13} aria-hidden="true" />
                            )}
                            {tab.key === "menu" && (
                              <Utensils size={13} aria-hidden="true" />
                            )}
                            {tab.key === "breakdown" && (
                              <Receipt size={13} aria-hidden="true" />
                            )}
                            <span>{tab.label}</span>
                            {tab.badge && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold tabular-nums ${
                                  isSelected
                                    ? "bg-gold-400/20 text-gold-300"
                                    : "bg-white/10 text-white/55"
                                }`}
                              >
                                {tab.badge}
                              </span>
                            )}
                            {tab.alertDot && (
                              <span
                                aria-hidden="true"
                                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Active Tab Panel */}
                  <div
                    role="tabpanel"
                    id={`panel-${bookingKey}-${activeTab}`}
                    aria-labelledby={`tab-${bookingKey}-${activeTab}`}
                    className="p-5 sm:p-6"
                  >
                    {/* TAB 1: PAYMENTS & INSTALLMENT SCHEDULE */}
                    {activeTab === "payments" && (paymentData || excessGuestFee > 0) && (
                      <div className="space-y-4">
                        {paymentData && (
                          <>
                        {/* Quiet Initial Deposit Record Line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/75">
                            <span className="font-semibold text-white">
                              Initial Deposit ({paymentData.scheme})
                            </span>
                            <span className="text-white/40">·</span>
                            <span className="tabular-nums font-semibold text-white/90">
                              ₱{paymentData.downpayment.toLocaleString()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white/70">
                              {paymentData.method}
                            </span>
                            {paymentData.ref && (
                              <span className="text-[11px] text-white/45 font-mono">
                                Ref: {paymentData.ref}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`text-[11px] font-semibold ${
                                paymentData.status === "Verified"
                                  ? "text-emerald-400"
                                  : "text-gold-300"
                              }`}
                            >
                              {paymentData.status}
                            </span>
                            {paymentData.receipt && (
                              <button
                                type="button"
                                aria-describedby={cardHeadingId}
                                onClick={() => setViewingReceiptUrl(paymentData.receipt)}
                                className="px-2.5 py-1 min-h-7 border border-white/15 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                              >
                                <Eye size={11} aria-hidden="true" /> Deposit Slip
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Single-Milestone / Standard Final Settlement (Deduplicated) */}
                        {!isCancelled && !isMultiInstallment && (
                          <div className="p-4 rounded-md bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-sans font-bold text-white tracking-wide">
                                  Final Balance Settlement
                                </h3>
                                {isBalanceSettled ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 inline-flex items-center gap-1">
                                    <CheckCircle size={11} aria-hidden="true" /> Settled
                                  </span>
                                ) : isBalanceUnderReview ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/35 inline-flex items-center gap-1">
                                    <Clock size={11} aria-hidden="true" /> Under Review
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-400/15 text-gold-300 border border-gold-400/30">
                                    15-Day Cutoff
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/65">
                                Amount Due:{" "}
                                <strong className="text-gold-400 font-serif text-sm tabular-nums">
                                  ₱{paymentData.balanceAmount.toLocaleString()}
                                </strong>
                                {(singleMilestone?.dueDate || formattedDeadline) && (
                                  <span>
                                    {" "}
                                    · Due{" "}
                                    <strong className="text-white/90 font-medium">
                                      {singleMilestone?.dueDate || formattedDeadline}
                                    </strong>
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                              {singleSettlementReceipt && (
                                <button
                                  type="button"
                                  aria-describedby={cardHeadingId}
                                  onClick={() => setViewingReceiptUrl(singleSettlementReceipt)}
                                  className="px-3 py-2 min-h-9 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                >
                                  <Eye size={12} aria-hidden="true" /> Balance Slip
                                </button>
                              )}

                              {!isBalanceSettled && (
                                <button
                                  type="button"
                                  aria-describedby={cardHeadingId}
                                  onClick={openSingleSettlementModal}
                                  className="px-4 py-2 min-h-9 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                >
                                  <CreditCard size={13} aria-hidden="true" />
                                  {isBalanceUnderReview ? "Re-upload Balance Slip" : "Pay Final Balance"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Multi-Installment Schedule (2+ Milestones) */}
                        {!isCancelled && isMultiInstallment && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-white/80">
                                  Installment Schedule ({settledMilestonesCount}/{installmentList.length} Settled)
                                </h3>
                                {hasStartedInstallments && !isBalanceSettled && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/35">
                                    Active Plan
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {paymentData.balanceReceipt && (
                                  <button
                                    type="button"
                                    aria-describedby={cardHeadingId}
                                    onClick={() => setViewingReceiptUrl(paymentData.balanceReceipt)}
                                    className="px-3 py-1.5 min-h-8 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                  >
                                    <Eye size={12} aria-hidden="true" /> Full Balance Slip
                                  </button>
                                )}

                                {!isBalanceSettled && !hasStartedInstallments && (
                                  <button
                                    type="button"
                                    aria-describedby={cardHeadingId}
                                    onClick={() => handleOpenBalanceModal({ ...booking, paymentData })}
                                    className="px-3.5 py-1.5 min-h-8 border border-gold-400/40 text-gold-300 hover:bg-gold-400/10 text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                  >
                                    <CreditCard size={12} aria-hidden="true" />
                                    {paymentData.balanceStatus === "Pending Verification"
                                      ? "Re-upload Full Balance Slip"
                                      : "Pay Full Balance at Once"}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {(() => {
                                const isFullBalancePending =
                                  paymentData.balanceStatus === "Pending Verification" ||
                                  Boolean(
                                    paymentData.balanceReceipt &&
                                      paymentData.balanceStatus !== "Verified"
                                  );
                                const isFullBalanceVerified =
                                  paymentData.balanceStatus === "Verified";

                                return installmentList.map((inst: any, idx: number) => {
                                  const isIndividuallyPaid =
                                    inst.status === "Verified" || inst.status === "Paid";
                                  const isPaid = isIndividuallyPaid || isFullBalanceVerified;
                                  const isPending =
                                    !isIndividuallyPaid &&
                                    (inst.status === "Pending Verification" || isFullBalancePending);
                                  const hasReceipt =
                                    Boolean(inst.receipt_url) ||
                                    (isFullBalancePending && Boolean(paymentData.balanceReceipt));
                                  const receiptToShow = inst.receipt_url || paymentData.balanceReceipt;

                                  const isPreviousPaid =
                                    idx === 0 ||
                                    isFullBalancePending ||
                                    isFullBalanceVerified ||
                                    installmentList
                                      .slice(0, idx)
                                      .every(
                                        (prev: any) =>
                                          prev.status === "Verified" ||
                                          prev.status === "Paid" ||
                                          Boolean(prev.receipt_url)
                                      );

                                  const isLocked = !isPreviousPaid && !isPaid && !isPending;
                                  const previousMilestone =
                                    idx > 0 ? installmentList[idx - 1] : null;

                                  return (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-md border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        isPaid
                                          ? "bg-emerald-500/[0.04] border-emerald-500/25"
                                          : isPending
                                          ? "bg-amber-500/[0.05] border-amber-500/25"
                                          : isLocked
                                          ? "bg-white/[0.015] border-white/5 opacity-65"
                                          : "bg-white/[0.02] border-white/10 hover:border-white/20"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          aria-hidden="true"
                                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                                            isPaid
                                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                              : isPending
                                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                              : isLocked
                                              ? "bg-white/5 text-white/30 border border-white/5"
                                              : "bg-white/10 text-white/80 border border-white/10"
                                          }`}
                                        >
                                          {isPaid ? (
                                            <CheckCircle size={13} />
                                          ) : isPending ? (
                                            <Clock size={12} />
                                          ) : isLocked ? (
                                            <Lock size={11} />
                                          ) : (
                                            idx + 1
                                          )}
                                        </div>

                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-white text-xs">
                                              {inst.title}
                                            </span>
                                            {isPaid ? (
                                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                                                Paid
                                              </span>
                                            ) : isPending ? (
                                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/35">
                                                {isFullBalancePending && !inst.receipt_url
                                                  ? "Pending Approval"
                                                  : "Under Review"}
                                              </span>
                                            ) : isLocked ? (
                                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-white/5 text-white/40 border border-white/10">
                                                Locked · Settle #{idx} first
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-white/10 text-white/55">
                                                {inst.status || "Upcoming"}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-white/50 mt-0.5">
                                            Due: <span className="text-white/80">{inst.dueDate}</span>
                                            {isLocked && previousMilestone?.title && (
                                              <span className="text-white/40">
                                                {" "}
                                                · Unlocks after {previousMilestone.title}
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                        <span className="font-serif font-bold text-gold-400 text-sm tabular-nums">
                                          ₱{Number(inst.amount).toLocaleString()}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                          {hasReceipt && (
                                            <button
                                              type="button"
                                              aria-describedby={cardHeadingId}
                                              onClick={() => setViewingReceiptUrl(receiptToShow)}
                                              className="px-2.5 py-1.5 min-h-8 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                            >
                                              <Eye size={12} aria-hidden="true" /> Slip
                                            </button>
                                          )}

                                          {!isPaid && !isFullBalancePending && !isLocked && (
                                            <button
                                              type="button"
                                              aria-describedby={cardHeadingId}
                                              onClick={() =>
                                                handleOpenBalanceModal(
                                                  { ...booking, paymentData },
                                                  idx,
                                                  inst
                                                )
                                              }
                                              className="px-3 py-1.5 min-h-8 gold-gradient text-black hover:brightness-110 text-[10px] font-bold uppercase tracking-wider rounded transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                            >
                                              <UploadCloud size={12} aria-hidden="true" />
                                              {isPending ? "Re-upload Slip" : "Pay Installment"}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                          </>
                        )}

                        {/* Post-Event Excess Headcount Surcharge Payment Section (Separate Balance) */}
                        {!isCancelled && excessGuestFee > 0 && (
                          <div className="p-4 rounded-md bg-rose-500/[0.04] border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-sans font-bold text-white tracking-wide flex items-center gap-1.5">
                                  <Users size={14} className="text-rose-400" aria-hidden="true" />
                                  Excess Headcount Surcharge
                                </h3>
                                {isExcessSettled ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 inline-flex items-center gap-1">
                                    <CheckCircle size={11} aria-hidden="true" /> Settled
                                  </span>
                                ) : isExcessUnderReview ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/35 inline-flex items-center gap-1">
                                    <Clock size={11} aria-hidden="true" /> Under Review
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/35">
                                    Unpaid · Post-Event Balance
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/70">
                                Amount Due:{" "}
                                <strong className="text-rose-300 font-serif text-sm tabular-nums">
                                  ₱{excessGuestFee.toLocaleString()}
                                </strong>
                                <span>
                                  {" "}· +{postEventBilling?.excess_guests || 0} excess pax ({postEventBilling?.actual_headcount_served} served vs {postEventBilling?.guaranteed_headcount} guaranteed)
                                </span>
                                {postEventBilling?.due_date && (
                                  <span>
                                    {" "}· Due{" "}
                                    <strong className="text-white/90 font-medium">
                                      {postEventBilling.due_date}
                                    </strong>
                                  </span>
                                )}
                              </p>
                              {(postEventBilling?.payment_method || postEventBilling?.reference_number) && (
                                <p className="text-[11px] text-white/50 flex flex-wrap items-center gap-2 pt-0.5">
                                  {postEventBilling?.payment_method && (
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white/75">
                                      {postEventBilling.payment_method}
                                    </span>
                                  )}
                                  {postEventBilling?.reference_number && (
                                    <span className="font-mono text-white/55">
                                      Ref: {postEventBilling.reference_number}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                              {excessReceiptUrl && (
                                <button
                                  type="button"
                                  aria-describedby={cardHeadingId}
                                  onClick={() => setViewingReceiptUrl(excessReceiptUrl)}
                                  className="px-3 py-2 min-h-9 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                >
                                  <Eye size={12} aria-hidden="true" /> Excess Slip
                                </button>
                              )}

                              {!isExcessSettled && (
                                <button
                                  type="button"
                                  aria-describedby={cardHeadingId}
                                  onClick={() => handleOpenExcessPaymentModal({ ...booking, paymentData }, postEventBilling)}
                                  className="px-4 py-2 min-h-9 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                                >
                                  <CreditCard size={13} aria-hidden="true" />
                                  {isExcessUnderReview ? "Re-upload Excess Slip" : "Pay Excess Surcharge"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: MENU & DETAILS */}
                    {activeTab === "menu" && (
                      <div className="space-y-4">
                        {/* Short Policy Status Pill + Modify Action Bar */}
                        {!isCancelled && (
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                            <div className="flex flex-wrap items-center gap-2">
                              {!isModificationLocked ? (
                                hasUnacknowledgedModification ? (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35 inline-flex items-center gap-1.5">
                                    <Clock size={12} aria-hidden="true" /> Awaiting Coordinator Review
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 inline-flex items-center gap-1.5">
                                    <Clock size={12} aria-hidden="true" />
                                    Editable until {formattedCutoffDate} · {daysLeftToModify}d left
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/35 inline-flex items-center gap-1.5">
                                  <Lock size={12} aria-hidden="true" /> Locked · Within 14-Day Cutoff
                                </span>
                              )}
                            </div>

                            {!isModificationLocked && !hasUnacknowledgedModification && (
                              <button
                                type="button"
                                aria-describedby={cardHeadingId}
                                onClick={() => handleOpenModifyModal(booking)}
                                className="px-4 py-2 min-h-9 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                              >
                                <Sliders size={13} aria-hidden="true" /> Modify Menu &amp; Details
                              </button>
                            )}
                          </div>
                        )}

                        {/* Special Instructions (if present) */}
                        {activeInstructions && (
                          <div className="p-3 bg-gold-400/[0.05] border border-gold-400/20 rounded-md flex items-start gap-2.5 text-xs">
                            <Edit3
                              size={13}
                              className="text-gold-400 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider block">
                                Special Instructions
                              </span>
                              <p className="text-white/85 leading-relaxed mt-0.5">
                                &ldquo;{activeInstructions}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Categorized Selected Menu Dishes */}
                        {currentMenuList.length > 0 ? (
                          (() => {
                            const grouped: Record<string, string[]> = {};
                            currentMenuList.forEach((dish: string) => {
                              const cat = dishCategoryFor(dish, booking);
                              if (!grouped[cat]) grouped[cat] = [];
                              grouped[cat].push(dish);
                            });
                            const orderedCats = categoryOrder.filter(
                              (c) => grouped[c] && grouped[c].length > 0
                            );
                            Object.keys(grouped).forEach((c) => {
                              if (!orderedCats.includes(c)) orderedCats.push(c);
                            });

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                                {orderedCats.map((cat) => (
                                  <div key={cat} className="space-y-1.5">
                                    <h3 className="text-[10px] font-sans font-bold text-gold-400/80 uppercase tracking-wider">
                                      {cat} ({grouped[cat].length})
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                      {grouped[cat].map((m: string) => {
                                        const matchingSub = substitutions.find(
                                          (s: any) => s.replacement_dish === m
                                        );
                                        return (
                                          <span
                                            key={m}
                                            className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1.5 ${
                                              matchingSub
                                                ? "bg-amber-500/10 border border-amber-500/35 text-amber-200"
                                                : "bg-white/[0.04] border border-white/10 text-white/90"
                                            }`}
                                          >
                                            <span>{m}</span>
                                            {matchingSub && (
                                              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                                Replaced {matchingSub.original_dish}
                                              </span>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        ) : (
                          <p className="text-xs text-white/45 italic">
                            No menu selections recorded for this booking.
                          </p>
                        )}
                      </div>
                    )}

                    {/* TAB 3: RECEIPT-STYLE COST BREAKDOWN */}
                    {activeTab === "breakdown" && (
                      <div className="space-y-3">
                        <dl className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                          {/* Base Package */}
                          <div className="py-2.5 first:pt-0 flex items-baseline justify-between gap-4">
                            <div>
                              <dt className="text-white font-medium">{packageTitle}</dt>
                              <dd className="text-[11px] text-white/45 mt-0.5">
                                {booking.guest_count || 0} standard guests included
                              </dd>
                            </div>
                            <dd className="font-semibold text-white tabular-nums shrink-0">
                              ₱{basePrice.toLocaleString()}
                            </dd>
                          </div>

                          {/* Additional Pax (only when > 0) */}
                          {extraPax > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-white/90 font-medium">Additional Guests</dt>
                                <dd className="text-[11px] text-white/45 mt-0.5">
                                  {extraPax} extra pax × ₱{addPrice.toLocaleString()}
                                </dd>
                              </div>
                              <dd className="font-semibold text-white tabular-nums shrink-0">
                                +₱{additionalPaxTotal.toLocaleString()}
                              </dd>
                            </div>
                          )}

                          {/* Hauling / Stairs Fee (only when > 0) */}
                          {haulingFee > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-white/90 font-medium">
                                  Hauling / Stairs Ingress Fee
                                </dt>
                                <dd className="text-[11px] text-white/45 mt-0.5">
                                  {logData?.isSecondFloorOrHigher && !logData?.hasElevator
                                    ? `Floor ${logData.floorLevel || 2} (stairs ingress)`
                                    : "Venue logistics surcharge"}
                                </dd>
                              </div>
                              <dd className="font-semibold text-gold-300 tabular-nums shrink-0">
                                +₱{haulingFee.toLocaleString()}
                              </dd>
                            </div>
                          )}

                          {/* Out-of-Town Travel Fee (only when > 0 or pending assessment) */}
                          {(travelFee > 0 || isTravelFeePending) && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-white/90 font-medium">
                                  Out-of-Town Travel Fee
                                </dt>
                                <dd className="text-[11px] text-white/45 mt-0.5">
                                  {travelFee > 0
                                    ? "Assessed by coordinator"
                                    : "Venue outside Taytay coverage · Coordinator assessment in progress"}
                                </dd>
                              </div>
                              <dd className="tabular-nums shrink-0">
                                {travelFee > 0 ? (
                                  <span className="font-semibold text-gold-300">
                                    +₱{travelFee.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Pending
                                  </span>
                                )}
                              </dd>
                            </div>
                          )}

                          {/* Corkage & Services (only when > 0) */}
                          {corkageFee > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-white/90 font-medium">
                                  Corkage &amp; Services
                                </dt>
                                <dd className="text-[11px] text-white/50 mt-0.5">
                                  {[
                                    corkageData?.hasLechonTable
                                      ? "Lechon Table Setup (₱1,500)"
                                      : "",
                                    corkageData?.alcoholicBeveragesCount > 0
                                      ? `${corkageData.alcoholicBeveragesCount} Bottle(s) Alcohol (₱${(
                                          corkageData.alcoholicBeveragesCount * 400
                                        ).toLocaleString()})`
                                      : "",
                                    corkageData?.outsideFoodCount > 0
                                      ? `${corkageData.outsideFoodCount} Outside Dish(es) (₱${(
                                          corkageData.outsideFoodCount * 400
                                        ).toLocaleString()})`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </dd>
                              </div>
                              <dd className="font-semibold text-gold-300 tabular-nums shrink-0">
                                +₱{corkageFee.toLocaleString()}
                              </dd>
                            </div>
                          )}

                          {/* Pre-Booked Overtime (only when > 0) */}
                          {prebookedOTFee > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-white/90 font-medium">
                                  Pre-Booked Overtime Add-ons
                                </dt>
                                <dd className="text-[11px] text-white/50 mt-0.5">
                                  {[
                                    prebookedOT?.catering_hours > 0
                                      ? `Catering (${prebookedOT.catering_hours}h @ ₱4,000/h)`
                                      : "",
                                    prebookedOT?.sounds_lights_hours > 0
                                      ? `Sounds & Lights (${prebookedOT.sounds_lights_hours}h @ ₱1,500/h)`
                                      : "",
                                    prebookedOT?.photo_booth_hours > 0
                                      ? `Photo Booth (${prebookedOT.photo_booth_hours}h @ ₱1,000/h)`
                                      : "",
                                    prebookedOT?.emcee_hours > 0
                                      ? `Emcee (${prebookedOT.emcee_hours}h @ ₱500/h)`
                                      : "",
                                    prebookedOT?.coordinators_hours > 0
                                      ? `Coordinators (${prebookedOT.coordinators_hours}h × ${
                                          prebookedOT.coordinators_count || 2
                                        }p @ ₱300/h/p)`
                                      : "",
                                    prebookedOT?.photo_video_hours > 0
                                      ? `Photo & Video (${prebookedOT.photo_video_hours}h @ ₱2,500/h)`
                                      : "",
                                    prebookedOT?.mobile_bar_hours > 0
                                      ? `Mobile Bar (${prebookedOT.mobile_bar_hours}h @ ₱1,500/h)`
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </dd>
                              </div>
                              <dd className="font-semibold text-gold-300 tabular-nums shrink-0">
                                +₱{prebookedOTFee.toLocaleString()}
                              </dd>
                            </div>
                          )}

                          {/* Day-of Overtime Surcharge (only when > 0) */}
                          {dayOfOTFee > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-amber-300 font-medium">
                                  Day-of Event Overtime Surcharge
                                </dt>
                                <dd className="text-[11px] text-white/60 mt-0.5">
                                  Actual end {dayOfOT?.actual_end_time} ({dayOfOT?.minutes_over}{" "}
                                  mins past scheduled · {dayOfOT?.billable_ot_hours} billable hrs)
                                  {Array.isArray(dayOfOT?.services_billed) &&
                                    dayOfOT.services_billed.length > 0 &&
                                    ` · ${dayOfOT.services_billed
                                      .map(
                                        (s: any) =>
                                          `${s.name} (+₱${Number(s.subtotal).toLocaleString()})`
                                      )
                                      .join(" · ")}`}
                                </dd>
                              </div>
                              <dd className="font-semibold text-amber-300 tabular-nums shrink-0">
                                +₱{dayOfOTFee.toLocaleString()}
                              </dd>
                            </div>
                          )}

                          {/* Rain / Laundry Fee (when applied) */}
                          {rainLaundryFee > 0 && (
                            <div className="py-2.5 flex items-baseline justify-between gap-4">
                              <div>
                                <dt className="text-amber-300 font-medium flex items-center gap-1.5">
                                  <CloudRain size={13} className="text-amber-400" />
                                  Rain / Laundry Surcharge
                                </dt>
                                <dd className="text-[11px] text-white/60 mt-0.5">
                                  Soiled linens due to rain without client-provided tents (Outdoor weather policy)
                                </dd>
                              </div>
                              <dd className="font-semibold text-amber-300 tabular-nums shrink-0">
                                +₱{rainLaundryFee.toLocaleString()}
                              </dd>
                            </div>
                          )}

                        </dl>

                        {/* Contract Receipt Totals Reconciliation (Pre-Event Settled Balance) */}
                        <div className="pt-3 border-t border-white/15 space-y-1.5 text-xs tabular-nums">
                          <div className="flex items-center justify-between text-white/80">
                            <span>Estimated Event Total</span>
                            <span className="font-semibold text-white text-sm">
                              ₱{totalEventCost.toLocaleString()}
                            </span>
                          </div>
                          {paymentData && (
                            <>
                              <div className="flex items-center justify-between text-white/55">
                                <span>
                                  Less Deposit ({paymentData.status})
                                </span>
                                <span>−₱{paymentData.downpayment.toLocaleString()}</span>
                              </div>
                              {paymentData.paidMilestones > 0 && (
                                <div className="flex items-center justify-between text-emerald-400/80">
                                  <span>Less Verified Installments</span>
                                  <span>−₱{paymentData.paidMilestones.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between gap-2">
                                <span className="font-bold uppercase tracking-wider text-white/90 text-[11px] flex items-center gap-2">
                                  <span>{isBalanceSettled ? "Contract Balance" : "Remaining Balance"}</span>
                                  {isBalanceSettled && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                                      Settled &amp; Verified
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`font-serif font-bold text-base ${
                                    isBalanceSettled ? "text-emerald-400" : "text-gold-400"
                                  }`}
                                >
                                  ₱{paymentData.balanceAmount.toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Separate Post-Event Excess Headcount Surcharge Balance (Not counted in settled balance) */}
                        {excessGuestFee > 0 && (
                          <div className="mt-3 p-3.5 rounded-md bg-rose-500/[0.04] border border-rose-500/25 space-y-2.5 text-xs tabular-nums">
                            <div className="flex items-baseline justify-between gap-4">
                              <div>
                                <p className="text-rose-300 font-semibold flex items-center gap-1.5">
                                  <Users size={13} className="text-rose-400" />
                                  Excess Headcount Served Surcharge
                                </p>
                                <p className="text-[11px] text-white/60 mt-0.5">
                                  {postEventBilling?.excess_guests} attendee(s) beyond guaranteed count ({postEventBilling?.guaranteed_headcount} pax) @ ₱500/pax · Due {postEventBilling?.due_date || "next day"}
                                </p>
                              </div>
                              <span className="font-semibold text-rose-300 shrink-0">
                                +₱{excessGuestFee.toLocaleString()}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold uppercase tracking-wider text-white/90 text-[11px] flex items-center gap-2">
                                <span>Excess Surcharge Balance</span>
                                {isExcessSettled ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/35">
                                    Settled &amp; Verified
                                  </span>
                                ) : isExcessUnderReview ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/35">
                                    Under Review
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/35">
                                    Unpaid
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2.5">
                                {!isCancelled && !isExcessSettled && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenExcessPaymentModal({ ...booking, paymentData }, postEventBilling)}
                                    className="px-2.5 py-1 rounded gold-gradient text-black text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
                                  >
                                    {isExcessUnderReview ? "Update Slip" : "Pay Now →"}
                                  </button>
                                )}
                                <span
                                  className={`font-serif font-bold text-base ${
                                    isExcessSettled
                                      ? "text-emerald-400"
                                      : isExcessUnderReview
                                      ? "text-amber-300"
                                      : "text-rose-300"
                                  }`}
                                >
                                  ₱{excessGuestFee.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6. Quiet Secondary Action Footer */}
                  {(statusLower === "pending" || isApproved) && (
                    <div className="px-5 sm:px-6 py-2.5 bg-black/20 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        aria-describedby={cardHeadingId}
                        onClick={() => setCancelModalId(booking.id)}
                        className="min-h-8 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-white/40 hover:text-red-400 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 rounded"
                      >
                        Cancel {isApproved ? "Booking" : "Request"}
                      </button>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {cancelModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-modal-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-white/10 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              <h2 id="cancel-modal-title" className="text-3xl font-serif text-white mb-2 italic">
                Cancel <span className="text-red-400">Booking</span>
              </h2>
              <p className="text-sm text-white/60 mb-6 font-medium leading-relaxed">
                Are you sure you want to cancel this booking
                {isCancelConfirmed ? "" : " request"}? This action cannot be
                undone.
                <span className="block mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm text-xs leading-relaxed text-left">
                  <strong className="block font-bold mb-1">
                    Strict Non-Refundable Policy:
                  </strong>
                  All down payments, reservation fees, and prior installment settlements are strictly non-refundable and will be forfeited upon cancellation. No date transfers or refunds apply.
                </span>
              </p>

              <div className="mb-8 text-left">
                <label htmlFor="cancel-reason-input" className="text-sm font-bold text-white/80 mb-2 block">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cancel-reason-input"
                  aria-invalid={Boolean(cancelReasonError)}
                  aria-describedby={cancelReasonError ? "cancel-reason-error" : undefined}
                  className={`w-full bg-white/5 border ${cancelReasonError ? "border-red-500/50" : "border-white/10"} p-4 text-sm focus:outline-none focus:border-red-500/50 transition-all resize-none placeholder:text-white/30`}
                  rows={3}
                  placeholder="Tell us why you are cancelling..."
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelReasonError("");
                  }}
                  disabled={cancellingId !== null}
                />
                {cancelReasonError && (
                  <p id="cancel-reason-error" role="alert" className="text-xs text-red-400 mt-2 font-medium">
                    {cancelReasonError}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCancelModalId(null);
                    setCancelReason("");
                    setCancelReasonError("");
                  }}
                  disabled={cancellingId !== null}
                  className="flex-1 py-3 border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all text-sm font-bold tracking-wide"
                >
                  Keep Booking
                </button>
                <button
                  onClick={confirmCancelBooking}
                  disabled={cancellingId !== null}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/50 text-red-400 font-bold tracking-wide text-sm hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {cancellingId === cancelModalId
                    ? "Cancelling..."
                    : "Yes, Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proof of Downpayment Receipt Viewer Modal */}
      <AnimatePresence>
        {viewingReceiptUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setViewingReceiptUrl(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="receipt-modal-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-white/15 p-6 max-w-lg w-full relative overflow-hidden rounded-xl bg-[#0c0c0c] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h2 id="receipt-modal-title" className="text-base font-serif text-white flex items-center gap-2">
                  <CreditCard className="text-gold-400" size={18} aria-hidden="true" />
                  Proof of Payment Receipt
                </h2>
                <button
                  type="button"
                  aria-label="Close receipt viewer"
                  onClick={() => setViewingReceiptUrl(null)}
                  className="text-white/50 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-black/50 rounded-lg p-2 border border-white/5">
                <img
                  src={viewingReceiptUrl}
                  alt="Proof of Payment"
                  className="max-h-[60vh] w-auto object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1554415707-9e4c07d3882d?auto=format&fit=crop&q=80&w=800";
                  }}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setViewingReceiptUrl(null)}
                  className="px-6 py-2 gold-gradient text-black text-xs font-bold uppercase tracking-wider rounded-sm hover:brightness-110 transition-all"
                >
                  Close Receipt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 15-Day Final Balance Payment Modal */}
      <AnimatePresence>
        {payingBalanceBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="balance-modal-title"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card border border-white/15 max-w-2xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl rounded-xl bg-[#0c0c0c]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/30 flex items-center justify-center">
                    <CreditCard className="text-gold-400" size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="balance-modal-title" className="text-xl sm:text-2xl font-serif text-white italic">
                      Pay <span className="gold-text-gradient font-bold not-italic">{payingExcessSurcharge ? "Excess Headcount Surcharge" : payingMilestone ? payingMilestone.title : "Final Balance"}</span>
                    </h2>
                    <p className="text-xs text-white/60 uppercase tracking-widest font-semibold mt-0.5">
                      {payingExcessSurcharge ? `Post-Event Excess Surcharge • Due: ${payingExcessSurcharge.dueDate || "Next Day"}` : payingMilestone ? `Milestone Installment • Due: ${payingMilestone.dueDate || "As scheduled"}` : "Due 15 Days Before Event Date"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close payment dialog"
                  onClick={() => {
                    setPayingBalanceBooking(null);
                    setPayingMilestone(null);
                    setPayingExcessSurcharge(null);
                  }}
                  className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 scrollbar-thin">
                {balanceError && (
                  <div role="alert" className="p-4 bg-red-950/90 border border-red-500/50 rounded-lg text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" aria-hidden="true" />
                    <span>{balanceError}</span>
                  </div>
                )}

                {/* Amount Due Card */}
                <div className="p-6 bg-gradient-to-r from-gold-400/15 via-white/5 to-transparent border border-gold-400/30 rounded-xl relative overflow-hidden space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gold-400 mb-1">
                        {payingExcessSurcharge ? "Excess Headcount Surcharge Due" : payingMilestone ? `${payingMilestone.title} Amount Due` : "Final Balance Amount Due"}
                      </p>
                      <p className="text-3xl font-serif text-gold-400 font-bold tabular-nums">
                        ₱{Number(payingExcessSurcharge ? payingExcessSurcharge.amount : payingMilestone ? payingMilestone.amount : (payingBalanceBooking.paymentData?.balanceAmount || payingBalanceBooking.final_balance_amount || 0)).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-white/60">
                        {payingExcessSurcharge ? `+${payingExcessSurcharge.excessGuests} excess pax (${payingExcessSurcharge.actualPax} served vs ${payingExcessSurcharge.guaranteedPax} guaranteed)` : (payingBalanceBooking.packages?.name || "Catering Event Package")}
                      </span>
                    </div>
                    <div className="sm:border-l sm:border-white/10 sm:pl-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">
                        {payingExcessSurcharge ? "Post-Event Payment Due Date" : payingMilestone ? "Milestone Scheduled Due Date" : "Event Date & Settlement Deadline"}
                      </p>
                      <p className="text-sm font-bold text-white">
                        {payingExcessSurcharge ? (payingExcessSurcharge.dueDate || "Next Day") : payingMilestone ? payingMilestone.dueDate : (payingBalanceBooking.event_date || "Event Date")}
                      </p>
                      <span className="text-[10px] text-amber-300 font-semibold block mt-1">
                        {payingExcessSurcharge ? "Separate Post-Event Headcount Balance" : payingMilestone ? "Scheduled Installment Milestone" : "Due at least 15 days before event"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/65 leading-relaxed pt-3 border-t border-white/10">
                    {payingExcessSurcharge ? (
                      <>
                        This post-event surcharge covers additional attendees served beyond your guaranteed guest count and is tracked separately from your settled contract balance. Upload your transfer receipt below for coordinator verification.
                      </>
                    ) : (
                      <>
                        Per contract policy, full balance settlement is strictly required at least <strong className="text-white/90">15 days before your event date</strong> to finalize procurement, kitchen preparation, and staffing. Upload your transfer receipt below for coordinator verification.
                      </>
                    )}
                  </p>
                </div>

                {/* Method Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-white/80 block mb-3">
                    Choose Payment Option <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBalancePaymentMethod("GCash")}
                      className={`p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        balancePaymentMethod === "GCash"
                          ? "bg-[#007DFE]/15 border-[#007DFE] text-white shadow-lg shadow-[#007DFE]/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${balancePaymentMethod === "GCash" ? "bg-[#007DFE] text-white" : "bg-white/10 text-white/40"}`}>
                        G
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">GCash</p>
                        <p className="text-[10px] text-white/50">Instant transfer / QR</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBalancePaymentMethod("Bank Transfer")}
                      className={`p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        balancePaymentMethod === "Bank Transfer"
                          ? "bg-gold-400/15 border-gold-400 text-white shadow-lg shadow-gold-400/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${balancePaymentMethod === "Bank Transfer" ? "bg-gold-400 text-black" : "bg-white/10 text-white/40"}`}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">Bank Transfer</p>
                        <p className="text-[10px] text-white/50">BDO / BPI Online Banking</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Instructions for Selected Method */}
                {balancePaymentMethod === "GCash" ? (
                  <div className="p-5 bg-gradient-to-b from-[#007DFE]/10 to-transparent border border-[#007DFE]/30 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="bg-white p-3 rounded-lg shadow-xl shrink-0 flex flex-col items-center">
                        <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-[#007DFE]/40 rounded flex flex-col items-center justify-center p-2 relative overflow-hidden">
                          <QrCode className="text-[#007DFE] opacity-70" size={44} />
                          <span className="text-xs font-bold text-[#007DFE] mt-1 uppercase tracking-wider">
                            GCash QR
                          </span>
                        </div>
                        <span className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-2">
                          Scan to Pay
                        </span>
                      </div>
                      <div className="space-y-3 flex-1 text-left">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#007DFE] block">
                            GCash Account Name
                          </span>
                          <span className="text-sm font-bold text-white">
                            ROXAN POLICARPIO (ROXAN POLICARPIO CATERING)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#007DFE] block">
                            GCash Mobile Number
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-base font-mono font-bold text-white bg-white/10 px-3 py-1 rounded">
                              0946 715 8519
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("09467158519");
                                setCopiedBalanceAccount("gcash");
                                setTimeout(() => setCopiedBalanceAccount(""), 2500);
                              }}
                              className="px-2.5 py-1 bg-[#007DFE]/20 text-[#007DFE] hover:bg-[#007DFE]/30 text-xs font-bold rounded transition-colors flex items-center gap-1"
                            >
                              {copiedBalanceAccount === "gcash" ? <CheckCircle size={13} /> : <Copy size={13} />}
                              {copiedBalanceAccount === "gcash" ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-gradient-to-b from-gold-400/10 to-transparent border border-gold-400/30 rounded-xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">BDO Unibank</span>
                          <span className="text-[9px] bg-gold-400/20 text-gold-300 px-1.5 py-0.5 rounded font-bold">Current</span>
                        </div>
                        <p className="text-[10px] text-white/50 uppercase font-semibold">0012 3456 7890</p>
                        <p className="text-xs font-bold text-white">Roxan Policarpio Events & Catering</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("001234567890");
                            setCopiedBalanceAccount("bdo");
                            setTimeout(() => setCopiedBalanceAccount(""), 2500);
                          }}
                          className="text-[10px] text-gold-400 hover:text-white font-bold flex items-center gap-1"
                        >
                          {copiedBalanceAccount === "bdo" ? "Copied Account!" : "Copy BDO Number"}
                        </button>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">BPI Banking</span>
                          <span className="text-[9px] bg-gold-400/20 text-gold-300 px-1.5 py-0.5 rounded font-bold">Savings</span>
                        </div>
                        <p className="text-[10px] text-white/50 uppercase font-semibold">4598 1234 56</p>
                        <p className="text-xs font-bold text-white">Roxan Policarpio Events & Catering</p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("4598123456");
                            setCopiedBalanceAccount("bpi");
                            setTimeout(() => setCopiedBalanceAccount(""), 2500);
                          }}
                          className="text-[10px] text-gold-400 hover:text-white font-bold flex items-center gap-1"
                        >
                          {copiedBalanceAccount === "bpi" ? "Copied Account!" : "Copy BPI Number"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Receipt */}
                <div className="space-y-3 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/90 block">
                    Upload {payingExcessSurcharge ? "Excess Surcharge Receipt" : payingMilestone ? `${payingMilestone.title} Receipt` : "Final Balance Receipt"} <span className="text-red-400">*</span>
                  </label>
                  {balanceReceiptImage ? (
                    <div className="p-4 bg-white/5 border border-gold-400/40 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={balanceReceiptImage}
                          alt="Receipt Preview"
                          className="w-16 h-16 object-cover rounded border border-white/20 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1554415707-9e4c07d3882d?auto=format&fit=crop&q=80&w=800";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {balanceReceiptName || "payment_receipt.jpg"}
                          </p>
                          <p className="text-[11px] text-green-400 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle size={12} /> Receipt Ready for Verification
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceReceiptImage("");
                          setBalanceReceiptBlob(null);
                          setBalanceReceiptName("");
                        }}
                        className="px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold rounded transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-white/20 hover:border-gold-400/60 transition-colors p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]">
                      <UploadCloud size={32} className="text-gold-400 mb-2" />
                      <p className="text-sm font-bold text-white">Click to upload {payingExcessSurcharge ? "excess surcharge slip" : payingMilestone ? `${payingMilestone.title} slip` : "balance receipt slip"}</p>
                      <p className="text-xs text-white/50 mt-1">PNG, JPG, or WEBP transaction confirmation</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBalanceReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Reference Number */}
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/90 block">
                    Reference Number <span className="text-white/40 font-normal">(Optional but recommended)</span>
                  </label>
                  <input
                    type="text"
                    value={balanceRef}
                    onChange={(e) => setBalanceRef(e.target.value)}
                    placeholder="e.g. 9876 5432 1098"
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-gold-400/50 rounded-lg font-medium text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPayingBalanceBooking(null);
                    setPayingMilestone(null);
                    setPayingExcessSurcharge(null);
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-white/20 text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBalancePayment}
                  disabled={isSubmittingBalance || !balanceReceiptImage}
                  className="w-full sm:w-auto px-8 py-3 gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed rounded-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-400/10"
                >
                  {isSubmittingBalance
                    ? "Submitting Receipt..."
                    : payingExcessSurcharge
                    ? "Submit Proof of Excess Surcharge"
                    : payingMilestone
                    ? `Submit Proof for ${payingMilestone.title}`
                    : "Submit Proof of Final Balance"}
                  {!isSubmittingBalance && <ChevronRight size={14} />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Customer Modification Request Modal (Dishes & Headcount) */}
        {modifyingBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modify-modal-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0b0b] border border-white/15 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders size={18} className="text-gold-400" aria-hidden="true" />
                    <h2 id="modify-modal-title" className="text-lg font-serif font-bold text-white">
                      Modify Event Details &amp; Menu
                    </h2>
                  </div>
                  <p className="text-xs text-white/60">
                    Event Date: <span className="text-gold-400 font-semibold">{modifyingBooking.event_date}</span>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close modification dialog"
                  onClick={() => {
                    clearModErrorToast();
                    setModifyingBooking(null);
                  }}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-left flex-1 custom-scrollbar">
                {/* Relocated 14-Day Modification Contract Policy Notice */}
                <div className="p-3.5 rounded-lg bg-gold-400/[0.06] border border-gold-400/25 flex items-start gap-3">
                  <Clock size={15} className="text-gold-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-white/75 leading-relaxed">
                    <strong className="text-gold-300 font-semibold">14-Day Modification Policy:</strong>{" "}
                    You may update your menu selections, extra headcount, or special instructions before the 14-day pre-event cutoff per contract. Once within 14 days of your event, details lock for ingredient procurement and staffing.
                  </p>
                </div>

                {/* Section 1: Headcount Adjustment */}
                {(() => {
                  const modalAddPaxRate =
                    modifyingBooking?.packages?.additional_pax_price
                      ? parseFloat(String(modifyingBooking.packages.additional_pax_price).replace(/[^0-9.-]+/g, "")) || 500
                      : 500;
                  return (
                    <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-lg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                        <Users size={14} /> Headcount &amp; Guest Adjustment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-white/50">Base Package Pax</p>
                          <p className="text-base font-bold text-white mt-0.5">{modifyingBooking.guest_count || 50} Standard Guests</p>
                        </div>
                        <div>
                          <label className="text-xs text-white/80 font-semibold block mb-1">
                            Additional Pax (+₱{modalAddPaxRate.toLocaleString()} / pax)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={modAdditionalPax}
                              onChange={(e) => setModAdditionalPax(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-sm text-white rounded focus:border-gold-400/60 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-white/70 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span>New Total Headcount: <strong className="text-gold-400">{(Number(modifyingBooking.guest_count) || 50) + modAdditionalPax} Guests</strong></span>
                        <span>Additional Pax Fee: <strong className="text-white">+₱{(modAdditionalPax * modalAddPaxRate).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Section 2: Reselect Menu Just Like Booking Screen */}
                <div className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                        <Utensils size={14} /> Menu Selection &amp; Dish Reselection
                      </h4>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Select your preferred dishes per category matching your package inclusions:
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-400/10 border border-gold-400/30 text-gold-300 self-start sm:self-auto">
                      {modSelectedDishes.length} Dish{modSelectedDishes.length === 1 ? "" : "es"} Selected
                    </span>
                  </div>

                  {isLoadingMenu ? (
                    <div className="py-10 text-center text-white/50 text-xs uppercase tracking-widest animate-pulse">
                      Loading active menu catalog...
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {categoryOrder.map((category) => {
                        const unavailableForBooking = getUnavailableDishesFor(modifyingBooking);
                        const standardItemsInCat = menuItems
                          .filter((mi) => {
                            if (mi.status === "Archived") return false;
                            return getRuleCategory(mi.category, mi.name) === category;
                          })
                          .map((mi) =>
                            unavailableForBooking.has(mi.name) && !modSelectedDishes.includes(mi.name)
                              ? { ...mi, status: "Not Available", isReplaced: true }
                              : mi
                          );

                        // Coordinator's off-menu dishes for THIS booking only (hidden once replaced dish is set available again)
                        const customItemsForCat = getCustomDishesFor(modifyingBooking?.id)
                          .filter(
                            (cd) =>
                              cd.category === category &&
                              (!cd.replaces_dish ||
                                unavailableForBooking.has(cd.replaces_dish) ||
                                modSelectedDishes.includes(cd.name))
                          )
                          .map((cd) => ({
                            id: `custom-${cd.id}`,
                            name: cd.name,
                            category: cd.category,
                            isCustom: true,
                          }));

                        const itemsInCat = [...customItemsForCat, ...standardItemsInCat];

                        if (itemsInCat.length === 0) return null;

                        const limits = modifyingBooking?.packages?.category_limits;
                        const hasDefinedLimits = limits && Object.keys(limits).length > 0;
                        const maxLimit = hasDefinedLimits
                          ? limits[category] !== undefined
                            ? Number(limits[category])
                            : 0
                          : null;
                        if (maxLimit === 0) return null;

                        const selectedInCat = modSelectedDishes.filter((dishName) => {
                          return dishCategoryFor(dishName, modifyingBooking) === category;
                        });
                        const countInCat = selectedInCat.length;
                        const isFulfilled = maxLimit !== null ? countInCat >= maxLimit : countInCat > 0;

                        return (
                          <div key={category} className="space-y-3">
                            <div className="flex items-center justify-between border-b border-gold-400/20 pb-2">
                              <h5 className="text-base tracking-wide text-gold-400 font-bold italic">
                                {category}
                              </h5>
                              {maxLimit !== null && (
                                <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 border ${
                                  isFulfilled
                                    ? "bg-gold-400/10 border-gold-400/30 text-gold-400"
                                    : "bg-white/5 border-white/10 text-white/50"
                                }`}>
                                  {countInCat} / {maxLimit} Selected
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {itemsInCat.map((item) => {
                                const isUnavailable = item.status === "Not Available";
                                const isSelected = modSelectedDishes.includes(item.name);
                                return (
                                  <button
                                    key={item.id || item.name}
                                    type="button"
                                    disabled={isUnavailable}
                                    onClick={() => !isUnavailable && handleMenuToggle(item.name)}
                                    className={`p-4 glass-card border flex flex-col justify-center transition-all text-left group ${
                                      isUnavailable
                                        ? "opacity-50 cursor-not-allowed border-white/5 bg-white/5"
                                        : isSelected
                                          ? "border-gold-400 bg-gold-400/5 text-white cursor-pointer"
                                          : "border-white/10 hover:border-white/30 text-white/90 cursor-pointer"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <div className="flex flex-col text-left">
                                        <span className="text-xs sm:text-sm tracking-wide font-bold leading-snug">
                                          {item.name}
                                        </span>
                                        {(item as any).isCustom && (
                                          <span className="text-[9px] uppercase font-bold text-gold-400 mt-0.5 tracking-wider">
                                            Custom Replacement
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                                          isSelected && !isUnavailable
                                            ? "bg-gold-400 border-gold-400 text-black"
                                            : "border-white/20 group-hover:border-gold-400"
                                        }`}
                                      >
                                        {isSelected && !isUnavailable && (
                                          <Check size={12} strokeWidth={4} />
                                        )}
                                      </div>
                                    </div>
                                    {isUnavailable && (
                                      <span className="text-[10px] text-red-400 uppercase tracking-widest mt-1.5 font-bold text-left">
                                        {(item as any).isReplaced ? "Unavailable · Replaced by coordinator" : "Not Available"}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 3: Notes / Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/80 block">
                    Special Instructions / Reason for Changes
                  </label>
                  <textarea
                    rows={2}
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)}
                    placeholder="e.g. Additional guests confirmed; swapping pasta dish for vegetarian option..."
                    className="w-full bg-white/5 border border-white/10 p-3 text-xs text-white rounded-lg focus:border-gold-400/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    clearModErrorToast();
                    setModifyingBooking(null);
                  }}
                  className="px-4 py-2 border border-white/20 text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitModification}
                  disabled={isSubmittingMod}
                  className="px-6 py-2 gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 rounded transition-all disabled:opacity-40 shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingMod ? "Saving Changes..." : "Save Changes & Notify Coordinator"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notifications for Modification Errors & Success */}
      <AnimatePresence>
        {modError && (
          <motion.div
            key="mod-error-toast"
            role="alert"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-[100] max-w-sm w-full px-4 py-3.5 bg-[#1a0a0a]/95 border border-red-500/50 text-red-200 rounded-lg shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-red-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-wide leading-snug text-left">
                {modError}
              </span>
            </div>
            <button
              type="button"
              onClick={clearModErrorToast}
              aria-label="Dismiss notification"
              className="text-red-300/60 hover:text-white transition-colors p-1 shrink-0 cursor-pointer"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
        {modSuccessMsg && (
          <motion.div
            key="mod-success-toast"
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-[100] max-w-sm w-full px-4 py-3.5 bg-[#0a1a10]/95 border border-emerald-500/50 text-emerald-200 rounded-lg shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle size={18} className="text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-wide leading-snug text-left">
                {modSuccessMsg}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setModSuccessMsg("")}
              aria-label="Dismiss notification"
              className="text-emerald-300/60 hover:text-white transition-colors p-1 shrink-0 cursor-pointer"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
