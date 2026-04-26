import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "viikinki:favorites";

async function read(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function write(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage full / unavailable — silently ignore
  }
}

/**
 * Module-level subscriber list lets multiple useFavorites() hooks across the
 * app stay in sync without React Context. Cheap and zero-dep.
 */
const listeners = new Set<(ids: string[]) => void>();
let cache: string[] = [];

read().then((ids) => {
  cache = ids;
  listeners.forEach((l) => l(ids));
});

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(cache);

  useEffect(() => {
    const cb = (next: string[]) => setIds(next);
    listeners.add(cb);
    cb(cache);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    cache = cache.includes(id) ? cache.filter((x) => x !== id) : [...cache, id];
    write(cache);
    listeners.forEach((l) => l(cache));
  }, []);

  const isFavorite = useCallback((id: string) => cache.includes(id), [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ids, toggle, isFavorite, count: ids.length };
}
