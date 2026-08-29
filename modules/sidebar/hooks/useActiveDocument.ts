"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  onUpdateTitleLocally?: (id: string, newTitle: string) => void,
  onNotFound?: () => void
) {
  const queryClient = useQueryClient();

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

  // Fetch document via TanStack Query (cached in memory)
  const {
    data: activeDocData = null,
    isLoading: isDocLoading,
    isError,
  } = useQuery<ActiveDocData | null>({
    queryKey: ["document", activeDocId],
    queryFn: async () => {
      if (!activeDocId) return null;
      await flushPendingSave();

      const res = await fetch(`/api/documents/${activeDocId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Document not found");
          onNotFound?.();
          return null;
        }
        throw new Error("Failed to load document");
      }

      const data = await res.json();
      if (data.isArchived) {
        toast.error("Document is in trash");
        onNotFound?.();
        return null;
      }

      return {
        id: activeDocId,
        title: sanitizeTitle(data.title),
        content: sanitizeContent(data.content),
      };
    },
    enabled: !!activeDocId,
  });

  // Handle errors
  useEffect(() => {
    if (isError && activeDocId) {
      toast.error("Document not found");
      onNotFound?.();
    }
  }, [isError, activeDocId, onNotFound]);

  // Debounced title autosave handler
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!activeDocId) return;

      const formattedTitle = newTitle.trim() || "Untitled";

      // Synchronously update query cache so the title renders immediately
      queryClient.setQueryData<ActiveDocData | null>(["document", activeDocId], (prev) =>
        prev ? { ...prev, title: newTitle } : { id: activeDocId, title: newTitle, content: "" }
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
    [activeDocId, onUpdateTitleLocally, queryClient]
  );

  // Debounced content autosave handler
  const handleContentChange = useCallback(
    (markdown: string) => {
      if (!activeDocId) return;

      // Synchronously update query cache so content edits are instant
      queryClient.setQueryData<ActiveDocData | null>(["document", activeDocId], (prev) =>
        prev ? { ...prev, content: markdown } : { id: activeDocId, title: "", content: markdown }
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
    [activeDocId, queryClient]
  );

  const contentLoading = !!activeDocId && isDocLoading && !activeDocData;

  return {
    activeDocData,
    contentLoading,
    handleTitleChange,
    handleContentChange,
    flushPendingSave,
  };
}
