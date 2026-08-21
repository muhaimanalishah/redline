export type DiffType = "grammar" | "clarity" | "spelling" | "word-choice";

export interface DiffIssue {
  id: string;
  type: DiffType;
  original: string;
  suggestion: string;
  issue?: string;
}

export interface ActiveDiffState {
  issue: DiffIssue;
  anchorRect: DOMRect;
}
