"use client";

import React, { useState } from "react";
import { Monitor, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import styles from "./MobileNotice.module.css";

const MODAL_STORAGE_KEY = "redline-mobile-modal-dismissed";

export default function MobileNotice() {
  const [isModalDismissed, setIsModalDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(MODAL_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.origin);
        setCopied(true);
        toast.success("Link copied! Open on your desktop for the best experience.");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleDismissModal = () => {
    setIsModalDismissed(true);
    try {
      sessionStorage.setItem(MODAL_STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* 1. ALWAYS-PRESENT TOP BANNER (Mobile Viewports Only) */}
      <aside className={styles.alwaysBanner} aria-label="Desktop recommendation">
        <div className={styles.bannerLeft}>
          <Monitor size={14} className={styles.bannerIcon} />
          <span className={styles.bannerText}>
            <strong>Desktop Recommended:</strong> Best on a larger screen.
          </span>
        </div>
        <button
          type="button"
          className={styles.copyLinkBtn}
          onClick={handleCopyLink}
          title="Copy link to open on desktop"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy Link"}</span>
        </button>
      </aside>

      {/* 2. FULL-PAGE MODAL ON INITIAL MOBILE VISIT */}
      {!isModalDismissed && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.iconCircle}>
              <Monitor size={28} />
            </div>

            <span className={styles.modalBadge}>Desktop Experience</span>
            <h2 className={styles.modalTitle}>Designed for Desktop</h2>
            <p className={styles.modalDescription}>
              Redline is built for keyboard workflows, voice waveforms, and interactive inline AI diff reviews on larger screens.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.continueBtn}
                onClick={handleDismissModal}
              >
                Continue to Mobile Preview
              </button>
              <button
                type="button"
                className={styles.copyDesktopBtn}
                onClick={handleCopyLink}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Link Copied to Clipboard" : "Copy Link for Desktop"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
