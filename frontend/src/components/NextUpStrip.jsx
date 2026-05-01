import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { flagFor } from "@/lib/countries";

/**
 * "Mitä seuraavaksi" strip — mobile-first prominent section showing the 3
 * chronologically next upcoming events in a compact list view. Designed to
 * be the first thing a user sees after the hero: scannable in 3 seconds,
 * one tap takes you to the event detail.
 *
 * Visual language: carved-card frame + a vertical timeline rail on the left
 * so each event card feels sequential ("next, then, then"). Each row has
 * day/month on the left, title + location mid-line, CTA arrow on the right.
 *
 * Empty state still renders the eyebrow/title so users know the feature
 * exists — removes the "is it broken?" confusion when the calendar happens
 * to be quiet.
 */

function formatDayMonth(dateStr, lang) {
  if (!dateStr) return { day: "—", month: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "—", month: "" };
  const locale = lang === "fi" ? "fi-FI" : lang === "sv" ? "sv-SE" : lang || "en";
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(locale, { month: "short" }).replace(".", ""),
  };
}

function formatDateRange(start, end, lang) {
  if (!start) return "";
  const locale = lang === "fi" ? "fi-FI" : lang === "sv" ? "sv-SE" : lang || "en";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (isNaN(s.getTime())) return "";
  const sameDay = !e || start === end;
  if (sameDay) return s.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const sameMonth = e && s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString(locale, { month: "short" })}`;
  }
  return `${s.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${e.toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
}

function NextUpRow({ event, index, total }) {
  const { t, lang } = useI18n();
  const title = pickLocalized(event, lang, "title") || event.title_fi || "—";
  const { day, month } = formatDayMonth(event.start_date, lang);
  const dateRange = formatDateRange(event.start_date, event.end_date, lang);
  const country = event.country ? flagFor(event.country) : "";
  const isLast = index === total - 1;

  return (
    <Link
      to={`/events/${event.id}`}
      data-testid={`next-up-row-${event.id}`}
      className="relative flex items-stretch gap-4 py-4 px-1 sm:px-2 group hover:bg-viking-surface2/40 rounded-sm transition-colors"
    >
      {/* Timeline rail + date chip */}
      <div className="relative flex-shrink-0 w-14 sm:w-16 text-center">
        <div className="relative z-10 bg-viking-bg border border-viking-gold/40 rounded-sm py-1.5 px-1 font-rune text-[10px] text-viking-gold uppercase tracking-wider leading-none">
          <div className="text-2xl sm:text-3xl text-viking-bone font-serif leading-none mb-0.5">
            {day}
          </div>
          <div>{month}</div>
        </div>
        {/* Connecting line to next row */}
        {!isLast ? (
          <div
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 top-[72%] h-[140%] w-px bg-viking-edge"
          />
        ) : null}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-serif text-base sm:text-lg text-viking-bone leading-snug group-hover:text-viking-gold transition-colors line-clamp-2">
          {title}
        </h3>
        <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] sm:text-xs text-viking-stone">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            {dateRange}
          </span>
          {event.location ? (
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin size={11} className="flex-shrink-0" />
              <span className="truncate max-w-[12rem] sm:max-w-xs">{event.location}</span>
              {country ? <span aria-hidden="true">{country}</span> : null}
            </span>
          ) : null}
        </div>
      </div>

      {/* CTA arrow — desktop only, keeps mobile row narrow */}
      <div className="hidden sm:flex items-center text-viking-stone group-hover:text-viking-gold transition-colors">
        <ArrowRight size={18} />
      </div>
    </Link>
  );
}

export default function NextUpStrip({ events = [] }) {
  const { t } = useI18n();

  return (
    <section
      data-testid="next-up-section"
      className="mx-auto max-w-4xl px-4 sm:px-8 pt-8 sm:pt-12"
    >
      <div className="carved-card rounded-sm border-viking-gold/30">
        <header className="px-5 sm:px-7 pt-5 pb-4 border-b border-viking-edge flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-viking-gold text-[10px] sm:text-xs uppercase tracking-[0.2em] font-rune mb-1">
              <Sparkles size={12} className="fill-viking-gold" />
              {t("home.next_up_eyebrow")}
            </div>
            <h2 className="font-serif text-xl sm:text-2xl text-viking-bone">
              {t("home.next_up_title")}
            </h2>
          </div>
          <Link
            to="/events"
            data-testid="next-up-all-link"
            className="text-xs text-viking-gold hover:text-viking-bone font-rune uppercase tracking-wider inline-flex items-center gap-1"
          >
            {t("home.next_up_all")} <ArrowRight size={12} />
          </Link>
        </header>

        <div className="px-3 sm:px-5 pb-2">
          {events.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-viking-stone text-sm italic">
                {t("home.next_up_empty")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-viking-edge/60">
              {events.map((e, idx) => (
                <NextUpRow
                  key={e.id}
                  event={e}
                  index={idx}
                  total={events.length}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
