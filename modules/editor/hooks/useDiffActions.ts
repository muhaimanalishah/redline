import { useCallback } from "react";
import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { DiffPluginKey } from "@/modules/editor/extensions/DiffExtension";
import { DiffIssue } from "@/modules/editor/types";
import { resolveIssueRange, findIssueRanges } from "@/modules/editor/extensions/diffDoc";

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

      onDiffResolved();
      toast.success("Applied suggestion");
    },
    [editor, onDiffResolved]
  );

  const handleReject = useCallback(
    (issue: DiffIssue) => {
      if (!editor) return;

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, { type: "REMOVE_DIFF", issueId: issue.id })
      );

      onDiffResolved();
      toast.info("Dismissed suggestion");
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

    // Sort in reverse document order so later replacements don't shift earlier positions
    replacements.sort((a, b) => b.from - a.from);

    let chain = editor.chain().focus();
    for (const { from, to, text } of replacements) {
      chain = chain.insertContentAt({ from, to }, text);
    }

    chain
      .command(({ tr }) => {
        tr.setMeta(DiffPluginKey, { type: "CLEAR_ALL_DIFFS" });
        return true;
      })
      .run();

    onDiffResolved();
    toast.success(`Accepted ${count} suggestion${count > 1 ? "s" : ""}`);
  }, [editor, onDiffResolved]);

  const handleRejectAll = useCallback(() => {
    if (!editor) return;

    const pluginState = DiffPluginKey.getState(editor.state);
    const count = pluginState?.issues.size ?? 0;

    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, { type: "CLEAR_ALL_DIFFS" })
    );

    onDiffResolved();
    toast.info(`Dismissed ${count} suggestion${count > 1 ? "s" : ""}`);
  }, [editor, onDiffResolved]);

  return { handleAccept, handleReject, handleAcceptAll, handleRejectAll };
}
