"use client";

import React, { useEffect, useRef } from "react";
import { Issue } from "@/lib/types";
import styles from "./IssuePopover.module.css";

interface IssuePopoverProps {
  issue: Issue;
  anchorRect: DOMRect;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function IssuePopover({
  issue,
  anchorRect,
  onAccept,
  onReject,
  onClose,
}: IssuePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-issue-id]")) {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Compute position relative to viewport
  const popoverWidth = 340;
  const margin = 16;

  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - popoverWidth - margin));

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const isAbove = spaceBelow < 240 && anchorRect.top > 240;

  const top = isAbove ? anchorRect.top - 10 : anchorRect.bottom + 10;

  // Compute pin position relative to popover card
  let pinLeft = anchorRect.left + anchorRect.width / 2 - left - 5;
  pinLeft = Math.max(14, Math.min(pinLeft, popoverWidth - 24));

  return (
    <div
      ref={popoverRef}
      className={styles.popCard}
      style={{
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
        transform: isAbove ? "translateY(-100%)" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`${styles.pin} ${isAbove ? styles.pinBottom : styles.pinTop}`}
        style={{ left: `${pinLeft}px` }}
      />

      <div className={styles.cardHead}>
        <span className={`${styles.typeTab} ${styles[issue.type]}`}>
          {issue.type}
        </span>
        <span className={styles.issueLabel}>{issue.issue}</span>
      </div>

      <div className={styles.explain}>{issue.explanation}</div>

      <div className={styles.diff}>
        <div className={styles.diffRow}>
          <span className={styles.diffSym}>−</span>
          <span className={styles.diffOld}>{issue.original}</span>
        </div>
        <div className={styles.diffRow}>
          <span className={styles.diffSym}>+</span>
          <span className={styles.diffNew}>{issue.suggestion}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnAccept}`}
          onClick={onAccept}
        >
          Accept
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnReject}`}
          onClick={onReject}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
