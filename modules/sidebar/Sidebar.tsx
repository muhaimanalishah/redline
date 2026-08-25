"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  MoreHorizontal,
  Pencil,
  X,
  Archive,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { IconButton, DropdownMenu, DropdownMenuItem } from "@/modules/shared";
import { SidebarDocument } from "./types";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  documents: SidebarDocument[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onTogglePinDoc: (id: string, currentPin: boolean) => void;
  onRenameDoc?: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onTogglePinDoc,
  onRenameDoc,
  isOpen,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"normal" | "trash">("normal");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [archivedDocs, setArchivedDocs] = useState<SidebarDocument[]>([]);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((d) =>
      (d.title || "Untitled").toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const pinnedDocs = useMemo(() => filteredDocs.filter((d) => d.isPinned), [filteredDocs]);
  const normalDocs = useMemo(() => filteredDocs.filter((d) => !d.isPinned), [filteredDocs]);

  useEffect(() => {
    if (editingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

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
    setArchivedDocs((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
    onDeleteDoc(doc.id);
  };

  const handleRestore = (doc: SidebarDocument) => {
    setArchivedDocs((prev) => prev.filter((d) => d.id !== doc.id));
    onCreateDoc();
  };

  const handleEmptyTrash = () => {
    setArchivedDocs([]);
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
            <span className={styles.workspaceLabel}>Workspace</span>
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
              className={`${styles.actionBtnFull} ${isSearchOpen ? styles.actionBtnActive : ""}`}
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Search Documents"
            >
              <Search size={14} />
              <span>Search</span>
            </button>

            {/* Collapsible Search Input (Full border-radius) */}
            <AnimatePresence>
              {(isSearchOpen || searchQuery) && (
                <motion.div
                  className={styles.searchWrap}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Search size={13} className={styles.searchIcon} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search notes…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.searchClearBtn}
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. DOCUMENTS / TRASH SCROLLABLE LIST */}
          <div className={styles.docList}>
            {currentView === "normal" ? (
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
                      <div className={styles.emptyState}>
                        {searchQuery ? "No matching documents" : "No documents yet"}
                      </div>
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
                    {archivedDocs.length === 0 ? (
                      <div className={styles.emptyState}>Trash is empty</div>
                    ) : (
                      archivedDocs.map((doc) => (
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
  );
}