/**
 * "My events" tab — combined view of:
 *   1. Events the user has marked as attending (RSVPed)
 *   2. Events the user has favourited locally (bookmark icon)
 *   3. Merchant cards the user has favourited (with their upcoming events
 *      so this section doubles as navigation to the events those merchants
 *      will be at)
 *
 * Replaces the previous "Favorites" tab. The sections render as separate
 * grouped lists so the user can see at a glance "what I committed to" vs
 * "what I'm thinking about" vs "where I'm planning to shop".
 *
 * Anonymous users (no auth) only see the favourites section. Merchant
 * favourites require auth (server-only — not stored locally for anon).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { EventCard } from "@/src/components/EventCard";
import { useEvents } from "@/src/hooks/useEvents";
import { useFavorites } from "@/src/hooks/useFavorites";
import { useFavoriteMerchants } from "@/src/hooks/useFavoriteMerchants";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { api } from "@/src/api/client";
import type { VikingEvent } from "@/src/types";

const API = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

interface AttendingApiEvent {
  id: string;
}

interface FavMerchantEvent {
  id: string;
  title_fi?: string;
  title_en?: string;
  title_sv?: string;
  date?: string;
  date_end?: string | null;
  location?: string;
}

interface FavMerchantDetail {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  image_url?: string | null;
  events: FavMerchantEvent[];
}

function imgSrc(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("http")) return u;
  return `${API}${u}`;
}

type Row =
  | { kind: "header"; key: string; label: string; count: number }
  | { kind: "event"; key: string; event: VikingEvent; canMessage: boolean }
  | { kind: "merchant"; key: string; merchant: FavMerchantDetail };

type FilterMode = "both" | "favorites" | "attending";

export default function MyEventsScreen() {
  const { events } = useEvents();
  const { ids: favIds } = useFavorites();
  const { ids: favMerchantIds, toggle: toggleFavMerchant } = useFavoriteMerchants();
  const { t, lang } = useSettings();
  const { user } = useAuth();
  const router = useRouter();
  const [attendingIds, setAttendingIds] = useState<string[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [favMerchants, setFavMerchants] = useState<FavMerchantDetail[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  // Default to "both" so users see everything until they explicitly narrow.
  const [filter, setFilter] = useState<FilterMode>("both");

  // The "Viesti" button must only appear for paid messaging users in the
  // merchant/organizer/admin roles. Reading these flags from the auth context
  // means the button updates instantly when the admin flips the toggle (next
  // /auth/me refresh).
  const canSendMessages =
    !!user &&
    (user.role === "admin" ||
      (user.paid_messaging_enabled &&
        ((user.user_types || []).includes("merchant") ||
          (user.user_types || []).includes("organizer"))));

  // Pull attending list when authenticated. Anonymous → keep empty.
  useEffect(() => {
    if (!user) {
      setAttendingIds([]);
      return;
    }
    let cancelled = false;
    setLoadingAtt(true);
    api
      .get<AttendingApiEvent[]>("/users/me/attending")
      .then((r) => {
        if (cancelled) return;
        setAttendingIds((r.data || []).map((e) => e.id));
      })
      .catch(() => {
        if (!cancelled) setAttendingIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAtt(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Hydrate favourite merchants — fetch detail for each id (returns the card
  // + its upcoming events) so we can show "where they'll be" inline. Skips
  // merchant ids that 404 (e.g. card got disabled / subscription expired).
  useEffect(() => {
    if (!user || favMerchantIds.length === 0) {
      setFavMerchants([]);
      return;
    }
    let cancelled = false;
    setLoadingMerchants(true);
    Promise.all(
      favMerchantIds.map((id) =>
        api
          .get<FavMerchantDetail>(`/merchants/${encodeURIComponent(id)}`)
          .then((r) => r.data)
          .catch(() => null),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        const ok = results.filter((x): x is FavMerchantDetail => !!x);
        setFavMerchants(ok);
      })
      .finally(() => {
        if (!cancelled) setLoadingMerchants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [favMerchantIds, user]);

  // Build display rows: attending → favourites → favourite merchants.
  // Skip favourite events that are already listed under attending.
  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, VikingEvent>();
    for (const e of events) byId.set(e.id, e);

    const attending = attendingIds
      .map((id) => byId.get(id))
      .filter((e): e is VikingEvent => !!e);
    const attendingSet = new Set(attending.map((e) => e.id));
    const favourites = favIds
      .map((id) => byId.get(id))
      .filter((e): e is VikingEvent => !!e && !attendingSet.has(e.id));

    const out: Row[] = [];
    const showAttending = filter !== "favorites";
    const showFavourites = filter !== "attending";
    const showMerchants = filter !== "attending"; // merchants belong to the "favorites" mental bucket

    if (user && attending.length && showAttending) {
      out.push({
        kind: "header",
        key: "h-att",
        label: t("myevents.attending_section"),
        count: attending.length,
      });
      for (const e of attending) {
        out.push({ kind: "event", key: `att-${e.id}`, event: e, canMessage: canSendMessages });
      }
    }
    if (favourites.length && showFavourites) {
      out.push({
        kind: "header",
        key: "h-fav",
        label: t("myevents.favourites_section"),
        count: favourites.length,
      });
      for (const e of favourites) {
        out.push({ kind: "event", key: `fav-${e.id}`, event: e, canMessage: false });
      }
    }
    if (user && favMerchants.length && showMerchants) {
      out.push({
        kind: "header",
        key: "h-fav-merch",
        label: t("myevents.merchants_section"),
        count: favMerchants.length,
      });
      for (const m of favMerchants) {
        out.push({ kind: "merchant", key: `fav-merch-${m.id}`, merchant: m });
      }
    }
    return out;
  }, [events, favIds, attendingIds, user, t, canSendMessages, filter, favMerchants]);

  // Empty state — only shown when there are NO favorites AND NO attending
  // events AND NO favourite merchants at all. If the user just picked a
  // filter that hides everything, we keep the filter chips visible so they
  // can switch back.
  const hasAnyContent =
    favIds.length > 0 || attendingIds.length > 0 || favMerchants.length > 0;
  if (!hasAnyContent && !loadingAtt && !loadingMerchants) {
    return (
      <AppBackground>
        <SafeAreaView edges={["top"]} style={styles.empty}>
          <Ionicons name="bookmarks-outline" size={48} color={colors.gold} />
          <Text style={[text.h2, { marginTop: spacing.lg, textAlign: "center" }]}>
            {t("myevents.title")}
          </Text>
          <Text style={styles.emptyText}>{t("myevents.empty")}</Text>
          <Link href="/" style={styles.cta}>
            {t("favorites.browse")}
          </Link>
        </SafeAreaView>
      </AppBackground>
    );
  }

  const pickTitle = (e: FavMerchantEvent): string => {
    if (lang === "en" && e.title_en) return e.title_en;
    if (lang === "sv" && e.title_sv) return e.title_sv;
    return e.title_fi || e.title_en || e.title_sv || "—";
  };

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={text.overline}>
                    {item.label}{" "}
                    <Text style={styles.sectionCount}>· {item.count}</Text>
                  </Text>
                </View>
              );
            }
            if (item.kind === "merchant") {
              const m = item.merchant;
              return (
                <View
                  style={styles.merchantCard}
                  testID={`fav-merchant-card-${m.id}`}
                >
                  <View style={styles.merchantHeader}>
                    {m.image_url ? (
                      <Image
                        source={{ uri: imgSrc(m.image_url) }}
                        style={styles.merchantThumb}
                      />
                    ) : (
                      <View style={[styles.merchantThumb, styles.merchantThumbEmpty]}>
                        <Ionicons
                          name={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                          size={20}
                          color={colors.gold}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      {m.description ? (
                        <Text style={styles.merchantDesc} numberOfLines={2}>
                          {m.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      testID={`fav-merchant-remove-${m.id}`}
                      onPress={() => toggleFavMerchant(m.id)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.heart, pressed && { opacity: 0.6 }]}
                      accessibilityRole="button"
                      accessibilityLabel={t("event.unfavorite")}
                    >
                      <Ionicons name="heart" size={20} color={colors.ember} />
                    </Pressable>
                  </View>
                  {m.events.length > 0 ? (
                    <View style={styles.merchantEvents}>
                      {m.events.slice(0, 4).map((ev) => (
                        <Pressable
                          key={ev.id}
                          testID={`fav-merchant-event-${ev.id}`}
                          onPress={() =>
                            router.push({
                              pathname: "/event/[id]" as never,
                              params: { id: ev.id },
                            })
                          }
                          style={({ pressed }) => [
                            styles.merchantEventRow,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={colors.gold}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.merchantEventTitle} numberOfLines={1}>
                              {pickTitle(ev)}
                            </Text>
                            {(ev.date || ev.location) && (
                              <Text style={styles.merchantEventMeta} numberOfLines={1}>
                                {[ev.date?.slice(0, 10), ev.location]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </Text>
                            )}
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={colors.stone}
                          />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.merchantNoEvents}>
                      {t("myevents.merchants_no_events")}
                    </Text>
                  )}
                  {m.url ? (
                    <Pressable
                      testID={`fav-merchant-website-${m.id}`}
                      onPress={() => Linking.openURL(m.url).catch(() => {})}
                      style={({ pressed }) => [
                        styles.merchantWebsiteBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons
                        name="open-outline"
                        size={12}
                        color={colors.gold}
                      />
                      <Text style={styles.merchantWebsiteText}>
                        {t("myevents.merchants_open_website")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }
            return (
              <View>
                <EventCard event={item.event} />
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={text.overline}>{t("myevents.eyebrow")}</Text>
              <Text style={[text.h1, { marginTop: 4 }]}>
                {t("myevents.title")}
              </Text>
              <View style={styles.filterRow} testID="myevents-filter">
                {(["favorites", "attending", "both"] as FilterMode[]).map((m) => {
                  const active = filter === m;
                  return (
                    <Pressable
                      key={m}
                      testID={`myevents-filter-${m}`}
                      onPress={() => setFilter(m)}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {t(`myevents.filter_${m}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          }
          ListFooterComponent={
            loadingAtt || loadingMerchants ? (
              <ActivityIndicator
                color={colors.gold}
                style={{ marginTop: spacing.lg }}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loadingAtt && !loadingMerchants ? (
              <View style={styles.filterEmpty} testID="myevents-filter-empty">
                <Text style={styles.filterEmptyText}>
                  {t("myevents.filter_empty")}
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    ...text.body,
    color: colors.stone,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.xl,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    borderColor: colors.gold,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    color: colors.stone,
    fontSize: 11,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "transparent",
  },
  filterChipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.10)",
  },
  filterChipText: {
    color: colors.stone,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterChipTextActive: {
    color: colors.gold,
  },
  filterEmpty: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  filterEmptyText: {
    color: colors.stone,
    fontSize: 13,
    fontStyle: "italic",
  },
  // Favourite-merchant card styles — borrows the "carved-card" feel of the
  // web shop list (dark surface + edge border + small accent).
  merchantCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.surface,
  },
  merchantHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  merchantThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  merchantThumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.edge,
  },
  merchantName: {
    color: colors.bone,
    fontSize: 16,
    fontWeight: "600",
  },
  merchantDesc: {
    color: colors.stone,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  merchantEvents: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  merchantEventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(201,161,74,0.04)",
    borderWidth: 1,
    borderColor: colors.edge,
  },
  merchantEventTitle: {
    color: colors.bone,
    fontSize: 13,
    fontWeight: "500",
  },
  merchantEventMeta: {
    color: colors.stone,
    fontSize: 11,
    marginTop: 2,
  },
  merchantNoEvents: {
    marginTop: spacing.sm,
    color: colors.stone,
    fontSize: 12,
    fontStyle: "italic",
  },
  merchantWebsiteBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  merchantWebsiteText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heart: {
    padding: 4,
  },
});
