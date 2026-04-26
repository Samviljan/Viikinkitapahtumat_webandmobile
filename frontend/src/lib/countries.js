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

export function flagFor(code) {
  return COUNTRY_FLAGS[code] || "";
}
