"use client";

import { useState } from "react";
import { toast } from "sonner";
import Editor from "@/components/Editor";
import { DiffIssue } from "@/components/types";

const INITIAL_MARKDOWN = `Their are alot of reasons why a person might wants to improve they're writing, but the most importantest one is clarity. When you're sentences is confusing, the reader loose interest quick and dont finish what you wrote, which effect how well you're ideas gets recieved by other peoples.

Me and him was discussing yesterday about how good writers doesn't never use to many words when less would of been better. Its a common mistake to think that longer sentences sounds more smarter, but actually it just make the reader more confuseder and less likely to remember what the point were.
`;

export default function Home() {
  const [issues, setIssues] = useState<DiffIssue[]>([]);

  const handleProofread = async (text: string) => {
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Proofread check failed");
      }

      const data: { issues: Omit<DiffIssue, "id">[] } = await res.json();
      setIssues(
        data.issues.map((issue, index) => ({
          id: `diff-${index}-${issue.original}`,
          ...issue,
        }))
      );

      if (data.issues.length === 0) {
        toast.success("No issues found");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Proofread check failed");
    }
  };

  return (
    <main className="main">
      <Editor
        initialContent={INITIAL_MARKDOWN}
        issues={issues}
        placeholder="Start writing here..."
        onProofread={handleProofread}
      />
    </main>
  );
}


