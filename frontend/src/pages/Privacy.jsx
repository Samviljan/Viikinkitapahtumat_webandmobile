import React from "react";
import PageHero from "@/components/PageHero";
import { useI18n } from "@/lib/i18n";

/**
 * Privacy Policy page — static, multilingual.
 *
 * Required by Google Play Store for any app that requests location, contacts, etc.
 * Public URL: https://viikinkitapahtumat.fi/privacy
 *
 * The site/mobile app collects:
 *   - Browser/device location (only after explicit user grant; never sent to a server,
 *     used only locally for "near me" sorting).
 *   - Favorites (event IDs in localStorage on the user's device).
 *   - Newsletter subscriber email (only if user opts in via the form).
 *   - Server-side: standard request logs (IP, user-agent) for security/abuse protection.
 *
 * No analytics, no third-party trackers, no advertising IDs.
 */

const SECTIONS = {
  fi: {
    eyebrow: "TIETOSUOJA",
    title: "Tietosuojakäytäntö",
    sub: "Selkeä yhteenveto siitä, mitä tietoja keräämme ja mihin niitä käytetään.",
    last_updated: "Päivitetty 27.4.2026",
    blocks: [
      {
        h: "1. Rekisterinpitäjä",
        p: [
          "Viikinkitapahtumat-palvelua (verkkosivu ja mobiilisovellus) ylläpitää Sami Viljanen, Suomi.",
          "Yhteydenotot tietosuoja-asioissa: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Mitä tietoja keräämme",
        p: [
          "Palvelu on suunniteltu kunnioittamaan yksityisyyttäsi mahdollisimman pitkälle. Emme kerää käyttäjätilejä emmekä käytä mainosseurantatunnisteita.",
        ],
        list: [
          "Sijainti — Vain selaimessa/laitteessa. Käyttäjä antaa erillisen luvan, jolloin laite näyttää lähimmät tapahtumat. Sijaintia ei lähetetä palvelimellemme eikä tallenneta.",
          "Suosikit — Tallennetaan paikallisesti laitteen muistiin (localStorage / mobiilin oma välimuisti). Ei lähetetä palvelimelle.",
          "Uutiskirjeen tilaus — Jos tilaat uutiskirjeen, tallennamme sähköpostiosoitteesi ja kielesi. Voit perua tilauksen milloin tahansa peruutuslinkillä.",
          "Yhteydenotot — Jos lähetät viestin yhteydenottolomakkeen tai admin@-osoitteen kautta, viestisi sisältö ja sähköpostiosoitteesi käsitellään vastauksen antamiseksi.",
          "Tekniset lokit — Palvelimemme tallentaa standardia HTTP-lokia (IP-osoite, selaintunnus, aika) väärinkäytösten estämiseksi. Lokit poistetaan 30 vuorokauden kuluttua.",
        ],
      },
      {
        h: "3. Käyttötarkoitus ja oikeusperuste",
        list: [
          "Palvelun toiminnallisuus (tapahtumalistaus, suosikit, sijainti) — käyttäjän suostumus ja oikeutettu etu (palvelun tarjoaminen).",
          "Uutiskirje — käyttäjän suostumus, joka voidaan peruuttaa milloin tahansa.",
          "Tekniset lokit — oikeutettu etu (tietoturva ja väärinkäytösten estäminen).",
        ],
      },
      {
        h: "4. Kolmannet osapuolet",
        p: [
          "Käytämme seuraavia ulkopuolisia palveluntarjoajia, joilla on omat tietosuojakäytäntönsä:",
        ],
        list: [
          "MongoDB Atlas (tietokanta) — Yhdysvallat / EU. Säilyttää julkaistut tapahtumatiedot ja uutiskirjeen tilaajien sähköpostit.",
          "Resend (sähköpostien lähetys) — käytetään uutiskirjeen ja tapahtumamuistutusten toimittamiseen.",
          "Anthropic Claude / Google Gemini (kielimallit) — käytetään automaattisten käännösten ja tapahtumakuvien generointiin. Tapahtumatekstejä lähetetään niille käännöstä varten; käyttäjien yksityistietoja ei.",
          "Emergent (alusta) — palvelinympäristö ja varmuuskopiointi.",
        ],
        p2: [
          "Emme jaa, myy emmekä vuokraa henkilötietoja kolmansille osapuolille markkinointitarkoituksiin.",
        ],
      },
      {
        h: "5. Säilytysaika",
        list: [
          "Uutiskirjeen tilaajatiedot säilytetään niin kauan kuin tilaus on voimassa. Peruuttamisen jälkeen poistetaan 30 vuorokauden sisällä.",
          "Yhteydenottoviestit säilytetään korkeintaan 12 kuukautta.",
          "Tekniset lokit säilytetään 30 vuorokautta.",
          "Suosikit ja sijaintilupa säilyvät vain käyttäjän omalla laitteella, ja käyttäjä voi tyhjentää ne milloin tahansa selaimen / sovelluksen asetuksista.",
        ],
      },
      {
        h: "6. Käyttäjän oikeudet (GDPR)",
        list: [
          "Oikeus tarkastaa omat tietosi.",
          "Oikeus pyytää virheellisten tietojen oikaisua.",
          "Oikeus tietojen poistamiseen (ns. oikeus tulla unohdetuksi).",
          "Oikeus rajoittaa tai vastustaa käsittelyä.",
          "Oikeus tehdä valitus tietosuojavaltuutetulle (Suomessa: tietosuoja.fi).",
        ],
        p2: [
          "Pyynnöt voi lähettää sähköpostitse osoitteeseen admin@viikinkitapahtumat.fi.",
        ],
      },
      {
        h: "7. Lasten yksityisyys",
        p: [
          "Palvelu ei ole suunnattu alle 13-vuotiaille emmekä tietoisesti kerää tietoja heistä. Jos huomaat että alaikäinen on lähettänyt henkilötietoja, ota yhteyttä ja poistamme ne viipymättä.",
        ],
      },
      {
        h: "8. Tietoturva",
        p: [
          "Käytämme HTTPS-salausta kaikissa yhteyksissä. Ylläpitäjien salasanat ovat vahvasti hashattuja (bcrypt). Tietokanta ei ole julkisesti saavutettavissa.",
        ],
      },
      {
        h: "9. Muutokset käytäntöön",
        p: [
          "Saatamme päivittää tätä tietosuojakäytäntöä. Merkittävistä muutoksista ilmoitetaan etusivulla ja uutiskirjeessä. Päivityspäivämäärä näkyy sivun yläosassa.",
        ],
      },
    ],
  },

  en: {
    eyebrow: "PRIVACY",
    title: "Privacy Policy",
    sub: "A clear summary of what data we collect and how we use it.",
    last_updated: "Last updated 27 April 2026",
    blocks: [
      {
        h: "1. Controller",
        p: [
          "The Viikinkitapahtumat service (website and mobile app) is operated by Sami Viljanen, Finland.",
          "Privacy contact: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. What we collect",
        p: [
          "The service is designed to respect your privacy as much as possible. We do not require user accounts and we do not use advertising tracking identifiers.",
        ],
        list: [
          "Location — Only on the device. Used locally to sort events by distance after explicit consent. Never sent to our servers.",
          "Favorites — Stored locally on your device (localStorage / app cache). Never sent to our servers.",
          "Newsletter subscription — If you subscribe, we store your email and language. You can unsubscribe at any time via the link in every newsletter.",
          "Contact messages — When you use the contact form or email admin@, your message and email are processed to reply to you.",
          "Technical logs — Our server records standard HTTP access logs (IP address, user agent, timestamp) for security and abuse prevention. Logs are deleted after 30 days.",
        ],
      },
      {
        h: "3. Purposes and legal bases",
        list: [
          "Service functionality (event listing, favorites, location) — user consent and legitimate interest (providing the service).",
          "Newsletter — user consent, withdrawable at any time.",
          "Technical logs — legitimate interest (security and abuse prevention).",
        ],
      },
      {
        h: "4. Third-party processors",
        p: ["We use the following external service providers, each with their own privacy policies:"],
        list: [
          "MongoDB Atlas (database) — US / EU. Stores published events and newsletter subscriber emails.",
          "Resend (email delivery) — used to send newsletter and event reminders.",
          "Anthropic Claude / Google Gemini (LLMs) — used to generate automatic translations and event imagery. Event text is sent to them for translation; no user-private data.",
          "Emergent (platform) — server hosting and backups.",
        ],
        p2: [
          "We do not sell, rent or share personal data with third parties for marketing purposes.",
        ],
      },
      {
        h: "5. Retention",
        list: [
          "Newsletter subscriber data is kept while the subscription is active and deleted within 30 days of unsubscription.",
          "Contact messages are kept for at most 12 months.",
          "Technical logs are kept for 30 days.",
          "Favorites and location consent live only on your device; you can clear them at any time from your browser or the app settings.",
        ],
      },
      {
        h: "6. Your rights (GDPR)",
        list: [
          "Right to access your data.",
          "Right to rectification of inaccurate data.",
          "Right to erasure (\"right to be forgotten\").",
          "Right to restrict or object to processing.",
          "Right to lodge a complaint with the supervisory authority (in Finland: tietosuoja.fi).",
        ],
        p2: ["Requests can be sent to admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Children",
        p: [
          "The service is not directed at children under 13 and we do not knowingly collect data about them. If you notice that a minor has submitted personal data, please contact us and we will remove it without delay.",
        ],
      },
      {
        h: "8. Security",
        p: [
          "All connections use HTTPS encryption. Admin passwords are strongly hashed (bcrypt). The database is not publicly accessible.",
        ],
      },
      {
        h: "9. Changes",
        p: [
          "We may update this Privacy Policy. Significant changes will be announced on the homepage and in the newsletter. The update date appears at the top of this page.",
        ],
      },
    ],
  },

  sv: {
    eyebrow: "INTEGRITET",
    title: "Integritetspolicy",
    sub: "En klar sammanfattning av vilka uppgifter vi samlar in och hur vi använder dem.",
    last_updated: "Uppdaterad 27 april 2026",
    blocks: [
      {
        h: "1. Personuppgiftsansvarig",
        p: [
          "Viikinkitapahtumat-tjänsten (webbplats och mobilapp) drivs av Sami Viljanen, Finland.",
          "Integritetskontakt: admin@viikinkitapahtumat.fi",
        ],
      },
      {
        h: "2. Vilka uppgifter vi samlar in",
        p: [
          "Tjänsten är utformad för att respektera din integritet i största möjliga utsträckning. Vi kräver inga användarkonton och använder inga annonsspårnings-ID:n.",
        ],
        list: [
          "Plats — Endast på enheten. Används lokalt för att sortera evenemang efter avstånd efter uttryckligt samtycke. Skickas aldrig till våra servrar.",
          "Favoriter — Lagras lokalt på din enhet (localStorage / appens cache). Skickas aldrig till våra servrar.",
          "Nyhetsbrevsprenumeration — Om du prenumererar lagrar vi din e-postadress och språk. Du kan när som helst säga upp prenumerationen via länken i varje nyhetsbrev.",
          "Kontaktmeddelanden — När du använder kontaktformuläret eller mejlar admin@ behandlas ditt meddelande och din e-post för att svara dig.",
          "Tekniska loggar — Vår server registrerar standardloggar (IP-adress, useragent, tidsstämpel) för säkerhets- och missbruksskydd. Loggar raderas efter 30 dagar.",
        ],
      },
      {
        h: "3. Syften och rättsliga grunder",
        list: [
          "Tjänstefunktioner (evenemangslistning, favoriter, plats) — användarens samtycke och berättigat intresse.",
          "Nyhetsbrev — användarens samtycke, kan återkallas när som helst.",
          "Tekniska loggar — berättigat intresse (säkerhet och missbruksskydd).",
        ],
      },
      {
        h: "4. Tredje parter",
        p: ["Vi använder följande externa tjänsteleverantörer, var och en med egna integritetspolicyer:"],
        list: [
          "MongoDB Atlas (databas) — USA / EU.",
          "Resend (e-postleverans) — för nyhetsbrev och påminnelser.",
          "Anthropic Claude / Google Gemini (språkmodeller) — för automatiska översättningar och bilder. Endast evenemangstext skickas, inga privata användardata.",
          "Emergent (plattform) — serverdrift och säkerhetskopior.",
        ],
        p2: [
          "Vi säljer, hyr ut eller delar inte personuppgifter med tredje parter för marknadsföring.",
        ],
      },
      {
        h: "5. Lagringstid",
        list: [
          "Nyhetsbrevsprenumerantens uppgifter behålls så länge prenumerationen är aktiv och raderas inom 30 dagar efter avregistrering.",
          "Kontaktmeddelanden behålls i högst 12 månader.",
          "Tekniska loggar behålls i 30 dagar.",
          "Favoriter och platssamtycke finns endast på din egen enhet; du kan rensa dem när som helst.",
        ],
      },
      {
        h: "6. Dina rättigheter (GDPR)",
        list: [
          "Rätt att få tillgång till dina uppgifter.",
          "Rätt till rättelse av felaktiga uppgifter.",
          "Rätt till radering (\"rätten att bli glömd\").",
          "Rätt att begränsa eller invända mot behandling.",
          "Rätt att lämna klagomål till tillsynsmyndigheten (i Finland: tietosuoja.fi).",
        ],
        p2: ["Förfrågningar skickas till admin@viikinkitapahtumat.fi."],
      },
      {
        h: "7. Barns integritet",
        p: [
          "Tjänsten riktar sig inte till barn under 13 år och vi samlar inte medvetet in deras uppgifter.",
        ],
      },
      {
        h: "8. Säkerhet",
        p: [
          "Alla anslutningar använder HTTPS. Administratörslösenord är starkt hashade (bcrypt). Databasen är inte offentligt tillgänglig.",
        ],
      },
      {
        h: "9. Ändringar",
        p: [
          "Vi kan uppdatera denna policy. Väsentliga ändringar meddelas på startsidan och i nyhetsbrevet.",
        ],
      },
    ],
  },
};

// Estonian + Polish fall back to English (Play Store only requires the country's primary
// language; Estonia/Poland users will still see a complete policy in EN.)
SECTIONS.et = SECTIONS.en;
SECTIONS.pl = SECTIONS.en;

export default function Privacy() {
  const { lang } = useI18n();
  const data = SECTIONS[lang] || SECTIONS.fi;

  return (
    <>
      <PageHero eyebrow={data.eyebrow} title={data.title} sub={data.sub} />
      <section
        className="mx-auto max-w-3xl px-4 sm:px-8 py-12 space-y-8"
        data-testid="privacy-page"
      >
        <p className="text-xs text-viking-stone uppercase tracking-[0.2em]">
          {data.last_updated}
        </p>
        {data.blocks.map((b, i) => (
          <section key={b.h || `block-${i}`} className="space-y-3">
            <h2 className="font-serif text-2xl text-viking-bone">{b.h}</h2>
            {b.p?.map((para, j) => (
              <p
                key={`${b.h}-p-${j}`}
                className="text-base text-viking-stone leading-relaxed"
              >
                {para}
              </p>
            ))}
            {b.list ? (
              <ul className="list-disc pl-6 space-y-1.5 text-base text-viking-stone leading-relaxed marker:text-viking-gold">
                {b.list.map((it, j) => (
                  <li key={`l-${j}`}>{it}</li>
                ))}
              </ul>
            ) : null}
            {b.p2?.map((para, j) => (
              <p
                key={`p2-${j}`}
                className="text-base text-viking-stone leading-relaxed"
              >
                {para}
              </p>
            ))}
          </section>
        ))}
      </section>
    </>
  );
}
