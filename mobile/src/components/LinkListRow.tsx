import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/lib/theme";

interface Props {
  title: string;
  subtitle?: string;
  url?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  testID?: string;
}

/**
 * Compact list-row used by the Kauppiaat & Kaartit tabs.
 * Tap → opens external URL in the system browser. Visually mirrors EventCard
 * (gold accent + dark surface) so the app feels consistent.
 */
export function LinkListRow({ title, subtitle, url, icon, testID }: Props) {
  const open = () => {
    if (url) Linking.openURL(url).catch(() => {});
  };
  return (
    <Pressable
      testID={testID}
      onPress={open}
      disabled={!url}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.accent} />
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {url ? (
        <Ionicons name="open-outline" size={16} color={colors.stone} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(26,20,17,0.92)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    padding: spacing.md,
    paddingLeft: spacing.md + 3,
    marginBottom: spacing.sm,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 2,
  },
  rowPressed: { opacity: 0.85 },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.gold,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(201,161,74,0.08)",
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.bone, fontSize: 14, fontWeight: "700" },
  subtitle: {
    color: colors.stone,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});

export const SectionTitle = ({ label }: { label: string }) => (
  <View style={sectionStyles.wrap}>
    <Text style={sectionStyles.text}>{label}</Text>
  </View>
);

const sectionStyles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  text: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
