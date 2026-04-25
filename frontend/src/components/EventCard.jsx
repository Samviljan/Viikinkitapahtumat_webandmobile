import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowUpRight } from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";
import FavoriteButton from "@/components/FavoriteButton";
import RemindMeButton from "@/components/RemindMeButton";

export default function EventCard({ event, compact = false }) {
  const { lang, t } = useI18n();
  const title = pickLocalized(event, lang, "title");
  const desc = pickLocalized(event, lang, "description");

  const dateLabel = formatDateRange(event.start_date, event.end_date, lang);
  const categoryLabel = t(`cats.${event.category}`);

  return (
    <Link
      to={`/events/${event.id}`}
      data-testid={`event-card-${event.id}`}
      className="group relative block carved-card rounded-sm overflow-hidden hover:border-viking-gold/40 transition-colors"
    >
      {!compact && event.image_url ? (
        <div className="relative h-44 overflow-hidden">
          <img
            src={event.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-viking-surface via-viking-surface/40 to-transparent" />
          {/* Single-color category bar across the image */}
          <div
            data-testid={`event-card-cat-${event.id}`}
            className="absolute top-0 left-0 right-0 bg-viking-ember/95 text-viking-bone font-rune uppercase tracking-[0.2em] text-[10px] sm:text-[11px] px-4 py-2 text-center border-b border-viking-gold/40 ember-glow shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          >
            {categoryLabel}
          </div>
          {/* Action icons (favorite + remind) bottom-right of image */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <RemindMeButton eventId={event.id} variant="compact" />
            <FavoriteButton eventId={event.id} />
          </div>
        </div>
      ) : null}

      <div className="p-5 sm:p-6 space-y-3">
        {(compact || !event.image_url) && (
          <div
            data-testid={`event-card-cat-${event.id}`}
            className="-mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-1 bg-viking-ember/95 text-viking-bone font-rune uppercase tracking-[0.2em] text-[10px] sm:text-[11px] px-5 sm:px-6 py-2 text-center border-b border-viking-gold/40 ember-glow"
          >
            {categoryLabel}
          </div>
        )}
        <h3 className="font-serif text-2xl text-viking-bone leading-tight group-hover:text-viking-gold transition-colors">
          {title}
        </h3>
        {!compact && desc ? (
          <p className="text-sm text-viking-stone line-clamp-2 leading-relaxed">{desc}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-viking-stone border-t border-viking-edge/60">
          <span className="flex items-center gap-1.5 mt-2">
            <Calendar size={13} className="text-viking-gold" />
            {dateLabel}
          </span>
          <span className="flex items-center gap-1.5 mt-2">
            <MapPin size={13} className="text-viking-gold" />
            {event.location}
          </span>
          {event.audience && (
            <span className="mt-2 font-rune text-[10px] text-viking-gold/80">
              {event.audience}
            </span>
          )}
          {event.fight_style && (
            <span className="mt-2 font-rune text-[10px] text-viking-ember/80">
              {event.fight_style}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs font-rune text-viking-ember opacity-0 group-hover:opacity-100 transition-opacity">
          {t("events.view")}
          <ArrowUpRight size={12} />
        </div>
      </div>
    </Link>
  );
}

export function formatDateRange(start, end, lang) {
  const s = parseDate(start);
  if (!s) return "";
  const e = parseDate(end) || s;

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  const sameMonth =
    s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  const sameYear = s.getFullYear() === e.getFullYear();

  if (lang === "fi") {
    // Finnish numeric: 5.6.2026, 5.–7.6.2026, 5.6.–7.7.2026, 5.6.2026 – 7.7.2027
    if (sameDay) return `${s.getDate()}.${s.getMonth() + 1}.${s.getFullYear()}`;
    if (sameMonth)
      return `${s.getDate()}.–${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
    if (sameYear)
      return `${s.getDate()}.${s.getMonth() + 1}.–${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
    return `${s.getDate()}.${s.getMonth() + 1}.${s.getFullYear()} – ${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
  }

  // English / Swedish: long month name, single year/month when shared
  const locale = lang === "sv" ? "sv-SE" : "en-GB";
  const longMonth = (d) => d.toLocaleDateString(locale, { month: "long" });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = longMonth(s);
  const eMonth = longMonth(e);
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();

  if (sameDay) return `${sDay} ${sMonth} ${sYear}`;
  if (sameMonth) return `${sDay}–${eDay} ${eMonth} ${eYear}`;
  if (sameYear) return `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYear}`;
  return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
}

/**
 * Parse a `YYYY-MM-DD` event date string as a LOCAL Date (not UTC), avoiding
 * the timezone drift that `new Date("YYYY-MM-DD")` introduces in non-UTC zones.
 */
function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
