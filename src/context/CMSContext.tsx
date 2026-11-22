import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../utils/supabase";
import {
  subscribeCmsSync,
  subscribeWakeSync,
  isLiveSyncConnected,
} from "../utils/liveSync";

export interface HeroCMS {
  tagline: string;
  title: string;
  titleItalic: string;
  subtitle: string;
  backgroundImage: string;
  primaryBtnText: string;
  primaryBtnLink: string;
  secondaryBtnText: string;
  secondaryBtnLink: string;
}

export interface AnnouncementCMS {
  enabled: boolean;
  message: string;
  linkText: string;
  linkUrl: string;
  type: "info" | "promo" | "warning";
}

export interface PillarItem {
  title: string;
  description: string;
  icon: string;
}

export interface AboutCMS {
  headerSubtitle: string;
  headerTitle: string;
  headerTitleItalic: string;
  storyTagline: string;
  storyHeadline: string;
  storyParagraph1: string;
  storyParagraph2: string;
  storyImage: string;
  valuesSubtitle: string;
  valuesTitle: string;
  valuesTitleItalic: string;
  pillars: PillarItem[];
  ctaSubtitle: string;
  ctaTitle: string;
  ctaTitleItalic: string;
  ctaTitleEnd: string;
  ctaBtnText: string;
  ctaBtnLink: string;
}

export interface WhyUsHighlight {
  number: string;
  title: string;
  description: string;
}

export interface ContactCMS {
  headerSubtitle: string;
  headerTitle: string;
  headerTitleItalic: string;
  phone: string;
  email: string;
  address: string;
  officeHours: string;
  mapEmbedUrl: string;
  locationNote: string;
  facebookUrl: string;
  instagramUrl: string;
  messengerUrl: string;
  whyUsSubtitle: string;
  whyUsTitle: string;
  whyUsTitleItalic: string;
  whyUsHighlights: WhyUsHighlight[];
  whyUsImage1: string;
  whyUsImage2: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  text: string;
}

export interface ProcessCMS {
  subtitle: string;
  steps: ProcessStep[];
}

export interface TestimonialItem {
  id: string;
  author: string;
  role: string;
  quote: string;
  rating: number;
  featured: boolean;
  active: boolean;
}

