"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import styles from "./ZoomPopover.module.css";

interface ZoomPopoverProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomSet?: (value: number) => void;
  anchorRect: DOMRect;
  onClose: () => void;
}

const PRESETS = [80, 100, 120, 140];

export default function ZoomPopover({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomSet,
  anchorRect,
  onClose,
}: ZoomPopoverProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const rightOffset =
    typeof window !== "undefined"
      ? Math.max(16, window.innerWidth - anchorRect.right)
      : 16;

  return createPortal(
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ right: `${rightOffset}px`, top: `${anchorRect.bottom + 14}px` }}
      role="dialog"
      aria-modal="true"
      aria-label="Zoom controls"
    >
      <div className={styles.popover}>
        <div className={styles.header}>
          <span className={styles.label}>Zoom</span>
          <span className={styles.value}>{zoom}%</span>
        </div>

        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={onZoomOut}
            disabled={zoom <= 80}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={onZoomReset}
            title="Reset zoom to 100%"
            aria-label="Reset zoom"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={onZoomIn}
            disabled={zoom >= 160}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>

        {onZoomSet && (
          <div className={styles.presets}>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.presetBtn}
                data-active={zoom === preset}
                onClick={() => onZoomSet(preset)}
              >
                {preset}%
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
