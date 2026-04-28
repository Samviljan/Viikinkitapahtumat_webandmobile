/**
 * Mobile screen: list of events the user has marked as attending.
 * Shows the per-RSVP notification preferences (push / email) as small
 * pills, and tapping a card navigates to the event detail.
 */
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { api } from "@/src/api/client";

interface AttendingEvent {
  id: string;
  title_fi?: string;
  title_en?: string;
  title_sv?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  attendance: { notify_email: boolean; notify_push: boolean };
}

export default function AttendingScreen() {
  const router = useRouter();
  const { t, lang } = useSettings();
  const [events, setEvents] = useState<AttendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AttendingEvent[]>("/users/me/attending")
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const titleFor = (ev: AttendingEvent) =>
    (ev as unknown as Record<string, string | undefined>)[`title_${lang}`] || ev.title_fi || ev.id;

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="attending-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="attending-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("attending.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[text.h1, { marginBottom: spacing.sm }]}>
            {t("attending.title")}
          </Text>
          <Text style={styles.help}>{t("attending.help")}</Text>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
          ) : events.length === 0 ? (
            <Text style={styles.empty} testID="attending-empty">
              {t("attending.empty")}
            </Text>
          ) : (
            events.map((ev) => (
              <Pressable
                key={ev.id}
                testID={`attending-${ev.id}`}
                onPress={() => router.push(`/event/${ev.id}` as never)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.cardOver}>
                  {ev.start_date}
                  {ev.end_date && ev.end_date !== ev.start_date ? ` – ${ev.end_date}` : ""}
                </Text>
                <Text style={styles.cardTitle}>{titleFor(ev)}</Text>
                {ev.location ? (
                  <Text style={styles.cardLoc} numberOfLines={1}>
                    {ev.location}
                  </Text>
                ) : null}
                <View style={styles.pillRow}>
                  {ev.attendance.notify_email ? (
                    <View style={styles.pill}>
                      <Ionicons name="mail-outline" size={11} color={colors.gold} />
                      <Text style={styles.pillText}>{t("attend.notify_email")}</Text>
                    </View>
                  ) : null}
                  {ev.attendance.notify_push ? (
                    <View style={styles.pill}>
                      <Ionicons name="notifications-outline" size={11} color={colors.gold} />
                      <Text style={styles.pillText}>{t("attend.notify_push")}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topBarTitle: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    flex: 1,
    textAlign: "center",
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  help: { color: colors.stone, marginBottom: spacing.lg, lineHeight: 19 },
  empty: {
    color: colors.stone,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },
  card: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius.sm,
    marginBottom: 12,
    backgroundColor: "rgba(15,11,8,0.5)",
  },
  cardOver: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardTitle: { color: colors.bone, fontFamily: "serif", fontSize: 16 },
  cardLoc: { color: colors.stone, fontSize: 12, marginTop: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  pillText: { color: colors.gold, fontSize: 10, letterSpacing: 0.4 },
});
