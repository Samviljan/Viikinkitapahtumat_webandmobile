import { useCallback, useEffect, useState } from "react";

const KEY = "vk_favorites";
const EVT = "vk:favorites:change";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch (err) {
    console.warn("favorites: read failed", err);
    return [];
  }
}

function write(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVT, { detail: ids }));
  } catch (err) {
    // storage full, disabled, or in a sandboxed context — log but never crash UI.
    console.warn("favorites: write failed", err);
  }
}

/**
 * useFavorites — localStorage-backed favorites list of event IDs.
 * Syncs across tabs via the `storage` event AND across components in the
 * same tab via a custom `vk:favorites:change` event.
 */
export function useFavorites() {
  const [ids, setIds] = useState(() => (typeof window === "undefined" ? [] : read()));

  useEffect(() => {
    function refresh() {
      setIds(read());
    }
    function onStorage(e) {
      if (e.key === KEY) refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVT, refresh);
    };
  }, []);

  const toggle = useCallback((id) => {
    if (!id) return;
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(next);
  }, []);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const clear = useCallback(() => {
    write([]);
  }, []);

  return { ids, toggle, isFavorite, clear, count: ids.length };
}
