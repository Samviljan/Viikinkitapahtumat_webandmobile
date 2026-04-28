/**
 * Translation strings for the mobile app.
 *
 * Convention: dotted keys (`tab.home`, `home.near_me`) accessed via t().
 * Languages we ship: FI (default), EN, SV.
 * Estonian (et) and Polish (pl) users will see English thanks to the
 * fallback chain in i18n.tsx.
 */

export const SUPPORTED_LANGS = ["fi", "en", "sv"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

interface Dict {
  brand: { title: string; tagline: string };
  tab: { home: string; favorites: string; calendar: string; shops: string; settings: string };
  home: {
    title: string;
    near_me: string;
    near_me_radius: string;
    countries: string;
    date_any: string;
    date_this_week: string;
    date_this_month: string;
    date_next_3_months: string;
    search_placeholder: string;
    no_events: string;
    show_past: string;
    hide_past: string;
    loading: string;
    error_load: string;
    retry: string;
    showing_count: string;
    pull_to_refresh: string;
    countdown_label: string;
  };
  countdown: {
    today: string;
    tomorrow: string;
    days: string;
    weeks: string;
    months: string;
    past: string;
  };
  category: {
    market: string;
    training_camp: string;
    course: string;
    festival: string;
    meetup: string;
    other: string;
  };
  event: { back: string; favorite: string; unfavorite: string; share: string };
  favorites: { title: string; empty: string; browse: string };
  calendar: { title: string };
  shops: { title: string; empty: string };
  settings: {
    title: string;
    sub: string;
    section_language: string;
    section_filters: string;
    section_near_me: string;
    section_about: string;
    section_profile: string;
    nav_profile: string;
    nav_search: string;
    nav_about: string;
    language_auto: string;
    save_defaults: string;
    saved_toast: string;
    reset: string;
    reset_confirm: string;
    near_me_radius_label: string;
    near_me_radius_help: string;
    default_date_range: string;
    default_countries: string;
    default_near_me: string;
    open_about: string;
  };
  auth: {
    signed_out_title: string;
    signed_out_sub: string;
    sign_in: string;
    sign_up: string;
    sign_out: string;
    google_sign_in: string;
    or: string;
    email: string;
    password: string;
    password_min: string;
    nickname: string;
    user_types_label: string;
    user_types_help: string;
    type_reenactor: string;
    type_fighter: string;
    type_merchant: string;
    type_organizer: string;
    have_account: string;
    no_account: string;
    error_invalid: string;
    error_duplicate: string;
    error_generic: string;
    profile_title: string;
    profile_save: string;
    profile_saved: string;
    confirm_sign_out: string;
  };
  info: {
    title: string;
    sub: string;
    version: string;
    build: string;
    runtime: string;
    platform: string;
    open_web: string;
    contact_title: string;
    contact_help: string;
    contact_subject_label: string;
    contact_message_label: string;
    contact_subject_default: string;
    contact_send: string;
    share_app: string;
    share_app_sub: string;
    share_message: string;
  };
  common: { cancel: string; ok: string; save: string; close: string; back: string };
  langs: { fi: string; en: string; sv: string };
  units: { km: string };
}

export const translations: Record<Lang, Dict> = {
  fi: {
    brand: {
      title: "VIIKINKITAPAHTUMAT",
      tagline: "Pohjoisen viikinki- ja rauta-aikaharrastajien kalenteri",
    },
    tab: {
      home: "Etusivu",
      favorites: "Suosikit",
      calendar: "Kalenteri",
      shops: "Kauppiaat",
      settings: "Asetukset",
    },
    home: {
      title: "Tapahtumat",
      near_me: "Lähellä minua",
      near_me_radius: "{km} km säde",
      countries: "Maat",
      date_any: "Milloin tahansa",
      date_this_week: "Tällä viikolla",
      date_this_month: "Tässä kuussa",
      date_next_3_months: "Seuraavat 3 kk",
      search_placeholder: "Hae tapahtumaa…",
      no_events: "Ei tapahtumia tällä haulla.",
      show_past: "Näytä menneet",
      hide_past: "Piilota menneet",
      loading: "Ladataan…",
      error_load: "Tapahtumien lataus epäonnistui.",
      retry: "Yritä uudelleen",
      showing_count: "{n} tapahtumaa",
      pull_to_refresh: "Vedä päivittääksesi",
      countdown_label: "TAPAHTUMAAN",
    },
    countdown: {
      today: "Tänään",
      tomorrow: "Huomenna",
      days: "{n} pv",
      weeks: "{n} vk",
      months: "{n} kk",
      past: "Ohi",
    },
    category: {
      market: "Markkinat",
      training_camp: "Harjoitusleiri",
      course: "Kurssi",
      festival: "Festivaali",
      meetup: "Kokoontuminen",
      other: "Muu",
    },
    event: {
      back: "Takaisin",
      favorite: "Lisää suosikkeihin",
      unfavorite: "Poista suosikeista",
      share: "Jaa",
    },
    favorites: {
      title: "Suosikit",
      empty: "Et ole vielä lisännyt tapahtumia suosikkeihin.",
      browse: "Selaa tapahtumia",
    },
    calendar: { title: "Kalenteri" },
    shops: { title: "Kauppiaat ja sepät", empty: "Ei kauppiaita listattuna." },
    settings: {
      title: "Asetukset",
      sub: "Säädä kieli ja oletushakufiltterit.",
      section_language: "Kieli",
      section_filters: "Oletushakufiltterit",
      section_near_me: "Lähellä minua",
      section_about: "Sovelluksesta",
      section_profile: "Profiili",
      nav_profile: "Profiili",
      nav_search: "Hakuasetukset",
      nav_about: "Tietoa sovelluksesta",
      language_auto: "Tunnista automaattisesti",
      save_defaults: "Tallenna oletukseksi",
      saved_toast: "Tallennettu",
      reset: "Palauta oletukset",
      reset_confirm: "Palautetaanko kaikki asetukset oletusarvoihin?",
      near_me_radius_label: "Säde",
      near_me_radius_help:
        "Lähellä minua -hakua varten. Vain tämän säteen sisällä olevat tapahtumat näytetään.",
      default_date_range: "Oletus aikaväli",
      default_countries: "Oletus maat",
      default_near_me: "Lähellä minua oletuksena päällä",
      open_about: "Tietoa sovelluksesta",
    },
    auth: {
      signed_out_title: "Kirjaudu sisään",
      signed_out_sub:
        "Kirjautuminen on vapaaehtoista. Sen avulla voit tallentaa profiilisi ja saada jatkossa lisätoimintoja.",
      sign_in: "Kirjaudu",
      sign_up: "Luo tili",
      sign_out: "Kirjaudu ulos",
      google_sign_in: "Jatka Googlella",
      or: "tai",
      email: "Sähköposti",
      password: "Salasana",
      password_min: "Vähintään 8 merkkiä",
      nickname: "Nimimerkki",
      user_types_label: "Olen…",
      user_types_help: "Voit valita yhden tai useamman.",
      type_reenactor: "Elävöittäjä",
      type_fighter: "Taistelija",
      type_merchant: "Kauppias",
      type_organizer: "Tapahtumajärjestäjä",
      have_account: "Onko jo tili? Kirjaudu",
      no_account: "Ei tiliä? Luo tili",
      error_invalid: "Virheellinen sähköposti tai salasana.",
      error_duplicate: "Sähköposti on jo käytössä.",
      error_generic: "Toiminto epäonnistui. Yritä uudelleen.",
      profile_title: "Profiili",
      profile_save: "Tallenna",
      profile_saved: "Profiili tallennettu",
      confirm_sign_out: "Kirjaudutaanko ulos?",
    },
    info: {
      title: "Tietoa sovelluksesta",
      sub: "Versio, yhteydenotto ja lisätietoja.",
      version: "Versio",
      build: "Build",
      runtime: "Runtime",
      platform: "Alusta",
      open_web: "Avaa verkkosivu",
      contact_title: "Yhteydenotto",
      contact_help:
        "Lähetä viesti suoraan kehittäjälle (avaa sähköpostisovelluksesi).",
      contact_subject_label: "Aihe",
      contact_message_label: "Viesti",
      contact_subject_default: "Palaute Viikinkitapahtumat-sovelluksesta",
      contact_send: "Lähetä",
      share_app: "Jaa sovellus",
      share_app_sub: "Kutsu kaverit löytämään tapahtumat",
      share_message:
        "Pohjoisen viikinki- ja rauta-aikatapahtumat yhdessä paikassa. Selaa kalenteri ja tallenna suosikit:",
    },
    common: { cancel: "Peruuta", ok: "OK", save: "Tallenna", close: "Sulje", back: "Takaisin" },
    langs: { fi: "Suomi", en: "English", sv: "Svenska" },
    units: { km: "km" },
  },

  en: {
    brand: {
      title: "VIKING EVENTS",
      tagline: "Nordic viking-age and iron-age reenactment calendar",
    },
    tab: {
      home: "Home",
      favorites: "Favorites",
      calendar: "Calendar",
      shops: "Merchants",
      settings: "Settings",
    },
    home: {
      title: "Events",
      near_me: "Near me",
      near_me_radius: "{km} km radius",
      countries: "Countries",
      date_any: "Any time",
      date_this_week: "This week",
      date_this_month: "This month",
      date_next_3_months: "Next 3 months",
      search_placeholder: "Search events…",
      no_events: "No events match this filter.",
      show_past: "Show past",
      hide_past: "Hide past",
      loading: "Loading…",
      error_load: "Failed to load events.",
      retry: "Retry",
      showing_count: "{n} events",
      pull_to_refresh: "Pull to refresh",
      countdown_label: "STARTS IN",
    },
    countdown: {
      today: "Today",
      tomorrow: "Tomorrow",
      days: "{n} d",
      weeks: "{n} w",
      months: "{n} mo",
      past: "Past",
    },
    category: {
      market: "Market",
      training_camp: "Training camp",
      course: "Course",
      festival: "Festival",
      meetup: "Meetup",
      other: "Other",
    },
    event: { back: "Back", favorite: "Add to favorites", unfavorite: "Remove from favorites", share: "Share" },
    favorites: {
      title: "Favorites",
      empty: "You haven't favorited any events yet.",
      browse: "Browse events",
    },
    calendar: { title: "Calendar" },
    shops: { title: "Merchants & smiths", empty: "No merchants listed." },
    settings: {
      title: "Settings",
      sub: "Adjust language and default search filters.",
      section_language: "Language",
      section_filters: "Default search filters",
      section_near_me: "Near me",
      section_about: "About",
      section_profile: "Profile",
      nav_profile: "Profile",
      nav_search: "Search settings",
      nav_about: "About the app",
      language_auto: "Auto-detect",
      save_defaults: "Save as default",
      saved_toast: "Saved",
      reset: "Reset to defaults",
      reset_confirm: "Reset all settings to defaults?",
      near_me_radius_label: "Radius",
      near_me_radius_help:
        "For the Near me filter. Only events within this distance will be shown.",
      default_date_range: "Default date range",
      default_countries: "Default countries",
      default_near_me: "Near me on by default",
      open_about: "About the app",
    },
    auth: {
      signed_out_title: "Sign in",
      signed_out_sub:
        "Sign-in is optional. It lets you save your profile and unlock more features later.",
      sign_in: "Sign in",
      sign_up: "Create account",
      sign_out: "Sign out",
      google_sign_in: "Continue with Google",
      or: "or",
      email: "Email",
      password: "Password",
      password_min: "At least 8 characters",
      nickname: "Nickname",
      user_types_label: "I am a…",
      user_types_help: "Pick one or more.",
      type_reenactor: "Reenactor",
      type_fighter: "Fighter",
      type_merchant: "Merchant",
      type_organizer: "Event organizer",
      have_account: "Have an account? Sign in",
      no_account: "No account? Create one",
      error_invalid: "Invalid email or password.",
      error_duplicate: "Email is already registered.",
      error_generic: "Something went wrong. Try again.",
      profile_title: "Profile",
      profile_save: "Save",
      profile_saved: "Profile saved",
      confirm_sign_out: "Sign out?",
    },
    info: {
      title: "About the app",
      sub: "Version, contact and more info.",
      version: "Version",
      build: "Build",
      runtime: "Runtime",
      platform: "Platform",
      open_web: "Open website",
      contact_title: "Contact",
      contact_help: "Send a message directly to the developer (opens your email app).",
      contact_subject_label: "Subject",
      contact_message_label: "Message",
      contact_subject_default: "Feedback on Viking Events app",
      contact_send: "Send",
      share_app: "Share app",
      share_app_sub: "Invite friends to discover events",
      share_message:
        "Nordic viking-age and iron-age events in one place. Browse the calendar and save favorites:",
    },
    common: { cancel: "Cancel", ok: "OK", save: "Save", close: "Close", back: "Back" },
    langs: { fi: "Suomi", en: "English", sv: "Svenska" },
    units: { km: "km" },
  },

  sv: {
    brand: {
      title: "VIKINGAEVENT",
      tagline: "Nordens vikinga- och järnålders-kalender",
    },
    tab: {
      home: "Hem",
      favorites: "Favoriter",
      calendar: "Kalender",
      shops: "Handlare",
      settings: "Inställningar",
    },
    home: {
      title: "Evenemang",
      near_me: "Nära mig",
      near_me_radius: "{km} km radie",
      countries: "Länder",
      date_any: "När som helst",
      date_this_week: "Denna vecka",
      date_this_month: "Denna månad",
      date_next_3_months: "Nästa 3 månader",
      search_placeholder: "Sök evenemang…",
      no_events: "Inga evenemang matchar.",
      show_past: "Visa äldre",
      hide_past: "Dölj äldre",
      loading: "Laddar…",
      error_load: "Kunde inte ladda evenemang.",
      retry: "Försök igen",
      showing_count: "{n} evenemang",
      pull_to_refresh: "Dra för att uppdatera",
      countdown_label: "BÖRJAR OM",
    },
    countdown: {
      today: "Idag",
      tomorrow: "Imorgon",
      days: "{n} d",
      weeks: "{n} v",
      months: "{n} mån",
      past: "Förbi",
    },
    category: {
      market: "Marknad",
      training_camp: "Träningsläger",
      course: "Kurs",
      festival: "Festival",
      meetup: "Träff",
      other: "Övrigt",
    },
    event: { back: "Tillbaka", favorite: "Lägg till favorit", unfavorite: "Ta bort favorit", share: "Dela" },
    favorites: {
      title: "Favoriter",
      empty: "Du har inte sparat några favoriter ännu.",
      browse: "Bläddra i evenemang",
    },
    calendar: { title: "Kalender" },
    shops: { title: "Handlare & smeder", empty: "Inga handlare listade." },
    settings: {
      title: "Inställningar",
      sub: "Anpassa språk och förvalda sökfilter.",
      section_language: "Språk",
      section_filters: "Förvalda sökfilter",
      section_near_me: "Nära mig",
      section_about: "Om",
      section_profile: "Profil",
      nav_profile: "Profil",
      nav_search: "Sökinställningar",
      nav_about: "Om appen",
      language_auto: "Autoidentifiera",
      save_defaults: "Spara som förval",
      saved_toast: "Sparat",
      reset: "Återställ förval",
      reset_confirm: "Återställ alla inställningar?",
      near_me_radius_label: "Radie",
      near_me_radius_help:
        "För Nära mig-filtret. Endast evenemang inom denna radie visas.",
      default_date_range: "Förvalt datumintervall",
      default_countries: "Förvalda länder",
      default_near_me: "Nära mig som förval",
      open_about: "Om appen",
    },
    auth: {
      signed_out_title: "Logga in",
      signed_out_sub:
        "Inloggning är valfri. Den låter dig spara din profil och få fler funktioner senare.",
      sign_in: "Logga in",
      sign_up: "Skapa konto",
      sign_out: "Logga ut",
      google_sign_in: "Fortsätt med Google",
      or: "eller",
      email: "E-post",
      password: "Lösenord",
      password_min: "Minst 8 tecken",
      nickname: "Smeknamn",
      user_types_label: "Jag är…",
      user_types_help: "Välj en eller flera.",
      type_reenactor: "Återskapare",
      type_fighter: "Krigare",
      type_merchant: "Handlare",
      type_organizer: "Evenemangsarrangör",
      have_account: "Har du konto? Logga in",
      no_account: "Inget konto? Skapa ett",
      error_invalid: "Ogiltig e-post eller lösenord.",
      error_duplicate: "E-posten är redan registrerad.",
      error_generic: "Något gick fel. Försök igen.",
      profile_title: "Profil",
      profile_save: "Spara",
      profile_saved: "Profil sparad",
      confirm_sign_out: "Logga ut?",
    },
    info: {
      title: "Om appen",
      sub: "Version, kontakt och mer info.",
      version: "Version",
      build: "Build",
      runtime: "Runtime",
      platform: "Plattform",
      open_web: "Öppna webbplats",
      contact_title: "Kontakt",
      contact_help: "Skicka ett meddelande direkt till utvecklaren (öppnar din e-postapp).",
      contact_subject_label: "Ämne",
      contact_message_label: "Meddelande",
      contact_subject_default: "Feedback på Vikingaevent-appen",
      contact_send: "Skicka",
      share_app: "Dela appen",
      share_app_sub: "Bjud in vänner att upptäcka evenemang",
      share_message:
        "Nordens vikinga- och järnålders-evenemang på ett ställe. Bläddra i kalendern och spara favoriter:",
    },
    common: { cancel: "Avbryt", ok: "OK", save: "Spara", close: "Stäng", back: "Tillbaka" },
    langs: { fi: "Suomi", en: "English", sv: "Svenska" },
    units: { km: "km" },
  },
};