export interface TestimonialsCMS {
  subtitle: string;
  items: TestimonialItem[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
  termId?: string;
}

export interface FAQsCMS {
  subtitle: string;
  items: FAQItem[];
}

export interface FooterLink {
  name: string;
  url: string;
}

export interface PackageCMSItem {
  id: string;
  name: string;
  image: string;
  tag?: string;
  price?: string;
  pax?: string;
}

export interface PackagesCMS {
  headerSubtitle: string;
  headerTitle: string;
  headerTitleItalic: string;
  description: string;
  packageImages: Record<string, string>;
  items: PackageCMSItem[];
  packageOrder?: string[];
}

export interface MenuCMSItem {
  id: string;
  name: string;
  category: string;
  sub_category?: string;
  description?: string;
  image: string;
}

export interface MenuCMS {
  headerSubtitle: string;
  headerTitle: string;
  headerTitleItalic: string;
  description: string;
  menuImages: Record<string, string>;
  items: MenuCMSItem[];
  ctaSubtitle?: string;
  ctaTitle?: string;
  ctaTitleItalic?: string;
  ctaBtnText?: string;
}

export interface FooterCMS {
  brandName: string;
  copyrightText: string;
  quickLinks: FooterLink[];
}

export interface FullCMSData {
  hero: HeroCMS;
  announcement: AnnouncementCMS;
  about: AboutCMS;
  packages: PackagesCMS;
  menu: MenuCMS;
  contact: ContactCMS;
  process: ProcessCMS;
  testimonials: TestimonialsCMS;
  faqs: FAQsCMS;
  footer: FooterCMS;
}

export const DEFAULT_CMS_DATA: FullCMSData = {
  menu: {
    headerSubtitle: "Roxan Policarpio Catering",
    headerTitle: "Curated",
    headerTitleItalic: "Selection",
    description: "Explore our dynamic culinary offerings crafted with passion, artful presentation, and the finest ingredients.",
    menuImages: {
      "Roast Beef with Mushroom Gravy": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
      "Grilled Salmon in Lemon Butter": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800",
      "Truffle Cream Penne": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
      "Artisan Charcuterie Board": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
      "Mango Panna Cotta": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800",
    },
    items: [
      {
        id: "menu-roast-beef",
        name: "Roast Beef with Mushroom Gravy",
        category: "Main Course",
        description: "Slow-roasted tender beef brisket served with savory wild mushroom gravy.",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "menu-salmon",
        name: "Grilled Salmon in Lemon Butter",
        category: "Main Course",
        description: "Fresh Norwegian salmon fillet seared to perfection with caper-infused lemon butter.",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "menu-truffle-penne",
        name: "Truffle Cream Penne",
        category: "Pasta",
        description: "Al dente penne in a rich black truffle and parmesan cream sauce with wild mushrooms.",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "menu-charcuterie",
        name: "Artisan Charcuterie Board",
        category: "Appetizers",
        description: "Curated cheeses, cured meats, dried figs, honey, and gourmet crackers.",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "menu-panna-cotta",
        name: "Mango Panna Cotta",
        category: "Desserts",
        description: "Velvety vanilla bean panna cotta crowned with fresh ripe Philippine mango compote.",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=800",
      },
    ],
    ctaSubtitle: "Reserve Your Experience",
    ctaTitle: "Ready to taste",
    ctaTitleItalic: "extraordinary",
    ctaBtnText: "Inquire Now",
  },
  packages: {
    headerSubtitle: "Exclusive Collections",
    headerTitle: "Catering",
    headerTitleItalic: "Packages",
    description: "From intimate gatherings to grand celebrations, find the perfect curation for your event's specific needs and scale.",
    packageImages: {
      "Basic Wedding Package": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200",
      "Classic Wedding Package": "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
      "Premium Wedding Package": "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=1200",
    },
    items: [
      {
        id: "pkg-basic",
        name: "Basic Wedding Package",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200",
        tag: "Popular",
        price: "59000",
        pax: "50",
      },
      {
        id: "pkg-classic",
        name: "Classic Wedding Package",
        image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
        tag: "",
        price: "99000",
        pax: "100",
      },
      {
        id: "pkg-premium",
        name: "Premium Wedding Package",
        image: "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=1200",
        tag: "Premium",
        price: "239000",
        pax: "150",
      },
    ],
    packageOrder: [],
  },
  hero: {
    tagline: "Exquisite Culinary Experiences",
    title: "Affordable Elegance,",
    titleItalic: "Unforgettable Events",
    subtitle: "Available for weddings, corporate galas, and private celebrations across the region.",
    backgroundImage: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2000",
    primaryBtnText: "Inquire Now",
    primaryBtnLink: "/booking",
    secondaryBtnText: "View Menu",
    secondaryBtnLink: "/menu",
  },
  announcement: {
    enabled: false,
    message: "Now accepting catering bookings for the upcoming holiday season! Reserve early for priority dates.",
    linkText: "Book Now",
    linkUrl: "/booking",
    type: "promo",
  },
  about: {
    headerSubtitle: "Behind the Craft",
    headerTitle: "Our",
    headerTitleItalic: "Story",
    storyTagline: "A Culinary Legacy",
    storyHeadline: "Founded on the belief that fine dining should be an accessible experience for all of life's most meaningful milestones.",
    storyParagraph1: "Roxan Policarpio Events & Catering began as a small passion project, fueled by a deep love for Filipino hospitality and global culinary techniques. Over the years, we have evolved into a full-service catering brand known for our meticulous attention to detail and artistic presentation.",
    storyParagraph2: "Our journey has been defined by the smiles of thousands of guests and the success of countless events—from intimate garden weddings and milestone birthdays to grand corporate galas for hundreds of attendees.",
    storyImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1000",
    valuesSubtitle: "Our Foundations",
    valuesTitle: "The Pillars of",
    valuesTitleItalic: "Excellence",
    pillars: [
      {
        title: "Quality First",
        description: "We use only the freshest, premium ingredients, turning every dish into a gastronomic masterpiece.",
        icon: "Sparkles",
      },
      {
        title: "Personalized Service",
        description: "Every event is unique. Our team works closely with you to tailor every detail to your specific vision.",
        icon: "Heart",
      },
      {
        title: "Affordable Premium",
        description: "Experience luxury without the compromise. We deliver high-end service at competitive, transparent price points.",
        icon: "Award",
      },
    ],
    ctaSubtitle: "Let's Create Magic",
    ctaTitle: "Ready to",
    ctaTitleItalic: "Elevate",
    ctaTitleEnd: "Your Celebration?",
    ctaBtnText: "Book Your Event Now",
    ctaBtnLink: "/booking",
  },
  contact: {
    headerSubtitle: "Connect With Us",
    headerTitle: "Get In",
    headerTitleItalic: "Touch",
    phone: "+63 921 469 7142",
    email: "roxanpolicarpio.events@gmail.com",
    address: "Javier Compound, L. Wood St., Dolores, Taytay, Rizal",
    officeHours: "Mon - Sat: 9:00 AM - 6:00 PM",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4163.146547807375!2d121.13233027542846!3d14.57230958591067!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c74983e4457f%3A0xa8fd45edcc38ed17!2sRoxan%20Policarpio%20Events%20and%20Catering!5e1!3m2!1sen!2sph!4v1776733590376!5m2!1sen!2sph",
    locationNote: "Serving premium events across Rizal and Metro Manila.",
    facebookUrl: "https://www.facebook.com/roxanpolicarpiocateringservices",
    instagramUrl: "https://www.instagram.com/rp.cateringservices/",
    messengerUrl: "https://messenger.com",
    whyUsSubtitle: "Why Us",
    whyUsTitle: "Crafting Memories",
    whyUsTitleItalic: "Beyond the Plate",
    whyUsHighlights: [
      {
        number: "01",
        title: "Artistic Presentation",
        description: "We believe food should please the eye as much as the palate.",
      },
      {
        number: "02",
        title: "Meticulous Planning",
        description: "Every logistical detail is handled with surgical precision.",
      },
      {
        number: "03",
        title: "Seamless Execution",
        description: "Our waitstaff is trained in the fine art of subtle, attentive service.",
      },
    ],
    whyUsImage1: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?auto=format&fit=crop&q=80&w=600",
    whyUsImage2: "https://images.unsplash.com/photo-1533143048019-301bd1fcc077?auto=format&fit=crop&q=80&w=600",
  },
  process: {
    subtitle: "The Process",
    steps: [
      {
        number: "01",
        title: "Choose your package",
        text: "Select from our range of budget-friendly, premium catering collections designed for any occasion.",
      },
      {
        number: "02",
        title: "Customize your package",
        text: "Personalize your menu and services to align with your taste, dietary needs, and event theme.",
      },
      {
        number: "03",
        title: "Confirm booking",
        text: "Finalize your reservation and relax while we deliver a seamless dining experience.",
      },
    ],
  },
  testimonials: {
    subtitle: "Customer Review",
    items: [
      {
        id: "test-1",
        author: "Maria Santos",
        role: "Wedding Client",
        quote: "Roxan Policarpio Events & Catering made our dream wedding a reality. The food was absolutely exquisite, the presentation was flawless, and it didn't break the bank. Truly exceptional service!",
        rating: 5,
        featured: true,
        active: true,
      },
      {
        id: "test-2",
        author: "Carlos & Elena Mendoza",
        role: "Silver Anniversary",
        quote: "Our guests could not stop praising the roast beef and pasta dishes. The setup was breathtaking and the staff was attentive throughout the evening.",
        rating: 5,
        featured: false,
        active: true,
      },
      {
        id: "test-3",
        author: "TechNova Corp Logistics",
        role: "Corporate Year-End Gala",
        quote: "Seamless catering for over 350 executives and partners. Punctual, hygienic, delicious, and impeccably managed from start to finish.",
        rating: 5,
        featured: false,
        active: true,
      },
    ],
  },
  faqs: {
    subtitle: "Common Inquiries & Service Policies",
    items: [
      {
        id: "faq-cancellation",
        question: "What is your cancellation and refund policy?",
        answer: "Under our official Service Agreement (**Terms 1 & 16**), all reservation fees, down payments, and settled amounts are **strictly non-refundable, non-transferable, and non-consumable** upon execution of the agreement.",
        category: "Payment & Billing",
        termId: "cancellation",
        active: true,
      },
      {
        id: "faq-down-payment",
        question: "What is the down payment and billing schedule?",
        answer: "A **50% down payment** is due at the time of booking or **within 7 days** of reservation. The remaining balance must be settled strictly **15 days before your event date**. An installment plan (**20% deposit**) is also available upon request (**Terms 3, 4 & 5**).",
        category: "Payment & Billing",
        termId: "down-payment",
        active: true,
      },
      {
        id: "faq-changes",
        question: "Can we adjust our menu, guest count, or details before the event?",
        answer: "Yes, final changes and adjustments regarding menu selections, guest counts, and package inclusions must be communicated at least **fourteen (14) days prior to the event** (**Term 6**). Excess guests beyond the guaranteed count are charged at **₱500/pax** (**Term 11**).",
        category: "Changes & Location",
        termId: "changes",
        active: true,
      },
      {
        id: "faq-corkage",
        question: "Can we bring our own outside food, lechon, or drinks?",
        answer: "Yes, subject to standard service corkage fees (**Term 8**): **Lechon table** with dedicated waiter/chopper (**₱1,500**), **outside alcoholic beverages** (**₱400/bottle**), and **outside food** requiring extra chafing dishes/warmers (**₱400/dish**). Health waivers apply for outside food (**Term 15**).",
        category: "Corkage & Services",
        termId: "corkage-fees",
        active: true,
      },
      {
        id: "faq-hours",
        question: "How long is the catering service duration and what are overtime fees?",
        answer: "All package services are scheduled for a standard **4-hour duration** (**Term 14**). Time extensions incur an overtime fee of **₱4,000/hour** for catering service.",
        category: "Hours & Overtime",
        termId: "exceeding-hours",
        active: true,
      },
      {
        id: "faq-logistics",
        question: "Do you cater outside Taytay, Rizal, and are there hauling fees?",
        answer: "Yes! Out-of-town charges apply for events **outside Taytay, Rizal** (**Term 7**). Venues located on the 2nd floor or higher without elevator access incur a hauling fee of **₱150 per floor per waiter** (**Term 9**).",
        category: "Changes & Location",
        termId: "out-of-town-charges",
        active: true,
      },
      {
        id: "faq-spoilage",
        question: "Can we take home leftover food after the event?",
        answer: "Yes, but per our Food Spoilage Policy (**Term 18**), food exposed to room temperature for **more than 3 hours** risks spoilage. The caterer is relieved from liability once leftover food is packed and taken out of the venue.",
        category: "Liability & Spoilage",
        termId: "food-spoilage",
        active: true,
      },
    ],
  },
  footer: {
    brandName: "Roxan Policarpio Events & Catering",
    copyrightText: "All Rights Reserved.",
    quickLinks: [
      { name: "Facebook", url: "https://www.facebook.com/roxanpolicarpiocateringservices" },
      { name: "Instagram", url: "https://www.instagram.com/rp.cateringservices/" },
      { name: "Terms & Conditions", url: "/terms" },
      { name: "FAQs", url: "/faqs" },
      { name: "Inquire Now", url: "/booking" },
    ],
  },
};

const LOCAL_STORAGE_CMS_KEY = "rp_cms_content_cache";
const LOCAL_STORAGE_CMS_VERSIONS_KEY = "rp_cms_content_versions_v1";
const LOCAL_STORAGE_CMS_TIME_KEY = "rp_cms_content_timestamp";
const FALLBACK_FOCUS_COOLDOWN_MS = 15_000;

/**
 * Sorts packages according to the CMS-configured `packageOrder` array (matching by
 * package `id` first, then case-insensitive `name`). Any packages not present in
 * `packageOrder` (or all packages when `packageOrder` is empty) fall back to
 * ascending price order, then alphabetical name order.
 */
export function sortPackagesByOrder<
  T extends { id?: string; name?: string; price?: string | number }
>(packages: T[], packageOrder?: string[]): T[] {
  const orderIndex = new Map<string, number>();
  if (Array.isArray(packageOrder)) {
    packageOrder.forEach((rawKey, idx) => {
      const trimmed = typeof rawKey === "string" ? rawKey.trim() : "";
      if (!trimmed) return;
      if (!orderIndex.has(trimmed)) orderIndex.set(trimmed, idx);
      const lower = trimmed.toLowerCase();
      if (!orderIndex.has(lower)) orderIndex.set(lower, idx);
    });
  }

  const getRank = (pkg: T): number => {
    if (orderIndex.size === 0) return Number.MAX_SAFE_INTEGER;
    const idKey = typeof pkg.id === "string" ? pkg.id.trim() : "";
    if (idKey && orderIndex.has(idKey)) return orderIndex.get(idKey)!;
    const nameKey = typeof pkg.name === "string" ? pkg.name.trim().toLowerCase() : "";
    if (nameKey && orderIndex.has(nameKey)) return orderIndex.get(nameKey)!;
    return Number.MAX_SAFE_INTEGER;
  };

  const getPrice = (pkg: T): number => {
    const parsed = parseFloat(String(pkg.price ?? "0").replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...packages].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    const priceDiff = getPrice(a) - getPrice(b);
    if (priceDiff !== 0) return priceDiff;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

/**
 * Deeply merges a section's incoming data with DEFAULT_CMS_DATA[sectionKey],
 * ensuring that cleared/empty strings ("") or emptied arrays revert to default values.
 */
export function mergeSectionWithDefaults<K extends keyof FullCMSData>(
  sectionKey: K,
  incoming: any
): FullCMSData[K] {
  const defaults = DEFAULT_CMS_DATA[sectionKey];
  if (!defaults || typeof incoming !== "object" || incoming === null) {
    return JSON.parse(JSON.stringify(defaults));
  }

  const result: any = { ...defaults, ...incoming };

  for (const key of Object.keys(defaults)) {
    const defVal = (defaults as any)[key];
    const incVal = incoming[key];

    if (typeof defVal === "string") {
      if (
        defVal.trim() !== "" &&
        (typeof incVal !== "string" || incVal.trim() === "")
      ) {
        result[key] = defVal;
      }
    } else if (typeof defVal === "boolean") {
      if (typeof incVal !== "boolean") {
        result[key] = defVal;
      }
    } else if (Array.isArray(defVal)) {
      if (sectionKey === "packages" && key === "packageOrder") {
        result[key] = Array.isArray(incVal)
          ? Array.from(
              new Set(
                incVal
                  .filter((v): v is string => typeof v === "string")
                  .map((v) => v.trim())
                  .filter((v) => v.length > 0)
              )
            )
          : [];
      } else if (Array.isArray(incVal) && incVal.length > 0) {
        if (
          (sectionKey === "packages" || sectionKey === "menu") &&
          key === "items"
        ) {
          const itemMap = new Map<string, any>();
          defVal.forEach((dItem: any) => {
            const k = dItem.id || dItem.name;
            if (k) itemMap.set(k, { ...dItem });
          });
          incVal.forEach((iItem: any) => {
            if (!iItem) return;
            const k = iItem.id || iItem.name;
            if (!k) return;
            const existing = itemMap.get(k);
            const resolvedImage =
              typeof iItem.image === "string" && iItem.image.trim() !== ""
                ? iItem.image
                : existing?.image || "";
            if (resolvedImage || existing) {
              itemMap.set(k, {
                ...(existing || {}),
                ...iItem,
                image: resolvedImage,
              });
            }
          });
          result[key] = Array.from(itemMap.values());
        } else {
          result[key] = incVal.map((item: any, idx: number) => {
            const defItem =
              defVal.find((d: any) => d?.id && item?.id && d.id === item.id) ||
              defVal[idx];
            if (!defItem || typeof item !== "object" || item === null) {
              return item;
            }
            const mergedItem: any = { ...defItem, ...item };
            for (const field of Object.keys(defItem)) {
              if (
                typeof defItem[field] === "string" &&
                defItem[field].trim() !== "" &&
                typeof item[field] === "string" &&
                item[field].trim() === ""
              ) {
                mergedItem[field] = defItem[field];
              }
            }
            return mergedItem;
          });
        }
      } else {
        result[key] = defVal;
      }
    } else if (typeof defVal === "object" && defVal !== null) {
      const mergedMap: Record<string, string> = { ...defVal };
      if (typeof incVal === "object" && incVal !== null) {
        for (const [mapKey, mapVal] of Object.entries(incVal)) {
          if (typeof mapVal === "string" && mapVal.trim() !== "") {
            mergedMap[mapKey] = mapVal;
          } else if (defVal[mapKey]) {
            mergedMap[mapKey] = defVal[mapKey];
          } else {
            delete mergedMap[mapKey];
          }
        }
      }
      result[key] = mergedMap;
    }
  }

  return result as FullCMSData[K];
}

interface CMSContextType {
  cms: FullCMSData;
  isLoading: boolean;
  refreshCMS: () => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export function CMSProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<FullCMSData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CMS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const initial: FullCMSData = JSON.parse(JSON.stringify(DEFAULT_CMS_DATA));
        (Object.keys(DEFAULT_CMS_DATA) as Array<keyof FullCMSData>).forEach(
          (key) => {
            if (parsed?.[key]) {
              (initial as any)[key] = mergeSectionWithDefaults(key, parsed[key]);
            }
          }
        );
        return initial;
      }
    } catch (e) {}
    return DEFAULT_CMS_DATA;
  });
  const [isLoading] = useState(false);
  const cmsRef = React.useRef<FullCMSData>(cms);
  cmsRef.current = cms;

  const inFlightFetchRef = React.useRef<Promise<void> | null>(null);
  const queuedFullRef = React.useRef(false);
  const queuedDeltaRef = React.useRef(false);
  const queuedSectionsRef = React.useRef<Set<string>>(new Set());

  const readStoredVersions = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CMS_VERSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, string>;
        }
      }
    } catch {}
    return {};
  };

  const mergeAndPersistRows = (
    rows: any[],
    baseCms: FullCMSData,
    baseVersions: Record<string, string>
  ): boolean => {
    const nextCms: FullCMSData = { ...baseCms };
    const nextVersions: Record<string, string> = { ...baseVersions };
    let applied = false;

    rows.forEach((row: any) => {
      const sectionKey = (row.id || row.section) as keyof FullCMSData;
      if (sectionKey && row.data && (nextCms as any)[sectionKey] !== undefined) {
        (nextCms as any)[sectionKey] = mergeSectionWithDefaults(
          sectionKey,
          row.data
        );
        if (row.updated_at !== undefined && row.updated_at !== null) {
          nextVersions[String(sectionKey)] = String(row.updated_at);
        }
        applied = true;
      }
    });

    if (applied) {
      cmsRef.current = nextCms;
      setCms(nextCms);
      try {
        localStorage.setItem(LOCAL_STORAGE_CMS_KEY, JSON.stringify(nextCms));
        localStorage.setItem(
          LOCAL_STORAGE_CMS_VERSIONS_KEY,
          JSON.stringify(nextVersions)
        );
        localStorage.setItem(LOCAL_STORAGE_CMS_TIME_KEY, String(Date.now()));
      } catch {}
    }

    return applied;
  };

  const revalidateCMS = async (options?: {
    forceFull?: boolean;
    sections?: string[];
  }): Promise<void> => {
    if (inFlightFetchRef.current) {
      if (options?.forceFull) {
        queuedFullRef.current = true;
      } else if (options?.sections && options.sections.length > 0) {
        options.sections.forEach((s) => queuedSectionsRef.current.add(s));
      } else {
        queuedDeltaRef.current = true;
      }
      return inFlightFetchRef.current;
    }

    const validSections = (options?.sections || []).filter(
      (s): s is keyof FullCMSData => (DEFAULT_CMS_DATA as any)[s] !== undefined
    );

    const run = (async () => {
      try {
        // Path 1: Partial re-fetch of only the changed section(s) from broadcast hint
        if (!options?.forceFull && validSections.length > 0) {
          const { data, error } = await supabase
            .from("cms_content")
            .select("id, section, data, updated_at")
            .in("id", validSections);

          if (!error && data && data.length > 0) {
            mergeAndPersistRows(data, cmsRef.current, readStoredVersions());
          }
          return;
        }

        // Path 2: Lightweight ~400-byte timestamp delta check on reload / wake
        const storedVersions = readStoredVersions();
        const hasCachedData = Boolean(localStorage.getItem(LOCAL_STORAGE_CMS_KEY));
        if (
          !options?.forceFull &&
          hasCachedData &&
          Object.keys(storedVersions).length > 0
        ) {
          try {
            const { data: metaRows, error: metaErr } = await supabase
              .from("cms_content")
              .select("id, section, updated_at");

            if (!metaErr && metaRows && metaRows.length > 0) {
              const changedIds = metaRows
                .map((row: any) => {
                  const key = String(row.id || row.section || "");
                  if (!key || (DEFAULT_CMS_DATA as any)[key] === undefined) {
                    return null;
                  }
                  const serverTs = String(row.updated_at || "");
                  return storedVersions[key] !== serverTs ? key : null;
                })
                .filter((id): id is string => Boolean(id));

              if (changedIds.length === 0) {
                try {
                  localStorage.setItem(LOCAL_STORAGE_CMS_TIME_KEY, String(Date.now()));
                } catch {}
                return;
              }

              const { data: changedRows, error: changedErr } = await supabase
                .from("cms_content")
                .select("id, section, data, updated_at")
                .in("id", changedIds);

              if (!changedErr && changedRows && changedRows.length > 0) {
                mergeAndPersistRows(changedRows, cmsRef.current, storedVersions);
              }
              return;
            }
          } catch {}
        }

        // Path 3: Full fetch (first visit, missing version map, or manual forceFull)
        const baseDefaults: FullCMSData = JSON.parse(
          JSON.stringify(DEFAULT_CMS_DATA)
        );
        let loadedPrimary = false;

        try {
          const { data, error } = await supabase
            .from("cms_content")
            .select("id, section, data, updated_at");
          if (!error && data && data.length > 0) {
            loadedPrimary = mergeAndPersistRows(data, baseDefaults, {});
          }
        } catch {}

        // Dual-layer fallback: Only check `inclusions` table if primary table returned no rows
        if (!loadedPrimary) {
          try {
            const { data, error } = await supabase
              .from("inclusions")
              .select("category, items")
              .like("category", "__CMS_%");

            if (!error && data && data.length > 0) {
              const mergedFallback: FullCMSData = JSON.parse(
                JSON.stringify(DEFAULT_CMS_DATA)
              );
              let hasFallback = false;
              data.forEach((row: any) => {
                const sectionKey = row.category.replace(
                  "__CMS_",
                  ""
                ) as keyof FullCMSData;
                if (sectionKey && (mergedFallback as any)[sectionKey] !== undefined) {
                  try {
                    const parsed = JSON.parse(row.items);
                    (mergedFallback as any)[sectionKey] = mergeSectionWithDefaults(
                      sectionKey,
                      parsed
                    );
                    hasFallback = true;
                  } catch {}
                }
              });

              if (hasFallback) {
                cmsRef.current = mergedFallback;
                setCms(mergedFallback);
                try {
                  localStorage.setItem(
                    LOCAL_STORAGE_CMS_KEY,
                    JSON.stringify(mergedFallback)
                  );
                  localStorage.setItem(
                    LOCAL_STORAGE_CMS_TIME_KEY,
                    String(Date.now())
                  );
                } catch {}
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn("CMSProvider revalidateCMS exception:", err);
      }
    })();

    inFlightFetchRef.current = run;
    try {
      await run;
    } finally {
      inFlightFetchRef.current = null;
      const runFull = queuedFullRef.current;
      const runDelta = queuedDeltaRef.current;
      const runSections = Array.from(queuedSectionsRef.current);
      queuedFullRef.current = false;
      queuedDeltaRef.current = false;
      queuedSectionsRef.current.clear();

      if (runFull) {
        void revalidateCMS({ forceFull: true });
      } else if (runDelta) {
        void revalidateCMS();
      } else if (runSections.length > 0) {
        void revalidateCMS({ sections: runSections });
      }
    }
  };

  useEffect(() => {
    // Immediate ~400-byte delta validation on mount / F5 reload
    revalidateCMS();

    // Cross-tab custom event listener (when on same origin)
    const handleLocalUpdate = (e: any) => {
      const { section, data } = e.detail || {};
      if (section && data && (DEFAULT_CMS_DATA as any)[section] !== undefined) {
        const normalized = mergeSectionWithDefaults(
          section as keyof FullCMSData,
          data
        );
        setCms((prev) => {
          const updated = { ...prev, [section]: normalized };
          cmsRef.current = updated;
          try {
            localStorage.setItem(LOCAL_STORAGE_CMS_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    };
    window.addEventListener("cms_section_updated", handleLocalUpdate);

    // Live instant signal from Admin CMS saves
    const unsubscribeCms = subscribeCmsSync((sections) => {
      revalidateCMS(sections.length > 0 ? { sections } : {});
    });

    // Automatic wake re-check when returning after hidden-tab WebSocket disconnect
    const unsubscribeWake = subscribeWakeSync(() => {
      revalidateCMS();
    });

    // Disconnected fallback: delta check on focus/visibility only if live broadcast socket is down
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && !isLiveSyncConnected()) {
        const lastFetch = Number(
          localStorage.getItem(LOCAL_STORAGE_CMS_TIME_KEY) || 0
        );
        if (Date.now() - lastFetch > FALLBACK_FOCUS_COOLDOWN_MS) {
          revalidateCMS();
        }
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      unsubscribeCms();
      unsubscribeWake();
      window.removeEventListener("cms_section_updated", handleLocalUpdate);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  return (
    <CMSContext.Provider
      value={{
        cms,
        isLoading,
        refreshCMS: () => revalidateCMS({ forceFull: true }),
      }}
    >
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error("useCMS must be used within a CMSProvider");
  }
  return context;
}
