"use client";

import React, { useState } from "react";
import { Monitor, X } from "lucide-react";
import styles from "./MobileNotice.module.css";

const STORAGE_KEY = "redline-mobile-notice-dismissed";

export default function MobileNotice() {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (isDismissed) return null;

  return (
    <aside className={styles.notice} aria-label="Device recommendation">
      <div className={styles.content}>
        <Monitor size={15} className={styles.icon} />
        <span className={styles.text}>
          <strong>Best on Desktop:</strong> Redline is optimized for larger screens & keyboard diff reviews.
        </span>
      </div>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={handleDismiss}
        aria-label="Dismiss notice"
        title="Dismiss notice"
      >
        <X size={14} />
      </button>
    </aside>
  );
}
