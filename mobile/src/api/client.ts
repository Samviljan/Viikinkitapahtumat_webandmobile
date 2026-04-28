import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const baseURL =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl ?? "https://events-refresh-1.preview.emergentagent.com";

export const TOKEN_KEY = "vk_auth_token";

// In-memory cached token to avoid AsyncStorage round-trips on every request.
// Set by AuthProvider.signIn() / signOut() and on app boot.
let cachedToken: string | null = null;

export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (token) {
    AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  } else {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
  }
}

export async function loadStoredToken(): Promise<string | null> {
  try {
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    cachedToken = t;
    return t;
  } catch {
    return null;
  }
}

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (cachedToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

export function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${baseURL}${url}`;
}

export const apiBaseUrl = baseURL;
