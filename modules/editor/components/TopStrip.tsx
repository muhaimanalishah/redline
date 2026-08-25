"use client";

import React, { useRef, useState, useCallback } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import {
  PanelLeftClose,
  PanelLeft,
  Undo2,
  Redo2,
  Code2,
  Pilcrow,
  Sparkles,
  Mic,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Table,
  Minus,
  ImageIcon,
  Link2,
  ZoomIn,
  Sun,
  Moon,
  MoreHorizontal,
  Copy,
  Upload,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeMode } from "./TopControls";
import InsertMenu from "./InsertMenu";
import ZoomPopover from "./ZoomPopover";
import ExportPopover from "./ExportPopover";
import UrlPopover from "./UrlPopover";
import { DropdownMenu, DropdownMenuItem } from "@/modules/shared";
import styles from "./TopStrip.module.css";

interface TopStripProps {
  editor: Editor;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomSet?: (zoom: number) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onCopyMarkdown?: () => void;
  onExportMarkdown?: (filename: string) => void;
  onImportMarkdown?: (content: string) => void;
  sourceMode: boolean;
  onToggleSourceMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenAiPrompt?: () => void;
  onStartVoiceRecording?: () => void;
  isAiDockOpen?: boolean;
  isRecording?: boolean;
}

type PendingUrlField = "image" | "link" | null;

interface PendingUrl {
  field: PendingUrlField;
  anchorRect: DOMRect;
}

