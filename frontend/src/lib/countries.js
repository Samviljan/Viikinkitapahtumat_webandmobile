/**
 * Country code → emoji flag + display name (used in event cards/details).
 * Emoji flags work across all major browsers and don't require image assets.
 */

export const COUNTRY_FLAGS = {
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

export const COUNTRY_NAMES = {
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

export function flagFor(code) {
  return COUNTRY_FLAGS[code] || "";
}

export function nameFor(code) {
  return COUNTRY_NAMES[code] || code;
}
