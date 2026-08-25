"use client";

import { useRef, useState } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import { ChevronDown, Pilcrow, Heading1, Heading2, Heading3, Heading4 } from "lucide-react";
import { useClickOutside } from "@/modules/editor/hooks/useClickOutside";
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

  useClickOutside(wrapRef, () => setOpen(false), open);

  const activeLevelNum = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (ed.isActive("heading", { level: 1 })) return 1;
      if (ed.isActive("heading", { level: 2 })) return 2;
      if (ed.isActive("heading", { level: 3 })) return 3;
      if (ed.isActive("heading", { level: 4 })) return 4;
      return null;
    },
  });

  const isParagraph = useEditorState({
    editor,
    selector: ({ editor: ed }) => ed.isActive("paragraph") && !ed.isActive("heading"),
  });

  const activeLevel = LEVELS.find(({ level }) => level === activeLevelNum);
  const CurrentIcon = activeLevel?.Icon ?? Pilcrow;


  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        data-active={!!activeLevel}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title={activeLevel ? activeLevel.label : "Text style"}
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
            data-active={isParagraph}
            role="menuitem"
            onMouseDown={(e) => e.preventDefault()}
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
              data-active={activeLevelNum === level}
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
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
