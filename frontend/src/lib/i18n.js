import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const TRANSLATIONS = {
  fi: {
    site: { name: "Viikinkitapahtumat", tagline: "Suomen viikinki- ja rauta-aikaharrastajien kalenteri" },
    nav: {
      home: "Etusivu",
      events: "Tapahtumat",
      submit: "Ilmoita tapahtuma",
      courses: "Kurssit",
      guilds: "Kaartit & yhdistykset",
      shops: "Kaupat",
      about: "Tietoa",
      admin: "Ylläpito",
    },
    home: {
      hero_eyebrow: "Rauta-aika · Viikinkiaika · Varhaiskeskiaika",
      hero_title_a: "Tapahtumat",
      hero_title_b: "muinaisille sieluille",
      hero_sub:
        "Markkinat, taistelunäytökset, kurssit ja juhlat — kaikki Suomen viikinkiajan harrastusyhteisön tapahtumat yhdessä paikassa.",
      cta_browse: "Selaa kalenteria",
      cta_submit: "Ilmoita tapahtuma",
      featured: "Tulevat kohokohdat",
      everything: "Kaikki tapahtumat",
      how_it_works: "Näin se toimii",
      step1_t: "Löydä",
      step1_d: "Selaa kalenteria tai listaa kategoriasta ja päivämäärästä.",
      step2_t: "Ilmoita",
      step2_d: "Lähetä oma tapahtumasi lomakkeella – maksuton ja yhteisövetoinen.",
      step3_t: "Vahvistus",
      step3_d: "Ylläpito tarkistaa ja julkaisee tapahtuman lyhyen tarkastuksen jälkeen.",
    },
    events: {
      title: "Tapahtumakalenteri",
      sub: "Selaa kuukausi- tai listanäkymässä. Suodata kategorian mukaan.",
      tab_calendar: "Kalenteri",
      tab_list: "Lista",
      filter_category: "Kategoria",
      filter_all: "Kaikki",
      empty: "Ei tapahtumia tällä hetkellä — tule pian uudestaan tai ilmoita oma tapahtumasi.",
      view: "Katso tapahtuma",
      organizer: "Järjestäjä",
      location: "Paikka",
      website: "Sivusto",
      back: "Takaisin",
    },
    submit: {
      title: "Ilmoita tapahtuma",
      sub: "Lähettämäsi tapahtuma julkaistaan ylläpidon hyväksynnän jälkeen.",
      title_field: "Tapahtuman nimi (suomeksi)",
      title_en: "Nimi englanniksi (valinnainen)",
      title_sv: "Nimi ruotsiksi (valinnainen)",
      desc_field: "Kuvaus (suomeksi)",
      desc_en: "Kuvaus englanniksi (valinnainen)",
      desc_sv: "Kuvaus ruotsiksi (valinnainen)",
      category: "Kategoria",
      location: "Sijainti",
      start_date: "Alkupäivä",
      end_date: "Loppupäivä (valinnainen)",
      organizer: "Järjestäjä",
      organizer_email: "Järjestäjän sähköposti",
      link: "Lisätietolinkki",
      image: "Kuvan URL (valinnainen)",
      submit_btn: "Lähetä tarkastettavaksi",
      success: "Kiitos! Tapahtumasi on lähetetty hyväksyttäväksi.",
      error: "Lähettäminen epäonnistui",
    },
    cats: {
      market: "Markkinat",
      battle: "Taistelunäytös",
      course: "Kurssi",
      festival: "Juhla",
      meetup: "Kokoontuminen",
      other: "Muu",
    },
    months: ["Tammikuu","Helmikuu","Maaliskuu","Huhtikuu","Toukokuu","Kesäkuu","Heinäkuu","Elokuu","Syyskuu","Lokakuu","Marraskuu","Joulukuu"],
    weekdays_short: ["Ma","Ti","Ke","To","Pe","La","Su"],
    admin: {
      login_title: "Ylläpidon kirjautuminen",
      email: "Sähköposti",
      password: "Salasana",
      sign_in: "Kirjaudu",
      dashboard: "Hallintapaneeli",
      pending: "Odottavat",
      approved: "Hyväksytyt",
      rejected: "Hylätyt",
      all: "Kaikki",
      approve: "Hyväksy",
      reject: "Hylkää",
      delete: "Poista",
      logout: "Kirjaudu ulos",
      no_events: "Ei tapahtumia tässä näkymässä.",
      bad_login: "Virheellinen sähköposti tai salasana",
      confirm_delete: "Haluatko varmasti poistaa tämän tapahtuman?",
      load_error: "Tapahtumien lataus epäonnistui",
      action_ok: "Toiminto onnistui",
      action_error: "Toiminto epäonnistui",
    },
    about: {
      title: "Tietoa sivustosta",
      body:
        "Viikinkitapahtumat.fi on yhteisövetoinen sivusto Suomen viikinki-, rauta-aika- ja varhaiskeskiaikaharrastajille. Tarjoamme yhteisen kalenterin tapahtumille, kurssitietoa, listauksen kaarteista ja yhdistyksistä sekä kauppoja ja käsityöläisiä, joilta saat tarvikkeita.",
    },
    courses: {
      title: "Kurssit ja työpajat",
      sub: "Pitkä lista käsityö-, miekkailu- ja muista historiallisista taitokursseista.",
    },
    guilds: { title: "Kaartit ja yhdistykset", sub: "Suomen viikinkiajan harrastusyhteisöt." },
    shops: { title: "Kaupat ja käsityöläiset", sub: "Materiaalit, vaatteet, aseet, korut." },
    footer: {
      contact: "admin@viikinkitapahtumat.fi",
      rights: "Kaikki oikeudet pidätetään.",
    },
  },
  en: {
    site: { name: "Viking Events", tagline: "Calendar of Finnish viking & iron age happenings" },
    nav: {
      home: "Home",
      events: "Events",
      submit: "Submit event",
      courses: "Courses",
      guilds: "Guilds & associations",
      shops: "Shops",
      about: "About",
      admin: "Admin",
    },
    home: {
      hero_eyebrow: "Iron Age · Viking Age · Early Medieval",
      hero_title_a: "Gatherings",
      hero_title_b: "for ancient souls",
      hero_sub:
        "Markets, battle reenactments, courses and feasts — every event of Finland's Viking reenactment community in one almanac.",
      cta_browse: "Browse calendar",
      cta_submit: "Submit event",
      featured: "Upcoming highlights",
      everything: "All events",
      how_it_works: "How it works",
      step1_t: "Discover",
      step1_d: "Browse the calendar or list, filter by category and date.",
      step2_t: "Submit",
      step2_d: "Add your own event using the form — free and community-driven.",
      step3_t: "Confirmation",
      step3_d: "An admin reviews and publishes the event after a short check.",
    },
    events: {
      title: "Event calendar",
      sub: "Calendar or list view. Filter by category.",
      tab_calendar: "Calendar",
      tab_list: "List",
      filter_category: "Category",
      filter_all: "All",
      empty: "No events right now — check back soon or submit one.",
      view: "View event",
      organizer: "Organizer",
      location: "Location",
      website: "Website",
      back: "Back",
    },
    submit: {
      title: "Submit an event",
      sub: "Your submission will appear after admin approval.",
      title_field: "Event name (Finnish)",
      title_en: "Name in English (optional)",
      title_sv: "Name in Swedish (optional)",
      desc_field: "Description (Finnish)",
      desc_en: "Description in English (optional)",
      desc_sv: "Description in Swedish (optional)",
      category: "Category",
      location: "Location",
      start_date: "Start date",
      end_date: "End date (optional)",
      organizer: "Organizer",
      organizer_email: "Organizer email",
      link: "More info link",
      image: "Image URL (optional)",
      submit_btn: "Send for review",
      success: "Thank you! Your event was submitted for review.",
      error: "Submission failed",
    },
    cats: { market: "Markets", battle: "Battle reenactment", course: "Course", festival: "Festival", meetup: "Meetup", other: "Other" },
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    weekdays_short: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    admin: {
      login_title: "Admin login",
      email: "Email",
      password: "Password",
      sign_in: "Sign in",
      dashboard: "Dashboard",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      all: "All",
      approve: "Approve",
      reject: "Reject",
      delete: "Delete",
      logout: "Sign out",
      no_events: "No events in this view.",
      bad_login: "Invalid email or password",
      confirm_delete: "Are you sure you want to delete this event?",
      load_error: "Failed to load events",
      action_ok: "Done",
      action_error: "Action failed",
    },
    about: {
      title: "About",
      body:
        "Viikinkitapahtumat.fi is a community-driven hub for Finnish Viking, Iron Age and early medieval reenactors — a shared calendar for events, courses, guilds and craftspeople.",
    },
    courses: { title: "Courses & workshops", sub: "Crafts, swordsmanship, and other historical skill courses." },
    guilds: { title: "Guilds & associations", sub: "Reenactment communities across Finland." },
    shops: { title: "Shops & craftspeople", sub: "Materials, garments, weapons, jewellery." },
    footer: { contact: "admin@viikinkitapahtumat.fi", rights: "All rights reserved." },
  },
  sv: {
    site: { name: "Vikingaevent", tagline: "Kalender för Finlands vikinga- och järnåldersentusiaster" },
    nav: {
      home: "Hem",
      events: "Evenemang",
      submit: "Anmäl evenemang",
      courses: "Kurser",
      guilds: "Gillen & föreningar",
      shops: "Butiker",
      about: "Om sidan",
      admin: "Admin",
    },
    home: {
      hero_eyebrow: "Järnålder · Vikingatid · Tidig medeltid",
      hero_title_a: "Sammankomster",
      hero_title_b: "för forntida själar",
      hero_sub:
        "Marknader, slaguppvisningar, kurser och fester — alla evenemang i Finlands vikingagemenskap i en almanacka.",
      cta_browse: "Bläddra i kalendern",
      cta_submit: "Anmäl evenemang",
      featured: "Kommande höjdpunkter",
      everything: "Alla evenemang",
      how_it_works: "Så fungerar det",
      step1_t: "Upptäck",
      step1_d: "Bläddra i kalendern eller listan, filtrera på kategori och datum.",
      step2_t: "Anmäl",
      step2_d: "Lägg till ditt eget evenemang via formuläret — gratis och gemenskapsdrivet.",
      step3_t: "Bekräftelse",
      step3_d: "Admin granskar och publicerar evenemanget efter en kort kontroll.",
    },
    events: {
      title: "Evenemangskalender",
      sub: "Kalender- eller listvy. Filtrera på kategori.",
      tab_calendar: "Kalender",
      tab_list: "Lista",
      filter_category: "Kategori",
      filter_all: "Alla",
      empty: "Inga evenemang just nu — titta in snart igen eller anmäl ett.",
      view: "Visa evenemang",
      organizer: "Arrangör",
      location: "Plats",
      website: "Webbplats",
      back: "Tillbaka",
    },
    submit: {
      title: "Anmäl evenemang",
      sub: "Ditt evenemang publiceras efter admins godkännande.",
      title_field: "Evenemangsnamn (finska)",
      title_en: "Namn på engelska (valfritt)",
      title_sv: "Namn på svenska (valfritt)",
      desc_field: "Beskrivning (finska)",
      desc_en: "Beskrivning på engelska (valfritt)",
      desc_sv: "Beskrivning på svenska (valfritt)",
      category: "Kategori",
      location: "Plats",
      start_date: "Startdatum",
      end_date: "Slutdatum (valfritt)",
      organizer: "Arrangör",
      organizer_email: "Arrangörens e-post",
      link: "Mer info-länk",
      image: "Bild-URL (valfritt)",
      submit_btn: "Skicka för granskning",
      success: "Tack! Ditt evenemang har skickats för granskning.",
      error: "Det gick inte att skicka",
    },
    cats: { market: "Marknad", battle: "Slaguppvisning", course: "Kurs", festival: "Fest", meetup: "Träff", other: "Annat" },
    months: ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"],
    weekdays_short: ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"],
    admin: {
      login_title: "Admin-inloggning",
      email: "E-post",
      password: "Lösenord",
      sign_in: "Logga in",
      dashboard: "Översikt",
      pending: "Väntar",
      approved: "Godkända",
      rejected: "Avvisade",
      all: "Alla",
      approve: "Godkänn",
      reject: "Avvisa",
      delete: "Radera",
      logout: "Logga ut",
      no_events: "Inga evenemang i denna vy.",
      bad_login: "Felaktig e-post eller lösenord",
      confirm_delete: "Är du säker på att du vill radera detta evenemang?",
      load_error: "Det gick inte att ladda evenemangen",
      action_ok: "Klart",
      action_error: "Åtgärden misslyckades",
    },
    about: {
      title: "Om sidan",
      body:
        "Viikinkitapahtumat.fi är en gemenskapsdriven plats för finska vikinga-, järnålders- och tidigmedeltida re-enactors — en gemensam kalender för evenemang, kurser, gillen och hantverkare.",
    },
    courses: { title: "Kurser & verkstäder", sub: "Hantverk, svärdsfäktning och andra historiska färdigheter." },
    guilds: { title: "Gillen & föreningar", sub: "Re-enactment-gemenskaper i Finland." },
    shops: { title: "Butiker & hantverkare", sub: "Material, kläder, vapen, smycken." },
    footer: { contact: "admin@viikinkitapahtumat.fi", rights: "Alla rättigheter förbehållna." },
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("vk_lang") || "fi");

  const setLang = useCallback((l) => {
    if (!TRANSLATIONS[l]) return;
    localStorage.setItem("vk_lang", l);
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (path) => {
      const keys = path.split(".");
      let cur = TRANSLATIONS[lang];
      for (const k of keys) {
        if (cur && typeof cur === "object" && k in cur) cur = cur[k];
        else return path;
      }
      return cur;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function pickLocalized(obj, lang, baseKey) {
  // baseKey = 'title' | 'description'
  const v = obj?.[`${baseKey}_${lang}`];
  if (v && v.trim()) return v;
  return obj?.[`${baseKey}_fi`] || "";
}
