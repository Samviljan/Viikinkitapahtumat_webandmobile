import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { useSettings } from "@/src/lib/i18n";

export interface Coords {
  lat: number;
  lon: number;
}

interface State {
  coords: Coords | null;
  status: "idle" | "requesting" | "granted" | "denied" | "unavailable" | "disabled";
  error: string | null;
}

/**
 * Lazy GPS hook — does NOT prompt at app launch. Call `request()` when the user
 * taps "Lähellä minua". Once granted, the coordinate is cached for the session.
 *
 * Honors the `locationEnabled` privacy toggle from user settings: when the
 * toggle is off, `request()` immediately returns null with status="disabled"
 * and never asks the OS for permission.
 */
export function useLocation() {
  const { defaults } = useSettings();
  const [state, setState] = useState<State>({
    coords: null,
    status: "idle",
    error: null,
  });

  const request = useCallback(async () => {
    if (!defaults.locationEnabled) {
      setState({ coords: null, status: "disabled", error: null });
      return null;
    }
    setState((s) => ({ ...s, status: "requesting", error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState({ coords: null, status: "denied", error: null });
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c: Coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      setState({ coords: c, status: "granted", error: null });
      return c;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Location unavailable";
      setState({ coords: null, status: "unavailable", error: msg });
      return null;
    }
  }, [defaults.locationEnabled]);

  return { ...state, request };
}

/**
 * Haversine distance in kilometres between two lat/lon points.
 * Used by the home screen to filter "Within X km".
 */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Best-effort geocode of a Finnish location string → coordinates. Cached in
 * memory per process. Used to compute distance when the event has only a
 * `location` text field (no lat/lon stored on backend).
 */
const cache = new Map<string, Coords | null>();

export async function geocode(q: string): Promise<Coords | null> {
  const key = q.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const results = await Location.geocodeAsync(q);
    const first = results[0];
    const coords: Coords | null = first
      ? { lat: first.latitude, lon: first.longitude }
      : null;
    cache.set(key, coords);
    return coords;
  } catch {
    cache.set(key, null);
    return null;
  }
}
