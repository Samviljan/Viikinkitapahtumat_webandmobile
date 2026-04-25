import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

const SHOPS = [
  { name: "Pajatuli", desc: "Käsintaotut työkalut ja aseet", url: "" },
  { name: "Wulflund", desc: "Vaatteet, korut ja varusteet", url: "https://wulflund.com" },
  { name: "Burgschneider", desc: "Historialliset vaatteet", url: "https://burgschneider.com" },
  { name: "Käsityöläinen Helka", desc: "Kuvitteellinen — luonnonmateriaalit", url: "" },
  { name: "Pohjola Crafts", desc: "Puutyöt ja nahkatuotteet", url: "" },
  { name: "Iron Wolf Forge", desc: "Sepän käsityö", url: "" },
];

export default function Shops() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᚲᚨᚢᛈᛈᚨ" title={t("shops.title")} sub={t("shops.sub")} />
      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOPS.map((s) => (
          <a
            key={s.name}
            href={s.url || "#"}
            target={s.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            data-testid={`shop-${s.name}`}
            className="carved-card rounded-sm p-6 hover:border-viking-gold/40 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-serif text-xl text-viking-bone">{s.name}</h3>
              {s.url && <ExternalLink size={14} className="text-viking-gold mt-1" />}
            </div>
            <p className="text-sm text-viking-stone">{s.desc}</p>
          </a>
        ))}
      </section>
    </>
  );
}
