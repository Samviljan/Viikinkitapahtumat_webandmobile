import "react-native-gesture-handler";
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";
import { SettingsProvider } from "@/src/lib/i18n";
import { AuthProvider } from "@/src/lib/auth";
import { usePushNotifications } from "@/src/lib/push";

function PushTokenRegistrar() {
  // Side-effect-only component: registers the device's Expo Push Token with
  // the backend whenever the user signs in. Returns nothing.
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <PushTokenRegistrar />
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
            <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
            <Stack.Screen name="settings/search" options={{ headerShown: false }} />
            <Stack.Screen name="settings/auth" options={{ headerShown: false }} />
            <Stack.Screen name="settings/forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="settings/attending" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
