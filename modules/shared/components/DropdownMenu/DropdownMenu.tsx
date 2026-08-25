"use client";

import React, { useRef } from "react";
import { useClickOutside } from "@/modules/editor/hooks/useClickOutside";
import styles from "./DropdownMenu.module.css";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  isOpen,
  onClose,
  items,
  align = "right",
  className,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`${styles.menu} ${styles[align]} ${className || ""}`}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.item} ${item.danger ? styles.danger : ""}`}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {Icon && <Icon size={14} className={styles.icon} />}
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
