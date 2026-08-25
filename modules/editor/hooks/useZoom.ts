import { useCallback, useState } from "react";
import { safeStorage } from "@/modules/editor/lib/storage";

const ZOOM_KEY = "redline-zoom";
const MIN_ZOOM = 80;
const MAX_ZOOM = 160;

export function useZoom() {
  const [zoom, setZoom] = useState<number>(() =>
    safeStorage.getNumber(ZOOM_KEY, 100, MIN_ZOOM, MAX_ZOOM)
  );

  const persist = (value: number) => {
    safeStorage.set(ZOOM_KEY, value);
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

  const zoomSet = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
    setZoom(clamped);
    persist(clamped);
  }, []);

  return { zoom, zoomIn, zoomOut, zoomReset, zoomSet };
}

