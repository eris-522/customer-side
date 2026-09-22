import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  CreditCard,
  FileText,
  QrCode,
  UploadCloud,
  Copy,
  CheckCircle,
  Smartphone,
  Building2,
  X,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Search,
  Wine,
  Clock,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { CATERING_CONTRACT_TERMS } from "../data/cateringContractTerms";

// Client-side image compression helper to ensure receipts upload quickly and reliably
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

interface FormData {
  packageId: string;
  date: string;
  time: string;
  guestCount: string;
  additionalPax: string;
  venueName: string;
  venueAddress: string;
  foodAllergies: string;
  menuSelections: string[];
}

type Limit = { min: number; max: number };
type PackageRules = Record<string, Limit>;

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

// Helper to extract package rules from the database JSON
const getActiveMenuRules = (pkg: any): PackageRules | null => {
  if (!pkg) return null;
  if (pkg.category_limits && Object.keys(pkg.category_limits).length > 0) {
    const limits = pkg.category_limits;
    const rules: PackageRules = {};
    let hasRules = false;
    
    const allCats = ["Appetizer", "Soup", "Main Course", "Pasta", "Vegetable", "Rice", "Dessert", "Drinks"];
    for (const cat of allCats) {
      const maxVal = limits[cat] !== undefined ? Number(limits[cat]) : 0;
      rules[cat] = { min: maxVal, max: maxVal };
      if (maxVal > 0) hasRules = true;
    }
    
    if (hasRules) return rules;
  }
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
  // Feature: Maximum selectable date (End of the year, 2 years from today)
  const maxSelectableDate = (() => {
    const d = new Date();
    const yyyy = d.getFullYear() + 2;
    return `${yyyy}-12-31`;
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

  // Feature: Terms of Service Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsModalCategory, setTermsModalCategory] = useState<string>("all");
  const [termsModalSearch, setTermsModalSearch] = useState<string>("");

  // Feature: Downpayment & Payment Scheme Screen State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentScheme, setPaymentScheme] = useState<"Standard 50%" | "Installment 20%">("Standard 50%");
  const [paymentMethod, setPaymentMethod] = useState<"GCash" | "Bank Transfer">("GCash");
  const [receiptImage, setReceiptImage] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [copiedAccount, setCopiedAccount] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (stepError || submitError) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stepError, submitError]);

  // Feature: Scroll to the top of the page whenever the user navigates to a new step
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

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
    additionalPax: "",
    venueName: "",
    venueAddress: "",
    foodAllergies: "",
    menuSelections: [],
  });

  // Derived variables dynamically calculated from the user's selected package
  const selectedPkgForMenu = availablePackages.find((p) => p.id === formData.packageId);
  const activeMenuRules = getActiveMenuRules(selectedPkgForMenu);
  const maxGuests = selectedPkgForMenu?.pax 
    ? Math.max(...(selectedPkgForMenu.pax.match(/\d+/g) || ['500']).map((n: string) => parseInt(n, 10))) 
    : 500;

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

      // Secondary security check: force logout if user was archived while they had an active session
      if (profile?.status === "Archived") {
        await supabase.auth.signOut();
        navigate("/auth");
        return;
      }

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

      if (pkgRes.data) {
        const sortedPackages = pkgRes.data.sort((a: any, b: any) => {
          const priceA = parseFloat(String(a.price || "0").replace(/[^0-9.-]+/g, ""));
          const priceB = parseFloat(String(b.price || "0").replace(/[^0-9.-]+/g, ""));
          return priceA - priceB;
        });
        setAvailablePackages(sortedPackages);
      }
      if (menuRes.data) setMenuOptions(menuRes.data);
      if (bookingsRes.data) {
        // Keep only active bookings to calculate gaps against
        const validBookings = bookingsRes.data.filter(
          (b: any) => !["Cancelled", "Rejected", "Declined", "Archived"].includes(b.status)
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
          if (data) {
            const sortedPackages = data.sort((a: any, b: any) => {
              const priceA = parseFloat(String(a.price || "0").replace(/[^0-9.-]+/g, ""));
              const priceB = parseFloat(String(b.price || "0").replace(/[^0-9.-]+/g, ""));
              return priceA - priceB;
            });
            setAvailablePackages(sortedPackages);
          }
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
            if (data) {
              const sortedPackages = data.sort((a: any, b: any) => {
                const priceA = parseFloat(String(a.price || "0").replace(/[^0-9.-]+/g, ""));
                const priceB = parseFloat(String(b.price || "0").replace(/[^0-9.-]+/g, ""));
                return priceA - priceB;
              });
              setAvailablePackages(sortedPackages);
            }
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
      if (formData.date && formData.date > maxSelectableDate) {
        const maxYear = new Date().getFullYear() + 2;
        setStepError(`Event Date cannot be beyond the end of ${maxYear} (${maxSelectableDate}).`);
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

      // Validate that guest count is within limits
      const guestCountNum = parseInt(formData.guestCount);
      if (isNaN(guestCountNum) || guestCountNum < 10 || guestCountNum > maxGuests) {
        setStepError(`Guest count must be between 10 and ${maxGuests} for this package.`);
        return;
      }
    } else if (currentStep === 3) {
      if (activeMenuRules) {
        // Enforce the specific package rules using our ordered category array,
        // but gracefully lower the minimum requirement if items are unavailable.
        for (const cat of categoryOrder) {
          if (!activeMenuRules[cat]) continue;
          if (activeMenuRules[cat].max === 0) continue;
          
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

  // Helper to calculate monthly installment breakdown for the 20% scheme
  const calculateInstallmentMilestones = (eventDateStr: string, totalRemaining: number) => {
    if (!eventDateStr || totalRemaining <= 0) return [];
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return [];
    const now = new Date();

    // Final balance deadline is strictly 15 days before event date
    const finalDeadline = new Date(eventDate.getTime() - 15 * 24 * 60 * 60 * 1000);
    const diffMonths = (finalDeadline.getFullYear() - now.getFullYear()) * 12 + (finalDeadline.getMonth() - now.getMonth());

    if (diffMonths <= 1) {
      return [
        {
          title: "Final 15-Day Balance Settlement",
          dueDate: `${finalDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (Strictly 15 days before event)`,
          amount: totalRemaining,
          status: "Upcoming",
        },
      ];
    }

    const numInstallments = Math.min(Math.max(diffMonths, 2), 6);
    const amountPerMilestone = Math.floor(totalRemaining / numInstallments);
    const milestones = [];
    let accumulated = 0;

    for (let i = 1; i <= numInstallments; i++) {
      const isLast = i === numInstallments;
      const milestoneAmount = isLast ? totalRemaining - accumulated : amountPerMilestone;
      accumulated += milestoneAmount;

      let dueDateText = "";
      if (isLast) {
        dueDateText = `${finalDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (Strictly 15 days before event)`;
      } else {
        const mDate = new Date(now.getFullYear(), now.getMonth() + i, 15);
        dueDateText = mDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }

      milestones.push({
        title: isLast ? "Final Balance (15 Days Prior)" : `Installment #${i}`,
        dueDate: dueDateText,
        amount: milestoneAmount,
        status: "Upcoming",
      });
    }
    return milestones;
  };

  // Feature: Calculations for total budget, downpayment schemes (50% vs 20%), and remaining balance
  const selectedPkgForPayment = availablePackages.find((p) => p.id === formData.packageId);
  const basePriceCalc = selectedPkgForPayment && selectedPkgForPayment.price ? parseFloat(String(selectedPkgForPayment.price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
  const addPriceCalc = selectedPkgForPayment && selectedPkgForPayment.additional_pax_price ? parseFloat(String(selectedPkgForPayment.additional_pax_price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
  const extraPaxCalc = parseInt(formData.additionalPax) || 0;
  const calculatedTotalBudget = basePriceCalc + (addPriceCalc * extraPaxCalc);
  const downpaymentPercentage = paymentScheme === "Standard 50%" ? 0.50 : 0.20;
  const calculatedDownpayment = Math.round(calculatedTotalBudget * downpaymentPercentage);
  const calculatedRemainingBalance = calculatedTotalBudget - calculatedDownpayment;
  const installmentMilestones = calculateInstallmentMilestones(formData.date, calculatedRemainingBalance);

  // Feature: Opens Terms of Service modal before payment
  const handleInitiateBooking = () => {
    setSubmitError("");
    setStepError("");
    setShowTermsModal(true);
  };

  // Feature: Accepts Terms and advances to the Downpayment Screen
  const handleAcceptTerms = () => {
    if (!termsAgreed) {
      setPaymentError("You must agree to the Terms of Service to continue.");
      return;
    }
    setShowTermsModal(false);
    setShowPaymentModal(true);
    setPaymentError("");
  };

  // Feature: Handles receipt upload with client-side image compression
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPaymentError("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }

    try {
      setPaymentError("");
      const compressed = await compressImage(file);
      setReceiptImage(compressed);
      setReceiptFileName(file.name);
    } catch (err) {
      console.error("Receipt compression error:", err);
      setPaymentError("Failed to process image. Please try another image file.");
    }
  };

  // Feature: Submits the final validated form data along with deposit proof to Supabase
  const handleSubmitPayment = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setPaymentError("You must be logged in to submit a booking.");
      return;
    }

    if (!receiptImage) {
      setPaymentError("Please upload your receipt or transfer slip as proof of downpayment.");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError("");

    // Clean up any selected menu items that were archived or made unavailable before submission
    const validSelections = formData.menuSelections.filter(itemName => {
      const opt = menuOptions.find(o => o.name === itemName);
      return opt && opt.status !== "Not Available";
    });

    // Primary payload attempting direct column insert
    const primaryPayload: Record<string, any> = {
      user_id: authData.user.id,
      package_id: formData.packageId,
      event_date: formData.date,
      event_time: formData.time,
      event_location: `${formData.venueName} - ${formData.venueAddress}`,
      guest_count: parseInt(formData.guestCount) || 0,
      additional_pax: parseInt(formData.additionalPax) || 0,
      food_allergies: formData.foodAllergies.trim(),
      selected_menu_items: validSelections,
      status: "Pending",
      payment_method: paymentMethod,
      payment_scheme: paymentScheme,
      downpayment_amount: calculatedDownpayment,
      payment_status: "Pending Verification",
      receipt_url: receiptImage,
      reference_number: referenceNumber.trim(),
      terms_accepted: true,
      final_balance_amount: calculatedRemainingBalance,
      final_balance_status: "Unpaid",
      installment_schedule: paymentScheme === "Installment 20%" ? installmentMilestones : null,
    };

    let { error } = await supabase.from("bookings").insert([primaryPayload]);

    // Fallback: If dedicated payment columns do not exist yet in Supabase, safely embed within structured note
    if (error && error.message.toLowerCase().includes("column")) {
      console.warn("Direct payment columns not yet added to database. Using resilient metadata embedding.", error.message);
      const paymentMetadata = JSON.stringify({
        method: paymentMethod,
        scheme: paymentScheme,
        downpayment: calculatedDownpayment,
        balance: calculatedRemainingBalance,
        status: "Pending Verification",
        finalBalanceStatus: "Unpaid",
        installments: paymentScheme === "Installment 20%" ? installmentMilestones : null,
        ref: referenceNumber.trim(),
        receipt: receiptImage,
        termsAccepted: true,
        submittedAt: new Date().toISOString(),
      });

      const fallbackPayload = {
        user_id: authData.user.id,
        package_id: formData.packageId,
        event_date: formData.date,
        event_time: formData.time,
        event_location: `${formData.venueName} - ${formData.venueAddress}`,
        guest_count: parseInt(formData.guestCount) || 0,
        additional_pax: parseInt(formData.additionalPax) || 0,
        food_allergies: `${formData.foodAllergies.trim() ? formData.foodAllergies.trim() + "\n" : ""}__PAYMENT_METADATA__:${paymentMetadata}`,
        selected_menu_items: validSelections,
        status: "Pending",
      };

      const fallbackResult = await supabase.from("bookings").insert([fallbackPayload]);
      error = fallbackResult.error;
    }

    setIsProcessingPayment(false);

    if (error) {
      setPaymentError(`Submission failed: ${error.message}`);
    } else {
      setShowPaymentModal(false);
      setShowSuccessModal(true);
    }
  };

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
        {/* Feature: Displays validation errors sticky at the top for better visibility */}
        <div className="sticky top-24 z-40 w-full flex flex-col gap-2 mb-6">
          <AnimatePresence>
            {stepError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-950/90 border border-red-500/50 text-red-200 text-center font-bold tracking-wide rounded-md shadow-2xl backdrop-blur-sm"
              >
                {stepError}
              </motion.div>
            )}
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-950/90 border border-red-500/50 text-red-200 text-center font-bold tracking-wide rounded-md shadow-2xl backdrop-blur-sm"
              >
                {submitError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
                      {pkg.additional_pax_price && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                          <span className="text-[10px] text-gold-400/80 uppercase tracking-widest font-bold">
                            +₱{pkg.additional_pax_price} / Extra Pax
                          </span>
                        </>
                      )}
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
                    
                    <div className="mt-auto w-full">
                      <div className={`w-full py-4 border text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center justify-center gap-3 ${
                        formData.packageId === pkg.id
                          ? "bg-gold-400 text-black border-gold-400"
                          : "border-gold-400/20 text-gold-400 group-hover:bg-gold-400 group-hover:text-black"
                      }`}>
                        {formData.packageId === pkg.id ? "Selected" : "Choose Package"} <ChevronRight size={14} />
                      </div>
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
                    max={maxSelectableDate}
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
                    max={maxGuests}
                    placeholder="e.g. 50"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium"
                    value={formData.guestCount}
                    onChange={(e) => {
                      setStepError("");
                      const val = e.target.value;
                      if (val === "" || parseInt(val) >= 0) {
                      const isUnderMax = !val || parseInt(val) < maxGuests;
                      setFormData({
                        ...formData,
                        guestCount: val,
                        additionalPax: isUnderMax ? "" : formData.additionalPax,
                      });
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
                <div className="space-y-2">
                  <label className="text-base text-white/80 font-bold flex items-center gap-2">
                    Additional Pax <span className="text-sm font-normal text-white/50">(Optional)</span>
                    {selectedPkgForMenu?.additional_pax_price && (
                      <div className="relative group/tooltip flex items-center justify-center">
                        <Info size={16} className="text-gold-400/80 cursor-help transition-colors hover:text-gold-400" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#0a0a0a] border border-white/10 text-xs text-white/80 text-center rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 pointer-events-none shadow-2xl">
                          <span className="font-bold text-gold-400 block mb-1">Additional Pax Pricing</span>
                          Each additional guest costs ₱{selectedPkgForMenu.additional_pax_price}. This will be automatically added to your estimated budget.
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0a0a] border-b border-r border-white/10 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    disabled={!formData.guestCount || parseInt(formData.guestCount) < maxGuests}
                    className={`w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium ${(!formData.guestCount || parseInt(formData.guestCount) < maxGuests) ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={formData.additionalPax}
                    onChange={(e) => {
                      setStepError("");
                      const val = e.target.value;
                      if (val === "" || parseInt(val) >= 0) {
                        setFormData({ ...formData, additionalPax: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "." || e.key === "e") {
                        e.preventDefault();
                      }
                    }}
                  />
                  {(!formData.guestCount || parseInt(formData.guestCount) < maxGuests) && (
                    <span className="text-xs font-normal text-white/40 italic block mt-1">
                      Available at max capacity ({maxGuests} pax)
                    </span>
                  )}
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
                <div className="col-span-full space-y-2">
                  <label className="text-base text-white/80 font-bold">
                    Food Allergies / Dietary Restrictions <span className="text-sm font-normal text-white/50">(Optional)</span>
                  </label>
                  <textarea
                    placeholder="e.g. Peanut allergy, vegetarian options needed..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 text-lg focus:outline-none focus:border-gold-400/50 transition-all font-medium resize-none"
                    value={formData.foodAllergies}
                    onChange={(e) => {
                      setFormData({ ...formData, foodAllergies: e.target.value });
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
                  if (limit && limit.max === 0) return null; // Hide categories with 0 allowance
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
                            {formData.additionalPax && parseInt(formData.additionalPax) > 0 ? (
                              <span className="text-sm text-white/50 block font-sans font-bold tracking-wide mt-1">
                                + {formData.additionalPax} Additional Pax
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    <div className="flex gap-4">
                      <CreditCard className="text-gold-400 shrink-0 mt-0.5" size={18} />
                      <div className="w-full pr-4">
                        <p className="text-sm tracking-wide text-white/70 font-bold mb-3">
                          Budget Breakdown
                        </p>
                        {(() => {
                          const pkg = availablePackages.find((p) => p.id === formData.packageId);
                          const basePrice = pkg && pkg.price ? parseFloat(String(pkg.price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
                          const addPrice = pkg && pkg.additional_pax_price ? parseFloat(String(pkg.additional_pax_price).replace(/[^0-9.-]+/g, "")) || 0 : 0;
                          const extraPax = parseInt(formData.additionalPax) || 0;
                          const additionalPaxTotal = addPrice * extraPax;
                          const totalBudget = basePrice + additionalPaxTotal;

                          return (
                            <div className="space-y-2 w-full max-w-sm">
                              <div className="flex justify-between text-sm text-white/90 font-medium">
                                <span>Base Package ({formData.guestCount || "0"} Pax)</span>
                                <span>₱{basePrice.toLocaleString()}</span>
                              </div>
                              {extraPax > 0 && (
                                <div className="flex justify-between text-sm text-white/90 font-medium">
                                  <span>Extra Pax ({extraPax} @ ₱{addPrice.toLocaleString()})</span>
                                  <span>₱{additionalPaxTotal.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-3 mt-3 border-t border-white/10">
                                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Total Estimated</span>
                                <span className="text-xl font-bold text-gold-400 font-serif tracking-wider">
                                  ₱{totalBudget.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
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
                      {formData.foodAllergies && (
                        <div className="col-span-full flex gap-4 border-t border-white/5 pt-8">
                          <Info className="text-gold-400 shrink-0" size={18} />
                          <div>
                            <p className="text-sm tracking-wide text-white/70 font-bold mb-1">
                              Dietary Restrictions
                            </p>
                            <p className="text-base text-white/80 tracking-wide leading-relaxed">
                              {formData.foodAllergies}
                            </p>
                          </div>
                        </div>
                      )}
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
                          Contact Number
                        </p>
                        <p className="text-xl font-serif tracking-wider">
                          {userProfile?.phone_number ||
                            userProfile?.phone ||
                            userProfile?.contact_number ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-16 space-y-4 pt-10 border-t border-black/10">
                      <p className="text-base tracking-wide leading-relaxed text-black/80">
                        By submitting this request, you agree to our{" "}
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="inline font-bold text-black underline underline-offset-4 decoration-black/70 hover:decoration-black hover:text-black transition-all cursor-pointer p-0 m-0 align-baseline bg-transparent border-0 text-left text-base"
                        >
                          Terms of Service & Catering Agreement
                        </button>{" "}
                        and refined catering standards.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center pt-20">
                <button
                  onClick={handleInitiateBooking}
                  disabled={!formData.packageId}
                  className="gold-gradient text-black px-12 md:px-20 py-6 font-bold tracking-wide text-lg hover:brightness-110 transition-all shadow-[0_0_40px_rgba(197,160,89,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  Review Agreement & Proceed to Payment <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-20 flex flex-col items-center gap-6">

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

      {/* Terms of Service & Catering Agreement Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card border border-white/15 max-w-4xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl rounded-2xl bg-[#0d0d0d]"
            >
              {/* Header */}
              <div className="p-5 sm:p-7 border-b border-white/10 flex items-center justify-between bg-black/60 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-gold-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif text-white italic">
                      Catering Agreement & <span className="gold-text-gradient font-bold not-italic">Terms</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/60 uppercase tracking-widest font-semibold mt-0.5">
                      Roxan Policarpio Events & Catering • Complete 20-Point Contract
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/terms"
                    target="_blank"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors"
                    title="Open Full Terms Page"
                  >
                    <ExternalLink size={14} /> Full Page
                  </Link>
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Sub-header Controls: Search & Category Chips */}
              <div className="p-4 bg-black/40 border-b border-white/10 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={termsModalSearch}
                      onChange={(e) => setTermsModalSearch(e.target.value)}
                      placeholder="Search terms, fees, rules..."
                      className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold-400/50"
                    />
                  </div>

                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-[11px]">
                    {[
                      { id: "all", label: "All (20)" },
                      { id: "payment", label: "Payment" },
                      { id: "adjustments", label: "Changes" },
                      { id: "corkage", label: "Corkage" },
                      { id: "operations", label: "Hours/Staff" },
                      { id: "liability", label: "Liability" },
                      { id: "legal", label: "Legal" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setTermsModalCategory(tab.id)}
                        className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                          termsModalCategory === tab.id
                            ? "bg-gold-400 text-black font-bold"
                            : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Agreement Body */}
              <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-sm text-white/80 leading-relaxed scrollbar-thin flex-1">
                {/* Dynamic Summary Banner */}
                <div className="p-4 bg-gold-400/5 border border-gold-400/20 rounded-xl text-xs space-y-1.5 text-white/80">
                  <div className="flex items-center justify-between text-gold-300 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Info size={14} className="text-gold-400" /> Contract Highlights for Your Reservation
                    </span>
                    {formData.date && (
                      <span className="font-mono text-[10px] text-white/60">
                        Event: {formData.date}
                      </span>
                    )}
                  </div>
                  <p className="text-white/70">
                    By confirming this reservation, the client agrees that all down payment amounts are strictly <strong>NON-REFUNDABLE</strong> and <strong>NON-TRANSFERABLE</strong>.
                    Standard catering service is limited to <strong>4 hours</strong>. Please review all 20 contractual clauses below.
                  </p>
                </div>

                {/* Clauses List */}
                {(() => {
                  const filtered = CATERING_CONTRACT_TERMS.filter((term) => {
                    const matchCat =
                      termsModalCategory === "all" ||
                      term.category === termsModalCategory ||
                      (termsModalCategory === "adjustments" && term.category === "logistics");

                    const query = termsModalSearch.toLowerCase().trim();
                    const matchQuery =
                      !query ||
                      term.title.toLowerCase().includes(query) ||
                      term.content.toLowerCase().includes(query) ||
                      (term.badge && term.badge.toLowerCase().includes(query)) ||
                      (term.rates &&
                        term.rates.some(
                          (r) =>
                            r.label.toLowerCase().includes(query) ||
                            r.price.toLowerCase().includes(query)
                        ));

                    return matchCat && matchQuery;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-white/50 text-xs">
                        No terms match your search filter.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map((term) => (
                        <div
                          key={term.id}
                          className="p-4 sm:p-5 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 hover:border-gold-400/20 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center text-xs font-bold font-serif shrink-0">
                                {term.number}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                                {term.title}
                              </h4>
                            </div>
                            {term.badge && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-gold-400/10 text-gold-400 border border-gold-400/20 rounded-full tracking-wider">
                                {term.badge}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/70 leading-relaxed">
                            {term.content}
                          </p>

                          {/* Rate Breakdown Table */}
                          {term.rates && term.rates.length > 0 && (
                            <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40 text-xs mt-2">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-white/5 text-gold-400 text-[10px] uppercase font-bold tracking-wider">
                                    <th className="py-2 px-3">Service / Inclusions</th>
                                    <th className="py-2 px-3 text-right">Fee</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {term.rates.map((rate, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-3">
                                        <p className="font-semibold text-white">{rate.label}</p>
                                        {rate.note && (
                                          <p className="text-[10px] text-white/50 mt-0.5">{rate.note}</p>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-gold-300 whitespace-nowrap">
                                        {rate.price}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Warning callout */}
                          {term.alertNotice && (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-200 mt-2">
                              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                              <span>{term.alertNotice}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Agreement Acceptance & Actions */}
              <div className="p-5 sm:p-6 border-t border-white/10 bg-black/70 flex flex-col gap-4 shrink-0">
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/20 text-gold-400 focus:ring-gold-400/20 accent-[#c5a059] cursor-pointer"
                  />
                  <span className="text-xs text-white/80 font-medium group-hover:text-white transition-colors">
                    I have read, understood, and agree to the full <strong>Terms of Service & Catering Agreement</strong>, including the non-refundable deposit, cancellation forfeit, 4-hour limit, overtime fees, and liability policies.
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <p className="text-[10px] text-white/40">
                    Signing as: <span className="text-white/70 font-semibold">{userProfile?.full_name || userProfile?.name || "Client"}</span>
                  </p>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setShowTermsModal(false)}
                      className="w-full sm:w-auto px-6 py-2.5 border border-white/20 text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors rounded-sm cursor-pointer"
                    >
                      Decline / Return
                    </button>
                    <button
                      onClick={handleAcceptTerms}
                      disabled={!termsAgreed}
                      className="w-full sm:w-auto px-8 py-2.5 gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed rounded-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg whitespace-nowrap"
                    >
                      I Agree & Proceed to Payment <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 20% Downpayment & Payment Method Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card border border-white/15 max-w-2xl w-full max-h-[92vh] flex flex-col relative overflow-hidden shadow-2xl rounded-xl bg-[#0b0b0b]"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/30 flex items-center justify-center">
                    <CreditCard className="text-gold-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif text-white italic">
                      Secure Reservation <span className="gold-text-gradient font-bold not-italic">Payment</span>
                    </h3>
                    <p className="text-xs text-white/60 uppercase tracking-widest font-semibold mt-0.5">
                      Select Payment Scheme & Settle Deposit
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 scrollbar-thin">
                {paymentError && (
                  <div className="p-4 bg-red-950/90 border border-red-500/50 rounded-lg text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Payment Scheme Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/90 block">
                      Choose Payment Scheme <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-gold-400/80 uppercase tracking-wider font-semibold">
                      Per Contract Clause 1
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Standard 50% Down Payment */}
                    <button
                      type="button"
                      onClick={() => setPaymentScheme("Standard 50%")}
                      className={`p-4 rounded-xl border text-left transition-all relative ${
                        paymentScheme === "Standard 50%"
                          ? "bg-gold-400/15 border-gold-400 text-white shadow-lg shadow-gold-400/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-gold-400/20 text-gold-300">
                          Standard Plan
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentScheme === "Standard 50%"
                              ? "border-gold-400 bg-gold-400"
                              : "border-white/30"
                          }`}
                        >
                          {paymentScheme === "Standard 50%" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-sm text-white">Standard 50% Down Payment</p>
                      <p className="text-xs text-gold-400 font-bold font-serif mt-1">
                        ₱{Math.round(calculatedTotalBudget * 0.5).toLocaleString()} Due Now
                      </p>
                      <p className="text-[11px] text-white/60 mt-1 leading-snug">
                        50% deposit payable upon booking; remaining 50% balance strictly due 15 days before event.
                      </p>
                    </button>

                    {/* Option 2: Installment Scheme (20% Booking Deposit) */}
                    <button
                      type="button"
                      onClick={() => setPaymentScheme("Installment 20%")}
                      className={`p-4 rounded-xl border text-left transition-all relative ${
                        paymentScheme === "Installment 20%"
                          ? "bg-gold-400/15 border-gold-400 text-white shadow-lg shadow-gold-400/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          Installment Scheme
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentScheme === "Installment 20%"
                              ? "border-gold-400 bg-gold-400"
                              : "border-white/30"
                          }`}
                        >
                          {paymentScheme === "Installment 20%" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-black" />
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-sm text-white">20% Booking Deposit</p>
                      <p className="text-xs text-gold-400 font-bold font-serif mt-1">
                        ₱{Math.round(calculatedTotalBudget * 0.2).toLocaleString()} Due Now
                      </p>
                      <p className="text-[11px] text-white/60 mt-1 leading-snug">
                        Locks event date; remaining 80% split into installments up to 15 days before event date.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Amount Breakdown Card */}
                <div className="p-6 bg-gradient-to-r from-gold-400/10 via-white/5 to-transparent border border-gold-400/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rounded-full blur-2xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">
                        Total Estimated Cost
                      </p>
                      <p className="text-lg font-serif text-white font-bold">
                        ₱{calculatedTotalBudget.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-white/40">{formData.guestCount} Pax Package</span>
                    </div>

                    <div className="sm:border-x sm:border-white/10 sm:px-4">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-gold-400 mb-1">
                        {paymentScheme === "Standard 50%" ? "50% Downpayment (Due Now)" : "20% Deposit (Due Now)"}
                      </p>
                      <p className="text-2xl font-serif text-gold-400 font-bold">
                        ₱{calculatedDownpayment.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-gold-300/70 font-semibold">
                        {paymentScheme === "Standard 50%" ? "Initial 50% Settlement" : "To Secure & Lock Date"}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">
                        {paymentScheme === "Standard 50%" ? "50% Final Balance" : "Remaining 80% Balance"}
                      </p>
                      <p className="text-lg font-serif text-white/80 font-bold">
                        ₱{calculatedRemainingBalance.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-white/40">Strictly due 15 days before event</span>
                    </div>
                  </div>
                </div>

                {/* Installment Milestones Breakdown Preview (when Installment Scheme is selected) */}
                {paymentScheme === "Installment 20%" && installmentMilestones.length > 0 && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gold-300 flex items-center gap-1.5">
                        <Clock size={14} /> Estimated Milestone Billing Schedule
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        Clause 1 Schedule
                      </span>
                    </div>
                    <div className="space-y-2">
                      {installmentMilestones.map((m: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">{m.title}</p>
                            <p className="text-[10px] text-white/50">Target Due: {m.dueDate}</p>
                          </div>
                          <span className="font-bold text-gold-400 font-serif">
                            ₱{m.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/50 italic leading-relaxed">
                      * Per contract terms, all installments and the final balance must be fully settled strictly 15 days prior to the event date.
                    </p>
                  </div>
                )}

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-white/80 block mb-3">
                    Choose Payment Option <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("GCash")}
                      className={`p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        paymentMethod === "GCash"
                          ? "bg-[#007DFE]/15 border-[#007DFE] text-white shadow-lg shadow-[#007DFE]/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${paymentMethod === "GCash" ? "bg-[#007DFE] text-white" : "bg-white/10 text-white/40"}`}>
                        G
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">GCash QR & Transfer</p>
                        <p className="text-[10px] text-white/50">Instant mobile wallet payment</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Bank Transfer")}
                      className={`p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        paymentMethod === "Bank Transfer"
                          ? "bg-gold-400/15 border-gold-400 text-white shadow-lg shadow-gold-400/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${paymentMethod === "Bank Transfer" ? "bg-gold-400 text-black" : "bg-white/10 text-white/40"}`}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">Bank Transfer</p>
                        <p className="text-[10px] text-white/50">BDO / BPI Online Banking</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Details for Selected Method */}
                {paymentMethod === "GCash" ? (
                  <div className="p-5 bg-gradient-to-b from-[#007DFE]/10 to-transparent border border-[#007DFE]/30 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Stylized QR Code Placeholder */}
                      <div className="bg-white p-3 rounded-lg shadow-xl shrink-0 flex flex-col items-center">
                        <div className="w-36 h-36 bg-gray-100 border-2 border-dashed border-[#007DFE]/40 rounded flex flex-col items-center justify-center p-2 relative overflow-hidden">
                          {/* QR Visual Elements */}
                          <div className="absolute top-2 left-2 w-7 h-7 border-2 border-[#007DFE] rounded-sm flex items-center justify-center">
                            <div className="w-3 h-3 bg-[#007DFE]"></div>
                          </div>
                          <div className="absolute top-2 right-2 w-7 h-7 border-2 border-[#007DFE] rounded-sm flex items-center justify-center">
                            <div className="w-3 h-3 bg-[#007DFE]"></div>
                          </div>
                          <div className="absolute bottom-2 left-2 w-7 h-7 border-2 border-[#007DFE] rounded-sm flex items-center justify-center">
                            <div className="w-3 h-3 bg-[#007DFE]"></div>
                          </div>
                          <QrCode className="text-[#007DFE] opacity-70" size={48} />
                          <span className="text-[9px] font-bold text-[#007DFE] mt-1 uppercase tracking-tighter">
                            GCash QR Code
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-2">
                          Scan to Pay ₱{calculatedDownpayment.toLocaleString()}
                        </span>
                      </div>

                      {/* Instructions & Account */}
                      <div className="space-y-3 flex-1 text-left">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#007DFE] block">
                            GCash Account Name
                          </span>
                          <span className="text-base font-bold text-white">
                            ROXAN POLICARPIO (ROXAN POLICARPIO CATERING)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#007DFE] block">
                            GCash Mobile Number
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-mono font-bold text-white bg-white/10 px-3 py-1 rounded">
                              0946 715 8519
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("09467158519");
                                setCopiedAccount("gcash");
                                setTimeout(() => setCopiedAccount(""), 2500);
                              }}
                              className="px-3 py-1.5 bg-[#007DFE]/20 text-[#007DFE] hover:bg-[#007DFE]/30 text-xs font-bold rounded transition-colors flex items-center gap-1.5"
                            >
                              {copiedAccount === "gcash" ? <CheckCircle size={14} /> : <Copy size={14} />}
                              {copiedAccount === "gcash" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed pt-1">
                          1. Open your GCash App and select <strong>Send Money</strong> or <strong>QR</strong>.<br />
                          2. Send the exact downpayment: <strong>₱{calculatedDownpayment.toLocaleString()}</strong>.<br />
                          3. Save the transaction receipt and upload it below.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-gradient-to-b from-gold-400/10 to-transparent border border-gold-400/30 rounded-xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                            BDO Unibank
                          </span>
                          <span className="text-[9px] bg-gold-400/20 text-gold-300 px-2 py-0.5 rounded font-bold">
                            Current Account
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 uppercase font-semibold">Account Name</p>
                          <p className="text-xs font-bold text-white">Roxan Policarpio Events & Catering</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 uppercase font-semibold">Account Number</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-sm font-mono font-bold text-white">0012 3456 7890</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("001234567890");
                                setCopiedAccount("bdo");
                                setTimeout(() => setCopiedAccount(""), 2500);
                              }}
                              className="text-[10px] text-gold-400 hover:text-white font-bold flex items-center gap-1"
                            >
                              {copiedAccount === "bdo" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                            BPI (Bank of the Phil. Islands)
                          </span>
                          <span className="text-[9px] bg-gold-400/20 text-gold-300 px-2 py-0.5 rounded font-bold">
                            Savings Account
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 uppercase font-semibold">Account Name</p>
                          <p className="text-xs font-bold text-white">Roxan Policarpio Events & Catering</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 uppercase font-semibold">Account Number</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-sm font-mono font-bold text-white">4598 1234 56</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("4598123456");
                                setCopiedAccount("bpi");
                                setTimeout(() => setCopiedAccount(""), 2500);
                              }}
                              className="text-[10px] text-gold-400 hover:text-white font-bold flex items-center gap-1"
                            >
                              {copiedAccount === "bpi" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-white/70">
                      Transfer <strong>₱{calculatedDownpayment.toLocaleString()}</strong> via InstaPay or PESONet and save your transaction confirmation slip.
                    </p>
                  </div>
                )}

                {/* Proof of Payment Upload */}
                <div className="space-y-3 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/90 block">
                    Upload Proof of Payment <span className="text-red-400">*</span>
                  </label>

                  {receiptImage ? (
                    <div className="p-4 bg-white/5 border border-gold-400/40 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={receiptImage}
                          alt="Receipt Preview"
                          className="w-16 h-16 object-cover rounded border border-white/20 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {receiptFileName || "payment_receipt.jpg"}
                          </p>
                          <p className="text-[11px] text-green-400 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle size={12} /> Receipt Image Attached & Verified
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage("");
                          setReceiptFileName("");
                        }}
                        className="px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold rounded transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-white/20 hover:border-gold-400/60 transition-colors p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]">
                      <UploadCloud size={32} className="text-gold-400 mb-2" />
                      <p className="text-sm font-bold text-white">
                        Click to upload transaction receipt
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        PNG, JPG, or WEBP screenshot from GCash or Bank Transfer
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Reference Number Input */}
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/90 block">
                    Transaction Reference Number <span className="text-white/40 font-normal">(Optional but recommended)</span>
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. 9012 3456 7890 or Trace ID"
                    className="w-full bg-white/5 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-gold-400/50 rounded-lg font-medium text-white"
                  />
                  <span className="text-[10px] text-white/50 block">
                    Helps our admin staff match and confirm your booking faster.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowTermsModal(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 border border-white/20 text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors rounded-sm"
                >
                  Back to Agreement
                </button>
                <button
                  type="button"
                  onClick={handleSubmitPayment}
                  disabled={isProcessingPayment || !receiptImage}
                  className="w-full sm:w-auto px-8 py-3 gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed rounded-sm flex items-center justify-center gap-2 shadow-lg shadow-gold-400/10"
                >
                  {isProcessingPayment ? "Submitting Reservation..." : "Submit Booking & Proof of Payment"}
                  {!isProcessingPayment && <ChevronRight size={14} />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="glass-card border border-white/10 p-8 sm:p-10 max-w-lg w-full text-center relative overflow-hidden rounded-xl shadow-2xl bg-[#0c0c0c]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gold-400" />
              <div className="w-20 h-20 bg-gold-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-gold-400" size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif text-white mb-3 italic">Booking & Payment <span className="gold-text-gradient">Submitted</span></h3>
              <p className="text-sm sm:text-base text-white/70 mb-4 font-medium leading-relaxed">
                Thank you for choosing Roxan Policarpio Events & Catering. We have received your reservation inquiry and {paymentScheme} receipt.
              </p>
              <div className="text-xs text-gold-300 font-medium leading-relaxed border border-gold-400/20 bg-gold-400/5 p-4 rounded-lg mb-8 text-left space-y-1">
                <p className="font-bold text-gold-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Info size={14} /> Next Steps for Verification
                </p>
                <p>
                  Our admin team is currently verifying your {paymentScheme} deposit proof (<strong>₱{calculatedDownpayment.toLocaleString()}</strong>). Once verified, your booking will transition to <strong>Confirmed</strong> and your date will be locked.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/my-inquiries")}
                  className="flex-1 py-3.5 gold-gradient text-black font-bold tracking-wider text-xs uppercase hover:brightness-110 transition-all rounded-sm"
                >
                  View My Inquiries
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 py-3.5 border border-white/20 text-white font-bold tracking-wider text-xs uppercase hover:bg-white/5 transition-all rounded-sm"
                >
                  Return to Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}