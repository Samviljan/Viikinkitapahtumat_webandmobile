/**
 * Aggregate attendance counts shown to merchants & organizers & admins.
 * Mirrors the web `EventStats.jsx` component — privacy-safe (only role
 * counts, never nicknames/emails).
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing } from "@/src/lib/theme";

interface Stats {
  reenactors: number;
  fighters: number;
  total: number;
}

export default function EventStatsBlock({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  const types = (user?.user_types || []) as string[];
  const canSee =
    !!user &&
    (user.role === "admin" ||
      types.includes("merchant") ||
      types.includes("organizer"));

  useEffect(() => {
    if (!canSee) return;
    api
      .get<Stats>(`/events/${eventId}/stats`)
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));
  }, [canSee, eventId]);

  if (!canSee || !stats) return null;

  return (
    <View style={styles.block} testID="event-stats">
      <View style={styles.headerRow}>
        <Ionicons name="people-outline" size={12} color={colors.gold} />
        <Text style={styles.title}>Osallistujat</Text>
      </View>
      <View style={styles.grid}>
        <Stat icon="shield-outline" value={stats.reenactors} label="Reenaktorit" />
        <Stat icon="sparkles-outline" value={stats.fighters} label="Taistelijat" />
        <Stat icon="people" value={stats.total} label="Yhteensä" />
      </View>
      <Text style={styles.note}>
        Anonyymit laskennat — vain roolimäärät näkyvät, ei käyttäjätietoja.
      </Text>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={14} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.85)",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  title: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  statValue: {
    color: colors.bone,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  statLabel: {
    color: colors.stone,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  note: {
    color: colors.stone,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
    marginTop: spacing.sm,
  },
});
