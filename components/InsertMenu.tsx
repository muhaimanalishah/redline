"use client";

import { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { ChevronDown, Pilcrow, Heading1, Heading2, Heading3, Heading4 } from "lucide-react";
import styles from "./InsertMenu.module.css";

interface InsertMenuProps {
  editor: Editor;
}

const LEVELS: { level: 1 | 2 | 3 | 4; label: string; Icon: typeof Heading1 }[] = [
  { level: 1, label: "Heading 1", Icon: Heading1 },
  { level: 2, label: "Heading 2", Icon: Heading2 },
  { level: 3, label: "Heading 3", Icon: Heading3 },
  { level: 4, label: "Heading 4", Icon: Heading4 },
];

export default function InsertMenu({ editor }: InsertMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const activeLevel = LEVELS.find(({ level }) => editor.isActive("heading", { level }));
  const CurrentIcon = activeLevel?.Icon ?? Pilcrow;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        title="Text style"
        aria-label="Text style"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CurrentIcon size={16} />
        <ChevronDown size={12} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.menu} role="menu" aria-label="Text styles">
          <button
            type="button"
            className={styles.item}
            data-active={editor.isActive("paragraph") && !editor.isActive("heading")}
            role="menuitem"
            onClick={() => {
              editor.chain().focus().setParagraph().run();
              setOpen(false);
            }}
          >
            <Pilcrow size={15} />
            Normal text
          </button>
          {LEVELS.map(({ level, label, Icon }) => (
            <button
              key={level}
              type="button"
              className={styles.item}
              data-active={editor.isActive("heading", { level })}
              role="menuitem"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level }).run();
                setOpen(false);
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
