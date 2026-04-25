import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { Calendar, MapPin, User, Mail, Globe, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/components/EventCard";
import FavoriteButton from "@/components/FavoriteButton";
import RemindMeButton from "@/components/RemindMeButton";

export default function EventDetail() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/events/${id}`)
      .then((r) => setEvent(r.data))
      .catch(() => setError("not_found"));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl text-viking-bone mb-4">404</h1>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-viking-gold font-rune text-xs"
          data-testid="back-link"
        >
          <ChevronLeft size={14} /> {t("events.back")}
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="h-72 bg-viking-surface animate-pulse rounded-sm" />
      </div>
    );
  }

  const title = pickLocalized(event, lang, "title");
  const desc = pickLocalized(event, lang, "description");

  return (
    <article className="pb-20" data-testid="event-detail">
      {event.image_url ? (
        <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden">
          <img src={event.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-viking-bg/40 via-viking-bg/60 to-viking-bg" />
        </div>
      ) : (
        <div className="h-32 bg-viking-surface/60" />
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-8 -mt-20 relative z-10">
        <Link
          to="/events"
          data-testid="back-link"
          className="inline-flex items-center gap-2 text-viking-stone hover:text-viking-gold font-rune text-[11px] mb-5"
        >
          <ChevronLeft size={14} /> {t("events.back")}
        </Link>

        <div className="carved-card rounded-sm p-7 sm:p-12">
          <div className="text-overline mb-4 text-viking-gold">{t(`cats.${event.category}`)}</div>
          <h1 className="font-serif text-4xl sm:text-5xl text-viking-bone leading-tight mb-6">{title}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 py-6 border-y border-viking-edge mb-8">
            <DetailRow icon={Calendar} label={formatDateRange(event.start_date, event.end_date, lang)} />
            <DetailRow icon={MapPin} label={event.location} />
            <DetailRow icon={User} label={`${t("events.organizer")}: ${event.organizer}`} />
            {event.organizer_email && <DetailRow icon={Mail} label={event.organizer_email} />}
            {event.audience && (
              <DetailRow icon={User} label={`${t("audience_label")}: ${event.audience}`} />
            )}
            {event.fight_style && (
              <DetailRow icon={User} label={`${t("fight_label")}: ${event.fight_style}`} />
            )}
          </div>

          <p className="font-serif text-lg text-viking-bone leading-relaxed whitespace-pre-line">{desc}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {event.link && (
              <a href={event.link} target="_blank" rel="noopener noreferrer" data-testid="event-link">
                <Button className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs ember-glow">
                  <Globe size={14} className="mr-2" />
                  {t("events.website")}
                </Button>
              </a>
            )}
            <RemindMeButton eventId={event.id} />
            <FavoriteButton eventId={event.id} variant="label" />
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailRow({ icon: Icon, label }) {
  return (
    <div className="flex items-start gap-3 text-sm text-viking-bone">
      <Icon size={16} className="mt-0.5 text-viking-gold flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}
