import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useMerchants } from "@/src/hooks/useDirectory";
import { colors, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";

const API = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

const CATEGORY_LABELS: Record<string, string> = {
  gear: "Varuste- ja työkaluvalikoima",
  smith: "Sepät",
  textile: "Tekstiilit ja kankaat",
  other: "Muut",
};

function imgSrc(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("http")) return u;
  return `${API}${u}`;
}

export default function ShopsScreen() {
  const { data, loading, error } = useMerchants();
  const { t } = useSettings();

  const featured = useMemo(() => data.filter((m) => m.featured), [data]);
  const others = useMemo(() => data.filter((m) => !m.featured), [data]);

  const sections = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const m of others) {
      const key = m.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [others]);

  type Row =
    | { type: "section"; key: string; label: string }
    | { type: "merchant"; key: string; merchant: (typeof data)[number] }
    | { type: "featured-header"; key: string }
    | { type: "featured-card"; key: string; merchant: (typeof data)[number] };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (featured.length > 0) {
      out.push({ type: "featured-header", key: "featured-header" });
      for (const m of featured) {
        out.push({ type: "featured-card", key: `f-${m.id}`, merchant: m });
      }
    }
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
  }, [sections, featured]);

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
            if (item.type === "featured-header") {
              return <SectionTitle label="Esillä olevat kauppiaat" />;
            }
            if (item.type === "section") {
              return <SectionTitle label={item.label} />;
            }
            if (item.type === "featured-card") {
              const m = item.merchant;
              return (
                <View style={styles.featuredCard} testID={`featured-${m.id}`}>
                  {m.image_url ? (
                    <Image source={{ uri: imgSrc(m.image_url) }} style={styles.featuredImage} />
                  ) : null}
                  <View style={styles.featuredBody}>
                    <Text style={styles.featuredTitle}>{m.name}</Text>
                    {m.description ? (
                      <Text style={styles.featuredDesc} numberOfLines={3}>
                        {m.description}
                      </Text>
                    ) : null}
                  </View>
                  <LinkListRow
                    testID={`featured-link-${m.id}`}
                    icon={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                    title={m.url ? "Avaa kotisivut" : m.name}
                    subtitle={m.url || undefined}
                    url={m.url}
                  />
                </View>
              );
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
  featuredCard: {
    marginBottom: spacing.md,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.surface,
  },
  featuredImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.shadow,
  },
  featuredBody: {
    padding: spacing.md,
  },
  featuredTitle: {
    color: colors.bone,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  featuredDesc: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 18,
  },
});
