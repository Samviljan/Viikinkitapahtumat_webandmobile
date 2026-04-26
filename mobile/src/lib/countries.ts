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
};

export const COUNTRY_CODES = Object.keys(COUNTRY_FLAGS);

export const flagFor = (code?: string): string =>
  code ? COUNTRY_FLAGS[code] ?? "🇫🇮" : "🇫🇮";

export const nameFor = (code?: string): string =>
  code ? COUNTRY_NAMES[code] ?? code : "";
