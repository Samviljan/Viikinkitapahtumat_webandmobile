import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useGuilds } from "@/src/hooks/useDirectory";
import { colors, spacing, text } from "@/src/lib/theme";

const CATEGORY_LABELS: Record<string, string> = {
  svtl: "SVTL & jäsenseurat",
  other: "Muut kaartit & yhdistykset",
};

export default function GuildsScreen() {
  const { data, loading, error } = useGuilds();

  // Group by category preserving server-side ordering inside each group
  const sections = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const g of data) {
      const key = g.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    // Order: svtl first, then alphabetical
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "svtl") return -1;
      if (b === "svtl") return 1;
      return a.localeCompare(b);
    });
  }, [data]);

  // Flatten into a single FlatList stream (heading rows + guild rows)
  type Row =
    | { type: "section"; key: string; label: string }
    | { type: "guild"; key: string; guild: (typeof data)[number] };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const [cat, list] of sections) {
      out.push({
        type: "section",
        key: `s-${cat}`,
        label: CATEGORY_LABELS[cat] || cat.toUpperCase(),
      });
      for (const g of list) {
        out.push({ type: "guild", key: `g-${g.id}`, guild: g });
      }
    }
    return out;
  }, [sections]);

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={text.overline}>Yhteisö</Text>
              <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.sm }]}>
                Kaartit & yhdistykset
              </Text>
              <Text style={styles.intro}>
                Suomalaiset viikinkiajan, rauta-ajan ja varhaiskeskiajan
                harrastusyhteisöt. Napauta avataksesi seuran kotisivut.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "section") {
              return <SectionTitle label={item.label} />;
            }
            return (
              <LinkListRow
                testID={`guild-${item.guild.id}`}
                icon="shield-outline"
                title={item.guild.name}
                subtitle={item.guild.region}
                url={item.guild.url}
              />
            );
          }}
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <Text style={styles.empty}>Ei vielä yhdistyksiä.</Text>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  intro: {
    color: colors.stone,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  center: { alignItems: "center", paddingVertical: spacing.xxl },
  empty: { color: colors.stone, padding: spacing.lg, textAlign: "center" },
  error: { color: colors.ember, padding: spacing.lg, textAlign: "center" },
});
