import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function isoDay(d) {
  return d.toISOString().slice(0, 10);
}
function sameDay(a, b) {
  return isoDay(a) === isoDay(b);
}

const CAT_DOT = {
  market: "bg-viking-gold",
  training_camp: "bg-viking-ember",
  course: "bg-emerald-500/80",
  festival: "bg-amber-400",
  meetup: "bg-viking-stone",
  other: "bg-viking-stone",
};

export default function EventCalendar({ events }) {
  const { t, lang } = useI18n();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    // Monday=0 view: getDay() returns 0=Sun..6=Sat. Shift so Mon=0.
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const e of events || []) {
      if (!e.start_date) continue;
      const start = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : start;
      const cur = new Date(start);
      while (cur <= end) {
        const key = isoDay(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const today = new Date();
  const monthLabel = `${t("months")[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <div className="carved-card rounded-sm overflow-hidden" data-testid="event-calendar">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-viking-edge bg-viking-surface2/40">
        <button
          data-testid="cal-prev"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="p-2 rounded-sm border border-viking-edge text-viking-bone hover:text-viking-gold hover:border-viking-gold transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-overline">Almanac</div>
          <div className="font-serif text-2xl text-viking-bone mt-0.5">{monthLabel}</div>
        </div>
        <button
          data-testid="cal-next"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-2 rounded-sm border border-viking-edge text-viking-bone hover:text-viking-gold hover:border-viking-gold transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* weekday header */}
      <div className="grid grid-cols-7 border-b border-viking-edge">
        {t("weekdays_short").map((wd) => (
          <div
            key={wd}
            className="text-center font-rune text-[10px] text-viking-stone py-3 border-r border-viking-edge last:border-r-0"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const dayEvents = day ? eventsByDay.get(isoDay(day)) || [] : [];
          const isToday = day && sameDay(day, today);
          return (
            <div
              key={idx}
              className={`min-h-[92px] sm:min-h-[120px] border-r border-b border-viking-edge p-2 last:border-r-0 ${
                day ? "bg-viking-surface" : "bg-viking-bg/40"
              }`}
            >
              {day && (
                <>
                  <div
                    className={`flex items-center justify-between mb-1 ${
                      isToday ? "text-viking-ember" : "text-viking-stone"
                    }`}
                  >
                    <span
                      className={`text-xs font-rune ${
                        isToday
                          ? "border border-viking-ember rounded-sm px-1.5 py-0.5"
                          : ""
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
                            {pickLocalized(ev, lang, "title")}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
