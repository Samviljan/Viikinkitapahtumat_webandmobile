import React, { useMemo } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EventCard } from "@/src/components/EventCard";
import { useEvents } from "@/src/hooks/useEvents";
import { FI_MONTHS, parseEventDate } from "@/src/lib/format";
import { colors, spacing, text } from "@/src/lib/theme";

interface MonthSection {
  title: string;
  year: number;
  data: ReturnType<typeof useEvents>["events"];
}

export default function CalendarScreen() {
  const { events } = useEvents();

  const sections: MonthSection[] = useMemo(() => {
    const buckets = new Map<string, MonthSection>();
    const sorted = [...events].sort((a, b) =>
      (a.start_date ?? "").localeCompare(b.start_date ?? ""),
    );
    for (const ev of sorted) {
      const d = parseEventDate(ev.start_date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          title: FI_MONTHS[d.getMonth()],
          year: d.getFullYear(),
          data: [],
        });
      }
      buckets.get(key)!.data.push(ev);
    }
    return Array.from(buckets.values());
  }, [events]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionYear}>{section.year}</Text>
            <View style={styles.sectionLine} />
          </View>
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[text.h1, { marginBottom: spacing.lg }]}>Kalenteri</Text>
        }
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.bone,
    fontSize: 26,
    fontWeight: "700",
  },
  sectionYear: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600",
    paddingBottom: 4,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.edge,
    marginBottom: 6,
  },
});
