"use client";

import { useState } from "react";
import Editor from "@/components/Editor";
import { DiffIssue } from "@/components/types";

const INITIAL_ISSUES: DiffIssue[] = [
  {
    id: "diff-1",
    original: "utilise",
    suggestion: "use",
    type: "clarity",
  },
  {
    id: "diff-2",
    original: "alot of",
    suggestion: "many",
    type: "grammar",
  },
  {
    id: "diff-3",
    original: "accomodate",
    suggestion: "accommodate",
    type: "spelling",
  },
];

const INITIAL_MARKDOWN = `# The Craft of Thoughtful Writing

Good writing is not about ornamentation; it is about precision, clarity, and rhythm. When we utilise simple and honest words, our prose breathes naturally and invites the reader into a seamless flow.

> "Simplicity is not the lack of clutter, that's a consequence of simplicity. Simplicity somehow essentially describes the purpose and place of an object and what it is."

## Principles of the Editor

There are alot of factors that determine whether an editor feels effortless. We strive to accomodate every writer's flow state through careful typography, balanced line heights, and eye-friendly contrast.

### Writing Checklist

- [x] Clear typographic hierarchy with calibrated optical kerning
- [x] Relaxed line height (1.78) for sustained reading comfort
- [ ] Refine syntax highlighting and code block contrast
- [ ] Test cross-device responsiveness

### Code & Configuration

Inline code like \`const theme = "warm-parchment"\` renders cleanly alongside monospace code blocks:

\`\`\`typescript
interface TypographyTheme {
  paper: string;
  ink: string;
  lineHeight: number;
  zoomScale: number;
}
\`\`\`

### Reading Time Comparison

| Document Size | Average Words | Estimated Reading Time |
| :--- | :--- | :--- |
| Quick Note | ~150 words | 1 minute |
| Essay Chapter | ~1,200 words | 6 minutes |
| Comprehensive Plan | ~3,500 words | 18 minutes |

*Feel free to edit this document, click inline suggestions to review changes, or use the floating dock at the bottom right to adjust zoom and eye-friendly themes.*
`;

export default function Home() {
  const [issues, setIssues] = useState<DiffIssue[]>([]);

  const handleProofread = () => {
    setIssues(INITIAL_ISSUES);
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


