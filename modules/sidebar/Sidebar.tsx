"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  X,
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
  onToggleOpen,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
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
        onClick: () => onDeleteDoc(doc.id),
      },
    ];

    return (
      <div
        key={doc.id}
        className={styles.docRow}
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
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className={styles.floatingToggleWrap}
            initial={{ opacity: 0, scale: 0.85, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <IconButton
              variant="subtle"
              size="lg"
              onClick={onToggleOpen}
              tooltip="Open Sidebar (⌘\)"
              className={styles.collapsedToggle}
            >
              <ChevronRight size={17} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        className={styles.sidebar}
        initial={false}
        animate={{
          width: isOpen ? 240 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 38,
        }}
      >
        <div className={styles.inner}>
          {/* Quiet Header (Workspace + Actions) */}
          <div className={styles.header}>
            <span className={styles.workspaceLabel}>Workspace</span>

            <div className={styles.headerActions}>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                tooltip="Quick Search"
                className={isSearchOpen ? styles.activeHeaderBtn : undefined}
              >
                <Search size={14} />
              </IconButton>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={onCreateDoc}
                tooltip="New Document"
              >
                <Plus size={15} />
              </IconButton>
            </div>
          </div>

          {/* Collapsible Search Box */}
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

          {/* Document Lists */}
          <div className={styles.docList}>
            {pinnedDocs.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionLabel}>Pinned</span>
                </div>
                {pinnedDocs.map(renderDocRow)}
              </div>
            )}

            <div className={styles.section}>
              {pinnedDocs.length > 0 && (
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionLabel}>Documents</span>
                </div>
              )}
              {normalDocs.length === 0 && pinnedDocs.length === 0 ? (
                <div className={styles.emptyState}>
                  {searchQuery ? "No matching documents" : "No documents yet"}
                </div>
              ) : (
                normalDocs.map(renderDocRow)
              )}
            </div>
          </div>

          {/* Quiet Sidebar Footer (Local DB Synced status) */}
          <div className={styles.footer}>
            <span className={styles.syncStatus}>
              <span className={styles.syncDot} />
              Local DB Synced
            </span>
            <span className={styles.docTotalCount}>
              {documents.length} {documents.length === 1 ? "note" : "notes"}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}