export default function TopStrip({
  editor,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomSet,
  theme,
  onThemeChange,
  onCopyMarkdown,
  onExportMarkdown,
  onImportMarkdown,
  sourceMode,
  onToggleSourceMode,
  canUndo,
  canRedo,
  isSidebarOpen,
  onToggleSidebar,
  onOpenAiPrompt,
  onStartVoiceRecording,
  isAiDockOpen = false,
  isRecording = false,
}: TopStripProps) {
  const [zoomAnchorRect, setZoomAnchorRect] = useState<DOMRect | null>(null);
  const [exportAnchorRect, setExportAnchorRect] = useState<DOMRect | null>(null);
  const [isDocActionsOpen, setIsDocActionsOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<PendingUrl | null>(null);

  const zoomBtnRef = useRef<HTMLButtonElement>(null);
  const docActionsBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  const editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      isBold: ed.isActive("bold"),
      isItalic: ed.isActive("italic"),
      isUnderline: ed.isActive("underline"),
      isStrike: ed.isActive("strike"),
      isCode: ed.isActive("code"),
      isBulletList: ed.isActive("bulletList"),
      isOrderedList: ed.isActive("orderedList"),
      isTaskList: ed.isActive("taskList"),
      isBlockquote: ed.isActive("blockquote"),
      isTable: ed.isActive("table"),
      isLink: ed.isActive("link"),
      hasSelection: !ed.state.selection.empty,
    }),
  });

  const handleNextTheme = () => {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    onThemeChange(nextTheme);
  };

  const handleCopy = () => {
    if (onCopyMarkdown) {
      onCopyMarkdown();
      toast.success("Copied Markdown to clipboard");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        onImportMarkdown?.(text);
        toast.success(`Imported ${file.name}`);
      } catch {
        toast.error("Failed to read file");
      } finally {
        e.target.value = "";
      }
    },
    [onImportMarkdown]
  );

  const handleExport = useCallback(
    (filename: string) => {
      onExportMarkdown?.(filename);
      toast.success(`Exported ${filename}`);
    },
    [onExportMarkdown]
  );

  const openUrlPopover = (field: "image" | "link", btnRef: React.RefObject<HTMLButtonElement | null>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPendingUrl({ field, anchorRect: rect });
    }
  };

  const handleImageSubmit = useCallback(
    (url: string) => {
      if (editor.isFocused) {
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        editor
          .chain()
          .focus("end")
          .insertContent({ type: "paragraph" })
          .setImage({ src: url })
          .run();
      }
      setPendingUrl(null);
    },
    [editor]
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      setPendingUrl(null);
    },
    [editor]
  );

  const docActionItems: DropdownMenuItem[] = [
    {
      id: "copy",
      label: "Copy Markdown",
      icon: Copy,
      onClick: handleCopy,
    },
    {
      id: "import",
      label: "Import Markdown…",
      icon: Upload,
      onClick: handleImportClick,
    },
    {
      id: "export",
      label: "Export as .md",
      icon: Download,
      onClick: () => {
        const rect = docActionsBtnRef.current?.getBoundingClientRect();
        if (rect) setExportAnchorRect(rect);
      },
    },
  ];

  return (
    <header className={styles.topStrip} aria-label="Editor toolbar">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* LEFT ZONE: Sidebar Toggle + Undo/Redo + Markdown Switch */}
      <div className={styles.leftZone}>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse Sidebar (⌘\\)" : "Open Sidebar (⌘\\)"}
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={sourceMode || !canUndo}
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={sourceMode || !canRedo}
          title="Redo (⌘Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>

        <div className={styles.divider} />

        <button
          type="button"
          className={styles.toolBtn}
          data-active={sourceMode}
          onClick={onToggleSourceMode}
          title={sourceMode ? "Switch to rich text view" : "Switch to Markdown source view"}
          aria-label="Toggle Markdown source view"
        >
          {sourceMode ? <Pilcrow size={15} /> : <Code2 size={15} />}
        </button>
      </div>

      {/* CENTER ZONE: PRIMARY FORMATTING TOOLS */}
      {!sourceMode && (
        <div className={styles.centerZone}>
          {/* AI & Voice Actions */}
          {onOpenAiPrompt && (
            <button
              type="button"
              className={`${styles.toolBtn} ${styles.aiBtn}`}
              data-active={isAiDockOpen}
              onClick={onOpenAiPrompt}
              title="Ask AI (Prompt or Preset)"
              aria-label="Ask AI"
            >
              <Sparkles size={15} />
            </button>
          )}

          {onStartVoiceRecording && (
            <button
              type="button"
              className={`${styles.toolBtn} ${styles.micBtn}`}
              data-active={isRecording}
              onClick={onStartVoiceRecording}
              title="Voice Dictation & Transcribe"
              aria-label="Voice Dictation"
            >
              <Mic size={15} />
            </button>
          )}

          <div className={styles.divider} />

          {/* Inline Formats */}
          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isBold ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
            aria-label="Bold"
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isItalic ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
            aria-label="Italic"
          >
            <Italic size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isUnderline ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (⌘U)"
            aria-label="Underline"
          >
            <Underline size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isStrike ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isCode ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
            aria-label="Inline Code"
          >
            <Code size={15} />
          </button>

          <div className={styles.divider} />

          {/* Headings Selector */}
          <InsertMenu editor={editor} />

          <div className={styles.divider} />

          {/* Block Styles */}
          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isBulletList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isOrderedList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isTaskList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task List"
            aria-label="Task List"
          >
            <ListChecks size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isBlockquote ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Quote size={15} />
          </button>

          <div className={styles.divider} />

          {/* Insert Elements */}
          <button
            type="button"
            className={styles.toolBtn}
            data-active={editorState?.isTable ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Table"
            aria-label="Insert Table"
          >
            <Table size={15} />
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            disabled={editorState?.hasSelection ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title={editorState?.hasSelection ? "Deselect text to insert a horizontal rule" : "Horizontal Rule"}
            aria-label="Horizontal Rule"
          >
            <Minus size={15} />
          </button>

          <button
            ref={imageBtnRef}
            type="button"
            className={styles.toolBtn}
            data-active={pendingUrl?.field === "image"}
            onClick={() => openUrlPopover("image", imageBtnRef)}
            title="Insert Image"
            aria-label="Insert Image"
          >
            <ImageIcon size={15} />
          </button>

          <button
            ref={linkBtnRef}
            type="button"
            className={styles.toolBtn}
            data-active={(editorState?.isLink ?? false) || pendingUrl?.field === "link"}
            onClick={() => openUrlPopover("link", linkBtnRef)}
            title="Insert Link"
            aria-label="Insert Link"
          >
            <Link2 size={15} />
          </button>
        </div>
      )}

      {/* RIGHT ZONE: Zoom + Document Actions Dropdown + Theme */}
      <div className={styles.rightZone}>
        {/* Zoom Preset Button */}
        <button
          ref={zoomBtnRef}
          type="button"
          className={styles.zoomBtn}
          data-active={!!zoomAnchorRect}
          onClick={() => {
            setExportAnchorRect(null);
            setIsDocActionsOpen(false);
            setZoomAnchorRect((prev) => (prev ? null : zoomBtnRef.current?.getBoundingClientRect() ?? null));
          }}
          title={`Zoom (${zoom}%)`}
          aria-label="Zoom controls"
        >
          <ZoomIn size={13} />
          <span>{zoom}%</span>
        </button>

        <div className={styles.divider} />

        {/* Consolidated Document Actions Trigger (Copy / Import / Export) */}
        <div className={styles.dropdownAnchor}>
          <button
            ref={docActionsBtnRef}
            type="button"
            className={styles.toolBtn}
            data-active={isDocActionsOpen || !!exportAnchorRect}
            onClick={() => {
              setZoomAnchorRect(null);
              setIsDocActionsOpen((prev) => !prev);
            }}
            title="Document Actions (Copy, Import, Export)"
            aria-label="Document actions"
          >
            <MoreHorizontal size={16} />
          </button>

          <DropdownMenu
            isOpen={isDocActionsOpen}
            onClose={() => setIsDocActionsOpen(false)}
            items={docActionItems}
            align="right"
          />
        </div>

        <div className={styles.divider} />

        {/* Theme Toggle */}
        <button
          type="button"
          className={styles.toolBtn}
          onClick={handleNextTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} theme`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>

      {/* Popovers */}
      {zoomAnchorRect && (
        <ZoomPopover
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onZoomReset={onZoomReset}
          onZoomSet={onZoomSet}
          anchorRect={zoomAnchorRect}
          onClose={() => setZoomAnchorRect(null)}
        />
      )}

      {exportAnchorRect && (
        <ExportPopover
          anchorRect={exportAnchorRect}
          onExport={handleExport}
          onClose={() => setExportAnchorRect(null)}
        />
      )}

      {pendingUrl?.field === "image" && (
        <UrlPopover
          label="Image URL"
          placeholder="https://example.com/image.png"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleImageSubmit}
          onClose={() => setPendingUrl(null)}
        />
      )}

      {pendingUrl?.field === "link" && (
        <UrlPopover
          label="Link URL"
          placeholder="https://example.com"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleLinkSubmit}
          onClose={() => setPendingUrl(null)}
        />
      )}
    </header>
  );
}
