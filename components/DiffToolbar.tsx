"use client";

import React, { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { DiffIssue } from "@/types";
import styles from "./DiffToolbar.module.css";

interface DiffToolbarProps {
  issue: DiffIssue;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  onAccept: (issue: DiffIssue) => void;
  onReject: (issue: DiffIssue) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function DiffToolbar({
  issue,
  anchorRect,
  containerRect,
  onAccept,
  onReject,
  onClose,
  onMouseEnter,
  onMouseLeave,
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
      className={styles.toolbarWrap}
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.toolbar}>
        <span className={styles.label}>{issue.type}</span>
        <div className={styles.divider} />
        <button
          className={`${styles.button} ${styles.reject}`}
          title="Reject"
          onClick={() => onReject(issue)}
          aria-label="Reject suggestion"
        >
          <X size={14} strokeWidth={2.25} />
        </button>
        <button
          className={`${styles.button} ${styles.accept}`}
          title="Accept"
          onClick={() => onAccept(issue)}
          aria-label="Accept suggestion"
        >
          <Check size={14} strokeWidth={2.25} />
        </button>
        <div className={styles.arrow} />
      </div>
    </div>
  );
}
