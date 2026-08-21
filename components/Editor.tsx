"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { DiffExtension, DiffPluginKey } from "./DiffExtension";
import DiffToolbar from "./DiffToolbar";
import { DiffIssue, ActiveDiffState } from "./types";
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
  const [issueCount, setIssueCount] = useState<number>(issues.length);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
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
      onChange?.(storage.markdown?.getMarkdown?.() ?? "");

      const pluginState = DiffPluginKey.getState(ed.state);
      const remainingCount = pluginState?.issues.size ?? 0;
      setIssueCount(remainingCount);
      if (onIssuesChange && pluginState) {
        onIssuesChange(Array.from(pluginState.issues.values()));
      }
    },
  });

  // Sync issues when external issues prop updates
  useEffect(() => {
    if (editor && issues) {
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_DIFF_ISSUES",
          issues,
        })
      );
      setIssueCount(issues.length);
    }
  }, [editor, issues]);

  // Handle clicking inline diff marks
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const diffEl = target.closest("[data-diff-id]") as HTMLElement | null;

      if (diffEl && editor) {
        const diffId = diffEl.getAttribute("data-diff-id");
        if (!diffId) return;

        const pluginState = DiffPluginKey.getState(editor.state);
        const issue = pluginState?.issues.get(diffId);

        if (issue) {
          document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
          diffEl.classList.add("diff-active");

          const rect = diffEl.getBoundingClientRect();
          setActiveDiff({
            issue,
            anchorRect: rect,
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
    },
    [editor]
  );

  // Accept all suggestions
  const handleAcceptAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    if (!pluginState || pluginState.issues.size === 0) return;

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
  }, [editor]);

  // Reject all suggestions
  const handleRejectAll = useCallback(() => {
    if (!editor) return;

    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, {
        type: "CLEAR_ALL_DIFFS",
      })
    );

    document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
    setActiveDiff(null);
    setIssueCount(0);
  }, [editor]);

  if (!editor) return null;

  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div ref={containerRef} className={styles.container} onClick={handleContainerClick}>
      <div className={styles.editorWrapper}>
        {/* Sticky Review Bar - displayed when suggestions exist */}
        {issueCount > 0 && (
          <div className={styles.reviewBar}>
            <div className={styles.count}>
              <span className={styles.dot} />
              {issueCount} suggestion{issueCount === 1 ? "" : "s"}
            </div>
            <div className={styles.actions}>
              <button
                className={styles.pillBtn}
                onClick={handleRejectAll}
              >
                Reject all
              </button>
              <button
                className={`${styles.pillBtn} ${styles.pillBtnPrimary}`}
                onClick={handleAcceptAll}
              >
                Accept all
              </button>
            </div>
          </div>
        )}

        {/* Editor Content Area */}
        <EditorContent editor={editor} className={styles.editorContent} />
      </div>

      {/* Floating Notion-style Micro-Toolbar */}
      {activeDiff && containerRect && (
        <DiffToolbar
          issue={activeDiff.issue}
          anchorRect={activeDiff.anchorRect}
          containerRect={containerRect}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => {
            document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
            setActiveDiff(null);
          }}
        />
      )}
    </div>
  );
}



