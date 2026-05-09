import { motion } from "motion/react";
import { ChevronRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase"; // Feature: Imports the Supabase client for database communication

// Feature: Defines the TypeScript interfaces mapping to your Supabase tables
export interface CateringPackage {
  id: string;
  name: string;
  price: string;
  pax: string;
  tag?: string;
  inclusions: string[];
}

// Feature: Fallback images array since the image column was removed from the database schema to simplify the backend
const fallbackImages = [
  "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
];

export default function PackagesPage() {
  // Feature: State hooks to store the live data fetched from the database
  const [packages, setPackages] = useState<CateringPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Feature: Executes the database query as soon as the user navigates to this page
  useEffect(() => {
    const fetchOfferings = async () => {
      // It explicitly filters out any packages that the admin marked as 'Archived'
      const pkgResponse = await supabase.from("packages").select("*").neq("status", "Archived");

      if (pkgResponse.error) {
        console.error("Error fetching packages:", pkgResponse.error.message);
      } else if (pkgResponse.data) {
        setPackages(pkgResponse.data as CateringPackage[]);
      }

      setLoading(false);
    };

    fetchOfferings();
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
          Exclusive Collections
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-serif text-white mb-8"
        >
          Catering <span className="italic gold-text-gradient">Packages</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/40 text-[11px] uppercase tracking-[0.4em] font-bold max-w-2xl mx-auto"
        >
          From intimate gatherings to grand celebrations, find the perfect
          curation for your event's specific needs and scale.
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
                packages.map((pkg, i) => (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card border border-white/10 flex flex-col group overflow-hidden relative"
                  >
                    {/* Feature: Displays the package tag (e.g., Popular, New) if the admin assigned one */}
                    {pkg.tag && (
                      <div className="absolute top-4 left-4 z-10 bg-gold-400 text-black px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm">
                        {pkg.tag}
                      </div>
                    )}
                    <div className="aspect-video overflow-hidden">
                      {/* Feature: Automatically assigns a fallback image to keep the aesthetic intact */}
                      <img
                        src={fallbackImages[i % fallbackImages.length]}
                        alt={pkg.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-8 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <h3 className="text-2xl font-serif text-white uppercase tracking-wider">
                          {pkg.name}
                        </h3>
                        <span className="text-gold-400 font-serif text-lg shrink-0">
                          {pkg.price}
                        </span>
                      </div>


                      {/* Feature: Displays pax limitations clearly to the customer */}
                      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                        <span className="text-[10px] text-white/60 uppercase tracking-widest">
                          {pkg.pax} Guests
                        </span>
                      </div>

                      <div className="space-y-3 mb-10">
                        {/* Feature: Maps through the array of inclusions provided by the admin dashboard */}
                        {pkg.inclusions && pkg.inclusions.length > 0 ? (
                          pkg.inclusions.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <Check
                                size={12}
                                className="text-gold-400 shrink-0 mt-1"
                              />
                              <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold leading-relaxed">
                                {feature}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-white/40 italic">
                            Details available upon request.
                          </p>
                        )}
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
                ))
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
          <Link
            to="/booking"
            className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center"
          >
            Book This Collection
          </Link>
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
