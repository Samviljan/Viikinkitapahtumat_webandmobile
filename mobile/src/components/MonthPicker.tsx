import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/src/lib/theme";
import { FI_MONTHS } from "@/src/lib/format";

export interface MonthValue {
  year: number;
  month: number; // 0-indexed (0=January)
}

interface Props {
  value: MonthValue | null;
  onChange: (v: MonthValue | null) => void;
  monthsAhead?: number; // default 12
}

/**
 * Horizontal scroll of upcoming months (current + next N-1) so the user can
 * filter events to a specific calendar month. Active selection paints the
 * chip ember + bone; tapping the active chip clears the filter.
 */
export function MonthPicker({ value, onChange, monthsAhead = 12 }: Props) {
  const months = useMemo<MonthValue[]>(() => {
    const list: MonthValue[] = [];
    const now = new Date();
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list;
  }, [monthsAhead]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="month-picker"
    >
      {months.map((m) => {
        const active = value?.year === m.year && value?.month === m.month;
        const label =
          `${FI_MONTHS[m.month].slice(0, 3).toLowerCase()} ${String(m.year).slice(2)}`;
        return (
          <Pressable
            key={`${m.year}-${m.month}`}
            testID={`month-chip-${m.year}-${m.month}`}
            onPress={() => onChange(active ? null : m)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ width: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.bg,
    minWidth: 64,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    color: colors.stone,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "capitalize",
  },
  chipTextActive: { color: colors.bg, fontWeight: "700" },
});
