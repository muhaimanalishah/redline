import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DiffIssue } from "./types";

export interface DiffPluginState {
  decorations: DecorationSet;
  issues: Map<string, DiffIssue>;
  processingRange: { from: number; to: number } | null;
}

export const DiffPluginKey = new PluginKey<DiffPluginState>("notion-diff");

export interface SetDiffIssuesMeta {
  type: "SET_DIFF_ISSUES";
  issues: DiffIssue[];
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

export type DiffMeta = SetDiffIssuesMeta | RemoveDiffMeta | ClearAllDiffsMeta | SetProcessingRangeMeta;

function buildDecorations(
  doc: ProseMirrorNode,
  issues: Map<string, DiffIssue>,
  processingRange: { from: number; to: number } | null
): DecorationSet {
  const decos: Decoration[] = [];

  if (processingRange) {
    decos.push(
      Decoration.inline(processingRange.from, processingRange.to, {
        class: "diff-processing",
      })
    );
  }

  issues.forEach((issue) => {
    // Scan doc text to locate the original text
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.isText && node.text) {
        const text = node.text;
        const index = text.indexOf(issue.original);
        if (index !== -1) {
          const from = pos + index;
          const to = from + issue.original.length;

          // Inline decoration for the deleted/original text (non-interactive)
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

          // Widget decoration for the inserted/suggested text (clickable)
          decos.push(
            Decoration.widget(
              to,
              () => {
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

          return false; // Match first occurrence per node
        }
      }
    });
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

            if (meta) {
              if (meta.type === "SET_DIFF_ISSUES") {
                issues.clear();
                meta.issues.forEach((issue) => issues.set(issue.id, issue));
                processingRange = null;
                const decorations = buildDecorations(newState.doc, issues, processingRange);
                return { decorations, issues, processingRange };
              } else if (meta.type === "REMOVE_DIFF") {
                issues.delete(meta.issueId);
                const decorations = buildDecorations(newState.doc, issues, processingRange);
                return { decorations, issues, processingRange };
              } else if (meta.type === "CLEAR_ALL_DIFFS") {
                issues.clear();
                return { decorations: DecorationSet.empty, issues, processingRange };
              } else if (meta.type === "SET_PROCESSING_RANGE") {
                processingRange = meta.range;
                const decorations = buildDecorations(newState.doc, issues, processingRange);
                return { decorations, issues, processingRange };
              }
            }

            // Map decorations through edits if doc changed
            if (tr.docChanged) {
              const decorations = buildDecorations(newState.doc, issues, processingRange);
              return { decorations, issues, processingRange };
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

