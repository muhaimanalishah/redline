"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import {
  PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  PresetId,
  PresetCategory,
} from "@/lib/ai";
import styles from "./AiPromptPopover.module.css";

interface AiPromptPopoverProps {
  anchorRect: DOMRect;
  hasSelection: boolean;
  loading: boolean;
  onSubmit: (prompt: string) => void | Promise<void>;
  onSelectPreset?: (presetId: PresetId) => void | Promise<void>;
  onClose: () => void;
}

type ActiveView = "root" | PresetCategory;

interface MenuItemDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  action: () => void;
  isBack?: boolean;
  hasSubmenu?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  SpellCheck,
  MoveHorizontal,
  SlidersHorizontal,
  Table,
  List,
  Minimize2,
  Maximize2,
  FileText,
  Briefcase,
  Smile,
  Zap,
  GraduationCap,
};

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

  const changeView = (view: ActiveView) => {
    setHighlightedIndex(-1);
    setActiveView(view);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeView]);

  useEffect(() => {
    if (loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeView !== "root") {
          changeView("root");
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

  // Build current menu items list for keyboard navigation and rendering
  const menuItems = useMemo<MenuItemDef[]>(() => {
    if (!hasSelection) return [];

    if (activeView === "root") {
      const items: MenuItemDef[] = [];

      // 1. Proofread preset
      const proofreadConfig = PRESETS.proofread;
      if (proofreadConfig) {
        items.push({
          id: proofreadConfig.id,
          label: proofreadConfig.label,
          Icon: ICON_MAP[proofreadConfig.iconName] ?? SpellCheck,
          action: () => handlePresetClick(proofreadConfig.id),
        });
      }

      // 2. Preset category entries
      PRESET_CATEGORIES.forEach((cat) => {
        items.push({
          id: cat.id,
          label: cat.label,
          Icon: ICON_MAP[cat.iconName] ?? List,
          action: () => changeView(cat.id),
          hasSubmenu: true,
        });
      });

      return items;
    }

    // Category submenu
    const subItems: MenuItemDef[] = [
      {
        id: "back",
        label: "Back",
        Icon: ChevronLeft,
        action: () => changeView("root"),
        isBack: true,
      },
    ];

    const categoryPresets = getPresetsByCategory(activeView);
    categoryPresets.forEach((preset) => {
      subItems.push({
        id: preset.id,
        label: preset.label,
        Icon: ICON_MAP[preset.iconName] ?? FileText,
        action: () => handlePresetClick(preset.id),
      });
    });

    return subItems;
  }, [hasSelection, activeView, loading]);

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
      role="dialog"
      aria-modal="true"
      aria-label="AI Assistant"
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
            aria-label="Prompt input"
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

        {hasSelection && menuItems.length > 0 && (
          <div className={styles.menuSection} role="menu">
            {menuItems.map((item, idx) => {
              const isHighlighted = highlightedIndex === idx;
              const ItemIcon = item.Icon;

              if (item.isBack) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.backBtn}
                    data-highlighted={isHighlighted}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={item.action}
                    role="menuitem"
                  >
                    <ItemIcon size={16} className={styles.itemIcon} />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={styles.menuItem}
                  data-highlighted={isHighlighted}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  disabled={loading}
                  onClick={item.action}
                  role="menuitem"
                >
                  <span className={styles.itemLabel}>
                    <ItemIcon size={16} className={styles.itemIcon} />
                    <span>{item.label}</span>
                  </span>
                  {item.hasSubmenu && (
                    <ChevronRight size={15} className={styles.chevron} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
