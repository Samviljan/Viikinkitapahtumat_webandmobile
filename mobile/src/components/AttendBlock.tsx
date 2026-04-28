/**
 * Mobile attend / RSVP block.
 *
 * - Anonymous users: shows "Sign in to attend" button → routes to /settings/auth.
 * - Logged-in users: shows attend toggle + per-event notification preferences
 *   (email reminder / push reminder). Backed by /api/events/{id}/attend.
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";
import { useSettings } from "@/src/lib/i18n";
import { colors, radius, spacing } from "@/src/lib/theme";

interface AttendState {
  attending: boolean;
  notify_email: boolean;
  notify_push: boolean;
}

export function AttendBlock({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { t } = useSettings();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AttendState>({
    attending: false,
    notify_email: true,
    notify_push: false,
  });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    api
      .get<AttendState>(`/events/${eventId}/attend`)
      .then((r) => setState(r.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [authLoading, user, eventId]);

  if (authLoading || !loaded) return null;

  if (!user) {
    return (
      <Pressable
        testID="attend-signin"
        onPress={() => router.push("/settings/auth" as never)}
        style={({ pressed }) => [styles.signinBtn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="log-in-outline" size={16} color={colors.gold} />
        <Text style={styles.signinText}>{t("attend.sign_in_to_attend")}</Text>
      </Pressable>
    );
  }

  async function attend() {
    setBusy(true);
    try {
      const { data } = await api.post<AttendState>(
        `/events/${eventId}/attend`,
        { notify_email: state.notify_email, notify_push: state.notify_push },
      );
      setState(data);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api.delete(`/events/${eventId}/attend`);
      setState((s) => ({ ...s, attending: false }));
    } finally {
      setBusy(false);
    }
  }

  async function togglePref(field: "notify_email" | "notify_push") {
    const next = { ...state, [field]: !state[field] };
    setState(next);
    try {
      await api.post(`/events/${eventId}/attend`, {
        notify_email: next.notify_email,
        notify_push: next.notify_push,
      });
    } catch {
      setState(state);
    }
  }

  return (
    <View testID="attend-block" style={styles.block}>
      <Pressable
        testID={state.attending ? "attend-cancel" : "attend-confirm"}
        onPress={state.attending ? cancel : attend}
        disabled={busy}
        style={({ pressed }) => [
          state.attending ? styles.attendingBtn : styles.attendBtn,
          (pressed || busy) && { opacity: 0.75 },
        ]}
      >
        <Ionicons
          name={state.attending ? "checkmark-circle" : "calendar-outline"}
          size={16}
          color={state.attending ? colors.gold : colors.bone}
        />
        <Text
          style={[
            styles.attendBtnText,
            state.attending && { color: colors.gold },
          ]}
        >
          {state.attending ? t("attend.attending") : t("attend.mark_attending")}
        </Text>
      </Pressable>

      {state.attending ? (
        <View style={styles.prefsBlock} testID="attend-prefs">
          <Text style={styles.prefsTitle}>{t("attend.notify_title")}</Text>
          <Text style={styles.prefsHelp}>{t("attend.notify_help")}</Text>
          <PrefRow
            testID="attend-notify-email"
            icon="mail-outline"
            active={state.notify_email}
            label={t("attend.notify_email")}
            onPress={() => togglePref("notify_email")}
          />
          <PrefRow
            testID="attend-notify-push"
            icon="notifications-outline"
            active={state.notify_push}
            label={t("attend.notify_push")}
            onPress={() => togglePref("notify_push")}
          />
        </View>
      ) : null}
    </View>
  );
}

function PrefRow({
  testID,
  icon,
  active,
  label,
  onPress,
}: {
  testID: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.prefRow, active && styles.prefRowActive]}
    >
      <Ionicons
        name={active ? "checkbox" : "square-outline"}
        size={16}
        color={active ? colors.gold : colors.stone}
      />
      <Ionicons
        name={icon}
        size={14}
        color={active ? colors.gold : colors.stone}
      />
      <Text style={[styles.prefText, active && styles.prefTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  signinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.1)",
  },
  signinText: { color: colors.gold, fontWeight: "700", letterSpacing: 0.6 },
  attendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.sm,
    backgroundColor: colors.ember,
  },
  attendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.1)",
  },
  attendBtnText: {
    color: colors.bone,
    fontWeight: "700",
    letterSpacing: 0.6,
    fontSize: 13,
  },
  prefsBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(15,11,8,0.6)",
  },
  prefsTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  prefsHelp: {
    color: colors.stone,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(26,20,17,0.7)",
    marginBottom: 6,
  },
  prefRowActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  prefText: { color: colors.stone, fontSize: 13, flex: 1 },
  prefTextActive: { color: colors.bone },
});
