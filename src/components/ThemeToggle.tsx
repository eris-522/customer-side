import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Monitor, ChevronDown, Check } from "lucide-react";
import { useTheme, ThemeMode } from "../context/ThemeContext";

interface ThemeToggleProps {
  variant?: "compact" | "segmented" | "footer" | "dropdown";
  className?: string;
  showLabels?: boolean;
}

export function ThemeToggle({
  variant = "compact",
  className = "",
  showLabels = false,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Segmented Pill Variant (Perfect for mobile menu and settings modals)
  if (variant === "segmented") {
    const options: { mode: ThemeMode; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
      { mode: "light", label: "Light", icon: Sun },
      { mode: "system", label: "System", icon: Monitor },
      { mode: "dark", label: "Dark", icon: Moon },
    ];

    return (
      <div
        role="radiogroup"
        aria-label="Theme mode selector"
        className={`inline-flex items-center p-1 rounded-full border border-gold-400/25 bg-black/5 dark:bg-white/5 backdrop-blur-md transition-all ${className}`}
      >
        {options.map((opt) => {
          const isSelected = theme === opt.mode;
          const Icon = opt.icon;
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.mode)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer z-10 ${
                isSelected
                  ? "text-black dark:text-black font-bold"
                  : "text-stone-700 dark:text-stone-300 hover:text-gold-500 dark:hover:text-gold-300"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="segmented-theme-indicator"
                  className="absolute inset-0 rounded-full gold-gradient shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <Icon size={14} className="shrink-0" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Footer Subtle Indicator Variant
  if (variant === "footer") {
    return (
      <div className={`inline-flex items-center gap-3 text-xs tracking-wider ${className}`}>
        <span className="text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-[0.2em] font-semibold">
          Theme:
        </span>
        <div className="inline-flex rounded-md border border-gold-400/20 bg-stone-100/80 dark:bg-stone-900/80 p-0.5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            title="Switch to Light Theme (Warm Alabaster)"
            aria-label="Light mode"
            className={`p-1.5 rounded transition-all cursor-pointer ${
              theme === "light"
                ? "bg-gold-500 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-gold-600 dark:hover:text-gold-300"
            }`}
          >
            <Sun size={13} />
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            title={`System Preference (${resolvedTheme === "dark" ? "Dark" : "Light"})`}
            aria-label="System theme"
            className={`p-1.5 rounded transition-all cursor-pointer ${
              theme === "system"
                ? "bg-gold-500 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-gold-600 dark:hover:text-gold-300"
            }`}
          >
            <Monitor size={13} />
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            title="Switch to Dark Theme (Rich Charcoal)"
            aria-label="Dark mode"
            className={`p-1.5 rounded transition-all cursor-pointer ${
              theme === "dark"
                ? "bg-gold-500 text-white shadow-xs"
                : "text-stone-600 dark:text-stone-400 hover:text-gold-600 dark:hover:text-gold-300"
            }`}
          >
            <Moon size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Dropdown Variant (Click to open menu with Light, Dark, System)
  if (variant === "dropdown") {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold-400/25 bg-white/70 dark:bg-black/40 backdrop-blur-md text-stone-800 dark:text-stone-200 hover:border-gold-400 transition-all text-xs font-semibold cursor-pointer shadow-xs"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          aria-label={`Current theme: ${theme}. Click to change theme.`}
        >
          <span className="relative w-4 h-4 flex items-center justify-center">
            {resolvedTheme === "dark" ? (
              <Moon size={14} className="text-gold-400" />
            ) : (
              <Sun size={14} className="text-gold-600" />
            )}
          </span>
          <span className="capitalize">{theme === "system" ? "Auto" : theme}</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-36 rounded-xl glass-card border border-gold-400/30 p-1.5 shadow-xl z-50 overflow-hidden"
            >
              {[
                { mode: "light" as ThemeMode, label: "Light", icon: Sun },
                { mode: "dark" as ThemeMode, label: "Dark", icon: Moon },
                { mode: "system" as ThemeMode, label: "System", icon: Monitor },
              ].map((item) => {
                const isItemActive = theme === item.mode;
                const Icon = item.icon;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => {
                      setTheme(item.mode);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                      isItemActive
                        ? "bg-gold-400/15 text-gold-600 dark:text-gold-400 font-bold"
                        : "text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={14} />
                      {item.label}
                    </span>
                    {isItemActive && <Check size={12} className="text-gold-500" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default: Compact Icon Button with Smooth Micro-Animation
  const nextTarget = resolvedTheme === "dark" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Toggle theme (currently ${theme}). Switch to ${nextTarget} mode.`}
      title={`Theme: ${theme.toUpperCase()} (${resolvedTheme === "dark" ? "Dark" : "Light"}). Click to switch to ${nextTarget} mode.`}
      className={`relative inline-flex items-center justify-center p-2 rounded-full border border-gold-400/30 bg-stone-100/80 dark:bg-white/5 hover:border-gold-400 text-stone-800 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300 transition-all cursor-pointer backdrop-blur-md shadow-xs active:scale-95 group ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === "dark" ? (
          <motion.div
            key="dark-icon"
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center justify-center text-gold-300"
          >
            <Moon size={18} strokeWidth={2} />
          </motion.div>
        ) : (
          <motion.div
            key="light-icon"
            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex items-center justify-center text-gold-700"
          >
            <Sun size={18} strokeWidth={2} />
          </motion.div>
        )}
      </AnimatePresence>

      {showLabels && (
        <span className="ml-2 text-xs font-bold tracking-wider uppercase text-stone-700 dark:text-stone-300">
          {resolvedTheme === "dark" ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
