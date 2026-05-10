import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
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

type Limit = { min: number; max: number };
type PackageRules = Record<string, Limit>;

// Rules defined based on your catering specifications
const packageLimits: Record<string, PackageRules> = {
  basic: {
    "Appetizer": { min: 1, max: 1 },
    "Soup": { min: 1, max: 1 },
    "Main Course": { min: 3, max: 4 },
    "Pasta": { min: 1, max: 1 },
    "Vegetable": { min: 1, max: 1 },
    "Rice": { min: 1, max: 1 },
    "Dessert": { min: 1, max: 1 },
    "Drinks": { min: 2, max: 2 },
  },
  classic: {
    "Appetizer": { min: 2, max: 2 },
    "Soup": { min: 1, max: 1 },
    "Main Course": { min: 4, max: 5 },
    "Pasta": { min: 2, max: 2 },
    "Vegetable": { min: 1, max: 2 },
    "Rice": { min: 1, max: 1 },
    "Dessert": { min: 2, max: 2 },
    "Drinks": { min: 2, max: 3 },
  },
  premium: {
    "Appetizer": { min: 2, max: 3 },
    "Soup": { min: 1, max: 2 },
    "Main Course": { min: 5, max: 6 },
    "Pasta": { min: 3, max: 3 },
    "Vegetable": { min: 2, max: 2 },
    "Rice": { min: 1, max: 1 },
    "Dessert": { min: 3, max: 3 },
    "Drinks": { min: 3, max: 4 },
  },
};

// Helper to normalize raw database categories into our standard limit rules
const getRuleCategory = (dbCategory: string, itemName: string = "") => {
  const cat = (dbCategory || "").toLowerCase();
  const name = (itemName || "").toLowerCase();

  // Smart overrides based on item name to rescue items lumped into combined categories
  if (name.includes("soup") || name.includes("broth") || name.includes("chowder") || name.includes("sinigang") || name.includes("nilaga") || name.includes("mami") || name.includes("sopas") || name.includes("tinola") || name.includes("lomi")) return "Soup";
  if (name.includes("vegetable") || name.includes("veggie") || name.includes("salad") || name.includes("chopsuey") || name.includes("pinakbet") || name.includes("pakbet") || name.includes("kangkong") || name.includes("laing")) return "Vegetable";
  if (name.includes("pasta") || name.includes("noodle") || name.includes("spaghetti") || name.includes("carbonara") || name.includes("pancit") || name.includes("palabok") || name.includes("bihon") || name.includes("sotanghon") || name.includes("canton") || name.includes("macaroni")) return "Pasta";
  if (name.includes("rice")) return "Rice";

  if (cat.includes("appetizer")) return "Appetizer";
  if (cat.includes("soup")) return "Soup";
  if (cat.includes("pasta") || cat.includes("noodle")) return "Pasta";
  if (cat.includes("vegetable") || cat.includes("veggie")) return "Vegetable";
  if (cat.includes("rice")) return "Rice";
  if (cat.includes("dessert") || cat.includes("sweet")) return "Dessert";
  if (cat.includes("drink") || cat.includes("beverage")) return "Drinks";
  return "Main Course"; // Treats Beef, Pork, Chicken, Seafood, etc. as Main Course
};

const getPackageRules = (pkgName: string): PackageRules | null => {
  const name = (pkgName || "").toLowerCase();
  if (name.includes("premium")) return packageLimits.premium;
  if (name.includes("classic")) return packageLimits.classic;
  if (name.includes("basic") || name.includes("wedding")) return packageLimits.basic;
  return null;
};

// Helper function to parse both 24-hour and 12-hour time strings into comparable numbers
const parseTime = (timeStr: string) => {
  if (!timeStr) return 0;

  // Handle 24-hour format from database (e.g. "15:00:00")
  if (!timeStr.toUpperCase().includes("AM") && !timeStr.toUpperCase().includes("PM")) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours + (minutes || 0) / 60;
  }

  // Handle 12-hour format from dropdown (e.g. "03:00 PM")
  const parts = timeStr.split(" ");
  if (parts.length !== 2) return 0;
  const [time, period] = parts;
  let [hours, minutes] = time.split(":").map(Number);
  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
  return hours + (minutes || 0) / 60;
};

const steps = [
  { id: 1, title: "Package", icon: Package },
  { id: 2, title: "Details", icon: Calendar },
  { id: 3, title: "Menu", icon: Utensils },
  { id: 4, title: "Review", icon: ClipboardCheck },
];

