"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import styles from "./UrlPopover.module.css";

interface UrlPopoverProps {
  label: string;
  placeholder: string;
  anchorRect: DOMRect;
  onSubmit: (url: string) => void;
  onClose: () => void;
}

export default function UrlPopover({ label, placeholder, anchorRect, onSubmit, onClose }: UrlPopoverProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return createPortal(
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ left: `${anchorRect.left + anchorRect.width / 2}px`, top: `${anchorRect.top}px` }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <form className={styles.popover} onSubmit={handleSubmit}>
        <span className={styles.label}>{label}</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className={styles.submit} aria-label="Insert" disabled={!value.trim()}>
          <ArrowRight size={14} strokeWidth={2.25} />
        </button>
      </form>
    </div>,
    document.body
  );
}
