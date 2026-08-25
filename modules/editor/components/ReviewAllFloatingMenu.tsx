"use client";

import { Check, X } from "lucide-react";
import styles from "./ReviewAllFloatingMenu.module.css";

interface ReviewAllFloatingMenuProps {
  issueCount: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

export default function ReviewAllFloatingMenu({
  issueCount,
  onAcceptAll,
  onRejectAll,
}: ReviewAllFloatingMenuProps) {
  if (issueCount <= 0) return null;

  return (
    <div className={styles.wrap} role="region" aria-label="Bulk revision review">
      <div className={styles.pill}>
        <span className={styles.countBadge}>{issueCount}</span>
        <span className={styles.label}>
          {issueCount === 1 ? "suggestion" : "suggestions"}
        </span>
        <div className={styles.divider} />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnReject}
            onClick={onRejectAll}
            title="Reject all suggestions"
            aria-label="Reject all suggestions"
          >
            <X size={15} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className={styles.btnAccept}
            onClick={onAcceptAll}
            title="Accept all suggestions"
            aria-label="Accept all suggestions"
          >
            <Check size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
