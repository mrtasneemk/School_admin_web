import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken } from "./tokenStorage";
import { parseJwt } from "./jwt";

type AuthContextValue = {
  token: string | null;
  role: string | null;
  username: string | null;
  userId: number | null;
  admNo: number | null;
  loginWithToken: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());

  const jwtUser = parseJwt(token);
  const tokenIsUsable = Boolean(token && jwtUser.username && jwtUser.role);

  useEffect(() => {
    if (!token) return;
    if (tokenIsUsable) return;
    clearToken();
    setTokenState(null);
  }, [token, tokenIsUsable]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: tokenIsUsable ? token : null,
      role: tokenIsUsable ? (jwtUser.role ?? null) : null,
      username: tokenIsUsable ? (jwtUser.username ?? null) : null,
      userId: tokenIsUsable ? (jwtUser.userId ?? null) : null,
      admNo: tokenIsUsable ? (jwtUser.admNo ?? null) : null,
      loginWithToken: (newToken) => {
        setToken(newToken);
        setTokenState(newToken);
      },
      logout: () => {
        clearToken();
        setTokenState(null);
      }
    }),
    [token, tokenIsUsable, jwtUser.role, jwtUser.username, jwtUser.userId, jwtUser.admNo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
