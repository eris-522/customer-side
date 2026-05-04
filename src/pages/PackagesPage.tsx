import { motion } from "motion/react";
import { ChevronRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

const packages = [
  {
    id: "bronze",
    name: "Bronze Package",
    price: "₱350/px",
    description: "Perfect for intimate gatherings and small family events. Quality service at an accessible price point.",
    features: ["Standard Buffet Set-up", "Choice of 3 Main Courses", "Steamed Rice", "1 Dessert", "Unlimited Iced Tea"],
    image: "https://images.unsplash.com/photo-1547825407-2d060104b7f8?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "silver",
    name: "Silver Package",
    price: "₱450/px",
    description: "Ideal for corporate meetings or medium-sized celebrations requiring a touch of sophistication.",
    features: ["Elegant Buffet Display", "Choice of 4 Main Courses", "Pasta or Vegetable Dish", "2 Desserts", "Fruit Juice"],
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "gold",
    name: "Gold Package",
    price: "₱650/px",
    description: "Our premium full-service offering for large-scale events and gala dinners. Pure luxury.",
    features: ["Premium Thematic Set-up", "Choice of 5 Main Courses", "Premium Dessert Bar", "Uniformed Waitstaff", "Free Tasting for 2"],
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "wedding",
    name: "Wedding Package",
    price: "Custom",
    description: "A comprehensive package designed to make your special day stress-free and gastronomically divine.",
    features: ["Full Event Styling", "Multi-course Menu", "Couple's Table Service", "Champagne Toast", "Bridal Assistance"],
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "birthday",
    name: "Birthday Package",
    price: "₱500/px",
    description: "Vibrant and celebratory menus tailored to the birthday star's favorite flavors and style.",
    features: ["Themed Buffet Layout", "Kid-Friendly Options", "Custom Birthday Cake", "Balloons & Party Decor", "Sound System"],
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "christening",
    name: "Christening Package",
    price: "₱400/px",
    description: "Soft, elegant themes and family-style menus to celebrate your child's first step into faith.",
    features: ["Whimsical Pastel Styling", "Family Platter Service", "Candy & Cupcake Corner", "Commemorative Souvenir", "Peaceful Ambience"],
    image: "https://images.unsplash.com/photo-1510076857177-74700760be15?auto=format&fit=crop&q=80&w=800"
  }
];

export default function PackagesPage() {
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
          From intimate gatherings to grand celebrations, find the perfect curation for your event's specific needs and scale.
        </motion.p>
      </header>

      {/* Grid Section */}
      <section className="py-20 px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card border border-white/10 flex flex-col group overflow-hidden"
            >
              <div className="aspect-video overflow-hidden">
                <img 
                  src={pkg.image} 
                  alt={pkg.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-serif text-white uppercase tracking-wider">{pkg.name}</h3>
                  <span className="text-gold-400 font-serif text-lg">{pkg.price}</span>
                </div>
                <p className="text-[11px] text-white/40 uppercase tracking-widest leading-loose mb-8 font-medium italic">
                  {pkg.description}
                </p>
                
                <div className="space-y-3 mb-10">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check size={12} className="text-gold-400 shrink-0" />
                      <span className="text-[10px] text-white/60 uppercase tracking-widest font-semibold">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                    <button className="w-full py-4 border border-gold-400/20 text-gold-400 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-gold-400 hover:text-black transition-all flex items-center justify-center gap-3">
                      View Details <ChevronRight size={14} />
                    </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-10 border-t border-white/10 bg-[#070707]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-8 block italic">Begin Your Journey</span>
            <h2 className="text-4xl md:text-7xl font-serif text-white mb-12 leading-tight">Tailored to your <br /> <span className="italic">unique</span> vision.</h2>
            <Link 
              to="/booking"
              className="gold-gradient text-black px-16 py-5 font-bold tracking-widest uppercase text-xs hover:brightness-110 transition-all inline-block text-center"
            >
               Book This Collection
            </Link>
            <div className="mt-12 flex items-center gap-4">
               <div className="w-12 h-[1px] bg-white/10"></div>
               <Link to="/" className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-gold-400 transition-colors font-bold">Return to Home</Link>
               <div className="w-12 h-[1px] bg-white/10"></div>
            </div>
        </div>
      </section>
    </div>
  );
}
