"use client";

import { RefObject, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Table,
  Minus,
  ImageIcon,
  Link2,
  SpellCheck,
  Check,
  X,
  LoaderCircle,
} from "lucide-react";
import InsertMenu from "./InsertMenu";
import UrlPopover from "./UrlPopover";
import styles from "./FloatingControls.module.css";

interface FloatingControlsProps {
  editor: Editor;
  hasSelection: boolean;
  onProofread?: () => void;
  proofreadDisabled?: boolean;
  proofreadLoading?: boolean;
  issueCount?: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
}

type PendingUrlField = "image" | "link" | null;

interface PendingUrl {
  field: PendingUrlField;
  anchorRect: DOMRect;
}

export default function FloatingControls({
  editor,
  hasSelection,
  onProofread,
  proofreadDisabled = false,
  proofreadLoading = false,
  issueCount = 0,
  onAcceptAll,
  onRejectAll,
}: FloatingControlsProps) {
  const [pendingUrl, setPendingUrl] = useState<PendingUrl | null>(null);
  const imageBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  const closePopover = () => setPendingUrl(null);

  const openPopover = (field: "image" | "link", btnRef: RefObject<HTMLButtonElement | null>) => {
    setPendingUrl((prev) => {
      if (prev?.field === field) return null;
      const anchorRect = btnRef.current?.getBoundingClientRect();
      return anchorRect ? { field, anchorRect } : null;
    });
  };

  const handleImageSubmit = (url: string) => {
    // Insert at the cursor when the editor has focus; otherwise default to
    // a new line at the end of the document rather than an arbitrary
    // leftover cursor position.
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
  };

  const handleLinkSubmit = (url: string) => {
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    closePopover();
  };

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      <div className={styles.floatingDock}>
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
          disabled={hasSelection}
          onClick={() => openPopover("image", imageBtnRef)}
          title={hasSelection ? "Deselect text to insert an image" : "Image"}
          aria-label="Insert image"
        >
          <ImageIcon size={17} />
        </button>

        <button
          ref={linkBtnRef}
          type="button"
          className={styles.btn}
          data-active={editor.isActive("link")}
          disabled={!hasSelection}
          onClick={() => openPopover("link", linkBtnRef)}
          title={hasSelection ? "Link" : "Select text to add a link"}
          aria-label="Insert link"
        >
          <Link2 size={17} />
        </button>

        {onProofread && (
          <>
            <div className={styles.divider} />

            <button
              type="button"
              className={`${styles.btn} ${styles.btnProofread}`}
              onClick={onProofread}
              disabled={proofreadDisabled}
              title={proofreadLoading ? "Proofreading…" : proofreadDisabled ? "Select text to proofread" : "Proofread selected text"}
              aria-label="Proofread selected text"
            >
              {proofreadLoading ? (
                <LoaderCircle size={17} className={styles.spin} />
              ) : (
                <SpellCheck size={17} />
              )}
              {proofreadLoading ? "Proofreading…" : "Proofread"}
            </button>

            <div className={styles.reviewActions} data-open={issueCount > 0}>
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
    </aside>
  );
}
