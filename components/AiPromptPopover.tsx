"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  LoaderCircle,
  SpellCheck,
  MoveHorizontal,
  SlidersHorizontal,
  Table,
  List,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  FileText,
  Briefcase,
  Smile,
  Zap,
  GraduationCap,
} from "lucide-react";
import { PresetId } from "@/lib/ai";
import styles from "./AiPromptPopover.module.css";

interface AiPromptPopoverProps {
  anchorRect: DOMRect;
  hasSelection: boolean;
  loading: boolean;
  onSubmit: (prompt: string) => void | Promise<void>;
  onSelectPreset?: (presetId: PresetId) => void | Promise<void>;
  onClose: () => void;
}

type ActiveView = "root" | "length" | "tone" | "format";

interface MenuItemDef {
  id: string;
  label: string;
  Icon: typeof SpellCheck;
  action: () => void;
  hasSubmenu?: boolean;
}

export default function AiPromptPopover({
  anchorRect,
  hasSelection,
  loading,
  onSubmit,
  onSelectPreset,
  onClose,
}: AiPromptPopoverProps) {
  const [value, setValue] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("root");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Reset highlight index and focus input on view changes
  useEffect(() => {
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [activeView]);

  useEffect(() => {
    if (loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeView !== "root") {
          setActiveView("root");
        } else {
          onClose();
        }
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, loading, activeView]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !loading) onSubmit(trimmed);
  };

  const handlePresetClick = (presetId: PresetId) => {
    if (loading) return;
    onSelectPreset?.(presetId);
  };

  // Build current menu items list for keyboard navigation
  const getMenuItems = (): MenuItemDef[] => {
    if (!hasSelection) return [];

    if (activeView === "root") {
      return [
        {
          id: "proofread",
          label: "Proofread & Fix",
          Icon: SpellCheck,
          action: () => handlePresetClick("proofread"),
        },
        {
          id: "length",
          label: "Adjust Length",
          Icon: MoveHorizontal,
          action: () => setActiveView("length"),
          hasSubmenu: true,
        },
        {
          id: "tone",
          label: "Change Tone",
          Icon: SlidersHorizontal,
          action: () => setActiveView("tone"),
          hasSubmenu: true,
        },
        {
          id: "format",
          label: "Format",
          Icon: List,
          action: () => setActiveView("format"),
          hasSubmenu: true,
        },
      ];
    }

    if (activeView === "length") {
      return [
        {
          id: "back",
          label: "Back",
          Icon: ChevronLeft,
          action: () => setActiveView("root"),
        },
        {
          id: "shorten",
          label: "Shorten",
          Icon: Minimize2,
          action: () => handlePresetClick("shorten"),
        },
        {
          id: "expand",
          label: "Expand",
          Icon: Maximize2,
          action: () => handlePresetClick("expand"),
        },
        {
          id: "summarize",
          label: "Summarize",
          Icon: FileText,
          action: () => handlePresetClick("summarize"),
        },
      ];
    }

    if (activeView === "tone") {
      return [
        {
          id: "back",
          label: "Back",
          Icon: ChevronLeft,
          action: () => setActiveView("root"),
        },
        {
          id: "tone-professional",
          label: "Professional",
          Icon: Briefcase,
          action: () => handlePresetClick("tone-professional"),
        },
        {
          id: "tone-casual",
          label: "Casual",
          Icon: Smile,
          action: () => handlePresetClick("tone-casual"),
        },
        {
          id: "tone-direct",
          label: "Direct",
          Icon: Zap,
          action: () => handlePresetClick("tone-direct"),
        },
        {
          id: "tone-academic",
          label: "Academic",
          Icon: GraduationCap,
          action: () => handlePresetClick("tone-academic"),
        },
      ];
    }

    if (activeView === "format") {
      return [
        {
          id: "back",
          label: "Back",
          Icon: ChevronLeft,
          action: () => setActiveView("root"),
        },
        {
          id: "format-bullet-list",
          label: "Bullet List",
          Icon: List,
          action: () => handlePresetClick("format-bullet-list"),
        },
        {
          id: "format-table",
          label: "Table",
          Icon: Table,
          action: () => handlePresetClick("format-table"),
        },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < menuItems.length) {
        menuItems[highlightedIndex].action();
      } else {
        handleSubmit(e);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      if (menuItems.length > 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === "ArrowUp") {
      if (menuItems.length > 0 && highlightedIndex >= 0) {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
      return;
    }
  };

  return createPortal(
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ left: `${anchorRect.left + anchorRect.width / 2}px`, top: `${anchorRect.top}px` }}
    >
      <div className={`${styles.popover} ${hasSelection ? styles.hasPresets : ""}`}>
        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder={
              hasSelection
                ? "Ask AI or choose a preset below…"
                : "Ask AI to write something…"
            }
            value={value}
            disabled={loading}
            onChange={(e) => {
              setValue(e.target.value);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            rows={1}
          />
          <button
            type="submit"
            className={styles.submit}
            aria-label={loading ? "Generating" : "Submit prompt"}
            disabled={!value.trim() || loading}
          >
            {loading ? (
              <LoaderCircle size={15} strokeWidth={2.5} className={styles.spin} />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} />
            )}
          </button>
        </form>

        {hasSelection && (
          <div className={styles.menuSection}>
            {activeView === "root" && (
              <>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 0}
                  disabled={loading}
                  onClick={() => handlePresetClick("proofread")}
                >
                  <span className={styles.itemLabel}>
                    <SpellCheck size={16} className={styles.itemIcon} />
                    <span>Proofread & Fix</span>
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 1}
                  disabled={loading}
                  onClick={() => setActiveView("length")}
                >
                  <span className={styles.itemLabel}>
                    <MoveHorizontal size={16} className={styles.itemIcon} />
                    <span>Adjust Length</span>
                  </span>
                  <ChevronRight size={15} className={styles.chevron} />
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 2}
                  disabled={loading}
                  onClick={() => setActiveView("tone")}
                >
                  <span className={styles.itemLabel}>
                    <SlidersHorizontal size={16} className={styles.itemIcon} />
                    <span>Change Tone</span>
                  </span>
                  <ChevronRight size={15} className={styles.chevron} />
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 3}
                  disabled={loading}
                  onClick={() => setActiveView("format")}
                >
                  <span className={styles.itemLabel}>
                    <List size={16} className={styles.itemIcon} />
                    <span>Format</span>
                  </span>
                  <ChevronRight size={15} className={styles.chevron} />
                </button>
              </>
            )}

            {activeView === "length" && (
              <>
                <button
                  type="button"
                  className={styles.backBtn}
                  data-highlighted={highlightedIndex === 0}
                  onClick={() => setActiveView("root")}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 1}
                  disabled={loading}
                  onClick={() => handlePresetClick("shorten")}
                >
                  <span className={styles.itemLabel}>
                    <Minimize2 size={16} className={styles.itemIcon} />
                    <span>Shorten</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 2}
                  disabled={loading}
                  onClick={() => handlePresetClick("expand")}
                >
                  <span className={styles.itemLabel}>
                    <Maximize2 size={16} className={styles.itemIcon} />
                    <span>Expand</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 3}
                  disabled={loading}
                  onClick={() => handlePresetClick("summarize")}
                >
                  <span className={styles.itemLabel}>
                    <FileText size={16} className={styles.itemIcon} />
                    <span>Summarize</span>
                  </span>
                </button>
              </>
            )}

            {activeView === "tone" && (
              <>
                <button
                  type="button"
                  className={styles.backBtn}
                  data-highlighted={highlightedIndex === 0}
                  onClick={() => setActiveView("root")}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 1}
                  disabled={loading}
                  onClick={() => handlePresetClick("tone-professional")}
                >
                  <span className={styles.itemLabel}>
                    <Briefcase size={16} className={styles.itemIcon} />
                    <span>Professional</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 2}
                  disabled={loading}
                  onClick={() => handlePresetClick("tone-casual")}
                >
                  <span className={styles.itemLabel}>
                    <Smile size={16} className={styles.itemIcon} />
                    <span>Casual</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 3}
                  disabled={loading}
                  onClick={() => handlePresetClick("tone-direct")}
                >
                  <span className={styles.itemLabel}>
                    <Zap size={16} className={styles.itemIcon} />
                    <span>Direct</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 4}
                  disabled={loading}
                  onClick={() => handlePresetClick("tone-academic")}
                >
                  <span className={styles.itemLabel}>
                    <GraduationCap size={16} className={styles.itemIcon} />
                    <span>Academic</span>
                  </span>
                </button>
              </>
            )}

            {activeView === "format" && (
              <>
                <button
                  type="button"
                  className={styles.backBtn}
                  data-highlighted={highlightedIndex === 0}
                  onClick={() => setActiveView("root")}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 1}
                  disabled={loading}
                  onClick={() => handlePresetClick("format-bullet-list")}
                >
                  <span className={styles.itemLabel}>
                    <List size={16} className={styles.itemIcon} />
                    <span>Bullet List</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={highlightedIndex === 2}
                  disabled={loading}
                  onClick={() => handlePresetClick("format-table")}
                >
                  <span className={styles.itemLabel}>
                    <Table size={16} className={styles.itemIcon} />
                    <span>Table</span>
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
