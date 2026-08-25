import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioRecorderOptions {
  barCount?: number;
  maxDurationSeconds?: number;
  onMaxDurationReached?: () => void;
  onError?: (error: string) => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  audioAmplitudes: number[];
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  stopAndGetBlob: () => Promise<Blob | null>;
  error: string | null;
}

function getSupportedMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export function useAudioRecorder({
  barCount = 28,
  maxDurationSeconds = 180,
  onMaxDurationReached,
  onError,
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioAmplitudes, setAudioAmplitudes] = useState<number[]>(() =>
    new Array(barCount).fill(0.08)
  );

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const amplitudeHistoryRef = useRef<number[]>(new Array(barCount).fill(0.08));
  const isPausedRef = useRef(false);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSampleTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    clearTimer();

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    amplitudeHistoryRef.current = new Array(barCount).fill(0.08);
    setAudioAmplitudes(new Array(barCount).fill(0.08));
    setDurationSeconds(0);
    setIsPaused(false);
    isPausedRef.current = false;
  }, [barCount, clearTimer]);

  const stopRecording = useCallback(() => {
    cleanupAudio();
    setIsRecording(false);
  }, [cleanupAudio]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.pause();
      } catch {}
    }
    setIsPaused(true);
    isPausedRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    durationTimerRef.current = setInterval(() => {
      setDurationSeconds((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) {
          clearTimer();
          onMaxDurationReached?.();
          return maxDurationSeconds;
        }
        return next;
      });
    }, 1000);
  }, [clearTimer, maxDurationSeconds, onMaxDurationReached]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      try {
        mediaRecorderRef.current.resume();
      } catch {}
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
    setIsPaused(false);
    isPausedRef.current = false;
    startTimer();
  }, [startTimer]);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      clearTimer();
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        const fallbackBlob =
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: recorder?.mimeType || "audio/webm" })
            : null;
        cleanupAudio();
        resolve(fallbackBlob);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const finalBlob =
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: mimeType })
            : null;
        cleanupAudio();
        resolve(finalBlob);
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
        cleanupAudio();
        resolve(null);
      }
    });
  }, [cleanupAudio, clearTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    cleanupAudio();

    try {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Setup MediaRecorder for audio blob capture
      audioChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      // Setup Web Audio API analyser for flowing visualizer
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      amplitudeHistoryRef.current = new Array(barCount).fill(0.08);
      lastSampleTimeRef.current = performance.now();
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;
      setDurationSeconds(0);
      startTimer();

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sampleAmplitudes = (now: number) => {
        if (!analyserRef.current) return;

        // Sample at ~25fps (every 40ms) for smooth scrolling waveform
        if (now - lastSampleTimeRef.current >= 40) {
          lastSampleTimeRef.current = now;

          if (isPausedRef.current) {
            // Decay toward idle baseline when paused
            const updated = amplitudeHistoryRef.current.slice(1);
            updated.push(0.08);
            amplitudeHistoryRef.current = updated;
            setAudioAmplitudes([...updated]);
          } else {
            analyserRef.current.getByteFrequencyData(dataArray);

            // Compute overall RMS energy / amplitude
            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
              const val = dataArray[i];
              sumSquares += val * val;
            }
            const rms = Math.sqrt(sumSquares / bufferLength);

            // Normalize between 0.08 (idle) and 1.0 (max)
            const normalized = Math.max(0.08, Math.min(1.0, (rms / 120) * 1.1));

            // Shift FIFO buffer: push newest to right
            const history = amplitudeHistoryRef.current.slice(1);
            history.push(normalized);
            amplitudeHistoryRef.current = history;
            setAudioAmplitudes([...history]);
          }
        }

        animationFrameRef.current = requestAnimationFrame(sampleAmplitudes);
      };

      animationFrameRef.current = requestAnimationFrame(sampleAmplitudes);
    } catch (err: unknown) {
      cleanupAudio();
      setIsRecording(false);
      let errMsg = "Microphone access failed";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errMsg = "Microphone permission denied. Please allow microphone access in your browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errMsg = "No microphone found on your device.";
        } else {
          errMsg = err.message;
        }
      }
      setError(errMsg);
      onError?.(errMsg);
    }
  }, [barCount, cleanupAudio, onError, startTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isRecording,
    isPaused,
    durationSeconds,
    audioAmplitudes,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    stopAndGetBlob,
    error,
  };
}

