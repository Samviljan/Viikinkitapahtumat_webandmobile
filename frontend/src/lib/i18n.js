import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const TRANSLATIONS = {
  fi: {
    site: { name: "Viikinkitapahtumat", tagline: "Suomen viikinki- ja rauta-aikaharrastajien kalenteri" },
    nav: {
      home: "Etusivu",
      events: "Tapahtumat",
      submit: "Ilmoita tapahtuma",
      swordfighting: "Viikinkimiekkailu",
      courses: "Kurssit",
      guilds: "Kaartit & yhdistykset",
      shops: "Kaupat",
      about: "Tietoa",
      contact: "Yhteydenotto",
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
      ical_subscribe: "Tilaa kalenteri",
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
      audience: "Luokittelu",
      audience_public: "Yleisö",
      audience_hobby: "Harrastajat",
      audience_none: "Ei valittu",
      fight_style: "Taistelutyyli",
      fight_western: "Western",
      fight_eastern: "Eastern",
      fight_other: "Muu",
      fight_none: "Ei valittu",
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
      subscribers: "Tilaajat",
      newsletter_title: "Kuukausi-uutiskirje",
      newsletter_sub:
        "Lähetä manuaalisesti yhteenveto tulevista 60 päivän tapahtumista, tai jätä ajastuksen hoitavaksi (joka kuukauden 1. päivä klo 09:00 Suomen aikaa).",
      newsletter_preview: "Esikatsele",
      newsletter_send_now: "Lähetä nyt",
      newsletter_confirm: "Lähetetäänkö uutiskirje kaikille aktiivisille tilaajille?",
      newsletter_sent: "Lähetetty",
      newsletter_count: "Tapahtumia kirjeessä",
    },
    about: undefined,
    courses: {
      title: "Kurssit ja työpajat",
      sub: "Pitkä lista käsityö-, miekkailu- ja muista historiallisista taitokursseista.",
      p1: "Suomessa järjestetään lukuisilla paikkakunnilla sekä syys- että kevätkaudella alkeiskursseja, joilla pääset mukaan hienoon harrastukseen ja opit viikinkimiekkailun perusteet ja perussäännöt — jotta voit jatkaa harjoittelua muiden harrastajien kanssa sekä osallistua erilaisiin tapahtumiin ja yleisönäytöksiin turvallisesti.",
      p2: "Viikinkimiekkailun alkeiskurssien lisäksi yleensä samat yhdistykset järjestävät myös muita rauta-aikaan ja keskiaikaan liittyviä käsityö- ja koulutuskursseja.",
      list_title: "Lisää oma kurssisi",
      list_body:
        "Mikäli haluat yhdistyksesi kurssin listaukseen, ota yhteyttä yhteydenottolomakkeella tai lähetä postia osoitteeseen admin@viikinkitapahtumat.fi.",
      upcoming: "Tulevat kurssit",
    },
    guilds: {
      title: "Kaartit ja yhdistykset",
      sub: "Suomalaisia viikinkikaarteja ja yhteisöjä.",
      svtl_title: "Suomen Viikinkitaistelijoiden Liitto",
      svtl_body:
        "SVTL on vuonna 2025 perustettu viikinkiajan taistelutaitojen harrastajien valtakunnallinen lajiliitto. Liiton jäseniä ovat viikinkiaikaisia, rautakautisia tai niihin rinnastettavia taistelulajeja harjoittavat yhteisöt.",
      svtl_link: "SVTL:n verkkosivut",
      members_title: "SVTL:n jäsenseurat",
      others_title: "Muut seurat, kaartit ja yhdistykset",
    },
    shops: {
      title: "Kaupat ja käsityöläiset",
      sub: "Materiaalit, vaatteet, aseet, korut.",
      gear_title: "Varuste- ja tarvikekauppoja",
      smiths_title: "Seppiä",
    },
    sword: {
      title: "Viikinkimiekkailu ja historianelävöittäminen",
      lead:
        "Voimakkaasti kasvava harrastus, joka yhdistää historian, liikunnan ja yhteisöllisyyden.",
      h_practice: "Viikinkimiekkailu",
      p1:
        "Viikinkimiekkailu pyrkii rekonstruoimaan ja elävöittämään viikinkiajan taistelutaitoja autenttisesti, samalla tarjoten osallistujille mahdollisuuden kokea menneisyyden ajan henki.",
      p2:
        "Viikinkimiekkailu ei ole pelkästään fyysinen aktiviteetti vaan myös syvällinen tutkimus viikinkien sotataidoista ja kulttuurista. Harrastajat paneutuvat tarkasti historiallisiin lähteisiin, arkeologisiin löytöihin ja taistelumenetelmiin.",
      p3:
        "Käytännön harjoitukset keskittyvät miekkailun perustekniikoihin, kilvenkäyttöön, liikkuvuuteen ja taistelutaitoon. Käytössä ovat aikakautiset aseet — viikinkimiekat, kilvet ja haarniskat — ja monet ryhmät noudattavat tiukkoja sääntöjä osallistujien turvallisuuden varmistamiseksi.",
      h_reenactment: "Historianelävöittäminen",
      r1:
        "Historianelävöittäminen, eli reenactment, on harrastus, joka mahdollistaa menneiden aikakausien kokemisen ja tutkimisen elävänä. Viikinkiaika herää henkiin värikkäästi ja autenttisesti.",
      r2:
        "Viikinkiajan historianelävöittäjät paneutuvat tarkasti ajanmukaiseen vaatetukseen, aseisiin, ruokailutapoihin ja elämäntapaan. He kokoontuvat tapahtumiin ja festivaaleille esittämään roolejaan viikinkien aikana.",
      r3:
        "Tämä sisältää ruoanlaittoa perinteisin menetelmin, käsitöitä, musiikin esittämistä ja taitojen näyttämistä — kuten taistelutaitoja ja käsityötaitoja.",
      r4:
        "Historianelävöittäminen yhdistää ihmisiä intohimonsa kautta ja luo eläväisen, vuorovaikutteisen tavan kokea historiaa, samalla kunnioittaen kulttuuriperintöä.",
      fact1: "Yhteisöllistä — säännölliset harjoitukset ja tapahtumat ympäri Suomea.",
      fact2: "Turvallista — selkeät säännöt, harjoitusvarusteet ja kokeneet ohjaajat.",
      fact3: "Historiallista — autenttisia tekniikoita, aseita ja varusteita.",
    },
    contact: {
      title: "Yhteydenotto",
      sub:
        "Puuttuuko tapahtumasi listauksesta tai haluatko täydentää tai korjata tietoja? Otathan yhteyttä.",
      email_label: "Sähköposti",
      copy: "Kopioi",
      copied: "Kopioitu!",
      form_title: "Nopea ilmoitus",
      form_sub:
        "Tämä lomake avaa sähköpostiohjelmasi valmiiksi täytetyllä viestillä. Tarkemmat ilmoitukset: käytä sivun \"Ilmoita tapahtuma\" -lomaketta.",
      event_name: "Tapahtuman nimi",
      event_date: "Päivämäärä",
      info: "Lisätietoja",
      send: "Avaa sähköposti",
      subject_default: "Tapahtumailmoitus",
      tip:
        "Vinkki: jos haluat, että tapahtumasi näkyy kalenterissa heti hyväksynnän jälkeen, lisää myös linkki ja kuva.",
    },
    fight_label: "Taistelutyyli",
    audience_label: "Luokittelu",
    newsletter: {
      eyebrow: "Kuukausikatsaus",
      title: "Tilaa viikinkikalenteri sähköpostiisi",
      body:
        "Lähetämme kerran kuukaudessa lyhyen yhteenvedon tulevista viikinki-, rauta-aika- ja varhaiskeskiaikatapahtumista Suomessa. Ei spammia, voit perua tilauksen koska tahansa.",
      placeholder: "sahkoposti@osoite.fi",
      cta: "Tilaa",
      privacy:
        "Tallennamme vain sähköpostiosoitteesi ja kielesi. Emme jaa osoitteita kolmansille osapuolille.",
      success_title: "Kiitos tilauksesta!",
      success_body: "Lähetimme vahvistuksen sähköpostiisi.",
      unsub_title: "Tilaus peruttu",
      unsub_body: "Et saa enää uutiskirjeitämme. Voit aina tilata uudelleen sivustoltamme.",
      unsub_invalid_title: "Linkki ei kelpaa",
      unsub_invalid_body: "Tämä peruutuslinkki on vanhentunut tai virheellinen.",
    },
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
      swordfighting: "Viking sword fighting",
      courses: "Courses",
      guilds: "Guilds & associations",
      shops: "Shops",
      contact: "Contact",
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
      audience: "Audience",
      audience_public: "Public",
      audience_hobby: "Hobbyists only",
      audience_none: "Not selected",
      fight_style: "Fighting style",
      fight_western: "Western",
      fight_eastern: "Eastern",
      fight_other: "Other",
      fight_none: "Not selected",
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
      subscribers: "Subscribers",
      newsletter_title: "Monthly newsletter",
      newsletter_sub:
        "Send a digest of the next 60 days of events to all active subscribers manually, or let the scheduler send it on the 1st of each month at 09:00 Helsinki time.",
      newsletter_preview: "Preview",
      newsletter_send_now: "Send now",
      newsletter_confirm: "Send the newsletter to all active subscribers?",
      newsletter_sent: "Sent",
      newsletter_count: "Events in digest",
    },
    about: undefined,
    courses: {
      title: "Courses & workshops",
      sub: "Crafts, swordsmanship, and other historical skill courses.",
      p1: "Beginner courses are organised across Finland in autumn and spring — join the hobby, learn the basics and rules of viking sword fighting, then continue training with other enthusiasts and participate safely in events and public demonstrations.",
      p2: "Besides beginner sword courses, the same associations usually organise other Iron Age and medieval crafts and skill workshops.",
      list_title: "Add your course",
      list_body:
        "If you'd like your association's course listed here, contact us via the form or email admin@viikinkitapahtumat.fi.",
      upcoming: "Upcoming courses",
    },
    guilds: {
      title: "Guilds & associations",
      sub: "Finnish viking-age reenactment communities.",
      svtl_title: "Finnish Viking Fighters' Federation",
      svtl_body:
        "SVTL, founded in 2025, is the national federation for viking-age combat enthusiasts in Finland. Its members are communities practising viking-age, iron-age or comparable combat disciplines.",
      svtl_link: "SVTL website",
      members_title: "SVTL member clubs",
      others_title: "Other clubs, guilds and associations",
    },
    shops: {
      title: "Shops & craftspeople",
      sub: "Materials, garments, weapons, jewellery.",
      gear_title: "Gear & supplies",
      smiths_title: "Smiths",
    },
    sword: {
      title: "Viking sword fighting & reenactment",
      lead: "A rapidly growing hobby blending history, exercise and community.",
      h_practice: "Viking sword fighting",
      p1:
        "Viking sword fighting reconstructs and brings to life the combat skills of the viking age authentically, while letting participants experience the spirit of the past.",
      p2:
        "It's not just physical activity — it's a deep study of viking warfare and culture. Practitioners dive into historical sources, archaeological finds and combat methods to understand and apply period-correct strategies.",
      p3:
        "Practical training focuses on basic sword technique, shield work, footwork and combat skills. Period weapons — viking swords, shields and armour — create as authentic an experience as possible. Many groups follow strict safety rules.",
      h_reenactment: "Reenactment",
      r1:
        "Historical reenactment lets you experience and study past eras as living events. The viking era comes vividly and authentically to life.",
      r2:
        "Viking-era reenactors carefully study period clothing, weapons, food and lifestyle. They gather at events and festivals around the world to perform their roles.",
      r3:
        "This includes traditional cooking, crafts, period music and skill demonstrations — combat as well as crafts.",
      r4:
        "Reenactment connects people through shared passion and offers a vivid, interactive way to experience history while respecting cultural heritage.",
      fact1: "Communal — regular trainings and events around Finland.",
      fact2: "Safe — clear rules, training gear and experienced instructors.",
      fact3: "Historical — authentic techniques, weapons and equipment.",
    },
    contact: {
      title: "Contact",
      sub:
        "Is your event missing from the listing, or do you want to update or correct information? Get in touch.",
      email_label: "Email",
      copy: "Copy",
      copied: "Copied!",
      form_title: "Quick message",
      form_sub:
        "This form opens your email client with a pre-filled message. For full event submissions, use the \"Submit event\" page.",
      event_name: "Event name",
      event_date: "Date",
      info: "More info",
      send: "Open email",
      subject_default: "Event submission",
      tip: "Tip: include a link and an image so your event looks great once approved.",
    },
    fight_label: "Fighting style",
    audience_label: "Audience",
    newsletter: {
      eyebrow: "Monthly digest",
      title: "Get the viking calendar in your inbox",
      body:
        "Once a month we send a short summary of upcoming viking, iron-age and early-medieval events in Finland. No spam, unsubscribe any time.",
      placeholder: "your@email.com",
      cta: "Subscribe",
      privacy:
        "We only store your email address and language. We don't share emails with third parties.",
      success_title: "Thanks for subscribing!",
      success_body: "We've sent a confirmation to your email.",
      unsub_title: "You've been unsubscribed",
      unsub_body: "You will no longer receive our newsletter. You can resubscribe any time from our site.",
      unsub_invalid_title: "Invalid link",
      unsub_invalid_body: "This unsubscribe link has expired or is invalid.",
    },
    footer: { contact: "admin@viikinkitapahtumat.fi", rights: "All rights reserved." },
  },
  sv: {
    site: { name: "Vikingaevent", tagline: "Kalender för Finlands vikinga- och järnåldersentusiaster" },
    nav: {
      home: "Hem",
      events: "Evenemang",
      submit: "Anmäl evenemang",
      swordfighting: "Vikingasvärdsfäktning",
      courses: "Kurser",
      guilds: "Gillen & föreningar",
      shops: "Butiker",
      contact: "Kontakt",
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
      ical_subscribe: "Prenumerera kalender",
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
      audience: "Klassificering",
      audience_public: "Publik",
      audience_hobby: "Endast utövare",
      audience_none: "Ej valt",
      fight_style: "Stridsstil",
      fight_western: "Western",
      fight_eastern: "Eastern",
      fight_other: "Annat",
      fight_none: "Ej valt",
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
      subscribers: "Prenumeranter",
      newsletter_title: "Månatligt nyhetsbrev",
      newsletter_sub:
        "Skicka en sammanfattning av de kommande 60 dagarnas evenemang manuellt, eller låt schemaläggaren skicka den den 1:a varje månad kl. 09:00 finsk tid.",
      newsletter_preview: "Förhandsgranska",
      newsletter_send_now: "Skicka nu",
      newsletter_confirm: "Skicka nyhetsbrevet till alla aktiva prenumeranter?",
      newsletter_sent: "Skickat",
      newsletter_count: "Evenemang i utskicket",
    },
    about: undefined,
    courses: {
      title: "Kurser & verkstäder",
      sub: "Hantverk, svärdsfäktning och andra historiska färdigheter.",
      p1: "Nybörjarkurser ordnas runt om i Finland både höst och vår — kom med i hobbyn, lär dig grunderna och reglerna i vikingasvärdsfäktning för att kunna träna säkert med andra och delta i evenemang och uppvisningar.",
      p2: "Förutom nybörjarkurser i svärdsfäktning ordnar samma föreningar ofta andra hantverks- och färdighetskurser från järnåldern och medeltiden.",
      list_title: "Lägg till din kurs",
      list_body:
        "Vill du att din förenings kurs syns här? Kontakta oss via formuläret eller via e-post admin@viikinkitapahtumat.fi.",
      upcoming: "Kommande kurser",
    },
    guilds: {
      title: "Gillen & föreningar",
      sub: "Finlands vikingatida re-enactment-gemenskaper.",
      svtl_title: "Finlands Vikingakämpars Förbund",
      svtl_body:
        "SVTL, grundat 2025, är det nationella förbundet för utövare av vikingatida stridskonst i Finland. Medlemmar är samfund som tränar vikingatida, järnålders eller motsvarande stridsdiscipliner.",
      svtl_link: "SVTL webbplats",
      members_title: "SVTL:s medlemsföreningar",
      others_title: "Övriga föreningar, gillen och sällskap",
    },
    shops: {
      title: "Butiker & hantverkare",
      sub: "Material, kläder, vapen, smycken.",
      gear_title: "Utrustning & material",
      smiths_title: "Smeder",
    },
    sword: {
      title: "Vikingasvärdsfäktning & historisk re-enactment",
      lead: "En snabbt växande hobby som förenar historia, motion och gemenskap.",
      h_practice: "Vikingasvärdsfäktning",
      p1:
        "Vikingasvärdsfäktning rekonstruerar och levandegör vikingatidens stridskonst autentiskt, samtidigt som deltagarna får uppleva andan från det förflutna.",
      p2:
        "Det är inte bara fysisk aktivitet utan också en djupgående studie av vikingarnas krigföring och kultur. Utövarna fördjupar sig i historiska källor, arkeologiska fynd och stridsmetoder.",
      p3:
        "Den praktiska träningen fokuserar på grundläggande svärdsteknik, sköldarbete, fotarbete och stridsfärdigheter. Tidens vapen — vikingasvärd, sköldar och rustningar — skapar en så autentisk upplevelse som möjligt.",
      h_reenactment: "Re-enactment",
      r1:
        "Historisk re-enactment låter dig uppleva och studera tidigare epoker som levande händelser. Vikingatiden kommer fram färgstarkt och autentiskt.",
      r2:
        "Vikingatida re-enactors studerar noggrant tidens klädsel, vapen, mat och livsstil. De samlas på evenemang och festivaler för att framträda i sina roller.",
      r3:
        "Detta inkluderar traditionell matlagning, hantverk, tidens musik och uppvisningar av färdigheter.",
      r4:
        "Re-enactment förenar människor genom delad passion och erbjuder ett levande och interaktivt sätt att uppleva historia.",
      fact1: "Gemenskap — regelbundna träningar och evenemang runtom i Finland.",
      fact2: "Säkert — tydliga regler, träningsutrustning och erfarna instruktörer.",
      fact3: "Historiskt — autentiska tekniker, vapen och utrustning.",
    },
    contact: {
      title: "Kontakt",
      sub: "Saknas ditt evenemang i listningen, eller vill du komplettera eller rätta uppgifterna? Hör av dig.",
      email_label: "E-post",
      copy: "Kopiera",
      copied: "Kopierat!",
      form_title: "Snabbt meddelande",
      form_sub:
        "Det här formuläret öppnar din e-postklient med ett förifyllt meddelande. För fullständiga evenemangsanmälningar, använd sidan \"Anmäl evenemang\".",
      event_name: "Evenemangets namn",
      event_date: "Datum",
      info: "Mer information",
      send: "Öppna e-post",
      subject_default: "Evenemangsanmälan",
      tip: "Tips: bifoga länk och bild så ser ditt evenemang fint ut när det godkänts.",
    },
    fight_label: "Stridsstil",
    audience_label: "Klassificering",
    newsletter: {
      eyebrow: "Månadsbrev",
      title: "Få vikingakalendern i din inkorg",
      body:
        "En gång i månaden skickar vi en kort sammanfattning av kommande vikinga-, järnålders- och tidigmedeltida evenemang i Finland. Ingen spam, avsluta när som helst.",
      placeholder: "din@epost.se",
      cta: "Prenumerera",
      privacy:
        "Vi lagrar bara din e-postadress och språk. Vi delar inte e-postadresser med tredje part.",
      success_title: "Tack för att du prenumererar!",
      success_body: "Vi har skickat en bekräftelse till din e-post.",
      unsub_title: "Du har avregistrerats",
      unsub_body: "Du kommer inte längre att få vårt nyhetsbrev. Du kan prenumerera igen när som helst.",
      unsub_invalid_title: "Ogiltig länk",
      unsub_invalid_body: "Denna avregistreringslänk har gått ut eller är ogiltig.",
    },
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
