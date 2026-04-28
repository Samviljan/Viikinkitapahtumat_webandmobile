/**
 * i18n provider for the web app.
 *
 * Translation dictionaries live in ./i18n/{lang}.json — split per language so
 * each one can be maintained / regenerated independently. We import them all
 * statically (CRA bundles JSON) so tests and SSR-friendly tools don't have to
 * deal with an async fetch.
 *
 * Lookup chain: active language → en → fi. This means missing keys fall back
 * to English first, then to the canonical Finnish source. `t()` always
 * returns a non-empty value (or the key as a last resort).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import fi from "./i18n/fi.json";
import en from "./i18n/en.json";
import sv from "./i18n/sv.json";
import et from "./i18n/et.json";
import pl from "./i18n/pl.json";
import da from "./i18n/da.json";
import de from "./i18n/de.json";

const TRANSLATIONS = { fi, en, sv, et, pl, da, de };

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
      const fallbacks = [lang, "en", "fi"];
      for (const candidate of fallbacks) {
        let cur = TRANSLATIONS[candidate];
        let ok = true;
        for (const k of keys) {
          if (cur && typeof cur === "object" && k in cur) cur = cur[k];
          else {
            ok = false;
            break;
          }
        }
        if (ok && cur !== null && cur !== undefined) return cur;
      }
      return path;
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
