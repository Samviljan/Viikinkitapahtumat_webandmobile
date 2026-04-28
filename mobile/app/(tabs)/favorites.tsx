import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { EventCard } from "@/src/components/EventCard";
import { useEvents } from "@/src/hooks/useEvents";
import { useFavorites } from "@/src/hooks/useFavorites";
import { colors, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";

export default function FavoritesScreen() {
  const { events } = useEvents();
  const { ids } = useFavorites();
  const { t } = useSettings();

  const favEvents = useMemo(
    () => events.filter((e) => ids.includes(e.id)),
    [events, ids],
  );

  if (favEvents.length === 0) {
    return (
      <AppBackground>
        <SafeAreaView edges={["top"]} style={styles.empty}>
          <Ionicons name="star-outline" size={48} color={colors.gold} />
          <Text style={[text.h2, { marginTop: spacing.lg, textAlign: "center" }]}>
            {t("favorites.title")}
          </Text>
          <Text style={styles.emptyText}>
            {t("favorites.empty")}
          </Text>
          <Link href="/" style={styles.cta}>
            {t("favorites.browse")}
          </Link>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
          data={favEvents}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={text.overline}>{t("home.showing_count", { n: favEvents.length })}</Text>
              <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.lg }]}>
                {t("favorites.title")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  empty: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    ...text.body,
    color: colors.stone,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.xl,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    borderColor: colors.gold,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 4,
  },
});
