import { RefObject, useEffect } from "react";

export interface UseClickOutsideOptions {
  enabled?: boolean;
  listenClick?: boolean;
  listenEscape?: boolean;
}

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: UseClickOutsideOptions | boolean = true
) {
  const opts = typeof options === "boolean" ? { enabled: options } : options;
  const { enabled = true, listenClick = true, listenEscape = true } = opts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (listenEscape && e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (listenClick && ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (listenEscape) {
      window.addEventListener("keydown", handleKeyDown);
    }
    if (listenClick) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      if (listenEscape) {
        window.removeEventListener("keydown", handleKeyDown);
      }
      if (listenClick) {
        window.removeEventListener("mousedown", handleClickOutside);
      }
    };
  }, [ref, onClose, enabled, listenClick, listenEscape]);
}
