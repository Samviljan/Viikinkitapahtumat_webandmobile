/**
 * Search settings (language + default filters + Near-me radius).
 *
 * Lifted from the previous all-in-one settings screen. Lives at
 * /settings/search and is accessed via the Settings hub.
 */
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { SUPPORTED_LANGS, type Lang } from "@/src/lib/translations";
import {
  COUNTRY_CODES,
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
} from "@/src/lib/countries";
import type { DateRangeFilter } from "@/src/lib/i18n";

const RADIUS_OPTIONS = [25, 50, 100, 200, 500, 1000];
const DATE_OPTIONS: { key: DateRangeFilter; labelKey: string }[] = [
  { key: "any", labelKey: "home.date_any" },
  { key: "this_week", labelKey: "home.date_this_week" },
  { key: "this_month", labelKey: "home.date_this_month" },
  { key: "next_3_months", labelKey: "home.date_next_3_months" },
];

export default function SearchSettings() {
  const router = useRouter();
  const { t, lang, setLang, langChosen, defaults, setDefaults } = useSettings();
  const [showSavedHint, setShowSavedHint] = useState(false);

  function pickLang(next: Lang | "auto") {
    if (next === "auto") {
      AsyncStorage.removeItem("vk_lang").catch(() => {});
      Alert.alert(
        t("settings.section_language"),
        t("settings.language_auto"),
      );
      return;
    }
    setLang(next);
    flashSaved();
  }

  function toggleCountry(code: string) {
    const set = new Set(defaults.defaultCountries);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    setDefaults({ defaultCountries: Array.from(set) });
    flashSaved();
  }

  function pickDateRange(key: DateRangeFilter) {
    setDefaults({ defaultDateRange: key });
    flashSaved();
  }

  function pickRadius(km: number) {
    setDefaults({ nearMeRadiusKm: km });
    flashSaved();
  }

  function toggleNearMe() {
    setDefaults({ defaultNearMe: !defaults.defaultNearMe });
    flashSaved();
  }

  function toggleLocationEnabled() {
    const next = !defaults.locationEnabled;
    // When disabling, also force-disable the per-default "Near me" so the home
    // screen does not try to filter by an unavailable signal next time.
    setDefaults(
      next ? { locationEnabled: true } : { locationEnabled: false, defaultNearMe: false },
    );
    flashSaved();
  }

  function reset() {
    Alert.alert(
      t("settings.reset"),
      t("settings.reset_confirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.reset"),
          style: "destructive",
          onPress: () => {
            setDefaults({
              defaultCountries: [],
              defaultDateRange: "any",
              defaultNearMe: false,
              nearMeRadiusKm: 200,
              locationEnabled: true,
            });
            flashSaved();
          },
        },
      ],
    );
  }

  function flashSaved() {
    setShowSavedHint(true);
    setTimeout(() => setShowSavedHint(false), 1200);
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="search-settings-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="search-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("settings.nav_search")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Language */}
          <Section title={t("settings.section_language")}>
            <View style={styles.chipRow}>
              <Pressable
                testID="lang-auto"
                onPress={() => pickLang("auto")}
                style={[styles.chip, !langChosen && styles.chipActive]}
              >
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={!langChosen ? colors.gold : colors.stone}
                />
                <Text
                  style={[
                    styles.chipLabel,
                    !langChosen && styles.chipLabelActive,
                  ]}
                >
                  {t("settings.language_auto")}
                </Text>
              </Pressable>
              {SUPPORTED_LANGS.map((code) => {
                const active = langChosen && lang === code;
                return (
                  <Pressable
                    key={code}
                    testID={`lang-${code}`}
                    onPress={() => pickLang(code)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        active && styles.chipLabelActive,
                      ]}
                    >
                      {t(`langs.${code}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Default filters */}
          <Section title={t("settings.section_filters")}>
            <Text style={styles.label}>{t("settings.default_date_range")}</Text>
            <View style={styles.chipRow}>
              {DATE_OPTIONS.map((d) => {
                const active = defaults.defaultDateRange === d.key;
                return (
                  <Pressable
                    key={d.key}
                    testID={`default-date-${d.key}`}
                    onPress={() => pickDateRange(d.key)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        active && styles.chipLabelActive,
                      ]}
                    >
                      {t(d.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: spacing.lg }]}>
              {t("settings.default_countries")}
            </Text>
            <View style={styles.chipRow}>
              {COUNTRY_CODES.map((code) => {
                const active = defaults.defaultCountries.includes(code);
                return (
                  <Pressable
                    key={code}
                    testID={`default-country-${code}`}
                    onPress={() => toggleCountry(code)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={styles.flagText}>{COUNTRY_FLAGS[code]}</Text>
                    <Text
                      style={[
                        styles.chipLabel,
                        active && styles.chipLabelActive,
                      ]}
                    >
                      {COUNTRY_NAMES[code]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Privacy / Location master toggle */}
          <Section title={t("settings.section_privacy")}>
            <Pressable
              testID="location-enabled-toggle"
              onPress={toggleLocationEnabled}
              style={styles.toggleRow}
            >
              <Ionicons
                name={defaults.locationEnabled ? "checkbox" : "square-outline"}
                size={18}
                color={defaults.locationEnabled ? colors.gold : colors.stone}
              />
              <Text style={styles.toggleText}>
                {t("settings.location_enabled")}
              </Text>
            </Pressable>
            <Text style={styles.helpText}>
              {t("settings.location_enabled_help")}
            </Text>
          </Section>

          {/* Near me */}
          <Section title={t("settings.section_near_me")}>
            {defaults.locationEnabled ? (
              <>
                <Pressable
                  testID="default-near-me-toggle"
                  onPress={toggleNearMe}
                  style={styles.toggleRow}
                >
                  <Ionicons
                    name={defaults.defaultNearMe ? "checkbox" : "square-outline"}
                    size={18}
                    color={defaults.defaultNearMe ? colors.gold : colors.stone}
                  />
                  <Text style={styles.toggleText}>
                    {t("settings.default_near_me")}
                  </Text>
                </Pressable>

                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  {t("settings.near_me_radius_label")} ({t("units.km")})
                </Text>
                <View style={styles.chipRow}>
                  {RADIUS_OPTIONS.map((km) => {
                    const active = defaults.nearMeRadiusKm === km;
                    return (
                      <Pressable
                        key={km}
                        testID={`radius-${km}`}
                        onPress={() => pickRadius(km)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text
                          style={[
                            styles.chipLabel,
                            active && styles.chipLabelActive,
                          ]}
                        >
                          {km} {t("units.km")}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.helpText}>
                  {t("settings.near_me_radius_help")}
                </Text>
              </>
            ) : (
              <Text style={styles.helpText} testID="near-me-disabled-note">
                {t("settings.location_disabled_note")}
              </Text>
            )}
          </Section>

          <Pressable
            testID="reset-defaults"
            onPress={reset}
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.ember} />
            <Text style={styles.resetBtnText}>{t("settings.reset")}</Text>
          </Pressable>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        {showSavedHint ? (
          <View style={styles.savedToast} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
            <Text style={styles.savedText}>{t("settings.saved_toast")}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </AppBackground>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    flex: 1,
    textAlign: "center",
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.xl, paddingTop: spacing.lg },
  sectionTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  label: {
    color: colors.stone,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  flagText: { fontSize: 13, lineHeight: 14 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 4,
  },
  toggleText: { color: colors.bone, fontSize: 14, flex: 1 },
  helpText: {
    color: colors.stone,
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },
  resetBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.ember,
    borderRadius: radius.sm,
  },
  resetBtnText: {
    color: colors.ember,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  savedToast: {
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
  savedText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
