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

export const flagFor = (code?: string): string =>
  code ? COUNTRY_FLAGS[code] ?? "🇫🇮" : "🇫🇮";
