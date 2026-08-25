"use client";

import styles from "./MarkdownSourceView.module.css";

interface MarkdownSourceViewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownSourceView({ value, onChange, placeholder }: MarkdownSourceViewProps) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      autoFocus
    />
  );
}
