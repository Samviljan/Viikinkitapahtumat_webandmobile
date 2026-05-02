/**
 * Mobile event-detail "Olen tapahtuman järjestäjä" CTA + form modal.
 *
 * Visible only to logged-in users with organizer or admin role. Identical
 * state machine to the web version: shows current request status from
 * `/events/{id}/organizer-requests/mine` and lets the user submit a new
 * request via a Modal-backed form.
 */
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing } from "@/src/lib/theme";

interface OrganizerRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  full_name: string;
  email: string;
  phone?: string;
  note?: string;
  admin_note?: string | null;
}

interface Props {
  eventId: string;
  organizerIds: string[];
}

export default function OrganizerRequestCTA({ eventId, organizerIds }: Props) {
  const { user } = useAuth();
  const [mine, setMine] = useState<OrganizerRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const role = user?.role;
  const types = (user?.user_types || []) as string[];
  const eligible = role === "admin" || types.includes("organizer");

  useEffect(() => {
    if (!user || !eligible) return;
    api
      .get<OrganizerRequest | null>(`/events/${eventId}/organizer-requests/mine`)
      .then((r) => setMine(r.data || null))
      .catch(() => setMine(null));
  }, [eventId, user, eligible]);

  if (!user || !eligible) return null;

  const isAlreadyOrganizer = organizerIds.includes(user.id);
  const status: OrganizerRequest["status"] | undefined = isAlreadyOrganizer
    ? "approved"
    : mine?.status;

  const onOpen = () => {
    setName(mine?.full_name || user?.name || user?.nickname || "");
    setEmail(mine?.email || user?.email || "");
    setPhone(mine?.phone || "");
    setNote(mine?.note || "");
    setConfirm(false);
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!confirm) {
      setError("Vahvista että olet aidosti tapahtuman järjestäjä");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Täytä nimi ja sähköposti");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post<OrganizerRequest>(
        `/events/${eventId}/organizer-requests`,
        {
          full_name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          note: note.trim(),
        },
      );
      setMine(r.data);
      setOpen(false);
    } catch (e) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Pyynnön lähetys epäonnistui");
    } finally {
      setSubmitting(false);
    }
  };

  let label = "Pyydä järjestäjäksi";
  let disabled = false;
  let highlight = false;
  if (status === "pending") {
    label = "Pyyntö käsittelyssä";
    disabled = true;
  } else if (status === "approved") {
    label = "Olet hyväksytty järjestäjä ✓";
    disabled = true;
    highlight = true;
  } else if (status === "rejected") {
    label = "Pyyntö hylätty — yritä uudelleen";
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        testID="organizer-request-cta"
        onPress={onOpen}
        disabled={disabled || mine === undefined}
        style={({ pressed }) => [
          styles.btn,
          highlight && styles.btnHighlight,
          (disabled || pressed) && { opacity: 0.7 },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={highlight ? colors.bone : colors.gold}
        />
        <Text style={[styles.btnText, highlight && { color: colors.bone }]}>
          {label}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pyydä tapahtuman järjestäjäksi</Text>
            <Text style={styles.modalHelp}>
              Täytä yhteystietosi — admin tarkistaa ja hyväksyy pyynnön. Yhteen
              tapahtumaan voidaan hyväksyä enintään 3 järjestäjää.
            </Text>

            <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
              <View>
                <Text style={styles.label}>Oikea nimi *</Text>
                <TextInput
                  testID="organizer-form-name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                  placeholderTextColor={colors.stone}
                />
              </View>
              <View>
                <Text style={styles.label}>Yhteyssähköposti *</Text>
                <TextInput
                  testID="organizer-form-email"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.stone}
                />
              </View>
              <View>
                <Text style={styles.label}>Puhelin (valinnainen)</Text>
                <TextInput
                  testID="organizer-form-phone"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.stone}
                />
              </View>
              <View>
                <Text style={styles.label}>Lisätiedot (valinnainen)</Text>
                <TextInput
                  testID="organizer-form-note"
                  value={note}
                  onChangeText={setNote}
                  style={[styles.input, { minHeight: 64, textAlignVertical: "top" }]}
                  multiline
                  placeholder="Esim. roolisi tai tausta"
                  placeholderTextColor={colors.stone}
                />
              </View>

              <View style={styles.confirmRow}>
                <Switch
                  value={confirm}
                  onValueChange={setConfirm}
                  trackColor={{ false: colors.edge, true: colors.gold }}
                  thumbColor={confirm ? colors.gold : "#888"}
                  testID="organizer-form-confirm"
                />
                <Text style={styles.confirmText}>
                  Vahvistan, että olen aidosti tämän tapahtuman järjestäjä ja
                  edustan järjestäjätahoa virallisesti.
                </Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setOpen(false)}
                disabled={submitting}
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.cancelBtnText}>Peruuta</Text>
              </Pressable>
              <Pressable
                testID="organizer-form-submit"
                onPress={submit}
                disabled={submitting || !confirm}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (!confirm || submitting) && { opacity: 0.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.bone} />
                ) : (
                  <Text style={styles.submitBtnText}>Lähetä pyyntö</Text>
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
  wrap: { marginTop: spacing.md },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "transparent",
  },
  btnHighlight: { backgroundColor: colors.ember, borderColor: colors.ember },
  btnText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
    maxHeight: "90%",
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
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  label: { color: colors.stone, fontSize: 11, marginBottom: 4 },
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
  confirmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  confirmText: { flex: 1, color: colors.stone, fontSize: 12, lineHeight: 17 },
  error: {
    color: colors.ember,
    fontSize: 12,
    marginTop: spacing.sm,
  },
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
