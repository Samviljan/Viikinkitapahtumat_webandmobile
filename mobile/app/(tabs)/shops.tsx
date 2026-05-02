import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useMerchants } from "@/src/hooks/useDirectory";
import { useFavoriteMerchants } from "@/src/hooks/useFavoriteMerchants";
import { colors, radius, spacing, text } from "@/src/lib/theme";
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

interface FavBtnProps {
  isFav: boolean;
  onPress: () => void;
  testID?: string;
}

function FavoriteHeartButton({ isFav, onPress, testID }: FavBtnProps) {
  return (
    <Pressable
      testID={testID}
      onPress={(e: { stopPropagation?: () => void }) => {
        e.stopPropagation?.();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.heart, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={isFav ? "Poista suosikeista" : "Lisää suosikkeihin"}
    >
      <Ionicons
        name={isFav ? "heart" : "heart-outline"}
        size={20}
        color={isFav ? colors.ember : colors.bone}
      />
    </Pressable>
  );
}

export default function ShopsScreen() {
  const { data, loading, error } = useMerchants();
  const { t } = useSettings();
  const { isFavorite, toggle } = useFavoriteMerchants();

  const sortPaid = (list: typeof data) =>
    list.slice().sort((a, b) => {
      const aFeat = a.featured ? 1 : 0;
      const bFeat = b.featured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      return (a.name || "").localeCompare(b.name || "");
    });

  const featuredAll = useMemo(
    () => sortPaid(data.filter((m) => m.is_user_card)),
    [data],
  );

  // Group by category, then split each category into paid + others tiers
  // so the FlatList can render sub-headers ("★ Premium-kauppiaat" + "Muut")
  // and a divider between them.
  const sections = useMemo(() => {
    const map = new Map<string, { paid: typeof data; others: typeof data }>();
    for (const m of data) {
      const key = m.category || "other";
      if (!map.has(key)) map.set(key, { paid: [], others: [] });
      const bucket = map.get(key)!;
      if (m.is_user_card) bucket.paid.push(m);
      else bucket.others.push(m);
    }
    const out = Array.from(map.entries()).map(
      ([cat, b]) =>
        [cat, { paid: sortPaid(b.paid), others: b.others }] as [
          string,
          { paid: typeof data; others: typeof data },
        ],
    );
    out.sort(([a], [b]) => a.localeCompare(b));
    return out;
  }, [data]);

  type Row =
    | { type: "featured-header"; key: string }
    | { type: "featured-card"; key: string; merchant: (typeof data)[number] }
    | { type: "category-header"; key: string; label: string }
    | { type: "tier-header"; key: string; label: string; tier: "paid" | "others" }
    | { type: "tier-divider"; key: string }
    | { type: "merchant"; key: string; merchant: (typeof data)[number] };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];

    // Top hero strip — all premium cards across categories.
    if (featuredAll.length > 0) {
      out.push({ type: "featured-header", key: "featured-header" });
      for (const m of featuredAll) {
        out.push({ type: "featured-card", key: `feat-${m.id}`, merchant: m });
      }
    }

    for (const [cat, tiers] of sections) {
      if (tiers.paid.length === 0 && tiers.others.length === 0) continue;
      out.push({
        type: "category-header",
        key: `cat-${cat}`,
        label: CATEGORY_LABELS[cat] || cat.toUpperCase(),
      });
      if (tiers.paid.length > 0) {
        out.push({
          type: "tier-header",
          key: `cat-${cat}-paid-h`,
          label: "★ Premium-kauppiaat",
          tier: "paid",
        });
        for (const m of tiers.paid) {
          out.push({ type: "merchant", key: `m-${m.id}`, merchant: m });
        }
        if (tiers.others.length > 0) {
          out.push({ type: "tier-divider", key: `cat-${cat}-div` });
        }
      }
      if (tiers.others.length > 0) {
        if (tiers.paid.length > 0) {
          out.push({
            type: "tier-header",
            key: `cat-${cat}-other-h`,
            label: "Muut kauppiaat",
            tier: "others",
          });
        }
        for (const m of tiers.others) {
          out.push({ type: "merchant", key: `m-${m.id}`, merchant: m });
        }
      }
    }
    return out;
  }, [sections, featuredAll]);

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
              return (
                <View style={styles.featuredHero} testID="featured-hero">
                  <Text style={styles.featuredEyebrow}>
                    ★ Esillä olevat kauppiaat
                  </Text>
                  <Text style={styles.featuredSubtitle}>
                    Yhteistyökumppanit ja viikinkiyhteisön tukijat
                  </Text>
                </View>
              );
            }
            if (item.type === "featured-card") {
              const m = item.merchant;
              const fav = isFavorite(m.id);
              return (
                <View style={styles.paidCard} testID={`featured-${m.id}`}>
                  {m.image_url ? (
                    <Image
                      source={{ uri: imgSrc(m.image_url) }}
                      style={styles.paidImage}
                    />
                  ) : null}
                  <View style={styles.paidBody}>
                    <View style={styles.paidTitleRow}>
                      <Text style={styles.paidTitle}>{m.name}</Text>
                      <FavoriteHeartButton
                        testID={`fav-merchant-${m.id}`}
                        isFav={fav}
                        onPress={() => toggle(m.id)}
                      />
                    </View>
                    {m.description ? (
                      <Text style={styles.paidDesc} numberOfLines={3}>
                        {m.description}
                      </Text>
                    ) : null}
                  </View>
                  <LinkListRow
                    testID={`featured-link-${m.id}`}
                    icon={
                      m.category === "smith" ? "hammer-outline" : "storefront-outline"
                    }
                    title={t("shops.view_details") || "Katso lisätiedot"}
                    url={`/shops/${m.id}`}
                  />
                </View>
              );
            }
            if (item.type === "category-header") {
              return <SectionTitle label={item.label} />;
            }
            if (item.type === "tier-header") {
              return (
                <Text
                  style={[
                    styles.tierLabel,
                    item.tier === "paid" && { color: colors.gold },
                  ]}
                >
                  {item.label}
                </Text>
              );
            }
            if (item.type === "tier-divider") {
              return <View style={styles.tierDivider} />;
            }
            const m = item.merchant;
            // Per-category paid card (this is hit when the merchant appears
            // inside a category section after the "★ Premium" tier-header).
            if (m.is_user_card) {
              const fav = isFavorite(m.id);
              return (
                <View style={styles.paidCard} testID={`merchant-${m.id}`}>
                  {m.image_url ? (
                    <Image
                      source={{ uri: imgSrc(m.image_url) }}
                      style={styles.paidImage}
                    />
                  ) : null}
                  <View style={styles.paidBody}>
                    <View style={styles.paidTitleRow}>
                      <Text style={styles.paidTitle}>{m.name}</Text>
                      <FavoriteHeartButton
                        testID={`fav-merchant-${m.id}`}
                        isFav={fav}
                        onPress={() => toggle(m.id)}
                      />
                    </View>
                    {m.description ? (
                      <Text style={styles.paidDesc} numberOfLines={3}>
                        {m.description}
                      </Text>
                    ) : null}
                  </View>
                  <LinkListRow
                    testID={`merchant-link-${m.id}`}
                    icon={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                    title={t("shops.view_details") || "Katso lisätiedot"}
                    url={`/shops/${m.id}`}
                  />
                </View>
              );
            }
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
  paidCard: {
    marginBottom: spacing.md,
    borderRadius: radius?.sm ?? 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  paidImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface2,
  },
  paidBody: {
    padding: spacing.md,
  },
  paidTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  paidTitle: {
    flex: 1,
    color: colors.bone,
    fontSize: 18,
    fontWeight: "600",
  },
  paidFeatured: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  featuredHero: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  featuredEyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  featuredSubtitle: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  tierLabel: {
    color: colors.stone,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tierDivider: {
    height: 1,
    backgroundColor: colors.edge,
    marginVertical: spacing.md,
    opacity: 0.6,
  },
  paidDesc: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 18,
  },
  heart: {
    padding: spacing.sm,
    alignSelf: "center",
  },
});
