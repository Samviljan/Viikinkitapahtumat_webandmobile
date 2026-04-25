import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = auth
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (err) {
      // 401 = not logged in (expected on cold load); anything else is unexpected
      if (err?.response?.status !== 401) {
        // eslint-disable-next-line no-console
        console.warn("/auth/me failed:", err?.message);
      }
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    // Auth token is set as an httpOnly cookie by the backend; we never read it
    // in JS. We only keep the user profile in component state.
    const { data } = await api.post("/auth/login", { email, password });
    setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("logout call failed:", err?.message);
    }
    setUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
