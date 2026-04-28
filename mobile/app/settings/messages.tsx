/**
 * Mobile screen for sending messages to attendees of an event.
 *
 * Mirrors the web `/messages` page. Visible only to merchants/organizers
 * with `paid_messaging_enabled=true`. Backend gates the request, so we
 * never trust the flag client-side as a security boundary.
 */
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/api/client";

interface Event {
  id: string;
  title_fi?: string;
  title_en?: string;
  title_sv?: string;
  start_date?: string;
}

const CHANNELS = ["both", "push", "email"] as const;
type Channel = (typeof CHANNELS)[number];

const TARGET_CATEGORIES = ["reenactor", "fighter", "merchant", "organizer"] as const;
type Target = (typeof TARGET_CATEGORIES)[number];

interface SendResult {
  sent_push: number;
  sent_email: number;
  recipients: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { t, lang } = useSettings();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [channel, setChannel] = useState<Channel>("both");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const types = user?.user_types || [];
  const isAdmin = user?.role === "admin";
  const allowed =
    isAdmin ||
    (!!user?.paid_messaging_enabled &&
      (types.includes("merchant") || types.includes("organizer")));

  // Admins see all events (site-wide announcements). Merchants/organizers only
  // see events they have RSVPed to — backend enforces the same gate.
  useEffect(() => {
    if (!allowed) return;
    const url = isAdmin ? "/events?limit=200" : "/users/me/attending";
    api
      .get<Event[]>(url)
      .then((r) => setEvents(r.data || []))
      .catch(() => setEvents([]));
  }, [allowed, isAdmin]);

  function toggleTarget(c: Target) {
    setTargets((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  async function send() {
    if (!eventId || !subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post<SendResult>("/messages/send", {
        event_id: eventId,
        channel,
        subject: subject.trim(),
        body: body.trim(),
        target_categories: targets,
      });
      setResult(data);
      setSubject("");
      setBody("");
      Alert.alert(t("messaging.sent_toast"));
    } catch (e: unknown) {
      const errResp = (e as { response?: { status?: number; data?: { detail?: string } } })?.response;
      const status = errResp?.status;
      const detail = errResp?.data?.detail;
      if (status === 403 && typeof detail === "string") {
        Alert.alert(detail);
      } else if (status === 402) {
        Alert.alert(t("messaging.blocked_title"));
      } else {
        Alert.alert(t("auth.error_generic"));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="messages-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="messages-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("messaging.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!allowed ? (
            <View style={styles.blocked} testID="messaging-blocked">
              <Ionicons name="alert-circle-outline" size={36} color={colors.gold} />
              <Text style={[text.h2, { marginTop: spacing.md }]}>
                {t("messaging.blocked_title")}
              </Text>
              <Text style={styles.blockedHelp}>{t("messaging.blocked_help")}</Text>
            </View>
          ) : (
            <>
              <View style={styles.headerCard}>
                <Ionicons name="megaphone-outline" size={20} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.over}>{t("messaging.feature")}</Text>
                  <Text style={[text.h1, { marginTop: 2 }]}>
                    {t("messaging.title")}
                  </Text>
                </View>
              </View>

              <Text style={styles.help}>{t("messaging.consent_help")}</Text>

              {/* Event picker */}
              <Text style={styles.label}>{t("messaging.pick_event")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {events.map((ev) => {
                  const active = ev.id === eventId;
                  const titleObj = ev as unknown as Record<string, string | undefined>;
                  const title = titleObj[`title_${lang}`] || ev.title_fi || ev.id;
                  return (
                    <Pressable
                      key={ev.id}
                      testID={`msg-event-${ev.id}`}
                      onPress={() => setEventId(ev.id)}
                      style={[styles.eventChip, active && styles.eventChipActive]}
                    >
                      <Text
                        style={[
                          styles.eventChipText,
                          active && styles.eventChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      {ev.start_date ? (
                        <Text style={styles.eventChipDate}>{ev.start_date}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Channel */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("messaging.channel")}
              </Text>
              <View style={styles.chipRow}>
                {CHANNELS.map((c) => {
                  const active = channel === c;
                  return (
                    <Pressable
                      key={c}
                      testID={`msg-channel-${c}`}
                      onPress={() => setChannel(c)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {t(`messaging.ch_${c}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Target categories */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("messaging.targets")}
              </Text>
              <View style={styles.chipRow}>
                {TARGET_CATEGORIES.map((c) => {
                  const active = targets.includes(c);
                  return (
                    <Pressable
                      key={c}
                      testID={`msg-target-${c}`}
                      onPress={() => toggleTarget(c)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, active && styles.chipTextActive]}
                      >
                        {t(`account.type_${c}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.help}>
                {targets.length === 0
                  ? t("messaging.targets_help_all")
                  : t("messaging.targets_help_some")}
              </Text>

              {/* Subject */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("messaging.subject")}
              </Text>
              <TextInput
                testID="msg-subject"
                value={subject}
                onChangeText={setSubject}
                maxLength={120}
                style={styles.input}
                placeholderTextColor={colors.stone}
              />

              {/* Body */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("messaging.body")}
              </Text>
              <TextInput
                testID="msg-body"
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={6}
                maxLength={1500}
                style={[styles.input, styles.textarea]}
                placeholderTextColor={colors.stone}
                textAlignVertical="top"
              />
              <Text style={styles.help}>{t("messaging.body_hint")}</Text>

              <Pressable
                testID="msg-send"
                onPress={send}
                disabled={sending || !eventId || !subject.trim() || !body.trim()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { marginTop: spacing.lg },
                  (pressed || sending || !eventId || !subject.trim() || !body.trim()) && {
                    opacity: 0.6,
                  },
                ]}
              >
                <Ionicons name="send" size={14} color={colors.bone} />
                <Text style={styles.primaryBtnText}>
                  {sending ? "…" : t("messaging.send_btn")}
                </Text>
              </Pressable>

              {result ? (
                <View style={styles.resultCard} testID="msg-result">
                  <Text style={styles.resultTitle}>{t("messaging.result")}</Text>
                  <Text style={styles.resultText}>
                    {t("messaging.result_text", {
                      push: String(result.sent_push ?? 0),
                      email: String(result.sent_email ?? 0),
                      recipients: String(result.recipients ?? 0),
                    })}
                  </Text>
                </View>
              ) : null}
            </>
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
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  over: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  help: { color: colors.stone, marginTop: 6, lineHeight: 19 },
  label: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(14,11,9,0.95)",
    borderColor: colors.edge,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.bone,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 120 },
  eventChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.7)",
    minWidth: 160,
    maxWidth: 240,
  },
  eventChipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  eventChipText: { color: colors.bone, fontSize: 13, fontWeight: "600" },
  eventChipTextActive: { color: colors.gold },
  eventChipDate: { color: colors.stone, fontSize: 11, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.7)",
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  chipText: { color: colors.stone, fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  chipTextActive: { color: colors.gold },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.ember,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
  },
  primaryBtnText: {
    color: colors.bone,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  blocked: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  blockedHelp: {
    color: colors.stone,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  resultCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  resultTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  resultText: { color: colors.bone, fontSize: 13, lineHeight: 19 },
});
