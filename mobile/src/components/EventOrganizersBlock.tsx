/**
 * Mobile public list of approved event organizers. Shows only the
 * organizer's full name. Tapping the name opens a modal contact form
 * that routes the message to the organizer's real email server-side —
 * the email never appears on the public event page.
 */
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing } from "@/src/lib/theme";

interface Organizer {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

export default function EventOrganizersBlock({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [list, setList] = useState<Organizer[] | null>(null);
  const [target, setTarget] = useState<Organizer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [fromName, setFromName] = useState(user?.name || user?.nickname || "");
  const [fromEmail, setFromEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!eventId) return;
    api
      .get<Organizer[]>(`/events/${eventId}/organizers`)
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]));
  }, [eventId]);

  const openForm = (o: Organizer) => {
    setTarget(o);
    setFromName(user?.name || user?.nickname || "");
    setFromEmail(user?.email || "");
    setSubject("");
    setBody("");
    setError(null);
    setOk(false);
  };

  const submit = async () => {
    if (!target) return;
    const n = fromName.trim();
    const em = fromEmail.trim();
    const s = subject.trim();
    const b = body.trim();
    if (!n || !em || !s || !b) {
      setError("Täytä kaikki kentät");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        `/events/${eventId}/organizers/${target.user_id}/contact`,
        { from_name: n, from_email: em, subject: s, body: b },
      );
      setOk(true);
      setTimeout(() => setTarget(null), 1200);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Lähetys epäonnistui");
    } finally {
      setSubmitting(false);
    }
  };

  if (!list || list.length === 0) return null;

  return (
    <View style={styles.block} testID="event-organizers">
      <Text style={styles.title}>Tapahtuman järjestäjät</Text>
      <View style={{ gap: 8 }}>
        {list.map((o) => (
          <Pressable
            key={o.user_id}
            onPress={() => openForm(o)}
            testID={`event-organizer-${o.user_id}`}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
            <Text style={styles.name} numberOfLines={1}>
              {o.full_name}
            </Text>
            <View style={styles.sendHint}>
              <Ionicons name="chatbubble-outline" size={11} color={colors.stone} />
              <Text style={styles.sendHintText}>Lähetä viesti</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={!!target}
        animationType="slide"
        transparent
        onRequestClose={() => setTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Lähetä viesti järjestäjälle</Text>
            <Text style={styles.modalHelp}>
              Viesti toimitetaan{" "}
              <Text style={styles.modalHelpStrong}>{target?.full_name}</Text>
              :lle sähköpostitse. Osoitetta ei tallenneta julkisesti — voit
              vastata suoraan sähköpostista.
            </Text>

            <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
              <Text style={styles.label}>Nimesi *</Text>
              <TextInput
                testID="contact-name"
                value={fromName}
                onChangeText={setFromName}
                style={styles.input}
                autoCapitalize="words"
              />
              <Text style={styles.label}>Sähköpostisi (vastausta varten) *</Text>
              <TextInput
                testID="contact-email"
                value={fromEmail}
                onChangeText={setFromEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.label}>Aihe *</Text>
              <TextInput
                testID="contact-subject"
                value={subject}
                onChangeText={setSubject}
                style={styles.input}
                maxLength={200}
              />
              <Text style={styles.label}>Viesti *</Text>
              <TextInput
                testID="contact-body"
                value={body}
                onChangeText={setBody}
                style={[styles.input, { minHeight: 120, textAlignVertical: "top" }]}
                multiline
                maxLength={4000}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {ok ? <Text style={styles.success}>Viesti lähetetty ✓</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setTarget(null)}
                disabled={submitting}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.cancelBtnText}>Peruuta</Text>
              </Pressable>
              <Pressable
                testID="contact-submit"
                onPress={submit}
                disabled={submitting || ok}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (submitting || ok) && { opacity: 0.6 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0e0b09" />
                ) : (
                  <Text style={styles.submitBtnText}>Lähetä viesti</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  title: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.85)",
  },
  name: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  sendHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  sendHintText: {
    color: colors.stone,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface2 || "#1a1614",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: spacing.lg,
    maxHeight: "92%",
  },
  modalTitle: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalHelp: {
    color: colors.stone,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  modalHelpStrong: { color: colors.bone, fontWeight: "700" },
  label: { color: colors.stone, fontSize: 11 },
  input: {
    color: colors.bone,
    backgroundColor: "rgba(14,11,9,0.85)",
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius?.sm ?? 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: { color: colors.ember, fontSize: 12, marginTop: 4 },
  success: { color: colors.gold, fontSize: 12, marginTop: 4 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  cancelBtnText: { color: colors.stone, fontSize: 12, fontWeight: "700" },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius?.sm ?? 4,
    backgroundColor: colors.gold,
  },
  submitBtnText: {
    color: "#0e0b09",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
