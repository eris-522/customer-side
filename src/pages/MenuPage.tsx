import { motion } from "motion/react";
import MenuSlider, { MenuItem } from "../components/MenuSlider";
import { Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useCMS } from "../context/CMSContext";
import { catalogCache } from "../utils/catalogCache";

// Feature: Fallback images array for dishes without an image
const fallbackImages = [
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&q=80&w=600",
];

const CATEGORY_ORDER = [
  "Appetizers",
  "Soup",
  "Vegetables",
  "Main Course",
  "Pasta",
  "Desserts",
  "Beverages",
];

export const resolveMenuCategory = (item: any): string => {
  const cat = (item.category || "").trim();
  const sub = (item.sub_category || "").trim().toLowerCase();
  const name = (item.name || "").trim().toLowerCase();

  if (
    sub === "soup" ||
    cat.toLowerCase() === "soup" ||
    name.includes("soup") ||
    name.includes("broth") ||
    name.includes("chowder") ||
    name.includes("sinigang") ||
    name.includes("nilaga") ||
    name.includes("sopas") ||
    name.includes("mami")
  ) {
    return "Soup";
  }

  if (
    sub === "vegetables" ||
    sub === "vegetable" ||
    cat.toLowerCase() === "vegetables" ||
    cat.toLowerCase() === "vegetable" ||
    name.includes("vegetable") ||
    name.includes("veggie") ||
    name.includes("chopseuy") ||
    name.includes("chopsuey") ||
    name.includes("lumpiang sariwa")
  ) {
    return "Vegetables";
  }

  if (cat.toLowerCase().includes("appetizer")) {
    return "Appetizers";
  }

  return cat || "Main Course";
};

export default function MenuPage() {
  const { cms } = useCMS();
  const menuCms = cms?.menu;

  // Feature: State variables to hold the dynamic menu data and manage loading UI
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Feature: Triggers the database fetch the moment the customer navigates to the Menu page
  useEffect(() => {
    let isMounted = true;

    const loadMenu = async (forceRefresh = false) => {
      const items = await catalogCache.fetchMenuItems(forceRefresh);
      if (!isMounted) return;
      setRawItems(items);
      setLoading(false);
    };

    loadMenu(false);

    const unsubscribe = catalogCache.subscribe((changedKey) => {
      if (changedKey === "menu") {
        loadMenu(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Reactively compute grouped menuData with CMS image overrides
  const menuData = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};

    const sourceItems =
      rawItems.length > 0
        ? rawItems
        : (menuCms?.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            sub_category: item.sub_category,
            status: "Available",
            description: item.description,
            image_url: item.image,
          }));

    sourceItems.forEach((item, index) => {
      const category = resolveMenuCategory(item);
      if (!grouped[category]) {
        grouped[category] = [];
      }

      const image =
        menuCms?.menuImages?.[item.id] ||
        menuCms?.menuImages?.[item.name] ||
        menuCms?.items?.find(
          (m) =>
            m.id === item.id ||
            m.name?.toLowerCase() === item.name?.toLowerCase()
        )?.image ||
        item.image_url ||
        fallbackImages[index % fallbackImages.length];

      grouped[category].push({
        id: item.id,
        name: item.name,
        description: item.description || item.sub_category || "",
        image,
      });
    });

    // Sort grouped categories into intuitive culinary order
    const sortedGrouped: Record<string, MenuItem[]> = {};
    const presentCategories = Object.keys(grouped).sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a);
      const idxB = CATEGORY_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    presentCategories.forEach((cat) => {
      sortedGrouped[cat] = grouped[cat];
    });

    return sortedGrouped;
  }, [rawItems, menuCms]);

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans">
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          {menuCms?.headerSubtitle || "Roxan Policarpio Catering"}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          {menuCms?.headerTitle || "Curated"}{" "}
          <span className="italic gold-text-gradient">
            {menuCms?.headerTitleItalic || "Selection"}
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-[11px] uppercase tracking-[0.4em] font-bold max-w-2xl mx-auto"
        >
          {menuCms?.description || "Explore our dynamic culinary offerings"}
        </motion.p>
      </header>

      <section className="bg-rich-black min-h-[400px]">
        {/* Feature: Displays a loading indicator while fetching from Supabase, or the dynamic sliders once loaded */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gold-400 tracking-[0.2em] uppercase text-sm animate-pulse">
              Loading Menu...
            </p>
          </div>
        ) : Object.keys(menuData).length === 0 ? (
          <div className="flex justify-center items-center h-64 text-center px-6">
            <p className="text-white/40 tracking-[0.2em] uppercase text-sm">
              No active menu items available at the moment.
            </p>
          </div>
        ) : (
          Object.entries(menuData).map(([category, items]) => (
            <MenuSlider key={category} category={category} items={items} />
          ))
        )}
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">
            {menuCms?.ctaSubtitle || "Reserve Your Experience"}
          </span>
          <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight">
            {menuCms?.ctaTitle || "Ready to taste"} <br />{" "}
            <span className="italic">
              {menuCms?.ctaTitleItalic || "extraordinary"}
            </span>{" "}
            service?
          </h2>
          <Link
            to="/booking"
            className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center"
          >
            {menuCms?.ctaBtnText || "Inquire Now"}
          </Link>
          <div className="mt-12 flex items-center gap-4">
            <div className="w-12 h-[1px] bg-white/10"></div>
            <Link
              to="/"
              className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors"
            >
              Return to Home
            </Link>
            <div className="w-12 h-[1px] bg-white/10"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
