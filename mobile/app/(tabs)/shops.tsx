import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { LinkListRow, SectionTitle } from "@/src/components/LinkListRow";
import { useMerchants } from "@/src/hooks/useDirectory";
import { useFavoriteMerchants } from "@/src/hooks/useFavoriteMerchants";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/api/client";
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

// "Hanki kauppiaskortti" CTA — visible to anonymous + non-paid users only.
// Anonymous → routes to /settings/auth (sign-in/register flow).
// Logged in without active card → opens an in-app form modal that POSTs
// to /merchant-card-requests; admin one-click approves to auto-activate.
interface ExistingRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  shop_name: string;
  website: string;
  category: string;
  description: string;
}
function MerchantCardCTA() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState<"gear" | "smith" | "other">("gear");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<ExistingRequest | null>(null);

  const hasActiveCard = !!user?.merchant_card?.enabled;
  const isAnonymous = !user;

  useEffect(() => {
    if (!open || isAnonymous) return;
    api
      .get<ExistingRequest | null>("/merchant-card-requests/mine")
      .then((r) => {
        const doc = r.data;
        if (doc) {
          setExisting(doc);
          setShopName(doc.shop_name || "");
          setWebsite(doc.website || "");
          setCategory(((doc.category as "gear" | "smith" | "other") || "gear"));
          setDescription(doc.description || "");
        } else {
          setExisting(null);
        }
      })
      .catch(() => setExisting(null));
  }, [open, isAnonymous]);

  if (hasActiveCard) return null;

  const onPress = () => {
    if (isAnonymous) {
      router.push("/settings/auth" as never);
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!shopName.trim()) {
      Alert.alert("Kaupan tai pajan nimi vaaditaan.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/merchant-card-requests", {
        shop_name: shopName.trim(),
        website: website.trim(),
        category,
        description: description.trim(),
      });
      Alert.alert("Pyyntö lähetetty pääkäyttäjille — saat ilmoituksen aktivoinnista.");
      setOpen(false);
    } catch {
      Alert.alert("Pyynnön lähetys epäonnistui. Yritä uudelleen.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = existing?.status === "pending";
  const isApproved = existing?.status === "approved";

  return (
    <View style={styles.ctaCard} testID="merchant-cta">
      <View style={styles.ctaHeader}>
        <View style={styles.ctaIcon}>
          <Ionicons name="storefront-outline" size={20} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaEyebrow}>Premium-näkyvyys</Text>
          <Text style={styles.ctaTitle}>
            Hanki kauppiaskortti — pohjoisen viikinkiyhteisön huomio
          </Text>
        </View>
      </View>
      <Text style={styles.ctaLead}>
        Kauppiaskortti nostaa kauppasi tai pajasi näkyväksi koko sivuston yläosaan ja avaa sinulle oman profiilisivun.
      </Text>
      {[
        "Top-näkyvyys jokaisen sivun \"Esillä olevat kauppiaat\" -strippi:ssä SEKÄ kategoriasi kärjessä",
        "Oma profiilisivu kuvalla, kuvauksella, yhteystiedoilla ja tulevilla tapahtumillasi",
        "Käyttäjät voivat lisätä sinut suosikeihinsa ja saada ilmoitukset uusista tapahtumistasi",
        "12 kuukauden aktivointi — yhdellä haulla koko vuosi",
      ].map((line, i) => (
        <View key={i} style={styles.ctaBenefit}>
          <Ionicons name="checkmark" size={14} color={colors.gold} />
          <Text style={styles.ctaBenefitText}>{line}</Text>
        </View>
      ))}
      <Pressable
        testID={isAnonymous ? "merchant-cta-register" : "merchant-cta-request"}
        onPress={onPress}
        style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons
          name={isAnonymous ? "person-add-outline" : "mail-outline"}
          size={14}
          color={colors.bone}
        />
        <Text style={styles.ctaBtnText}>
          {isAnonymous ? "Rekisteröidy kauppiaaksi" : "Hae kauppiaskorttia"}
        </Text>
      </Pressable>
      <Text style={styles.ctaFinePrint}>
        Toistaiseksi toiminto on maksuton. Mahdollinen maksullisuus tapahtuu tulevissa julkaisuversioissa, ja siitä tiedotetaan erikseen ennen käyttöönottoa.
      </Text>

      {!isAnonymous ? (
        <Modal
          visible={open}
          animationType="slide"
          transparent
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard} testID="merchant-cta-dialog">
              <ScrollView
                contentContainerStyle={{ padding: spacing.lg }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalTitle}>Hae kauppiaskorttia</Text>
                <Text style={styles.modalLead}>
                  Täytä lyhyet tiedot kaupasta tai pajasta. Lähetämme pyyntösi pääkäyttäjille — saat ilmoituksen kun kortti on aktivoitu.
                </Text>
                {isPending ? (
                  <View style={styles.statusPending} testID="merchant-cta-status-pending">
                    <Text style={styles.statusText}>
                      Edellinen pyyntösi odottaa käsittelyä. Voit päivittää tietoja tarvittaessa.
                    </Text>
                  </View>
                ) : null}
                {isApproved ? (
                  <View style={styles.statusApproved} testID="merchant-cta-status-approved">
                    <Text style={styles.statusText}>
                      Pyyntösi on hyväksytty ja kauppiaskortti aktivoitu! Päivitä sovellus nähdäksesi muutos.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.modalLabel}>Kaupan tai pajan nimi</Text>
                <TextInput
                  testID="merchant-cta-shop"
                  value={shopName}
                  onChangeText={setShopName}
                  maxLength={200}
                  style={styles.modalInput}
                  placeholderTextColor={colors.stone}
                />

                <Text style={styles.modalLabel}>Kategoria</Text>
                <View style={styles.modalChipRow}>
                  {(["gear", "smith", "other"] as const).map((c) => {
                    const active = category === c;
                    const label = c === "gear" ? "Varuste / tarvikkeet" : c === "smith" ? "Seppä" : "Muu";
                    return (
                      <Pressable
                        key={c}
                        testID={`merchant-cta-cat-${c}`}
                        onPress={() => setCategory(c)}
                        style={[styles.modalChip, active && styles.modalChipActive]}
                      >
                        <Text style={[styles.modalChipText, active && styles.modalChipTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Verkkosivu (valinnainen)</Text>
                <TextInput
                  testID="merchant-cta-website"
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://"
                  maxLength={500}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={styles.modalInput}
                  placeholderTextColor={colors.stone}
                />

                <Text style={styles.modalLabel}>Lyhyt esittely (valinnainen)</Text>
                <TextInput
                  testID="merchant-cta-desc"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={1500}
                  textAlignVertical="top"
                  style={[styles.modalInput, { minHeight: 100 }]}
                  placeholderTextColor={colors.stone}
                />

                <View style={styles.modalActions}>
                  <Pressable
                    testID="merchant-cta-cancel"
                    onPress={() => setOpen(false)}
                    style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.modalCancelText}>Peruuta</Text>
                  </Pressable>
                  <Pressable
                    testID="merchant-cta-submit"
                    onPress={submit}
                    disabled={submitting || !shopName.trim() || isApproved}
                    style={({ pressed }) => [
                      styles.modalSubmit,
                      (pressed || submitting || !shopName.trim() || isApproved) && { opacity: 0.5 },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.bone} />
                    ) : (
                      <Ionicons name="mail-outline" size={14} color={colors.bone} />
                    )}
                    <Text style={styles.modalSubmitText}>
                      {isPending ? "Päivitä pyyntö" : "Lähetä pyyntö"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
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
          ListFooterComponent={<MerchantCardCTA />}
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
  // Merchant CTA card
  ctaCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.ember,
    backgroundColor: "rgba(180,70,52,0.08)",
  },
  ctaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  ctaTitle: {
    color: colors.bone,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    lineHeight: 22,
  },
  ctaLead: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  ctaBenefit: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  ctaBenefitText: {
    color: colors.bone,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.ember,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius?.sm ?? 4,
    marginTop: spacing.md,
  },
  ctaBtnText: {
    color: colors.bone,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  ctaFinePrint: {
    color: colors.stone,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: spacing.md,
  },
  // Request modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius?.sm ?? 4,
    maxHeight: "90%",
  },
  modalTitle: { color: colors.bone, fontSize: 20, fontWeight: "700" },
  modalLead: {
    color: colors.stone,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "rgba(14,11,9,0.95)",
    borderColor: colors.edge,
    borderWidth: 1,
    borderRadius: radius?.sm ?? 4,
    color: colors.bone,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.7)",
  },
  modalChipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  modalChipText: { color: colors.stone, fontSize: 12, fontWeight: "600" },
  modalChipTextActive: { color: colors.gold },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.stone, fontSize: 13, fontWeight: "600" },
  modalSubmit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.ember,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius?.sm ?? 4,
  },
  modalSubmitText: {
    color: colors.bone,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  statusPending: {
    padding: spacing.sm,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.stone,
    backgroundColor: "rgba(14,11,9,0.85)",
    marginBottom: spacing.sm,
  },
  statusApproved: {
    padding: spacing.sm,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
    marginBottom: spacing.sm,
  },
  statusText: { color: colors.bone, fontSize: 13, lineHeight: 19 },
});
