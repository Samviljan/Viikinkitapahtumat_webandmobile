import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const KEY = "vk_favorites";
const EVT = "vk:favorites:change";

function readLocal() {
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

function writeLocal(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVT, { detail: ids }));
  } catch (err) {
    // storage full, disabled, or in a sandboxed context — log but never crash UI.
    console.warn("favorites: write failed", err);
  }
}

/**
 * useFavorites — favorites list of event IDs.
 *
 * Storage strategy:
 *   - Logged-in user: server (`users.favorite_event_ids`) is the source of
 *     truth. localStorage mirrors it for instant rendering on next pageload.
 *   - Anonymous user: localStorage only.
 *   - On login: any anon localStorage favorites are merged with the server
 *     list once via PUT /users/me/favorites, then the merged list is the
 *     source of truth.
 *
 * Cross-tab sync via the `storage` event still works because every server
 * update also writes to localStorage.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => (typeof window === "undefined" ? [] : readLocal()));
  const mergedForUserRef = useRef(null);

  // Sync down from the auth context whenever the user (re)loads. The auth
  // payload already contains favorite_event_ids so we don't need an extra GET.
  useEffect(() => {
    if (!user) {
      // Logged out — keep whatever is in localStorage. Don't clobber it.
      return;
    }
    const serverIds = Array.isArray(user.favorite_event_ids)
      ? user.favorite_event_ids.filter((x) => typeof x === "string")
      : [];

    // First time we see this user-id this session, merge anon localStorage
    // into the server list. Subsequent renders just mirror server → local.
    if (mergedForUserRef.current !== user.id) {
      mergedForUserRef.current = user.id;
      const localIds = readLocal();
      const merged = Array.from(new Set([...serverIds, ...localIds]));
      const needsUpload = merged.length !== serverIds.length;
      if (needsUpload) {
        api
          .put("/users/me/favorites", { event_ids: merged })
          .then((res) => {
            const next = res.data?.event_ids || merged;
            writeLocal(next);
            setIds(next);
          })
          .catch(() => {
            // network / 401 — stay with server list
            writeLocal(serverIds);
            setIds(serverIds);
          });
      } else {
        writeLocal(serverIds);
        setIds(serverIds);
      }
    } else {
      // Same user, but `user` reference changed (e.g. profile updated in
      // another tab). Mirror server → local.
      writeLocal(serverIds);
      setIds(serverIds);
    }
  }, [user]);

  // Cross-tab + same-tab updates (only matters for anon users now; the auth
  // useEffect above takes precedence for signed-in users).
  useEffect(() => {
    function refresh() {
      setIds(readLocal());
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

  const toggle = useCallback(
    (id) => {
      if (!id) return;
      const current = readLocal();
      const isFav = current.includes(id);
      const next = isFav ? current.filter((x) => x !== id) : [...current, id];
      // Optimistic local update — UI feels instant
      writeLocal(next);
      setIds(next);
      // Persist to server when logged in. Failure → revert local to server.
      if (user && user.id) {
        const url = `/users/me/favorites/${encodeURIComponent(id)}`;
        const promise = isFav ? api.delete(url) : api.post(url);
        promise
          .then((res) => {
            const serverIds = res.data?.event_ids || next;
            writeLocal(serverIds);
            setIds(serverIds);
          })
          .catch(() => {
            // Revert optimistic update
            writeLocal(current);
            setIds(current);
          });
      }
    },
    [user],
  );

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const clear = useCallback(() => {
    writeLocal([]);
    setIds([]);
    if (user && user.id) {
      api.put("/users/me/favorites", { event_ids: [] }).catch(() => {});
    }
  }, [user]);

  return { ids, toggle, isFavorite, clear, count: ids.length };
}
