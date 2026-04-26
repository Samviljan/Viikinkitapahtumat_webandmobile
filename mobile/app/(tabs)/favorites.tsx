import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { EventCard } from "@/src/components/EventCard";
import { useEvents } from "@/src/hooks/useEvents";
import { useFavorites } from "@/src/hooks/useFavorites";
import { colors, spacing, text } from "@/src/lib/theme";

export default function FavoritesScreen() {
  const { events } = useEvents();
  const { ids } = useFavorites();

  const favEvents = useMemo(
    () => events.filter((e) => ids.includes(e.id)),
    [events, ids],
  );

  if (favEvents.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.empty}>
        <Ionicons name="star-outline" size={48} color={colors.gold} />
        <Text style={[text.h2, { marginTop: spacing.lg, textAlign: "center" }]}>
          Ei vielä suosikkeja
        </Text>
        <Text style={styles.emptyText}>
          Tähdellä merkityt tapahtumat tallentuvat tähän puhelimeesi —{"\n"}
          ne pysyvät offline-tilassakin.
        </Text>
        <Link href="/" style={styles.cta}>
          Selaa tapahtumia
        </Link>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <FlatList
        data={favEvents}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={text.overline}>{favEvents.length} tallennettua</Text>
            <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.lg }]}>
              Suosikit
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
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
