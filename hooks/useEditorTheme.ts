import { useCallback, useEffect, useState } from "react";
import { ThemeMode } from "@/components/FloatingControls";

const THEME_KEY = "redline-theme";

export function useEditorTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (saved && ["light", "dark"].includes(saved)) {
        return saved;
      }
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    } catch {}
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const changeTheme = useCallback((next: ThemeMode) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }, []);

  return { theme, changeTheme };
}
