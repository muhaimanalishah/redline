"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Editor, DiffIssue, ExecuteAiOptions } from "@/modules/editor";
import { Sidebar, useDocuments } from "@/modules/sidebar";
import { CommandPalette } from "@/modules/shared";
import styles from "./page.module.css";

const AUTOSAVE_DELAY_MS = 600;

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [issues, setIssues] = useState<DiffIssue[]>([]);
  const [activeDocData, setActiveDocData] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

  const {
    documents,
    activeDocId,
    setActiveDocId,
    loading: docsLoading,
    createNewDocument,
    deleteDoc,
    togglePinDoc,
    updateDocTitleLocally,
    renameDoc,
  } = useDocuments();

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
          let content = data.content || "";
          let title = data.title || "";
          if (title === "Untitled") {
            title = "";
          }
          if (content === "# Untitled\n\n" || content === "# Untitled\n" || content === "# Untitled") {
            content = "";
          }
          setActiveDocData({
            id: activeDocId,
            title,
            content,
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

      setActiveDocData((prev) =>
        prev && prev.id === activeDocId ? { ...prev, title: newTitle } : prev
      );
      updateDocTitleLocally(activeDocId, newTitle.trim() || "Untitled");

      pendingSaveRef.current = {
        id: activeDocId,
        title: newTitle.trim() || "Untitled",
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
              title: newTitle.trim() || "Untitled",
              ...(pending.content !== undefined ? { content: pending.content } : {}),
            }),
          });
        } catch (err) {
          console.error("Autosave title failed:", err);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [activeDocId, updateDocTitleLocally]
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

  // AI execution handler
  const handleAiExecute = async (options: ExecuteAiOptions): Promise<string> => {
    const payload =
      options.mode === "preset"
        ? {
            mode: "preset",
            preset: options.preset,
            text: options.selectedText || "",
          }
        : {
            mode: "custom",
            prompt: options.prompt,
            text: options.selectedText || "",
          };

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? "AI request failed";
      toast.error(message);
      throw new Error(message);
    }

    if (!res.body) throw new Error("No response body received");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }
    fullText += decoder.decode();

    return fullText;
  };

  // Keyboard shortcuts: Cmd/Ctrl + \ (toggle sidebar), Cmd/Ctrl + K or P (search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "\\") {
          e.preventDefault();
          setIsSidebarOpen((prev) => !prev);
        } else if (e.key === "k" || e.key === "K" || e.key === "p" || e.key === "P") {
          e.preventDefault();
          setIsSearchPaletteOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isDocReady = !docsLoading && !contentLoading && activeDocData && activeDocData.id === activeDocId;

  return (
    <div className={styles.container}>
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        onCreateDoc={() => createNewDocument("Untitled", "")}
        onDeleteDoc={deleteDoc}
        onTogglePinDoc={togglePinDoc}
        onRenameDoc={renameDoc}
        onOpenSearch={() => setIsSearchPaletteOpen(true)}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
      />

      <main className={styles.main}>
        {isDocReady ? (
          <Editor
            key={activeDocData.id}
            title={activeDocData.title}
            titlePlaceholder="New page"
            initialContent={activeDocData.content}
            issues={issues}
            onChange={handleContentChange}
            onTitleChange={handleTitleChange}
            onIssuesChange={setIssues}
            placeholder="Write something, or '/' for commands..."
            onAiExecute={handleAiExecute}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        ) : activeDocId ? (
          <div className={styles.loadingState}>Loading document...</div>
        ) : (
          <div className={styles.emptyContainer}>
            <h2>No document selected</h2>
            <p>Select a document from the sidebar or create a new one to begin.</p>
            <button
              type="button"
              className={styles.emptyActionBtn}
              onClick={() => createNewDocument("Untitled", "")}
            >
              Create New Page
            </button>
          </div>
        )}
      </main>

      <CommandPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        onSelectDoc={(id) => {
          setActiveDocId(id);
        }}
      />
    </div>
  );
}