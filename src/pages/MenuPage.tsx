import { motion } from "motion/react";
import MenuSlider, { MenuItem } from "../components/MenuSlider";
import { Link } from "react-router-dom";

const menuData: Record<string, MenuItem[]> = {
  "Main Course": [
    { id: 1, name: "Main", description: "Blabla", image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600" },
    { id: 2, name: "Main", description: "Blabla", image: "https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&q=80&w=600" },
    { id: 3, name: "Main", description: "Blabla", image: "https://images.unsplash.com/photo-1556761108-471a15328f4e?auto=format&fit=crop&q=80&w=600" },
    { id: 4, name: "Main", description: "Blabla", image: "https://images.unsplash.com/photo-1518492104633-c3ed9e754ff2?auto=format&fit=crop&q=80&w=600" },
    { id: 5, name: "Main", description: "Blabla", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600" },
  ],
  "Appetizers": [
    { id: 1, name: "Appetizers", description: "Blabla", image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600" },
    { id: 2, name: "Appetizers", description: "Blabla", image: "https://images.unsplash.com/photo-1505911467541-2530bc3410c9?auto=format&fit=crop&q=80&w=600" },
    { id: 3, name: "Appetizers", description: "Blabla", image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=600" },
    { id: 4, name: "Appetizers", description: "Blabla", image: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80&w=600" },
    { id: 5, name: "Appetizers", description: "Blabla", image: "https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&q=80&w=600" },
  ],
  "Soups": [
    { id: 1, name: "Soups", description: "Blabla", image: "https://images.unsplash.com/photo-1547592110-823995fc528f?auto=format&fit=crop&q=80&w=600" },
    { id: 2, name: "Soups", description: "Blabla", image: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&q=80&w=600" },
    { id: 3, name: "Soups", description: "Blabla", image: "https://images.unsplash.com/photo-1545093149-618ce3bcf49d?auto=format&fit=crop&q=80&w=600" },
    { id: 4, name: "Soups", description: "Blabla", image: "https://images.unsplash.com/photo-1547592166-73ac4570fbad?auto=format&fit=crop&q=80&w=600" },
  ],
  "Starters": [
    { id: 1, name: "Starters", description: "Blabla", image: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?auto=format&fit=crop&q=80&w=600" },
    { id: 2, name: "Starters", description: "Blabla", image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80&w=600" },
    { id: 3, name: "Starters", description: "Blabla", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600" },
    { id: 4, name: "Starters", description: "Blabla", image: "https://images.unsplash.com/photo-1515544837642-7608146aa2b3?auto=format&fit=crop&q=80&w=600" },
  ]
};

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-rich-black pt-24 font-sans">
      <header className="px-10 py-20 text-center border-b border-white/10">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-gold-400 text-[12px] tracking-[0.5em] font-bold uppercase mb-6 block"
        >
          Blalbla
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
          Lorem ipsum
        </motion.p>
      </header>

      <section className="bg-rich-black">
        {Object.entries(menuData).map(([category, items], i) => (
          <MenuSlider key={category} category={category} items={items} />
        ))}
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Reserve Your Experience</span>
            <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight">Ready to taste <br /> <span className="italic">extraordinary</span> service?</h2>
            <Link 
              to="/booking"
              className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center"
            >
               Start Your Booking Flow
            </Link>
            <div className="mt-12 flex items-center gap-4">
               <div className="w-12 h-[1px] bg-white/10"></div>
               <Link to="/" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors">Return to Home</Link>
               <div className="w-12 h-[1px] bg-white/10"></div>
            </div>
        </div>
      </section>
    </div>
  );
}
