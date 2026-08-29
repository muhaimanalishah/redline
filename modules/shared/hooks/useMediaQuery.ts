"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(max-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(max-width: 768px)").matches,
    () => false
  );
}
