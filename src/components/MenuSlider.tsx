import { motion, AnimatePresence } from "motion/react";
import React, { useState, useRef, useEffect } from "react";
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
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const updateItemsToShow = () => {
      let newItemsToShow = 4;
      if (window.innerWidth < 640) newItemsToShow = 1;
      else if (window.innerWidth < 1024) newItemsToShow = 2;
      else if (window.innerWidth < 1280) newItemsToShow = 3;
      
      setItemsToShow(newItemsToShow);
      
      // Prevent slider from breaking/showing empty space when zooming out or resizing
      setCurrentIndex((prev) => Math.max(0, Math.min(prev, items.length - newItemsToShow)));
    };

    updateItemsToShow();
    window.addEventListener('resize', updateItemsToShow);
    return () => window.removeEventListener('resize', updateItemsToShow);
  }, [items.length]);

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
  };

  return (
    <div className="py-12 sm:py-20 border-b border-white/10 last:border-b-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8 sm:mb-12 px-4 sm:px-6 md:px-10">
          <div>
            <span className="text-gold-400 text-[10px] tracking-[0.4em] font-bold uppercase mb-2 block italic">Selection</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white">{category}</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {items.length > 0 && (
              <span className="text-xs font-mono text-white/50 sm:hidden">
                {currentIndex + 1} / {items.length}
              </span>
            )}
            <button 
              type="button"
              onClick={prev}
              disabled={currentIndex === 0}
              aria-label="Previous dish"
              className={`min-w-11 min-h-11 p-3 flex items-center justify-center border border-white/10 hover:border-gold-400 transition-all cursor-pointer ${currentIndex === 0 ? "opacity-20 cursor-not-allowed" : "text-gold-400"}`}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              type="button"
              onClick={next}
              disabled={currentIndex >= items.length - itemsToShow}
              aria-label="Next dish"
              className={`min-w-11 min-h-11 p-3 flex items-center justify-center border border-white/10 hover:border-gold-400 transition-all cursor-pointer ${currentIndex >= items.length - itemsToShow ? "opacity-20 cursor-not-allowed" : "text-gold-400"}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          className="relative px-4 sm:px-6 md:px-10 overflow-hidden touch-pan-y"
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
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
                <div className="aspect-[4/5] w-full sm:w-[90%] md:w-[85%] mb-4 sm:mb-5 overflow-hidden bg-[#0F0F0F] relative">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    onError={(e) => {
                      const fallback = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600";
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover grayscale-0 md:grayscale md:group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-xl font-serif text-white mb-2 group-hover:text-gold-400 transition-colors uppercase tracking-wider">{item.name}</h3>
                <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-[0.1em]">{item.description}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
