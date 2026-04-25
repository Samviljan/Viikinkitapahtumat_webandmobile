import React, { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarDayCell from "@/components/calendar/CalendarDayCell";
import {
  startOfMonth,
  addMonths,
  isoDay,
  sameDay,
  buildMonthGrid,
  buildEventsByDay,
} from "@/components/calendar/calendarUtils";

export default function EventCalendar({ events }) {
  const { t, lang } = useI18n();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDay = useMemo(() => buildEventsByDay(events), [events]);

  const today = new Date();
  const monthLabel = `${t("months")[cursor.getMonth()]} ${cursor.getFullYear()}`;

  return (
    <div className="carved-card rounded-sm overflow-hidden" data-testid="event-calendar">
      <CalendarHeader
        label={monthLabel}
        onPrev={() => setCursor(addMonths(cursor, -1))}
        onNext={() => setCursor(addMonths(cursor, 1))}
      />

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

      <div className="grid grid-cols-7">
        {grid.map((day, idx) => {
          const dayEvents = day ? eventsByDay.get(isoDay(day)) || [] : [];
          const isToday = day && sameDay(day, today);
          const cellKey = day ? isoDay(day) : `empty-${idx}`;
          return (
            <CalendarDayCell
              key={cellKey}
              day={day}
              dayEvents={dayEvents}
              isToday={isToday}
              lang={lang}
            />
          );
        })}
      </div>
    </div>
  );
}
