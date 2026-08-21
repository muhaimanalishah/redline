"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { DiffExtension, DiffPluginKey } from "./DiffExtension";
import DiffToolbar from "./DiffToolbar";
import FloatingControls, { ThemeMode } from "./FloatingControls";
import { DiffIssue, ActiveDiffState } from "./types";
import { toast } from "sonner";
import styles from "./Editor.module.css";

export interface EditorProps {
  initialContent?: string;
  issues?: DiffIssue[];
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onIssuesChange?: (issues: DiffIssue[]) => void;
}

export default function Editor({
  initialContent = "",
  issues = [],
  placeholder = "Start writing...",
  onChange,
  onIssuesChange,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDiff, setActiveDiff] = useState<ActiveDiffState | null>(null);
  const [issueCount, setIssueCount] = useState<number>(() => issues.length);
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedZoom = localStorage.getItem("redline-zoom");
        if (savedZoom) {
          const parsed = parseInt(savedZoom, 10);
          if (!isNaN(parsed) && parsed >= 80 && parsed <= 160) {
            return parsed;
          }
        }
      } catch {}
    }
    return 100;
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTheme = localStorage.getItem("redline-theme") as ThemeMode | null;
        if (savedTheme && ["light", "dark"].includes(savedTheme)) {
          return savedTheme;
        }
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          return "dark";
        }
      } catch {}
    }
    return "light";
  });

  // Sync data-theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);



  const handleThemeChange = useCallback((newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      localStorage.setItem("redline-theme", newTheme);
    } catch {}
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = Math.min(prev + 10, 160);
      try {
        localStorage.setItem("redline-zoom", String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(prev - 10, 80);
      try {
        localStorage.setItem("redline-zoom", String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(100);
    try {
      localStorage.setItem("redline-zoom", "100");
    } catch {}
  }, []);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: {
          HTMLAttributes: {
            class: "editor-code-block",
          },
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Underline,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      DiffExtension,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
        class: "focus:outline-none",
      },
    },
    onCreate: ({ editor: ed }) => {
      if (issues.length > 0) {
        ed.view.dispatch(
          ed.state.tr.setMeta(DiffPluginKey, {
            type: "SET_DIFF_ISSUES",
            issues,
          })
        );
      }
    },
    onUpdate: ({ editor: ed }) => {
      const storage = ed.storage as unknown as Record<string, MarkdownStorage>;
      const markdown = storage.markdown?.getMarkdown?.() ?? "";
      onChange?.(markdown);

      const pluginState = DiffPluginKey.getState(ed.state);
      const remainingCount = pluginState?.issues.size ?? 0;
      setIssueCount(remainingCount);
      if (onIssuesChange && pluginState) {
        onIssuesChange(Array.from(pluginState.issues.values()));
      }
    },
  });

  // Sync issues to editor plugin when external issues prop updates
  useEffect(() => {
    if (editor && issues) {
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_DIFF_ISSUES",
          issues,
        })
      );
    }
  }, [editor, issues]);

  // Handle clicking inline diff marks
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const diffEl = target.closest("[data-diff-id]") as HTMLElement | null;

      if (diffEl && editor && containerRef.current) {
        const diffId = diffEl.getAttribute("data-diff-id");
        if (!diffId) return;

        const pluginState = DiffPluginKey.getState(editor.state);
        const issue = pluginState?.issues.get(diffId);

        if (issue) {
          document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
          diffEl.classList.add("diff-active");

          const rect = diffEl.getBoundingClientRect();
          const contRect = containerRef.current.getBoundingClientRect();
          setActiveDiff({
            issue,
            anchorRect: rect,
            containerRect: contRect,
          });
          return;
        }
      }

      // Close toolbar if clicking outside diff marks
      if (activeDiff && !target.closest("[data-diff-id]")) {
        document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
        setActiveDiff(null);
      }
    },
    [editor, activeDiff]
  );

  // Accept a single suggestion
  const handleAccept = useCallback(
    (issue: DiffIssue) => {
      if (!editor) return;

      const { doc } = editor.state;
      let targetFrom = -1;
      let targetTo = -1;

      doc.descendants((node, pos) => {
        if (targetFrom !== -1) return false;
        if (node.isText && node.text) {
          const idx = node.text.indexOf(issue.original);
          if (idx !== -1) {
            targetFrom = pos + idx;
            targetTo = targetFrom + issue.original.length;
            return false;
          }
        }
      });

      if (targetFrom !== -1 && targetTo !== -1) {
        editor
          .chain()
          .focus()
          .insertContentAt({ from: targetFrom, to: targetTo }, issue.suggestion)
          .command(({ tr }) => {
            tr.setMeta(DiffPluginKey, {
              type: "REMOVE_DIFF",
              issueId: issue.id,
            });
            return true;
          })
          .run();
      } else {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "REMOVE_DIFF",
            issueId: issue.id,
          })
        );
      }

      document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
      setActiveDiff(null);

      const pluginState = DiffPluginKey.getState(editor.state);
      const newCount = Math.max(0, (pluginState?.issues.size ?? 1) - 1);
      setIssueCount(newCount);
      toast.success("Applied suggestion", {
        description: `"${issue.original}" → "${issue.suggestion}"`,
      });
    },
    [editor]
  );

  // Reject a single suggestion
  const handleReject = useCallback(
    (issue: DiffIssue) => {
      if (!editor) return;

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "REMOVE_DIFF",
          issueId: issue.id,
        })
      );

      document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
      setActiveDiff(null);

      const pluginState = DiffPluginKey.getState(editor.state);
      const newCount = Math.max(0, (pluginState?.issues.size ?? 1) - 1);
      setIssueCount(newCount);
      toast.info("Dismissed suggestion", {
        description: `Kept "${issue.original}"`,
      });
    },
    [editor]
  );

  // Accept all suggestions
  const handleAcceptAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    if (!pluginState || pluginState.issues.size === 0) return;

    const count = pluginState.issues.size;
    const currentIssues = Array.from(pluginState.issues.values());
    const { doc } = editor.state;

    const replacements: { from: number; to: number; text: string }[] = [];

    currentIssues.forEach((issue) => {
      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const idx = node.text.indexOf(issue.original);
          if (idx !== -1) {
            const from = pos + idx;
            const to = from + issue.original.length;
            replacements.push({ from, to, text: issue.suggestion });
          }
        }
      });
    });

    replacements.sort((a, b) => b.from - a.from);

    let tr = editor.state.tr;
    replacements.forEach(({ from, to, text }) => {
      tr = tr.replaceWith(from, to, editor.schema.text(text));
    });

    tr = tr.setMeta(DiffPluginKey, { type: "CLEAR_ALL_DIFFS" });
    editor.view.dispatch(tr);

    document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
    setActiveDiff(null);
    setIssueCount(0);
    toast.success(`Accepted all ${count} suggestions`);
  }, [editor]);

  // Reject all suggestions
  const handleRejectAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    const count = pluginState?.issues.size ?? 0;

    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, {
        type: "CLEAR_ALL_DIFFS",
      })
    );

    document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
    setActiveDiff(null);
    setIssueCount(0);
    toast.info(`Rejected all ${count} suggestions`);
  }, [editor]);

  const handleCopyMarkdown = useCallback(() => {
    if (!editor) return;
    const storage = editor.storage as unknown as Record<string, MarkdownStorage>;
    const markdown = storage.markdown?.getMarkdown?.() ?? "";
    navigator.clipboard.writeText(markdown);
  }, [editor]);

  if (!editor) return null;

  const zoomScale = zoom / 100;
  const maxWidthPx = Math.min(960, Math.round(720 * Math.max(1, zoomScale * 0.95)));

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onClick={handleContainerClick}
      style={{
        ["--editor-zoom" as string]: zoomScale,
      }}
    >
      <div
        className={styles.editorWrapper}
        style={{
          maxWidth: `${maxWidthPx}px`,
        }}
      >
        {/* Sticky Review Bar - displayed when suggestions exist */}
        {issueCount > 0 && (
          <div className={styles.reviewBar}>
            <div className={styles.count}>
              <span className={styles.dot} />
              {issueCount} suggestion{issueCount === 1 ? "" : "s"}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.pillBtn}
                onClick={handleRejectAll}
              >
                Reject all
              </button>
              <button
                type="button"
                className={`${styles.pillBtn} ${styles.pillBtnPrimary}`}
                onClick={handleAcceptAll}
              >
                Accept all
              </button>
            </div>
          </div>
        )}

        {/* Editor Content Area (Zero selection popover) */}
        <EditorContent editor={editor} className={styles.editorContent} />
      </div>

      {/* Floating Notion-style Micro-Toolbar for clicked redline issues */}
      {activeDiff && (
        <DiffToolbar
          issue={activeDiff.issue}
          anchorRect={activeDiff.anchorRect}
          containerRect={activeDiff.containerRect}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => {
            document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
            setActiveDiff(null);
          }}
        />
      )}

      {/* Floating Controls in Bottom Right */}
      <FloatingControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        theme={theme}
        onThemeChange={handleThemeChange}
        onCopyMarkdown={handleCopyMarkdown}
      />
    </div>
  );
}





