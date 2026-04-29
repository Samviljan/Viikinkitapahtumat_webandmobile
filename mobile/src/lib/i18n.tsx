/**
 * i18n + user settings for the mobile app.
 *
 * - Detects device locale on first launch (Localization.getLocales) and falls
 *   back to English for any locale we don't ship.
 * - Lets the user override language manually from the Settings screen.
 * - Persists the user choice plus default search filters and Near-me radius
 *   to AsyncStorage.
 * - Exposes a hook `useSettings()` that React components subscribe to.
 *
 * Translations live in `./translations.ts` to keep this file small.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { translations, SUPPORTED_LANGS, type Lang } from "./translations";

export type DateRangeFilter = "any" | "this_week" | "this_month" | "next_3_months";

/**
 * Defaults the user can configure in Settings. The Home screen still keeps its
 * own ephemeral state for the current session — the user can pull these as
 * defaults and override per session.
 */
export interface UserDefaults {
  /** Pre-selected country codes (ISO) — empty set means "all". */
  defaultCountries: string[];
  /** Pre-selected date range. */
  defaultDateRange: DateRangeFilter;
  /** Whether "Near me" should be on by default (requires location grant). */
  defaultNearMe: boolean;
  /** km radius for the "Near me" filter (default 200 km). */
  nearMeRadiusKm: number;
  /**
   * Master toggle: when false, the app will never request the GPS permission
   * nor read coordinates. The "Lähellä minua" filter is hidden.
   */
  locationEnabled: boolean;
}

const DEFAULTS: UserDefaults = {
  defaultCountries: [],
  defaultDateRange: "any",
  defaultNearMe: false,
  nearMeRadiusKm: 200,
  locationEnabled: true,
};

const STORAGE_LANG = "vk_lang";
const STORAGE_DEFAULTS = "vk_defaults";

interface SettingsCtx {
  /** Active language code. */
  lang: Lang;
  /** Translation function. Reads `key.path` (dotted) from translations[lang]. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Set language manually (writes to AsyncStorage). */
  setLang: (next: Lang) => void;
  /** Whether language was auto-detected vs explicitly chosen. */
  langChosen: boolean;
  /** User defaults for filters etc. */
  defaults: UserDefaults;
  setDefaults: (next: Partial<UserDefaults>) => void;
  loaded: boolean;
}

const Context = createContext<SettingsCtx | null>(null);

function detectDeviceLang(): Lang {
  try {
    const locales = Localization.getLocales();
    for (const l of locales) {
      const code = (l.languageCode || "").toLowerCase() as Lang;
      if (SUPPORTED_LANGS.includes(code)) return code;
    }
  } catch {
    /* ignore — fall through */
  }
  return "en"; // safe fallback
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fi");
  const [langChosen, setLangChosen] = useState(false);
  const [defaults, setDefaultsState] = useState<UserDefaults>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load persisted state once on mount.
  useEffect(() => {
    (async () => {
      try {
        const [storedLang, storedDefaults] = await Promise.all([
          AsyncStorage.getItem(STORAGE_LANG),
          AsyncStorage.getItem(STORAGE_DEFAULTS),
        ]);

        if (storedLang && SUPPORTED_LANGS.includes(storedLang as Lang)) {
          setLangState(storedLang as Lang);
          setLangChosen(true);
        } else {
          setLangState(detectDeviceLang());
        }

        if (storedDefaults) {
          try {
            const parsed = JSON.parse(storedDefaults);
            setDefaultsState({ ...DEFAULTS, ...parsed });
          } catch {
            /* ignore corrupt stored value */
          }
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setLangChosen(true);
    AsyncStorage.setItem(STORAGE_LANG, next).catch(() => {});
  }, []);

  const setDefaults = useCallback((patch: Partial<UserDefaults>) => {
    setDefaultsState((prev) => {
      const merged = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_DEFAULTS, JSON.stringify(merged)).catch(
        () => {},
      );
      return merged;
    });
  }, []);

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      // Lookup chain: chosen lang → en → fi (so missing keys never blow up)
      const chains: Lang[] = [lang, "en", "fi"];
      for (const code of chains) {
        const dict = translations[code] as unknown as Record<string, unknown> | undefined;
        if (!dict) continue;
        const parts = key.split(".");
        let cur: unknown = dict;
        for (const p of parts) {
          if (cur && typeof cur === "object" && p in (cur as object)) {
            cur = (cur as Record<string, unknown>)[p];
          } else {
            cur = undefined;
            break;
          }
        }
        if (typeof cur === "string") {
          let out = cur;
          if (vars) {
            for (const [k, v] of Object.entries(vars)) {
              out = out.replaceAll(`{${k}}`, String(v));
            }
          }
          return out;
        }
      }
      return key; // last-resort: return the key so missing translations are visible
    };
  }, [lang]);

  return (
    <Context.Provider
      value={{ lang, t, setLang, langChosen, defaults, setDefaults, loaded }}
    >
      {children}
    </Context.Provider>
  );
}

export function useSettings(): SettingsCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

/**
 * Pick a localised event field from the FastAPI response. Events ship with
 * `title_fi`, `title_en`, `title_sv` (and same for description). Falls back
 * to fi if the chosen language is missing on the doc.
 */
export function localized<
  T extends Record<string, unknown>,
  K extends string,
>(doc: T, base: K, lang: Lang): string {
  const keyChain: Lang[] = [lang, "en", "fi"];
  for (const l of keyChain) {
    const v = doc[`${base}_${l}` as keyof T];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
