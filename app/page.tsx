"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import Editor from "@/components/Editor";
import { DiffIssue, ExecuteAiOptions } from "@/types";

const STORAGE_KEY = "redline-document-content-v2";

const INITIAL_MARKDOWN = `# Redline

A fast, distraction-free markdown editor with **instant inline revisions** and intelligent AI writing assistance.

## Key Features

- **Inline Diffs:** Inspect suggestions and accept or decline changes per paragraph.
- **Client-Side Export:** Download cleanly formatted \`.md\` files with a single click.
- **Rich Elements:** Headings, blockquotes, code blocks, task lists, and structured tables.

> "Simplicity is about subtracting the obvious and adding the meaningful." — *John Maeda*

### Overview

| Feature | Status | Description |
| :--- | :--- | :--- |
| Live Diff Review | Supported | Per-block redline diffing |
| Markdown Tables | Supported | High-contrast styled tables |
| AI Transformations | Supported | Proofread, clarify, and summarize |

\`\`\`ts
// AI-assisted editing workflow
async function polishDraft(content: string) {
  return await redline.proofread({ content, mode: "concise" });
}
\`\`\`

## Sample Draft (Needs Proofreading)

Their are alot of reasons why a person might wants to improve they're writing, but the most importantest one is clarity. When you're sentences is confusing, the reader loose interest quick and dont finish what you wrote, which effect how well you're ideas gets recieved by other peoples.

Me and him was discussing yesterday about how good writers doesn't never use to many words when less would of been better. Its a common mistake to think that longer sentences sounds more smarter, but actually it just make the reader more confuseder and less likely to remember what the point were.
`;

export default function Home() {
  const [issues, setIssues] = useState<DiffIssue[]>([]);
  const [initialContent] = useState<string>(() => {
    if (typeof window === "undefined") return INITIAL_MARKDOWN;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null && saved.trim().length > 0) return saved;
    } catch {}
    return INITIAL_MARKDOWN;
  });

  const handleContentChange = useCallback((markdown: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, markdown);
    } catch {}
  }, []);

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
        initialContent={initialContent}
        issues={issues}
        onChange={handleContentChange}
        onIssuesChange={setIssues}
        placeholder="Start writing here..."
        onAiExecute={handleAiExecute}
      />
    </main>
  );
}
