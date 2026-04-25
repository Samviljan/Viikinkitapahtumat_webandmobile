import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

const GUILDS = [
  { name: "Aldra", region: "Helsinki", url: "https://aldra.fi" },
  { name: "Harmaasudet", region: "Tampere", url: "" },
  { name: "Nidhögg", region: "Turku", url: "" },
  { name: "Suomen Ásatru-yhdistys", region: "Valtakunnallinen", url: "" },
  { name: "Rauta-aikaa eläväksi", region: "Pirkanmaa", url: "" },
];

export default function Guilds() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᛗᛁᛖᚺᛖᛏ" title={t("guilds.title")} sub={t("guilds.sub")} />
      <section className="mx-auto max-w-4xl px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GUILDS.map((g) => (
          <a
            key={g.name}
            href={g.url || "#"}
            target={g.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            data-testid={`guild-${g.name}`}
            className="carved-card rounded-sm p-6 flex items-start justify-between hover:border-viking-gold/40 transition-colors"
          >
            <div>
              <h3 className="font-serif text-2xl text-viking-bone">{g.name}</h3>
              <p className="text-xs text-viking-stone mt-1 font-rune">{g.region}</p>
            </div>
            {g.url && <ExternalLink size={16} className="text-viking-gold flex-shrink-0" />}
          </a>
        ))}
      </section>
    </>
  );
}
