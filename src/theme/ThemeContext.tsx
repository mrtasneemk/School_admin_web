import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  effectiveMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const STORAGE_KEY = "admin_theme_mode";

function getSystemMode(): "light" | "dark" {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: "light" | "dark") {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });

  const [effectiveMode, setEffectiveMode] = useState<"light" | "dark">(() => {
    return mode === "system" ? getSystemMode() : mode;
  });

  useEffect(() => {
    const next = mode === "system" ? getSystemMode() : mode;
    setEffectiveMode(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = getSystemMode();
      setEffectiveMode(next);
      applyTheme(next);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      effectiveMode,
      setMode: setModeState,
      toggle: () => setModeState((m) => (m === "dark" ? "light" : "dark"))
    }),
    [mode, effectiveMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

