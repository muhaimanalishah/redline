import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DiffIssue } from "./types";

export interface DiffPluginState {
  decorations: DecorationSet;
  issues: Map<string, DiffIssue>;
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

export type DiffMeta = SetDiffIssuesMeta | RemoveDiffMeta | ClearAllDiffsMeta;

function buildDecorations(doc: ProseMirrorNode, issues: Map<string, DiffIssue>): DecorationSet {
  const decos: Decoration[] = [];

  issues.forEach((issue) => {
    // Scan doc text to locate the original text
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.isText && node.text) {
        const text = node.text;
        const index = text.indexOf(issue.original);
        if (index !== -1) {
          const from = pos + index;
          const to = from + issue.original.length;

          // Inline decoration for the deleted/original text (red strikethrough)
          decos.push(
            Decoration.inline(
              from,
              to,
              {
                class: `del diff-del diff-type-${issue.type}`,
                "data-diff-id": issue.id,
                "data-diff-type": issue.type,
              },
              { id: issue.id, issue }
            )
          );

          // Widget decoration for the inserted/suggested text (green underline)
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
            };
          },
          apply(tr, prev, _oldState, newState) {
            const issues = new Map<string, DiffIssue>(prev.issues);
            const meta = tr.getMeta(DiffPluginKey) as DiffMeta | undefined;

            if (meta) {
              if (meta.type === "SET_DIFF_ISSUES") {
                issues.clear();
                meta.issues.forEach((issue) => issues.set(issue.id, issue));
                const decorations = buildDecorations(newState.doc, issues);
                return { decorations, issues };
              } else if (meta.type === "REMOVE_DIFF") {
                issues.delete(meta.issueId);
                const decorations = buildDecorations(newState.doc, issues);
                return { decorations, issues };
              } else if (meta.type === "CLEAR_ALL_DIFFS") {
                issues.clear();
                return { decorations: DecorationSet.empty, issues };
              }
            }

            // Map decorations through edits if doc changed
            if (tr.docChanged) {
              const decorations = buildDecorations(newState.doc, issues);
              return { decorations, issues };
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

