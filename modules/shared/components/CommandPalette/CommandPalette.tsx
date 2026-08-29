"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Pin, Search, X } from "lucide-react";
import styles from "./CommandPalette.module.css";

export interface SearchResultItem {
  id: string;
  title: string;
  snippet?: string | null;
  isPinned?: boolean;
  updatedAt?: string | Date;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) {
    return <span>{text}</span>;
  }

  // Split query into individual words for flexible matching
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (words.length === 0) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className={styles.highlight}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function CommandPaletteModal({
  onClose,
  onSelectDoc,
}: {
  onClose: () => void;
  onSelectDoc: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch results based on query
  useEffect(() => {
    let ignore = false;

    const timer = setTimeout(async () => {
      try {
        const url = query.trim()
          ? `/api/documents?q=${encodeURIComponent(query.trim())}`
          : `/api/documents`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResultItem[] = await res.json();
        if (!ignore) {
          setResults(data);
          setSelectedIndex(0);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setResults([]);
          setLoading(false);
        }
      }
    }, query.trim() ? 120 : 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Keep selected item in view
  useEffect(() => {
    if (results.length > 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, results]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectDoc(id);
      onClose();
    },
    [onSelectDoc, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className={styles.searchInput}
            placeholder="Search notes by title or content..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLoading(true);
            }}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setQuery("");
                setLoading(true);
              }}
              aria-label="Clear search query"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className={styles.resultsList}>
          {loading && results.length === 0 ? (
            <div className={styles.loadingState}>Searching notes...</div>
          ) : results.length === 0 ? (
            <div className={styles.emptyState}>
              {query ? `No documents found matching "${query}"` : "No documents available"}
            </div>
          ) : (
            results.map((doc, idx) => {
              const isSelected = idx === selectedIndex;
              const displayTitle = doc.title?.trim() || "Untitled";

              return (
                <div
                  key={doc.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  className={styles.resultItem}
                  data-selected={isSelected}
                  onClick={() => handleSelect(doc.id)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className={styles.docIconWrap}>
                    <FileText size={16} />
                  </div>
                  <div className={styles.resultContent}>
                    <div className={styles.resultTitleRow}>
                      <span className={styles.resultTitle}>
                        <HighlightMatch text={displayTitle} query={query} />
                      </span>
                      {doc.isPinned && (
                        <Pin size={12} className={styles.pinnedBadge} />
                      )}
                    </div>
                    {doc.snippet && (
                      <div className={styles.resultSnippet}>
                        <HighlightMatch text={doc.snippet} query={query} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerHints}>
            <span>
              <kbd className={styles.footerKey}>↑</kbd>
              <kbd className={styles.footerKey}>↓</kbd> to navigate
            </span>
            <span>
              <kbd className={styles.footerKey}>↵</kbd> to select
            </span>
            <span>
              <kbd className={styles.footerKey}>esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CommandPalette({ isOpen, onClose, onSelectDoc }: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <CommandPaletteModal onClose={onClose} onSelectDoc={onSelectDoc} />
      )}
    </AnimatePresence>
  );
}
