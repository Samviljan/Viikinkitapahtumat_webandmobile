import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { api } from "@/lib/api";
import EventCard from "@/components/EventCard";
import PageHero from "@/components/PageHero";
import { Star } from "lucide-react";

export default function Favorites() {
  const { t } = useI18n();
  const { ids, clear } = useFavorites();
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setEvents([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    Promise.all(
      ids.map((id) =>
        api.get(`/events/${id}`).then((r) => r.data).catch(() => null)
      )
    ).then((rows) => {
      setEvents(rows.filter(Boolean));
      setLoaded(true);
    });
  }, [ids]);

  return (
    <>
      <PageHero
        eyebrow={t("nav.favorites")}
        title={t("favorites.title")}
        sub={t("favorites.sub")}
      />
      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12">
        {loaded && events.length === 0 ? (
          <div
            className="carved-card rounded-sm p-10 text-center text-viking-stone"
            data-testid="favorites-empty"
          >
            <Star size={28} className="mx-auto mb-3 text-viking-gold/60" />
            <p className="mb-4">{t("favorites.empty")}</p>
            <Link
              to="/events"
              className="inline-block font-rune text-[10px] tracking-[0.3em] uppercase text-viking-gold border border-viking-gold/50 px-4 py-2 rounded-sm hover:bg-viking-gold/10"
            >
              {t("favorites.browse")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <span className="text-overline">
                {events.length} {t("favorites.count_label")}
              </span>
              {events.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  data-testid="favorites-clear"
                  className="font-rune text-[10px] tracking-[0.2em] uppercase text-viking-stone hover:text-viking-ember"
                >
                  {t("favorites.clear")}
                </button>
              )}
            </div>
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              data-testid="favorites-grid"
            >
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
