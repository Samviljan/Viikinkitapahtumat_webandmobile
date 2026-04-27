import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useGuilds } from "@/src/hooks/useDirectory";
import { colors, radius, spacing, text } from "@/src/lib/theme";

const SVTL_URL = "https://www.svtl.fi/";

// Mirror the website's grouping order on /guilds:
//   1. SVTL info card (always first)
//   2. SVTL member clubs (category === "svtl_member")
//   3. Other clubs / guilds / associations (category === "other")
const SECTION_ORDER = ["svtl_member", "other"] as const;

const SECTION_LABELS: Record<string, string> = {
  svtl_member: "SVTL:n jäsenseurat",
  other: "Muut seurat, kaartit ja yhdistykset",
};

export default function GuildsScreen() {
  const { data, loading, error } = useGuilds();

  const sections = useMemo(() => {
    const groups: Record<string, typeof data> = {};
    for (const g of data) {
      const key = SECTION_ORDER.includes(
        (g.category as (typeof SECTION_ORDER)[number]) ?? "other",
      )
        ? g.category
        : "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    }
    // Preserve server-side order_index inside each group.
    for (const k of Object.keys(groups)) {
      groups[k].sort(
        (a, b) =>
          (a.order_index ?? 0) - (b.order_index ?? 0) ||
          a.name.localeCompare(b.name),
      );
    }
    return SECTION_ORDER.filter((k) => groups[k]?.length).map((k) => ({
      key: k,
      label: SECTION_LABELS[k],
      items: groups[k],
    }));
  }, [data]);

  type Row =
    | { type: "section"; key: string; label: string }
    | { type: "guild"; key: string; guild: (typeof data)[number] };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const s of sections) {
      out.push({ type: "section", key: `s-${s.key}`, label: s.label });
      for (const g of s.items) {
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

              {/* SVTL info card — mirrors the website's hero block */}
              <View style={styles.svtlCard} testID="svtl-info-card">
                <Text style={styles.svtlEyebrow}>SVTL</Text>
                <Text style={styles.svtlTitle}>
                  Suomen viikinkiaikaisten taistelulajien liitto ry
                </Text>
                <Text style={styles.svtlBody}>
                  SVTL on vuonna 2025 perustettu viikinkiajan taistelutaitojen
                  harrastajien valtakunnallinen lajiliitto. Liiton jäseniä ovat
                  viikinkiaikaisia, rautakautisia tai niihin rinnastettavia
                  taistelulajeja harjoittavat yhteisöt.
                </Text>
                <Pressable
                  testID="svtl-link"
                  onPress={() => Linking.openURL(SVTL_URL).catch(() => {})}
                  style={styles.svtlBtn}
                >
                  <Text style={styles.svtlBtnText}>SVTL:n verkkosivut</Text>
                  <Ionicons name="open-outline" size={12} color={colors.gold} />
                </Pressable>
              </View>
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
  svtlCard: {
    backgroundColor: "rgba(26,20,17,0.92)",
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  svtlEyebrow: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  svtlTitle: {
    color: colors.bone,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  svtlBody: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  svtlBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  svtlBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  center: { alignItems: "center", paddingVertical: spacing.xxl },
  empty: { color: colors.stone, padding: spacing.lg, textAlign: "center" },
  error: { color: colors.ember, padding: spacing.lg, textAlign: "center" },
});
