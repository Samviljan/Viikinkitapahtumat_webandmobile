import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { ExternalLink } from "lucide-react";

const SVTL_LINK = "https://www.svtl.fi/svtl";

const SVTL_MEMBERS = [
  { name: "Birckalan Soturit", region: "Tampere", url: "https://www.facebook.com/BirckalanKaarti/" },
  { name: "Björnfell", region: "Kouvola", url: "https://www.facebook.com/Bjornfellry" },
  { name: "Palkkakorpit", region: "Jyväskylä", url: "https://www.facebook.com/palkkakorpit" },
  { name: "Pohjan Kaarti", region: "Oulu", url: "https://www.facebook.com/PohjanKaarti/" },
  { name: "Vanajan Sudet", region: "Hämeenlinna", url: "https://www.facebook.com/vanajansudet" },
  { name: "Wirran Vartijat", region: "Turku", url: "https://www.wirranwartijat.fi/" },
];

const OTHERS = [
  { name: "Harjun Kaarti", region: "Jyväskylä", url: "https://harjunkaarti.wordpress.com/" },
  { name: "Ulvilan Kaarti", region: "Ulvila / Pori", url: "https://ulvilankeskiaikaseura.wordpress.com/about/" },
  { name: "Vanajan Kaarti", region: "Hämeenlinna", url: "https://www.facebook.com/profile.php?id=100064126771790" },
  { name: "Kalevan Kaarti", region: "Riihimäki", url: "https://www.facebook.com/groups/646939508688182/user/61551061170781" },
  { name: "Louhen Kaarti", region: "Tampere", url: "https://louhenkaarti.fi/" },
  { name: "Finnish Vanguards", region: "Coalition of Finnish Viking Fighters for Foreign Events", url: "https://finnishvanguard.com/" },
  { name: "Freya's Vigil", region: "Ulvila", url: "https://www.facebook.com/profile.php?id=61580234994358" },
  { name: "Harmaasudet", region: "Helsinki", url: "https://www.facebook.com/harmaasudet/" },
  { name: "Faravidin sudet", region: "—", url: "https://www.facebook.com/FaravidinSudet" },
  { name: "Holmgershird", region: "Ahvenanmaa", url: "https://www.facebook.com/HolmgersHird/" },
  { name: "Odin's Guard", region: "—", url: "https://www.facebook.com/groups/646939508688182/user/100064633514651/" },
  { name: "Sotka — Viikinkiajan laiva", region: "—", url: "https://www.facebook.com/groups/89621572520/" },
  { name: "Elävä Keskiaika ry", region: "—", url: "https://www.facebook.com/elavakeskiaika" },
  { name: "Sommelo ry", region: "—", url: "https://www.facebook.com/groups/sommelory/" },
  { name: "Aarniometsän paronikunta", region: "Suomen Keskiaikaseura ry", url: "https://www.facebook.com/groups/149121295016//" },
];

function GuildCard({ g, testid }) {
  return (
    <a
      key={g.name}
      href={g.url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testid}
      className="carved-card rounded-sm p-5 flex items-start justify-between hover:border-viking-gold/40 transition-colors group"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-xl text-viking-bone group-hover:text-viking-gold leading-tight">
          {g.name}
        </h3>
        <p className="text-xs text-viking-stone mt-1 font-rune tracking-wider">{g.region}</p>
      </div>
      <ExternalLink size={14} className="text-viking-gold flex-shrink-0 mt-1" />
    </a>
  );
}

export default function Guilds() {
  const { t } = useI18n();
  return (
    <>
      <PageHero eyebrow="ᛗᛁᛖᚺᛖᛏ" title={t("guilds.title")} sub={t("guilds.sub")} />

      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-12 space-y-14">
        {/* SVTL */}
        <div className="carved-card rounded-sm p-7 sm:p-10">
          <div className="text-overline mb-3 text-viking-gold">SVTL</div>
          <h2 className="font-serif text-3xl text-viking-bone mb-4">{t("guilds.svtl_title")}</h2>
          <p className="text-base text-viking-stone leading-relaxed mb-6">{t("guilds.svtl_body")}</p>
          <a href={SVTL_LINK} target="_blank" rel="noopener noreferrer" data-testid="svtl-link">
            <span className="inline-flex items-center gap-2 font-rune text-xs text-viking-gold border border-viking-gold/50 rounded-sm px-4 py-2 hover:bg-viking-gold/10 transition-colors">
              {t("guilds.svtl_link")} <ExternalLink size={12} />
            </span>
          </a>
        </div>

        {/* SVTL members */}
        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("guilds.members_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SVTL_MEMBERS.map((g) => (
              <GuildCard key={g.name} g={g} testid={`guild-svtl-${g.name}`} />
            ))}
          </div>
        </div>

        {/* Others */}
        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("guilds.others_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHERS.map((g) => (
              <GuildCard key={g.name} g={g} testid={`guild-other-${g.name}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
