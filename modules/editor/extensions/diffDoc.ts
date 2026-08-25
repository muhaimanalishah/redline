import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Mapping } from "@tiptap/pm/transform";
import { DiffIssue } from "@/modules/editor/types";

/**
 * Searches the document for the first occurrence of the target text string.
 * Checks single text nodes first, then falls back to searching whole block text content.
 */
export function findIssueRange(
  doc: ProseMirrorNode,
  original: string
): { from: number; to: number } | null {
  if (!original) return null;

  let range: { from: number; to: number } | null = null;

  // Pass 1: check leaf text nodes
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

  if (range) return range;

  // Pass 2: search across block nodes if original spans marks
  doc.descendants((node, pos) => {
    if (range) return false;
    if (node.isBlock && node.isTextblock) {
      const blockText = node.textContent;
      const idx = blockText.indexOf(original);
      if (idx !== -1) {
        let offset = 0;
        let startPos: number | null = null;
        let endPos: number | null = null;

        node.forEach((child, childOffset) => {
          if (!child.isText || !child.text) return;
          const childStart = offset;
          const childEnd = offset + child.text.length;

          if (startPos === null && idx >= childStart && idx < childEnd) {
            startPos = pos + 1 + childOffset + (idx - childStart);
          }

          if (startPos !== null && endPos === null && idx + original.length <= childEnd) {
            endPos = pos + 1 + childOffset + (idx + original.length - childStart);
          }

          offset = childEnd;
        });

        if (startPos !== null && endPos !== null) {
          range = { from: startPos, to: endPos };
          return false;
        }
      }
    }
  });

  return range;
}

/**
 * Resolves the `{ from, to }` position range for a given issue in the current document.
 */
export function resolveIssueRange(
  doc: ProseMirrorNode,
  issue: DiffIssue
): { from: number; to: number } | null {
  if (issue.range) {
    const { from, to } = issue.range;
    if (from >= 0 && to <= doc.content.size && from <= to) {
      return issue.range;
    }
  }
  return findIssueRange(doc, issue.original);
}

/**
 * Resolves ranges for a list of issues and returns them along with replacement text.
 */
export function findIssueRanges(
  doc: ProseMirrorNode,
  issues: DiffIssue[]
): { from: number; to: number; text: string; issueId: string }[] {
  const ranges: { from: number; to: number; text: string; issueId: string }[] = [];

  issues.forEach((issue) => {
    const range = resolveIssueRange(doc, issue);
    if (range) {
      ranges.push({ from: range.from, to: range.to, text: issue.suggestion, issueId: issue.id });
    }
  });

  return ranges;
}

/**
 * Maps an issue's explicit range through a ProseMirror transform mapping.
 */
export function mapIssueRange(
  issue: DiffIssue,
  mapping: Mapping
): DiffIssue {
  if (!issue.range) return issue;
  return {
    ...issue,
    range: {
      from: mapping.map(issue.range.from),
      to: mapping.map(issue.range.to),
    },
  };
}