const categoryOrder = [
  "Appetizer",
  "Soup",
  "Main Course",
  "Pasta",
  "Vegetable",
  "Rice",
  "Dessert",
  "Drinks"
];

export default function BookingPage() {
  // Feature: Minimum selectable date (2 days from today to allow 1 day prep)
  const minSelectableDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Feature: State to hold validation error messages for the current step
  const [stepError, setStepError] = useState("");

  // Database States
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [menuOptions, setMenuOptions] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [inclusionCategories, setInclusionCategories] = useState<Record<string, string[]>>({});

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
      const [pkgRes, menuRes, bookingsRes, incRes] = await Promise.all([
        supabase
          .from("packages")
          .select("*")
          .neq("status", "Archived")
          .neq("status", "none")
          .neq("status", "None"),
        supabase.from("menu_items").select("*").neq("status", "Archived"),
        // Fetch all existing bookings with their times to check for conflicts
        supabase.from("bookings").select("event_date, event_time, status"),
        supabase.from("inclusions").select("*"),
      ]);

      if (pkgRes.data) setAvailablePackages(pkgRes.data);
      if (menuRes.data) setMenuOptions(menuRes.data);
      if (bookingsRes.data) {
        // Keep only active bookings to calculate gaps against
        const validBookings = bookingsRes.data.filter(
          (b: any) => !["Cancelled", "Rejected", "Declined"].includes(b.status)
        );
        setExistingBookings(validBookings);

        const fullyBooked: string[] = [];
        const uniqueDates = [...new Set(validBookings.map((b: any) => b.event_date))];
        const allSlots = [
          "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
          "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
          "06:00 PM", "07:00 PM", "08:00 PM"
        ];

        // Mark a date fully booked if there are 2 or more events, OR if no timeslot has a 5-hour gap from existing events
        uniqueDates.forEach((date) => {
          const dayBookings = validBookings.filter((b: any) => b.event_date === date);

          if (dayBookings.length >= 2) {
            fullyBooked.push(date as string);
            return;
          }

          const hasAvailableSlot = allSlots.some((slot) => {
            const slotVal = parseTime(slot);
            return !dayBookings.some((b: any) => Math.abs(slotVal - parseTime(b.event_time)) < 5);
          });
          if (!hasAvailableSlot) fullyBooked.push(date as string);
        });
        setBookedDates(fullyBooked);
      }
      if (incRes.data) {
        const grouped: Record<string, string[]> = {};
        incRes.data.forEach((row: any) => {
          if (!grouped[row.category]) grouped[row.category] = [];
          if (row.items && row.items.trim() !== "" && row.items !== "-") {
            if (!grouped[row.category].includes(row.items)) {
              grouped[row.category].push(row.items);
            }
          }
        });
        setInclusionCategories(grouped);
      }

      setLoadingData(false);
    };

    fetchBookingData();

    // Fallback polling: Refresh packages and inclusions silently every 10 seconds to ensure updates sync even if Realtime is disabled
    const intervalId = setInterval(() => {
      supabase
        .from("packages")
        .select("*")
        .neq("status", "Archived")
        .neq("status", "none")
        .neq("status", "None")
        .then(({ data }) => {
          if (data) setAvailablePackages(data);
        });

      supabase.from("menu_items").select("*").neq("status", "Archived").then(({ data }) => {
        if (data) setMenuOptions(data);
      });

      supabase.from("inclusions").select("*").then(({ data }) => {
        if (data) {
          const grouped: Record<string, string[]> = {};
          data.forEach((row: any) => {
            if (!grouped[row.category]) grouped[row.category] = [];
            if (row.items && row.items.trim() !== "" && row.items !== "-") {
              if (!grouped[row.category].includes(row.items)) {
                grouped[row.category].push(row.items);
              }
            }
          });
          setInclusionCategories(grouped);
        }
      });
    }, 10000);

    // Feature: Keep packages updated in real-time during the booking flow
    const channel = supabase
      .channel("packages-changes-booking")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        supabase
          .from("packages")
          .select("*")
          .neq("status", "Archived")
          .neq("status", "none")
          .neq("status", "None")
          .then(({ data }) => {
            if (data) setAvailablePackages(data);
          });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        supabase.from("menu_items").select("*").neq("status", "Archived").then(({ data }) => {
          if (data) setMenuOptions(data);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inclusions" }, () => {
        supabase.from("inclusions").select("*").then(({ data }) => {
          if (data) {
            const grouped: Record<string, string[]> = {};
            data.forEach((row: any) => {
              if (!grouped[row.category]) grouped[row.category] = [];
              if (row.items && row.items.trim() !== "" && row.items !== "-") {
                if (!grouped[row.category].includes(row.items)) {
                  grouped[row.category].push(row.items);
                }
              }
            });
            setInclusionCategories(grouped);
          }
        });
      })
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
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
      if (bookedDates.includes(formData.date)) {
        setStepError(`The date ${formData.date} is already fully booked. Please select another date.`);
        return;
      }

      // Double-check the 5-hour gap constraint
      if (formData.date && formData.time) {
        const dayBookings = existingBookings.filter((b) => b.event_date === formData.date);
        
        if (dayBookings.length >= 2) {
          setStepError(`The date ${formData.date} already has the maximum number of events (2) scheduled. Please select another date.`);
          return;
        }
        
        const slotVal = parseTime(formData.time);
        const conflict = dayBookings.some((b) => Math.abs(slotVal - parseTime(b.event_time)) < 5);
        if (conflict) {
          setStepError("The selected time is too close to an already scheduled event. Please leave at least a 5-hour gap.");
          return;
        }
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

      // Validate that guest count is within 10 and 500
      const guestCountNum = parseInt(formData.guestCount);
      if (isNaN(guestCountNum) || guestCountNum < 10 || guestCountNum > 500) {
        setStepError("Guest count must be between 10 and 500.");
        return;
      }
    } else if (currentStep === 3) {
      if (activeMenuRules) {
        // Enforce the specific package rules using our ordered category array,
        // but gracefully lower the minimum requirement if items are unavailable.
        for (const cat of categoryOrder) {
          if (!activeMenuRules[cat]) continue;
          
          const availableItemsInCat = (groupedMenu[cat] || []).filter(itemName => {
             const opt = menuOptions.find(o => o.name === itemName);
             return opt && opt.status !== "Not Available" && opt.status !== "Archived";
          });

          const limit = activeMenuRules[cat];
          const dynamicMin = Math.min(limit.min, availableItemsInCat.length);
          const count = currentMenuCounts[cat] || 0;
          
          if (count < dynamicMin) {
            setStepError(`Please select at least ${dynamicMin} item(s) for ${cat}.`);
            return;
          }
        }
      } else {
        // Fallback for custom packages without defined rules
        const hasAvailableItems = menuOptions.some(o => o.status !== "Not Available" && o.status !== "Archived");
        if (formData.menuSelections.length === 0 && hasAvailableItems) {
          setStepError("Please select at least one menu item for your event.");
          return;
        }
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
    // Reset menu selections if they change packages so old limits don't break validation
    if (formData.packageId !== id) {
      setFormData({ ...formData, packageId: id, menuSelections: [] });
    }
    setCurrentStep(2);
  };

  // Feature: Toggles menu items on/off in the formData array
  const handleMenuToggle = (itemName: string) => {
    setStepError(""); // Clear error if they start selecting items
    const current = formData.menuSelections;
    const isSelected = current.includes(itemName);

    const item = menuOptions.find((opt) => opt.name === itemName);
    if (!item) return;

    const ruleCat = getRuleCategory(item.category, item.name);

    // If trying to add an item, make sure we aren't exceeding the max allowance
    if (!isSelected && activeMenuRules && activeMenuRules[ruleCat]) {
      const currentCount = currentMenuCounts[ruleCat] || 0;
      if (currentCount >= activeMenuRules[ruleCat].max) {
        setStepError(`You can only select up to ${activeMenuRules[ruleCat].max} item(s) for ${ruleCat}.`);
        return;
      }
    }

    const updated = isSelected
      ? current.filter((i) => i !== itemName)
      : [...current, itemName];

    setFormData({ ...formData, menuSelections: updated });
  };

  // Feature: Submits the final validated form data to the Supabase 'bookings' table
  const handleSubmit = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSubmitError("You must be logged in to submit a booking.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    // Feature: Clean up any selected menu items that were archived or made unavailable before submission
    const validSelections = formData.menuSelections.filter(itemName => {
      const opt = menuOptions.find(o => o.name === itemName);
      return opt && opt.status !== "Not Available";
    });

    const { error } = await supabase.from("bookings").insert([
      {
        user_id: authData.user.id,
        package_id: formData.packageId,
        event_date: formData.date,
        event_time: formData.time,
        event_location: `${formData.venueName} - ${formData.venueAddress}`,
        guest_count: parseInt(formData.guestCount) || 0,
        selected_menu_items: validSelections,
        status: "Pending",
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      setShowSuccessModal(true);
    }
  };

  // Derived variables dynamically calculated from the user's selected package
  const selectedPkgForMenu = availablePackages.find((p) => p.id === formData.packageId);
  const activeMenuRules = selectedPkgForMenu ? getPackageRules(selectedPkgForMenu.name) : null;

  const currentMenuCounts: Record<string, number> = {};
  formData.menuSelections.forEach((itemName) => {
    const opt = menuOptions.find((o) => o.name === itemName);
    if (opt) {
      const ruleCat = getRuleCategory(opt.category, opt.name);
      currentMenuCounts[ruleCat] = (currentMenuCounts[ruleCat] || 0) + 1;
    }
  });

  // Feature: Groups the flat menu item data by their respective categories for organized UI rendering
  const groupedMenu = (menuOptions as Array<any>).reduce(
    (acc: Record<string, string[]>, item: any) => {
      const ruleCat = getRuleCategory(item.category, item.name);
      if (!acc[ruleCat]) acc[ruleCat] = [];
      acc[ruleCat].push(item.name);
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
                  {pkg.tag && pkg.tag.toLowerCase() !== "none" && (
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

                    <div className="space-y-4 mb-10">
                      {(() => {
                        const allCategorizedItems = Object.values(inclusionCategories).flat();
                        const pkgInclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
                        
                        const renderGroups: React.ReactNode[] = [];
                        Object.entries(inclusionCategories).forEach(([cat, items]) => {
                          const selected = pkgInclusions.filter((inc: string) => items.includes(inc));
                          if (selected.length > 0) {
                            renderGroups.push(
                              <div key={cat} className="space-y-2">
                                <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-1">
                                  {cat}
                                </h4>
                                <div className="space-y-2">
                                  {selected.map((feature: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3">
                                      <Check size={12} className="text-gold-400 shrink-0 mt-1.5" />
                                      <span className="text-sm text-white/80 font-semibold leading-relaxed">
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        });

                        const uncategorized = pkgInclusions.filter((inc: string) => !allCategorizedItems.includes(inc));
                        if (uncategorized.length > 0) {
                          renderGroups.push(
                            <div key="Other" className="space-y-2">
                              <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-1">
                                Other
                              </h4>
                              <div className="space-y-2">
                                {uncategorized.map((feature: string, i: number) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <Check size={12} className="text-gold-400 shrink-0 mt-1.5" />
                                    <span className="text-sm text-white/80 font-semibold leading-relaxed">
                                      {feature}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }

                        return renderGroups;
                      })()}
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
                      const selectedDate = e.target.value;
                      if (bookedDates.includes(selectedDate)) {
                        setStepError(`The date ${selectedDate} is already fully booked. Please select another date.`);
                        setFormData({ ...formData, date: "", time: "" });
                      } else {
                        setStepError("");
                        setFormData({ ...formData, date: selectedDate, time: "" });
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Guest Count <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="e.g. 50"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.guestCount}
                    onChange={(e) => {
                      setStepError("");
                      const val = e.target.value;
                      if (val === "" || parseInt(val) >= 0) {
                        setFormData({ ...formData, guestCount: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "." || e.key === "e") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Preferred Time <span className="text-red-400">*</span>
                  </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium [color-scheme:dark]"
                    value={formData.time}
                    onChange={(e) => {
                      setStepError("");
                      setFormData({ ...formData, time: e.target.value });
                    }}
                  >
                    <option value="" disabled>Select a timeslot</option>
                    {[
                      "08:00 AM",
                      "09:00 AM",
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "01:00 PM",
                      "02:00 PM",
                      "03:00 PM",
                      "04:00 PM",
                      "05:00 PM",
                      "06:00 PM",
                      "07:00 PM",
                      "08:00 PM",
                    ].map((slot) => {
                      // Dynamically disable timeslots if they are within 5 hours of an existing booking on the same day
                      const dayBookings = existingBookings.filter((b) => b.event_date === formData.date);
                      const slotVal = parseTime(slot);
                      const isDisabled = dayBookings.some((b) => Math.abs(slotVal - parseTime(b.event_time)) < 5);
                      const isExactMatch = dayBookings.some((b) => parseTime(b.event_time) === slotVal);

                      return (
                        <option key={slot} value={slot} disabled={isDisabled} className={`bg-[#0f0f0f] ${isDisabled ? "text-white/20" : "text-white"}`}>
                          {slot} {isExactMatch ? "(Timeslot already taken)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={20} />
                </div>
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
                  {activeMenuRules 
                    ? "Select your preferred dishes to fulfill your package inclusions." 
                    : "Select your preferred dishes from our active catalog."}
                </p>
              </div>

          {categoryOrder.map(
            (category) => {
              const items = groupedMenu[category];
              if (!items || items.length === 0) return null;
                  const limit = activeMenuRules ? activeMenuRules[category] : null;
                  const availableItemsInCat = items.filter(itemName => {
                     const opt = menuOptions.find(o => o.name === itemName);
                     return opt && opt.status !== "Not Available" && opt.status !== "Archived";
                  });
                  const dynamicMin = limit ? Math.min(limit.min, availableItemsInCat.length) : 0;
                  const currentCount = currentMenuCounts[category] || 0;
                  const isFulfilled = limit ? currentCount >= dynamicMin && currentCount <= limit.max : currentCount > 0;

                  return (
                  <div key={category} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gold-400/20 pb-4">
                      <h3 className="text-xl tracking-wide text-gold-400 font-bold italic">
                        {category}
                      </h3>
                      {limit && (
                        <span className={`text-xs font-bold tracking-widest uppercase px-3 py-1 border ${isFulfilled ? "bg-gold-400/10 border-gold-400/30 text-gold-400" : "bg-white/5 border-white/10 text-white/50"}`}>
                          {currentCount} / {limit.max} Selected {dynamicMin !== limit.max && dynamicMin > 0 ? `(Min ${dynamicMin})` : ""}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item) => {
                        const opt = menuOptions.find((o) => o.name === item);
                        const isUnavailable = opt?.status === "Not Available";
                        const isSelected = formData.menuSelections.includes(item);
                        
                        return (
                          <button
                            key={item}
                            onClick={() => !isUnavailable && handleMenuToggle(item)}
                            disabled={isUnavailable}
                            className={`p-5 glass-card border flex flex-col justify-center transition-all group ${
                              isUnavailable 
                                ? "opacity-50 cursor-not-allowed border-white/5 bg-white/5"
                                : isSelected
                                  ? "border-gold-400 bg-gold-400/5"
                                  : "border-white/10 hover:border-white/30"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-base tracking-wide font-bold text-left">
                                {item}
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
                              <span className="text-[10px] text-red-400 uppercase tracking-widest mt-2 font-bold text-left">
                                Not Available
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  );
                }
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
                        {categoryOrder.map((cat) => {
                          const itemsInCat = formData.menuSelections.filter((itemName) => {
                            const opt = menuOptions.find((o) => o.name === itemName);
                            if (!opt || opt.status === "Not Available") return false;
                            return getRuleCategory(opt.category, opt.name) === cat;
                          });

                          if (itemsInCat.length === 0) return null;

                          return (
                            <div key={cat} className="space-y-3">
                              <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest border-b border-white/10 pb-2">
                                {cat}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {itemsInCat.map((item) => (
                                  <span
                                    key={item}
                                    className="text-sm px-3 py-1.5 bg-white/5 border border-white/10 tracking-wide text-white/90 font-semibold"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {formData.menuSelections.filter((itemName) => {
                          const opt = menuOptions.find(o => o.name === itemName);
                          return opt && opt.status !== "Not Available";
                        }).length === 0 && (
                          <p className="text-sm text-white/50 italic">No menu items selected.</p>
                        )}
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

      {/* Success Confirmation Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card border border-white/10 p-10 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-400" />
              <div className="w-20 h-20 bg-gold-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-gold-400" size={40} strokeWidth={3} />
              </div>
              <h3 className="text-3xl font-serif text-white mb-4 italic">Booking <span className="gold-text-gradient">Confirmed</span></h3>
              <p className="text-base text-white/60 mb-8 font-medium leading-relaxed">
                Thank you for choosing us for your special event. We have received your request and will contact you shortly to finalize the details.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full py-4 gold-gradient text-black font-bold tracking-wide text-base hover:brightness-110 transition-all"
              >
                Return to Home
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}