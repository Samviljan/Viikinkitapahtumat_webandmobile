import React from "react";
import { Link } from "react-router-dom";
import { pickLocalized } from "@/lib/i18n";
import { CAT_DOT, isoDay } from "./calendarUtils";
import { flagFor } from "@/lib/countries";
import { FileText } from "lucide-react";

export default function CalendarDayCell({ day, dayEvents, isToday, lang }) {
  if (!day) {
    return (
      <div className="min-h-[92px] sm:min-h-[120px] border-r border-b border-viking-edge p-2 last:border-r-0 bg-viking-bg/40" />
    );
  }
  return (
    <div className="min-h-[92px] sm:min-h-[120px] border-r border-b border-viking-edge p-2 last:border-r-0 bg-viking-surface">
      <div
        className={`flex items-center justify-between mb-1 ${
          isToday ? "text-viking-ember" : "text-viking-stone"
        }`}
      >
        <span
          className={`text-xs font-rune ${
            isToday ? "border border-viking-ember rounded-sm px-1.5 py-0.5" : ""
          }`}
        >
          {day.getDate()}
        </span>
        {dayEvents.length > 1 && (
          <span className="text-[9px] font-rune text-viking-gold">
            +{dayEvents.length - 1}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {dayEvents.slice(0, 2).map((ev) => (
          <Link
            key={ev.id + isoDay(day)}
            to={`/events/${ev.id}`}
            data-testid={`cal-event-${ev.id}`}
            className="block group"
          >
            <div className="flex items-start gap-1.5">
              <span
                className={`mt-1 inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  CAT_DOT[ev.category] || CAT_DOT.other
                }`}
              />
              <span className="text-[11px] leading-tight text-viking-bone group-hover:text-viking-gold line-clamp-2">
                <span aria-hidden="true" className="mr-1">
                  {flagFor(ev.country || "FI")}
                </span>
                {pickLocalized(ev, lang, "title")}
                {ev.program_pdf_url ? (
                  <FileText
                    size={9}
                    className="inline ml-1 text-viking-gold align-baseline"
                    aria-label="Tapahtuman ohjelma saatavilla"
                  />
                ) : null}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
