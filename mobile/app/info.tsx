import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";

const WEB_URL = "https://viikinkitapahtumat.fi";
const ADMIN_EMAIL = "admin@viikinkitapahtumat.fi";

/**
 * Info / About / Feedback screen.
 *
 * Purpose:
 *  - Show app + build version so beta testers know which build they are on.
 *  - Quick link to the full website (PWA).
 *  - Tiny in-app feedback form that opens the user's mail client via mailto:
 *    (works offline + without backend changes in production).
 */
export default function InfoScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const version = Constants.expoConfig?.version ?? "0.0.0";
  const buildNo =
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.expoConfig?.ios?.buildNumber ??
    "—";
  const runtime = Constants.expoConfig?.runtimeVersion?.toString?.() ?? "—";
  const platformLabel = useMemo(
    () =>
      Platform.OS === "android"
        ? "Android"
        : Platform.OS === "ios"
          ? "iOS"
          : Platform.OS,
    [],
  );

  function openWeb() {
    Linking.openURL(WEB_URL).catch(() =>
      Alert.alert("Linkki ei avautunut", WEB_URL),
    );
  }

  async function send() {
    const cleanName = name.trim();
    const cleanMsg = message.trim();
    if (cleanName.length < 2 || cleanMsg.length < 5) {
      Alert.alert(
        "Tarkista tiedot",
        "Anna nimesi ja kirjoita lyhyt viesti (vähintään 5 merkkiä).",
      );
      return;
    }
    setSending(true);
    const subject = `Yhteydenotto sovelluksesta v${version} (${platformLabel})`;
    const body =
      `Nimi: ${cleanName}\n` +
      (email.trim() ? `Sähköposti: ${email.trim()}\n` : "") +
      `Sovellusversio: ${version} (build ${buildNo}, ${platformLabel})\n\n` +
      `Viesti:\n${cleanMsg}\n`;
    const url = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          "Ei sähköpostisovellusta",
          `Lähetä viesti suoraan osoitteeseen ${ADMIN_EMAIL}.`,
        );
        return;
      }
      await Linking.openURL(url);
      // Optimistic — assume the mail client took over. Reset form.
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      Alert.alert("Lähetys epäonnistui", "Yritä uudelleen myöhemmin.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            testID="info-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.bone} />
          </Pressable>
          <Text style={styles.topTitle}>Tietoa</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand block */}
          <View style={styles.brand}>
            <Text style={styles.rune}>ᚠ</Text>
            <Text style={styles.brandTitle}>VIIKINKITAPAHTUMAT</Text>
            <Text style={styles.brandTagline}>
              Pohjoisen viikinki- ja rauta-aikaharrastajien kalenteri
            </Text>
          </View>

          {/* Version card */}
          <View style={styles.card} testID="version-card">
            <Text style={styles.cardEyebrow}>Sovelluksen versio</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Versio</Text>
              <Text style={styles.rowValue}>{version}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Build</Text>
              <Text style={styles.rowValue}>{buildNo}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Alusta</Text>
              <Text style={styles.rowValue}>{platformLabel}</Text>
            </View>
            {runtime !== "—" ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Runtime</Text>
                <Text style={styles.rowValue}>{runtime}</Text>
              </View>
            ) : null}
          </View>

          {/* Web link */}
          <Pressable
            testID="open-web-link"
            onPress={openWeb}
            style={({ pressed }) => [
              styles.linkCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="globe-outline" size={20} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Avaa verkkosivu</Text>
              <Text style={styles.linkSub}>{WEB_URL.replace("https://", "")}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.stone} />
          </Pressable>

          {/* Contact form */}
          <Text style={[text.overline, styles.sectionHeader]}>
            Yhteydenotto
          </Text>
          <Text style={styles.formIntro}>
            Anna palautetta tai ilmoita bugista. Painike avaa sähköpostiohjelmasi
            valmiilla viestillä — viestin lähetät itse sieltä.
          </Text>
          <View style={styles.card}>
            <TextInput
              testID="contact-name"
              placeholder="Nimi *"
              placeholderTextColor={colors.stone}
              value={name}
              onChangeText={setName}
              style={styles.input}
              maxLength={80}
            />
            <TextInput
              testID="contact-email"
              placeholder="Sähköposti (valinnainen)"
              placeholderTextColor={colors.stone}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              maxLength={160}
            />
            <TextInput
              testID="contact-message"
              placeholder="Viesti *"
              placeholderTextColor={colors.stone}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              style={[styles.input, styles.textarea]}
              maxLength={2000}
            />
            <Pressable
              testID="contact-submit"
              onPress={send}
              disabled={sending}
              style={({ pressed }) => [
                styles.submitBtn,
                (pressed || sending) && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="send-outline" size={14} color={colors.bone} />
              <Text style={styles.submitText}>
                {sending ? "Avataan…" : "Lähetä viesti"}
              </Text>
            </Pressable>
            <Text style={styles.formFooter}>
              Tai kirjoita suoraan: {ADMIN_EMAIL}
            </Text>
          </View>

          <Text style={styles.copyright}>
            © 2026 Viikinkitapahtumat • Kaikki oikeudet pidätetään
          </Text>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2.4,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  brand: { alignItems: "center", paddingVertical: spacing.xl },
  rune: {
    color: colors.gold,
    fontSize: 48,
    lineHeight: 48,
    marginBottom: spacing.sm,
  },
  brandTitle: {
    color: colors.bone,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 4,
  },
  brandTagline: {
    color: colors.stone,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: "rgba(26,20,17,0.92)",
    borderColor: colors.edge,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardEyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  rowLabel: { color: colors.stone, fontSize: 13 },
  rowValue: { color: colors.bone, fontSize: 13, fontWeight: "600" },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(26,20,17,0.92)",
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  linkTitle: { color: colors.bone, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.stone, fontSize: 12, marginTop: 2 },
  sectionHeader: { marginTop: spacing.sm, marginBottom: 6 },
  formIntro: {
    color: colors.stone,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius.sm,
    color: colors.bone,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.ember,
    borderRadius: radius.sm,
    paddingVertical: 12,
    marginTop: 4,
  },
  submitText: {
    color: colors.bone,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  formFooter: {
    color: colors.stone,
    fontSize: 11,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  copyright: {
    color: colors.stone,
    fontSize: 10,
    textAlign: "center",
    marginTop: spacing.xl,
    letterSpacing: 0.5,
  },
});
