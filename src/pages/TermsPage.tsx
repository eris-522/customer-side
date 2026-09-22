import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  CreditCard,
  Clock,
  Wine,
  ShieldAlert,
  Scale,
  MapPin,
  ChevronRight,
  Info,
  AlertTriangle,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { CATERING_CONTRACT_TERMS, ContractTermItem } from "../data/cateringContractTerms";

type TermCategory = "all" | "payment" | "adjustments" | "corkage" | "logistics" | "operations" | "liability" | "legal";

interface CategoryFilter {
  id: TermCategory;
  label: string;
  icon: typeof FileText;
}

const CATEGORIES: CategoryFilter[] = [
  { id: "all", label: "All Terms (20)", icon: FileText },
  { id: "payment", label: "Payment & Billing", icon: CreditCard },
  { id: "adjustments", label: "Changes & Location", icon: MapPin },
  { id: "corkage", label: "Corkage & Services", icon: Wine },
  { id: "operations", label: "Hours & Overtime", icon: Clock },
  { id: "liability", label: "Liability & Spoilage", icon: ShieldAlert },
  { id: "legal", label: "Complaints & Contract", icon: Scale },
];

export default function TermsPage() {
  const [activeCategory, setActiveCategory] = useState<TermCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTerms = useMemo(() => {
    return CATERING_CONTRACT_TERMS.filter((term) => {
      const matchesCategory =
        activeCategory === "all" ||
        term.category === activeCategory ||
        (activeCategory === "adjustments" && term.category === "logistics");

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        term.title.toLowerCase().includes(query) ||
        term.content.toLowerCase().includes(query) ||
        (term.badge && term.badge.toLowerCase().includes(query)) ||
        (term.rates &&
          term.rates.some(
            (r) =>
              r.label.toLowerCase().includes(query) ||
              r.price.toLowerCase().includes(query) ||
              (r.note && r.note.toLowerCase().includes(query))
          ));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans text-white">
      {/* Header */}
      <header className="px-6 sm:px-10 py-16 sm:py-24 text-center border-b border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <span className="text-gold-400 text-xs tracking-[0.4em] font-bold uppercase">
              Official Catering Agreement
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif text-white mb-6"
          >
            Terms & <span className="italic gold-text-gradient">Conditions</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto leading-relaxed"
          >
            Please review the standard catering policy, payment schedule, corkage rates,
            and service conditions of Roxan Policarpio Events & Catering.
          </motion.p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gold-400" /> Applicable to all bookings
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gold-400" /> Base Location: Taytay, Rizal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Controls: Search and Categories */}
        <div className="space-y-6 mb-12">
          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, corkage fees, cancellation policy..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-gold-400/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-gold-400 text-black shadow-[0_0_20px_rgba(197,160,89,0.3)]"
                      : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Highlight Callout */}
        <div className="mb-10 p-5 bg-gold-400/5 border border-gold-400/20 rounded-xl flex items-start gap-4">
          <Info className="text-gold-400 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1 text-xs sm:text-sm text-white/80 leading-relaxed">
            <p className="font-bold text-gold-300 uppercase tracking-wider">
              Important Summary of Core Requirements
            </p>
            <p>
              Down payment or reservation amounts are strictly <strong>non-refundable</strong>.
              Standard event service duration is <strong>4 hours</strong> (7:00 PM – 11:00 PM).
              All final headcount adjustments and menu changes must be submitted at least{" "}
              <strong>14 days</strong> prior to the event date.
            </p>
          </div>
        </div>

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
            <FileText size={40} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/60 text-base">No contractual terms match your search.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-4 px-6 py-2 bg-gold-400/20 text-gold-300 text-xs font-bold uppercase rounded-lg hover:bg-gold-400/30 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredTerms.map((term) => (
              <motion.article
                key={term.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 sm:p-8 bg-black/40 border border-white/10 rounded-xl hover:border-gold-400/30 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gold-400/15 border border-gold-400/30 text-gold-400 font-serif font-bold text-xs flex items-center justify-center shrink-0">
                      {term.number}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                      {term.title}
                    </h2>
                  </div>

                  {term.badge && (
                    <span className="text-[10px] sm:text-xs font-bold uppercase px-3 py-1 bg-gold-400/10 text-gold-400 border border-gold-400/20 rounded-full tracking-wider">
                      {term.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                  {term.content}
                </p>

                {/* Rates Table / Breakdowns (e.g. Corkage Fees, Overtime Services) */}
                {term.rates && term.rates.length > 0 && (
                  <div className="mt-4 pt-2">
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 text-gold-400 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-2.5 px-4">Service / Inclusions</th>
                            <th className="py-2.5 px-4 text-right">Applicable Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {term.rates.map((rate, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-white block">
                                  {rate.label}
                                </span>
                                {rate.note && (
                                  <span className="text-[11px] text-white/50 block mt-0.5 leading-snug">
                                    {rate.note}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-gold-300 whitespace-nowrap">
                                {rate.price}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Alert Notice (e.g. Overtime note, Spoilage warning) */}
                {term.alertNotice && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{term.alertNotice}</span>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-16 pt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Return to Home
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/booking"
              className="px-8 py-3.5 gold-gradient text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all rounded-sm flex items-center gap-2 shadow-lg"
            >
              Proceed to Booking <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

