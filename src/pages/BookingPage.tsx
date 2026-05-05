import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  PlusCircle,
  ClipboardCheck,
} from "lucide-react";
import { supabase } from "../utils/supabase";

interface FormData {
  packageId: string;
  eventType: string;
  date: string;
  time: string;
  guestCount: string;
  venueName: string;
  venueAddress: string;
  menuSelections: string[];
  additionalServices: string[];
}

const steps = [
  { id: 1, title: "Package", icon: Package },
  { id: 2, title: "Details", icon: Calendar },
  { id: 3, title: "Menu", icon: Utensils },
  { id: 4, title: "Services", icon: PlusCircle },
  { id: 5, title: "Review", icon: ClipboardCheck },
];

export default function BookingPage() {
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
  const [servicesOptions, setServicesOptions] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Feature: Main form data object holding all user selections
  const [formData, setFormData] = useState<FormData>({
    packageId: "",
    eventType: "",
    date: "",
    time: "",
    guestCount: "",
    venueName: "",
    venueAddress: "",
    menuSelections: [],
    additionalServices: [],
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
      const [pkgRes, menuRes, srvRes] = await Promise.all([
        supabase.from("packages").select("*").neq("status", "Archived"),
        supabase.from("menu_items").select("*").neq("status", "Archived"),
        supabase.from("add_ons").select("*").neq("status", "Archived"),
      ]);

      if (pkgRes.data) setAvailablePackages(pkgRes.data);
      if (menuRes.data) setMenuOptions(menuRes.data);
      if (srvRes.data) setServicesOptions(srvRes.data);

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
      // Enforce that all text inputs, dates, and numbers are filled out
      if (
        !formData.eventType.trim() ||
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
    // Step 4 (Services) is typically optional, so no strict validation blocks it here.

    setCurrentStep((prev) => Math.min(prev + 1, 5));
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

  // Feature: Toggles additional services on/off in the formData array
  const handleServiceToggle = (serviceName: string) => {
    const current = formData.additionalServices;
    const updated = current.includes(serviceName)
      ? current.filter((s) => s !== serviceName)
      : [...current, serviceName];
    setFormData({ ...formData, additionalServices: updated });
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
        selected_add_ons: formData.additionalServices,
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
  const groupedMenu = menuOptions.reduce(
    (acc, item) => {
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
          className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic"
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
                className={`text-[8px] uppercase tracking-widest mt-3 font-bold ${
                  currentStep >= step.id ? "text-gold-400" : "text-white/20"
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
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                  Choose the base package that fits your event scale.
                </p>
              </div>
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`p-8 glass-card border transition-all text-left group flex flex-col justify-between h-48 ${
                    formData.packageId === pkg.id
                      ? "border-gold-400 bg-gold-400/5"
                      : "border-white/10 hover:border-gold-400/50"
                  }`}
                >
                  <div>
                    <h3 className="text-xl font-serif text-white mb-2 uppercase tracking-wider">
                      {pkg.name}
                    </h3>
                    <span className="text-gold-400 font-serif text-lg">
                      {pkg.price}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <div
                      className={`p-2 border transition-all ${
                        formData.packageId === pkg.id
                          ? "bg-gold-400 text-black border-gold-400"
                          : "text-gold-400 border-gold-400/20 group-hover:bg-gold-400 group-hover:text-black"
                      }`}
                    >
                      <ChevronRight size={16} />
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
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  All fields are required to secure your date.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Event Type <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding, Gala, Birthday"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.eventType}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, eventType: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2 text-white">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Event Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.date}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, date: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Guest Count <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.guestCount}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, guestCount: e.target.value });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Preferred Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.time}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, time: e.target.value });
                    }}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Venue Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Grand Ballroom, Private Residence..."
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.venueName}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, venueName: e.target.value });
                    }}
                  />
                </div>
                <div className="col-span-full space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                    Venue Address <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    placeholder="Full street address..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-sm focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none"
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
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  Select your preferred dishes from our active catalog.{" "}
                  <span className="text-red-400">(At least 1 required)</span>
                </p>
              </div>

              {Object.entries(groupedMenu).map(([category, items]) => (
                <div key={category} className="space-y-6">
                  <h3 className="text-[12px] uppercase tracking-[0.4em] text-gold-400 font-bold border-b border-gold-400/20 pb-4 italic">
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
                        <span className="text-[10px] uppercase tracking-widest font-bold text-left">
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
              ))}
            </motion.div>
          )}

          {/* Step 4: Additional Services */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-16"
            >
              <div className="space-y-12 col-span-full lg:col-span-1">
                <div>
                  <h2 className="text-3xl font-serif mb-2 uppercase tracking-wide italic gold-text-gradient">
                    Additional Services
                  </h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                    Enhance your event experience (Optional).
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {servicesOptions.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceToggle(service.name)}
                      className={`p-6 glass-card border flex items-center justify-between transition-all group ${
                        formData.additionalServices.includes(service.name)
                          ? "border-gold-400 bg-gold-400/5"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.2em] font-bold block text-left">
                          {service.name}
                        </span>
                        <span className="text-[9px] text-gold-400 block text-left mt-1">
                          ₱{service.price}
                        </span>
                      </div>
                      <div
                        className={`w-6 h-6 border flex items-center justify-center transition-all ${
                          formData.additionalServices.includes(service.name)
                            ? "bg-gold-400 border-gold-400 text-black"
                            : "border-white/20 group-hover:border-gold-400"
                        }`}
                      >
                        {formData.additionalServices.includes(service.name) && (
                          <Check size={14} strokeWidth={4} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
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
                <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] font-bold">
                  Double check everything before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Event Summary Card */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="p-10 glass-card border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rotate-45 translate-x-16 -translate-y-16" />
                    <h3 className="text-[12px] uppercase tracking-[0.4em] text-gold-400 font-bold mb-10 italic">
                      1. Event Overview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                      <div className="flex gap-4">
                        <Package className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">
                            Catering Package
                          </p>
                          <p className="text-sm font-serif uppercase tracking-wider">
                            {availablePackages.find(
                              (p) => p.id === formData.packageId,
                            )?.name || "Not Selected"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Info className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">
                            Event Type
                          </p>
                          <p className="text-sm font-serif uppercase tracking-wider">
                            {formData.eventType || "Not Specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Calendar
                          className="text-gold-400 shrink-0"
                          size={18}
                        />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">
                            Date & Time
                          </p>
                          <p className="text-sm font-serif uppercase tracking-wider">
                            {formData.date || "Not Set"} at{" "}
                            {formData.time || "No Time"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Users className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">
                            Guest Count
                          </p>
                          <p className="text-sm font-serif uppercase tracking-wider">
                            {formData.guestCount || "0"} People
                          </p>
                        </div>
                      </div>
                      <div className="col-span-full flex gap-4 border-t border-white/5 pt-8">
                        <MapPin className="text-gold-400 shrink-0" size={18} />
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-white/30 font-bold mb-1">
                            Venue Details
                          </p>
                          <p className="text-sm font-serif uppercase tracking-wider mb-1">
                            {formData.venueName || "Private Venue"}
                          </p>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
                            {formData.venueAddress || "Address not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu & Services */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 glass-card border border-white/10">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-bold mb-8 italic">
                        Menu Selection
                      </h3>
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {formData.menuSelections.map((item) => (
                            <span
                              key={item}
                              className="text-[9px] px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-white/60 font-semibold"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-8 glass-card border border-white/10">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-bold mb-8 italic">
                        Add-on Services
                      </h3>
                      <div className="space-y-4">
                        {formData.additionalServices.length > 0 ? (
                          formData.additionalServices.map((service) => (
                            <div
                              key={service}
                              className="flex items-center gap-3"
                            >
                              <div className="w-1.5 h-1.5 bg-gold-400 rotate-45" />
                              <span className="text-[10px] uppercase tracking-widest text-white/80 font-bold">
                                {service}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                            No extra services selected.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Profile Card */}
                <div className="space-y-8">
                  <div className="p-10 bg-gold-400 text-black border border-gold-400 shadow-[0_0_50px_rgba(197,160,89,0.15)] relative h-full">
                    <h3 className="text-[11px] uppercase tracking-[0.4em] font-bold mb-10 border-b border-black/10 pb-4 italic">
                      Client Details
                    </h3>
                    <div className="space-y-10">
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">
                          Full Name
                        </p>
                        <p className="text-xl font-serif uppercase tracking-wider">
                          {userProfile?.name || "Client Name"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">
                          Email Address
                        </p>
                        <p className="text-sm font-serif uppercase tracking-wider break-all">
                          {userProfile?.email || "Client Email"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest font-bold mb-1 opacity-60">
                          Account Status
                        </p>
                        <p className="text-lg font-serif tracking-widest">
                          {userProfile?.status || "Active"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-16 space-y-4 pt-10 border-t border-black/10">
                      <p className="text-[9px] uppercase tracking-[0.2em] leading-relaxed font-bold opacity-70">
                        By submitting this request, you agree to our terms of
                        service and refined catering standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center pt-20">
                {submitError && (
                  <p className="text-red-400 mb-4 text-xs tracking-widest uppercase">
                    {submitError}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.packageId}
                  className="gold-gradient text-black px-12 md:px-20 py-6 font-bold tracking-[0.4em] uppercase text-xs hover:brightness-110 transition-all shadow-[0_0_40px_rgba(197,160,89,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-red-400 text-[10px] uppercase tracking-widest font-bold bg-red-400/10 px-4 py-2 border border-red-400/20"
            >
              {stepError}
            </motion.p>
          )}

          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] font-bold text-white/40 hover:text-gold-400 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Previous
              </button>
            ) : (
              <div />
            )}{" "}
            {/* Empty div to keep Next button aligned right via justify-between */}
            {currentStep < 5 && (
              <button
                onClick={handleNextStep}
                className="gold-gradient text-black px-12 py-4 font-bold tracking-[0.3em] uppercase text-[10px] hover:brightness-110 transition-all flex items-center gap-3"
              >
                Continue to Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
