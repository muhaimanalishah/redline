import type { Editor } from "@tiptap/react";
import type { MarkdownStorage } from "tiptap-markdown";

export function getEditorMarkdown(editor: Editor | null): string {
  if (!editor || editor.isDestroyed) return "";
  const storage = (editor.storage as { markdown?: MarkdownStorage } | undefined)?.markdown;
  return storage?.getMarkdown?.() ?? "";
}
