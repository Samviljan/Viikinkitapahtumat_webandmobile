/**
 * Mobile "Tapahtumani" tab — events the user has RSVPed to.
 * The favorites concept was removed in May 2026 in favor of the single
 * committed RSVP gesture. This tab now only shows attended events.
 */
import React, { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { EventCard } from "@/src/components/EventCard";
import { useEvents } from "@/src/hooks/useEvents";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { api } from "@/src/api/client";
import type { VikingEvent } from "@/src/types";

interface AttendingApiEvent {
  id: string;
}

export default function MyEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { events: allEvents, loading } = useEvents();
  const { t } = useSettings();
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [attendingLoaded, setAttendingLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setAttendingIds(new Set());
      setAttendingLoaded(true);
      return;
    }
    api
      .get<AttendingApiEvent[]>("/users/me/attending")
      .then((r) => setAttendingIds(new Set((r.data || []).map((e) => e.id))))
      .catch(() => setAttendingIds(new Set()))
      .finally(() => setAttendingLoaded(true));
  }, [user]);

  const attending: VikingEvent[] = (allEvents || []).filter((e) =>
    attendingIds.has(e.id),
  );

  const showLoader = loading || (!!user && !attendingLoaded);

  if (!user) {
    return (
      <AppBackground>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <View style={styles.empty}>
            <Ionicons name="log-in-outline" size={36} color={colors.gold} />
            <Text style={styles.emptyTitle}>
              {t("myevents.signin_title") || "Kirjaudu sisään"}
            </Text>
            <Text style={styles.emptyText}>
              {t("myevents.signin_help") ||
                "Tällä sivulla näet tapahtumat joihin olet ilmoittautunut osallistuvasi."}
            </Text>
            <Pressable
              testID="myevents-signin"
              onPress={() => router.push("/settings/auth" as never)}
              style={({ pressed }) => [styles.signin, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.signinText}>
                {t("myevents.signin_btn") || "Kirjaudu"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t("myevents.title") || "Tapahtumat joihin osallistun"}
          </Text>
          <Text style={styles.sub}>
            {t("myevents.sub") ||
              'Kun klikkaat "Osallistun" tapahtumaan, se ilmestyy tähän.'}
          </Text>
        </View>

        {showLoader ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : attending.length === 0 ? (
          <View style={styles.empty} testID="myevents-empty">
            <Ionicons name="calendar-outline" size={36} color={colors.gold} />
            <Text style={styles.emptyText}>
              {t("myevents.empty") ||
                "Et ole vielä merkinnyt osallistuvasi yhteenkään tapahtumaan."}
            </Text>
            <Pressable
              onPress={() => router.push("/" as never)}
              style={({ pressed }) => [styles.browse, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.browseText}>
                {t("myevents.browse") || "Selaa tapahtumia"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={attending}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.listContent}
            testID="myevents-list"
          />
        )}
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  title: { ...text.h2, color: colors.bone },
  sub: {
    color: colors.stone,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 17,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: { color: colors.bone, fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: colors.stone,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  browse: {
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  browseText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  signin: {
    marginTop: spacing.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  signinText: {
    color: "#0e0b09",
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
