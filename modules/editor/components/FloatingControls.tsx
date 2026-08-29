"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Pause,
  Play,
  ArrowUp,
  LoaderCircle,
  Loader2,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
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
  isAiDockOpen: boolean;
  onCloseAiDock: () => void;
  voiceTriggerRef?: React.MutableRefObject<(() => Promise<void>) | null>;
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
  isAiDockOpen,
  onCloseAiDock,
  voiceTriggerRef,
}: FloatingControlsProps) {
  const [aiPromptValue, setAiPromptValue] = useState("");
  const [aiAnchorRect, setAiAnchorRect] = useState<DOMRect | null>(null);
  const [savedRange, setSavedRange] = useState<{ from: number; to: number } | null>(null);
  const [activePresetView, setActivePresetView] = useState<ActivePresetView>("root");
  const [highlightedPresetIndex, setHighlightedPresetIndex] = useState<number>(-1);

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

  const handleVoiceTrigger = useCallback(async () => {
    if (isRecording || isTranscribing) {
      discardRecording();
    } else {
      onCloseAiDock();
      const { from, to } = editor.state.selection;
      setSavedRange({ from, to });
      await startRecording();
    }
  }, [isRecording, isTranscribing, discardRecording, onCloseAiDock, editor, startRecording]);

  useEffect(() => {
    if (voiceTriggerRef) {
      voiceTriggerRef.current = handleVoiceTrigger;
    }
  }, [voiceTriggerRef, handleVoiceTrigger]);

  const handleCloseAi = useCallback(() => {
    if (editor?.view) {
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_ACTIVE_SELECTION_RANGE",
          range: null,
        })
      );
    }
    setAiPromptValue("");
    setSavedRange(null);
    setAiAnchorRect(null);
    setActivePresetView("root");
    setHighlightedPresetIndex(-1);
    onCloseAiDock();
  }, [editor, onCloseAiDock]);

  // Position AI Anchor rect when AI dock opens
  useEffect(() => {
    if (!isAiDockOpen || !editor) return;

    const { from, to, empty } = editor.state.selection;
    if (!empty && editor.view) {
      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "SET_ACTIVE_SELECTION_RANGE",
          range: { from, to },
        })
      );
    }

    const timer = setTimeout(() => {
      aiInputRef.current?.focus();
      if (!empty) {
        setSavedRange({ from, to });
      } else {
        setSavedRange(null);
      }
      setActivePresetView("root");
      setHighlightedPresetIndex(-1);
      const rect = dockRef.current?.getBoundingClientRect();
      if (rect) setAiAnchorRect(rect);
    }, 10);

    return () => clearTimeout(timer);
  }, [isAiDockOpen, editor]);

  const handleSelectPreset = useCallback(
    async (preset: PresetId) => {
      const rangeToUse = savedRange;
      handleCloseAi();
      if (rangeToUse && editor) {
        editor.commands.setTextSelection(rangeToUse);
      }
      await onSelectPreset?.(preset);
    },
    [savedRange, handleCloseAi, editor, onSelectPreset]
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
    handleCloseAi();
    if (rangeToUse && editor) {
      editor.commands.setTextSelection(rangeToUse);
    }
    await onAiSubmit?.(trimmed);
  }, [aiPromptValue, aiLoading, savedRange, handleCloseAi, editor, onAiSubmit]);

  const handleAiInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (activePresetView !== "root") {
        setActivePresetView("root");
        setHighlightedPresetIndex(-1);
      } else {
        handleCloseAi();
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

  const showRecordingDock = isRecording || isTranscribing;
  const showAiDock = isAiDockOpen || aiLoading;
  const hasActiveSelection = Boolean(savedRange) || hasSelection;

  return (
    <>
      <aside aria-label="Editor active controls" className={styles.dockContainer}>
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
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
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
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDiscard}`}
                  onClick={handleCloseAi}
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
            ) : null}
          </AnimatePresence>
        </motion.div>

        <ReviewAllFloatingMenu
          issueCount={issueCount}
          onAcceptAll={onAcceptAll}
          onRejectAll={onRejectAll}
        />

        {isAiDockOpen && hasActiveSelection && aiAnchorRect && (
          <AiPromptPopover
            anchorRect={aiAnchorRect}
            loading={aiLoading}
            activeView={activePresetView}
            highlightedIndex={highlightedPresetIndex}
            onHighlightIndex={setHighlightedPresetIndex}
            onChangeView={setActivePresetView}
            onSelectPreset={handleSelectPreset}
            onClose={handleCloseAi}
          />
        )}
      </aside>
    </>
  );
}
