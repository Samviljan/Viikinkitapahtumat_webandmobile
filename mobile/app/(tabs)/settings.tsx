/**
 * Settings hub — the user clicks one of three sub-pages:
 *   - Profile (sign-in / nickname / user types)
 *   - Search settings (language + default filters + Near me radius)
 *   - About the app (version, share, contact)
 */
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { useAuth } from "@/src/lib/auth";

interface NavCard {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  href: string;
  testID: string;
  subline?: string;
}

export default function SettingsHub() {
  const router = useRouter();
  const { t } = useSettings();
  const { user } = useAuth();

  const cards: NavCard[] = [
    {
      icon: "person-circle-outline",
      titleKey: "settings.nav_profile",
      href: "/settings/profile",
      testID: "nav-profile",
      subline: user
        ? user.nickname || user.email
        : t("auth.signed_out_title"),
    },
    {
      icon: "options-outline",
      titleKey: "settings.nav_search",
      href: "/settings/search",
      testID: "nav-search",
    },
    {
      icon: "information-circle-outline",
      titleKey: "settings.nav_about",
      href: "/info",
      testID: "nav-about",
    },
  ];

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="settings-hub">
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={text.overline}>{t("settings.title").toUpperCase()}</Text>
          <Text style={[text.h1, { marginTop: 4 }]}>{t("settings.title")}</Text>
          <Text style={styles.subtitle}>{t("settings.sub")}</Text>

          {cards.map((card) => (
            <Pressable
              key={card.testID}
              testID={card.testID}
              onPress={() => router.push(card.href as never)}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.iconBox}>
                <Ionicons name={card.icon} size={20} color={colors.gold} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{t(card.titleKey)}</Text>
                {card.subline ? (
                  <Text style={styles.cardSub}>{card.subline}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.stone} />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subtitle: {
    color: colors.stone,
    fontSize: 13,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#0F0B08",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.bone, fontSize: 15, fontWeight: "700" },
  cardSub: {
    color: colors.stone,
    fontSize: 12,
    marginTop: 3,
  },
});
