"use client";

import { useCallback, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import { MarkdownStorage } from "tiptap-markdown";
import { DiffPluginKey } from "./DiffExtension";
import DiffToolbar from "./DiffToolbar";
import TableToolbar from "./TableToolbar";
import FloatingControls from "./FloatingControls";
import TopControls from "./TopControls";
import MarkdownSourceView from "./MarkdownSourceView";
import { DiffIssue } from "@/types";
import { useDiffEditor } from "@/hooks/useDiffEditor";
import { useHoverToolbar } from "@/hooks/useHoverToolbar";
import { useDiffActions } from "@/hooks/useDiffActions";
import { useTableToolbar } from "@/hooks/useTableToolbar";
import { useZoom } from "@/hooks/useZoom";
import { useEditorTheme } from "@/hooks/useEditorTheme";
import styles from "./Editor.module.css";

export interface EditorProps {
  initialContent?: string;
  issues?: DiffIssue[];
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onIssuesChange?: (issues: DiffIssue[]) => void;
  onProofread?: (text: string) => void | Promise<void>;
  onAiGenerate?: (prompt: string, selectedText: string) => Promise<string>;
}

export default function Editor({
  initialContent = "",
  issues = [],
  placeholder = "Start writing...",
  onChange,
  onIssuesChange,
  onProofread,
  onAiGenerate,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProofreading, setIsProofreading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");

  const { editor, issueCount, hasSelection, canUndo, canRedo } = useDiffEditor({
    initialContent,
    placeholder,
    issues,
    onChange,
    onIssuesChange,
  });

  const {
    activeDiff,
    closeActiveDiff,
    cancelCloseTimeout,
    scheduleClose,
    handleContainerMouseOver,
    handleContainerMouseOut,
  } = useHoverToolbar(editor, containerRef);

  const { handleAccept, handleReject, handleAcceptAll, handleRejectAll } = useDiffActions(
    editor,
    closeActiveDiff
  );

  const { activeTable } = useTableToolbar(editor, containerRef);

  const { zoom, zoomIn, zoomOut, zoomReset } = useZoom();
  const { theme, changeTheme } = useEditorTheme();

  const getMarkdown = useCallback(() => {
    if (!editor) return "";
    const storage = editor.storage as unknown as Record<string, MarkdownStorage>;
    return storage.markdown?.getMarkdown?.() ?? "";
  }, [editor]);

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(getMarkdown());
  }, [getMarkdown]);

  const handleToggleSourceMode = useCallback(() => {
    if (!editor) return;

    if (sourceMode) {
      editor.commands.setContent(sourceText);
      setSourceMode(false);
    } else {
      setSourceText(getMarkdown());
      setSourceMode(true);
    }
  }, [editor, sourceMode, sourceText, getMarkdown]);

  const handleProofreadClick = useCallback(async () => {
    if (!editor || !onProofread) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, {
        type: "SET_PROCESSING_RANGE",
        range: { from, to },
      })
    );
    setIsProofreading(true);

    try {
      await onProofread(selectedText);
    } finally {
      setIsProofreading(false);
      if (editor.state.doc.content.size > 0) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: null,
          })
        );
      }
    }
  }, [editor, onProofread]);

  const handleAiSubmit = useCallback(
    async (prompt: string) => {
      if (!editor || !onAiGenerate) return;

      const { from, to, empty } = editor.state.selection;
      const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, " ");
      const range = { from, to };

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_PROCESSING_RANGE",
          range,
        })
      );
      setIsAiGenerating(true);

      try {
        const generatedText = await onAiGenerate(prompt, selectedText);

        // Resolve the current range through the plugin state rather than
        // the range captured above — the document may have changed while
        // the request was in flight, and processingRange has been mapped
        // through every edit since.
        const pluginState = DiffPluginKey.getState(editor.state);
        const currentRange = pluginState?.processingRange ?? range;

        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "ADD_DIFF_ISSUE",
            issue: {
              id: crypto.randomUUID(),
              type: "ai",
              original: selectedText,
              suggestion: generatedText,
              range: currentRange,
            },
          })
        );
      } catch (err) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: null,
          })
        );
        throw err;
      } finally {
        setIsAiGenerating(false);
      }
    },
    [editor, onAiGenerate]
  );

  if (!editor) return null;

  const zoomScale = zoom / 100;
  const maxWidthPx = Math.min(960, Math.round(720 * Math.max(1, zoomScale * 0.95)));

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseOver={handleContainerMouseOver}
      onMouseOut={handleContainerMouseOut}
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
        {/* Editor Content Area (Zero selection popover) */}
        {sourceMode ? (
          <MarkdownSourceView
            value={sourceText}
            onChange={setSourceText}
            placeholder={placeholder}
          />
        ) : (
          <EditorContent editor={editor} className={styles.editorContent} />
        )}
      </div>

      {/* Floating table controls — add/delete rows and columns */}
      {!sourceMode && activeTable && (
        <TableToolbar
          editor={editor}
          anchorRect={activeTable.anchorRect}
          containerRect={activeTable.containerRect}
        />
      )}

      {/* Floating Notion-style Micro-Toolbar for hovered redline issues */}
      {!sourceMode && activeDiff && (
        <DiffToolbar
          issue={activeDiff.issue}
          anchorRect={activeDiff.anchorRect}
          containerRect={activeDiff.containerRect}
          onAccept={handleAccept}
          onReject={handleReject}
          onClose={closeActiveDiff}
          onMouseEnter={cancelCloseTimeout}
          onMouseLeave={scheduleClose}
        />
      )}

      {/* Document controls — undo/redo, source view toggle, copy, zoom, theme */}
      <TopControls
        editor={editor}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        theme={theme}
        onThemeChange={changeTheme}
        onCopyMarkdown={handleCopyMarkdown}
        sourceMode={sourceMode}
        onToggleSourceMode={handleToggleSourceMode}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Insert + review dock at the bottom */}
      {!sourceMode && (
        <FloatingControls
          editor={editor}
          hasSelection={hasSelection}
          onProofread={onProofread ? handleProofreadClick : undefined}
          proofreadDisabled={!hasSelection || isProofreading}
          proofreadLoading={isProofreading}
          issueCount={issueCount}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onAiSubmit={onAiGenerate ? handleAiSubmit : undefined}
          aiLoading={isAiGenerating}
        />
      )}
    </div>
  );
}
