import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioRecorderOptions {
  barCount?: number;
  onError?: (error: string) => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioAmplitudes: number[];
  startRecording: () => Promise<void>;
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
  onError,
}: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioAmplitudes, setAudioAmplitudes] = useState<number[]>(() =>
    new Array(barCount).fill(0.1)
  );

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const cleanupAudio = useCallback(() => {
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
    setAudioAmplitudes(new Array(barCount).fill(0.1));
  }, [barCount]);

  const stopRecording = useCallback(() => {
    cleanupAudio();
    setIsRecording(false);
  }, [cleanupAudio]);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
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
  }, [cleanupAudio]);


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

      // Setup Web Audio API analyser for live visualizer
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
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsRecording(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sampleAmplitudes = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        const amplitudes: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / barCount));

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          let count = 0;
          const startIndex = i * step;
          const endIndex = Math.min(startIndex + step, bufferLength);

          for (let j = startIndex; j < endIndex; j++) {
            sum += dataArray[j];
            count++;
          }

          const avg = count > 0 ? sum / count : 0;
          const normalized = Math.max(0.08, Math.min(1.0, avg / 220));
          amplitudes.push(normalized);
        }

        setAudioAmplitudes(amplitudes);
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
  }, [barCount, cleanupAudio, onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isRecording,
    audioAmplitudes,
    startRecording,
    stopRecording,
    stopAndGetBlob,
    error,
  };
}
