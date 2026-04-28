import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useMerchants } from "@/src/hooks/useDirectory";
import { colors, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";

const CATEGORY_LABELS: Record<string, string> = {
  gear: "Varuste- ja työkaluvalikoima",
  smith: "Sepät",
  textile: "Tekstiilit ja kankaat",
  other: "Muut",
};

export default function ShopsScreen() {
  const { data, loading, error } = useMerchants();
  const { t } = useSettings();

  const sections = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const m of data) {
      const key = m.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  type Row =
    | { type: "section"; key: string; label: string }
    | { type: "merchant"; key: string; merchant: (typeof data)[number] };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const [cat, list] of sections) {
      out.push({
        type: "section",
        key: `s-${cat}`,
        label: CATEGORY_LABELS[cat] || cat.toUpperCase(),
      });
      for (const m of list) {
        out.push({ type: "merchant", key: `m-${m.id}`, merchant: m });
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
              <Text style={text.overline}>Kauppiaat</Text>
              <Text style={[text.h1, { marginTop: 4, marginBottom: spacing.sm }]}>
                {t("shops.title")}
              </Text>
              <Text style={styles.intro}>
                Varusteita, käsityökaluja ja kankaita viikinkiajan ja
                keskiajan elävöitykseen. Napauta avataksesi kauppiaan
                kotisivut.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "section") {
              return <SectionTitle label={item.label} />;
            }
            const m = item.merchant;
            return (
              <LinkListRow
                testID={`merchant-${m.id}`}
                icon={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                title={m.name}
                subtitle={m.description || undefined}
                url={m.url}
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
              <Text style={styles.empty}>Ei vielä kauppiaita.</Text>
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
