/**
 * Profile screen.
 *
 * - When NOT logged in: shows a friendly empty-state and a "Sign in / Create
 *   account" button that routes to /settings/auth.
 * - When logged in: lets the user edit nickname + user_types, plus a sign-out
 *   button. Email and login type are read-only.
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
import { useAuth, type UserType } from "@/src/lib/auth";

const ALL_TYPES: UserType[] = ["reenactor", "fighter", "merchant", "organizer"];

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useSettings();
  const { user, signOut, updateProfile, loading } = useAuth();
  const [nickname, setNickname] = useState("");
  const [types, setTypes] = useState<UserType[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || user.name || "");
      setTypes(user.user_types || []);
    }
  }, [user]);

  function toggleType(t2: UserType) {
    setTypes((prev) =>
      prev.includes(t2) ? prev.filter((x) => x !== t2) : [...prev, t2],
    );
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim(), user_types: types });
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    } catch {
      Alert.alert(t("auth.error_generic"));
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(t("auth.confirm_sign_out"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.sign_out"),
        style: "destructive",
        onPress: () => signOut(),
      },
    ]);
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="profile-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="profile-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("auth.profile_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!user ? (
            <View style={styles.signedOut} testID="signed-out-state">
              <Ionicons
                name="person-circle-outline"
                size={56}
                color={colors.gold}
              />
              <Text style={[text.h2, styles.signedOutTitle]}>
                {t("auth.signed_out_title")}
              </Text>
              <Text style={styles.signedOutSub}>
                {t("auth.signed_out_sub")}
              </Text>
              <Pressable
                testID="goto-auth"
                onPress={() => router.push("/settings/auth" as never)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {t("auth.sign_in")} / {t("auth.sign_up")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.headerCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.nickname || user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.email}>{user.email}</Text>
                  <Text style={styles.authBadge}>
                    {user.has_password
                      ? "✉  email/password"
                      : "G  Google"}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>{t("auth.nickname")}</Text>
              <TextInput
                testID="profile-nickname"
                value={nickname}
                onChangeText={setNickname}
                style={styles.input}
                placeholderTextColor={colors.stone}
                autoCapitalize="words"
              />

              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("auth.user_types_label")}
              </Text>
              <Text style={styles.help}>{t("auth.user_types_help")}</Text>
              <View style={styles.chipRow}>
                {ALL_TYPES.map((tp) => {
                  const active = types.includes(tp);
                  return (
                    <Pressable
                      key={tp}
                      testID={`profile-type-${tp}`}
                      onPress={() => toggleType(tp)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Ionicons
                        name={active ? "checkbox" : "square-outline"}
                        size={13}
                        color={active ? colors.gold : colors.stone}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          active && styles.chipLabelActive,
                        ]}
                      >
                        {t(`auth.type_${tp}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                testID="profile-save"
                onPress={save}
                disabled={saving || !nickname.trim()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { marginTop: spacing.xl },
                  (pressed || saving) && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? "…" : t("auth.profile_save")}
                </Text>
              </Pressable>

              <Pressable
                testID="sign-out"
                onPress={confirmSignOut}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="log-out-outline" size={14} color={colors.ember} />
                <Text style={styles.secondaryBtnText}>{t("auth.sign_out")}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {savedHint ? (
          <View style={styles.toast} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
            <Text style={styles.toastText}>{t("auth.profile_saved")}</Text>
          </View>
        ) : null}
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
  signedOut: { alignItems: "center", paddingTop: spacing.xxl },
  signedOutTitle: { marginTop: spacing.lg, color: colors.bone },
  signedOutSub: {
    color: colors.stone,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#0F0B08",
    borderColor: colors.edge,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(201,161,74,0.18)",
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.gold, fontSize: 22, fontWeight: "700" },
  email: { color: colors.bone, fontSize: 14, fontWeight: "600" },
  authBadge: {
    color: colors.stone,
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.5,
    fontFamily: "monospace",
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
  primaryBtn: {
    backgroundColor: colors.ember,
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    alignItems: "center",
    alignSelf: "stretch",
  },
  primaryBtnText: {
    color: colors.bone,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.ember,
    borderRadius: radius.sm,
  },
  secondaryBtnText: {
    color: colors.ember,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  toast: {
    position: "absolute",
    bottom: spacing.xxl,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: "rgba(14,11,9,0.95)",
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  toastText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
