import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n, pickLocalized } from "@/lib/i18n";
import PageHero from "@/components/PageHero";
import { Calendar, MapPin } from "lucide-react";

export default function Courses() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get("/events", { params: { category: "course" } })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <>
      <PageHero eyebrow="ᛏᛁᛖᛏᛟ" title={t("courses.title")} sub={t("courses.sub")} />
      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-12 space-y-4">
        {items.length === 0 ? (
          <div className="carved-card rounded-sm p-10 text-center text-viking-stone">
            {t("events.empty")}
          </div>
        ) : (
          items.map((e) => (
            <Link
              to={`/events/${e.id}`}
              key={e.id}
              data-testid={`course-row-${e.id}`}
              className="carved-card rounded-sm p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-viking-gold/40 transition-colors group"
            >
              <div className="flex-1">
                <h3 className="font-serif text-2xl text-viking-bone group-hover:text-viking-gold">
                  {pickLocalized(e, lang, "title")}
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-viking-stone">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-viking-gold" />
                    {e.start_date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-viking-gold" />
                    {e.location}
                  </span>
                </div>
              </div>
              <span className="font-rune text-[10px] text-viking-ember">{t("events.view")} →</span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
