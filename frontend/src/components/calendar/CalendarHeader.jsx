import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CalendarHeader({ label, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-viking-edge bg-viking-surface2/40">
      <button
        data-testid="cal-prev"
        onClick={onPrev}
        className="p-2 rounded-sm border border-viking-edge text-viking-bone hover:text-viking-gold hover:border-viking-gold transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center">
        <div className="text-overline">Almanac</div>
        <div className="font-serif text-2xl text-viking-bone mt-0.5">{label}</div>
      </div>
      <button
        data-testid="cal-next"
        onClick={onNext}
        className="p-2 rounded-sm border border-viking-edge text-viking-bone hover:text-viking-gold hover:border-viking-gold transition-colors"
        aria-label="Next month"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
