"use client";

import { Editor } from "@tiptap/react";
import { Plus, Trash2 } from "lucide-react";
import styles from "./TableToolbar.module.css";

interface TableToolbarProps {
  editor: Editor;
  anchorRect: DOMRect;
  containerRect: DOMRect;
}

export default function TableToolbar({ editor, anchorRect, containerRect }: TableToolbarProps) {
  const left = anchorRect.right - containerRect.left;
  const top = anchorRect.top - containerRect.top;

  return (
    <div
      className={styles.toolbarWrap}
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.toolbar}>
        <button
          className={styles.button}
          title="Add row below"
          aria-label="Add row below"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Plus size={12} strokeWidth={2.5} />
          Row
        </button>
        <button
          className={styles.button}
          title="Add column after"
          aria-label="Add column after"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Plus size={12} strokeWidth={2.5} />
          Col
        </button>
        <div className={styles.divider} />
        <button
          className={styles.iconButton}
          title="Delete row"
          aria-label="Delete current row"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <Trash2 size={13} strokeWidth={2.25} />
          Row
        </button>
        <button
          className={styles.iconButton}
          title="Delete column"
          aria-label="Delete current column"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <Trash2 size={13} strokeWidth={2.25} />
          Col
        </button>
        <div className={styles.divider} />
        <button
          className={`${styles.iconButton} ${styles.deleteTable}`}
          title="Delete table"
          aria-label="Delete table"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 size={13} strokeWidth={2.25} />
          Table
        </button>
      </div>
    </div>
  );
}
