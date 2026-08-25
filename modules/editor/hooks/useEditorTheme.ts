import { useCallback, useLayoutEffect, useState } from "react";
import { ThemeMode } from "@/modules/editor/components/TopControls";

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

  // Re-applies data-theme before paint. In production this is a no-op
  // matching what the inline script in layout.tsx already set; in dev,
  // React Strict Mode's remount clears attributes the script set outside
  // JSX, so this restores it before the browser paints.
  useLayoutEffect(() => {
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
