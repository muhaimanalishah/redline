import { RefObject, useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";

export interface ActiveTableState {
  anchorRect: DOMRect;
  containerRect: DOMRect;
}

export function useTableToolbar(editor: Editor | null, containerRef: RefObject<HTMLDivElement | null>) {
  const [activeTable, setActiveTable] = useState<ActiveTableState | null>(null);

  const syncActiveTable = useCallback(() => {
    if (!editor || !containerRef.current) {
      setActiveTable(null);
      return;
    }

    const tableParent = findParentNode((node) => node.type.name === "table")(
      editor.state.selection
    );

    if (!tableParent) {
      setActiveTable(null);
      return;
    }

    const dom = editor.view.nodeDOM(tableParent.pos) as HTMLElement | null;
    if (!dom) {
      setActiveTable(null);
      return;
    }

    setActiveTable({
      anchorRect: dom.getBoundingClientRect(),
      containerRect: containerRef.current.getBoundingClientRect(),
    });
  }, [editor, containerRef]);

  useEffect(() => {
    if (!editor) return;

    editor.on("selectionUpdate", syncActiveTable);
    editor.on("transaction", syncActiveTable);

    return () => {
      editor.off("selectionUpdate", syncActiveTable);
      editor.off("transaction", syncActiveTable);
    };
  }, [editor, syncActiveTable]);

  return { activeTable };
}
