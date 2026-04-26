import { useEffect, useState } from "react";
import { api } from "@/src/api/client";
import type { Guild, Merchant } from "@/src/types";

export function useGuilds() {
  const [data, setData] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api
      .get<Guild[]>("/guilds")
      .then((r) => active && setData(r.data || []))
      .catch((e) => active && setError(e.message || "Failed to load"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  return { data, loading, error };
}

export function useMerchants() {
  const [data, setData] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api
      .get<Merchant[]>("/merchants")
      .then((r) => active && setData(r.data || []))
      .catch((e) => active && setError(e.message || "Failed to load"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  return { data, loading, error };
}
