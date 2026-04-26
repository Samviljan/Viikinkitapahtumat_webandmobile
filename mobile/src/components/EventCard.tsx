import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { resolveImageUrl } from "@/src/api/client";
import { useFavorites } from "@/src/hooks/useFavorites";
import { flagFor } from "@/src/lib/countries";
import { FI_CATS, countdownLabel, daysUntil, formatDateRange } from "@/src/lib/format";
import type { VikingEvent } from "@/src/types";

export function EventCard({ event }: { event: VikingEvent }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(event.id);
  const img = resolveImageUrl(event.image_url);
  const cd = daysUntil(event.start_date, event.end_date);

  return (
    <Link
      href={{ pathname: "/event/[id]", params: { id: event.id } }}
      asChild
    >
      <Pressable
        testID={`event-card-${event.id}`}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {img ? (
          <View style={styles.imgWrap}>
            <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
            <View style={styles.catBar}>
              <Text style={styles.catText}>
                {flagFor(event.country)}  {(FI_CATS[event.category] || event.category).toUpperCase()}
              </Text>
            </View>
            <Pressable
              testID={`fav-toggle-${event.id}`}
              hitSlop={12}
              onPress={(e) => {
                e.stopPropagation?.();
                toggle(event.id);
              }}
              style={styles.favBtn}
            >
              <Ionicons
                name={fav ? "star" : "star-outline"}
                size={20}
                color={fav ? colors.gold : colors.bone}
              />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title_fi}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.gold} />
            <Text style={styles.meta}>
              {formatDateRange(event.start_date, event.end_date)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.gold} />
            <Text style={styles.meta} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
          {cd !== null ? (
            <View style={styles.countdownRow}>
              <Ionicons name="hourglass-outline" size={12} color={colors.ember} />
              <Text style={styles.countdownLabel}>TAPAHTUMAAN</Text>
              <Text style={styles.countdownVal}>{countdownLabel(cd)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  cardPressed: { opacity: 0.85 },
  imgWrap: { position: "relative", width: "100%", height: 160 },
  img: { width: "100%", height: "100%" },
  catBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(200,73,44,0.95)",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201,161,74,0.4)",
  },
  catText: {
    color: colors.bone,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  favBtn: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(14,11,9,0.65)",
    borderWidth: 1,
    borderColor: "rgba(53,42,35,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.lg, gap: 6 },
  title: { ...text.h2, fontSize: 18, marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meta: { ...text.meta, flexShrink: 1 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  countdownLabel: {
    color: colors.stone,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  countdownVal: {
    color: colors.ember,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
  },
});
