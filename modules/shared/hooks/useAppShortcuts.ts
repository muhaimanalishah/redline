"use client";

import { useEffect } from "react";

export interface ShortcutHandlers {
  onToggleSidebar?: () => void;
  onOpenSearch?: () => void;
}

export function useAppShortcuts({ onToggleSidebar, onOpenSearch }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "\\" && onToggleSidebar) {
          e.preventDefault();
          onToggleSidebar();
        } else if (
          (e.key === "k" || e.key === "K" || e.key === "p" || e.key === "P") &&
          onOpenSearch
        ) {
          e.preventDefault();
          onOpenSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleSidebar, onOpenSearch]);
}
