"use client";

import { ZoomIn, ZoomOut, Sun, Moon, Copy, SpellCheck, Check, X } from "lucide-react";
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
  onProofread?: () => void;
  proofreadDisabled?: boolean;
  issueCount?: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

export default function FloatingControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme,
  onThemeChange,
  onCopyMarkdown,
  onProofread,
  proofreadDisabled = false,
  issueCount = 0,
  onAcceptAll,
  onRejectAll,
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
        return <Moon size={17} />;
      case "light":
      default:
        return <Sun size={17} />;
    }
  };

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      <div className={styles.floatingDock}>
        {onProofread && (
          <>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnProofread}`}
              onClick={onProofread}
              disabled={proofreadDisabled}
              title={proofreadDisabled ? "Select text to proofread" : "Proofread selected text"}
              aria-label="Proofread selected text"
            >
              <SpellCheck size={17} /> Proofread
            </button>

            <div
              className={styles.reviewActions}
              data-open={issueCount > 0}
            >
              <span className={styles.reviewCount}>{issueCount}</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnReject}`}
                onClick={onRejectAll}
                title="Reject all suggestions"
                aria-label="Reject all suggestions"
              >
                <X size={17} />
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccept}`}
                onClick={onAcceptAll}
                title="Accept all suggestions"
                aria-label="Accept all suggestions"
              >
                <Check size={17} />
              </button>
            </div>

            <div className={styles.divider} />
          </>
        )}

        {onCopyMarkdown && (
          <>
            <button
              type="button"
              className={styles.btn}
              onClick={handleCopy}
              title="Copy Markdown to clipboard"
              aria-label="Copy Markdown"
            >
              <Copy size={17} />
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
          <ZoomOut size={17} />
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
          <ZoomIn size={17} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.btn}
          onClick={handleNextTheme}
          title={`Toggle theme ${theme === "light" ? "dark" : "light"}`}
          aria-label="Toggle eye-friendly theme"
        >
          {getThemeIcon()}
        </button>
      </div>
    </aside>
  );
}
