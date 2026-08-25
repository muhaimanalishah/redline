"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { useClickOutside } from "@/modules/editor/hooks/useClickOutside";
import styles from "./ExportPopover.module.css";

interface ExportPopoverProps {
  defaultFilename?: string;
  anchorRect: DOMRect;
  onExport: (filename: string) => void;
  onClose: () => void;
}

export default function ExportPopover({
  defaultFilename = "document.md",
  anchorRect,
  onExport,
  onClose,
}: ExportPopoverProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapRef, onClose);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = filename.trim();
    if (trimmed) {
      onExport(trimmed);
      onClose();
    }
  };

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
      aria-label="Export document"
    >
      <form className={styles.popover} onSubmit={handleSubmit}>
        <span className={styles.label}>Export</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="document.md"
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={!filename.trim()}
          aria-label="Export Markdown"
        >
          <Download size={13} strokeWidth={2.5} />
          Export
        </button>
      </form>
    </div>,
    document.body
  );
}
