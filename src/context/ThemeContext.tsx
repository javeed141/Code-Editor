"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isThemeId, vscodeThemes, type ThemeId } from "@/src/lib/vscodeThemes";

export type Theme = ThemeId;

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "ai-code-editor-theme";

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && isThemeId(stored)) {
        return stored;
      }
      // Keep preferences created by the previous two-theme selector.
      if (stored === "dark") return "darkModern";
      if (stored === "light") return "lightModern";
      if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "lightModern";
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  return "darkModern";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const definition = vscodeThemes[theme];
    if (definition.isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    root.dataset.vscodeTheme = theme;
    Object.entries(definition.workspace).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage errors
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (vscodeThemes[prev].isDark ? "lightModern" : "darkModern"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
