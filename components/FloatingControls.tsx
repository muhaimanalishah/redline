"use client";

import React from "react";
import { ZoomIn, ZoomOut, Sun, Moon, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import styles from "./FloatingControls.module.css";


export type ThemeMode = "light" | "dark";

interface FloatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCopyMarkdown?: () => void;
}

export default function FloatingControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme,
  onThemeChange,
  onCopyMarkdown,
}: FloatingControlsProps) {
  const handleNextTheme = () => {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    onThemeChange(nextTheme);
  };

  const handleCopy = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown();
      toast.success("Copied to clipboard");
    }
  };

  const handleZoomInClick = () => {
    onZoomIn();
  };

  const handleZoomOutClick = () => {
    onZoomOut();
  };

  const handleZoomResetClick = () => {
    onZoomReset();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon size={15} />;
      case "light":
      default:
        return <Sun size={15} />;
    }
  };

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      <div className={styles.floatingDock}>
        {onCopyMarkdown && (
          <>
            <button
              type="button"
              className={styles.btn}
              onClick={handleCopy}
              title="Copy Markdown to clipboard"
              aria-label="Copy Markdown"
            >
              <Copy size={14} />
            </button>
            <div className={styles.divider} />
          </>
        )}

        <button
          type="button"
          className={styles.btn}
          onClick={handleZoomOutClick}
          disabled={zoom <= 80}
          title="Zoom out (Decrease size)"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>

        <button
          type="button"
          className={styles.zoomLabel}
          onClick={handleZoomResetClick}
          title="Click to reset zoom to 100%"
          aria-label="Reset zoom"
        >
          {zoom}%
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={handleZoomInClick}
          disabled={zoom >= 160}
          title="Zoom in (Increase size)"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.btn}
          onClick={handleNextTheme}
          aria-label="Toggle eye-friendly theme"
        >
          {getThemeIcon()}
        </button>
      </div>
    </aside>
  );
}
