import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { Calendar, MapPin, Users, Package, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyInquiriesPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState("");
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

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
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "Cancelled",
          cancellation_reason: finalReason,
          cancelled_by: "Customer",
        })
        .eq("id", cancelModalId);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancelModalId
            ? { ...b, status: "Cancelled", cancellation_reason: finalReason }
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

                    {statusLower === "pending" && (
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                        <button
                          onClick={() => setCancelModalId(booking.id)}
                          className="px-6 py-2 border border-red-500/30 text-red-400/80 text-xs font-bold tracking-widest uppercase hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 transition-all"
                        >
                          Cancel Request
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
                Are you sure you want to cancel this booking request? This
                action cannot be undone.
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
    </div>
  );
}
