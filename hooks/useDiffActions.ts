import { useCallback } from "react";
import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { DiffPluginKey } from "@/components/DiffExtension";
import { DiffIssue } from "@/types";
import { resolveIssueRange, findIssueRanges } from "./diffDoc";

function clearActiveDiffHighlight() {
  document.querySelectorAll(".diff-active").forEach((el) => el.classList.remove("diff-active"));
}

export function useDiffActions(editor: Editor | null, onDiffResolved: () => void) {
  const handleAccept = useCallback(
    (issue: DiffIssue) => {
      if (!editor) return;

      const range = resolveIssueRange(editor.state.doc, issue);

      if (range) {
        editor
          .chain()
          .focus()
          .insertContentAt(range, issue.suggestion)
          .command(({ tr }) => {
            tr.setMeta(DiffPluginKey, { type: "REMOVE_DIFF", issueId: issue.id });
            return true;
          })
          .run();
      } else {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, { type: "REMOVE_DIFF", issueId: issue.id })
        );
      }

      clearActiveDiffHighlight();
      onDiffResolved();
      toast.success("Applied suggestion", {
        description: `"${issue.original}" → "${issue.suggestion}"`,
      });
    },
    [editor, onDiffResolved]
  );

  const handleReject = useCallback(
    (issue: DiffIssue) => {
      if (!editor) return;

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, { type: "REMOVE_DIFF", issueId: issue.id })
      );

      clearActiveDiffHighlight();
      onDiffResolved();
      toast.info("Dismissed suggestion", {
        description: `Kept "${issue.original}"`,
      });
    },
    [editor, onDiffResolved]
  );

  const handleAcceptAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    if (!pluginState || pluginState.issues.size === 0) return;

    const count = pluginState.issues.size;
    const currentIssues = Array.from(pluginState.issues.values());
    const replacements = findIssueRanges(editor.state.doc, currentIssues);

    replacements.sort((a, b) => b.from - a.from);

    let tr = editor.state.tr;
    replacements.forEach(({ from, to, text }) => {
      tr = tr.replaceWith(from, to, editor.schema.text(text));
    });

    tr = tr.setMeta(DiffPluginKey, { type: "CLEAR_ALL_DIFFS" });
    editor.view.dispatch(tr);

    clearActiveDiffHighlight();
    onDiffResolved();
    toast.success(`Accepted all ${count} suggestions`);
  }, [editor, onDiffResolved]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    const count = pluginState?.issues.size ?? 0;

    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, { type: "CLEAR_ALL_DIFFS" })
    );

    clearActiveDiffHighlight();
    onDiffResolved();
    toast.info(`Rejected all ${count} suggestions`);
  }, [editor, onDiffResolved]);

  return { handleAccept, handleReject, handleAcceptAll, handleRejectAll };
}
