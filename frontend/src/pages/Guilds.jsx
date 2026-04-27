import React, { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { ExternalLink } from "lucide-react";

const SVTL_LINK = "https://www.svtl.fi/";
const VANGUARD_NAME = "Finnish Vanguards";

function GuildCard({ g, testid }) {
  return (
    <a
      key={g.id}
      href={g.url || "#"}
      target={g.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      data-testid={testid}
      className="carved-card rounded-sm p-5 flex items-start justify-between hover:border-viking-gold/40 transition-colors group"
    >
      <div className="min-w-0">
        <h3 className="font-serif text-xl text-viking-bone group-hover:text-viking-gold leading-tight">
          {g.name}
        </h3>
        {g.region && <p className="text-xs text-viking-stone mt-1 font-rune tracking-wider">{g.region}</p>}
      </div>
      {g.url && <ExternalLink size={14} className="text-viking-gold flex-shrink-0 mt-1" />}
    </a>
  );
}

function FeaturedGuildCard({ eyebrow, title, body, linkLabel, url, testid }) {
  return (
    <div className="carved-card rounded-sm p-7 sm:p-10" data-testid={testid}>
      {eyebrow ? <div className="text-overline mb-3 text-viking-gold">{eyebrow}</div> : null}
      <h2 className="font-serif text-3xl text-viking-bone mb-4">{title}</h2>
      <p className="text-base text-viking-stone leading-relaxed mb-6">{body}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`${testid}-link`}>
          <span className="inline-flex items-center gap-2 font-rune text-xs text-viking-gold border border-viking-gold/50 rounded-sm px-4 py-2 hover:bg-viking-gold/10 transition-colors">
            {linkLabel} <ExternalLink size={12} />
          </span>
        </a>
      ) : null}
    </div>
  );
}

export default function Guilds() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/guilds").then((r) => setItems(r.data || [])).catch(() => setItems([]));
  }, []);

  const svtl = items.filter((g) => g.category === "svtl_member");
  // Pull Finnish Vanguards out of the "other" bucket so it can be highlighted.
  const vanguard = items.find(
    (g) => g.category === "other" && g.name === VANGUARD_NAME,
  );
  const others = items.filter(
    (g) => g.category === "other" && g.name !== VANGUARD_NAME,
  );

  return (
    <>
      <PageHero eyebrow="ᛗᛁᛖᚺᛖᛏ" title={t("guilds.title")} sub={t("guilds.sub")} />

      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-12 space-y-14">
        <FeaturedGuildCard
          testid="svtl-card"
          eyebrow="SVTL"
          title={t("guilds.svtl_title")}
          body={t("guilds.svtl_body")}
          linkLabel={t("guilds.svtl_link")}
          url={SVTL_LINK}
        />

        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("guilds.members_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {svtl.map((g) => (
              <GuildCard key={g.id} g={g} testid={`guild-svtl-${g.id}`} />
            ))}
          </div>
        </div>

        {vanguard ? (
          <FeaturedGuildCard
            testid="vanguard-card"
            title={t("guilds.vanguard_title")}
            body={t("guilds.vanguard_body")}
            linkLabel={t("guilds.vanguard_link")}
            url={vanguard.url}
          />
        ) : null}

        <div>
          <h3 className="font-serif text-2xl text-viking-bone mb-5">{t("guilds.others_title")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map((g) => (
              <GuildCard key={g.id} g={g} testid={`guild-other-${g.id}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
