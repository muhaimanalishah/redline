"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, PanelLeft } from "lucide-react";
import { Editor, EditorSkeleton, DiffIssue, useAiExecution } from "@/modules/editor";
import { Sidebar, useDocuments, useActiveDocument } from "@/modules/sidebar";
import {
  CommandPalette,
  DemoBanner,
  MobileNotice,
  useAppShortcuts,
  useIsMobile,
} from "@/modules/shared";
import styles from "./page.module.css";

interface AppClientProps {
  routeDocId?: string | null;
}

export default function AppClient({ routeDocId = null }: AppClientProps) {
  const router = useRouter();
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
  } = useDocuments(routeDocId);

  // Sync activeDocId when route changes (e.g. browser back/forward)
  useEffect(() => {
    setActiveDocId(routeDocId ?? null);
  }, [routeDocId, setActiveDocId]);

  const handleNotFound = useCallback(() => {
    setActiveDocId(null);
    router.replace("/");
  }, [router, setActiveDocId]);

  const {
    activeDocData,
    contentLoading,
    handleTitleChange,
    handleContentChange,
  } = useActiveDocument(activeDocId, updateDocTitleLocally, handleNotFound);

  const { handleAiExecute } = useAiExecution();

  const handleToggleSidebar = () => {
    setSidebarToggled((prev) => !(prev ?? !isMobile));
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    router.push("/" + id);
    if (isMobile) {
      setSidebarToggled(false);
    }
  };

  const handleCreateDoc = async () => {
    const newDoc = await createNewDocument("Untitled", "");
    if (newDoc && newDoc.id) {
      setActiveDocId(newDoc.id);
      router.push("/" + newDoc.id);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (id === activeDocId) {
      setActiveDocId(null);
      router.replace("/");
    }
    await deleteDoc(id);
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
          loadingDocId={contentLoading ? activeDocId : null}
          loading={docsLoading}
          onSelectDoc={handleSelectDoc}
          onCreateDoc={handleCreateDoc}
          onDeleteDoc={handleDeleteDoc}
          onRestoreDoc={restoreDoc}
          onEmptyTrash={emptyTrash}
          onTogglePinDoc={togglePinDoc}
          onRenameDoc={renameDoc}
          onOpenSearch={() => setIsSearchPaletteOpen(true)}
          isOpen={isSidebarOpen}
          onToggleOpen={handleToggleSidebar}
        />

        <main className={styles.main}>
          {activeDocId && isDocReady ? (
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
          ) : activeDocId && contentLoading ? (
            <EditorSkeleton
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={handleToggleSidebar}
            />
          ) : (
            <div className={styles.emptyContainer}>
              <div className={styles.emptyCard}>
                <div className={styles.emptyIconCircle}>
                  <FileText size={28} />
                </div>
                <h2>No document selected</h2>
                <p>Choose a page from the sidebar or start writing in a fresh page.</p>

                <div className={styles.emptyActionsRow}>
                  <button
                    type="button"
                    className={styles.emptyActionBtn}
                    onClick={handleCreateDoc}
                  >
                    <Plus size={15} strokeWidth={2.2} />
                    <span>Create New Page</span>
                  </button>

                  <button
                    type="button"
                    className={styles.emptySecondaryBtn}
                    onClick={() => setIsSearchPaletteOpen(true)}
                  >
                    <Search size={14} />
                    <span>Search Pages (⌘K)</span>
                  </button>

                  {!isSidebarOpen && (
                    <button
                      type="button"
                      className={styles.emptySecondaryBtn}
                      onClick={handleToggleSidebar}
                      title="Open Sidebar"
                    >
                      <PanelLeft size={14} />
                      <span>Open Sidebar (⌘\)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <CommandPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        onSelectDoc={handleSelectDoc}
      />
    </div>
  );
}
