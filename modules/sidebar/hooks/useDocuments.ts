"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SidebarDocument } from "../types";

export function useDocuments(initialDocId?: string | null) {
  const queryClient = useQueryClient();
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId ?? null);

  // 1. Fetch active documents
  const {
    data: documents = [],
    isLoading: docsLoading,
  } = useQuery<SidebarDocument[]>({
    queryKey: ["documents", "active"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  // 2. Fetch archived documents
  const {
    data: archivedDocuments = [],
  } = useQuery<SidebarDocument[]>({
    queryKey: ["documents", "archived"],
    queryFn: async () => {
      const res = await fetch("/api/documents?archived=true");
      if (!res.ok) throw new Error("Failed to load archived documents");
      return res.json();
    },
  });

  // 3. Create document mutation
  const createMutation = useMutation({
    mutationFn: async ({ title = "", content = "" }: { title: string; content: string }) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: (newDoc: SidebarDocument) => {
      queryClient.setQueryData<SidebarDocument[]>(["documents", "active"], (prev = []) => [
        newDoc,
        ...prev,
      ]);
      queryClient.setQueryData(["document", newDoc.id], {
        id: newDoc.id,
        title: newDoc.title || "Untitled",
        content: "",
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Could not create document");
    },
  });

  const createNewDocument = useCallback(
    async (title = "", content = "") => {
      return createMutation.mutateAsync({ title, content });
    },
    [createMutation]
  );

  // 4. Archive document mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive document");
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      const previousActive = queryClient.getQueryData<SidebarDocument[]>(["documents", "active"]) || [];
      const previousArchived = queryClient.getQueryData<SidebarDocument[]>(["documents", "archived"]) || [];

      const docToArchive = previousActive.find((d) => d.id === id);
      if (docToArchive) {
        queryClient.setQueryData<SidebarDocument[]>(
          ["documents", "active"],
          previousActive.filter((d) => d.id !== id)
        );
        queryClient.setQueryData<SidebarDocument[]>(
          ["documents", "archived"],
          [{ ...docToArchive, isArchived: true }, ...previousArchived]
        );
      }

      return { previousActive, previousArchived };
    },
    onError: (_err, _id, context) => {
      if (context) {
        queryClient.setQueryData(["documents", "active"], context.previousActive);
        queryClient.setQueryData(["documents", "archived"], context.previousArchived);
      }
      toast.error("Could not delete document");
    },
    onSuccess: () => {
      toast.success("Document moved to trash");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteDoc = useCallback(
    async (id: string) => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  // 5. Restore document mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      if (!res.ok) throw new Error("Failed to restore document");
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      const previousActive = queryClient.getQueryData<SidebarDocument[]>(["documents", "active"]) || [];
      const previousArchived = queryClient.getQueryData<SidebarDocument[]>(["documents", "archived"]) || [];

      const docToRestore = previousArchived.find((d) => d.id === id);
      if (docToRestore) {
        queryClient.setQueryData<SidebarDocument[]>(
          ["documents", "archived"],
          previousArchived.filter((d) => d.id !== id)
        );
        queryClient.setQueryData<SidebarDocument[]>(
          ["documents", "active"],
          [{ ...docToRestore, isArchived: false }, ...previousActive]
        );
      }

      return { previousActive, previousArchived };
    },
    onError: (_err, _id, context) => {
      if (context) {
        queryClient.setQueryData(["documents", "active"], context.previousActive);
        queryClient.setQueryData(["documents", "archived"], context.previousArchived);
      }
      toast.error("Could not restore document");
    },
    onSuccess: (id) => {
      setActiveDocId(id);
      toast.success("Document restored");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const restoreDoc = useCallback(
    async (id: string) => {
      return restoreMutation.mutateAsync(id);
    },
    [restoreMutation]
  );

  // 6. Empty trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/documents?trash=true", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to empty trash");
      return true;
    },
    onMutate: async () => {
      const previousArchived = queryClient.getQueryData<SidebarDocument[]>(["documents", "archived"]) || [];
      queryClient.setQueryData<SidebarDocument[]>(["documents", "archived"], []);
      return { previousArchived };
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(["documents", "archived"], context.previousArchived);
      }
      toast.error("Failed to empty trash");
    },
    onSuccess: () => {
      toast.success("Trash emptied");
      queryClient.invalidateQueries({ queryKey: ["documents", "archived"] });
    },
  });

  const emptyTrash = useCallback(async () => {
    return emptyTrashMutation.mutateAsync();
  }, [emptyTrashMutation]);

  // 7. Toggle pin mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin");
      return { id, isPinned };
    },
    onMutate: async ({ id, isPinned }) => {
      queryClient.setQueryData<SidebarDocument[]>(["documents", "active"], (prev = []) =>
        prev.map((d) => (d.id === id ? { ...d, isPinned } : d))
      );
    },
    onError: () => {
      toast.error("Failed to update pin status");
      queryClient.invalidateQueries({ queryKey: ["documents", "active"] });
    },
  });

  const togglePinDoc = useCallback(
    async (id: string, currentPin: boolean) => {
      return togglePinMutation.mutateAsync({ id, isPinned: !currentPin });
    },
    [togglePinMutation]
  );

  // 8. Local & server title updates
  const updateDocTitleLocally = useCallback(
    (id: string, newTitle: string) => {
      queryClient.setQueryData<SidebarDocument[]>(["documents", "active"], (prev = []) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
      );
    },
    [queryClient]
  );

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      return { id, title };
    },
    onMutate: async ({ id, title }) => {
      updateDocTitleLocally(id, title);
    },
    onError: () => {
      toast.error("Failed to rename document");
      queryClient.invalidateQueries({ queryKey: ["documents", "active"] });
    },
  });

  const renameDoc = useCallback(
    async (id: string, newTitle: string) => {
      return renameMutation.mutateAsync({ id, title: newTitle });
    },
    [renameMutation]
  );

  return {
    documents,
    archivedDocuments,
    activeDocId,
    setActiveDocId,
    loading: docsLoading,
    createNewDocument,
    deleteDoc,
    restoreDoc,
    emptyTrash,
    togglePinDoc,
    updateDocTitleLocally,
    renameDoc,
  };
}