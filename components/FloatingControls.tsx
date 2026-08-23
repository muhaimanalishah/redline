"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Editor, useEditorState } from "@tiptap/react";
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
} from "lucide-react";
import { toast } from "sonner";
import InsertMenu from "./InsertMenu";
import UrlPopover from "./UrlPopover";
import AiPromptPopover, { ActivePresetView, MenuItemDef } from "./AiPromptPopover";
import ReviewAllFloatingMenu from "./ReviewAllFloatingMenu";
import AudioVisualizer from "./AudioVisualizer";
import { DiffPluginKey } from "./DiffExtension";
import {
  PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  PresetId,
} from "@/lib/ai/presets";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import styles from "./FloatingControls.module.css";

interface FloatingControlsProps {
  editor: Editor;
  hasSelection: boolean;
  issueCount?: number;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onAiSubmit?: (prompt: string) => Promise<void>;
  onSelectPreset?: (preset: PresetId) => Promise<void>;
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
  const [isTranscribing, setIsTranscribing] = useState(false);

  const imageBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  const handleAudioError = useCallback((err: string) => {
    toast.error(err);
  }, []);

  const handleFinishRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleMaxDurationReached = useCallback(() => {
    toast.info("Maximum recording limit reached (3:00). Transcribing...");
    handleFinishRecordingRef.current();
  }, []);

  const {
    isRecording,
    isPaused,
    durationSeconds,
    audioAmplitudes,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    stopAndGetBlob,
  } = useAudioRecorder({
    maxDurationSeconds: 180,
    onMaxDurationReached: handleMaxDurationReached,
    onError: handleAudioError,
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

    // Auto-focus input and set anchor rect after render
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

  // Compute current preset menu items for keyboard navigation and popover
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
          Icon: Sparkles,
          action: () => handleSelectPreset(proofreadConfig.id),
        });
      }
      PRESET_CATEGORIES.forEach((cat) => {
        items.push({
          id: cat.id,
          label: cat.label,
          Icon: Sparkles,
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
        Icon: Sparkles,
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
        Icon: Sparkles,
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
      stopRecording();
      setSavedRange(null);
      setIsTranscribing(false);
    } else {
      closePopover();
      closeAiDock();
      const { from, to, empty } = editor.state.selection;
      setSavedRange(empty ? { from, to } : { from, to });
      await startRecording();
    }
  }, [isRecording, isTranscribing, stopRecording, closePopover, closeAiDock, editor, startRecording]);

  const handleDiscardRecording = useCallback(() => {
    stopRecording();
    setSavedRange(null);
    setIsTranscribing(false);
  }, [stopRecording]);

  const handleTogglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, resumeRecording, pauseRecording]);

  const handleFinishRecording = useCallback(async () => {
    if (isTranscribing) return;

    const rangeToUse = savedRange || {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    setIsTranscribing(true);

    try {
      const blob = await stopAndGetBlob();

      if (!blob || blob.size === 0) {
        stopRecording();
        setSavedRange(null);
        setIsTranscribing(false);
        return;
      }

      // Highlight target range while transcribing
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_PROCESSING_RANGE",
          range: rangeToUse,
        })
      );

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errMsg = errorData?.error || "Voice transcription failed";
        toast.error(errMsg);
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: null,
          })
        );
        stopRecording();
        setSavedRange(null);
        setIsTranscribing(false);
        return;
      }

      const data = (await res.json()) as { text?: string };
      const transcribedText = (data.text || "").trim();

      if (!transcribedText) {
        toast.info("No speech detected");
        editor.view.dispatch(
          editor.state.tr.setMeta(DiffPluginKey, {
            type: "SET_PROCESSING_RANGE",
            range: null,
          })
        );
        stopRecording();
        setSavedRange(null);
        setIsTranscribing(false);
        return;
      }

      const originalText =
        rangeToUse.from !== rangeToUse.to
          ? editor.state.doc.textBetween(rangeToUse.from, rangeToUse.to, " ")
          : "";

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "ADD_DIFF_ISSUE",
          issue: {
            id: crypto.randomUUID(),
            type: "ai",
            original: originalText,
            suggestion: transcribedText,
            range: rangeToUse,
          },
        })
      );

      toast.success("Voice transcription ready for review");
      stopRecording();
      setSavedRange(null);
    } catch (err: unknown) {
      console.error("Transcription error:", err);
      const errMsg = err instanceof Error ? err.message : "Voice transcription failed";
      toast.error(errMsg);
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_PROCESSING_RANGE",
          range: null,
        })
      );
      stopRecording();
      setSavedRange(null);
    } finally {
      setIsTranscribing(false);
    }
  }, [isTranscribing, savedRange, editor, stopAndGetBlob, stopRecording]);

  handleFinishRecordingRef.current = handleFinishRecording;

  const showRecordingDock = isRecording || isTranscribing;
  const showAiDock = isAiDockOpen || aiLoading;
  const hasActiveSelection = Boolean(savedRange) || hasSelection;

  return (
    <aside aria-label="Editor controls" className={styles.dockContainer}>
      {showRecordingDock ? (
        <div
          ref={dockRef}
          className={styles.recordingDock}
          role="region"
          aria-label="Voice recording dock"
        >
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDiscard}`}
            onClick={handleDiscardRecording}
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
              onClick={handleTogglePause}
              disabled={isTranscribing}
              title={isPaused ? "Resume recording" : "Pause recording"}
              aria-label={isPaused ? "Resume recording" : "Pause recording"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDone}`}
              onClick={handleFinishRecording}
              disabled={isTranscribing}
              title={isTranscribing ? "Transcribing voice note..." : "Done & transcribe"}
              aria-label={isTranscribing ? "Transcribing voice note..." : "Done & transcribe"}
            >
              {isTranscribing ? <Loader2 size={16} className={styles.spin} /> : <Check size={16} />}
            </button>
          </div>
        </div>
      ) : showAiDock ? (
        <div
          ref={dockRef}
          className={styles.aiDock}
          role="region"
          aria-label="AI Prompt Input dock"
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
        </div>
      ) : (
        <div
          ref={dockRef}
          className={styles.floatingDock}
          role="toolbar"
          aria-label="Formatting toolbar"
        >
          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isBold ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            aria-label="Bold"
          >
            <Bold size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isItalic ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            aria-label="Italic"
          >
            <Italic size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isUnderline ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
            aria-label="Underline"
          >
            <Underline size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isStrike ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isCode ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
            aria-label="Inline code"
          >
            <Code size={17} />
          </button>

          <div className={styles.divider} />

          <InsertMenu editor={editor} />

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isBulletList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            aria-label="Bullet list"
          >
            <List size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isOrderedList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <ListOrdered size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isTaskList ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Task list"
            aria-label="Task list"
          >
            <ListChecks size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isBlockquote ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Quote size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isCodeBlock ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
            aria-label="Code block"
          >
            <Code2 size={17} />
          </button>

          <button
            type="button"
            className={styles.btn}
            data-active={editorState?.isTable ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Table"
            aria-label="Insert table"
          >
            <Table size={17} />
          </button>

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

          <div className={styles.divider} />

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
        </div>
      )}

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


