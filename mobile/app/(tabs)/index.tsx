import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { EventCard } from "@/src/components/EventCard";
import { FilterChip, FilterChipsRow } from "@/src/components/FilterChips";
import { SearchBar } from "@/src/components/SearchBar";
import { useEvents } from "@/src/hooks/useEvents";
import { geocode, haversineKm, useLocation } from "@/src/hooks/useLocation";
import { parseEventDate } from "@/src/lib/format";
import { colors, spacing, text } from "@/src/lib/theme";
import type { VikingEvent } from "@/src/types";

type DateFilter = "any" | "this_week" | "this_month" | "next_3_months";
type LocationFilter = "any" | "near_me" | "text";

export default function HomeScreen() {
  const { events, loading, error, refresh } = useEvents();
  const { coords, status, request } = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [locFilter, setLocFilter] = useState<LocationFilter>("any");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [distances, setDistances] = useState<Record<string, number>>({});

  // Recompute distances when GPS or events change.
  useEffect(() => {
    if (!coords || events.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, number> = {};
      for (const ev of events) {
        const c = await geocode(ev.location);
        if (c) next[ev.id] = haversineKm(coords, c);
      }
      if (!cancelled) setDistances(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [coords, events]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function onTapNearMe() {
    if (locFilter === "near_me") {
      setLocFilter("any");
      return;
    }
    const c = coords ?? (await request());
    if (c) setLocFilter("near_me");
  }

  const filtered = useMemo(() => {
    let list = events;

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title_fi?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.description_fi?.toLowerCase().includes(q),
      );
    }

    if (locFilter === "near_me" && coords) {
      list = list.filter((e) => (distances[e.id] ?? Infinity) <= 200);
      list = [...list].sort(
        (a, b) => (distances[a.id] ?? 9999) - (distances[b.id] ?? 9999),
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateFilter !== "any") {
      const limit = new Date(today);
      if (dateFilter === "this_week") limit.setDate(limit.getDate() + 7);
      else if (dateFilter === "this_month") limit.setMonth(limit.getMonth() + 1);
      else if (dateFilter === "next_3_months") limit.setMonth(limit.getMonth() + 3);
      list = list.filter((e: VikingEvent) => {
        const s = parseEventDate(e.start_date);
        return s ? s >= today && s <= limit : false;
      });
    }

    return list;
  }, [events, searchText, locFilter, coords, distances, dateFilter]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={text.overline}>Saatavilla {filtered.length}</Text>
            <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.lg }]}>
              Tapahtumat
            </Text>
            <SearchBar
              testID="home-search"
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Etsi paikkakunnalla tai nimellä…"
            />
            <FilterChipsRow>
              <FilterChip
                testID="chip-near-me"
                active={locFilter === "near_me"}
                onPress={onTapNearMe}
                icon="location"
                label={
                  status === "requesting"
                    ? "Etsitään…"
                    : locFilter === "near_me"
                      ? "Lähellä minua"
                      : "Lähellä minua"
                }
              />
              <FilterChip
                testID="chip-week"
                active={dateFilter === "this_week"}
                onPress={() =>
                  setDateFilter(dateFilter === "this_week" ? "any" : "this_week")
                }
                icon="calendar"
                label="Tällä viikolla"
              />
              <FilterChip
                testID="chip-month"
                active={dateFilter === "this_month"}
                onPress={() =>
                  setDateFilter(dateFilter === "this_month" ? "any" : "this_month")
                }
                icon="calendar-outline"
                label="Tässä kuussa"
              />
              <FilterChip
                testID="chip-3mo"
                active={dateFilter === "next_3_months"}
                onPress={() =>
                  setDateFilter(
                    dateFilter === "next_3_months" ? "any" : "next_3_months",
                  )
                }
                icon="time-outline"
                label="3 kk"
              />
            </FilterChipsRow>
            {locFilter === "near_me" && status === "denied" ? (
              <View style={styles.banner}>
                <Ionicons name="warning-outline" size={14} color={colors.ember} />
                <Text style={styles.bannerText}>
                  Sijainti estetty asetuksissa. Hyväksy paikannus uudelleen.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={32} color={colors.stone} />
              <Text style={styles.emptyText}>
                Suodattimet eivät anna tuloksia. Kokeile löysempää valintaa.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "ios" ? spacing.sm : spacing.lg,
    paddingBottom: spacing.xxl,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(200,73,44,0.1)",
    borderColor: colors.ember,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.ember, fontSize: 12, flex: 1 },
  center: { alignItems: "center", paddingVertical: spacing.xxl },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.stone,
    textAlign: "center",
    fontSize: 14,
    paddingHorizontal: spacing.lg,
  },
  error: { color: colors.ember, padding: spacing.lg, textAlign: "center" },
});
