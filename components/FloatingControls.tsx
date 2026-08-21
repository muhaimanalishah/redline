"use client";

import React from "react";
import { ZoomIn, ZoomOut, Sun, Moon, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import styles from "./FloatingControls.module.css";


export type ThemeMode = "light" | "dark" | "sepia";

interface FloatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  wordCount?: number;
  charCount?: number;
  onCopyMarkdown?: () => void;
}

export default function FloatingControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme,
  onThemeChange,
  wordCount = 0,
  charCount = 0,
  onCopyMarkdown,
}: FloatingControlsProps) {
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleNextTheme = () => {
    let nextTheme: ThemeMode = "light";
    let themeLabel = "Warm Editorial Light";

    if (theme === "light") {
      nextTheme = "dark";
      themeLabel = "Warm Charcoal Dark";
    } else if (theme === "dark") {
      nextTheme = "sepia";
      themeLabel = "Warm Amber Sepia";
    } else {
      nextTheme = "light";
      themeLabel = "Warm Editorial Light";
    }

    onThemeChange(nextTheme);
    toast.success(`Switched to ${themeLabel}`, {
      description: "Eye-friendly low glare palette active",
    });
  };

  const handleCopy = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown();
      toast.success("Markdown copied to clipboard", {
        description: `${wordCount} words (${charCount} characters)`,
      });
    }
  };

  const handleZoomInClick = () => {
    onZoomIn();
    const nextZoom = Math.min(zoom + 10, 160);
    toast.info(`Zoom: ${nextZoom}%`);
  };

  const handleZoomOutClick = () => {
    onZoomOut();
    const nextZoom = Math.max(zoom - 10, 80);
    toast.info(`Zoom: ${nextZoom}%`);
  };

  const handleZoomResetClick = () => {
    onZoomReset();
    toast.info("Zoom reset to 100%");
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon size={15} />;
      case "sepia":
        return <Sparkles size={15} />;
      case "light":
      default:
        return <Sun size={15} />;
    }
  };

  const getThemeTitle = () => {
    switch (theme) {
      case "dark":
        return "Theme: Charcoal Dark (Click for Sepia)";
      case "sepia":
        return "Theme: Amber Sepia (Click for Light)";
      case "light":
      default:
        return "Theme: Warm Light (Click for Dark)";
    }
  };

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      {wordCount > 0 && (
        <div className={styles.statsDock}>
          <span>{wordCount} words</span>
          <span className={styles.statsDot} />
          <span>{readingTime} min read</span>
        </div>
      )}

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
          title={getThemeTitle()}
          aria-label="Toggle eye-friendly theme"
        >
          {getThemeIcon()}
        </button>
      </div>
    </aside>
  );
}
