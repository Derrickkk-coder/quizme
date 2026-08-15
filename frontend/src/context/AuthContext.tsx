import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { fetchMe, login as apiLogin } from "../api/auth";
import { clearToken, getToken, registerUnauthorizedHandler, setToken } from "../api/client";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout, refreshUser }), [user, isLoading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
