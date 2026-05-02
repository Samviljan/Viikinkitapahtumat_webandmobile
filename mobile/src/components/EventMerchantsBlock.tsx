/**
 * Mobile event-detail strip — shows merchant cards whose owner has
 * RSVPed to this event. Public, no auth required. Hides itself if no
 * merchants are present.
 */
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, resolveImageUrl } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";

interface EventMerchant {
  id: string;
  name: string;
  description?: string;
  url?: string;
  category?: string;
  image_url?: string;
  featured?: boolean;
}

export default function EventMerchantsBlock({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { t } = useSettings();
  const [merchants, setMerchants] = useState<EventMerchant[] | null>(null);

  useEffect(() => {
    if (!eventId) return;
    api
      .get<EventMerchant[]>(`/events/${eventId}/merchants`)
      .then((r) => setMerchants(Array.isArray(r.data) ? r.data : []))
      .catch(() => setMerchants([]));
  }, [eventId]);

  if (!merchants || merchants.length === 0) return null;

  return (
    <View style={styles.block} testID="event-merchants">
      <Text style={styles.title}>
        {t("events.merchants_present") || "Kauppiaita paikalla"}
      </Text>
      <Text style={styles.help}>
        {t("events.merchants_present_help") ||
          "Nämä kauppiaat ovat ilmoittaneet osallistuvansa tähän tapahtumaan."}
      </Text>
      <View style={styles.grid}>
        {merchants.map((m) => {
          const src = resolveImageUrl(m.image_url || null);
          return (
            <Pressable
              key={m.id}
              testID={`event-merchant-${m.id}`}
              onPress={() => router.push(`/shops/${m.id}` as never)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              {src ? (
                <Image source={{ uri: src }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons
                    name={m.category === "smith" ? "hammer-outline" : "storefront-outline"}
                    size={22}
                    color={colors.gold}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  {m.featured ? (
                    <Ionicons name="star" size={11} color={colors.gold} />
                  ) : null}
                  <Text style={styles.name} numberOfLines={1}>
                    {m.name}
                  </Text>
                </View>
                {m.description ? (
                  <Text style={styles.desc} numberOfLines={2}>
                    {m.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  title: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  help: {
    color: colors.stone,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  grid: { gap: 8 },
  card: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.sm,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.85)",
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius?.sm ?? 4,
    backgroundColor: colors.surface2,
  },
  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.edge,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  name: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  desc: {
    color: colors.stone,
    fontSize: 11,
    lineHeight: 16,
  },
});
