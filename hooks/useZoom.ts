import { useCallback, useState } from "react";

const ZOOM_KEY = "redline-zoom";
const MIN_ZOOM = 80;
const MAX_ZOOM = 160;

export function useZoom() {
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === "undefined") return 100;
    try {
      const saved = localStorage.getItem(ZOOM_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    } catch {}
    return 100;
  });

  const persist = (value: number) => {
    try {
      localStorage.setItem(ZOOM_KEY, String(value));
    } catch {}
  };

  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = Math.min(prev + 10, MAX_ZOOM);
      persist(next);
      return next;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(prev - 10, MIN_ZOOM);
      persist(next);
      return next;
    });
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(100);
    persist(100);
  }, []);

  return { zoom, zoomIn, zoomOut, zoomReset };
}
