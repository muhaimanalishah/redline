"use client";

import React, { useEffect, useRef } from "react";
import { DiffIssue } from "./types";
import styles from "./DiffToolbar.module.css";

interface DiffToolbarProps {
  issue: DiffIssue;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  onAccept: (issue: DiffIssue) => void;
  onReject: (issue: DiffIssue) => void;
  onClose: () => void;
}

export default function DiffToolbar({
  issue,
  anchorRect,
  containerRect,
  onAccept,
  onReject,
  onClose,
}: DiffToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Position relative to editor container
  const left = anchorRect.left - containerRect.left + anchorRect.width / 2;
  const top = anchorRect.top - containerRect.top;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={toolbarRef}
      className={styles.toolbar}
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={styles.label}>{issue.type}</span>
      <div className={styles.divider} />
      <button
        className={`${styles.button} ${styles.reject}`}
        title="Reject"
        onClick={() => onReject(issue)}
        aria-label="Reject suggestion"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <button
        className={`${styles.button} ${styles.accept}`}
        title="Accept"
        onClick={() => onAccept(issue)}
        aria-label="Accept suggestion"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
      <div className={styles.arrow} />
    </div>
  );
}
