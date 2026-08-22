"use client";

import { useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Table,
  Minus,
  ImageIcon,
  Link2,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import InsertMenu from "./InsertMenu";
import UrlPopover from "./UrlPopover";
import AiPromptPopover from "./AiPromptPopover";
import { DiffPluginKey } from "./DiffExtension";
import { PresetId } from "@/lib/ai/presets";
import styles from "./FloatingControls.module.css";

interface FloatingControlsProps {
  editor: Editor;
  hasSelection: boolean;
  issueCount?: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAiSubmit?: (prompt: string) => Promise<void>;
  onSelectPreset?: (preset: PresetId) => Promise<void>;
  aiLoading?: boolean;
}

type PendingUrlField = "image" | "link" | null;

interface PendingUrl {
  field: PendingUrlField;
  anchorRect: DOMRect;
}

export default function FloatingControls({
  editor,
  hasSelection,
  issueCount = 0,
  onAcceptAll,
  onRejectAll,
  onAiSubmit,
  onSelectPreset,
  aiLoading = false,
}: FloatingControlsProps) {
  const [pendingUrl, setPendingUrl] = useState<PendingUrl | null>(null);
  const [aiAnchorRect, setAiAnchorRect] = useState<DOMRect | null>(null);
  const [savedRange, setSavedRange] = useState<{ from: number; to: number } | null>(null);
  const imageBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const closePopover = useCallback(() => setPendingUrl(null), []);

  const openPopover = useCallback((field: "image" | "link") => {
    setPendingUrl((prev) => {
      if (prev?.field === field) return null;
      const anchorRect = dockRef.current?.getBoundingClientRect();
      return anchorRect ? { field, anchorRect } : null;
    });
  }, []);

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
      closePopover();
    },
    [editor, closePopover]
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      closePopover();
    },
    [editor, closePopover]
  );

  const closeAiPopover = useCallback(() => {
    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, {
        type: "SET_ACTIVE_SELECTION_RANGE",
        range: null,
      })
    );
    setSavedRange(null);
    setAiAnchorRect(null);
  }, [editor]);

  const toggleAiPopover = useCallback(() => {
    setAiAnchorRect((prev) => {
      if (prev) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_ACTIVE_SELECTION_RANGE",
            range: null,
          })
        );
        setSavedRange(null);
        return null;
      }

      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        setSavedRange({ from, to });
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_ACTIVE_SELECTION_RANGE",
            range: { from, to },
          })
        );
      } else {
        setSavedRange(null);
      }

      return dockRef.current?.getBoundingClientRect() ?? null;
    });
  }, [editor]);

  const handleAiSubmit = useCallback(
    async (prompt: string) => {
      const rangeToUse = savedRange;
      closeAiPopover();
      if (rangeToUse) {
        editor.commands.setTextSelection(rangeToUse);
      }
      await onAiSubmit?.(prompt);
    },
    [savedRange, closeAiPopover, editor, onAiSubmit]
  );

  const handleSelectPreset = useCallback(
    async (preset: PresetId) => {
      const rangeToUse = savedRange;
      closeAiPopover();
      if (rangeToUse) {
        editor.commands.setTextSelection(rangeToUse);
      }
      await onSelectPreset?.(preset);
    },
    [savedRange, closeAiPopover, editor, onSelectPreset]
  );

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      <div ref={dockRef} className={styles.floatingDock} role="toolbar" aria-label="Formatting toolbar">
        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("bold")}
          disabled={!hasSelection}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title={hasSelection ? "Bold" : "Select text to format"}
          aria-label="Bold"
        >
          <Bold size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("italic")}
          disabled={!hasSelection}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title={hasSelection ? "Italic" : "Select text to format"}
          aria-label="Italic"
        >
          <Italic size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("underline")}
          disabled={!hasSelection}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title={hasSelection ? "Underline" : "Select text to format"}
          aria-label="Underline"
        >
          <Underline size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("strike")}
          disabled={!hasSelection}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title={hasSelection ? "Strikethrough" : "Select text to format"}
          aria-label="Strikethrough"
        >
          <Strikethrough size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("code")}
          disabled={!hasSelection}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title={hasSelection ? "Inline code" : "Select text to format"}
          aria-label="Inline code"
        >
          <Code size={17} />
        </button>

        <div className={styles.divider} />

        <InsertMenu editor={editor} />

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          aria-label="Bullet list"
        >
          <List size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Task list"
          aria-label="Task list"
        >
          <ListChecks size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          data-active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
          aria-label="Code block"
        >
          <Code2 size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          disabled={hasSelection}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title={hasSelection ? "Deselect text to insert a table" : "Table"}
          aria-label="Insert table"
        >
          <Table size={17} />
        </button>

        <button
          type="button"
          className={styles.btn}
          disabled={hasSelection}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title={hasSelection ? "Deselect text to insert a horizontal rule" : "Horizontal rule"}
          aria-label="Insert horizontal rule"
        >
          <Minus size={17} />
        </button>

        <button
          ref={imageBtnRef}
          type="button"
          className={styles.btn}
          data-active={pendingUrl?.field === "image"}
          onClick={() => openPopover("image")}
          title="Image"
          aria-label="Insert image"
        >
          <ImageIcon size={17} />
        </button>

        <button
          ref={linkBtnRef}
          type="button"
          className={styles.btn}
          data-active={editor.isActive("link") || pendingUrl?.field === "link"}
          disabled={!hasSelection}
          onClick={() => openPopover("link")}
          title={hasSelection ? "Link" : "Select text to add a link"}
          aria-label="Insert link"
        >
          <Link2 size={17} />
        </button>

        {onAiSubmit && (
          <>
            <div className={styles.divider} />

            <button
              type="button"
              className={styles.btn}
              data-active={!!aiAnchorRect}
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleAiPopover}
              title="Ask AI"
              aria-label="Ask AI"
            >
              <Sparkles size={17} />
            </button>
          </>
        )}

        {issueCount > 0 && (
          <>
            <div className={styles.divider} />

            <div className={styles.reviewActions} data-open={true}>
              <span className={styles.reviewCount}>{issueCount}</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnReject}`}
                onClick={onRejectAll}
                title="Reject all suggestions"
                aria-label="Reject all suggestions"
              >
                <X size={17} />
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccept}`}
                onClick={onAcceptAll}
                title="Accept all suggestions"
                aria-label="Accept all suggestions"
              >
                <Check size={17} />
              </button>
            </div>
          </>
        )}
      </div>

      {pendingUrl?.field === "image" && (
        <UrlPopover
          label="Image URL"
          placeholder="https://example.com/image.png"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleImageSubmit}
          onClose={closePopover}
        />
      )}

      {pendingUrl?.field === "link" && (
        <UrlPopover
          label="Link URL"
          placeholder="https://example.com"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleLinkSubmit}
          onClose={closePopover}
        />
      )}

      {aiAnchorRect && (
        <AiPromptPopover
          anchorRect={aiAnchorRect}
          hasSelection={hasSelection}
          loading={aiLoading}
          onSubmit={handleAiSubmit}
          onSelectPreset={handleSelectPreset}
          onClose={closeAiPopover}
        />
      )}
    </aside>
  );
}
