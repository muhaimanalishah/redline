import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DiffIssue } from "@/types";
import { renderMarkdownToHtml } from "@/lib/markdown/renderer";

export interface DiffPluginState {
  decorations: DecorationSet;
  issues: Map<string, DiffIssue>;
  processingRange: { from: number; to: number } | null;
  activeSelectionRange: { from: number; to: number } | null;
}

export const DiffPluginKey = new PluginKey<DiffPluginState>("notion-diff");

export interface SetDiffIssuesMeta {
  type: "SET_DIFF_ISSUES";
  issues: DiffIssue[];
}

export interface AddDiffIssueMeta {
  type: "ADD_DIFF_ISSUE";
  issue: DiffIssue;
}

export interface RemoveDiffMeta {
  type: "REMOVE_DIFF";
  issueId: string;
}

export interface ClearAllDiffsMeta {
  type: "CLEAR_ALL_DIFFS";
}

export interface SetProcessingRangeMeta {
  type: "SET_PROCESSING_RANGE";
  range: { from: number; to: number } | null;
}

export interface SetActiveSelectionRangeMeta {
  type: "SET_ACTIVE_SELECTION_RANGE";
  range: { from: number; to: number } | null;
}

export type DiffMeta =
  | SetDiffIssuesMeta
  | AddDiffIssueMeta
  | RemoveDiffMeta
  | ClearAllDiffsMeta
  | SetProcessingRangeMeta
  | SetActiveSelectionRangeMeta;

function locateIssueRange(doc: ProseMirrorNode, issue: DiffIssue): { from: number; to: number } | null {
  if (issue.range) return issue.range;
  if (!issue.original) return null;

  let range: { from: number; to: number } | null = null;
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (range) return false;
    if (node.isText && node.text) {
      const index = node.text.indexOf(issue.original);
      if (index !== -1) {
        range = { from: pos + index, to: pos + index + issue.original.length };
        return false;
      }
    }
  });
  return range;
}

function buildDecorations(
  doc: ProseMirrorNode,
  issues: Map<string, DiffIssue>,
  processingRange: { from: number; to: number } | null,
  activeSelectionRange: { from: number; to: number } | null
): DecorationSet {
  const decos: Decoration[] = [];

  if (activeSelectionRange) {
    decos.push(
      Decoration.inline(activeSelectionRange.from, activeSelectionRange.to, {
        class: "diff-active-selection",
      })
    );
  }

  if (processingRange) {
    decos.push(
      Decoration.inline(processingRange.from, processingRange.to, {
        class: "diff-processing",
      })
    );
  }

  issues.forEach((issue) => {
    const range = locateIssueRange(doc, issue);
    if (!range) return;

    const { from, to } = range;

    // Render strike-through / dimmed state for original text
    if (issue.original) {
      decos.push(
        Decoration.inline(
          from,
          to,
          {
            class: `del diff-del diff-type-${issue.type}`,
            "data-diff-type": issue.type,
          },
          { id: issue.id, issue }
        )
      );
    }

    // Render formatted block preview widget directly beneath
    decos.push(
      Decoration.widget(
        to,
        () => {
          const isAiBlock = issue.type === "ai" || issue.suggestion.includes("\n") || issue.suggestion.startsWith("|");

          if (isAiBlock) {
            const container = document.createElement("div");
            container.className = `diff-block-preview diff-type-${issue.type}`;
            container.setAttribute("data-diff-id", issue.id);
            container.setAttribute("data-diff-type", issue.type);

            const contentWrap = document.createElement("div");
            contentWrap.className = "diff-block-content";
            contentWrap.innerHTML = renderMarkdownToHtml(issue.suggestion);

            container.appendChild(contentWrap);
            return container;
          }

          // Inline suggestion fallback
          const span = document.createElement("span");
          span.className = `ins diff-ins diff-type-${issue.type}`;
          span.setAttribute("data-diff-id", issue.id);
          span.setAttribute("data-diff-type", issue.type);
          span.textContent = issue.suggestion;
          return span;
        },
        { side: 1, key: `ins-${issue.id}` }
      )
    );
  });

  return DecorationSet.create(doc, decos);
}

export const DiffExtension = Extension.create({
  name: "diff",

  addProseMirrorPlugins() {
    return [
      new Plugin<DiffPluginState>({
        key: DiffPluginKey,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              issues: new Map<string, DiffIssue>(),
              processingRange: null,
              activeSelectionRange: null,
            };
          },
          apply(tr, prev, _oldState, newState) {
            const issues = new Map<string, DiffIssue>(prev.issues);
            const meta = tr.getMeta(DiffPluginKey) as DiffMeta | undefined;
            let processingRange = prev.processingRange
              ? {
                  from: tr.mapping.map(prev.processingRange.from),
                  to: tr.mapping.map(prev.processingRange.to),
                }
              : null;
            let activeSelectionRange = prev.activeSelectionRange
              ? {
                  from: tr.mapping.map(prev.activeSelectionRange.from),
                  to: tr.mapping.map(prev.activeSelectionRange.to),
                }
              : null;

            if (meta) {
              if (meta.type === "SET_DIFF_ISSUES") {
                issues.clear();
                meta.issues.forEach((issue) => issues.set(issue.id, issue));
                processingRange = null;
                const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
                return { decorations, issues, processingRange, activeSelectionRange };
              } else if (meta.type === "ADD_DIFF_ISSUE") {
                issues.set(meta.issue.id, meta.issue);
                processingRange = null;
                activeSelectionRange = null;
                const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
                return { decorations, issues, processingRange, activeSelectionRange };
              } else if (meta.type === "REMOVE_DIFF") {
                issues.delete(meta.issueId);
                const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
                return { decorations, issues, processingRange, activeSelectionRange };
              } else if (meta.type === "CLEAR_ALL_DIFFS") {
                issues.clear();
                return { decorations: DecorationSet.empty, issues, processingRange, activeSelectionRange };
              } else if (meta.type === "SET_PROCESSING_RANGE") {
                processingRange = meta.range;
                activeSelectionRange = null;
                const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
                return { decorations, issues, processingRange, activeSelectionRange };
              } else if (meta.type === "SET_ACTIVE_SELECTION_RANGE") {
                activeSelectionRange = meta.range;
                const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
                return { decorations, issues, processingRange, activeSelectionRange };
              }
            }

            // Map decorations through edits if doc changed
            if (tr.docChanged) {
              const decorations = buildDecorations(newState.doc, issues, processingRange, activeSelectionRange);
              return { decorations, issues, processingRange, activeSelectionRange };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
