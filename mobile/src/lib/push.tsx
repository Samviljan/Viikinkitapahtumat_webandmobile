/**
 * Mobile Expo Push Token registration + foreground notification handling.
 *
 * Wired into the root layout so the token is registered as soon as the user
 * is signed in, and re-registered whenever the user signs in/out (a fresh
 * sign-in always re-pushes the current token to the backend).
 *
 * Backend endpoint: POST /api/users/me/push-token  (auth required).
 * Backend prunes invalid tokens automatically when Expo reports
 * `DeviceNotRegistered`, so we can be liberal about when we register.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/lib/auth";

// Foreground display: show banner + sound for incoming notifications.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Hook: request permission, fetch Expo Push Token, send it to backend.
 * Safe to call when the user is not signed in — it simply no-ops.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function register() {
      if (!user) return;
      // Push notifications never work on emulators/simulators.
      if (!Device.isDevice) return;

      try {
        // Android requires a notification channel for displaying notifications.
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Tapahtumat",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#C9A14A",
          });
        }

        // Request permission if not yet granted.
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        // EAS project ID is required for Expo's getExpoPushTokenAsync since SDK 49.
        const projectId =
          (Constants?.expoConfig as { extra?: { eas?: { projectId?: string } } })?.extra?.eas
            ?.projectId ??
          (Constants as { easConfig?: { projectId?: string } })?.easConfig?.projectId;
        if (!projectId) return;

        const tokenObj = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenObj.data;
        if (!token || cancelled) return;
        if (lastTokenRef.current === token) return; // already registered

        await api.post("/users/me/push-token", {
          expo_push_token: token,
          platform: Platform.OS,
        });
        lastTokenRef.current = token;
      } catch (err) {
        // Silent: never block the app on a push registration failure.
        // eslint-disable-next-line no-console
        console.warn("Push token registration failed:", err);
      }
    }

    register();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Listen for token rolls — Expo can re-issue the same device a new token.
  useEffect(() => {
    if (!user) return undefined;
    const sub = Notifications.addPushTokenListener(async ({ data }) => {
      try {
        await api.post("/users/me/push-token", {
          expo_push_token: data,
          platform: Platform.OS,
        });
        lastTokenRef.current = data;
      } catch {
        // ignore
      }
    });
    return () => sub.remove();
  }, [user]);
}
