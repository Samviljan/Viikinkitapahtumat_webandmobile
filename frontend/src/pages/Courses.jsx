import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Mail } from "lucide-react";
import PageHero from "@/components/PageHero";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { api } from "@/lib/api";

const HERO = "https://viikinkitapahtumat.fi/pics/kurssit.jpg";

export default function Courses() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᚲᚢᚱᛋᛋᛁᛏ" title={t("courses.title")} sub={t("courses.sub")} image={HERO} />

      <section className="mx-auto max-w-3xl px-4 sm:px-8 py-12 space-y-8">
        <div className="carved-card rounded-sm p-7 sm:p-10 space-y-5">
          <p className="font-serif text-lg text-viking-bone leading-relaxed">{t("courses.p1")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("courses.p2")}</p>
        </div>

        <div className="carved-card rounded-sm p-7 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold flex-shrink-0">
              <Mail size={18} />
            </span>
            <div>
              <h3 className="font-serif text-2xl text-viking-bone mb-2">{t("courses.list_title")}</h3>
              <p className="text-sm text-viking-stone leading-relaxed mb-4">{t("courses.list_body")}</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/submit">
                  <span className="inline-flex font-rune text-xs px-4 py-2 bg-viking-ember text-viking-bone rounded-sm ember-glow hover:bg-viking-emberHover transition-colors">
                    {t("nav.submit")}
                  </span>
                </Link>
                <Link to="/contact">
                  <span className="inline-flex font-rune text-xs px-4 py-2 border border-viking-gold/50 text-viking-gold rounded-sm hover:bg-viking-gold/10 transition-colors">
                    {t("nav.contact")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <CourseEvents />
      </section>
    </>
  );
}

function CourseEvents() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/events", { params: { category: "course" } })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <div>
      <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("courses.upcoming")}</h3>
      <div className="space-y-3">
        {items.map((e) => (
          <Link
            to={`/events/${e.id}`}
            key={e.id}
            data-testid={`course-row-${e.id}`}
            className="carved-card rounded-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-viking-gold/40 transition-colors group"
          >
            <div className="flex-1">
              <h4 className="font-serif text-xl text-viking-bone group-hover:text-viking-gold">
                {pickLocalized(e, lang, "title")}
              </h4>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-viking-stone">
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
        ))}
      </div>
    </div>
  );
}
