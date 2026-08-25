"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SidebarDocument } from "../types";

export function useDocuments(initialDocId?: string | null) {
  const [documents, setDocuments] = useState<SidebarDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocId ?? null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      const data: SidebarDocument[] = await res.json();
      setDocuments(data);
      setActiveDocId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
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
        const res = await fetch("/api/documents");
        if (!res.ok) throw new Error("Failed to load documents");
        const data: SidebarDocument[] = await res.json();
        if (!ignore) {
          setDocuments(data);
          setActiveDocId((prev) => prev ?? (data.length > 0 ? data[0].id : null));
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
    async (title = "Untitled", content = "") => {
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
        toast.success("Created new page");
        return newDoc;
      } catch (err) {
        console.error(err);
        toast.error("Could not create document");
        return null;
      }
    },
    []
  );

  const deleteDoc = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete document");
        setDocuments((prev) => {
          const next = prev.filter((d) => d.id !== id);
          return next;
        });
        setActiveDocId((current) => (current === id ? null : current));
        toast.success("Document deleted");
      } catch (err) {
        console.error(err);
        toast.error("Could not delete document");
      }
    },
    []
  );

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

  const renameDoc = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
      );
      toast.success("Renamed document");
    } catch (err) {
      console.error(err);
      toast.error("Failed to rename document");
    }
  }, []);

  return {
    documents,
    activeDocId,
    setActiveDocId,
    loading,
    fetchDocuments,
    createNewDocument,
    deleteDoc,
    togglePinDoc,
    renameDoc,
  };
}