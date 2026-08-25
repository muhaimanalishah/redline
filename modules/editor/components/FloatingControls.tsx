"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Code,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code2,
  Table,
  Minus,
  ImageIcon,
  Link2,
  Sparkles,
  Mic,
  X,
  Check,
  Pause,
  Play,
  ArrowUp,
  LoaderCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import InsertMenu from "./InsertMenu";
import UrlPopover from "./UrlPopover";
import AiPromptPopover, { ActivePresetView, MenuItemDef, ICON_MAP } from "./AiPromptPopover";
import ReviewAllFloatingMenu from "./ReviewAllFloatingMenu";
import AudioVisualizer from "./AudioVisualizer";
import { DiffPluginKey } from "@/modules/editor/extensions/DiffExtension";
import {
  PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  PresetId,
} from "@/modules/editor/lib/ai/presets";
import { useVoiceTranscription } from "@/modules/editor/hooks/useVoiceTranscription";
import styles from "./FloatingControls.module.css";

interface FloatingControlsProps {
  editor: Editor;
  hasSelection: boolean;
  issueCount?: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAiSubmit?: (prompt: string) => Promise<void>;
  onSelectPreset?: (presetId: PresetId) => Promise<void>;
  aiLoading?: boolean;
}

type PendingUrlField = "image" | "link" | null;

