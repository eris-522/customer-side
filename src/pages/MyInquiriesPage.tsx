import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
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
  Building2,
  QrCode,
  UploadCloud,
  Copy,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

// Client-side image compression helper to ensure balance receipts upload quickly and reliably
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxWidth = 1000;
        const maxHeight = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

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

  // 15-Day Final Balance Payment Modal State
  const [payingBalanceBooking, setPayingBalanceBooking] = useState<any | null>(null);
  const [balancePaymentMethod, setBalancePaymentMethod] = useState<"GCash" | "Bank Transfer">("GCash");
  const [balanceRef, setBalanceRef] = useState<string>("");
  const [balanceReceiptImage, setBalanceReceiptImage] = useState<string>("");
  const [balanceReceiptName, setBalanceReceiptName] = useState<string>("");
  const [balanceError, setBalanceError] = useState<string>("");
  const [isSubmittingBalance, setIsSubmittingBalance] = useState<boolean>(false);
  const [copiedBalanceAccount, setCopiedBalanceAccount] = useState<string>("");

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !authData?.user) {
          setLoading(false);
          return;
        }

        const { data: bookingsData, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("user_id", authData.user.id);

        if (error) throw error;

        // Debugging log to see exactly what Supabase returns in the browser console
        console.log("Database Bookings Fetch:", bookingsData);

        if (bookingsData && bookingsData.length > 0) {
          const { data: pkgData } = await supabase
            .from("packages")
            .select("id, name");

          const merged = bookingsData
            .map((b) => ({
              ...b,
              packages:
                pkgData?.find((p) => String(p.id) === String(b.package_id)) ||
                null,
            }))
            .sort((a, b) => {
              const dateA = new Date(
                a.created_at || a.event_date || 0,
              ).getTime();
              const dateB = new Date(
                b.created_at || b.event_date || 0,
              ).getTime();
              return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
            });
          setBookings(merged);
        } else {
          setBookings([]);
        }
      } catch (err: any) {
        console.error("Critical error in fetchInquiries:", err);
        setErrorMsg(
          err.message ||
            "An unexpected error occurred while fetching your data.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

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
              }
            : b,
        ),
      );
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

  const handleOpenBalanceModal = (booking: any) => {
    setPayingBalanceBooking(booking);
    setBalancePaymentMethod("GCash");
    setBalanceRef("");
    setBalanceReceiptImage("");
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
      const compressed = await compressImage(file);
      setBalanceReceiptImage(compressed);
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
      // 1. Attempt direct update
      let { error } = await supabase
        .from("bookings")
        .update({
          final_balance_status: "Pending Verification",
          final_balance_method: balancePaymentMethod,
          final_balance_reference: balanceRef.trim(),
          final_balance_receipt: balanceReceiptImage,
        })
        .eq("id", payingBalanceBooking.id);

      // 2. Resilient fallback if columns not yet in DB
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
        currentMeta.finalBalanceReceipt = balanceReceiptImage;
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
                final_balance_receipt: balanceReceiptImage,
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
                        m.finalBalanceReceipt = balanceReceiptImage;
                        return `${parts[0].trim() ? parts[0].trim() + "\n" : ""}__PAYMENT_METADATA__:${JSON.stringify(m)}`;
                      })()
                    : b.food_allergies,
              }
            : b,
        ),
      );

      setPayingBalanceBooking(null);
    } catch (err: any) {
      console.error("Error submitting final balance:", err);
      setBalanceError(err.message || "Failed to submit final balance payment.");
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
                          {booking.guest_count || 0} Guests
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
                        {!isCancelled && (
                          <div className="p-4 bg-gradient-to-r from-gold-400/[0.07] via-white/[0.03] to-transparent border border-gold-400/25 rounded-sm space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <Clock size={15} className="text-gold-400 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-white">
                                  15-Day Balance Settlement Tracker
                                </span>
                                <span className="text-[10px] text-gold-400/70 font-mono">
                                  Clause 1
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
                                    Strict Deadline: <strong className="text-white/90">{formattedDeadline}</strong> (15 days before event)
                                  </p>
                                )}
                                {daysUntilDeadline !== null && paymentData.balanceStatus !== "Verified" && (
                                  <p className={`text-[11px] font-bold mt-1 ${daysUntilDeadline <= 0 ? "text-red-400" : daysUntilDeadline <= 7 ? "text-amber-400" : "text-gold-300"}`}>
                                    {daysUntilDeadline > 0
                                      ? `⏳ Final Balance due in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} (Strictly 15 days before event date)`
                                      : `⚠️ Final Balance is strictly overdue (${Math.abs(daysUntilDeadline)} days past 15-day deadline)`}
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
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBalanceModal({ ...booking, paymentData })}
                                    className="px-4 py-2 gold-gradient text-black hover:brightness-110 text-xs font-bold uppercase tracking-wider rounded transition-all shadow-md flex items-center gap-1.5"
                                  >
                                    <CreditCard size={13} />
                                    {paymentData.balanceStatus === "Pending Verification" ? "Re-upload Balance Slip" : "Pay Final Balance"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Monthly installment milestone list if 20% scheme was selected */}
                            {paymentData.installments && paymentData.installments.length > 0 && (
                              <div className="pt-2 border-t border-white/5 space-y-1.5">
                                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                                  Scheduled Installment Milestones (Clause 1)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {paymentData.installments.map((inst: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center px-2.5 py-1.5 bg-black/40 rounded border border-white/5 text-[11px]">
                                      <span className="text-white/70">{inst.title}</span>
                                      <span className="font-bold text-gold-400 font-serif">₱{Number(inst.amount).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
                    Strict Non-Refundable Policy (Contract Clauses 1 & 16):
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
                      Pay <span className="gold-text-gradient font-bold not-italic">Final Balance</span>
                    </h3>
                    <p className="text-xs text-white/60 uppercase tracking-widest font-semibold mt-0.5">
                      Strictly Due 15 Days Before Event Date (Clause 1)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPayingBalanceBooking(null)}
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
                        Final Balance Amount Due
                      </p>
                      <p className="text-3xl font-serif text-gold-400 font-bold">
                        ₱{Number(payingBalanceBooking.paymentData?.balanceAmount || payingBalanceBooking.final_balance_amount || 0).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-white/60">
                        {payingBalanceBooking.packages?.name || "Catering Event Package"}
                      </span>
                    </div>
                    <div className="sm:border-l sm:border-white/10 sm:pl-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">
                        Event Date & Settlement Deadline
                      </p>
                      <p className="text-sm font-bold text-white">
                        {payingBalanceBooking.event_date || "Event Date"}
                      </p>
                      <span className="text-[10px] text-amber-300 font-semibold block mt-1">
                        Strictly due at least 15 days before event
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
                          <span className="text-[9px] font-bold text-[#007DFE] mt-1 uppercase tracking-tighter">
                            GCash QR
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">
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
                    Upload Final Balance Receipt <span className="text-red-400">*</span>
                  </label>
                  {balanceReceiptImage ? (
                    <div className="p-4 bg-white/5 border border-gold-400/40 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={balanceReceiptImage}
                          alt="Receipt Preview"
                          className="w-16 h-16 object-cover rounded border border-white/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {balanceReceiptName || "balance_receipt.jpg"}
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
                      <p className="text-sm font-bold text-white">Click to upload balance receipt slip</p>
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
                  onClick={() => setPayingBalanceBooking(null)}
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
                  {isSubmittingBalance ? "Submitting Balance..." : "Submit Proof of Final Balance"}
                  {!isSubmittingBalance && <ChevronRight size={14} />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
