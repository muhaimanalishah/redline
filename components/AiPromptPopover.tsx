"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
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

export type ActivePresetView = "root" | PresetCategory;

export interface MenuItemDef {
  id: string;
  label: string;
  Icon: LucideIcon;
  action: () => void;
  isBack?: boolean;
  hasSubmenu?: boolean;
}

interface AiPromptPopoverProps {
  anchorRect: DOMRect;
  loading: boolean;
  activeView: ActivePresetView;
  highlightedIndex: number;
  onHighlightIndex: (idx: number) => void;
  onChangeView: (view: ActivePresetView) => void;
  onSelectPreset: (presetId: PresetId) => void | Promise<void>;
  onClose: () => void;
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
  loading,
  activeView,
  highlightedIndex,
  onHighlightIndex,
  onChangeView,
  onSelectPreset,
  onClose,
}: AiPromptPopoverProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, loading]);

  const menuItems = useMemo<MenuItemDef[]>(() => {
    if (activeView === "root") {
      const items: MenuItemDef[] = [];

      // 1. Proofread preset
      const proofreadConfig = PRESETS.proofread;
      if (proofreadConfig) {
        items.push({
          id: proofreadConfig.id,
          label: proofreadConfig.label,
          Icon: ICON_MAP[proofreadConfig.iconName] ?? SpellCheck,
          action: () => onSelectPreset(proofreadConfig.id),
        });
      }

      // 2. Preset category entries
      PRESET_CATEGORIES.forEach((cat) => {
        items.push({
          id: cat.id,
          label: cat.label,
          Icon: ICON_MAP[cat.iconName] ?? List,
          action: () => onChangeView(cat.id),
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
        action: () => onChangeView("root"),
        isBack: true,
      },
    ];

    const categoryPresets = getPresetsByCategory(activeView);
    categoryPresets.forEach((preset) => {
      subItems.push({
        id: preset.id,
        label: preset.label,
        Icon: ICON_MAP[preset.iconName] ?? FileText,
        action: () => onSelectPreset(preset.id),
      });
    });

    return subItems;
  }, [activeView, onSelectPreset, onChangeView]);

  return createPortal(
    <div
      ref={wrapRef}
      className={styles.wrap}
      style={{ left: `${anchorRect.left + anchorRect.width / 2}px`, top: `${anchorRect.top}px` }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Presets"
    >
      <div className={styles.popover}>
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
                  onMouseEnter={() => onHighlightIndex(idx)}
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
                onMouseEnter={() => onHighlightIndex(idx)}
                disabled={loading}
                onClick={item.action}
                role="menuitem"
              >
                <span className={styles.itemLabel}>
                  <ItemIcon size={16} className={styles.itemIcon} />
                  <span>{item.label}</span>
                </span>
                {item.hasSubmenu && <ChevronRight size={15} className={styles.chevron} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
