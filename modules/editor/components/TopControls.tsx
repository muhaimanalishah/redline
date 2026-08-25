"use client";

import React, { useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  ZoomIn,
  Sun,
  Moon,
  Copy,
  Undo2,
  Redo2,
  Code2,
  Pilcrow,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import ZoomPopover from "./ZoomPopover";
import ExportPopover from "./ExportPopover";
import styles from "./TopControls.module.css";

export type ThemeMode = "light" | "dark";

interface TopControlsProps {
  editor: Editor;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomSet?: (zoom: number) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCopyMarkdown?: () => void;
  onExportMarkdown?: (filename: string) => void;
  onImportMarkdown?: (content: string) => void;
  sourceMode: boolean;
  onToggleSourceMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function TopControls({
  editor,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomSet,
  theme,
  onThemeChange,
  onCopyMarkdown,
  onExportMarkdown,
  onImportMarkdown,
  sourceMode,
  onToggleSourceMode,
  canUndo,
  canRedo,
}: TopControlsProps) {
  const [zoomAnchorRect, setZoomAnchorRect] = useState<DOMRect | null>(null);
  const [exportAnchorRect, setExportAnchorRect] = useState<DOMRect | null>(null);
  const zoomBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleZoomPopover = () => {
    setExportAnchorRect(null);
    setZoomAnchorRect((prev) => (prev ? null : zoomBtnRef.current?.getBoundingClientRect() ?? null));
  };

  const toggleExportPopover = () => {
    setZoomAnchorRect(null);
    setExportAnchorRect((prev) =>
      prev ? null : exportBtnRef.current?.getBoundingClientRect() ?? null
    );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        onImportMarkdown?.(text);
        toast.success(`Imported ${file.name}`);
      } catch {
        toast.error("Failed to read file");
      } finally {
        e.target.value = "";
      }
    },
    [onImportMarkdown]
  );

  const handleExport = useCallback(
    (filename: string) => {
      onExportMarkdown?.(filename);
      toast.success(`Exported ${filename}`);
    },
    [onExportMarkdown]
  );

  return (
    <aside aria-label="Document controls" className={styles.dockContainer}>
      <div className={styles.dock}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={sourceMode || !canUndo}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          className={styles.btn}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={sourceMode || !canRedo}
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

        {onImportMarkdown && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className={styles.btn}
              onClick={handleImportClick}
              title="Import Markdown file"
              aria-label="Import Markdown"
            >
              <Upload size={16} />
            </button>
          </>
        )}

        {onExportMarkdown && (
          <button
            ref={exportBtnRef}
            type="button"
            className={styles.btn}
            data-active={!!exportAnchorRect}
            onClick={toggleExportPopover}
            title="Export as Markdown file"
            aria-label="Export Markdown"
          >
            <Download size={16} />
          </button>
        )}

        <div className={styles.divider} />

        <button
          ref={zoomBtnRef}
          type="button"
          className={styles.btn}
          data-active={!!zoomAnchorRect}
          onClick={toggleZoomPopover}
          title={`Zoom (${zoom}%)`}
          aria-label="Zoom controls"
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

      {zoomAnchorRect && (
        <ZoomPopover
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          onZoomSet={onZoomSet}
          anchorRect={zoomAnchorRect}
          onClose={() => setZoomAnchorRect(null)}
        />
      )}

      {exportAnchorRect && (
        <ExportPopover
          anchorRect={exportAnchorRect}
          onExport={handleExport}
          onClose={() => setExportAnchorRect(null)}
        />
      )}
    </aside>
  );
}
