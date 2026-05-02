/**
 * Profile screen.
 *
 * - When NOT logged in: shows a friendly empty-state and a "Sign in / Create
 *   account" button that routes to /settings/auth.
 * - When logged in: lets the user edit nickname, user_types, profile picture,
 *   country, association, fighter card PDF, equipment passport PDF, and the
 *   marketing consents. Email and login type are read-only.
 */
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { useAuth, type UserType } from "@/src/lib/auth";
import { getConsentTexts } from "@/src/lib/consents";
import { api, apiBaseUrl, resolveImageUrl, TOKEN_KEY } from "@/src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COUNTRY_CODES, COUNTRY_FLAGS, COUNTRY_NAMES } from "@/src/lib/countries";

const ALL_TYPES: UserType[] = ["reenactor", "fighter", "merchant", "organizer"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_DOC_BYTES = 8 * 1024 * 1024;
type DocKind = "fighter_card" | "equipment_passport";

export default function ProfileScreen() {
  const router = useRouter();
  const { t, lang } = useSettings();
  const { user, signOut, updateProfile, refreshUser } = useAuth();
  const consentTexts = getConsentTexts(lang);
  const [nickname, setNickname] = useState("");
  const [types, setTypes] = useState<UserType[]>([]);
  const [merchantName, setMerchantName] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [associationName, setAssociationName] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [consentOrganizer, setConsentOrganizer] = useState(false);
  const [consentMerchant, setConsentMerchant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [fighterBusy, setFighterBusy] = useState(false);
  const [passportBusy, setPassportBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || user.name || "");
      setTypes(user.user_types || []);
      setMerchantName(user.merchant_name || "");
      setOrganizerName(user.organizer_name || "");
      setAssociationName(user.association_name || "");
      setCountry(user.country || null);
      setConsentOrganizer(!!user.consent_organizer_messages);
      setConsentMerchant(!!user.consent_merchant_offers);
    }
  }, [user]);

  function toggleType(t2: UserType) {
    setTypes((prev) =>
      prev.includes(t2) ? prev.filter((x) => x !== t2) : [...prev, t2],
    );
  }

  async function save() {
    if (!user) return;
    if (types.includes("merchant") && !merchantName.trim()) {
      Alert.alert(t("auth.merchant_name_help"));
      return;
    }
    if (types.includes("organizer") && !organizerName.trim()) {
      Alert.alert(t("auth.organizer_name_help"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nickname: nickname.trim(),
        user_types: types,
        merchant_name: types.includes("merchant") ? merchantName.trim() : "",
        organizer_name: types.includes("organizer") ? organizerName.trim() : "",
        consent_organizer_messages: consentOrganizer,
        consent_merchant_offers: consentMerchant,
        association_name: associationName.trim() || null,
        country: country,
      });
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    } catch {
      Alert.alert(t("auth.error_generic"));
    } finally {
      setSaving(false);
    }
  }

  async function pickImage() {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("auth.profile_image_upload_error"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      Alert.alert(t("auth.profile_image_too_large"));
      return;
    }
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", {
        uri: asset.uri,
        name: asset.fileName || "profile.jpg",
        type: asset.mimeType || "image/jpeg",
      } as unknown as Blob);
      await api.post<{ url: string }>(
        "/uploads/profile-image",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      // Backend already updated user.profile_image_url; refresh from /auth/me
      await refreshUser();
    } catch {
      Alert.alert(t("auth.profile_image_upload_error"));
    } finally {
      setImageBusy(false);
    }
  }

  async function removeImage() {
    if (!user) return;
    setImageBusy(true);
    try {
      await api.patch("/auth/profile", { profile_image_url: "" });
      await refreshUser();
    } catch {
      Alert.alert(t("auth.error_generic"));
    } finally {
      setImageBusy(false);
    }
  }

  async function pickDocument(kind: DocKind) {
    if (!user) return;
    const setBusy = kind === "fighter_card" ? setFighterBusy : setPassportBusy;
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_DOC_BYTES) {
      Alert.alert(t("auth.doc_too_large"));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", {
        uri: asset.uri,
        name: asset.name || `${kind}.pdf`,
        type: "application/pdf",
      } as unknown as Blob);
      await api.post("/uploads/profile-doc", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
    } catch {
      Alert.alert(t("auth.doc_upload_error"));
    } finally {
      setBusy(false);
    }
  }

  async function viewDocument(url: string | null) {
    if (!url) return;
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const full = url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
      // Append token via query string so the OS browser/PDF viewer can open
      // the auth-protected URL (Linking.openURL can't carry custom headers).
      const tokenized = token
        ? `${full}${full.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`
        : full;
      await Linking.openURL(tokenized);
    } catch {
      Alert.alert(t("auth.error_generic"));
    }
  }

  async function removeDocument(kind: DocKind) {
    if (!user) return;
    const setBusy = kind === "fighter_card" ? setFighterBusy : setPassportBusy;
    setBusy(true);
    try {
      await api.patch("/auth/profile", {
        [`${kind}_url`]: "",
      });
      await refreshUser();
    } catch {
      Alert.alert(t("auth.error_generic"));
    } finally {
      setBusy(false);
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

  /**
   * Step-by-step push registration test. Shows exactly which step fails so
   * the user can self-diagnose why their device isn't visible in the admin
   * push panel. Logs each step, then displays a single Alert with the full
   * report.
   */
  async function testPushRegistration() {
    const lines: string[] = [];
    const ok = (s: string) => lines.push(`OK · ${s}`);
    const fail = (s: string) => lines.push(`FAIL · ${s}`);
    try {
      lines.push(`Device: ${Device.modelName ?? "?"} · ${Platform.OS}`);
      lines.push(`API: ${apiBaseUrl}`);

      if (!user) {
        fail("Not signed in — push needs auth");
        Alert.alert("Push diagnostics", lines.join("\n"));
        return;
      }
      ok(`Signed in as ${user.email}`);

      if (!Device.isDevice) {
        fail("Not a physical device (emulator) — Expo push requires a real device");
        Alert.alert("Push diagnostics", lines.join("\n"));
        return;
      }
      ok("Physical device confirmed");

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Tapahtumat",
          importance: Notifications.AndroidImportance.HIGH,
        });
        ok("Android notification channel set");
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      lines.push(`Permission (existing): ${existing}`);
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
        lines.push(`Permission (after prompt): ${status}`);
      }
      if (final !== "granted") {
        fail("Permission not granted — open phone settings → Notifications → enable");
        Alert.alert("Push diagnostics", lines.join("\n"));
        return;
      }
      ok("Notification permission granted");

      const projectId =
        (Constants?.expoConfig as { extra?: { eas?: { projectId?: string } } })
          ?.extra?.eas?.projectId ??
        (Constants as { easConfig?: { projectId?: string } })?.easConfig
          ?.projectId;
      if (!projectId) {
        fail("EAS projectId not found in app config");
        Alert.alert("Push diagnostics", lines.join("\n"));
        return;
      }
      ok(`Project ID: ${projectId.slice(0, 8)}…`);

      const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
      const tk = tokenObj.data;
      if (!tk) {
        fail("getExpoPushTokenAsync returned empty");
        Alert.alert("Push diagnostics", lines.join("\n"));
        return;
      }
      ok(`Got Expo Push Token (${tk.length} chars)`);
      lines.push(`Token preview: ${tk.slice(0, 40)}…`);

      try {
        const res = await api.post("/users/me/push-token", {
          expo_push_token: tk,
          platform: Platform.OS,
        });
        ok(`Backend POST /users/me/push-token → ${res.status}`);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: unknown }; message?: string };
        fail(
          `Backend POST failed: ${err?.response?.status ?? "?"} ${err?.message ?? ""}`,
        );
        if (err?.response?.data) {
          lines.push(`Body: ${JSON.stringify(err.response.data).slice(0, 200)}`);
        }
      }

      Alert.alert("Push diagnostics", lines.join("\n"));
    } catch (e: unknown) {
      const err = e as { message?: string };
      lines.push(`EXCEPTION · ${err?.message ?? String(e)}`);
      Alert.alert("Push diagnostics", lines.join("\n"));
    }
  }

  const profileImageHttpUrl = resolveImageUrl(user?.profile_image_url ?? null);
  const initial = (
    (user?.nickname || user?.email || "") as string
  )
    .charAt(0)
    .toUpperCase();

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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
                  {profileImageHttpUrl ? (
                    <Image
                      source={{ uri: profileImageHttpUrl }}
                      style={styles.avatarImage}
                      testID="profile-image-preview"
                    />
                  ) : (
                    <Text style={styles.avatarText}>{initial}</Text>
                  )}
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

              {/* Profile image actions */}
              <Text style={styles.label}>{t("auth.profile_image_label")}</Text>
              <View style={styles.rowBtns}>
                <Pressable
                  testID="profile-image-pick"
                  onPress={pickImage}
                  disabled={imageBusy}
                  style={({ pressed }) => [
                    styles.outlineBtn,
                    (pressed || imageBusy) && { opacity: 0.7 },
                  ]}
                >
                  {imageBusy ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Ionicons name="camera-outline" size={14} color={colors.gold} />
                  )}
                  <Text style={styles.outlineBtnText}>
                    {t("auth.profile_image_change")}
                  </Text>
                </Pressable>
                {user.profile_image_url ? (
                  <Pressable
                    testID="profile-image-remove"
                    onPress={removeImage}
                    disabled={imageBusy}
                    style={({ pressed }) => [
                      styles.dangerBtn,
                      (pressed || imageBusy) && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.ember} />
                    <Text style={styles.dangerBtnText}>
                      {t("auth.profile_image_remove")}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("auth.nickname")}
              </Text>
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

              {types.includes("merchant") ? (
                <View testID="profile-merchant-name-block">
                  <Text style={[styles.label, { marginTop: spacing.lg }]}>
                    {t("auth.merchant_name_label")}
                  </Text>
                  <TextInput
                    testID="profile-merchant-name"
                    value={merchantName}
                    onChangeText={setMerchantName}
                    style={styles.input}
                    placeholderTextColor={colors.stone}
                    autoCapitalize="words"
                  />
                  <Text style={styles.help}>{t("auth.merchant_name_help")}</Text>
                </View>
              ) : null}

              {types.includes("organizer") ? (
                <View testID="profile-organizer-name-block">
                  <Text style={[styles.label, { marginTop: spacing.lg }]}>
                    {t("auth.organizer_name_label")}
                  </Text>
                  <TextInput
                    testID="profile-organizer-name"
                    value={organizerName}
                    onChangeText={setOrganizerName}
                    style={styles.input}
                    placeholderTextColor={colors.stone}
                    autoCapitalize="words"
                  />
                  <Text style={styles.help}>{t("auth.organizer_name_help")}</Text>
                </View>
              ) : null}

              {/* Association */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("auth.association_label")}
              </Text>
              <TextInput
                testID="profile-association"
                value={associationName}
                onChangeText={setAssociationName}
                style={styles.input}
                placeholderTextColor={colors.stone}
                autoCapitalize="words"
              />
              <Text style={styles.help}>{t("auth.association_help")}</Text>

              {/* Country */}
              <Text style={[styles.label, { marginTop: spacing.lg }]}>
                {t("auth.country_label")}
              </Text>
              <Pressable
                testID="profile-country-open"
                onPress={() => setCountryPickerOpen(true)}
                style={[styles.input, styles.pickerRow]}
              >
                <Text
                  style={
                    country ? styles.pickerValue : styles.pickerPlaceholder
                  }
                >
                  {country
                    ? `${COUNTRY_FLAGS[country] || ""}  ${
                        COUNTRY_NAMES[country] || country
                      }`
                    : t("auth.country_none")}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.stone} />
              </Pressable>

              {/* Documents */}
              <View style={styles.docsBlock}>
                <Text style={styles.label}>
                  {t("auth.documents_section")}
                </Text>
                <Text style={styles.help}>{t("auth.documents_help")}</Text>

                <DocField
                  testID="profile-fighter-card"
                  label={t("auth.fighter_card_label")}
                  help={t("auth.fighter_card_help")}
                  url={user.fighter_card_url}
                  busy={fighterBusy}
                  pickLabel={t("auth.doc_pick_pdf")}
                  viewLabel={t("auth.doc_view")}
                  removeLabel={t("auth.doc_remove")}
                  onPick={() => pickDocument("fighter_card")}
                  onView={() => viewDocument(user.fighter_card_url)}
                  onRemove={() => removeDocument("fighter_card")}
                />
                <DocField
                  testID="profile-equipment-passport"
                  label={t("auth.equipment_passport_label")}
                  help={t("auth.equipment_passport_help")}
                  url={user.equipment_passport_url}
                  busy={passportBusy}
                  pickLabel={t("auth.doc_pick_pdf")}
                  viewLabel={t("auth.doc_view")}
                  removeLabel={t("auth.doc_remove")}
                  onPick={() => pickDocument("equipment_passport")}
                  onView={() => viewDocument(user.equipment_passport_url)}
                  onRemove={() => removeDocument("equipment_passport")}
                />
              </View>

              {/* Marketing consents */}
              <View style={styles.consentBlock} testID="profile-consents">
                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  {consentTexts.section_title}
                </Text>
                <Text style={styles.help}>{consentTexts.section_help}</Text>
                <ConsentRow
                  testID="profile-consent-organizer"
                  active={consentOrganizer}
                  label={consentTexts.consent_organizer_messages}
                  onPress={() => setConsentOrganizer((v) => !v)}
                />
                <ConsentRow
                  testID="profile-consent-merchant"
                  active={consentMerchant}
                  label={consentTexts.consent_merchant_offers}
                  onPress={() => setConsentMerchant((v) => !v)}
                />
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
                testID="profile-test-push"
                onPress={testPushRegistration}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  {
                    alignSelf: "center",
                    marginTop: spacing.lg,
                    paddingHorizontal: 16,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="notifications-outline" size={14} color={colors.gold} />
                <Text style={styles.outlineBtnText}>Test push registration</Text>
              </Pressable>

              <Pressable
                testID="profile-clear-push"
                onPress={async () => {
                  try {
                    await api.delete("/users/me/push-tokens");
                    Alert.alert(
                      "Push-rekisteröinti nollattu",
                      "Paina seuraavaksi \"Test push registration\" rekisteröidäksesi tämän laitteen uudelleen puhtaalta pöydältä.",
                    );
                  } catch (e: unknown) {
                    const err = e as { message?: string };
                    Alert.alert("Tyhjennys epäonnistui", err?.message ?? "");
                  }
                }}
                style={({ pressed }) => [
                  {
                    alignSelf: "center",
                    marginTop: spacing.sm,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={{ color: colors.stone, fontSize: 11, textDecorationLine: "underline" }}>
                  Tyhjennä push-rekisteröinti
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

        {/* Country picker modal */}
        <Modal
          visible={countryPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCountryPickerOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setCountryPickerOpen(false)}
          >
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <Text style={[styles.label, { textAlign: "center" }]}>
                {t("auth.country_label")}
              </Text>
              <FlatList
                data={[null, ...COUNTRY_CODES]}
                keyExtractor={(item) => item ?? "none"}
                renderItem={({ item }) => {
                  const selected =
                    (item ?? null) === (country ?? null) ||
                    (!country && item === null);
                  return (
                    <Pressable
                      testID={
                        item ? `country-opt-${item}` : "country-opt-none"
                      }
                      onPress={() => {
                        setCountry(item);
                        setCountryPickerOpen(false);
                      }}
                      style={[
                        styles.modalRow,
                        selected && styles.modalRowActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalRowText,
                          selected && { color: colors.gold },
                        ]}
                      >
                        {item
                          ? `${COUNTRY_FLAGS[item] || ""}  ${
                              COUNTRY_NAMES[item] || item
                            }`
                          : t("auth.country_none")}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={colors.gold}
                        />
                      ) : null}
                    </Pressable>
                  );
                }}
                style={{ maxHeight: 480 }}
              />
            </Pressable>
          </Pressable>
        </Modal>

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

function DocField({
  testID,
  label,
  help,
  url,
  busy,
  pickLabel,
  viewLabel,
  removeLabel,
  onPick,
  onView,
  onRemove,
}: {
  testID: string;
  label: string;
  help: string;
  url: string | null;
  busy: boolean;
  pickLabel: string;
  viewLabel: string;
  removeLabel: string;
  onPick: () => void;
  onView: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.docCard} testID={testID}>
      <View style={styles.docHeader}>
        <Ionicons name="document-text-outline" size={18} color={colors.gold} />
        <View style={{ flex: 1 }}>
          <Text style={styles.docLabel}>{label}</Text>
          <Text style={styles.docHelp}>
            {help}
            {url ? "  ·  PDF" : ""}
          </Text>
        </View>
      </View>
      <View style={styles.rowBtns}>
        <Pressable
          testID={`${testID}-pick`}
          onPress={onPick}
          disabled={busy}
          style={({ pressed }) => [
            styles.outlineBtn,
            (pressed || busy) && { opacity: 0.7 },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={14} color={colors.gold} />
          )}
          <Text style={styles.outlineBtnText}>{pickLabel}</Text>
        </Pressable>
        {url ? (
          <>
            <Pressable
              testID={`${testID}-view`}
              onPress={onView}
              disabled={busy}
              style={({ pressed }) => [
                styles.outlineBtn,
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="open-outline" size={14} color={colors.gold} />
              <Text style={styles.outlineBtnText}>{viewLabel}</Text>
            </Pressable>
            <Pressable
              testID={`${testID}-remove`}
              onPress={onRemove}
              disabled={busy}
              style={({ pressed }) => [
                styles.dangerBtn,
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.ember} />
              <Text style={styles.dangerBtnText}>{removeLabel}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
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
    overflow: "hidden",
  },
  avatarText: { color: colors.gold, fontSize: 22, fontWeight: "700" },
  avatarImage: { width: 48, height: 48 },
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
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerValue: { color: colors.bone, fontSize: 14 },
  pickerPlaceholder: { color: colors.stone, fontSize: 14, fontStyle: "italic" },
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
  rowBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    backgroundColor: "rgba(201,161,74,0.1)",
  },
  outlineBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.ember,
    borderRadius: radius.sm,
  },
  dangerBtnText: {
    color: colors.ember,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  docsBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  docCard: {
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radius.sm,
    backgroundColor: "rgba(26,20,17,0.7)",
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  docHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  docLabel: { color: colors.bone, fontSize: 13, fontWeight: "700" },
  docHelp: { color: colors.stone, fontSize: 11, marginTop: 2 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#110E0C",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.edge,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.edge,
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: spacing.sm,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  modalRowActive: {
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  modalRowText: { color: colors.bone, fontSize: 14 },
});
