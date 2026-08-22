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
import { DiffIssue, ExecuteAiOptions } from "@/types";
import { PresetId } from "@/lib/ai/presets";
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
  onAiExecute?: (
    options: ExecuteAiOptions,
    onChunk?: (text: string) => void
  ) => Promise<string>;
}

export default function Editor({
  initialContent = "",
  issues = [],
  placeholder = "Start writing...",
  onChange,
  onIssuesChange,
  onAiExecute,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const getMarkdown = useCallback((): string => {
    if (!editor) return "";
    const storage = editor.storage as { markdown?: MarkdownStorage };
    return storage.markdown?.getMarkdown() ?? "";
  }, [editor]);

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

  const handleCopyMarkdown = useCallback(() => {
    const md = sourceMode ? sourceText : getMarkdown();
    if (md) navigator.clipboard.writeText(md);
  }, [sourceMode, sourceText, getMarkdown]);

  const runAiTransformation = useCallback(
    async (options: Omit<ExecuteAiOptions, "selectedText">) => {
      if (!editor || !onAiExecute) return;

      const { from, to, empty } = editor.state.selection;
      const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, " ");
      const range = { from, to };
      const issueId = crypto.randomUUID();

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_PROCESSING_RANGE",
          range,
        })
      );
      setIsAiGenerating(true);

      try {
        const generatedText = await onAiExecute(
          {
            ...options,
            selectedText,
          },
          (streamingText) => {
            const pluginState = DiffPluginKey.getState(editor.state);
            const currentRange = pluginState?.processingRange ?? range;

            editor.view.dispatch(
              editor.state.tr.setMeta(DiffPluginKey, {
                type: "ADD_DIFF_ISSUE",
                issue: {
                  id: issueId,
                  type: "ai",
                  original: selectedText,
                  suggestion: streamingText,
                  range: currentRange,
                },
              })
            );
          }
        );

        const pluginState = DiffPluginKey.getState(editor.state);
        const currentRange = pluginState?.processingRange ?? range;

        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "ADD_DIFF_ISSUE",
            issue: {
              id: issueId,
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
            type: "REMOVE_DIFF",
            issueId,
          }).setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: null,
          })
        );
        throw err;
      } finally {
        setIsAiGenerating(false);
      }
    },
    [editor, onAiExecute]
  );

  const handleAiSubmit = useCallback(
    async (prompt: string) => {
      await runAiTransformation({ mode: "custom", prompt });
    },
    [runAiTransformation]
  );

  const handleSelectPreset = useCallback(
    async (preset: PresetId) => {
      await runAiTransformation({ mode: "preset", preset });
    },
    [runAiTransformation]
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
    >
      <div className={styles.editorWrapper} style={{ maxWidth: `${maxWidthPx}px` }}>
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

      {/* Floating table controls */}
      {!sourceMode && activeTable && (
        <TableToolbar
          editor={editor}
          anchorRect={activeTable.anchorRect}
          containerRect={activeTable.containerRect}
        />
      )}

      {/* Floating Micro-Toolbar for hovered redline issues */}
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

      {/* Top Document controls */}
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

      {/* Unified Dock at the bottom */}
      {!sourceMode && (
        <FloatingControls
          editor={editor}
          hasSelection={hasSelection}
          issueCount={issueCount}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          onAiSubmit={onAiExecute ? handleAiSubmit : undefined}
          onSelectPreset={onAiExecute ? handleSelectPreset : undefined}
          aiLoading={isAiGenerating}
        />
      )}
    </div>
  );
}
