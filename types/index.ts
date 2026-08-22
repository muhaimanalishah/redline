import { PresetId } from "@/lib/ai/presets";

export type DiffType = "grammar" | "clarity" | "spelling" | "word-choice" | "ai";

export interface DiffIssue {
  id: string;
  type: DiffType;
  original: string;
  suggestion: string;
  issue?: string;
  // Explicit position range, captured at creation time. When present,
  // this is used instead of searching the document for `original` —
  // needed for AI-generated issues where `original` may be empty
  // (nothing selected) or not safely unique in the document.
  range?: { from: number; to: number };
}

export interface ActiveDiffState {
  issue: DiffIssue;
  anchorRect: DOMRect;
  containerRect: DOMRect;
}

export interface ExecuteAiOptions {
  mode: "custom" | "preset";
  prompt?: string;
  preset?: PresetId;
  selectedText?: string;
}
