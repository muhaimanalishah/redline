"use client";

import { Editor } from "@tiptap/react";
import { ZoomIn, ZoomOut, Sun, Moon, Copy, Undo2, Redo2, Code2, Pilcrow } from "lucide-react";
import { toast } from "sonner";
import styles from "./TopControls.module.css";

export type ThemeMode = "light" | "dark";

interface TopControlsProps {
  editor: Editor;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCopyMarkdown?: () => void;
  sourceMode: boolean;
  onToggleSourceMode: () => void;
}

export default function TopControls({
  editor,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  theme,
  onThemeChange,
  onCopyMarkdown,
  sourceMode,
  onToggleSourceMode,
}: TopControlsProps) {
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

  return (
    <aside aria-label="Document controls" className={styles.dockContainer}>
      <div className={styles.dock}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={sourceMode || !editor.can().undo()}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={sourceMode || !editor.can().redo()}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.btn}
          data-active={sourceMode}
          onClick={onToggleSourceMode}
          title={sourceMode ? "Switch to rich text view" : "Switch to Markdown source view"}
          aria-label="Toggle Markdown source view"
        >
          {sourceMode ? <Pilcrow size={16} /> : <Code2 size={16} />}
        </button>

        {onCopyMarkdown && (
          <button
            type="button"
            className={styles.btn}
            onClick={handleCopy}
            title="Copy Markdown to clipboard"
            aria-label="Copy Markdown"
          >
            <Copy size={16} />
          </button>
        )}

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.btn}
          onClick={onZoomOut}
          disabled={zoom <= 80}
          title="Zoom out (Decrease size)"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>

        <button
          type="button"
          className={styles.zoomLabel}
          onClick={onZoomReset}
          title="Click to reset zoom to 100%"
          aria-label="Reset zoom"
        >
          {zoom}%
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={onZoomIn}
          disabled={zoom >= 160}
          title="Zoom in (Increase size)"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.btn}
          onClick={handleNextTheme}
          title={`Toggle theme ${theme === "light" ? "dark" : "light"}`}
          aria-label="Toggle eye-friendly theme"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </aside>
  );
}
