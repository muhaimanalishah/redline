"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { ThemeMode } from "@/modules/editor/components/TopControls";

const emptySubscribe = () => () => {};

export function useEditorTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const activeTheme: ThemeMode = isClient
    ? (resolvedTheme === "dark" || theme === "dark" ? "dark" : "light")
    : "light";

  const changeTheme = useCallback(
    (next: ThemeMode) => {
      setTheme(next);
    },
    [setTheme]
  );

  return { theme: activeTheme, changeTheme, mounted: isClient };
}
