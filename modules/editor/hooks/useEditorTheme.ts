import { useCallback, useLayoutEffect, useState } from "react";
import { ThemeMode } from "@/modules/editor/components/TopControls";
import { safeStorage } from "@/modules/editor/lib/storage";

const THEME_KEY = "redline-theme";

export function useEditorTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = safeStorage.get<ThemeMode | "">(THEME_KEY, "");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
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
    safeStorage.set(THEME_KEY, next);
  }, []);

  return { theme, changeTheme };
}

