import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DiffIssue } from "@/types";

export function findIssueRange(
  doc: ProseMirrorNode,
  original: string
): { from: number; to: number } | null {
  let range: { from: number; to: number } | null = null;

  doc.descendants((node, pos) => {
    if (range) return false;
    if (node.isText && node.text) {
      const idx = node.text.indexOf(original);
      if (idx !== -1) {
        range = { from: pos + idx, to: pos + idx + original.length };
        return false;
      }
    }
  });

  return range;
}

export function findIssueRanges(
  doc: ProseMirrorNode,
  issues: DiffIssue[]
): { from: number; to: number; text: string }[] {
  const ranges: { from: number; to: number; text: string }[] = [];

  issues.forEach((issue) => {
    const range = findIssueRange(doc, issue.original);
    if (range) {
      ranges.push({ from: range.from, to: range.to, text: issue.suggestion });
    }
  });

  return ranges;
}
