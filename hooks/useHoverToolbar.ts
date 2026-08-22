import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { DiffPluginKey } from "@/components/DiffExtension";
import { ActiveDiffState } from "@/types";

const CLOSE_DELAY_MS = 150;

export function useHoverToolbar(editor: Editor | null, containerRef: RefObject<HTMLDivElement | null>) {
  const [activeDiff, setActiveDiff] = useState<ActiveDiffState | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const cancelCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const closeActiveDiff = useCallback(() => {
    if (editor && !editor.isDestroyed) {
      const pluginState = DiffPluginKey.getState(editor.state);
      if (pluginState?.activeDiffId) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, { type: "SET_ACTIVE_DIFF_ID", issueId: null })
        );
      }
    }
    setActiveDiff(null);
  }, [editor]);

  const scheduleClose = useCallback(() => {
    cancelCloseTimeout();
    closeTimeoutRef.current = setTimeout(closeActiveDiff, CLOSE_DELAY_MS);
  }, [cancelCloseTimeout, closeActiveDiff]);

  const handleContainerMouseOver = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const diffEl = target.closest(".diff-ins[data-diff-id]") as HTMLElement | null;
      if (!diffEl || !editor || !containerRef.current) return;

      const diffId = diffEl.getAttribute("data-diff-id");
      if (!diffId) return;

      const pluginState = DiffPluginKey.getState(editor.state);
      const issue = pluginState?.issues.get(diffId);
      if (!issue) return;

      cancelCloseTimeout();

      if (pluginState?.activeDiffId !== diffId) {
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, { type: "SET_ACTIVE_DIFF_ID", issueId: diffId })
        );
      }

      const rect = diffEl.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();
      setActiveDiff({
        issue,
        anchorRect: rect,
        containerRect: contRect,
      });
    },
    [editor, containerRef, cancelCloseTimeout]
  );

  const handleContainerMouseOut = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement | null;
      const diffEl = target.closest(".diff-ins[data-diff-id]");
      if (!diffEl) return;
      if (related && diffEl.contains(related)) return;

      scheduleClose();
    },
    [scheduleClose]
  );

  return {
    activeDiff,
    closeActiveDiff,
    cancelCloseTimeout,
    scheduleClose,
    handleContainerMouseOver,
    handleContainerMouseOut,
  };
}
