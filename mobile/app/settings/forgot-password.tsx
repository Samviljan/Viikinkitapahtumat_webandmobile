/**
 * Forgot-password screen.
 * Sends a reset link via the backend (`POST /auth/forgot-password`).
 * Always shows a generic success message — never reveals whether the
 * email is registered (no enumeration).
 */
import React, { useState } from "react";
import {
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useSettings();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setDone(true);
    } catch {
      // Backend always 200s — but if network fails, still show success
      // to avoid information leak.
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="forgot-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="forgot-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("auth.forgot_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[text.h1, { marginBottom: spacing.sm }]}>
            {t("auth.forgot_title")}
          </Text>

          {done ? (
            <View testID="forgot-success">
              <Text style={styles.success}>{t("auth.forgot_sent")}</Text>
              <Pressable
                testID="forgot-back-link"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { marginTop: spacing.lg },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.primaryBtnText}>{t("auth.back_to_signin")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.sub}>{t("auth.forgot_sub")}</Text>
              <Text style={styles.label}>{t("auth.email")}</Text>
              <TextInput
                testID="forgot-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholderTextColor={colors.stone}
                style={styles.input}
              />

              <Pressable
                testID="forgot-submit"
                onPress={submit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { marginTop: spacing.lg },
                  (pressed || submitting) && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {submitting ? "…" : t("auth.forgot_send")}
                </Text>
              </Pressable>
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
  sub: { color: colors.stone, marginBottom: spacing.lg, lineHeight: 19 },
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
  success: {
    color: colors.bone,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryBtn: {
    backgroundColor: colors.ember,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.bone,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
});
