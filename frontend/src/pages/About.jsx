import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";

const RUNESTONE =
  "https://images.pexels.com/photos/34000911/pexels-photo-34000911.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function About() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᛁᚾᚠᛟ" title={t("about.title")} image={RUNESTONE} />
      <section className="mx-auto max-w-3xl px-4 sm:px-8 py-16">
        <p className="font-serif text-xl text-viking-bone leading-relaxed">{t("about.body")}</p>
        <div className="divider-rune my-12" />
        <p className="text-sm text-viking-stone">
          {t("footer.contact")}
        </p>
      </section>
    </>
  );
}
