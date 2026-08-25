"use client";

import React from "react";
import styles from "./AudioVisualizer.module.css";

interface AudioVisualizerProps {
  amplitudes: number[];
  maxHeight?: number;
}

export default function AudioVisualizer({
  amplitudes,
  maxHeight = 24,
}: AudioVisualizerProps) {
  return (
    <div
      className={styles.visualizerContainer}
      role="status"
      aria-label="Microphone audio level visualizer"
    >
      {amplitudes.map((amp, index) => {
        const height = Math.max(4, Math.round(amp * maxHeight));
        const opacity = Math.max(0.35, Math.min(1, 0.35 + amp * 0.65));

        return (
          <span
            key={index}
            className={styles.bar}
            style={{
              height: `${height}px`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}