interface PendingUrl {
  field: PendingUrlField;
  anchorRect: DOMRect;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

const INLINE_FORMAT_BUTTONS = [
  { id: "bold", label: "Bold", icon: Bold, activeKey: "isBold" as const, action: (ed: Editor) => ed.chain().focus().toggleBold().run() },
  { id: "italic", label: "Italic", icon: Italic, activeKey: "isItalic" as const, action: (ed: Editor) => ed.chain().focus().toggleItalic().run() },
  { id: "underline", label: "Underline", icon: Underline, activeKey: "isUnderline" as const, action: (ed: Editor) => ed.chain().focus().toggleUnderline().run() },
  { id: "strike", label: "Strikethrough", icon: Strikethrough, activeKey: "isStrike" as const, action: (ed: Editor) => ed.chain().focus().toggleStrike().run() },
  { id: "code", label: "Inline code", icon: Code, activeKey: "isCode" as const, action: (ed: Editor) => ed.chain().focus().toggleCode().run() },
];

const BLOCK_FORMAT_BUTTONS = [
  { id: "bulletList", label: "Bullet list", icon: List, activeKey: "isBulletList" as const, action: (ed: Editor) => ed.chain().focus().toggleBulletList().run() },
  { id: "orderedList", label: "Numbered list", icon: ListOrdered, activeKey: "isOrderedList" as const, action: (ed: Editor) => ed.chain().focus().toggleOrderedList().run() },
  { id: "taskList", label: "Task list", icon: ListChecks, activeKey: "isTaskList" as const, action: (ed: Editor) => ed.chain().focus().toggleTaskList().run() },
  { id: "blockquote", label: "Blockquote", icon: Quote, activeKey: "isBlockquote" as const, action: (ed: Editor) => ed.chain().focus().toggleBlockquote().run() },
  { id: "codeBlock", label: "Code block", icon: Code2, activeKey: "isCodeBlock" as const, action: (ed: Editor) => ed.chain().focus().toggleCodeBlock().run() },
  { id: "table", label: "Table", icon: Table, activeKey: "isTable" as const, action: (ed: Editor) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export default function FloatingControls({
  editor,
  hasSelection,
  issueCount = 0,
  onAcceptAll,
  onRejectAll,
  onAiSubmit,
  onSelectPreset,
  aiLoading = false,
}: FloatingControlsProps) {
  const [pendingUrl, setPendingUrl] = useState<PendingUrl | null>(null);
  const [isAiDockOpen, setIsAiDockOpen] = useState(false);
  const [aiPromptValue, setAiPromptValue] = useState("");
  const [aiAnchorRect, setAiAnchorRect] = useState<DOMRect | null>(null);
  const [savedRange, setSavedRange] = useState<{ from: number; to: number } | null>(null);
  const [activePresetView, setActivePresetView] = useState<ActivePresetView>("root");
  const [highlightedPresetIndex, setHighlightedPresetIndex] = useState<number>(-1);

  const imageBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    isPaused,
    isTranscribing,
    durationSeconds,
    audioAmplitudes,
    startRecording,
    discardRecording,
    togglePause,
    finishRecording,
  } = useVoiceTranscription({
    editor,
    savedRange,
    onClearSavedRange: () => setSavedRange(null),
  });

  // Official TipTap React reactive state hook for toolbar sync
  const editorState = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      isBold: ed.isActive("bold"),
      isItalic: ed.isActive("italic"),
      isUnderline: ed.isActive("underline"),
      isStrike: ed.isActive("strike"),
      isCode: ed.isActive("code"),
      isBulletList: ed.isActive("bulletList"),
      isOrderedList: ed.isActive("orderedList"),
      isTaskList: ed.isActive("taskList"),
      isBlockquote: ed.isActive("blockquote"),
      isCodeBlock: ed.isActive("codeBlock"),
      isTable: ed.isActive("table"),
      isLink: ed.isActive("link"),
    }),
  });

  const closePopover = useCallback(() => setPendingUrl(null), []);

  const openPopover = useCallback((field: "image" | "link") => {
    setPendingUrl((prev) => {
      if (prev?.field === field) return null;
      const anchorRect = dockRef.current?.getBoundingClientRect();
      return anchorRect ? { field, anchorRect } : null;
    });
  }, []);

  const handleImageSubmit = useCallback(
    (url: string) => {
      if (editor.isFocused) {
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        editor
          .chain()
          .focus("end")
          .insertContent({ type: "paragraph" })
          .setImage({ src: url })
          .run();
      }
      closePopover();
    },
    [editor, closePopover]
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      closePopover();
    },
    [editor, closePopover]
  );

  const closeAiDock = useCallback(() => {
    editor.view.dispatch(
      editor.state.tr.setMeta(DiffPluginKey, {
        type: "SET_ACTIVE_SELECTION_RANGE",
        range: null,
      })
    );
    setIsAiDockOpen(false);
    setAiPromptValue("");
    setSavedRange(null);
    setAiAnchorRect(null);
    setActivePresetView("root");
    setHighlightedPresetIndex(-1);
  }, [editor]);

  const openAiDock = useCallback(() => {
    closePopover();
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      setSavedRange({ from, to });
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_ACTIVE_SELECTION_RANGE",
          range: { from, to },
        })
      );
    } else {
      setSavedRange(null);
    }

    setIsAiDockOpen(true);
    setActivePresetView("root");
    setHighlightedPresetIndex(-1);

    setTimeout(() => {
      aiInputRef.current?.focus();
      const rect = dockRef.current?.getBoundingClientRect();
      if (rect) setAiAnchorRect(rect);
    }, 10);
  }, [editor, closePopover]);

  const handleSelectPreset = useCallback(
    async (preset: PresetId) => {
      const rangeToUse = savedRange;
      closeAiDock();
      if (rangeToUse) {
        editor.commands.setTextSelection(rangeToUse);
      }
      await onSelectPreset?.(preset);
    },
    [savedRange, closeAiDock, editor, onSelectPreset]
  );

  const currentMenuItems = useMemo<MenuItemDef[]>(() => {
    const hasActiveSelection = Boolean(savedRange) || hasSelection;
    if (!hasActiveSelection) return [];

    if (activePresetView === "root") {
      const items: MenuItemDef[] = [];
      const proofreadConfig = PRESETS.proofread;
      if (proofreadConfig) {
        items.push({
          id: proofreadConfig.id,
          label: proofreadConfig.label,
          Icon: ICON_MAP[proofreadConfig.iconName] ?? Sparkles,
          action: () => handleSelectPreset(proofreadConfig.id),
        });
      }
      PRESET_CATEGORIES.forEach((cat) => {
        items.push({
          id: cat.id,
          label: cat.label,
          Icon: ICON_MAP[cat.iconName] ?? Sparkles,
          action: () => {
            setHighlightedPresetIndex(-1);
            setActivePresetView(cat.id);
          },
          hasSubmenu: true,
        });
      });
      return items;
    }

    const subItems: MenuItemDef[] = [
      {
        id: "back",
        label: "Back",
        Icon: ChevronLeft,
        action: () => {
          setHighlightedPresetIndex(-1);
          setActivePresetView("root");
        },
        isBack: true,
      },
    ];

    const categoryPresets = getPresetsByCategory(activePresetView);
    categoryPresets.forEach((preset) => {
      subItems.push({
        id: preset.id,
        label: preset.label,
        Icon: ICON_MAP[preset.iconName] ?? Sparkles,
        action: () => handleSelectPreset(preset.id),
      });
    });

    return subItems;
  }, [savedRange, hasSelection, activePresetView, handleSelectPreset]);

  const handleAiCustomSubmit = useCallback(async () => {
    const trimmed = aiPromptValue.trim();
    if (!trimmed || aiLoading) return;

    const rangeToUse = savedRange;
    closeAiDock();
    if (rangeToUse) {
      editor.commands.setTextSelection(rangeToUse);
    }
    await onAiSubmit?.(trimmed);
  }, [aiPromptValue, aiLoading, savedRange, closeAiDock, editor, onAiSubmit]);

  const handleAiInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (activePresetView !== "root") {
        setActivePresetView("root");
        setHighlightedPresetIndex(-1);
      } else {
        closeAiDock();
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedPresetIndex >= 0 &&
        highlightedPresetIndex < currentMenuItems.length
      ) {
        currentMenuItems[highlightedPresetIndex].action();
      } else {
        handleAiCustomSubmit();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      if (currentMenuItems.length > 0) {
        e.preventDefault();
        setHighlightedPresetIndex((prev) =>
          prev < currentMenuItems.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === "ArrowUp") {
      if (currentMenuItems.length > 0 && highlightedPresetIndex >= 0) {
        e.preventDefault();
        setHighlightedPresetIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
      return;
    }
  };

  const handleMicClick = useCallback(async () => {
    if (isRecording || isTranscribing) {
      discardRecording();
    } else {
      closePopover();
      closeAiDock();
      const { from, to } = editor.state.selection;
      setSavedRange({ from, to });
      await startRecording();
    }
  }, [isRecording, isTranscribing, discardRecording, closePopover, closeAiDock, editor, startRecording]);

  const showRecordingDock = isRecording || isTranscribing;
  const showAiDock = isAiDockOpen || aiLoading;
  const hasActiveSelection = Boolean(savedRange) || hasSelection;

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      <motion.div
        ref={dockRef}
        layout
        transition={{ type: "spring", stiffness: 450, damping: 35 }}
        style={{ display: "flex", alignItems: "center" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {showRecordingDock ? (
            <motion.div
              key="recording-dock"
              className={styles.recordingDock}
              role="region"
              aria-label="Voice recording dock"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDiscard}`}
                onClick={discardRecording}
                disabled={isTranscribing}
                title="Cancel recording"
                aria-label="Cancel recording"
              >
                <X size={17} />
              </button>

              <div className={styles.recordingCenter}>
                <AudioVisualizer amplitudes={isTranscribing ? new Array(28).fill(0.08) : audioAmplitudes} />
                <span
                  className={styles.recordingTimer}
                  data-paused={isPaused}
                  aria-label={`Recording duration: ${formatDuration(durationSeconds)} of 3 minutes`}
                >
                  {formatDuration(durationSeconds)} / 03:00
                </span>
              </div>

              <div className={styles.recordingActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPause}`}
                  onClick={togglePause}
                  disabled={isTranscribing}
                  title={isPaused ? "Resume recording" : "Pause recording"}
                  aria-label={isPaused ? "Resume recording" : "Pause recording"}
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDone}`}
                  onClick={finishRecording}
                  disabled={isTranscribing}
                  title={isTranscribing ? "Transcribing voice note..." : "Done & transcribe"}
                  aria-label={isTranscribing ? "Transcribing voice note..." : "Done & transcribe"}
                >
                  {isTranscribing ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
                </button>
              </div>
            </motion.div>
          ) : showAiDock ? (
            <motion.div
              key="ai-dock"
              className={styles.aiDock}
              role="region"
              aria-label="AI Prompt Input dock"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDiscard}`}
                onClick={closeAiDock}
                disabled={aiLoading}
                title="Cancel AI prompt"
                aria-label="Cancel AI prompt"
              >
                <X size={17} />
              </button>

              <input
                ref={aiInputRef}
                type="text"
                className={styles.aiDockInput}
                placeholder={
                  hasActiveSelection
                    ? "Ask AI or select a preset above…"
                    : "Ask AI to write something…"
                }
                value={aiPromptValue}
                disabled={aiLoading}
                onChange={(e) => {
                  setAiPromptValue(e.target.value);
                  setHighlightedPresetIndex(-1);
                }}
                onKeyDown={handleAiInputKeyDown}
                aria-label="Ask AI prompt"
              />

              <button
                type="button"
                className={styles.aiDockSubmit}
                onClick={handleAiCustomSubmit}
                disabled={!aiPromptValue.trim() || aiLoading}
                title={aiLoading ? "Generating AI response..." : "Submit prompt"}
                aria-label={aiLoading ? "Generating AI response..." : "Submit prompt"}
              >
                {aiLoading ? (
                  <LoaderCircle size={15} strokeWidth={2.5} className={styles.spin} />
                ) : (
                  <ArrowUp size={15} strokeWidth={2.5} />
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="standard-dock"
              className={styles.floatingDock}
              role="toolbar"
              aria-label="Formatting toolbar"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {onAiSubmit && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnAi}`}
                  data-active={isAiDockOpen}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openAiDock}
                  title="Ask AI"
                  aria-label="Ask AI"
                >
                  <Sparkles size={17} />
                </button>
              )}

              <button
                type="button"
                className={`${styles.btn} ${styles.btnMic}`}
                data-active={isRecording}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleMicClick}
                title="Voice recording"
                aria-label="Start voice recording"
              >
                <Mic size={17} />
              </button>

              <div className={styles.divider} />

              {INLINE_FORMAT_BUTTONS.map(({ id, label, icon: Icon, activeKey, action }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.btn}
                  data-active={editorState?.[activeKey] ?? false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => action(editor)}
                  title={label}
                  aria-label={label}
                >
                  <Icon size={17} />
                </button>
              ))}

              <div className={styles.divider} />

              <InsertMenu editor={editor} />

              {BLOCK_FORMAT_BUTTONS.map(({ id, label, icon: Icon, activeKey, action }) => (
                <button
                  key={id}
                  type="button"
                  className={styles.btn}
                  data-active={editorState?.[activeKey] ?? false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => action(editor)}
                  title={label}
                  aria-label={label}
                >
                  <Icon size={17} />
                </button>
              ))}

              <button
                type="button"
                className={styles.btn}
                disabled={hasSelection}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title={hasSelection ? "Deselect text to insert a horizontal rule" : "Horizontal rule"}
                aria-label="Insert horizontal rule"
              >
                <Minus size={17} />
              </button>

              <button
                ref={imageBtnRef}
                type="button"
                className={styles.btn}
                data-active={pendingUrl?.field === "image"}
                onClick={() => openPopover("image")}
                title="Image"
                aria-label="Insert image"
              >
                <ImageIcon size={17} />
              </button>

              <button
                ref={linkBtnRef}
                type="button"
                className={styles.btn}
                data-active={(editorState?.isLink ?? false) || pendingUrl?.field === "link"}
                onClick={() => openPopover("link")}
                title="Link"
                aria-label="Insert link"
              >
                <Link2 size={17} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ReviewAllFloatingMenu
        issueCount={issueCount}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />

      {pendingUrl?.field === "image" && (
        <UrlPopover
          label="Image URL"
          placeholder="https://example.com/image.png"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleImageSubmit}
          onClose={closePopover}
        />
      )}

      {pendingUrl?.field === "link" && (
        <UrlPopover
          label="Link URL"
          placeholder="https://example.com"
          anchorRect={pendingUrl.anchorRect}
          onSubmit={handleLinkSubmit}
          onClose={closePopover}
        />
      )}

      {isAiDockOpen && hasActiveSelection && aiAnchorRect && (
        <AiPromptPopover
          anchorRect={aiAnchorRect}
          loading={aiLoading}
          activeView={activePresetView}
          highlightedIndex={highlightedPresetIndex}
          onHighlightIndex={setHighlightedPresetIndex}
          onChangeView={setActivePresetView}
          onSelectPreset={handleSelectPreset}
          onClose={closeAiDock}
        />
      )}
    </aside>
  );
}
