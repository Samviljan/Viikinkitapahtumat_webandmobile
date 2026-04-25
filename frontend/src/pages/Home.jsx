import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import PageHero from "@/components/PageHero";
import NewsletterSignup from "@/components/NewsletterSignup";
import { Compass, Send, ShieldCheck } from "lucide-react";

const HERO_IMG =
  "https://static.prod-images.emergentagent.com/jobs/9db1bc32-1d96-4d4f-a2bf-f91179d2c155/images/7eebeca219eadb6c48f34c1dfc7f391e2a2ce01fed4411957643c26771754a21.png";
const BATTLE_IMG =
  "https://static.prod-images.emergentagent.com/jobs/9db1bc32-1d96-4d4f-a2bf-f91179d2c155/images/32f719ff9757bf24f0ccc3220a92544457b3bfd340892f9bb88bec44fffb459b.png";

export default function Home() {
  const { t } = useI18n();
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/events")
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  const upcoming = events.slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow={t("home.hero_eyebrow")}
        title={
          <>
            {t("home.hero_title_a")}
            <span className="block text-viking-ember italic font-light">{t("home.hero_title_b")}</span>
          </>
        }
        sub={t("home.hero_sub")}
        image={HERO_IMG}
        ctaTo="/events"
        ctaLabel={t("home.cta_browse")}
        secondaryCtaTo="/submit"
        secondaryCtaLabel={t("home.cta_submit")}
      />

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-20" data-testid="featured-section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-overline mb-3">{t("home.featured")}</div>
            <h2 className="font-serif text-3xl sm:text-4xl text-viking-bone">{t("home.everything")}</h2>
          </div>
          <Link to="/events">
            <Button
              variant="outline"
              data-testid="featured-all-link"
              className="border-viking-edge text-viking-bone hover:border-viking-gold hover:text-viking-gold rounded-sm font-rune text-xs"
            >
              {t("home.cta_browse")} →
            </Button>
          </Link>
        </div>

        {loaded && upcoming.length === 0 ? (
          <div className="carved-card rounded-sm p-10 text-center">
            <p className="text-viking-stone mb-6">{t("events.empty")}</p>
            <Link to="/submit">
              <Button
                data-testid="empty-submit-cta"
                className="bg-viking-ember hover:bg-viking-emberHover text-viking-bone rounded-sm font-rune text-xs"
              >
                {t("home.cta_submit")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      {/* Bento split: image + how it works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="relative lg:col-span-5 carved-card rounded-sm overflow-hidden min-h-[320px]">
          <img src={BATTLE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-viking-bg via-viking-bg/40 to-transparent" />
          <div className="relative z-10 p-8 h-full flex flex-col justify-end">
            <div className="text-overline text-viking-gold mb-3">ᛒᛚᛟᛞ</div>
            <p className="font-serif text-2xl text-viking-bone leading-snug">
              {t("home.hero_title_a")} {t("home.hero_title_b")}
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 carved-card rounded-sm p-8 sm:p-10">
          <div className="text-overline mb-3">{t("home.how_it_works")}</div>
          <h3 className="font-serif text-3xl text-viking-bone mb-8">{t("nav.events")}</h3>
          <div className="space-y-7">
            {[
              { Icon: Compass, t: t("home.step1_t"), d: t("home.step1_d") },
              { Icon: Send, t: t("home.step2_t"), d: t("home.step2_d") },
              { Icon: ShieldCheck, t: t("home.step3_t"), d: t("home.step3_d") },
            ].map(({ Icon, t: title, d }, i) => (
              <div key={title} className="flex gap-5">
                <div className="flex-shrink-0 h-11 w-11 rounded-sm border border-viking-edge bg-viking-surface2 flex items-center justify-center text-viking-gold">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="font-accent text-xs tracking-[0.2em] text-viking-bone uppercase mb-1.5">
                    {String(i + 1).padStart(2, "0")} · {title}
                  </div>
                  <p className="text-sm text-viking-stone leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-4 sm:px-8 py-12" data-testid="newsletter-section">
        <NewsletterSignup variant="card" />
      </section>
    </>
  );
}
