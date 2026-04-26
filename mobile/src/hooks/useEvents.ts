import { useEffect, useState, useCallback } from "react";
import { api } from "@/src/api/client";
import { VikingEvent } from "@/src/types";

interface UseEventsResult {
  events: VikingEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<VikingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<VikingEvent[]>("/events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load events";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, error, refresh };
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<VikingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<VikingEvent>(`/events/${id}`)
      .then(({ data }) => {
        if (active) setEvent(data);
      })
      .catch((e) => {
        if (active) setError(e.message || "Failed to load event");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return { event, loading, error };
}
