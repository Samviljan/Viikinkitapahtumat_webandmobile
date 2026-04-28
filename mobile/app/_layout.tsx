import "react-native-gesture-handler";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";
import { SettingsProvider } from "@/src/lib/i18n";

export default function RootLayout() {
  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.bone,
            headerTitleStyle: { color: colors.bone, fontWeight: "700" },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="event/[id]"
            options={{ title: "", headerTransparent: true }}
          />
          <Stack.Screen name="info" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </SettingsProvider>
  );
}
