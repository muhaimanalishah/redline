"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PanelLeftClose,
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  MoreHorizontal,
  Pencil,
  Archive,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { IconButton, DropdownMenu, DropdownMenuItem } from "@/modules/shared";
import { SidebarDocument } from "./types";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  documents: SidebarDocument[];
  archivedDocuments?: SidebarDocument[];
  activeDocId: string | null;
  loading?: boolean;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onRestoreDoc?: (id: string) => void;
  onEmptyTrash?: () => void;
  onTogglePinDoc: (id: string, currentPin: boolean) => void;
  onRenameDoc?: (id: string, newTitle: string) => void;
  onOpenSearch?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({
  documents,
  archivedDocuments = [],
  activeDocId,
  loading = false,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onRestoreDoc,
  onEmptyTrash,
  onTogglePinDoc,
  onRenameDoc,
  onOpenSearch,
  isOpen,
  onToggleOpen,
}: SidebarProps) {
  const [currentView, setCurrentView] = useState<"normal" | "trash">("normal");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const renameInputRef = useRef<HTMLInputElement>(null);

  const pinnedDocs = useMemo(() => documents.filter((d) => d.isPinned), [documents]);
  const normalDocs = useMemo(() => documents.filter((d) => !d.isPinned), [documents]);

  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

  const startRenaming = (doc: SidebarDocument) => {
    setEditingId(doc.id);
    setEditTitle(doc.title || "Untitled");
    setMenuOpenId(null);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editTitle.trim();
    if (trimmed && onRenameDoc) {
      onRenameDoc(id, trimmed);
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleDelete = (doc: SidebarDocument) => {
    onDeleteDoc(doc.id);
  };

  const handleRestore = (doc: SidebarDocument) => {
    onRestoreDoc?.(doc.id);
  };

  const handleEmptyTrash = () => {
    onEmptyTrash?.();
  };

  const renderDocRow = (doc: SidebarDocument) => {
    const isActive = doc.id === activeDocId;
    const isMenuOpen = menuOpenId === doc.id;
    const isEditing = editingId === doc.id;

    const menuItems: DropdownMenuItem[] = [
      {
        id: "rename",
        label: "Rename",
        icon: Pencil,
        onClick: () => startRenaming(doc),
      },
      {
        id: "pin",
        label: doc.isPinned ? "Unpin Note" : "Pin to Top",
        icon: Pin,
        onClick: () => onTogglePinDoc(doc.id, doc.isPinned),
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        danger: true,
        onClick: () => handleDelete(doc),
      },
    ];

    return (
      <div
        key={doc.id}
        className={styles.docItem}
        data-active={isActive}
        onClick={() => {
          if (!isEditing) onSelectDoc(doc.id);
        }}
      >
        <FileText size={14} className={styles.docIcon} />

        {isEditing ? (
          <input
            ref={renameInputRef}
            type="text"
            className={styles.inlineRenameInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => handleSaveRename(doc.id)}
            onKeyDown={(e) => handleRenameKeyDown(e, doc.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.docTitle} title={doc.title || "Untitled"}>
            {doc.title || "Untitled"}
          </span>
        )}

        {!isEditing && (
          <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
            <IconButton
              size="sm"
              variant="ghost"
              className={`${styles.actionBtn} ${doc.isPinned ? styles.pinnedBtn : ""}`}
              onClick={() => onTogglePinDoc(doc.id, doc.isPinned)}
              tooltip={doc.isPinned ? "Unpin" : "Pin"}
            >
              <Pin size={12} className={doc.isPinned ? styles.pinnedIcon : undefined} />
            </IconButton>

            <div className={styles.menuAnchor}>
              <IconButton
                size="sm"
                variant="ghost"
                className={styles.actionBtn}
                onClick={() => setMenuOpenId(isMenuOpen ? null : doc.id)}
                tooltip="Options"
              >
                <MoreHorizontal size={13} />
              </IconButton>

              <DropdownMenu
                isOpen={isMenuOpen}
                onClose={() => setMenuOpenId(null)}
                items={menuItems}
                align="right"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={styles.backdrop}
        data-open={isOpen}
        onClick={onToggleOpen}
        aria-hidden="true"
      />
      <motion.aside
        className={styles.sidebar}
        initial={false}
        animate={{
          width: isOpen ? 256 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 38,
        }}
      >
        <div className={styles.inner}>
          {/* 1. TOP HEADER */}
          <div className={styles.header}>
            {currentView === "trash" ? (
              <button
                type="button"
                className={styles.backHeaderBtn}
                onClick={() => setCurrentView("normal")}
                title="Back to Notes"
              >
                <ArrowLeft size={13} />
                <span>Back to Notes</span>
              </button>
            ) : (
              <div className={styles.headerTitleRow}>
                <span className={styles.workspaceLabel}>Workspace</span>
                <button
                  type="button"
                  className={styles.collapseBtn}
                  onClick={onToggleOpen}
                  title="Collapse Sidebar"
                  aria-label="Collapse Sidebar"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            )}
          </div>

          {/* 2. TOP ACTION BUTTONS (Full border-radius) */}
          <div className={styles.actionButtonsContainer}>
            <button
              type="button"
              className={styles.actionBtnFull}
              onClick={onCreateDoc}
              title="Create New Page"
            >
              <Plus size={15} strokeWidth={2.2} />
              <span>New Page</span>
            </button>

            <button
              type="button"
              className={styles.actionBtnFull}
              onClick={onOpenSearch}
              title="Search Documents (Cmd+K)"
            >
              <Search size={14} />
              <span>Search</span>
            </button>
          </div>

          {/* 3. DOCUMENTS / TRASH SCROLLABLE LIST */}
          <div className={styles.docList}>
            {loading ? (
              <div className={styles.skeletonContainer} aria-label="Loading documents">
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.skeletonHeader} />
                  </div>
                  <div className={styles.sectionItems}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={styles.skeletonRow}>
                        <div className={styles.skeletonIcon} />
                        <div
                          className={styles.skeletonLine}
                          style={{
                            width: i === 1 ? "75%" : i === 2 ? "55%" : i === 3 ? "85%" : i === 4 ? "60%" : "70%",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : currentView === "normal" ? (
              <div className={styles.viewNormal}>
                {/* PINNED SECTION (Rendered ONLY when pinned docs exist) */}
                {pinnedDocs.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>Pinned</span>
                    </div>
                    <div className={styles.sectionItems}>{pinnedDocs.map(renderDocRow)}</div>
                  </div>
                )}

                {/* DOCUMENTS SECTION (ALWAYS VISIBLE) */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Documents</span>
                  </div>
                  <div className={styles.sectionItems}>
                    {normalDocs.length === 0 && pinnedDocs.length === 0 ? (
                      <div className={styles.emptyState}>No documents yet</div>
                    ) : (
                      normalDocs.map(renderDocRow)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* TRASH / ARCHIVED VIEW */
              <div className={styles.viewTrash}>
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionLabel}>Archived</span>
                  </div>
                  <div className={styles.sectionItems}>
                    {archivedDocuments.length === 0 ? (
                      <div className={styles.emptyState}>Trash is empty</div>
                    ) : (
                      archivedDocuments.map((doc) => (
                        <div key={doc.id} className={styles.trashDocItem}>
                          <div className={styles.trashDocLeft}>
                            <FileText size={14} className={styles.docIcon} />
                            <span className={styles.trashDocTitle}>{doc.title || "Untitled"}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.restoreBtn}
                            onClick={() => handleRestore(doc)}
                            title="Restore Document"
                          >
                            <RotateCcw size={11} />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. BOTTOM ACTION FOOTER */}
          <div className={styles.footer}>
            {currentView === "normal" ? (
              <button
                type="button"
                className={styles.subtleArchiveBtn}
                onClick={() => setCurrentView("trash")}
                title="View Archived Pages"
              >
                <Archive size={14} />
                <span>Archived Pages</span>
              </button>
            ) : (
              <div className={styles.trashFooterActions}>
                <button
                  type="button"
                  className={styles.emptyTrashBtn}
                  onClick={handleEmptyTrash}
                  title="Empty Trash"
                >
                  <Trash2 size={13} />
                  <span>Empty Trash</span>
                </button>
                <button
                  type="button"
                  className={styles.backToDocsBtn}
                  onClick={() => setCurrentView("normal")}
                  title="Back to Notes"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Notes</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}