"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { sanitizeContent, sanitizeTitle } from "@/modules/shared/lib/textUtils";

export interface ActiveDocData {
  id: string;
  title: string;
  content: string;
}

const AUTOSAVE_DELAY_MS = 600;

export function useActiveDocument(
  activeDocId: string | null,
  onUpdateTitleLocally?: (id: string, newTitle: string) => void
) {
  const [activeDocData, setActiveDocData] = useState<ActiveDocData | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  const pendingSaveRef = useRef<{
    id: string;
    title?: string;
    content?: string;
  } | null>(null);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to immediately flush any pending autosave to the server
  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;

    try {
      await fetch(`/api/documents/${pending.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pending.title !== undefined ? { title: pending.title } : {}),
          ...(pending.content !== undefined ? { content: pending.content } : {}),
        }),
      });
    } catch (err) {
      console.error("Flush autosave failed:", err);
    }
  }, []);

  // Load active document content when activeDocId changes
  useEffect(() => {
    let ignore = false;

    async function loadDocument() {
      // Flush previous document changes if any
      await flushPendingSave();

      if (!activeDocId) {
        if (!ignore) {
          setActiveDocData(null);
          setContentLoading(false);
        }
        return;
      }

      if (!ignore) {
        setContentLoading(true);
      }

      try {
        const res = await fetch(`/api/documents/${activeDocId}`);
        if (!res.ok) throw new Error("Failed to load document");
        const data = await res.json();
        if (!ignore) {
          setActiveDocData({
            id: activeDocId,
            title: sanitizeTitle(data.title),
            content: sanitizeContent(data.content),
          });
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          toast.error("Failed to load document content");
        }
      } finally {
        if (!ignore) {
          setContentLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      ignore = true;
    };
  }, [activeDocId, flushPendingSave]);

  // Debounced title autosave handler
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!activeDocId) return;

      const formattedTitle = newTitle.trim() || "Untitled";

      setActiveDocData((prev) =>
        prev && prev.id === activeDocId ? { ...prev, title: newTitle } : prev
      );
      onUpdateTitleLocally?.(activeDocId, formattedTitle);

      pendingSaveRef.current = {
        id: activeDocId,
        title: formattedTitle,
        content:
          pendingSaveRef.current?.id === activeDocId
            ? pendingSaveRef.current.content
            : undefined,
      };

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const pending = pendingSaveRef.current;
        if (!pending || pending.id !== activeDocId) return;
        pendingSaveRef.current = null;

        try {
          await fetch(`/api/documents/${activeDocId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: formattedTitle,
              ...(pending.content !== undefined ? { content: pending.content } : {}),
            }),
          });
        } catch (err) {
          console.error("Autosave title failed:", err);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [activeDocId, onUpdateTitleLocally]
  );

  // Debounced content autosave handler
  const handleContentChange = useCallback(
    (markdown: string) => {
      if (!activeDocId) return;

      setActiveDocData((prev) =>
        prev && prev.id === activeDocId ? { ...prev, content: markdown } : prev
      );

      pendingSaveRef.current = {
        id: activeDocId,
        title:
          pendingSaveRef.current?.id === activeDocId
            ? pendingSaveRef.current.title
            : undefined,
        content: markdown,
      };

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const pending = pendingSaveRef.current;
        if (!pending || pending.id !== activeDocId) return;
        pendingSaveRef.current = null;

        try {
          await fetch(`/api/documents/${activeDocId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: markdown,
              ...(pending.title !== undefined ? { title: pending.title } : {}),
            }),
          });
        } catch (err) {
          console.error("Autosave content failed:", err);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [activeDocId]
  );

  return {
    activeDocData,
    contentLoading,
    handleTitleChange,
    handleContentChange,
    flushPendingSave,
  };
}
