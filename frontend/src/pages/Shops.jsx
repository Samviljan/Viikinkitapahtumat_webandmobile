import React, { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { ExternalLink, Hammer } from "lucide-react";

function ShopRow({ s, testid }) {
  return (
    <a
      href={s.url || "#"}
      target={s.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      data-testid={testid}
      className="carved-card rounded-sm p-5 hover:border-viking-gold/40 transition-colors group flex items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-lg text-viking-bone group-hover:text-viking-gold leading-tight">
          {s.name}
        </h3>
        {s.description && <p className="text-xs text-viking-stone mt-1.5">{s.description}</p>}
      </div>
      {s.url && <ExternalLink size={14} className="text-viking-gold flex-shrink-0 mt-1" />}
    </a>
  );
}

export default function Shops() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/merchants").then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  const gear = items.filter((m) => m.category === "gear");
  const smiths = items.filter((m) => m.category === "smith");

  return (
    <>
      <PageHero eyebrow="ᚲᚨᚢᛈᛈᚨ" title={t("shops.title")} sub={t("shops.sub")} />

      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-14">
        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("shops.gear_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gear.map((s) => (
              <ShopRow key={s.id} s={s} testid={`shop-${s.id}`} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-5">
            <Hammer size={18} className="text-viking-ember" />
            <h3 className="font-serif text-2xl text-viking-bone">{t("shops.smiths_title")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {smiths.map((s) => (
              <ShopRow key={s.id} s={s} testid={`smith-${s.id}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
