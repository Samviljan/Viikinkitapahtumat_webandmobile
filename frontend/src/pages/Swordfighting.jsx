import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { Swords, Users, BookOpen, Shield } from "lucide-react";

const HERO_IMG = "https://viikinkitapahtumat.fi/pics/miekkailu.jpg";
const REENACT_IMG = "https://viikinkitapahtumat.fi/pics/viikinki.jpg";

export default function Swordfighting() {
  const { t } = useI18n();
  return (
    <>
      <PageHero
        eyebrow="ᛏᚨᛁᛋᛏᛖᛚᚢ"
        title={t("sword.title")}
        sub={t("sword.lead")}
        image={HERO_IMG}
      />

      <section className="mx-auto max-w-4xl px-4 sm:px-8 py-16 space-y-14">
        {/* Sword fighting */}
        <article className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold">
              <Swords size={18} />
            </span>
            <h2 className="font-serif text-3xl text-viking-bone">{t("sword.h_practice")}</h2>
          </div>
          <p className="font-serif text-lg text-viking-bone leading-relaxed">{t("sword.p1")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("sword.p2")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("sword.p3")}</p>
        </article>

        <div className="divider-rune" />

        {/* Image break */}
        <div className="relative rounded-sm overflow-hidden border border-viking-edge h-72">
          <img
            src={REENACT_IMG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-viking-bg via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 text-overline text-viking-gold">
            ᚺᛁᛋᛏᛟᚱᛁᚨ
          </div>
        </div>

        {/* Reenactment */}
        <article className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-viking-gold/50 text-viking-gold">
              <BookOpen size={18} />
            </span>
            <h2 className="font-serif text-3xl text-viking-bone">{t("sword.h_reenactment")}</h2>
          </div>
          <p className="font-serif text-lg text-viking-bone leading-relaxed">{t("sword.r1")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("sword.r2")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("sword.r3")}</p>
          <p className="text-base text-viking-stone leading-relaxed">{t("sword.r4")}</p>
        </article>

        <div className="divider-rune" />

        {/* Quick facts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { Icon: Users, k: "sword.fact1" },
            { Icon: Shield, k: "sword.fact2" },
            { Icon: Swords, k: "sword.fact3" },
          ].map(({ Icon, k }, i) => (
            <div key={i} className="carved-card rounded-sm p-6">
              <Icon size={20} className="text-viking-ember mb-3" />
              <p className="text-sm text-viking-bone leading-relaxed">{t(k)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
