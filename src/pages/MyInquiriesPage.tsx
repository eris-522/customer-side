import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";
import {
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
} from "lucide-react";
import { Link } from "react-router-dom";

import { compressReceiptImage, uploadReceiptImage } from "../utils/receiptUploader";

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

const categoryOrder = ["Appetizer", "Soup", "Main Course", "Pasta", "Vegetable", "Rice", "Dessert", "Drinks"];

export default function MyInquiriesPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // 14-Day Modification Request Modal State
  const [menuItems, setMenuItems] = useState<any[]>([]);
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
    let activeChannel: any = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const fetchInquiries = async (silent = false) => {
      const reqId = ++latestFetchIdRef.current;
      try {
        if (!silent) setLoading(true);
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !authData?.user) {
          if (isMounted && !silent) setLoading(false);
          return null;
        }

        const [bookingsRes, menuRes] = await Promise.all([
          supabase
            .from("bookings")
            .select("*, packages (id, name, price, additional_pax_price, category_limits, inclusions)")
            .eq("user_id", authData.user.id),
          supabase
            .from("menu_items")
            .select("id, name, category, status")
            .neq("status", "Archived"),
        ]);

        if (!isMounted || reqId !== latestFetchIdRef.current) return authData.user;

        const { data: bookingsData, error } = bookingsRes;
        if (error) throw error;

        if (menuRes.data) {
          setMenuItems(menuRes.data);
        }

        if (bookingsData && bookingsData.length > 0) {
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
        }
        return authData.user;
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
        if (isMounted && !silent) setLoading(false);
      }
    };

    const handleSilentRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchInquiries(true);
      }
    };

    window.addEventListener("bookingsRealtimeUpdated", handleSilentRefresh);
    window.addEventListener("focus", handleSilentRefresh);
    document.addEventListener("visibilitychange", handleSilentRefresh);

    fetchInquiries(false).then((authUser) => {
      if (!isMounted || !authUser) return;

      activeChannel = supabase
        .channel(`my-inquiries-live-${authUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `user_id=eq.${authUser.id}`,
          },
          () => {
            fetchInquiries(true);
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "menu_items" },
          () => {
            fetchInquiries(true);
          },
        )
        .subscribe();

      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchInquiries(true);
        }
      }, 5000);
    });

    return () => {
      isMounted = false;
      window.removeEventListener("bookingsRealtimeUpdated", handleSilentRefresh);
      window.removeEventListener("focus", handleSilentRefresh);
      document.removeEventListener("visibilitychange", handleSilentRefresh);
      if (pollTimer) clearInterval(pollTimer);
      if (activeChannel) supabase.removeChannel(activeChannel);
    };
  }, []);

  useEffect(() => {
    if (!modifyingBooking) return;
    if (menuItems.length === 0 && !isLoadingMenu) {
      setIsLoadingMenu(true);
      supabase
        .from("menu_items")
        .select("id, name, category, status")
        .neq("status", "Archived")
        .then(({ data }) => {
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
      ? booking.modification_requests
      : [];
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
            ? supabase.from("menu_items").select("id, name, category, status").neq("status", "Archived")
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

  const handleMenuToggle = (itemName: string) => {
    clearModErrorToast();
    const isSelected = modSelectedDishes.includes(itemName);
    const item = menuItems.find((opt) => opt.name === itemName);
    if (!item) return;

    const ruleCat = getRuleCategory(item.category, item.name);
    const limits = modifyingBooking?.packages?.category_limits;
    const maxLimit = limits && limits[ruleCat] !== undefined ? Number(limits[ruleCat]) : null;

    if (!isSelected && maxLimit !== null && maxLimit > 0) {
      const currentInCat = modSelectedDishes.filter((name) => {
        const def = menuItems.find((mi) => mi.name === name);
        return def ? getRuleCategory(def.category, def.name) === ruleCat : false;
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

    // Validate package category limits just like Step 3 of the Booking screen
    const pkgLimits = modifyingBooking?.packages?.category_limits;
    if (pkgLimits && Object.keys(pkgLimits).length > 0 && menuItems.length > 0) {
      for (const cat of categoryOrder) {
        const reqMax = pkgLimits[cat] !== undefined ? Number(pkgLimits[cat]) : 0;
        if (reqMax <= 0) continue;
        const availableInCat = menuItems.filter(
          (mi) => mi.status !== "Archived" && mi.status !== "Not Available" && getRuleCategory(mi.category, mi.name) === cat
        );
        const dynamicMin = Math.min(reqMax, availableInCat.length);
        const selectedCount = modSelectedDishes.filter((name) => {
          const def = menuItems.find((mi) => mi.name === name);
          return def ? getRuleCategory(def.category, def.name) === cat : false;
        }).length;
        if (selectedCount < dynamicMin) {
          triggerModErrorToast(`Please select ${dynamicMin} dish(es) for ${cat} (${selectedCount}/${dynamicMin} selected).`);
          return;
        }
      }
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

    const newTotalBudget = basePrice + extraPax * addPrice + travelFee + haulingFee + corkageFee;
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
        : Math.round(newTotalBudget * (is50Percent ? 0.5 : 0.2));
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

    // Prune any older dish_substitutions whose replacement dish the client just swapped out
    const existingSubs = Array.isArray(modifyingBooking.dish_substitutions)
      ? modifyingBooking.dish_substitutions
      : [];
    const activeSubsAfterEdit = existingSubs.filter((sub: any) =>
      modSelectedDishes.includes(sub.replacement_dish)
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

      if (payingMilestone !== null) {
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

                return {
                  method: method || "Payment",
                  scheme: scheme || "Standard 50%",
                  downpayment,
                  status,
                  receipt,
                  ref,
                  balanceAmount,
                  balanceStatus,
                  balanceMethod,
                  balanceRef,
                  balanceReceipt,
                  installments,
                };
              })();

              const eventDateObj = new Date(booking.event_date);
              const isValidEventDate = !isNaN(eventDateObj.getTime());
              const finalDeadline = isValidEventDate ? new Date(eventDateObj.getTime() - 15 * 24 * 60 * 60 * 1000) : null;
              const daysUntilDeadline = finalDeadline ? Math.ceil((finalDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              const formattedDeadline = finalDeadline ? finalDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

              return (
                <motion.div
                  key={booking.id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card border border-white/10 p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden group hover:border-gold-400/30 transition-colors"
                >
                  <div
                    className={`absolute top-0 left-0 w-1 h-full ${isCancelled ? "bg-red-500" : isApproved ? "bg-green-500" : "bg-yellow-500"}`}
                  />
                  <div className="space-y-5 flex-1 w-full">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold border ${isCancelled ? "border-red-500/50 text-red-500 bg-red-500/10" : isApproved ? "border-green-500/50 text-green-500 bg-green-500/10" : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"}`}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-white/40 font-mono">
                        ID:{" "}
                        {booking.id ? String(booking.id).split("-")[0] : "N/A"}
                      </span>
                    </div>

                    {/* Logistics & Out-of-Town Notification Banner */}
                    {(() => {
                      let logData = booking.logistics_info || null;
                      if ((!logData || Object.keys(logData).length === 0) && typeof booking.food_allergies === "string" && booking.food_allergies.includes("__PAYMENT_METADATA__:")) {
                        try {
                          const meta = JSON.parse(booking.food_allergies.split("__PAYMENT_METADATA__:")[1]);
                          if (meta?.logistics) logData = meta.logistics;
                        } catch (e) {}
                      }

                      const travelFee = Number(logData?.travelFee) || 0;
                      const haulingFee = Number(logData?.haulingFee) || 0;
                      const hasAdminUpdate = Boolean(logData?.updated_at);
                      const hasLogisticsFee = travelFee > 0 || haulingFee > 0;
                      const isOutsideTaytay = Boolean(
                        logData?.isOutsideTaytay !== undefined
                          ? logData.isOutsideTaytay
                          : (booking.event_location || "").toLowerCase().includes("taytay") === false
                      );

                      if (!hasLogisticsFee && !isOutsideTaytay && !hasAdminUpdate) return null;

                      return (
                        <div className={`p-4 rounded-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          hasLogisticsFee || hasAdminUpdate
                            ? "bg-gold-400/10 border-gold-400/40 text-gold-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        }`}>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-gold-400/40 bg-gold-400/20 text-gold-300 rounded">
                                {hasAdminUpdate
                                  ? "Update"
                                  : travelFee > 0
                                  ? "Travel Fee Confirmed"
                                  : haulingFee > 0
                                  ? "Hauling Fee Applied"
                                  : "Outside Taytay Coverage"}
                              </span>
                              <p className="text-xs font-bold text-white uppercase tracking-wider">
                                {hasAdminUpdate || travelFee > 0
                                  ? "Logistics & Travel Fees Updated by Coordinator"
                                  : haulingFee > 0
                                  ? "Stairs Ingress Hauling Fee Applied"
                                  : "Out-of-Town Venue Assessment in Progress"}
                              </p>
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed">
                              {hasLogisticsFee
                                ? `Logistics fees applied to your booking: ${[
                                    travelFee > 0 ? `Out-of-Town Travel Fee ₱${travelFee.toLocaleString()}` : "",
                                    haulingFee > 0 ? `Hauling / Stairs Fee ₱${haulingFee.toLocaleString()}` : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" • ")}. Your total balance has been updated accordingly.`
                                : "Your venue is outside Taytay, Rizal. Our coordinators are assessing distance & logistics to set your travel fee."}
                            </p>
                          </div>
                          {hasLogisticsFee && (
                            <div className="text-left sm:text-right shrink-0">
                              <p className="text-[10px] uppercase font-bold tracking-widest text-white/50">Total Logistics Surcharge</p>
                              <p className="text-lg font-serif font-bold text-gold-400">+₱{(travelFee + haulingFee).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Total Fees & Detailed Cost Breakdown */}
                    {(() => {
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
                      const totalAdditionalFees = travelFee + haulingFee + corkageFee;
                      const totalEventCost = basePrice + additionalPaxTotal + totalAdditionalFees;

                      return (
                        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-sm space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <CreditCard size={14} className="text-gold-400" />
                              Total Fees &amp; Additional Charges Breakdown
                            </span>
                            <span className="text-xs text-white/60 font-medium">
                              Estimated Total: <strong className="text-gold-400 font-serif text-sm">₱{totalEventCost.toLocaleString()}</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                            <div className="p-2.5 bg-white/5 rounded border border-white/5">
                              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Base Package</p>
                              <p className="font-semibold text-white mt-0.5">₱{basePrice.toLocaleString()}</p>
                              <p className="text-[10px] text-white/40">{booking.guest_count || 0} Standard Guests</p>
                            </div>

                            <div className="p-2.5 bg-white/5 rounded border border-white/5">
                              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Additional Pax</p>
                              <p className="font-semibold text-white mt-0.5">₱{additionalPaxTotal.toLocaleString()}</p>
                              <p className="text-[10px] text-white/40">
                                {extraPax > 0 ? `${extraPax} Extra Pax @ ₱${addPrice.toLocaleString()}` : "None"}
                              </p>
                            </div>

                            <div className={`p-2.5 rounded border ${haulingFee > 0 ? "bg-gold-400/10 border-gold-400/30 text-gold-300" : "bg-white/5 border-white/5"}`}>
                              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Hauling / Stairs Fee</p>
                              <p className="font-semibold text-white mt-0.5">
                                {haulingFee > 0 ? `+₱${haulingFee.toLocaleString()}` : "₱0"}
                              </p>
                              <p className="text-[10px] text-white/40">
                                {logData?.isSecondFloorOrHigher && !logData?.hasElevator
                                  ? `Floor ${logData.floorLevel || 2} (Stairs Ingress)`
                                  : "Ground floor or with elevator"}
                              </p>
                            </div>

                            <div className={`p-2.5 rounded border ${travelFee > 0 ? "bg-gold-400/10 border-gold-400/30 text-gold-300" : "bg-white/5 border-white/5"}`}>
                              <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Out-of-Town Travel Fee</p>
                              <p className="font-semibold text-white mt-0.5">
                                {travelFee > 0 ? (
                                  <span className="text-gold-400 font-bold">+₱{travelFee.toLocaleString()}</span>
                                ) : (
                                  <span className="text-white/60">₱0 (Pending/Taytay)</span>
                                )}
                              </p>
                              <p className="text-[10px] text-white/40">
                                {travelFee > 0 ? "Assessed by coordinator" : "Pending assessment"}
                              </p>
                            </div>

                            {corkageFee > 0 && (
                              <div className="p-2.5 rounded border bg-gold-400/10 border-gold-400/30 text-gold-300 col-span-1 sm:col-span-2 lg:col-span-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div>
                                    <p className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">Corkage &amp; Services</p>
                                    <p className="text-xs text-white/80 mt-0.5">
                                      {[
                                        corkageData?.hasLechonTable ? "Lechon Table Setup (₱1,500)" : "",
                                        corkageData?.alcoholicBeveragesCount > 0 ? `${corkageData.alcoholicBeveragesCount} Bottle(s) Alcohol (₱${(corkageData.alcoholicBeveragesCount * 400).toLocaleString()})` : "",
                                        corkageData?.outsideFoodCount > 0 ? `${corkageData.outsideFoodCount} Outside Dish(es) (₱${(corkageData.outsideFoodCount * 400).toLocaleString()})` : "",
                                      ].filter(Boolean).join(" • ")}
                                    </p>
                                  </div>
                                  <p className="font-serif font-bold text-gold-400 text-sm sm:text-base">
                                    +₱{corkageFee.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <div className="flex items-start gap-3 text-sm text-white/80">
                        <Calendar
                          size={16}
                          className="text-gold-400 shrink-0 mt-0.5"
                        />
                        <span className="font-medium tracking-wide">
                          {booking.event_date || "Date TBD"} <br />
                          <span className="text-white/50 text-xs">
                            {booking.event_time || ""}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-white/80">
                        <MapPin
                          size={16}
                          className="text-gold-400 shrink-0 mt-0.5"
                        />
                        <span className="font-medium tracking-wide leading-relaxed line-clamp-2">
                          {booking.event_location || "Location TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/80">
                        <Package size={16} className="text-gold-400 shrink-0" />
                        <span className="font-medium tracking-wide">
                          {booking.packages?.name || "Custom Package"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/80">
                        <Users size={16} className="text-gold-400 shrink-0" />
                        <span className="font-medium tracking-wide">
                          {(Number(booking.guest_count) || 0) + (Number(booking.additional_pax) || 0)} Guests
                          {Number(booking.additional_pax) > 0 && (
                            <span className="text-gold-400 text-xs ml-1.5 font-semibold">
                              ({booking.guest_count || 50} + {booking.additional_pax} Extra)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {paymentData && (
                      <div className="space-y-3 mt-4">
                        {/* Initial Security Downpayment Row */}
                        <div className="p-4 bg-white/5 border border-white/10 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400 shrink-0">
                              <CreditCard size={16} />
                            </div>
                            <div>
                              <p className="text-xs text-white font-bold flex items-center gap-2">
                                <span>{paymentData.scheme || "Deposit"}: ₱{paymentData.downpayment.toLocaleString()}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 font-sans uppercase font-bold tracking-wider">
                                  {paymentData.method}
                                </span>
                              </p>
                              <p className="text-[10px] text-white/50 mt-0.5">
                                Deposit Status:{" "}
                                <span className={paymentData.status === "Verified" ? "text-green-400 font-bold" : "text-gold-400 font-bold"}>
                                  {paymentData.status}
                                </span>
                                {paymentData.ref && ` • Ref: ${paymentData.ref}`}
                              </p>
                            </div>
                          </div>
                          {paymentData.receipt && (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptUrl(paymentData.receipt)}
                              className="px-3 py-1.5 border border-gold-400/30 text-gold-400 hover:bg-gold-400/10 text-[10px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shrink-0"
                            >
                              <Eye size={12} /> View Deposit Slip
                            </button>
                          )}
                        </div>

                        {/* 15-Day Final Balance Settlement Tracker (Clause 1) */}
                        {!isCancelled && (() => {
                          const hasStartedInstallments = Boolean(
                            paymentData.installments &&
                            paymentData.installments.length > 0 &&
                            paymentData.installments.some(
                              (inst: any) =>
                                inst.status === "Verified" ||
                                inst.status === "Paid" ||
                                (Boolean(inst.receipt_url) && !paymentData.balanceReceipt) ||
                                (inst.status === "Pending Verification" && !paymentData.balanceReceipt)
                            )
                          );

                          return (
                            <div className="p-4 bg-gradient-to-r from-gold-400/[0.07] via-white/[0.03] to-transparent border border-gold-400/25 rounded-sm space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <Clock size={15} className="text-gold-400 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white">
                                  15-Day Balance Settlement Tracker
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {paymentData.balanceStatus === "Verified" ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1">
                                    <CheckCircle size={12} /> Balance Settled & Verified
                                  </span>
                                ) : paymentData.balanceStatus === "Pending Verification" ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                    <Clock size={12} /> Balance Under Review
                                  </span>
                                ) : hasStartedInstallments ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                    <Clock size={12} /> Installment Plan Active
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                                    Final Balance Unpaid
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <p className="text-xs text-white/90">
                                  Final Balance Due:{" "}
                                  <strong className="text-gold-400 font-serif text-sm">
                                    ₱{paymentData.balanceAmount.toLocaleString()}
                                  </strong>
                                </p>
                                {formattedDeadline && (
                                  <p className="text-[11px] text-white/60 mt-0.5">
                                    Deadline: <strong className="text-white/90">{formattedDeadline}</strong>
                                  </p>
                                )}
                                {daysUntilDeadline !== null && paymentData.balanceStatus !== "Verified" && (
                                  <p className={`text-[11px] font-bold mt-1 ${daysUntilDeadline <= 0 ? "text-red-400" : daysUntilDeadline <= 7 ? "text-amber-400" : "text-gold-300"}`}>
                                    {daysUntilDeadline > 0
                                      ? `Final Balance due in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"}`
                                      : `Final Balance is strictly overdue (${Math.abs(daysUntilDeadline)} days past deadline)`}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                {paymentData.balanceReceipt && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingReceiptUrl(paymentData.balanceReceipt)}
                                    className="px-3 py-1.5 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5"
                                  >
                                    <Eye size={12} /> View Balance Slip
                                  </button>
                                )}

                                {paymentData.balanceStatus !== "Verified" && (
                                  paymentData.balanceStatus === "Pending Verification" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBalanceModal({ ...booking, paymentData })}
                                      className="px-4 py-2 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md flex items-center gap-1.5"
                                    >
                                      <CreditCard size={13} />
                                      Re-upload Balance Slip
                                    </button>
                                  ) : hasStartedInstallments ? (
                                    <div className="flex flex-col items-end gap-1">
                                      <button
                                        type="button"
                                        disabled
                                        className="px-4 py-2 bg-white/5 border border-white/10 text-white/30 text-xs font-bold uppercase tracking-wider rounded cursor-not-allowed flex items-center gap-1.5 select-none"
                                        title="Installment payments have already been made. Paying full balance at once is disabled."
                                      >
                                        <Lock size={13} className="text-white/30" />
                                        Pay Full Balance at Once
                                      </button>
                                      <span className="text-[10px] text-white/40">
                                        Installment plan active • Pay via milestones below
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBalanceModal({ ...booking, paymentData })}
                                      className="px-4 py-2 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md flex items-center gap-1.5"
                                    >
                                      <CreditCard size={13} />
                                      {paymentData.installments && paymentData.installments.length > 0
                                        ? "Pay Full Balance at Once"
                                        : "Pay Final Balance"}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Monthly installment milestone list if 20% scheme was selected */}
                            {paymentData.installments && paymentData.installments.length > 0 && (
                              <div className="pt-3 border-t border-white/10 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider flex items-center gap-1.5">
                                    <Clock size={12} className="text-gold-400" />
                                    Scheduled Installment
                                  </p>
                                  <span className="text-[10px] text-white/40">
                                    Upload payment receipts milestone by milestone
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {(() => {
                                    const isFullBalancePending =
                                      paymentData.balanceStatus === "Pending Verification" ||
                                      Boolean(paymentData.balanceReceipt && paymentData.balanceStatus !== "Verified");
                                    const isFullBalanceVerified = paymentData.balanceStatus === "Verified";

                                    return paymentData.installments.map((inst: any, idx: number) => {
                                      const isIndividuallyPaid = inst.status === "Verified" || inst.status === "Paid";
                                      const isPaid = isIndividuallyPaid || isFullBalanceVerified;
                                      const isPending = !isIndividuallyPaid && (inst.status === "Pending Verification" || isFullBalancePending);
                                      const hasReceipt = Boolean(inst.receipt_url) || (isFullBalancePending && Boolean(paymentData.balanceReceipt));
                                      const receiptToShow = inst.receipt_url || paymentData.balanceReceipt;

                                      // Check if all previous installments have been paid/submitted
                                      const isPreviousPaid =
                                        idx === 0 ||
                                        isFullBalancePending ||
                                        isFullBalanceVerified ||
                                        paymentData.installments
                                          .slice(0, idx)
                                          .every((prev: any) => prev.status === "Verified" || prev.status === "Paid" || Boolean(prev.receipt_url));

                                      const isLocked = !isPreviousPaid && !isPaid && !isPending;
                                      const previousMilestone = idx > 0 ? paymentData.installments[idx - 1] : null;

                                      return (
                                        <div
                                          key={idx}
                                          className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isPaid
                                              ? "bg-green-500/5 border-green-500/30"
                                              : isPending
                                              ? "bg-amber-500/5 border-amber-500/30"
                                              : isLocked
                                              ? "bg-white/[0.02] border-white/5 opacity-60"
                                              : "bg-black/40 border-white/5 hover:border-white/15"
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div
                                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                                                isPaid
                                                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                                  : isPending
                                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                                  : isLocked
                                                  ? "bg-white/5 text-white/30 border border-white/5"
                                                  : "bg-white/10 text-white/70 border border-white/10"
                                              }`}
                                            >
                                              {isPaid ? (
                                                <CheckCircle size={14} />
                                              ) : isPending ? (
                                                <Clock size={13} className="text-amber-300" />
                                              ) : isLocked ? (
                                                <Lock size={12} className="text-white/40" />
                                              ) : (
                                                idx + 1
                                              )}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-xs">{inst.title}</span>
                                                {isPaid ? (
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1">
                                                    <CheckCircle size={10} /> Paid
                                                  </span>
                                                ) : isPending ? (
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                                    <Clock size={10} /> {isFullBalancePending && !inst.receipt_url ? "Pending Approval" : "Under Review"}
                                                  </span>
                                                ) : isLocked ? (
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/5 text-white/30 border border-white/5 flex items-center gap-1">
                                                    <Lock size={9} /> Locked
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/10 text-white/50 border border-white/10">
                                                    {inst.status || "Upcoming"}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-white/50 mt-0.5">
                                                Due Date: <span className="text-white/80 font-medium">{inst.dueDate}</span>
                                              </p>
                                              {isFullBalancePending && !isIndividuallyPaid && (
                                                <p className="text-[10px] text-amber-300/80 italic flex items-center gap-1 mt-0.5">
                                                  <Clock size={10} className="text-amber-400" /> Covered by Full Balance payment (Pending Approval)
                                                </p>
                                              )}
                                              {isLocked && (
                                                <p className="text-[10px] text-white/40 italic flex items-center gap-1 mt-0.5">
                                                  <Lock size={10} className="text-white/30" /> Settle {previousMilestone?.title || `Installment #${idx}`} first to unlock
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                            <span className="font-serif font-bold text-gold-400 text-sm">
                                              ₱{Number(inst.amount).toLocaleString()}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                              {hasReceipt && (
                                                <button
                                                  type="button"
                                                  onClick={() => setViewingReceiptUrl(receiptToShow)}
                                                  className="px-2.5 py-1.5 border border-white/20 hover:border-gold-400/50 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                  <Eye size={12} /> View Slip
                                                </button>
                                              )}

                                              {!isPaid && (
                                                isFullBalancePending ? (
                                                  <button
                                                    type="button"
                                                    disabled
                                                    className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-not-allowed select-none"
                                                  >
                                                    <Clock size={11} className="text-amber-400" />
                                                    Pending Approval
                                                  </button>
                                                ) : isLocked ? (
                                                  <button
                                                    type="button"
                                                    disabled
                                                    title={`Please settle ${previousMilestone?.title || `Installment #${idx}`} first`}
                                                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/30 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-not-allowed select-none opacity-60"
                                                  >
                                                    <Lock size={11} className="text-white/30" />
                                                    Pay Installment
                                                  </button>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenBalanceModal({ ...booking, paymentData }, idx, inst)}
                                                    className="px-3 py-1.5 gold-gradient text-black hover:brightness-110 text-[10px] font-bold uppercase tracking-wider rounded transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                                  >
                                                    <UploadCloud size={12} />
                                                    {isPending ? "Re-upload Slip" : "Pay Installment"}
                                                  </button>
                                                )
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
                          </div>
                        );
                      })()}
                      </div>
                    )}

                    {/* 14-Day Modification Lockout & Menu Adjustments Window */}
                    {!isCancelled && (() => {
                      const eventDateObj = new Date(`${booking.event_date}T00:00:00`);
                      const isValidDate = !isNaN(eventDateObj.getTime());
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const daysUntilEvent = isValidDate
                        ? Math.ceil((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;
                      const isModificationLocked = daysUntilEvent <= 14;
                      const daysLeftToModify = Math.max(0, daysUntilEvent - 14);
                      const cutoffDate = isValidDate
                        ? new Date(eventDateObj.getTime() - 14 * 24 * 60 * 60 * 1000)
                        : null;
                      const formattedCutoffDate = cutoffDate
                        ? cutoffDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "";

                      const currentMenuList: string[] = Array.isArray(booking.selected_menu_items)
                        ? booking.selected_menu_items
                        : [];
                      // Only display substitutions whose replacement dish is currently active in the menu
                      const substitutions: any[] = Array.isArray(booking.dish_substitutions)
                        ? booking.dish_substitutions.filter((sub: any) =>
                            sub?.replacement_dish && currentMenuList.includes(sub.replacement_dish)
                          )
                        : [];
                      const modRequests: any[] = Array.isArray(booking.modification_requests)
                        ? booking.modification_requests.filter((r: any) => r.status !== "Superseded")
                        : [];
                      const latestRequest = modRequests.length > 0 ? modRequests[modRequests.length - 1] : null;
                      const activeInstructions =
                        (booking.logistics_info?.client_special_instructions || "").trim() ||
                        (latestRequest?.notes || "").trim();

                      return (
                        <div className="mt-4 p-4 bg-gradient-to-r from-white/[0.04] to-transparent border border-white/10 rounded-sm space-y-3.5">
                          {/* Policy & Cutoff Countdown Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Clock size={15} className="text-gold-400 shrink-0" />
                              <span className="text-xs font-bold uppercase tracking-wider text-white">
                                14-Day Modification Policy &amp; Window
                              </span>
                            </div>
                            <div>
                              {!isModificationLocked ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                  <Clock size={11} /> {daysLeftToModify} Day{daysLeftToModify === 1 ? "" : "s"} Left to Modify
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                                  <Lock size={11} /> Modifications Locked
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Notice & Action */}
                          {!isModificationLocked ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/[0.05] border border-emerald-500/20 p-3 rounded">
                              <div className="space-y-0.5">
                                <p className="text-xs text-white font-medium">
                                  Event is in <strong className="text-emerald-400">{daysUntilEvent} days</strong>. Modification window is open until <strong className="text-white">{formattedCutoffDate}</strong>.
                                </p>
                                <p className="text-[11px] text-white/60">
                                  You may update your menu selections, extra headcount, or special instructions before the 14-day cutoff per contract.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenModifyModal(booking)}
                                className="px-4 py-2 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow flex items-center gap-1.5 shrink-0 cursor-pointer"
                              >
                                <Sliders size={13} /> Modify Menu &amp; Details
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-500/[0.06] border border-red-500/30 p-3 rounded">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                  <Lock size={13} /> Modifications locked: All changes require 14 days prior notice per contract.
                                </p>
                                <p className="text-[11px] text-white/60">
                                  Your event is scheduled in {Math.max(0, daysUntilEvent)} day{daysUntilEvent === 1 ? "" : "s"}. Ingredients procurement, kitchen prep, and staffing are currently locked.
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled
                                className="px-4 py-2 bg-white/5 border border-white/10 text-white/30 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-not-allowed select-none shrink-0"
                                title="Modifications locked: All changes require 14 days prior notice per contract."
                              >
                                <Lock size={13} /> Modifications Locked
                              </button>
                            </div>
                          )}

                          {/* Active Dish Substitution Notice (only shown for replacement dishes currently in menu) */}
                          {substitutions.length > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase tracking-wider">
                                  <RefreshCw size={13} />
                                  <span>Coordinator Dish Substitution</span>
                                </div>
                                {!isModificationLocked && (
                                  <span className="text-[10px] text-amber-200/70">
                                    You may reselect another dish anytime above
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                {substitutions.map((sub: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-black/40 border border-white/5 rounded text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div>
                                      <span className="text-white/50 text-[11px] mr-1.5">Replaced unavailable</span>
                                      <span className="text-white/70 line-through">{sub.original_dish}</span>
                                      <span className="text-white/40 mx-1.5">➔</span>
                                      <span className="text-gold-400 font-bold">{sub.replacement_dish}</span>
                                      {sub.reason && <span className="text-white/50 text-[11px] block sm:inline sm:ml-2">({sub.reason})</span>}
                                    </div>
                                    <span className="text-[10px] text-white/40 shrink-0">
                                      {sub.substituted_at ? new Date(sub.substituted_at).toLocaleDateString() : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Special Instructions / Notes Display */}
                          {activeInstructions && (
                            <div className="p-3 bg-gold-400/[0.06] border border-gold-400/25 rounded space-y-1 text-xs">
                              <p className="text-[10px] uppercase font-bold text-gold-400 tracking-wider flex items-center gap-1.5">
                                <Edit3 size={12} />
                                Special Instructions / Notes for Coordinator
                              </p>
                              <p className="text-white/90 text-xs leading-relaxed">
                                "{activeInstructions}"
                              </p>
                            </div>
                          )}

                          {/* Only show a notice if Coordinator explicitly Declined / Reverted the most recent change */}
                          {latestRequest && latestRequest.status === "Rejected" && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-red-300 uppercase font-bold text-[10px] tracking-wider flex items-center gap-1.5">
                                  <AlertCircle size={12} />
                                  Recent Modification Reverted by Coordinator
                                </span>
                                <span className="text-[10px] text-white/40">
                                  {latestRequest.reviewed_at ? new Date(latestRequest.reviewed_at).toLocaleDateString() : ""}
                                </span>
                              </div>
                              {latestRequest.review_note && (
                                <p className="text-white/80 text-[11px] italic">
                                  "{latestRequest.review_note}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Current Selected Menu Preview Grouped by Category */}
                          {Array.isArray(booking.selected_menu_items) && booking.selected_menu_items.length > 0 && (() => {
                            const grouped: Record<string, string[]> = {};
                            booking.selected_menu_items.forEach((dish: string) => {
                              const def = menuItems.find((mi) => mi.name === dish);
                              const cat = getRuleCategory(def?.category || "", dish);
                              if (!grouped[cat]) grouped[cat] = [];
                              grouped[cat].push(dish);
                            });
                            const orderedCats = categoryOrder.filter((c) => grouped[c] && grouped[c].length > 0);
                            Object.keys(grouped).forEach((c) => {
                              if (!orderedCats.includes(c)) orderedCats.push(c);
                            });

                            return (
                              <div className="pt-2.5 border-t border-white/10 space-y-2.5">
                                <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider flex items-center gap-1.5">
                                  <Utensils size={12} className="text-gold-400" />
                                  Current Menu Selections ({booking.selected_menu_items.length} dishes)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {orderedCats.map((cat) => (
                                    <div key={cat} className="space-y-1">
                                      <p className="text-[10px] font-bold text-gold-400/80 uppercase tracking-wider border-b border-white/5 pb-0.5">
                                        {cat} ({grouped[cat].length})
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {grouped[cat].map((m: string) => {
                                          const matchingSub = substitutions.find((s: any) => s.replacement_dish === m);
                                          return (
                                            <span
                                              key={m}
                                              title={matchingSub ? `Substituted for ${matchingSub.original_dish}` : undefined}
                                              className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1.5 ${
                                                matchingSub
                                                  ? "bg-amber-500/10 border border-amber-500/35 text-amber-200"
                                                  : "bg-white/5 border border-white/10 text-white/90"
                                              }`}
                                            >
                                              <span>{m}</span>
                                              {matchingSub && (
                                                <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
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
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {isCancelled && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 mt-4 rounded-sm flex flex-col gap-2">
                        <p className="text-sm text-red-400">
                          <span className="font-bold">Reason:</span>{" "}
                          {reason || "No reason provided"}
                        </p>
                        <p className="text-[10px] text-red-400/60 uppercase tracking-widest font-bold">
                          Cancelled on:{" "}
                          {booking.updated_at
                            ? new Date(booking.updated_at).toLocaleString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : new Date(booking.created_at).toLocaleString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                        </p>
                      </div>
                    )}
                    {isApproved && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 mt-4 rounded-sm flex flex-col gap-2">
                        <p className="text-sm text-green-400 font-medium">
                          Your booking has been successfully confirmed. We'll be
                          in touch soon!
                        </p>
                        <p className="text-[10px] text-green-400/60 uppercase tracking-widest font-bold">
                          Confirmed on:{" "}
                          {booking.updated_at
                            ? new Date(booking.updated_at).toLocaleString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : new Date(booking.created_at).toLocaleString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                        </p>
                      </div>
                    )}
                    {statusLower === "pending" && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 mt-4 rounded-sm">
                        <p className="text-sm text-yellow-400 font-medium">
                          Your booking request is currently pending and under
                          review.
                        </p>
                      </div>
                    )}

                    {(statusLower === "pending" || isApproved) && (
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                        <button
                          onClick={() => setCancelModalId(booking.id)}
                          className="px-6 py-2 border border-red-500/30 text-red-400/80 text-xs font-bold tracking-widest uppercase hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all"
                        >
                          Cancel {isApproved ? "Booking" : "Request"}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-white/10 p-8 max-w-sm w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
              <h3 className="text-3xl font-serif text-white mb-2 italic">
                Cancel <span className="text-red-400">Booking</span>
              </h3>
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
                <label className="text-sm font-bold text-white/80 mb-2 block">
                  Reason for Cancellation{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
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
                  <p className="text-xs text-red-400 mt-2 font-medium">
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-white/15 p-6 max-w-lg w-full relative overflow-hidden rounded-xl bg-[#0c0c0c] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <h4 className="text-base font-serif text-white flex items-center gap-2">
                  <CreditCard className="text-gold-400" size={18} />
                  Proof of Payment Receipt
                </h4>
                <button
                  onClick={() => setViewingReceiptUrl(null)}
                  className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card border border-white/15 max-w-2xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl rounded-xl bg-[#0c0c0c]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/30 flex items-center justify-center">
                    <CreditCard className="text-gold-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif text-white italic">
                      Pay <span className="gold-text-gradient font-bold not-italic">{payingMilestone ? payingMilestone.title : "Final Balance"}</span>
                    </h3>
                    <p className="text-xs text-white/60 uppercase tracking-widest font-semibold mt-0.5">
                      {payingMilestone ? `Milestone Installment • Due: ${payingMilestone.dueDate || "As scheduled"}` : "Due 15 Days Before Event Date"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPayingBalanceBooking(null);
                    setPayingMilestone(null);
                  }}
                  className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 scrollbar-thin">
                {balanceError && (
                  <div className="p-4 bg-red-950/90 border border-red-500/50 rounded-lg text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <span>{balanceError}</span>
                  </div>
                )}

                {/* Amount Due Card */}
                <div className="p-6 bg-gradient-to-r from-gold-400/15 via-white/5 to-transparent border border-gold-400/30 rounded-xl relative overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gold-400 mb-1">
                        {payingMilestone ? `${payingMilestone.title} Amount Due` : "Final Balance Amount Due"}
                      </p>
                      <p className="text-3xl font-serif text-gold-400 font-bold">
                        ₱{Number(payingMilestone ? payingMilestone.amount : (payingBalanceBooking.paymentData?.balanceAmount || payingBalanceBooking.final_balance_amount || 0)).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-white/60">
                        {payingBalanceBooking.packages?.name || "Catering Event Package"}
                      </span>
                    </div>
                    <div className="sm:border-l sm:border-white/10 sm:pl-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">
                        {payingMilestone ? "Milestone Scheduled Due Date" : "Event Date & Settlement Deadline"}
                      </p>
                      <p className="text-sm font-bold text-white">
                        {payingMilestone ? payingMilestone.dueDate : (payingBalanceBooking.event_date || "Event Date")}
                      </p>
                      <span className="text-[10px] text-amber-300 font-semibold block mt-1">
                        {payingMilestone ? "Installment Payment" : "Due at least 15 days before event"}
                      </span>
                    </div>
                  </div>
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
                    Upload {payingMilestone ? `${payingMilestone.title} Receipt` : "Final Balance Receipt"} <span className="text-red-400">*</span>
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
                      <p className="text-sm font-bold text-white">Click to upload {payingMilestone ? `${payingMilestone.title} slip` : "balance receipt slip"}</p>
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0b0b] border border-white/15 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sliders size={18} className="text-gold-400" />
                    <h3 className="text-lg font-serif font-bold text-white">
                      Modify Event Details &amp; Menu
                    </h3>
                  </div>
                  <p className="text-xs text-white/60">
                    Event Date: <span className="text-gold-400 font-semibold">{modifyingBooking.event_date}</span> • Changes made &gt;14 days prior to event apply immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearModErrorToast();
                    setModifyingBooking(null);
                  }}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-left flex-1 custom-scrollbar">
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
                        const itemsInCat = menuItems.filter((mi) => {
                          if (mi.status === "Archived") return false;
                          return getRuleCategory(mi.category, mi.name) === category;
                        });

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
                          const def = menuItems.find((mi) => mi.name === dishName);
                          return def ? getRuleCategory(def.category, def.name) === category : false;
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
                                      <span className="text-xs sm:text-sm tracking-wide font-bold text-left leading-snug">
                                        {item.name}
                                      </span>
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
                                        Not Available
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
