/**
 * Mobile auth context.
 *
 * Manages the logged-in user (or null = anonymous), persists the JWT token
 * in AsyncStorage via api/client.ts, and offers signUp / signIn / signOut /
 * updateProfile helpers. Wraps the app under SettingsProvider in _layout.tsx.
 *
 * The whole feature is OPTIONAL — components should handle a null `user`
 * gracefully (anonymous browsing keeps working).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, loadStoredToken, setAuthToken } from "@/src/api/client";

export type UserType = "reenactor" | "fighter" | "merchant" | "organizer";

export interface SavedSearch {
  radius_km: number | null;
  categories: string[];
  countries: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  role: string; // "user" | "admin"
  user_types: UserType[];
  has_password: boolean;
  merchant_name: string | null;
  organizer_name: string | null;
  consent_organizer_messages: boolean;
  consent_merchant_offers: boolean;
  saved_search: SavedSearch | null;
  paid_messaging_enabled: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signUp: (input: {
    email: string;
    password: string;
    nickname: string;
    user_types: UserType[];
    merchant_name?: string | null;
    organizer_name?: string | null;
    consent_organizer_messages?: boolean;
    consent_merchant_offers?: boolean;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogleSession: (sessionId: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: {
    nickname?: string;
    user_types?: UserType[];
    merchant_name?: string | null;
    organizer_name?: string | null;
    consent_organizer_messages?: boolean;
    consent_merchant_offers?: boolean;
    saved_search?: SavedSearch;
  }) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const Context = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Boot: restore token from AsyncStorage, then fetch /auth/me to verify.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tok = await loadStoredToken();
        if (!tok) return;
        const { data } = await api.get<AuthUser>("/auth/me");
        if (!cancelled) setUser(normalize(data));
      } catch {
        // Token invalid/expired → clear it silently.
        setAuthToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      nickname: string;
      user_types: UserType[];
      merchant_name?: string | null;
      organizer_name?: string | null;
      consent_organizer_messages?: boolean;
      consent_merchant_offers?: boolean;
    }) => {
      const { data } = await api.post("/auth/register", input);
      setAuthToken(data.token);
      setUser(normalize(data));
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setAuthToken(data.token);
    setUser(normalize(data));
  }, []);

  const signInWithGoogleSession = useCallback(async (sessionId: string) => {
    const { data } = await api.post("/auth/google-session", { session_id: sessionId });
    setAuthToken(data.token);
    setUser(normalize(data));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* server-side cookie may be unset, ignore */
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: {
      nickname?: string;
      user_types?: UserType[];
      merchant_name?: string | null;
      organizer_name?: string | null;
      consent_organizer_messages?: boolean;
      consent_merchant_offers?: boolean;
      saved_search?: SavedSearch;
    }) => {
      const { data } = await api.patch<AuthUser>("/auth/profile", patch);
      setUser(normalize(data));
    },
    [],
  );

  const forgotPassword = useCallback(async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  }, []);

  return (
    <Context.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogleSession,
        signOut,
        updateProfile,
        forgotPassword,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

function normalize(raw: Partial<AuthUser>): AuthUser {
  return {
    id: raw.id ?? "",
    email: raw.email ?? "",
    name: raw.name ?? "",
    nickname: raw.nickname ?? null,
    role: raw.role ?? "user",
    user_types: (raw.user_types ?? []) as UserType[],
    has_password: !!raw.has_password,
    merchant_name: raw.merchant_name ?? null,
    organizer_name: raw.organizer_name ?? null,
    consent_organizer_messages: !!raw.consent_organizer_messages,
    consent_merchant_offers: !!raw.consent_merchant_offers,
    saved_search: raw.saved_search ?? null,
    paid_messaging_enabled: !!raw.paid_messaging_enabled,
  };
}
