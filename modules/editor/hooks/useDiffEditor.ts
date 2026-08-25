import { useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import { DiffExtension, DiffPluginKey } from "@/modules/editor/extensions/DiffExtension";
import { findIssueRange } from "@/modules/editor/extensions/diffDoc";
import { DiffIssue } from "@/modules/editor/types";
import { getEditorMarkdown } from "@/modules/editor/lib/markdown";

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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const editor = useEditor({
    immediatelyRender: true,
    editable: issues.length === 0,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "editor-code-block" } },
        // Registered separately below with custom config — disable
        // StarterKit's bundled defaults to avoid duplicate extensions.
        link: false,
        underline: false,
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
      const markdown = getEditorMarkdown(ed);
      onChange?.(markdown);


      const pluginState = DiffPluginKey.getState(ed.state);
      if (onIssuesChange && pluginState) {
        onIssuesChange(Array.from(pluginState.issues.values()));
      }
    },
    onTransaction: ({ editor: ed }) => {
      const pluginState = DiffPluginKey.getState(ed.state);
      const remainingCount = pluginState?.issues.size ?? 0;

      setIssueCount((prev) => (prev !== remainingCount ? remainingCount : prev));

      const isEditable = remainingCount === 0;
      if (ed.isEditable !== isEditable) {
        ed.setEditable(isEditable);
      }

      const undoPossible = ed.can().undo();
      const redoPossible = ed.can().redo();
      setCanUndo((prev) => (prev !== undoPossible ? undoPossible : prev));
      setCanRedo((prev) => (prev !== redoPossible ? redoPossible : prev));
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const selected = !ed.state.selection.empty;
      setHasSelection((prev) => (prev !== selected ? selected : prev));
    },
  });

  // Sync issues to editor plugin when external issues prop updates
  useEffect(() => {
    if (!editor || !issues) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    const currentIssues = pluginState ? Array.from(pluginState.issues.values()) : [];
    
    // Only dispatch if issues are genuinely different
    const isSame =
      currentIssues.length === issues.length &&
      issues.every((iss, idx) => iss.id === currentIssues[idx]?.id);

    if (isSame) return;

    let tr = editor.state.tr.setMeta(DiffPluginKey, { type: "SET_DIFF_ISSUES", issues });

    // Jump the cursor to the first issue so results are immediately
    // visible instead of leaving it parked at the stale selection.
    if (issues.length > 0) {
      const range = findIssueRange(tr.doc, issues[0].original);
      if (range) {
        tr = tr.setSelection(TextSelection.create(tr.doc, range.to)).scrollIntoView();
      }
    }

    editor.view.dispatch(tr);
  }, [editor, issues]);

  return { editor, issueCount, hasSelection, canUndo, canRedo };
}
