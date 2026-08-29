"use client";

import { useState } from "react";
import { Editor, DiffIssue, useAiExecution } from "@/modules/editor";
import { Sidebar, useDocuments, useActiveDocument } from "@/modules/sidebar";
import {
  CommandPalette,
  DemoBanner,
  MobileNotice,
  useAppShortcuts,
  useIsMobile,
} from "@/modules/shared";
import styles from "./page.module.css";

export default function Home() {
  const isMobile = useIsMobile();
  const [sidebarToggled, setSidebarToggled] = useState<boolean | null>(null);
  const isSidebarOpen = sidebarToggled ?? !isMobile;
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [issues, setIssues] = useState<DiffIssue[]>([]);

  const {
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
  } = useDocuments();

  const {
    activeDocData,
    contentLoading,
    handleTitleChange,
    handleContentChange,
  } = useActiveDocument(activeDocId, updateDocTitleLocally);

  const { handleAiExecute } = useAiExecution();

  const handleToggleSidebar = () => {
    setSidebarToggled((prev) => !(prev ?? !isMobile));
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    if (isMobile) {
      setSidebarToggled(false);
    }
  };

  useAppShortcuts({
    onToggleSidebar: handleToggleSidebar,
    onOpenSearch: () => setIsSearchPaletteOpen((prev) => !prev),
  });

  const isDocReady =
    !docsLoading &&
    !contentLoading &&
    activeDocData &&
    activeDocData.id === activeDocId;

  return (
    <div className={styles.appWrapper}>
      <DemoBanner />
      <MobileNotice />
      <div className={styles.container}>
        <Sidebar
          documents={documents}
          archivedDocuments={archivedDocuments}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
          onCreateDoc={() => createNewDocument("Untitled", "")}
          onDeleteDoc={deleteDoc}
          onRestoreDoc={restoreDoc}
          onEmptyTrash={emptyTrash}
          onTogglePinDoc={togglePinDoc}
          onRenameDoc={renameDoc}
          onOpenSearch={() => setIsSearchPaletteOpen(true)}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
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
            onToggleSidebar={handleToggleSidebar}
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
      </div>

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