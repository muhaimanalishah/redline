"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import styles from "./TitleInput.module.css";

export interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  onArrowDown?: () => void;
  disabled?: boolean;
}

export interface TitleInputRef {
  focus: () => void;
  textarea: HTMLTextAreaElement | null;
}

export const TitleInput = forwardRef<TitleInputRef, TitleInputProps>(function TitleInput(
  {
    value,
    onChange,
    placeholder = "New page",
    onEnter,
    onArrowDown,
    disabled = false,
  },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    },
    textarea: textareaRef.current,
  }));

  // Auto-resize textarea height immediately before paint
  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    } else if (e.key === "ArrowDown") {
      const el = textareaRef.current;
      if (el && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
        onArrowDown?.();
      }
    }
  };

  return (
    <div className={styles.titleContainer}>
      <textarea
        ref={textareaRef}
        rows={1}
        className={styles.titleTextarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
});

export default TitleInput;
