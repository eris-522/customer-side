import { motion } from "motion/react";
import { ChevronRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useCMS } from "../context/CMSContext";
import { catalogCache } from "../utils/catalogCache";

// Feature: Defines the TypeScript interfaces mapping to your Supabase tables
export interface CateringPackage {
  id: string;
  name: string;
  price: string;
  pax: string;
  additional_pax_price?: string;
  tag?: string;
  inclusions: string[];
  status: string;
  image_url?: string;
}

export const formatPrice = (price?: string | number) => {
  if (price === undefined || price === null || price === "") return "₱0";
  const clean = String(price).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(clean);
  if (isNaN(num)) return String(price).startsWith("₱") ? String(price) : `₱${price}`;
  return `₱${num.toLocaleString("en-US")}`;
};

// Feature: Fallback images array since the image column was removed from the database schema to simplify the backend
const fallbackImages = [
  "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
];

export default function PackagesPage() {
  const { cms } = useCMS();
  const packagesCms = cms?.packages;

  // Feature: State hooks to store the live data fetched from the database
  const [packages, setPackages] = useState<CateringPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inclusionCategories, setInclusionCategories] = useState<
    Record<string, string[]>
  >({});

  // Feature: Executes the database query as soon as the user navigates to this page
  useEffect(() => {
    const fetchOfferings = async (forceRefresh = false) => {
      // 1. Check in-memory catalogCache first
      let currentPackages = catalogCache.getPackages();
      if (!currentPackages || forceRefresh) {
        const pkgResponse = await supabase
          .from("packages")
          .select("id, name, price, pax, additional_pax_price, inclusions, status, tag, image_url, category_limits")
          .neq("status", "Archived")
          .neq("status", "none")
          .neq("status", "None");

        if (pkgResponse.error) {
          console.error("Error fetching packages:", pkgResponse.error.message);
        } else if (pkgResponse.data) {
          const sortedPackages = (pkgResponse.data as CateringPackage[]).sort(
            (a, b) => {
              const priceA = parseFloat(
                String(a.price || "0").replace(/[^0-9.-]+/g, ""),
              );
              const priceB = parseFloat(
                String(b.price || "0").replace(/[^0-9.-]+/g, ""),
              );
              return priceA - priceB;
            },
          );
          currentPackages = sortedPackages;
          catalogCache.setPackages(sortedPackages);
        }
      }
      if (currentPackages) setPackages(currentPackages);

      // 2. Check inclusions cache
      let currentInclusions = catalogCache.getInclusions();
      if (!currentInclusions || forceRefresh) {
        const incResponse = await supabase
          .from("inclusions")
          .select("id, category, items")
          .not("category", "like", "__CMS_%");
        if (incResponse.error) {
          console.error("Error fetching inclusions:", incResponse.error.message);
        } else if (incResponse.data) {
          const grouped: Record<string, string[]> = {};
          incResponse.data.forEach((row: any) => {
            if (row.category && !row.category.startsWith("__CMS_")) {
              if (!grouped[row.category]) grouped[row.category] = [];
              if (row.items && row.items.trim() !== "" && row.items !== "-") {
                if (!grouped[row.category].includes(row.items)) {
                  grouped[row.category].push(row.items);
                }
              }
            }
          });
          currentInclusions = grouped;
          catalogCache.setInclusions(grouped);
        }
      }
      if (currentInclusions) setInclusionCategories(currentInclusions);

      setLoading(false);
    };

    fetchOfferings();

    // Feature: Subscribe to real-time changes so package updates reflect instantly
    const channel = supabase
      .channel("packages-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "packages" },
        () => {
          catalogCache.invalidate("packages");
          fetchOfferings(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inclusions" },
        () => {
          catalogCache.invalidate("inclusions");
          fetchOfferings(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans">
      {/* Header */}
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          {packagesCms?.headerSubtitle || "Exclusive Collections"}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          {packagesCms?.headerTitle || "Catering"}{" "}
          <span className="italic gold-text-gradient">
            {packagesCms?.headerTitleItalic || "Packages"}
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-[11px] uppercase tracking-[0.4em] font-bold max-w-2xl mx-auto"
        >
          {packagesCms?.description ||
            "From intimate gatherings to grand celebrations, find the perfect curation for your event's specific needs and scale."}
        </motion.p>
      </header>

      {/* Feature: Loading state ensures the UI doesn't break while waiting for Supabase */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gold-400 tracking-[0.2em] uppercase text-sm animate-pulse">
            Loading Collections...
          </p>
        </div>
      ) : (
        <>
          {/* Packages Grid Section */}
          <section className="py-20 px-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <p className="text-white/40 tracking-[0.2em] uppercase text-sm">
                    No active packages available at the moment.
                  </p>
                </div>
              ) : (
                packages.map((pkg, i) => {
                  const packageImage =
                    packagesCms?.packageImages?.[pkg.id] ||
                    packagesCms?.packageImages?.[pkg.name] ||
                    packagesCms?.items?.find(
                      (item) =>
                        item.name?.toLowerCase() === pkg.name?.toLowerCase() ||
                        item.id === pkg.id
                    )?.image ||
                    pkg.image_url ||
                    fallbackImages[i % fallbackImages.length];

                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="glass-card border border-white/10 flex flex-col group overflow-hidden relative"
                    >
                      {/* Feature: Displays the package tag (e.g., Popular, New) if the admin assigned one */}
                      {pkg.tag && pkg.tag.toLowerCase() !== "none" && (
                        <div className="absolute top-4 left-4 z-10 bg-gold-400 text-black px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm">
                          {pkg.tag}
                        </div>
                      )}
                      <div className="aspect-video overflow-hidden bg-black/40">
                        {/* Feature: Automatically assigns a fallback image to keep the aesthetic intact */}
                        <img
                          src={packageImage}
                          alt={pkg.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = fallbackImages[i % fallbackImages.length];
                            if (target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-8 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <h3 className="text-2xl font-serif text-white uppercase tracking-wider">
                          {pkg.name}
                        </h3>
                        <span className="text-gold-400 font-serif text-lg shrink-0">
                          {formatPrice(pkg.price)}
                        </span>
                      </div>

                      {/* Feature: Displays pax limitations clearly to the customer */}
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                        <span className="text-[10px] text-white/60 uppercase tracking-widest">
                          {pkg.pax} Guests
                        </span>
                        {pkg.additional_pax_price && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className="text-[10px] text-gold-400/80 uppercase tracking-widest font-bold">
                              +{formatPrice(pkg.additional_pax_price)} / Extra Pax
                            </span>
                          </>
                        )}
                      </div>

                      <div className="space-y-4 mb-10">
                        {(() => {
                          const allCategorizedItems =
                            Object.values(inclusionCategories).flat();
                          const pkgInclusions = Array.isArray(pkg.inclusions)
                            ? pkg.inclusions
                            : [];

                          const renderGroups: React.ReactNode[] = [];
                          Object.entries(inclusionCategories).forEach(
                            ([cat, items]) => {
                              const selected = pkgInclusions.filter((inc) =>
                                items.includes(inc),
                              );
                              if (selected.length > 0) {
                                renderGroups.push(
                                  <div key={cat} className="space-y-2">
                                    <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-1">
                                      {cat}
                                    </h4>
                                    <div className="space-y-2">
                                      {selected.map((feature, i) => (
                                        <div
                                          key={i}
                                          className="flex items-start gap-3"
                                        >
                                          <Check
                                            size={12}
                                            className="text-gold-400 shrink-0 mt-1"
                                          />
                                          <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold leading-relaxed">
                                            {feature}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>,
                                );
                              }
                            },
                          );

                          const uncategorized = pkgInclusions.filter(
                            (inc) => !allCategorizedItems.includes(inc),
                          );
                          if (uncategorized.length > 0) {
                            renderGroups.push(
                              <div key="Other" className="space-y-2">
                                <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest mb-1">
                                  Other
                                </h4>
                                <div className="space-y-2">
                                  {uncategorized.map((feature, i) => (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3"
                                    >
                                      <Check
                                        size={12}
                                        className="text-gold-400 shrink-0 mt-1"
                                      />
                                      <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold leading-relaxed">
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>,
                            );
                          }

                          return renderGroups;
                        })()}
                      </div>

                      <div className="mt-auto">
                        <Link
                          to="/booking"
                          className="w-full py-4 border border-gold-400/20 text-gold-400 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-gold-400 hover:text-black transition-all flex items-center justify-center gap-3"
                        >
                          Select Package <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            </div>
          </section>
        </>
      )}

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10 bg-[#070707]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">
            Begin Your Journey
          </span>
          <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight">
            Tailored to your <br /> <span className="italic">unique</span>{" "}
            vision.
          </h2>
          <div className="mt-12 flex items-center gap-4">
            <div className="w-12 h-[1px] bg-white/10"></div>
            <Link
              to="/"
              className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors font-bold"
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
