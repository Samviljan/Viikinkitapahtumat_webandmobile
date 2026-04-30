import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";

const KEY = "viikinki:favorite_merchants";

async function readLocal(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function writeLocal(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage full / unavailable — silently ignore
  }
}

const listeners = new Set<(ids: string[]) => void>();
let cache: string[] = [];

function publish(next: string[]) {
  cache = next;
  listeners.forEach((l) => l(next));
}

readLocal().then((ids) => {
  publish(ids);
});

/**
 * Cross-platform merchant favorites hook. Mirrors `useFavorites` (events) so
 * the UX is consistent: optimistic local toggle + server sync when logged in.
 *
 * Storage strategy:
 *   - Logged-in user: server (`users.favorite_merchant_ids`) is the source of
 *     truth. AsyncStorage mirrors it for instant rendering at app launch.
 *   - Anonymous user: AsyncStorage only.
 *   - On first login this session, anonymous local IDs are merged into the
 *     server list one-by-one via POST (no bulk endpoint exists yet — list is
 *     small, so per-id calls are fine).
 */
export function useFavoriteMerchants() {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(cache);
  const mergedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    const cb = (next: string[]) => setIds(next);
    listeners.add(cb);
    cb(cache);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  // Sync on login / logout / user change. The auth.user object already
  // contains favorite_merchant_ids so we don't need an extra GET.
  useEffect(() => {
    if (!user) {
      mergedForUserRef.current = null;
      return;
    }
    const serverIds = Array.isArray(user.favorite_merchant_ids)
      ? user.favorite_merchant_ids.filter((x: unknown): x is string => typeof x === "string")
      : [];

    if (mergedForUserRef.current !== user.id) {
      mergedForUserRef.current = user.id;
      const localIds = cache;
      const toUpload = localIds.filter((id) => !serverIds.includes(id));
      if (toUpload.length === 0) {
        writeLocal(serverIds);
        publish(serverIds);
        return;
      }
      // No bulk PUT for merchant favourites; POST each one. Run sequentially
      // so a single failure doesn't leave the list in a half-merged state.
      (async () => {
        let acc = serverIds.slice();
        for (const id of toUpload) {
          try {
            const res = await api.post<{ merchant_ids: string[] }>(
              `/users/me/favorite-merchants/${encodeURIComponent(id)}`,
            );
            acc = res.data?.merchant_ids || acc;
          } catch {
            // give up on this id; keep moving
          }
        }
        writeLocal(acc);
        publish(acc);
      })();
    } else {
      writeLocal(serverIds);
      publish(serverIds);
    }
  }, [user]);

  const toggle = useCallback(
    (id: string) => {
      if (!id) return;
      const current = cache;
      const isFav = current.includes(id);
      const next = isFav ? current.filter((x) => x !== id) : [...current, id];
      writeLocal(next);
      publish(next);
      if (user && user.id) {
        const path = `/users/me/favorite-merchants/${encodeURIComponent(id)}`;
        const promise = isFav
          ? api.delete<{ merchant_ids: string[] }>(path)
          : api.post<{ merchant_ids: string[] }>(path);
        promise
          .then((res) => {
            const serverIds = res.data?.merchant_ids || next;
            writeLocal(serverIds);
            publish(serverIds);
          })
          .catch(() => {
            writeLocal(current);
            publish(current);
          });
      }
    },
    [user],
  );

  const isFavorite = useCallback((id: string) => cache.includes(id), [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ids, toggle, isFavorite, count: ids.length };
}
