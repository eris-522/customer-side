import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  image: string;
}

interface MenuSliderProps {
  category: string;
  items: MenuItem[];
  key?: any;
}

export default function MenuSlider({ category, items }: MenuSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateItemsToShow = () => {
      if (window.innerWidth < 640) setItemsToShow(1);
      else if (window.innerWidth < 1024) setItemsToShow(2);
      else if (window.innerWidth < 1280) setItemsToShow(3);
      else setItemsToShow(4);
    };
    updateItemsToShow();
    window.addEventListener('resize', updateItemsToShow);
    return () => window.removeEventListener('resize', updateItemsToShow);
  }, []);

  const next = () => {
    if (currentIndex < items.length - itemsToShow) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="py-20 border-b border-white/10 last:border-b-0">
      <div className="flex justify-between items-end mb-12 px-10">
        <div>
          <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-2 block italic">Selection</span>
          <h2 className="text-4xl md:text-5xl font-serif text-white">{category}</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={prev}
            disabled={currentIndex === 0}
            className={`p-3 border border-white/10 hover:border-gold-400 transition-all ${currentIndex === 0 ? "opacity-20 cursor-not-allowed" : "text-gold-400"}`}
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={next}
            disabled={currentIndex >= items.length - itemsToShow}
            className={`p-3 border border-white/10 hover:border-gold-400 transition-all ${currentIndex >= items.length - itemsToShow ? "opacity-20 cursor-not-allowed" : "text-gold-400"}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="relative px-10 overflow-hidden" ref={containerRef}>
        <motion.div 
          className="flex gap-8"
          animate={{ x: `calc(-${currentIndex * (100 / itemsToShow)}% - ${currentIndex * (32 / itemsToShow * (itemsToShow - 1))}px)` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {items.map((item) => (
            <div 
              key={item.id} 
              className="shrink-0 group"
              style={{ width: `calc((100% - ${(itemsToShow - 1) * 32}px) / ${itemsToShow})` }}
            >
              <div className="aspect-[4/5] mb-6 overflow-hidden bg-[#0F0F0F] relative">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />
              </div>
              <h3 className="text-xl font-serif text-white mb-2 group-hover:text-gold-400 transition-colors uppercase tracking-wider">{item.name}</h3>
              <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-[0.1em]">{item.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
