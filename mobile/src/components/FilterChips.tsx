import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/lib/theme";

interface ChipProps {
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  testID?: string;
}

export function FilterChip({ active, onPress, icon, label, testID }: ChipProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Ionicons
        name={icon}
        size={13}
        color={active ? colors.bone : colors.stone}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function FilterChipsRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.ember,
    borderColor: colors.ember,
  },
  chipText: {
    color: colors.stone,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chipTextActive: { color: colors.bone },
});
