"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  getGoogleLoginUrl,
  logoutCurrentUser,
  type AuthStatus,
  type AuthUser,
} from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  /** True only during the first /auth/me on app boot. */
  isBootstrapping: boolean;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const bootStarted = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchCurrentUser();
      setUser(next);
      setStatus(next ? "authenticated" : "unauthenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    void refresh();
  }, [refresh]);

  const loginWithGoogle = useCallback(() => {
    window.location.href = getGoogleLoginUrl();
  }, []);

  const logout = useCallback(() => {
    // Optimistic: drop session in UI immediately, revoke cookie in background.
    setUser(null);
    setStatus("unauthenticated");
    setIsBootstrapping(false);
    void logoutCurrentUser().catch(() => {
      // Cookie may already be gone — UI is already signed out.
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isBootstrapping,
      refresh,
      loginWithGoogle,
      logout,
    }),
    [user, status, isBootstrapping, refresh, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
