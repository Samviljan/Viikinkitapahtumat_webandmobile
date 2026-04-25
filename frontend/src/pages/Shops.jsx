import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { ExternalLink, Hammer } from "lucide-react";

const GENERAL = [
  { name: "Rautaportti", url: "https://www.rautaportti.fi/" },
  { name: "Oulun Miekkailutarvike", url: "https://www.miekkailutarvike.fi/" },
  { name: "LotgarVikingCrafts", url: "https://www.etsy.com/shop/LotgarVikingCrafts/" },
  { name: "Perkele Clothing", url: "https://www.facebook.com/perkele.shop" },
  { name: "Wojmir", url: "https://wojmir.pl/en/shop/" },
  { name: "Kram Goch", url: "https://www.kramgoch.pl/eng/" },
  { name: "VikingMarket.eu", url: "https://vikingmarket.eu/" },
  { name: "Ruslana", url: "https://www.ruslana.com.pl/" },
  { name: "Ruslav Leatherworks", url: "https://ryslav-leatherwork.com/en/" },
  { name: "HÅKON, viking helmet", url: "https://wulflund.com/" },
  { name: "Grimfrost Webshop", url: "https://grimfrost.com/" },
  { name: "Weapon and Armour by Viktor Berbekucz", url: "https://www.swordsviktor.com/" },
  { name: "Living History Market", url: "https://living-history-market.com/" },
  { name: "Battle Merchant", url: "https://battlemerchant.com/" },
  { name: "Kaksi kanaa ja pässi", desc: "Käsinommeltuja vaatteita", url: "https://kierratysmuotia.fi/" },
  { name: "Keskiaikapuoti", url: "https://keskiaikapuoti.fi/" },
  { name: "Torkel Design", desc: "Laadukkaita metalli- ja puusepäntuotteita", url: "https://torkel.fi/" },
];

const SMITHS = [
  { name: "Takomo Hukkarauta", url: "https://hukkarauta.fi/" },
  { name: "Smithefix", url: "https://www.facebook.com/Smithefix" },
];

function ShopRow({ s, testid }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testid}
      className="carved-card rounded-sm p-5 hover:border-viking-gold/40 transition-colors group flex items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-lg text-viking-bone group-hover:text-viking-gold leading-tight">
          {s.name}
        </h3>
        {s.desc && <p className="text-xs text-viking-stone mt-1.5">{s.desc}</p>}
      </div>
      <ExternalLink size={14} className="text-viking-gold flex-shrink-0 mt-1" />
    </a>
  );
}

export default function Shops() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᚲᚨᚢᛈᛈᚨ" title={t("shops.title")} sub={t("shops.sub")} />

      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-14">
        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("shops.gear_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GENERAL.map((s) => (
              <ShopRow key={s.name} s={s} testid={`shop-${s.name}`} />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-5">
            <Hammer size={18} className="text-viking-ember" />
            <h3 className="font-serif text-2xl text-viking-bone">{t("shops.smiths_title")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SMITHS.map((s) => (
              <ShopRow key={s.name} s={s} testid={`smith-${s.name}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
