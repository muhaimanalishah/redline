"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Editor application error:", error);
  }, [error]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        textAlign: "center",
        backgroundColor: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      <h2
        style={{
          fontSize: "24px",
          fontWeight: 600,
          marginBottom: "12px",
          fontFamily: "var(--serif)",
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          color: "var(--ink-soft)",
          fontSize: "14px",
          maxWidth: "420px",
          marginBottom: "24px",
          lineHeight: 1.5,
        }}
      >
        An unexpected error occurred in the editor. Your draft is preserved in your session.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "10px 18px",
          fontSize: "14px",
          fontWeight: 500,
          borderRadius: "8px",
          backgroundColor: "var(--ink)",
          color: "var(--paper)",
          border: "none",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}
