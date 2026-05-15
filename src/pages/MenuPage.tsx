import { motion } from "motion/react";
import MenuSlider, { MenuItem } from "../components/MenuSlider";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function MenuPage() {
  // Feature: State variables to hold the dynamic menu data and manage loading UI
  const [menuData, setMenuData] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Feature: Triggers the database fetch the moment the customer navigates to the Menu page
  useEffect(() => {
    const fetchMenu = async () => {
      // Queries the 'menu_items' table and explicitly filters out any dishes marked as 'Archived' by the admin
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .neq("status", "Archived");

      if (error) {
        console.error("Error fetching menu data:", error.message);
      } else if (data) {
        // Feature: Iterates through the flat database list and organizes items into categories (e.g., all 'Main Course' together)
        const groupedData = data.reduce((acc: Record<string, any[]>, item) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }

          acc[item.category].push({
            id: item.id,
            name: item.name,
            status: item.status,
            // Fallbacks: Since these were removed from the DB schema, we provide static fallbacks to prevent the UI from breaking
            image:
              item.image_url ||
              "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600",
          });

          return acc;
        }, {});

        setMenuData(groupedData);
      }
      setLoading(false);
    };

    fetchMenu();

    // Fallback polling and real-time subscription for immediate menu updates
    const intervalId = setInterval(() => fetchMenu(), 10000);

    const channel = supabase
      .channel("menu-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          fetchMenu();
        },
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans">
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          Roxan Policarpio Catering
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          Curated <span className="italic gold-text-gradient">Selection</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-[11px] uppercase tracking-[0.4em] font-bold max-w-2xl mx-auto"
        >
          Explore our dynamic culinary offerings
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
            Reserve Your Experience
          </span>
          <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight">
            Ready to taste <br /> <span className="italic">extraordinary</span>{" "}
            service?
          </h2>
          <Link
            to="/booking"
            className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center"
          >
            Inquire Now
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
