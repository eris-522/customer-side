import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Users,
  MapPin,
  Info,
  Package,
  Utensils,
  ClipboardCheck,
} from "lucide-react";
import { supabase } from "../utils/supabase";

interface FormData {
  packageId: string;
  date: string;
  time: string;
  guestCount: string;
  venueName: string;
  venueAddress: string;
  menuSelections: string[];
}

const steps = [
  { id: 1, title: "Package", icon: Package },
  { id: 2, title: "Details", icon: Calendar },
  { id: 3, title: "Menu", icon: Utensils },
  { id: 4, title: "Review", icon: ClipboardCheck },
];

export default function BookingPage() {
  // Feature: Minimum selectable date (tomorrow only)
  const minSelectableDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();
  const navigate = useNavigate();
  // Feature: State for tracking the current view in the multi-step form
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Feature: State to hold validation error messages for the current step
  const [stepError, setStepError] = useState("");

  // Database States
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [menuOptions, setMenuOptions] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Feature: Main form data object holding all user selections
  const [formData, setFormData] = useState<FormData>({
    packageId: "",
    date: "",
    time: "",
    guestCount: "",
    venueName: "",
    venueAddress: "",
    menuSelections: [],
  });

  // Feature: Fetches required dynamic data (packages, menu, services) from Supabase on mount
  useEffect(() => {
    const fetchBookingData = async () => {
      // Get the current logged in user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        navigate("/auth");
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      setUserProfile(profile);

      // Fetch active packages, menu items, and add-ons
      const [pkgRes, menuRes] = await Promise.all([
        supabase.from("packages").select("*").neq("status", "Archived"),
        supabase.from("menu_items").select("*").neq("status", "Archived"),
      ]);

      if (pkgRes.data) setAvailablePackages(pkgRes.data);
      if (menuRes.data) setMenuOptions(menuRes.data);

      setLoadingData(false);
    };

    fetchBookingData();
  }, [navigate]);

  // Feature: Validates the current step before allowing the user to proceed to the next one
  const handleNextStep = () => {
    setStepError(""); // Clear previous errors

    if (currentStep === 1) {
      if (!formData.packageId) {
        setStepError("Please select a catering package to continue.");
        return;
      }
    } else if (currentStep === 2) {
      if (formData.date && formData.date < minSelectableDate) {
        setStepError(`Event Date must be ${minSelectableDate} or later.`);
        return;
      }
      // Enforce that all text inputs, dates, and numbers are filled out
      if (
        !formData.date ||
        !formData.time ||
        !formData.guestCount ||
        !formData.venueName.trim() ||
        !formData.venueAddress.trim()
      ) {
        setStepError("Please fill out all event details before continuing.");
        return;
      }
    } else if (currentStep === 3) {
      // Enforce at least one menu item selection
      if (formData.menuSelections.length === 0) {
        setStepError("Please select at least one menu item for your event.");
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  // Feature: Moves back a step and clears any active error messages
  const prevStep = () => {
    setStepError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Feature: Auto-advances to step 2 when a package is clicked (since it fulfills step 1 validation)
  const handlePackageSelect = (id: string) => {
    setStepError("");
    setFormData({ ...formData, packageId: id });
    setCurrentStep(2);
  };

  // Feature: Toggles menu items on/off in the formData array
  const handleMenuToggle = (itemName: string) => {
    setStepError(""); // Clear error if they start selecting items
    const current = formData.menuSelections;
    const updated = current.includes(itemName)
      ? current.filter((i) => i !== itemName)
      : [...current, itemName];

    setFormData({ ...formData, menuSelections: updated });
  };

  // Feature: Submits the final validated form data to the Supabase 'bookings' table
  const handleSubmit = async () => {
    if (!userProfile) return;

    setIsSubmitting(true);
    setSubmitError("");

    const { error } = await supabase.from("bookings").insert([
      {
        user_id: userProfile.id,
        package_id: formData.packageId,
        event_date: formData.date,
        event_time: formData.time,
        event_location: `${formData.venueName} - ${formData.venueAddress}`,
        guest_count: parseInt(formData.guestCount) || 0,
        selected_menu_items: formData.menuSelections,
        status: "Pending",
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      alert("Booking submitted successfully! We will contact you soon.");
      navigate("/");
    }
  };

  // Feature: Groups the flat menu item data by their respective categories for organized UI rendering
  const groupedMenu = (menuOptions as Array<any>).reduce(
    (acc: Record<string, string[]>, item: any) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  if (loadingData) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <p className="text-gold-400 tracking-[0.2em] uppercase text-sm animate-pulse">
          Initializing Booking Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-10 pt-16 pb-12 text-center border-b border-white/10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-base tracking-wide font-bold mb-4 block italic"
        >
          Event Reservation
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif text-white uppercase italic"
        >
          Booking{" "}
          <span className="gold-text-gradient not-italic font-bold">Flow</span>
        </motion.h1>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-10 py-12">
        <div className="flex justify-between relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2 z-0" />
          {steps.map((step) => (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${
                  currentStep >= step.id
                    ? "bg-gold-400 border-gold-400 text-black"
                    : "bg-rich-black border-white/10 text-white/40"
                }`}
              >
                <step.icon size={16} strokeWidth={2.5} />
              </div>
              <span
                className={`text-sm tracking-wide mt-3 font-bold ${
                  currentStep >= step.id ? "text-gold-400" : "text-white/60"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-10 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 1: Package Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <div className="col-span-full mb-8">
                <h2 className="text-2xl font-serif mb-2">
                  Select Your Collection{" "}
                  <span className="text-red-400 text-lg">*</span>
                </h2>
                <p className="text-base text-white/80 font-semibold">
                  Choose the base package that fits your event scale.
                </p>
              </div>
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`p-8 glass-card border transition-all duration-300 text-left group flex flex-col relative hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold-400/20 ${
                    formData.packageId === pkg.id
                      ? "border-gold-400 bg-gold-400/5"
                      : "border-white/10 hover:border-gold-400/50"
                  }`}
                >
                  {pkg.tag && (
                    <div className="absolute top-4 left-4 z-10 bg-gold-400 text-black px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm">
                      {pkg.tag}
                    </div>
                  )}
                  <div className="flex-grow flex flex-col w-full">
                    <div className="flex justify-between items-start mb-4 gap-4 mt-2">
                      <h3 className="text-xl font-serif text-white uppercase tracking-wider">
                        {pkg.name}
                      </h3>
                      <span className="text-gold-400 font-serif text-lg shrink-0">
                        {pkg.price}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                      <span className="text-sm text-white/80 font-bold">
                        {pkg.pax} Guests
                      </span>
                    </div>

                    <div className="space-y-3 mb-10">
                      {(Array.isArray(pkg.inclusions) && pkg.inclusions.length
                        ? (pkg.inclusions as unknown as string[])
                        : ["Details available upon request"]
                      ).map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <Check
                            size={12}
                            className="text-gold-400 shrink-0 mt-1.5"
                          />
                          <span className="text-sm text-white/80 font-semibold leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Step 2: Event Details */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-card border border-white/10 p-10 md:p-16"
            >
              <div className="mb-12">
                <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide">
                  Event{" "}
                  <span className="italic gold-text-gradient">
                    Specifications
                  </span>
                </h2>
                <p className="text-base text-white/80 font-bold">
                  All fields are required to secure your date.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2 text-white">
                  <label className="text-base text-white/80 font-bold">
                    Event Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={minSelectableDate}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.date}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, date: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Guest Count <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.guestCount}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, guestCount: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Preferred Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.time}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, time: e.target.value });
                    }}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Venue Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Grand Ballroom, Private Residence..."
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.venueName}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, venueName: e.target.value });
                    }}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Venue Address <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    placeholder="Full street address..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none"
                    value={formData.venueAddress}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({
                        ...formData,
                        venueAddress: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Menu Customization */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="mb-12">
                <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide">
                  Menu{" "}
                  <span className="italic gold-text-gradient">Curation</span>
                </h2>
                <p className="text-base text-white/80 font-bold">
                  Select your preferred dishes from our active catalog.{" "}
                  <span className="text-red-400">(At least 1 required)</span>
                </p>
              </div>

              {(Object.entries(groupedMenu) as Array<[string, string[]]>).map(
                ([category, items]) => (
                  <div key={category} className="space-y-6">
                    <h3 className="text-xl tracking-wide text-gold-400 font-bold border-b border-gold-400/20 pb-4 italic">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <button
                          key={item}
                          onClick={() => handleMenuToggle(item)}
                          className={`p-5 glass-card border flex items-center justify-between transition-all group ${
                            formData.menuSelections.includes(item)
                              ? "border-gold-400 bg-gold-400/5"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <span className="text-base tracking-wide font-bold text-left">
                            {item}
                          </span>
                          <div
                            className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                              formData.menuSelections.includes(item)
                                ? "bg-gold-400 border-gold-400 text-black"
                                : "border-white/20 group-hover:border-gold-400"
                            }`}
                          >
                            {formData.menuSelections.includes(item) && (
                              <Check size={12} strokeWidth={4} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </motion.div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-serif mb-4 uppercase tracking-wide">
                  Review Your{" "}
                  <span className="italic gold-text-gradient">Request</span>
                </h2>
                <p className="text-lg text-white/80 tracking-wide font-bold">
                  Double check everything before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Event Summary Card */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="p-10 glass-card border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rotate-45 translate-x-16 -translate-y-16" />
                    <h3 className="text-xl tracking-wide text-gold-400 font-bold mb-10 italic">
                      1. Event Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                      <div className="flex gap-4">
                        <Package className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-sm tracking-wide text-white/70 font-bold mb-1">
                            Catering Package
                          </p>
                          <p className="text-lg font-serif tracking-wider">
                            {availablePackages.find(
                              (p) => p.id === formData.packageId,
                            )?.name || "Not Selected"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Calendar className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-sm tracking-wide text-white/70 font-bold mb-1">
                            Date & Time
                          </p>
                          <p className="text-lg font-serif tracking-wider">
                            {formData.date || "Not Set"} at{" "}
                            {formData.time || "No Time"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Users className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-sm tracking-wide text-white/70 font-bold mb-1">
                            Guest Count
                          </p>
                          <p className="text-lg font-serif tracking-wider">
                            {formData.guestCount || "0"} People
                          </p>
                        </div>
                      </div>
                      <div className="col-span-full flex gap-4 border-t border-white/5 pt-8">
                        <MapPin className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-sm tracking-wide text-white/70 font-bold mb-1">
                            Venue Details
                          </p>
                          <p className="text-lg font-serif tracking-wider mb-1">
                            {formData.venueName || "Private Venue"}
                          </p>
                          <p className="text-base text-white/80 tracking-wide leading-relaxed">
                            {formData.venueAddress || "Address not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="grid grid-cols-1 gap-8">
                    <div className="p-8 glass-card border border-white/10">
                      <h3 className="text-base tracking-wide text-gold-400 font-bold mb-8 italic">
                        Menu Selection
                      </h3>
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {formData.menuSelections.map((item) => (
                            <span
                              key={item}
                              className="text-base px-3 py-1 bg-white/5 border border-white/10 tracking-wide text-white/90 font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Profile Card */}
                <div className="space-y-8">
                  <div className="p-10 bg-gold-400 text-black border border-gold-400 shadow-[0_0_50px_rgba(197,160,89,0.15)] relative h-full">
                    <h3 className="text-lg tracking-wide font-bold mb-10 border-b border-black/10 pb-4 italic">
                      Client Details
                    </h3>
                    <div className="space-y-10">
                      <div>
                        <p className="text-sm tracking-wide font-bold mb-1 opacity-60">
                          Full Name
                        </p>
                        <p className="text-xl font-serif tracking-wider">
                          {userProfile?.name || "Client Name"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm tracking-wide font-bold mb-1 opacity-60">
                          Email Address
                        </p>
                        <p className="text-lg font-serif tracking-wider break-all">
                          {userProfile?.email || "Client Email"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm tracking-wide font-bold mb-1 opacity-60">
                          Account Status
                        </p>
                        <p className="text-xl font-serif tracking-widest">
                          {userProfile?.status || "Active"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-16 space-y-4 pt-10 border-t border-black/10">
                      <p className="text-base tracking-wide leading-relaxed font-bold opacity-70">
                        By submitting this request, you agree to our terms of
                        service and refined catering standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center pt-20">
                {submitError && (
                  <p className="text-red-400 mb-4 text-base tracking-wide font-medium">
                    {submitError}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.packageId}
                  className="gold-gradient text-black px-12 md:px-20 py-6 font-bold tracking-wide text-lg hover:brightness-110 transition-all shadow-[0_0_40px_rgba(197,160,89,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Processing..." : "Confirm & Submit Inquiry"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-20 flex flex-col items-center gap-6">
          {/* Feature: Displays validation errors to the user directly above the next button */}
          {stepError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-base tracking-wide font-bold bg-red-400/10 px-4 py-2 border border-red-400/20"
            >
              {stepError}
            </motion.p>
          )}

          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="flex items-center gap-3 text-lg tracking-wide font-bold text-white/80 hover:text-gold-400 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Previous
              </button>
            ) : (
              <div />
            )}{" "}
            {/* Empty div to keep Next button aligned right via justify-between */}
            {currentStep > 1 && currentStep < 4 && (
              <button
                onClick={handleNextStep}
                className="gold-gradient text-black px-12 py-4 font-bold tracking-wide text-lg hover:brightness-110 transition-all flex items-center gap-3"
              >
                Continue to Next{" "}
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
