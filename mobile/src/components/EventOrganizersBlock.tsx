/**
 * Mobile public list of approved event organizers — mirrors the web
 * `EventOrganizers.jsx` component. Hidden when no organizers exist.
 */
import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/lib/theme";

interface Organizer {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

export default function EventOrganizersBlock({ eventId }: { eventId: string }) {
  const [list, setList] = useState<Organizer[] | null>(null);

  useEffect(() => {
    if (!eventId) return;
    api
      .get<Organizer[]>(`/events/${eventId}/organizers`)
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]));
  }, [eventId]);

  if (!list || list.length === 0) return null;

  return (
    <View style={styles.block} testID="event-organizers">
      <Text style={styles.title}>Tapahtuman järjestäjät</Text>
      <View style={{ gap: 8 }}>
        {list.map((o) => (
          <View
            key={o.user_id}
            style={styles.row}
            testID={`event-organizer-${o.user_id}`}
          >
            <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
            <Text style={styles.name} numberOfLines={1}>
              {o.full_name}
            </Text>
            {o.email ? (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${o.email}`)}
                style={({ pressed }) => [styles.contact, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="mail-outline" size={11} color={colors.stone} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {o.email}
                </Text>
              </Pressable>
            ) : null}
            {o.phone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${o.phone}`)}
                style={({ pressed }) => [styles.contact, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="call-outline" size={11} color={colors.stone} />
                <Text style={styles.contactText}>{o.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
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
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius?.sm ?? 4,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.85)",
  },
  name: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  contact: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactText: { color: colors.stone, fontSize: 11, flexShrink: 1 },
});
