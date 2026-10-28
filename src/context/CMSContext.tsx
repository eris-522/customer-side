import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../utils/supabase";

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
    email: "rpcatering@gmail.com",
    address: "Javier Compound, L. Wood St., Dolores, Taytay, Rizal",
    officeHours: "Mon - Sat: 9:00 AM - 6:00 PM",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4163.146547807375!2d121.13233027542846!3d14.57230958591067!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c74983e4457f%3A0xa8fd45edcc38ed17!2sRoxan%20Policarpio%20Events%20and%20Catering!5e1!3m2!1sen!2sph!4v1776733590376!5m2!1sen!2sph",
    locationNote: "Serving premium events across Rizal and Metro Manila.",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
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
      { name: "Facebook", url: "https://facebook.com" },
      { name: "Instagram", url: "https://instagram.com" },
      { name: "Terms & Conditions", url: "/terms" },
      { name: "FAQs", url: "/faqs" },
      { name: "Inquire Now", url: "/booking" },
    ],
  },
};

const LOCAL_STORAGE_CMS_KEY = "rp_cms_content_cache";
const LOCAL_STORAGE_CMS_TIME_KEY = "rp_cms_content_timestamp";
export const CMS_SYNC_CHANNEL_NAME = "cms-live-sync";

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
      if (Array.isArray(incVal) && incVal.length > 0) {
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

  const fetchContent = async (_forceRefresh = false) => {
    try {
      const merged: FullCMSData = JSON.parse(JSON.stringify(DEFAULT_CMS_DATA));
      let hasData = false;

      // 1. Always query primary table `cms_content` so remote/port-forwarded/Vercel deployments stay in sync
      try {
        const { data, error } = await supabase.from("cms_content").select("*");
        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            const sectionKey = (row.id || row.section) as keyof FullCMSData;
            if (sectionKey && row.data && (merged as any)[sectionKey] !== undefined) {
              (merged as any)[sectionKey] = mergeSectionWithDefaults(
                sectionKey,
                row.data
              );
              hasData = true;
            }
          });
        }
      } catch (e) {}

      // 2. Dual-layer fallback: Only check `inclusions` table if primary table returned no rows
      if (!hasData) {
        try {
          const { data, error } = await supabase
            .from("inclusions")
            .select("category, items")
            .like("category", "__CMS_%");

          if (!error && data && data.length > 0) {
            data.forEach((row: any) => {
              const sectionKey = row.category.replace(
                "__CMS_",
                ""
              ) as keyof FullCMSData;
              if (sectionKey && (merged as any)[sectionKey] !== undefined) {
                try {
                  const parsed = JSON.parse(row.items);
                  (merged as any)[sectionKey] = mergeSectionWithDefaults(
                    sectionKey,
                    parsed
                  );
                  hasData = true;
                } catch (err) {}
              }
            });
          }
        } catch (e) {}
      }

      if (hasData) {
        setCms(merged);
        try {
          localStorage.setItem(LOCAL_STORAGE_CMS_KEY, JSON.stringify(merged));
          localStorage.setItem(LOCAL_STORAGE_CMS_TIME_KEY, String(Date.now()));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("CMSProvider fetchContent exception:", err);
    }
  };

  useEffect(() => {
    fetchContent(true);

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
          try {
            localStorage.setItem(LOCAL_STORAGE_CMS_KEY, JSON.stringify(updated));
          } catch (err) {}
          return updated;
        });
      }
    };
    window.addEventListener("cms_section_updated", handleLocalUpdate);

    // Refresh when user switches back to the customer portal tab/window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const lastFetch = Number(localStorage.getItem(LOCAL_STORAGE_CMS_TIME_KEY) || 0);
        if (Date.now() - lastFetch > 300000) {
          fetchContent(true);
        }
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Realtime postgres changes on `cms_content` and instant broadcast events across any domain (local, VS Code tunnel, Vercel)
    const channel = supabase
      .channel(CMS_SYNC_CHANNEL_NAME, {
        config: { broadcast: { self: true } },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_content" },
        () => {
          fetchContent(true);
        }
      )
      .on("broadcast", { event: "cms_update" }, (payload: any) => {
        const section = payload?.payload?.section as keyof FullCMSData | undefined;
        const rawData = payload?.payload?.data;
        if (section && rawData && (DEFAULT_CMS_DATA as any)[section] !== undefined) {
          const normalized = mergeSectionWithDefaults(section, rawData);
          setCms((prev) => {
            const updated = {
              ...prev,
              [section]: normalized,
            };
            try {
              localStorage.setItem(
                LOCAL_STORAGE_CMS_KEY,
                JSON.stringify(updated)
              );
            } catch (err) {}
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("cms_section_updated", handleLocalUpdate);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <CMSContext.Provider
      value={{ cms, isLoading, refreshCMS: () => fetchContent(true) }}
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
