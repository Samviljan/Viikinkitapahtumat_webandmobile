import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, text } from "@/src/lib/theme";

interface Props {
  title: string;
  resultsCount: number;
  children: React.ReactNode;
}

/**
 * Visual container for the home-screen search controls (search bar +
 * filter chips + month picker). Renders a distinct "scroll" panel with a
 * gold accent so users can clearly tell where the search section starts
 * and where the results list begins.
 */
export function SearchPanel({ title, resultsCount, children }: Props) {
  return (
    <View style={styles.panel} testID="search-panel">
      <View style={styles.header}>
        <Ionicons name="search-circle-outline" size={18} color={colors.gold} />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
        <View style={styles.badge}>
          <Text style={styles.badgeText} testID="search-result-count">
            {resultsCount}
          </Text>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    marginBottom: spacing.xl,
    overflow: "hidden",
    // Subtle glow / elevation
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(201,161,74,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  title: {
    ...text.overline,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2.2,
  },
  spacer: { flex: 1 },
  badge: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.bone,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});

export const SearchPanelSection = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <View style={sectionStyles.wrap}>
    <Text style={sectionStyles.label}>{label}</Text>
    {children}
  </View>
);

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    color: colors.stone,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 6,
  },
});
