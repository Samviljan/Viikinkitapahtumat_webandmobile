import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { EventCard } from "@/src/components/EventCard";
import { FilterChip, FilterChipsRow } from "@/src/components/FilterChips";
import { SearchBar } from "@/src/components/SearchBar";
import { SearchPanel, SearchPanelSection } from "@/src/components/SearchPanel";
import { MonthPicker, MonthValue } from "@/src/components/MonthPicker";
import { useEvents } from "@/src/hooks/useEvents";
import { geocode, haversineKm, useLocation } from "@/src/hooks/useLocation";
import { parseEventDate } from "@/src/lib/format";
import { COUNTRY_CODES, COUNTRY_FLAGS, COUNTRY_NAMES } from "@/src/lib/countries";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { localized, useSettings } from "@/src/lib/i18n";
import type { VikingEvent } from "@/src/types";

type DateFilter = "any" | "this_week" | "this_month" | "next_3_months";

export default function HomeScreen() {
  const router = useRouter();
  const { t, lang, defaults, loaded } = useSettings();
  const [includePast, setIncludePast] = useState(false);
  const { events, loading, error, refresh } = useEvents(includePast);
  const { coords, status, request } = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [nearMe, setNearMe] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(
    () => new Set(),
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [monthFilter, setMonthFilter] = useState<MonthValue | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});
  // Once defaults have loaded from AsyncStorage, copy them into the session
  // state. The user can then override per-session without affecting defaults.
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  useEffect(() => {
    if (!loaded || defaultsApplied) return;
    setSelectedCountries(new Set(defaults.defaultCountries));
    setDateFilter(defaults.defaultDateRange);
    setNearMe(defaults.locationEnabled && defaults.defaultNearMe);
    setDefaultsApplied(true);
  }, [loaded, defaults, defaultsApplied]);

  // If the user toggles GPS off in settings while "Near me" was active, clear
  // the session filter so the list expands back to the full set.
  useEffect(() => {
    if (!defaults.locationEnabled && nearMe) setNearMe(false);
  }, [defaults.locationEnabled, nearMe]);

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

  async function onTapNearMe() {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    const c = coords ?? (await request());
    if (c) setNearMe(true);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  // Tapping a date-range chip clears the explicit month picker (and vice versa)
  function setRange(next: DateFilter) {
    setDateFilter((cur) => (cur === next ? "any" : next));
    setMonthFilter(null);
  }
  function pickMonth(m: MonthValue | null) {
    setMonthFilter(m);
    if (m) setDateFilter("any");
  }

  const filtered = useMemo(() => {
    let list = events;

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const titleL = localized(e as unknown as Record<string, unknown>, "title", lang);
        const descL = localized(e as unknown as Record<string, unknown>, "description", lang);
        return (
          titleL.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          descL.toLowerCase().includes(q)
        );
      });
    }

    if (nearMe && coords) {
      const radius = defaults.nearMeRadiusKm;
      list = list.filter((e) => (distances[e.id] ?? Infinity) <= radius);
      list = [...list].sort(
        (a, b) => (distances[a.id] ?? 9999) - (distances[b.id] ?? 9999),
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (monthFilter) {
      const startOfMonth = new Date(monthFilter.year, monthFilter.month, 1);
      const endOfMonth = new Date(monthFilter.year, monthFilter.month + 1, 0);
      list = list.filter((e: VikingEvent) => {
        const s = parseEventDate(e.start_date);
        const ee = parseEventDate(e.end_date) || s;
        if (!s || !ee) return false;
        return s <= endOfMonth && ee >= startOfMonth;
      });
    } else if (dateFilter !== "any") {
      const limit = new Date(today);
      if (dateFilter === "this_week") limit.setDate(limit.getDate() + 7);
      else if (dateFilter === "this_month") limit.setMonth(limit.getMonth() + 1);
      else if (dateFilter === "next_3_months") limit.setMonth(limit.getMonth() + 3);
      list = list.filter((e: VikingEvent) => {
        const s = parseEventDate(e.start_date);
        return s ? s >= today && s <= limit : false;
      });
    }

    if (selectedCountries.size > 0) {
      list = list.filter((e) => selectedCountries.has(e.country || "FI"));
    }

    return list;
  }, [events, searchText, nearMe, coords, distances, dateFilter, monthFilter, selectedCountries, lang, defaults.nearMeRadiusKm]);

  // Only show country chips for countries that exist in the unfiltered result set
  const presentCountries = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.country || "FI");
    return COUNTRY_CODES.filter((c) => set.has(c));
  }, [events]);

  function toggleCountry(code: string) {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const activeSummary = useMemo(() => {
    const parts: string[] = [];
    if (nearMe) parts.push(t("home.near_me"));
    if (monthFilter) {
      // Localised month names — use Intl for non-Finnish locales
      try {
        const dt = new Date(monthFilter.year, monthFilter.month, 1);
        const name = new Intl.DateTimeFormat(lang, { month: "long" }).format(dt);
        parts.push(`${name.charAt(0).toUpperCase()}${name.slice(1)} ${monthFilter.year}`);
      } catch {
        parts.push(`${monthFilter.month + 1}/${monthFilter.year}`);
      }
    } else if (dateFilter === "this_week") parts.push(t("home.date_this_week"));
    else if (dateFilter === "this_month") parts.push(t("home.date_this_month"));
    else if (dateFilter === "next_3_months") parts.push(t("home.date_next_3_months"));
    return parts.join(" · ");
  }, [nearMe, dateFilter, monthFilter, t, lang]);

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.brand}>
              <Text style={styles.brandRune}>ᚠ</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandTitle}>{t("brand.title")}</Text>
                <Text style={styles.brandTagline}>
                  {t("brand.tagline")}
                </Text>
              </View>
              <Pressable
                testID="open-info"
                onPress={() => router.push("/info" as never)}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.infoBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityLabel={t("info.title")}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colors.gold}
                />
              </Pressable>
            </View>

            <Text style={text.overline}>{t("home.showing_count", { n: events.length })}</Text>
            <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.lg }]}>
              {t("home.title")}
            </Text>

            <SearchPanel title={t("home.title")} resultsCount={filtered.length}>
              <SearchPanelSection label={t("home.search_placeholder")}>
                <SearchBar
                  testID="home-search"
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={t("home.search_placeholder")}
                />
              </SearchPanelSection>

              <SearchPanelSection label={t("home.near_me")}>
                <FilterChipsRow>
                  {defaults.locationEnabled ? (
                    <FilterChip
                      testID="chip-near-me"
                      active={nearMe}
                      onPress={onTapNearMe}
                      icon="location"
                      label={
                        status === "requesting"
                          ? t("home.loading")
                          : `${t("home.near_me")} · ${t("home.near_me_radius", { km: defaults.nearMeRadiusKm })}`
                      }
                    />
                  ) : null}
                  <FilterChip
                    testID="chip-week"
                    active={dateFilter === "this_week"}
                    onPress={() => setRange("this_week")}
                    icon="calendar"
                    label={t("home.date_this_week")}
                  />
                  <FilterChip
                    testID="chip-month"
                    active={dateFilter === "this_month"}
                    onPress={() => setRange("this_month")}
                    icon="calendar-outline"
                    label={t("home.date_this_month")}
                  />
                  <FilterChip
                    testID="chip-3mo"
                    active={dateFilter === "next_3_months"}
                    onPress={() => setRange("next_3_months")}
                    icon="time-outline"
                    label={t("home.date_next_3_months")}
                  />
                </FilterChipsRow>
              </SearchPanelSection>

              <SearchPanelSection label={t("home.date_any")}>
                <MonthPicker value={monthFilter} onChange={pickMonth} />
              </SearchPanelSection>

              {presentCountries.length > 1 ? (
                <SearchPanelSection label={t("home.countries")}>
                  <View style={styles.countryRow} testID="country-filter-row">
                    {presentCountries.map((code) => {
                      const active = selectedCountries.has(code);
                      return (
                        <Pressable
                          key={code}
                          testID={`country-chip-${code}`}
                          onPress={() => toggleCountry(code)}
                          style={[
                            styles.countryChip,
                            active && styles.countryChipActive,
                          ]}
                        >
                          <Text style={styles.countryFlag}>
                            {COUNTRY_FLAGS[code]}
                          </Text>
                          <Text
                            style={[
                              styles.countryLabel,
                              active && styles.countryLabelActive,
                            ]}
                          >
                            {COUNTRY_NAMES[code]}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {selectedCountries.size > 0 ? (
                      <Pressable
                        testID="country-chip-clear"
                        onPress={() => setSelectedCountries(new Set())}
                        style={[styles.countryChip, styles.countryChipClear]}
                      >
                        <Ionicons name="close" size={11} color={colors.ember} />
                        <Text style={styles.countryClearLabel}>{t("home.countries")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </SearchPanelSection>
              ) : null}

              <Pressable
                testID="toggle-include-past"
                onPress={() => setIncludePast((v) => !v)}
                style={styles.pastToggle}
              >
                <Ionicons
                  name={includePast ? "checkbox" : "square-outline"}
                  size={16}
                  color={includePast ? colors.gold : colors.stone}
                />
                <Text style={[styles.pastToggleText, includePast && styles.pastToggleTextActive]}>
                  {includePast ? t("home.hide_past") : t("home.show_past")}
                </Text>
              </Pressable>

              {activeSummary ? (
                <View style={styles.summary} testID="active-filter-summary">
                  <Ionicons name="funnel-outline" size={11} color={colors.gold} />
                  <Text style={styles.summaryText}>{activeSummary}</Text>
                </View>
              ) : null}
            </SearchPanel>

            {nearMe && status === "denied" ? (
              <View style={styles.banner}>
                <Ionicons name="warning-outline" size={14} color={colors.ember} />
                <Text style={styles.bannerText}>
                  {t("home.error_load")}
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
                {t("home.no_events")}
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
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  brandRune: {
    color: colors.gold,
    fontSize: 32,
    lineHeight: 32,
    width: 36,
    textAlign: "center",
  },
  brandTitle: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 3,
  },
  brandTagline: {
    color: colors.stone,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(26,20,17,0.7)",
  },
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
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  summaryText: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "600",
  },
  pastToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: spacing.xs,
    paddingBottom: 6,
  },
  pastToggleText: {
    color: colors.stone,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  pastToggleTextActive: { color: colors.gold },
  countryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(26,20,17,0.7)",
  },
  countryChipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.18)",
  },
  countryChipClear: {
    borderColor: colors.ember,
  },
  countryFlag: { fontSize: 13, lineHeight: 14 },
  countryLabel: {
    color: colors.stone,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  countryLabelActive: { color: colors.gold },
  countryClearLabel: {
    color: colors.ember,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
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
