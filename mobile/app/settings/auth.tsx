/**
 * Auth screen — combined Sign-in / Create-account.
 *
 * Toggles between sign-in mode (just email + password) and sign-up mode
 * (email + password + nickname + user_types). Google sign-in opens an
 * Emergent-managed OAuth flow in an in-app browser; on success the
 * provider redirects back into the app with a session_id we exchange via
 * /api/auth/google-session.
 *
 * Anonymous browsing remains supported — closing this screen leaves the
 * user signed out.
 */
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
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
import * as WebBrowser from "expo-web-browser";
import * as Linking2 from "expo-linking";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { useAuth, type UserType } from "@/src/lib/auth";
import { getConsentTexts } from "@/src/lib/consents";

const ALL_TYPES: UserType[] = ["reenactor", "fighter", "merchant", "organizer"];
const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const { t, lang } = useSettings();
  const { signIn, signUp, signInWithGoogleSession, user } = useAuth();
  const consentTexts = getConsentTexts(lang);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [types, setTypes] = useState<UserType[]>([]);
  const [consentOrganizer, setConsentOrganizer] = useState(false);
  const [consentMerchant, setConsentMerchant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already signed in, jump back to profile.
  useEffect(() => {
    if (user) router.replace("/settings/profile" as never);
  }, [user, router]);

  // Listen for the Emergent OAuth deep-link redirect (#session_id=...).
  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const m = url.match(/[#?&]session_id=([^&]+)/);
      if (!m) return;
      try {
        await signInWithGoogleSession(m[1]);
      } catch {
        setError(t("auth.error_generic"));
      } finally {
        WebBrowser.dismissBrowser?.();
      }
    });
    return () => sub.remove();
  }, [signInWithGoogleSession, t]);

  function toggleType(tp: UserType) {
    setTypes((prev) =>
      prev.includes(tp) ? prev.filter((x) => x !== tp) : [...prev, tp],
    );
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        if (password.length < 8) {
          setError(t("auth.password_min"));
          setSubmitting(false);
          return;
        }
        if (!nickname.trim()) {
          setError(t("auth.nickname"));
          setSubmitting(false);
          return;
        }
        if (types.includes("merchant") && !merchantName.trim()) {
          setError(t("auth.merchant_name_help"));
          setSubmitting(false);
          return;
        }
        if (types.includes("organizer") && !organizerName.trim()) {
          setError(t("auth.organizer_name_help"));
          setSubmitting(false);
          return;
        }
        await signUp({
          email: email.trim(),
          password,
          nickname: nickname.trim(),
          user_types: types,
          merchant_name: types.includes("merchant") ? merchantName.trim() : null,
          organizer_name: types.includes("organizer") ? organizerName.trim() : null,
          consent_organizer_messages: consentOrganizer,
          consent_merchant_offers: consentMerchant,
        });
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError(t("auth.error_invalid"));
      else if (status === 409) setError(t("auth.error_duplicate"));
      else setError(t("auth.error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  async function startGoogleAuth() {
    const redirect = Linking2.createURL("/auth-callback");
    const target = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirect)}`;
    try {
      await WebBrowser.openAuthSessionAsync(target, redirect);
    } catch {
      Alert.alert(t("auth.error_generic"));
    }
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="auth-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="auth-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>
            {mode === "signin" ? t("auth.sign_in") : t("auth.sign_up")}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[text.h1, { marginBottom: spacing.sm }]}>
            {mode === "signin" ? t("auth.sign_in") : t("auth.sign_up")}
          </Text>
          <Text style={styles.sub}>{t("auth.signed_out_sub")}</Text>

          {/* Google sign-in */}
          <Pressable
            testID="google-signin"
            onPress={startGoogleAuth}
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>{t("auth.google_sign_in")}</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("auth.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <Text style={styles.label}>{t("auth.email")}</Text>
          <TextInput
            testID="auth-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholderTextColor={colors.stone}
            style={styles.input}
          />

          {/* Password */}
          <Text style={[styles.label, { marginTop: spacing.md }]}>
            {t("auth.password")}
          </Text>
          <TextInput
            testID="auth-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.stone}
            placeholder={mode === "signup" ? t("auth.password_min") : undefined}
            style={styles.input}
          />

          {mode === "signin" ? (
            <Pressable
              testID="auth-forgot"
              onPress={() => router.push("/settings/forgot-password" as never)}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>{t("auth.forgot")}</Text>
            </Pressable>
          ) : null}

          {mode === "signup" ? (
            <>
              <Text style={[styles.label, { marginTop: spacing.md }]}>
                {t("auth.nickname")}
              </Text>
              <TextInput
                testID="auth-nickname"
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="words"
                placeholderTextColor={colors.stone}
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                {t("auth.user_types_label")}
              </Text>
              <Text style={styles.help}>{t("auth.user_types_help")}</Text>
              <View style={styles.chipRow}>
                {ALL_TYPES.map((tp) => {
                  const active = types.includes(tp);
                  return (
                    <Pressable
                      key={tp}
                      testID={`auth-type-${tp}`}
                      onPress={() => toggleType(tp)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Ionicons
                        name={active ? "checkbox" : "square-outline"}
                        size={13}
                        color={active ? colors.gold : colors.stone}
                      />
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {t(`auth.type_${tp}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {types.includes("merchant") ? (
                <View testID="auth-merchant-name-block">
                  <Text style={[styles.label, { marginTop: spacing.md }]}>
                    {t("auth.merchant_name_label")}
                  </Text>
                  <TextInput
                    testID="auth-merchant-name"
                    value={merchantName}
                    onChangeText={setMerchantName}
                    autoCapitalize="words"
                    placeholderTextColor={colors.stone}
                    style={styles.input}
                  />
                  <Text style={styles.help}>{t("auth.merchant_name_help")}</Text>
                </View>
              ) : null}

              {types.includes("organizer") ? (
                <View testID="auth-organizer-name-block">
                  <Text style={[styles.label, { marginTop: spacing.md }]}>
                    {t("auth.organizer_name_label")}
                  </Text>
                  <TextInput
                    testID="auth-organizer-name"
                    value={organizerName}
                    onChangeText={setOrganizerName}
                    autoCapitalize="words"
                    placeholderTextColor={colors.stone}
                    style={styles.input}
                  />
                  <Text style={styles.help}>{t("auth.organizer_name_help")}</Text>
                </View>
              ) : null}

              {/* Marketing consents — opt-in (off by default).
                  Wording must match the web app exactly (see consents.ts). */}
              <View style={styles.consentBlock} testID="auth-consents">
                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  {consentTexts.section_title}
                </Text>
                <Text style={styles.help}>{consentTexts.section_help}</Text>
                <ConsentRow
                  testID="auth-consent-organizer"
                  active={consentOrganizer}
                  label={consentTexts.consent_organizer_messages}
                  onPress={() => setConsentOrganizer((v) => !v)}
                />
                <ConsentRow
                  testID="auth-consent-merchant"
                  active={consentMerchant}
                  label={consentTexts.consent_merchant_offers}
                  onPress={() => setConsentMerchant((v) => !v)}
                />
              </View>
            </>
          ) : null}

          {error ? (
            <Text style={styles.errorText} testID="auth-error">
              {error}
            </Text>
          ) : null}

          <Pressable
            testID="auth-submit"
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: spacing.lg },
              (pressed || submitting) && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? "…" : mode === "signin" ? t("auth.sign_in") : t("auth.sign_up")}
            </Text>
          </Pressable>

          <Pressable
            testID="auth-toggle-mode"
            onPress={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            style={styles.modeSwitch}
          >
            <Text style={styles.modeSwitchText}>
              {mode === "signin" ? t("auth.no_account") : t("auth.have_account")}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

function ConsentRow({
  testID,
  active,
  label,
  onPress,
}: {
  testID: string;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.consentRow, active && styles.consentRowActive]}
    >
      <Ionicons
        name={active ? "checkbox" : "square-outline"}
        size={16}
        color={active ? colors.gold : colors.stone}
        style={{ marginTop: 2 }}
      />
      <Text style={[styles.consentText, active && styles.consentTextActive]}>{label}</Text>
    </Pressable>
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
  sub: { color: colors.stone, marginBottom: spacing.lg, lineHeight: 18 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 13,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF",
  },
  googleG: {
    color: "#4285F4",
    fontSize: 18,
    fontWeight: "900",
    fontFamily: "serif",
  },
  googleText: { color: "#3C4043", fontSize: 14, fontWeight: "700" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.edge },
  dividerText: {
    color: colors.stone,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  label: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  help: { color: colors.stone, fontSize: 11, marginBottom: 10, fontStyle: "italic" },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(26,20,17,0.7)",
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.18)",
  },
  chipLabel: {
    color: colors.stone,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  chipLabelActive: { color: colors.gold },
  errorText: {
    color: colors.ember,
    fontSize: 12,
    marginTop: spacing.md,
    paddingHorizontal: 4,
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
  modeSwitch: {
    marginTop: spacing.lg,
    alignSelf: "center",
    paddingVertical: 8,
  },
  modeSwitchText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "600",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    marginTop: 4,
  },
  forgotText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  consentBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(26,20,17,0.7)",
    marginBottom: 8,
  },
  consentRowActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  consentText: {
    flex: 1,
    color: colors.stone,
    fontSize: 12,
    lineHeight: 17,
  },
  consentTextActive: {
    color: colors.bone,
  },
});
