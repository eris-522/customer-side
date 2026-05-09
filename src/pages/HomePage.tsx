import { motion } from "motion/react";
import { ChevronRight, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export interface CateringPackage {
  id: string;
  name: string;
  price: string;
  pax: string;
  tag?: string;
  inclusions: string[];
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
];

const steps = [
  {
    number: "01",
    title: "Choose your package",
    text: "Select from our range of budget-friendly, premium catering collections designed for any occasion."
  },
  {
    number: "02",
    title: "Customize your package",
    text: "Personalize your menu and services to align with your taste, dietary needs, and event theme."
  },
  {
    number: "03",
    title: "Confirm booking",
    text: "Finalize your reservation and relax while we deliver a seamless dining experience."
  }
];

export default function HomePage() {
  const [packages, setPackages] = useState<CateringPackage[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .neq("status", "Archived")
        .limit(3);
      
      if (data) {
        setPackages(data as CateringPackage[]);
      }
    };
    fetchPackages();
  }, []);

  return (
    <div className="min-h-screen bg-rich-black overflow-hidden font-sans">
      {/* Hero Section */}
      <section id="home" className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-rich-black/70 via-rich-black/70 to-rich-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2000"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-20 text-center px-6 max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gold-400 font-semibold tracking-[0.5em] uppercase text-[12px] mb-6 block"
          >
            Exquisite Culinary Experiences
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-7xl font-serif leading-tight mb-8"
          >
            Affordable Elegance,<br /><span className="italic">Unforgettable Events</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <Link to="/booking" className="gold-gradient text-black px-10 py-3 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center focus:outline-none">
              Book Catering
            </Link>
            <Link to="/menu" className="border border-white text-white px-10 py-3 font-bold tracking-widest uppercase text-xs hover:bg-white hover:text-black transition-all inline-block text-center">
              View Menu
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Packages */}
      <section id="packages" className="py-24 px-10 bg-rich-black relative border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-20 gap-8">
            <div className="max-w-2xl">
              <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic">Featured Packages</span>
              <h2 className="text-4xl md:text-6xl font-serif tracking-tight">Luxury <span className="italic">Catering</span> Collections</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white/10">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className={`p-10 flex flex-col justify-between group hover:bg-[#0F0F0F] transition-colors ${i < 2 ? 'md:border-r border-white/10' : ''}`}
              >
                <div>
                  <div className="aspect-[16/9] mb-8 overflow-hidden relative">
                    {pkg.tag && (
                      <div className="absolute top-4 left-4 z-10 bg-gold-400 text-black px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm">
                        {pkg.tag}
                      </div>
                    )}
                    <img 
                      src={fallbackImages[i % fallbackImages.length]} 
                      alt={pkg.name}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                  <h3 className="text-2xl font-serif text-white mb-2">{pkg.name}</h3>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest mb-6">{pkg.price} • {pkg.pax} Guests</p>
                  <p className="text-white/40 text-xs mb-8 leading-relaxed line-clamp-3">
                    {pkg.inclusions && pkg.inclusions.length > 0 
                      ? pkg.inclusions.join(" • ")
                      : "Details available upon request."}
                  </p>
                </div>
                <Link 
                  to="/packages" 
                  className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  EXPLORE <ChevronRight size={12} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Work */}
      <section id="process" className="bg-rich-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3">
           <div className="p-16 md:p-20 border-r border-white/10 bg-[#0F0F0F]">
              <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-12 block italic">The Process</span>
              <div className="space-y-12">
                {steps.map((step, i) => (
                  <div key={step.number} className="flex gap-6">
                    <span className="serif text-3xl gold-text-gradient opacity-50 italic shrink-0">{step.number}</span>
                    <div>
                      <p className="font-bold text-xs uppercase tracking-widest mb-2 text-white">{step.title}</p>
                      <p className="text-[10px] text-white/40 leading-relaxed font-medium">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="p-16 md:p-20 border-r border-white/10 flex flex-col justify-center bg-black col-span-1 md:col-span-2">
              <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Customer Review</span>
              <div className="max-w-xl">
                 <Quote className="text-gold-400/10 mb-8" size={64} />
                 <p className="serif text-2xl md:text-3xl italic leading-relaxed mb-8 text-white/90 font-light">
                  "Roxan Policarpio Events & Catering made our dream wedding a reality. The food was absolutely exquisite, the presentation was flawless, and it didn't break the bank. Truly exceptional service!"
                 </p>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-[1px] bg-gold-400"></div>
                   <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-gold-400">Maria Santos</span>
                 </div>
              </div>
           </div>
        </div>
      </section>
      {/* Contact Section */}
      <section id="contact" className="py-32 px-10 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
           <div className="max-w-md">
              <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-4 block italic">Get In Touch</span>
              <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">Let's craft your <span className="italic">perfect</span> event together.</h2>
              <p className="text-white/40 text-xs leading-relaxed uppercase tracking-widest">Available for weddings, corporate galas, and private celebrations across the region.</p>
           </div>
           <div className="flex flex-col gap-6 items-start md:items-end">
              <a href="mailto:rpcatering@gmail.com" className="text-2xl md:text-4xl font-serif text-gold-400 hover:text-white transition-colors italic">rpcatering@gmail.com</a>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold">+63 921 469 7142</p>
           </div>
        </div>
      </section>
    </div>
  );
}
