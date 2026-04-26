import "react-native-gesture-handler";
import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { Stack, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";

const BG = require("../assets/bg-viking.png");

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ImageBackground
        source={BG}
        resizeMode="cover"
        style={styles.bg}
      >
        {/* Dark scrim so foreground content stays readable on top of the image */}
        <View pointerEvents="none" style={styles.scrim} />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: "transparent" },
            headerStyle: { backgroundColor: "transparent" },
            headerTransparent: true,
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
        </Stack>
      </ImageBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,11,9,0.25)",
  },
});
