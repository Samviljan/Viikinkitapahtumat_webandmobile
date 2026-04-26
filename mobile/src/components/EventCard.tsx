import React, { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { apiBaseUrl, resolveImageUrl } from "@/src/api/client";
import { useFavorites } from "@/src/hooks/useFavorites";
import { flagFor } from "@/src/lib/countries";
import { FI_CATS, countdownLabel, daysUntil, formatDateRange } from "@/src/lib/format";
import type { VikingEvent } from "@/src/types";

const CAT_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  market: "storefront-outline",
  training_camp: "shield-outline",
  course: "book-outline",
  festival: "flame-outline",
  meetup: "people-outline",
  other: "sparkles-outline",
};

/**
 * Compact event card with a left-side mini thumbnail (96×96), gold accent
 * left border, distinct shadow + ember-tinted footer to clearly separate
 * each event from the next.
 */
export function EventCard({ event }: { event: VikingEvent }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(event.id);
  const img = resolveImageUrl(event.image_url);
  const cd = daysUntil(event.start_date, event.end_date);
  const [imgFailed, setImgFailed] = useState(false);
  const cat = (FI_CATS[event.category] || event.category).toUpperCase();
  const catIcon = CAT_ICON[event.category] || "sparkles-outline";

  return (
    <Link
      href={{ pathname: "/event/[id]", params: { id: event.id } }}
      asChild
    >
      <Pressable
        testID={`event-card-${event.id}`}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Gold accent bar on the left edge */}
        <View style={styles.accent} />

        <View style={styles.row}>
          {/* Mini thumbnail (left) */}
          <View style={styles.thumb}>
            {img && !imgFailed ? (
              <Image
                source={{ uri: img }}
                style={styles.thumbImg}
                resizeMode="cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name={catIcon} size={28} color={colors.gold} />
              </View>
            )}
            <View style={styles.flagBadge}>
              <Text style={styles.flagText}>{flagFor(event.country)}</Text>
            </View>
          </View>

          {/* Content (right) */}
          <View style={styles.body}>
            <View style={styles.catRow}>
              <Ionicons name={catIcon} size={11} color={colors.ember} />
              <Text style={styles.catText}>{cat}</Text>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {event.title_fi}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.gold} />
              <Text style={styles.meta} numberOfLines={1}>
                {formatDateRange(event.start_date, event.end_date)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={colors.gold} />
              <Text style={styles.meta} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          </View>

          {/* Favorite (top-right) */}
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
              size={18}
              color={fav ? colors.gold : colors.stone}
            />
          </Pressable>
        </View>

        {/* Countdown footer strip */}
        {cd !== null ? (
          <View style={styles.footer}>
            <Ionicons name="hourglass-outline" size={11} color={colors.ember} />
            <Text style={styles.footerLabel}>TAPAHTUMAAN</Text>
            <Text style={styles.footerVal}>{countdownLabel(cd)}</Text>
          </View>
        ) : null}

        {event.program_pdf_url ? (
          <Pressable
            testID={`event-program-link-${event.id}`}
            onPress={(e) => {
              e.stopPropagation?.();
              const url = event.program_pdf_url!.startsWith("http")
                ? event.program_pdf_url!
                : `${apiBaseUrl}${event.program_pdf_url}`;
              Linking.openURL(url).catch(() => {});
            }}
            style={styles.programRow}
          >
            <Ionicons name="document-text-outline" size={12} color={colors.gold} />
            <Text style={styles.programText}>TAPAHTUMAN OHJELMA (PDF)</Text>
            <Ionicons name="open-outline" size={11} color={colors.stone} />
          </Pressable>
        ) : null}
      </Pressable>
    </Link>
  );
}

const THUMB = 96;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(26,20,17,0.92)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    marginBottom: spacing.md,
    overflow: "hidden",
    // Pronounced shadow so each event reads as its own physical "card"
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.gold,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    paddingLeft: spacing.md + 3, // compensate for accent bar
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.edge,
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  flagBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(14,11,9,0.8)",
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  flagText: { fontSize: 12, lineHeight: 14 },
  body: { flex: 1, gap: 4, paddingRight: 24 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  catText: {
    color: colors.ember,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: {
    ...text.h2,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 1,
    marginBottom: 2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { ...text.meta, fontSize: 12, flexShrink: 1 },
  favBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: "rgba(14,11,9,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: "rgba(200,73,44,0.10)",
    borderTopWidth: 1,
    borderTopColor: "rgba(200,73,44,0.25)",
  },
  footerLabel: {
    color: colors.stone,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "600",
  },
  footerVal: {
    color: colors.ember,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "700",
    marginLeft: "auto",
  },
  programRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
    backgroundColor: "rgba(201,161,74,0.06)",
  },
  programText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    flex: 1,
  },
});
