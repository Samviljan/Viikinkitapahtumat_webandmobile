import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";

const KEY = "viikinki:favorites";

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

/**
 * Module-level subscriber list lets multiple useFavorites() hooks across the
 * app stay in sync without React Context. Cheap and zero-dep.
 */
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
 * Cross-platform favorites hook.
 *
 * Storage strategy:
 *   - Logged-in user: server (`users.favorite_event_ids`) is the source of
 *     truth. AsyncStorage mirrors it for instant rendering at app launch.
 *   - Anonymous user: AsyncStorage only.
 *   - On login: any anonymous AsyncStorage favorites are merged into the
 *     server list once via PUT /users/me/favorites, then the merged list
 *     becomes the source of truth (same UX as the web).
 */
export function useFavorites() {
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
  // contains favorite_event_ids so we don't need an extra GET.
  useEffect(() => {
    if (!user) {
      // Anonymous — keep whatever AsyncStorage has.
      mergedForUserRef.current = null;
      return;
    }
    const serverIds = Array.isArray(user.favorite_event_ids)
      ? user.favorite_event_ids.filter((x: unknown): x is string => typeof x === "string")
      : [];

    // First time we see this user-id this session, merge anonymous local
    // favorites into the server list.
    if (mergedForUserRef.current !== user.id) {
      mergedForUserRef.current = user.id;
      const localIds = cache;
      const merged = Array.from(new Set([...serverIds, ...localIds]));
      const needsUpload = merged.length !== serverIds.length;
      if (needsUpload) {
        api
          .put<{ event_ids: string[] }>("/users/me/favorites", { event_ids: merged })
          .then((res) => {
            const next = res.data?.event_ids || merged;
            writeLocal(next);
            publish(next);
          })
          .catch(() => {
            writeLocal(serverIds);
            publish(serverIds);
          });
      } else {
        writeLocal(serverIds);
        publish(serverIds);
      }
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
      // Optimistic local update — UI feels instant
      writeLocal(next);
      publish(next);
      if (user && user.id) {
        const path = `/users/me/favorites/${encodeURIComponent(id)}`;
        const promise = isFav ? api.delete<{ event_ids: string[] }>(path) : api.post<{ event_ids: string[] }>(path);
        promise
          .then((res) => {
            const serverIds = res.data?.event_ids || next;
            writeLocal(serverIds);
            publish(serverIds);
          })
          .catch(() => {
            // Revert optimistic update
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
