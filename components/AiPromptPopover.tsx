"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUp, LoaderCircle } from "lucide-react";
import styles from "./AiPromptPopover.module.css";

interface AiPromptPopoverProps {
  anchorRect: DOMRect;
  hasSelection: boolean;
  loading: boolean;
  onSubmit: (prompt: string) => void | Promise<void>;
  onClose: () => void;
}

export default function AiPromptPopover({
  anchorRect,
  hasSelection,
  loading,
  onSubmit,
  onClose,
}: AiPromptPopoverProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Ignore dismissal while a request is in flight — there's no way to
    // cancel it, so closing here would just orphan the pending response.
    if (loading) return;

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
  }, [onClose, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !loading) onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return createPortal(
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ left: `${anchorRect.left + anchorRect.width / 2}px`, top: `${anchorRect.top}px` }}
    >
      <form className={styles.popover} onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder={hasSelection ? "Tell AI what to do with the selection…" : "Ask AI to write something…"}
          value={value}
          disabled={loading}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="submit"
          className={styles.submit}
          aria-label={loading ? "Generating" : "Generate"}
          disabled={!value.trim() || loading}
        >
          {loading ? (
            <LoaderCircle size={14} strokeWidth={2.5} className={styles.spin} />
          ) : (
            <ArrowUp size={14} strokeWidth={2.5} />
          )}
        </button>
      </form>
    </div>,
    document.body
  );
}
