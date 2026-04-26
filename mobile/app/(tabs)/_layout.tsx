import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/lib/theme";
import { useFavorites } from "@/src/hooks/useFavorites";
import { Text, View, StyleSheet } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.stone,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.edge,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 1 },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.bone,
        headerTitleStyle: { color: colors.bone, fontWeight: "700", fontSize: 18 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tapahtumat",
          tabBarLabel: "Etusivu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Suosikit",
          tabBarLabel: "Suosikit",
          tabBarIcon: ({ color, size }) => <FavTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Kalenteri",
          tabBarLabel: "Kalenteri",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function FavTabIcon({ color, size }: { color: string; size: number }) {
  const { count } = useFavorites();
  return (
    <View>
      <Ionicons name="star" color={color} size={size} />
      {count > 0 ? (
        <View style={badge.badge}>
          <Text style={badge.badgeText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const badge = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.bone, fontSize: 10, fontWeight: "700" },
});
