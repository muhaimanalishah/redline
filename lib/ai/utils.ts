import { ProofreadResult } from "./schema";

export function filterValidIssues(issues: ProofreadResult["issues"], sourceText: string) {
  return issues.filter((issue) => sourceText.includes(issue.original));
}
