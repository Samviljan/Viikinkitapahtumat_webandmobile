import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";
import { useFavorites } from "@/src/hooks/useFavorites";
import { useSettings } from "@/src/lib/i18n";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/api/client";

/**
 * Custom tabs layout (replaces expo-router's <Tabs/>) so that ONLY the
 * currently active screen is mounted at any given time. The default
 * @react-navigation/bottom-tabs renderer keeps inactive screens in the
 * DOM on web, which caused previous screen content to bleed through.
 *
 * Using <Slot /> mounts a single child route at a time; we render our own
 * bottom tab bar that calls router.replace() to navigate.
 */

interface TabDef {
  href: string;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  testID: string;
  showBadge?: boolean;
  showMessagesBadge?: boolean;
  authOnly?: boolean;
}

const TABS: TabDef[] = [
  { href: "/", labelKey: "tab.home", icon: "home", testID: "tab-home" },
  { href: "/favorites", labelKey: "tab.myevents", icon: "bookmarks", testID: "tab-myevents", showBadge: true },
  { href: "/calendar", labelKey: "tab.calendar", icon: "calendar", testID: "tab-cal" },
  { href: "/shops", labelKey: "tab.shops", icon: "storefront", testID: "tab-shops" },
  { href: "/messages", labelKey: "messages.title", icon: "mail", testID: "tab-messages", authOnly: true, showMessagesBadge: true },
  { href: "/settings", labelKey: "tab.settings", icon: "settings-sharp", testID: "tab-settings" },
];

export default function TabsLayout() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { count } = useFavorites();
  const insets = useSafeAreaInsets();
  const { t } = useSettings();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = React.useState(0);

  // Poll unread messages count when logged in. Runs once per pathname change
  // so the badge clears right after the user opens the messages tab.
  React.useEffect(() => {
    if (!user?.id) {
      setUnreadMessages(0);
      return;
    }
    let cancelled = false;
    api
      .get<{ unread: number }[]>("/messages/inbox")
      .then((r) => {
        if (cancelled) return;
        const total = (r.data || []).reduce((acc, g) => acc + (g.unread || 0), 0);
        setUnreadMessages(total);
      })
      .catch(() => !cancelled && setUnreadMessages(0));
    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  const visibleTabs = TABS.filter((t) => !t.authOnly || !!user?.id);

  return (
    <View style={styles.root}>
      <View style={styles.scene}>
        <Slot />
      </View>
      <View
        style={[
          styles.tabBar,
          { paddingBottom: 8 + Math.max(insets.bottom, 4) },
        ]}
        testID="bottom-tabbar"
      >
        {visibleTabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/" || pathname.endsWith("/(tabs)") || pathname.endsWith("/index")
              : pathname.startsWith(tab.href);
          return (
            <Pressable
              key={tab.href}
              testID={tab.testID}
              onPress={() => router.replace(tab.href as never)}
              style={styles.tab}
            >
              <View>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={active ? colors.gold : colors.stone}
                />
                {tab.showBadge && count > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                ) : null}
                {tab.showMessagesBadge && unreadMessages > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadMessages}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.gold : colors.stone },
                ]}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.bg },
  scene: { flex: 1, width: "100%" },
  tabBar: {
    flexDirection: "row",
    paddingTop: 8,
    backgroundColor: "rgba(14,11,9,0.95)",
    borderTopColor: colors.edge,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 48,
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.5, fontWeight: "600" },
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
