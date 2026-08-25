import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { DiffPluginKey } from "@/modules/editor/extensions/DiffExtension";
import { useAudioRecorder } from "@/modules/editor/hooks/useAudioRecorder";

interface UseVoiceTranscriptionOptions {
  editor: Editor;
  savedRange: { from: number; to: number } | null;
  onClearSavedRange: () => void;
}

export function useVoiceTranscription({
  editor,
  savedRange,
  onClearSavedRange,
}: UseVoiceTranscriptionOptions) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const finishRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleAudioError = useCallback((err: string) => {
    toast.error(err);
  }, []);

  const handleMaxDurationReached = useCallback(() => {
    toast.info("Maximum recording limit reached (3:00). Transcribing...");
    finishRecordingRef.current();
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

  const discardRecording = useCallback(() => {
    stopRecording();
    onClearSavedRange();
    setIsTranscribing(false);
  }, [stopRecording, onClearSavedRange]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }, [isPaused, resumeRecording, pauseRecording]);

  const finishRecording = useCallback(async () => {
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
        onClearSavedRange();
        setIsTranscribing(false);
        return;
      }

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
        onClearSavedRange();
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
        onClearSavedRange();
        setIsTranscribing(false);
        return;
      }

      const originalText =
        rangeToUse.from !== rangeToUse.to
          ? editor.state.doc.textBetween(rangeToUse.from, rangeToUse.to, " ")
          : "";

      editor.view.dispatch(
        editor.state.tr.setMeta(DiffPluginKey, {
          type: "ADD_DIFF_ISSUES",
          issues: {
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
      onClearSavedRange();
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
      onClearSavedRange();
    } finally {
      setIsTranscribing(false);
    }
  }, [isTranscribing, savedRange, editor, stopAndGetBlob, stopRecording, onClearSavedRange]);

  useEffect(() => {
    finishRecordingRef.current = finishRecording;
  }, [finishRecording]);

  return {
    isRecording,
    isPaused,
    isTranscribing,
    durationSeconds,
    audioAmplitudes,
    startRecording,
    stopRecording,
    discardRecording,
    togglePause,
    finishRecording,
  };
}
