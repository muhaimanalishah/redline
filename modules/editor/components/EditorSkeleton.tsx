"use client";

import React from "react";
import { PanelLeft, PanelLeftClose, Sun, Moon } from "lucide-react";
import { useEditorTheme } from "@/modules/editor/hooks/useEditorTheme";
import styles from "./EditorSkeleton.module.css";

interface EditorSkeletonProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function EditorSkeleton({
  isSidebarOpen = true,
  onToggleSidebar = () => {},
}: EditorSkeletonProps) {
  const { theme, changeTheme } = useEditorTheme();

  return (
    <div className={styles.container} aria-label="Loading document content">
      {/* 1. TOP STRIP SKELETON */}
      <header className={styles.topStrip}>
        <div className={styles.leftZone}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Collapse Sidebar" : "Open Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
          <div className={styles.divider} />
          <div className={styles.skeletonPill} />
          <div className={styles.skeletonPill} />
        </div>

        <div className={styles.centerZone}>
          <div className={styles.skeletonPill} />
          <div className={styles.skeletonPill} />
          <div className={styles.divider} />
          <div className={styles.skeletonPill} />
          <div className={styles.skeletonPill} />
          <div className={styles.skeletonPill} />
        </div>

        <div className={styles.rightZone}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* 2. CANVAS VIEWPORT SKELETON */}
      <div className={styles.canvasViewport}>
        <div className={styles.editorWrapper}>
          {/* Title skeleton */}
          <div className={styles.skeletonTitle} />

          {/* Paragraph 1 */}
          <div className={styles.skeletonParagraph}>
            <div className={styles.skeletonLine} style={{ width: "94%" }} />
            <div className={styles.skeletonLine} style={{ width: "88%" }} />
            <div className={styles.skeletonLine} style={{ width: "62%" }} />
          </div>

          {/* Paragraph 2 */}
          <div className={styles.skeletonParagraph}>
            <div className={styles.skeletonLine} style={{ width: "96%" }} />
            <div className={styles.skeletonLine} style={{ width: "91%" }} />
            <div className={styles.skeletonLine} style={{ width: "85%" }} />
            <div className={styles.skeletonLine} style={{ width: "44%" }} />
          </div>

          {/* Paragraph 3 */}
          <div className={styles.skeletonParagraph}>
            <div className={styles.skeletonLine} style={{ width: "90%" }} />
            <div className={styles.skeletonLine} style={{ width: "76%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
