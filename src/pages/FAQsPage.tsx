import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  HelpCircle,
  X,
  Calendar,
  Utensils,
  Truck,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  CreditCard,
  Clock,
  Wine,
  Scale,
} from "lucide-react";
import { useCMS } from "../context/CMSContext";

const CATEGORY_ICONS: Record<string, any> = {
  All: HelpCircle,
  "Payment & Billing": CreditCard,
  "Policies & Payment": CreditCard,
  Booking: Calendar,
  "Changes & Location": Truck,
  "Corkage & Services": Wine,
  "Hours & Overtime": Clock,
  "Operations & Hours": Clock,
  "Menu & Tasting": Utensils,
  Menu: Utensils,
  "Logistics & Venues": Truck,
  Logistics: Truck,
  "Liability & Spoilage": ShieldCheck,
  "Complaints & Contract": Scale,
};

function resolveTermId(item: any): string {
  if (item.termId && typeof item.termId === "string") return item.termId;
  const text = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
  if (text.includes("cancel") || text.includes("refund")) return "cancellation";
  if (text.includes("down payment") || text.includes("deposit") || text.includes("reserve")) return "down-payment";
  if (text.includes("billing") || text.includes("balance") || text.includes("15 days")) return "billing";
  if (text.includes("installment")) return "installment-basis";
  if (text.includes("change") || text.includes("adjust") || text.includes("14 days")) return "changes";
  if (text.includes("corkage") || text.includes("lechon") || text.includes("outside food") || text.includes("drinks")) return "corkage-fees";
  if (text.includes("hour") || text.includes("overtime") || text.includes("4 hours")) return "exceeding-hours";
  if (text.includes("out of town") || text.includes("taytay") || text.includes("provinces")) return "out-of-town-charges";
  if (text.includes("hauling") || text.includes("floor") || text.includes("elevator")) return "hauling-fee";
  if (text.includes("spoil") || text.includes("leftover") || text.includes("take-out")) return "food-spoilage";
  if (text.includes("damage") || text.includes("breakage") || text.includes("stolen")) return "insurance-indemnification";
  if (text.includes("complaint")) return "complaints";
  return "";
}

/**
 * Parses markdown-like **bold** text inside answers into real <strong> tags
 */
function renderFormattedAnswer(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function FAQsPage() {
  const { cms } = useCMS();
  const { faqs, contact } = cms;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>("faq-cancellation");

  // Active items
  const activeItems = useMemo(() => {
    return (faqs?.items || []).filter((item) => item.active !== false);
  }, [faqs?.items]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    activeItems.forEach((item) => {
      if (item.category && item.category.trim() !== "") {
        cats.add(item.category.trim());
      }
    });
    return ["All", ...Array.from(cats)];
  }, [activeItems]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: activeItems.length };
    activeItems.forEach((item) => {
      const cat = item.category?.trim() || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [activeItems]);

  // Filtered FAQs
  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" ||
        item.category?.toLowerCase() === selectedCategory.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [activeItems, selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-6 sm:px-10 py-16 sm:py-20 text-center border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400/10 via-transparent to-transparent pointer-events-none" />

        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[11px] tracking-[0.4em] font-bold uppercase mb-3 block"
        >
          {faqs?.subtitle || "Policies & Common Inquiries"}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-serif text-white mb-4"
        >
          Frequently Asked{" "}
          <span className="italic gold-text-gradient">Questions</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs uppercase tracking-[0.25em] text-white/50 max-w-xl mx-auto leading-relaxed"
        >
          Quick answers regarding our catering policies, payments, corkage, and service hours.
        </motion.p>
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* Clean, Simple Top Notice */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/60">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-gold-400 shrink-0" />
            <span>
              All policies are derived from our official{" "}
              <strong className="text-white">Catering Service Agreement</strong>.
            </span>
          </div>
          <Link
            to="/terms"
            className="text-gold-400 hover:text-white font-bold transition-colors inline-flex items-center gap-1 shrink-0"
          >
            <span>Read Terms & Conditions</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic (cancellation, downpayment, corkage, overtime, leftovers)..."
              className="w-full bg-[#111111] border border-white/10 rounded-full pl-11 pr-10 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer p-1"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {categories.map((category) => {
              const isSelected = selectedCategory === category;
              const count = categoryCounts[category] || 0;
              const IconComponent = CATEGORY_ICONS[category] || HelpCircle;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "gold-gradient text-black border-gold-400 shadow-sm font-extrabold"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-white/10"
                  }`}
                >
                  <IconComponent
                    className={`w-3 h-3 ${isSelected ? "text-black" : "text-gold-400"}`}
                  />
                  <span>{category}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-black/20 text-black font-black"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accordion Questions List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/15 rounded-xl bg-[#0d0d0d] space-y-3">
              <HelpCircle className="w-8 h-8 text-gold-400/40 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-serif text-white">
                  No matching questions found
                </h3>
                <p className="text-xs text-white/40">
                  Try adjusting your search query or browse our terms.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="px-4 py-2 gold-gradient text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:brightness-110 transition-all cursor-pointer"
                >
                  Reset
                </button>
                <Link
                  to="/terms"
                  className="px-4 py-2 border border-white/20 text-white hover:text-gold-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                >
                  View Terms
                </Link>
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isOpen = expandedId === item.id;
              const targetTermId = resolveTermId(item);

              return (
                <div
                  key={item.id || idx}
                  className={`border transition-all duration-200 rounded-xl overflow-hidden ${
                    isOpen
                      ? "border-gold-400/40 bg-[#121212]"
                      : "border-white/10 bg-[#0c0c0c] hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {item.category && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-gold-400/80 bg-gold-400/10 px-2 py-0.5 rounded border border-gold-400/20">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-sm sm:text-base font-serif leading-snug transition-colors ${
                          isOpen ? "text-white font-bold" : "text-white/90"
                        }`}
                      >
                        {item.question}
                      </h3>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-full border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 bg-gold-400 text-black border-gold-400" : "text-white/40"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-2 border-t border-white/10 text-xs sm:text-sm text-white/70 leading-relaxed font-sans space-y-3">
                          <p className="whitespace-pre-line">{renderFormattedAnswer(item.answer)}</p>

                          <div className="pt-1">
                            <Link
                              to={targetTermId ? `/terms#${targetTermId}` : "/terms"}
                              className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-white font-semibold transition-colors group"
                            >
                              <FileText className="w-3.5 h-3.5 text-gold-400" />
                              <span>
                                View clause in <strong>Terms & Conditions</strong>
                              </span>
                              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Clean, Simple Bottom Assistance Footer */}
        <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60 text-center sm:text-left">
          <div>
            <p className="leading-relaxed">
              Need full legal details? Read our official{" "}
              <Link to="/terms" className="text-gold-400 font-bold hover:underline">
                Terms & Conditions
              </Link>
              .
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Have specific questions? Contact our team at{" "}
              <strong className="text-white/70">{contact.phone || "+63 921 469 7142"}</strong> or{" "}
              <strong className="text-white/70">{contact.email || "rpcatering@gmail.com"}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/contact"
              className="px-4 py-2 border border-white/20 hover:border-gold-400 text-white hover:text-gold-400 font-bold rounded-lg text-xs transition-colors"
            >
              Contact Us
            </Link>
            <Link
              to="/booking"
              className="px-5 py-2 gold-gradient text-black font-bold rounded-lg text-xs hover:brightness-110 transition-all shadow"
            >
              Inquire Now
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
