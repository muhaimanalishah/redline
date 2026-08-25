"use client";

import { useCallback, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import { MarkdownStorage } from "tiptap-markdown";
import { DiffPluginKey } from "@/modules/editor/extensions/DiffExtension";
import DiffToolbar from "@/modules/editor/components/DiffToolbar";
import TableToolbar from "@/modules/editor/components/TableToolbar";
import FloatingControls from "@/modules/editor/components/FloatingControls";
import TopControls from "@/modules/editor/components/TopControls";
import MarkdownSourceView from "@/modules/editor/components/MarkdownSourceView";
import { DiffIssue, ExecuteAiOptions } from "@/modules/editor/types";
import { PresetId } from "@/modules/editor/lib/ai/presets";
import { useDiffEditor } from "@/modules/editor/hooks/useDiffEditor";
import { useHoverToolbar } from "@/modules/editor/hooks/useHoverToolbar";
import { useDiffActions } from "@/modules/editor/hooks/useDiffActions";
import { useTableToolbar } from "@/modules/editor/hooks/useTableToolbar";
import { useZoom } from "@/modules/editor/hooks/useZoom";
import { useEditorTheme } from "@/modules/editor/hooks/useEditorTheme";
import styles from "./Editor.module.css";

export interface EditorProps {
  initialContent?: string;
  issues?: DiffIssue[];
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onIssuesChange?: (issues: DiffIssue[]) => void;
  onAiExecute?: (options: ExecuteAiOptions) => Promise<string>;
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
  const { zoom, zoomIn, zoomOut, zoomReset, zoomSet } = useZoom();
  const { theme, changeTheme } = useEditorTheme();

  const getMarkdown = useCallback((): string => {
    if (!editor) return "";
    const storage = editor.storage as { markdown?: MarkdownStorage };
    return storage.markdown?.getMarkdown() ?? "";
  }, [editor]);

  const handleSourceTextChange = useCallback(
    (text: string) => {
      setSourceText(text);
      onChange?.(text);
    },
    [onChange]
  );

  const handleToggleSourceMode = useCallback(() => {
    if (!editor) return;
    if (sourceMode) {
      editor.commands.setContent(sourceText);
      setSourceMode(false);
    } else {
      const currentMd = getMarkdown();
      setSourceText(currentMd);
      setSourceMode(true);
    }
  }, [editor, sourceMode, sourceText, getMarkdown]);

  const handleCopyMarkdown = useCallback(() => {
    const md = sourceMode ? sourceText : getMarkdown();
    if (md) navigator.clipboard.writeText(md);
  }, [sourceMode, sourceText, getMarkdown]);

  const handleExportMarkdown = useCallback(
    (filename: string) => {
      const md = sourceMode ? sourceText : getMarkdown();
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        filename.endsWith(".md") || filename.endsWith(".markdown") ? filename : `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [sourceMode, sourceText, getMarkdown]
  );

  const handleImportMarkdown = useCallback(
    (content: string) => {
      if (!editor) return;
      editor.commands.setContent(content);
      if (sourceMode) {
        setSourceText(content);
      }
      onChange?.(content);
    },
    [editor, sourceMode, onChange]
  );

  const runAiTransformation = useCallback(
    async (options: Omit<ExecuteAiOptions, "selectedText">) => {
      if (!editor || !onAiExecute) return;

      const { from, to, empty } = editor.state.selection;

      // Extract all selected text blocks to support per-paragraph independent diffs
      const blocks: { from: number; to: number; text: string }[] = [];
      if (!empty) {
        editor.state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock) {
            const start = Math.max(from, pos + 1);
            const end = Math.min(to, pos + node.nodeSize - 1);
            if (start < end) {
              const text = editor.state.doc.textBetween(start, end, " ");
              if (text.trim()) {
                blocks.push({ from: start, to: end, text });
              }
            }
          }
        });
      }

      if (blocks.length > 1) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: { from, to },
          })
        );
        setIsAiGenerating(true);

        try {
          const generatedIssues: DiffIssue[] = await Promise.all(
            blocks.map(async (b) => {
              const suggestion = await onAiExecute({
                ...options,
                selectedText: b.text,
              });
              return {
                id: crypto.randomUUID(),
                type: "ai" as const,
                original: b.text,
                suggestion,
                range: { from: b.from, to: b.to },
              };
            })
          );

          editor.view.dispatch(
            editor.state.tr.setMeta(DiffPluginKey, {
              type: "ADD_DIFF_ISSUES",
              issues: generatedIssues,
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
      } else {
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
          const generatedText = await onAiExecute({
            ...options,
            selectedText,
          });

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
      style={{ "--editor-zoom": zoomScale } as React.CSSProperties}
      onMouseOver={handleContainerMouseOver}
      onMouseOut={handleContainerMouseOut}
    >
      <div className={styles.editorWrapper} style={{ maxWidth: `${maxWidthPx}px` }}>
        {sourceMode ? (
          <MarkdownSourceView
            value={sourceText}
            onChange={handleSourceTextChange}
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
        onZoomSet={zoomSet}
        theme={theme}
        onThemeChange={changeTheme}
        onCopyMarkdown={handleCopyMarkdown}
        onExportMarkdown={handleExportMarkdown}
        onImportMarkdown={handleImportMarkdown}
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
