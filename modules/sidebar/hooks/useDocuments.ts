"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarDocument } from "../types";

export function useDocuments(initialDocId?: string | null) {
  const [documents, setDocuments] = useState<SidebarDocument[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<SidebarDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId ?? null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const [docsRes, archivedRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/documents?archived=true"),
      ]);

      if (!docsRes.ok) throw new Error("Failed to load documents");
      const data: SidebarDocument[] = await docsRes.json();
      setDocuments(data);
      setActiveDocId((prev) => prev ?? (data.length > 0 ? data[0].id : null));

      if (archivedRes.ok) {
        const archivedData: SidebarDocument[] = await archivedRes.json();
        setArchivedDocuments(archivedData);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [docsRes, archivedRes] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/documents?archived=true"),
        ]);

        if (!docsRes.ok) throw new Error("Failed to load documents");
        const data: SidebarDocument[] = await docsRes.json();
        if (!ignore) {
          setDocuments(data);
          setActiveDocId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
        }

        if (archivedRes.ok) {
          const archivedData: SidebarDocument[] = await archivedRes.json();
          if (!ignore) {
            setArchivedDocuments(archivedData);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          toast.error("Could not load documents");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const createNewDocument = useCallback(
    async (title = "", content = "") => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) throw new Error("Failed to create document");
        const newDoc = await res.json();
        setDocuments((prev) => [newDoc, ...prev]);
        setActiveDocId(newDoc.id);
        return newDoc;
      } catch (err) {
        console.error(err);
        toast.error("Could not create document");
        return null;
      }
    },
    []
  );

  const archiveDoc = useCallback(
    async (id: string) => {
      try {
        const docToArchive = documents.find((d) => d.id === id);
        if (docToArchive) {
          setDocuments((prev) => prev.filter((d) => d.id !== id));
          setArchivedDocuments((prev) => [
            { ...docToArchive, isArchived: true },
            ...prev.filter((d) => d.id !== id),
          ]);
        }

        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete document");

        setActiveDocId((current) => {
          if (current !== id) return current;
          const remaining = documents.filter((d) => d.id !== id);
          return remaining.length > 0 ? remaining[0].id : null;
        });

        toast.success("Document moved to trash");
      } catch (err) {
        console.error(err);
        toast.error("Could not delete document");
      }
    },
    [documents]
  );

  const restoreDoc = useCallback(
    async (id: string) => {
      try {
        const docToRestore = archivedDocuments.find((d) => d.id === id);
        if (docToRestore) {
          setArchivedDocuments((prev) => prev.filter((d) => d.id !== id));
          setDocuments((prev) => [{ ...docToRestore, isArchived: false }, ...prev]);
        }

        const res = await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false }),
        });
        if (!res.ok) throw new Error("Failed to restore document");

        setActiveDocId(id);
        toast.success("Document restored");
      } catch (err) {
        console.error(err);
        toast.error("Could not restore document");
      }
    },
    [archivedDocuments]
  );

  const emptyTrash = useCallback(async () => {
    try {
      setArchivedDocuments([]);
      const res = await fetch("/api/documents?trash=true", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to empty trash");
      toast.success("Trash emptied");
    } catch (err) {
      console.error(err);
      toast.error("Failed to empty trash");
    }
  }, []);

  const togglePinDoc = useCallback(
    async (id: string, currentPin: boolean) => {
      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: !currentPin }),
        });
        if (!res.ok) throw new Error("Failed to update pin");
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, isPinned: !currentPin } : d))
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to update pin status");
      }
    },
    []
  );

  const updateDocTitleLocally = useCallback((id: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
    );
  }, []);

  const renameDoc = useCallback(async (id: string, newTitle: string) => {
    try {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
      );
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to rename");
    } catch (err) {
      console.error(err);
      toast.error("Failed to rename document");
    }
  }, []);

  return {
    documents,
    archivedDocuments,
    activeDocId,
    setActiveDocId,
    loading,
    fetchDocuments,
    createNewDocument,
    deleteDoc: archiveDoc,
    restoreDoc,
    emptyTrash,
    togglePinDoc,
    updateDocTitleLocally,
    renameDoc,
  };
}