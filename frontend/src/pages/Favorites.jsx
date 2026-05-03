import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import EventCard from "@/components/EventCard";
import PageHero from "@/components/PageHero";

/**
 * "Tapahtumani" — events the logged-in user has RSVPed to. Replaces the
 * old favorites view (anonymous favoriting was removed in favor of the
 * single committed RSVP gesture). Anonymous visitors see a sign-in CTA.
 */
export default function MyEvents() {
  const { t } = useI18n();
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    api
      .get("/users/me/attending")
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  const empty = loaded && events.length === 0;

  return (
    <>
      <PageHero
        eyebrow={t("myevents.eyebrow") || "Tapahtumani"}
        title={t("myevents.title") || "Tapahtumat joihin osallistun"}
        sub={t("myevents.sub") || "Kun klikkaat \"Osallistun\" tapahtumaan, se ilmestyy tähän."}
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
        {!loaded ? (
          <div className="text-center text-viking-stone py-16">…</div>
        ) : empty ? (
          <div
            className="flex flex-col items-center gap-3 py-16 text-viking-stone"
            data-testid="myevents-empty"
          >
            <CalendarCheck size={32} className="text-viking-gold" />
            <p className="text-sm">
              {t("myevents.empty") ||
                "Et ole vielä merkinnyt osallistuvasi yhteenkään tapahtumaan."}
            </p>
            <Link
              to="/"
              className="text-xs uppercase tracking-wider text-viking-gold hover:underline"
            >
              {t("myevents.browse") || "Selaa tapahtumia"} →
            </Link>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="myevents-grid"
          >
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
