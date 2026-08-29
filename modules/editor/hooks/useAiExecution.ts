"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ExecuteAiOptions } from "../types";

export function useAiExecution() {
  const handleAiExecute = useCallback(
    async (options: ExecuteAiOptions): Promise<string> => {
      const payload =
        options.mode === "preset"
          ? {
              mode: "preset",
              preset: options.preset,
              text: options.selectedText || "",
            }
          : {
              mode: "custom",
              prompt: options.prompt,
              text: options.selectedText || "",
            };

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error ?? "AI request failed";
        toast.error(message);
        throw new Error(message);
      }

      if (!res.body) throw new Error("No response body received");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      fullText += decoder.decode();

      return fullText;
    },
    []
  );

  return { handleAiExecute };
}
