/**
 * Mobile merchant detail screen — mirrors the web `MerchantDetail.jsx`.
 *
 * Shows full merchant card (image, description, contact info, website) and
 * lets the user favourite/unfavourite via the heart button.
 */
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppBackground } from "@/src/components/AppBackground";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";
import { useFavoriteMerchants } from "@/src/hooks/useFavoriteMerchants";
import { colors, radius, spacing } from "@/src/lib/theme";

const API = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

interface Merchant {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  url?: string;
  phone?: string;
  email?: string;
  category?: string;
  country?: string;
  city?: string;
  featured?: boolean;
  is_user_card?: boolean;
}

function imgSrc(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}

export default function MerchantDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavoriteMerchants();
  const [m, setM] = useState<Merchant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<Merchant>(`/merchants/${id}`)
      .then((r) => setM(r.data))
      .catch(() => setError("not_found"));
  }, [id]);

  const fav = id ? isFavorite(id) : false;
  const canFavourite = !!user?.id;

  if (error) {
    return (
      <AppBackground>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.gold} />
            <Text style={styles.errorText}>Kauppiasta ei löytynyt.</Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.backBtnText}>Takaisin</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (!m) {
    return (
      <AppBackground>
        <SafeAreaView edges={["top"]} style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert("Linkin avaus epäonnistui"));
  };

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="merchant-detail">
        <View style={styles.topBar}>
          <Pressable
            testID="merchant-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.topBarBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {m.name}
          </Text>
          {canFavourite ? (
            <Pressable
              testID="merchant-fav-toggle"
              onPress={() => toggle(m.id)}
              hitSlop={12}
              style={({ pressed }) => [styles.topBarBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name={fav ? "heart" : "heart-outline"}
                size={22}
                color={fav ? colors.ember : colors.bone}
              />
            </Pressable>
          ) : (
            <View style={styles.topBarBtn} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {m.image_url ? (
            <Image
              source={{ uri: imgSrc(m.image_url) }}
              style={styles.hero}
              resizeMode="cover"
              testID="merchant-image"
            />
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Ionicons
                name={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                size={48}
                color={colors.gold}
              />
            </View>
          )}

          <View style={styles.body}>
            {m.featured ? (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color={colors.gold} />
                <Text style={styles.featuredText}>Esillä oleva kauppias</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{m.name}</Text>

            {m.city || m.country ? (
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={14} color={colors.stone} />
                <Text style={styles.locText}>
                  {[m.city, m.country].filter(Boolean).join(", ")}
                </Text>
              </View>
            ) : null}

            {m.description ? (
              <Text style={styles.description}>{m.description}</Text>
            ) : null}

            <View style={styles.contactBlock}>
              {m.url ? (
                <Pressable
                  testID="merchant-website"
                  onPress={() => openLink(m.url)}
                  style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="globe-outline" size={16} color={colors.gold} />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {m.url}
                  </Text>
                </Pressable>
              ) : null}
              {m.phone ? (
                <Pressable
                  testID="merchant-phone"
                  onPress={() => openLink(`tel:${m.phone}`)}
                  style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.gold} />
                  <Text style={styles.contactText}>{m.phone}</Text>
                </Pressable>
              ) : null}
              {m.email ? (
                <Pressable
                  testID="merchant-email"
                  onPress={() => openLink(`mailto:${m.email}`)}
                  style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="mail-outline" size={16} color={colors.gold} />
                  <Text style={styles.contactText}>{m.email}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    color: colors.bone,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },
  scroll: { paddingBottom: spacing.xxl },
  hero: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surface2 },
  heroFallback: { alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.lg, gap: spacing.sm },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  featuredText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.bone,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  locText: { color: colors.stone, fontSize: 13 },
  description: {
    color: colors.bone,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  contactBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
    gap: spacing.sm,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.85)",
  },
  contactText: { color: colors.bone, fontSize: 13, flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errorText: { color: colors.stone, fontSize: 14 },
  backBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  backBtnText: { color: colors.gold, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
});
