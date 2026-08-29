"use client";

import { useState } from "react";
import { Editor, DiffIssue, useAiExecution } from "@/modules/editor";
import { Sidebar, useDocuments, useActiveDocument } from "@/modules/sidebar";
import { CommandPalette, useAppShortcuts } from "@/modules/shared";
import styles from "./page.module.css";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [issues, setIssues] = useState<DiffIssue[]>([]);

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

  const {
    activeDocData,
    contentLoading,
    handleTitleChange,
    handleContentChange,
  } = useActiveDocument(activeDocId, updateDocTitleLocally);

  const { handleAiExecute } = useAiExecution();

  useAppShortcuts({
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    onOpenSearch: () => setIsSearchPaletteOpen((prev) => !prev),
  });

  const isDocReady =
    !docsLoading &&
    !contentLoading &&
    activeDocData &&
    activeDocData.id === activeDocId;

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
            placeholder="Start typing..."
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