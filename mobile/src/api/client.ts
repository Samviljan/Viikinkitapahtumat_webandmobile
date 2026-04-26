import axios from "axios";
import Constants from "expo-constants";

const baseURL =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl ?? "https://events-refresh-1.preview.emergentagent.com";

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
});

export function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${baseURL}${url}`;
}

export const apiBaseUrl = baseURL;
