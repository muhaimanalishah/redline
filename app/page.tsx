"use client";

import { useState } from "react";
import { toast } from "sonner";
import Editor from "@/components/Editor";
import { DiffIssue, ExecuteAiOptions } from "@/types";

const INITIAL_MARKDOWN = `Their are alot of reasons why a person might wants to improve they're writing, but the most importantest one is clarity. When you're sentences is confusing, the reader loose interest quick and dont finish what you wrote, which effect how well you're ideas gets recieved by other peoples.

Me and him was discussing yesterday about how good writers doesn't never use to many words when less would of been better. Its a common mistake to think that longer sentences sounds more smarter, but actually it just make the reader more confuseder and less likely to remember what the point were.
`;

export default function Home() {
  const [issues, setIssues] = useState<DiffIssue[]>([]);

  const handleAiExecute = async (options: ExecuteAiOptions): Promise<string> => {
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

    if (!res.body) {
      throw new Error("No response body received");
    }

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
  };

  return (
    <main className="main">
      <Editor
        initialContent={INITIAL_MARKDOWN}
        issues={issues}
        onIssuesChange={setIssues}
        placeholder="Start writing here..."
        onAiExecute={handleAiExecute}
      />
    </main>
  );
}
