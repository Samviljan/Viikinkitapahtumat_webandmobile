import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { colors } from "@/src/lib/theme";

const BG = require("../../assets/bg-viking.jpg");

/**
 * Full-screen viking background (image + dark scrim) used inside every tab
 * screen. Rendering it per-screen (instead of once in the root layout) is
 * intentional: it keeps each tab as its own opaque container, which prevents
 * the previous screen's content from bleeding through during tab transitions
 * on web (where react-native-web's Tabs implementation does not always
 * unmount inactive screens cleanly).
 *
 * Children are rendered absolutely on top of the background so screens can
 * still use SafeAreaView + FlatList layouts as normal.
 */
export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <ImageBackground source={BG} resizeMode="cover" style={StyleSheet.absoluteFill}>
        <View style={styles.scrim} />
      </ImageBackground>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.bg },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,11,9,0.55)",
  },
  content: { flex: 1, width: "100%" },
});
