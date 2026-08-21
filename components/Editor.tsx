"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { EditorState } from "@tiptap/pm/state";
import { RedlineExtension, RedlinePluginKey } from "./RedlineExtension";
import IssuePopover from "./IssuePopover";
import { checkParagraph } from "@/lib/checkParagraph";
import { Issue } from "@/lib/types";
import styles from "./Editor.module.css";

interface EditorProps {
  onChange?: (markdown: string) => void;
}

interface ActivePopoverState {
  issue: Issue;
  anchorRect: DOMRect;
}

interface ParagraphInfo {
  pos: number;
  text: string;
  isDirty: boolean;
}

function getActiveParagraph(state: EditorState): { pos: number; text: string } | null {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "paragraph" || node.isTextblock) {
      return {
        pos: $from.before(d),
        text: node.textContent,
      };
    }
  }
  return null;
}

export default function Editor({ onChange }: EditorProps) {
  const [activePopover, setActivePopover] = useState<ActivePopoverState | null>(null);

  const activeParagraphRef = useRef<ParagraphInfo | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger check for a specific paragraph
  const performParagraphCheck = useCallback(
    async (paragraphPos: number, text: string, currentEditor: ReturnType<typeof useEditor>) => {
      if (!currentEditor || currentEditor.isDestroyed || !text || text.trim().length === 0) {
        return;
      }

      try {
        const issues = await checkParagraph(text);
        if (!currentEditor || currentEditor.isDestroyed) return;

        currentEditor.view.dispatch(
          currentEditor.state.tr.setMeta(RedlinePluginKey, {
            type: "SET_PARAGRAPH_ISSUES",
            paragraphPos,
            paragraphText: text,
            issues,
          })
        );
      } catch (err) {
        console.error("Error during checkParagraph:", err);
      }
    },
    []
  );

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      RedlineExtension,
    ],
    content: "Start writing here.",
    onUpdate: ({ editor: ed }) => {
      // 1. Expose current content as markdown
      const storage = ed.storage as unknown as Record<string, MarkdownStorage>;
      onChange?.(storage.markdown?.getMarkdown?.() ?? "");

      // 2. Paragraph-level pause detection (1.2s timer)
      const current = getActiveParagraph(ed.state);
      if (current) {
        activeParagraphRef.current = {
          pos: current.pos,
          text: current.text,
          isDirty: true,
        };

        if (pauseTimerRef.current) {
          clearTimeout(pauseTimerRef.current);
        }

        pauseTimerRef.current = setTimeout(() => {
          if (activeParagraphRef.current) {
            activeParagraphRef.current.isDirty = false;
          }
          performParagraphCheck(current.pos, current.text, ed);
        }, 1200);
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const current = getActiveParagraph(ed.state);
      const prev = activeParagraphRef.current;

      if (current && prev && prev.pos !== current.pos) {
        // Cursor moved to a different paragraph
        if (prev.isDirty) {
          if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
          }
          // Immediately check the paragraph that was just left
          performParagraphCheck(prev.pos, prev.text, ed);
          prev.isDirty = false;
        }

        activeParagraphRef.current = {
          pos: current.pos,
          text: current.text,
          isDirty: false,
        };
      } else if (current && !prev) {
        activeParagraphRef.current = {
          pos: current.pos,
          text: current.text,
          isDirty: false,
        };
      }
    },
  });

  // Handle clicking on issue underlines in the editor
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const issueEl = target.closest("[data-issue-id]") as HTMLElement | null;

      if (issueEl && editor) {
        const issueId = issueEl.getAttribute("data-issue-id");
        if (!issueId) return;

        const pluginState = RedlinePluginKey.getState(editor.state);
        const issue = pluginState?.issues.get(issueId);

        if (issue) {
          const rect = issueEl.getBoundingClientRect();
          setActivePopover({
            issue,
            anchorRect: rect,
          });
          return;
        }
      }

      // If clicked inside editor but not on an issue mark, close popover
      if (activePopover && !target.closest("[data-issue-id]")) {
        setActivePopover(null);
      }
    },
    [editor, activePopover]
  );

  // Accept issue suggestion
  const handleAccept = useCallback(() => {
    if (!editor || !activePopover) return;

    const { issue } = activePopover;
    const pluginState = RedlinePluginKey.getState(editor.state);

    // Find the latest mapped decoration range for this issue
    const deco = pluginState?.decorations.find(
      undefined,
      undefined,
      (spec) => spec.id === issue.id
    )[0];

    if (deco) {
      const { from, to } = deco;
      // Replace text and remove decoration
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, issue.suggestion)
        .command(({ tr }) => {
          tr.setMeta(RedlinePluginKey, {
            type: "REMOVE_ISSUE",
            issueId: issue.id,
          });
          return true;
        })
        .run();
    } else {
      // Fallback: just remove issue mark if position is lost
      editor.view.dispatch(
        editor.state.tr.setMeta(RedlinePluginKey, {
          type: "REMOVE_ISSUE",
          issueId: issue.id,
        })
      );
    }

    setActivePopover(null);
  }, [editor, activePopover]);

  // Reject issue suggestion
  const handleReject = useCallback(() => {
    if (!editor || !activePopover) return;

    const { issue } = activePopover;
    editor.view.dispatch(
      editor.state.tr.setMeta(RedlinePluginKey, {
        type: "REMOVE_ISSUE",
        issueId: issue.id,
      })
    );

    setActivePopover(null);
  }, [editor, activePopover]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  if (!editor) return null;

  return (
    <div className={styles.container} onClick={handleContainerClick}>
      <EditorContent editor={editor} className={styles.content} />
      {activePopover && (
        <IssuePopover
          issue={activePopover.issue}
          anchorRect={activePopover.anchorRect}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={() => setActivePopover(null)}
        />
      )}
    </div>
  );
}
