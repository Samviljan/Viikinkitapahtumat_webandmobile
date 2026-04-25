import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowUpRight } from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";

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
  if (!start) return "";
  const opts = { day: "numeric", month: "long", year: "numeric" };
  const localeMap = { fi: "fi-FI", en: "en-GB", sv: "sv-SE" };
  const locale = localeMap[lang] || "fi-FI";
  const s = new Date(start);
  if (!end || end === start) return s.toLocaleDateString(locale, opts);
  const e = new Date(end);
  return `${s.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${e.toLocaleDateString(
    locale,
    opts
  )}`;
}
