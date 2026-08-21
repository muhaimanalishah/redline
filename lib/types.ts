export interface Issue {
  id: string;
  type: "grammar" | "clarity" | "spelling";
  original: string;   // exact substring of the input text
  issue: string;      // short label, e.g. "subject-verb agreement"
  explanation: string;// one sentence
  suggestion: string; // replacement text
}
