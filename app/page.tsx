"use client";

import { useState } from "react";
import Editor from "@/components/Editor";
import { DiffIssue } from "@/components/types";

const INITIAL_MARKDOWN = `Their are alot of reasons why a person might wants to improve they're writing, but the most importantest one is clarity. When you're sentences is confusing, the reader loose interest quick and dont finish what you wrote, which effect how well you're ideas gets recieved by other peoples.

Me and him was discussing yesterday about how good writers doesn't never use to many words when less would of been better. Its a common mistake to think that longer sentences sounds more smarter, but actually it just make the reader more confuseder and less likely to remember what the point were.
`;

export default function Home() {
  const [issues, setIssues] = useState<DiffIssue[]>([]);

  const handleProofread = () => {
    setIssues([]);
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


