"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Editor, DiffIssue, ExecuteAiOptions } from "@/modules/editor";
import { Sidebar, useDocuments } from "@/modules/sidebar";
import styles from "./page.module.css";

const AUTOSAVE_DELAY_MS = 600;

function extractDocumentTitle(markdown: string, fallback = "Untitled"): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  const firstLine = markdown.trim().split("\n")[0]?.replace(/^[#*->\s]+/, "").trim();
  return firstLine && firstLine.length > 0
    ? firstLine.slice(0, 40)
    : fallback;
}

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [issues, setIssues] = useState<DiffIssue[]>([]);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(true);

  const {
    documents,
    activeDocId,
    setActiveDocId,
    loading: docsLoading,
    createNewDocument,
    deleteDoc,
    togglePinDoc,
    renameDoc,
  } = useDocuments();

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active document content when activeDocId changes
  useEffect(() => {
    let ignore = false;

    async function loadDocument() {
      if (!activeDocId) {
        if (!ignore) {
          setCurrentContent("");
          setContentLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/documents/${activeDocId}`);
        if (!res.ok) throw new Error("Failed to load document");
        const data = await res.json();
        if (!ignore) {
          setCurrentContent(data.content || "");
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
  }, [activeDocId]);

  // Debounced autosave handler
  const handleContentChange = useCallback(
    (markdown: string) => {
      if (!activeDocId) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          const autoTitle = extractDocumentTitle(markdown);
          await fetch(`/api/documents/${activeDocId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: markdown, title: autoTitle }),
          });
          renameDoc(activeDocId, autoTitle);
        } catch (err) {
          console.error("Autosave failed:", err);
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [activeDocId, renameDoc]
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

  // Keyboard shortcut: Cmd/Ctrl + \ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.container}>
      <Sidebar
        documents={documents}
        activeDocId={activeDocId}
        onSelectDoc={setActiveDocId}
        onCreateDoc={() => createNewDocument("Untitled", "# Untitled\n\n")}
        onDeleteDoc={deleteDoc}
        onTogglePinDoc={togglePinDoc}
        onRenameDoc={renameDoc}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
      />

      <main className={styles.main}>
        {docsLoading || contentLoading ? (
          <div className={styles.loadingState}>Loading document...</div>
        ) : activeDocId ? (
          <Editor
            key={activeDocId}
            initialContent={currentContent}
            issues={issues}
            onChange={handleContentChange}
            onIssuesChange={setIssues}
            placeholder="Start writing here..."
            onAiExecute={handleAiExecute}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          />
        ) : (
          <div className={styles.emptyContainer}>
            <h2>No document selected</h2>
            <p>Select a document from the sidebar or create a new one to begin.</p>
            <button
              type="button"
              className={styles.emptyActionBtn}
              onClick={() => createNewDocument("Untitled", "# Untitled\n\n")}
            >
              Create New Page
            </button>
          </div>
        )}
      </main>
    </div>
  );
}