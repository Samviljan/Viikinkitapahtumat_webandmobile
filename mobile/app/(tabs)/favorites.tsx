/**
 * "My events" tab — combined view of:
 *   1. Events the user has marked as attending (RSVPed)
 *   2. Events the user has favourited locally (bookmark icon)
 *
 * Replaces the previous "Favorites" tab. The two sections render as separate
 * grouped lists so the user can see at a glance "what I committed to" vs
 * "what I'm thinking about".
 *
 * Anonymous users (no auth) only see the favourites section.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { api } from "@/src/api/client";
import type { VikingEvent } from "@/src/types";

interface AttendingApiEvent {
  id: string;
}

type Row =
  | { kind: "header"; key: string; label: string; count: number }
  | { kind: "event"; key: string; event: VikingEvent; canMessage: boolean };

export default function MyEventsScreen() {
  const { events } = useEvents();
  const { ids: favIds } = useFavorites();
  const { t } = useSettings();
  const { user } = useAuth();
  const router = useRouter();
  const [attendingIds, setAttendingIds] = useState<string[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

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

  // Build display rows: attending section first, then favourites.
  // Skip favourites that are already listed under attending (avoid duplicates).
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
    if (user && attending.length) {
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
    if (favourites.length) {
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
    return out;
  }, [events, favIds, attendingIds, user, t, canSendMessages]);

  // Empty state — both lists empty
  if (rows.length === 0 && !loadingAtt) {
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

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) =>
            item.kind === "header" ? (
              <View style={styles.sectionHeader}>
                <Text style={text.overline}>
                  {item.label}{" "}
                  <Text style={styles.sectionCount}>· {item.count}</Text>
                </Text>
              </View>
            ) : (
              <View>
                <EventCard event={item.event} />
                {item.canMessage ? (
                  <Pressable
                    testID={`message-event-${item.event.id}`}
                    onPress={() =>
                      router.push({
                        pathname: "/settings/messages" as never,
                        params: { event_id: item.event.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.messageBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons
                      name="paper-plane-outline"
                      size={14}
                      color={colors.gold}
                    />
                    <Text style={styles.messageBtnText}>
                      {t("messaging.cta_send")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={text.overline}>{t("myevents.eyebrow")}</Text>
              <Text style={[text.h1, { marginTop: 4 }]}>
                {t("myevents.title")}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingAtt ? (
              <ActivityIndicator
                color={colors.gold}
                style={{ marginTop: spacing.lg }}
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
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
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  messageBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
