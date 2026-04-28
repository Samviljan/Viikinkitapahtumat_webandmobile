export const COUNTRY_FLAGS: Record<string, string> = {
  FI: "🇫🇮",
  SE: "🇸🇪",
  EE: "🇪🇪",
  NO: "🇳🇴",
  DK: "🇩🇰",
  PL: "🇵🇱",
  DE: "🇩🇪",
  IS: "🇮🇸",
  LV: "🇱🇻",
  LT: "🇱🇹",
  SI: "🇸🇮",
  HR: "🇭🇷",
  UA: "🇺🇦",
  NL: "🇳🇱",
  GB: "🇬🇧",
  IE: "🇮🇪",
  BE: "🇧🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  PT: "🇵🇹",
  IT: "🇮🇹",
};

export const COUNTRY_NAMES: Record<string, string> = {
  FI: "Suomi",
  SE: "Ruotsi",
  EE: "Viro",
  NO: "Norja",
  DK: "Tanska",
  PL: "Puola",
  DE: "Saksa",
  IS: "Islanti",
  LV: "Latvia",
  LT: "Liettua",
  SI: "Slovenia",
  HR: "Kroatia",
  UA: "Ukraina",
  NL: "Alankomaat",
  GB: "Iso-Britannia",
  IE: "Irlanti",
  BE: "Belgia",
  FR: "Ranska",
  ES: "Espanja",
  PT: "Portugali",
  IT: "Italia",
};

export const COUNTRY_CODES = Object.keys(COUNTRY_FLAGS);

export const flagFor = (code?: string): string =>
  code ? COUNTRY_FLAGS[code] ?? "🇫🇮" : "🇫🇮";

export const nameFor = (code?: string): string =>
  code ? COUNTRY_NAMES[code] ?? code : "";
