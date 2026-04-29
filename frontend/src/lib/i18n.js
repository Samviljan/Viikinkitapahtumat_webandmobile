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
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { api } from "./api";
import fi from "./i18n/fi.json";
import en from "./i18n/en.json";
import sv from "./i18n/sv.json";
import et from "./i18n/et.json";
import pl from "./i18n/pl.json";
import da from "./i18n/da.json";
import de from "./i18n/de.json";

const TRANSLATIONS = { fi, en, sv, et, pl, da, de };

const I18nContext = createContext(null);

const ANON_LANG_KEY = "vk_lang";
function readAnonLang() {
  try {
    return localStorage.getItem(ANON_LANG_KEY) || "fi";
  } catch {
    return "fi";
  }
}

export function I18nProvider({ children }) {
  const { user } = useAuth();
  // Track the previously-rendered user identity so we can react to logins,
  // logouts and account swaps. Also remember whether the user has explicitly
  // chosen a language during this session — this prevents the auth-driven
  // re-sync from clobbering the active selection right after the user changed
  // it but before /auth/me has caught up.
  const lastUserIdRef = useRef(null);
  const sessionPickedRef = useRef(false);

  const [lang, setLangState] = useState(() => readAnonLang());

  // Sync language when the auth state changes:
  //  - logged-in user with stored language → use that
  //  - logged-in user without stored language → fall back to anon localStorage
  //  - logged-out → revert to anonymous localStorage value
  // Identity comparison via id ensures swapping account A → B re-syncs.
  useEffect(() => {
    if (user === null) return; // initial /auth/me check still in flight
    const uid = user && user.id ? user.id : null;
    if (uid !== lastUserIdRef.current) {
      lastUserIdRef.current = uid;
      sessionPickedRef.current = false;
      const candidate = user && user.language;
      const next =
        candidate && TRANSLATIONS[candidate] ? candidate : readAnonLang();
      setLangState(next);
    } else if (
      user &&
      user.language &&
      TRANSLATIONS[user.language] &&
      !sessionPickedRef.current &&
      user.language !== lang
    ) {
      // Same user, server-side profile updated by another tab → reflect it.
      setLangState(user.language);
    }
    // We intentionally don't depend on `lang` here — only auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setLang = useCallback(
    (l) => {
      if (!TRANSLATIONS[l]) return;
      sessionPickedRef.current = true;
      // Anonymous users always get localStorage. Logged-in users also get it
      // (so a future logout falls back to the latest choice), but the source
      // of truth is the server profile.
      try {
        localStorage.setItem(ANON_LANG_KEY, l);
      } catch {
        /* ignore quota errors */
      }
      document.documentElement.lang = l;
      setLangState(l);
      if (user && user.id) {
        // Persist server-side, fire-and-forget. Failure simply means the
        // choice will not survive logout / device change — local state is
        // already updated either way.
        api.patch("/auth/profile", { language: l }).catch(() => {});
      }
    },
    [user],
  );

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
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
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
