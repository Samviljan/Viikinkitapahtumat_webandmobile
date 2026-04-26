/**
 * Viking aesthetic mirroring the website (dark + ember + gold + bone).
 * Centralised so every component reaches the same palette/typography.
 */
export const colors = {
  bg: "#0E0B09",
  surface: "#1A1411",
  surface2: "#221915",
  edge: "#352A23",

  bone: "#F5EFE3",
  stone: "#A89A82",
  ember: "#C8492C",
  emberHover: "#A53C25",
  gold: "#C9A14A",
  forest: "#1F3026",
};

export const radius = { sm: 4, md: 8, lg: 12, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const fonts = {
  // Native system fonts; switch to custom Cinzel/IM Fell once we add expo-font assets.
  serif: undefined,
  sans: undefined,
};

export const text = {
  h1: { fontSize: 32, fontWeight: "700" as const, color: colors.bone },
  h2: { fontSize: 22, fontWeight: "700" as const, color: colors.bone },
  body: { fontSize: 15, color: colors.bone },
  meta: { fontSize: 13, color: colors.stone },
  overline: {
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    fontWeight: "600" as const,
  },
};
