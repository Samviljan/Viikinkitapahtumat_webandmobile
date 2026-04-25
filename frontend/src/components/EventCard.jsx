import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowUpRight } from "lucide-react";
import { useI18n, pickLocalized } from "@/lib/i18n";

const CAT_TINT = {
  market: "bg-viking-gold/15 text-viking-gold border-viking-gold/30",
  battle: "bg-viking-ember/15 text-viking-ember border-viking-ember/40",
  course: "bg-viking-forest/40 text-viking-bone border-viking-forest",
  festival: "bg-viking-gold/15 text-viking-gold border-viking-gold/30",
  meetup: "bg-viking-surface2 text-viking-stone border-viking-edge",
  other: "bg-viking-surface2 text-viking-stone border-viking-edge",
};

export default function EventCard({ event, compact = false }) {
  const { lang, t } = useI18n();
  const title = pickLocalized(event, lang, "title");
  const desc = pickLocalized(event, lang, "description");

  const dateLabel = formatDateRange(event.start_date, event.end_date, lang);

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
          <span
            className={`absolute top-3 left-3 font-rune text-[10px] px-2.5 py-1 rounded-sm border ${
              CAT_TINT[event.category] || CAT_TINT.other
            }`}
          >
            {t(`cats.${event.category}`)}
          </span>
        </div>
      ) : null}

      <div className="p-5 sm:p-6 space-y-3">
        {(compact || !event.image_url) && (
          <span
            className={`inline-block font-rune text-[10px] px-2.5 py-1 rounded-sm border ${
              CAT_TINT[event.category] || CAT_TINT.other
            }`}
          >
            {t(`cats.${event.category}`)}
          </span>
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
