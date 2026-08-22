import { useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { DiffExtension, DiffPluginKey } from "@/components/DiffExtension";
import { DiffIssue } from "@/types";

export interface UseDiffEditorOptions {
  initialContent: string;
  placeholder: string;
  issues: DiffIssue[];
  onChange?: (markdown: string) => void;
  onIssuesChange?: (issues: DiffIssue[]) => void;
}

export function useDiffEditor({
  initialContent,
  placeholder,
  issues,
  onChange,
  onIssuesChange,
}: UseDiffEditorOptions) {
  const [issueCount, setIssueCount] = useState<number>(() => issues.length);
  const [hasSelection, setHasSelection] = useState(false);

  const editor = useEditor({
    immediatelyRender: true,
    editable: issues.length === 0,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "editor-code-block" } },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false, allowBase64: true }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      DiffExtension,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        "data-placeholder": placeholder,
        class: "focus:outline-none",
      },
    },
    onCreate: ({ editor: ed }) => {
      if (issues.length > 0) {
        ed.view.dispatch(
          ed.state.tr.setMeta(DiffPluginKey, { type: "SET_DIFF_ISSUES", issues })
        );
      }
    },
    onUpdate: ({ editor: ed }) => {
      const storage = ed.storage as unknown as Record<string, MarkdownStorage>;
      const markdown = storage.markdown?.getMarkdown?.() ?? "";
      onChange?.(markdown);

      const pluginState = DiffPluginKey.getState(ed.state);
      if (onIssuesChange && pluginState) {
        onIssuesChange(Array.from(pluginState.issues.values()));
      }
    },
    onTransaction: ({ editor: ed }) => {
      const pluginState = DiffPluginKey.getState(ed.state);
      const remainingCount = pluginState?.issues.size ?? 0;
      setIssueCount(remainingCount);
      ed.setEditable(remainingCount === 0);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      setHasSelection(!ed.state.selection.empty);
    },
  });

  // Sync issues to editor plugin when external issues prop updates
  useEffect(() => {
    if (editor && issues) {
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, { type: "SET_DIFF_ISSUES", issues })
      );
    }
  }, [editor, issues]);

  return { editor, issueCount, hasSelection };
}
