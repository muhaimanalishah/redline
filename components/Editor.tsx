"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import styles from "./Editor.module.css";

interface EditorProps {
  onChange?: (markdown: string) => void;
}

export default function Editor({ onChange }: EditorProps) {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "Start writing here.",
    onUpdate: ({ editor }) => {
      const storage = editor.storage as unknown as Record<string, MarkdownStorage>;
      onChange?.(storage.markdown.getMarkdown());
    },
  });

  if (!editor) return null;

  return (
    <div className={styles.container}>
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
