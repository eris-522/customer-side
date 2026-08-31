import { useState } from "react";
import { Link } from "react-router-dom";
import { useCMS } from "../context/CMSContext";
import { Sparkles, ArrowRight, X } from "lucide-react";

export function AnnouncementBanner() {
  const { cms } = useCMS();
  const { announcement } = cms;
  const [isDismissed, setIsDismissed] = useState(false);

  if (!announcement || !announcement.enabled || !announcement.message || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-gold-400 to-amber-600 text-black py-2.5 px-6 text-center text-xs font-semibold tracking-wide relative z-50 shadow-md border-b border-black/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-center gap-2 text-center flex-wrap">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs tracking-tight sm:tracking-normal">{announcement.message}</span>
          {announcement.linkText && announcement.linkUrl && (
            <Link
              to={announcement.linkUrl}
              className="underline underline-offset-2 flex items-center gap-1 hover:opacity-80 transition-opacity uppercase text-[10px] tracking-widest font-black ml-2 text-black bg-white/20 px-2 py-0.5 rounded"
            >
              <span>{announcement.linkText}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-black/70 hover:text-black p-1 transition-colors cursor-pointer shrink-0"
          title="Dismiss announcement"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
