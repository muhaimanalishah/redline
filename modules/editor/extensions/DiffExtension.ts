import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { DiffIssue } from "@/modules/editor/types";
import { parseMarkdownToHtml } from "@/modules/editor/lib/markdownPreview";
import { resolveIssueRange, mapIssueRange } from "@/modules/editor/extensions/diffDoc";

export interface DiffPluginState {
  decorations: DecorationSet;
  issues: Map<string, DiffIssue>;
  processingRange: { from: number; to: number } | null;
  activeSelectionRange: { from: number; to: number } | null;
  activeDiffId: string | null;
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

export interface AddDiffIssuesMeta {
  type: "ADD_DIFF_ISSUES";
  issues: DiffIssue[] | DiffIssue;
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

export interface SetActiveDiffIdMeta {
  type: "SET_ACTIVE_DIFF_ID";
  issueId: string | null;
}

export type DiffMeta =
  | SetDiffIssuesMeta
  | AddDiffIssueMeta
  | AddDiffIssuesMeta
  | RemoveDiffMeta
  | ClearAllDiffsMeta
  | SetProcessingRangeMeta
  | SetActiveSelectionRangeMeta
  | SetActiveDiffIdMeta;

function buildDecorations(
  doc: ProseMirrorNode,
  issues: Map<string, DiffIssue>,
  processingRange: { from: number; to: number } | null,
  activeSelectionRange: { from: number; to: number } | null,
  activeDiffId: string | null
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
    const range = resolveIssueRange(doc, issue);
    if (!range) return;

    const { from, to } = range;
    const isActive = activeDiffId === issue.id;

    if (issue.original) {
      decos.push(
        Decoration.inline(
          from,
          to,
          {
            class: `del diff-del diff-type-${issue.type}${isActive ? " diff-active-del" : ""}`,
            "data-diff-type": issue.type,
          },
          { id: issue.id, issue }
        )
      );
    }

    decos.push(
      Decoration.widget(
        to,
        () => {
          const wrapper = document.createElement("div");
          wrapper.className = `ins diff-ins diff-type-${issue.type} diff-block${isActive ? " diff-active" : ""}`;
          wrapper.setAttribute("data-diff-id", issue.id);
          wrapper.setAttribute("data-diff-type", issue.type);
          wrapper.innerHTML = parseMarkdownToHtml(issue.suggestion);

          return wrapper;
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
              activeDiffId: null,
            };
          },
          apply(tr, prev, _oldState, newState) {
            let issues = new Map<string, DiffIssue>(prev.issues);
            const meta = tr.getMeta(DiffPluginKey) as DiffMeta | undefined;
            let activeDiffId = prev.activeDiffId;
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

            // Map existing issues' position ranges through document edits
            if (tr.docChanged) {
              const mappedIssues = new Map<string, DiffIssue>();
              issues.forEach((iss, id) => {
                mappedIssues.set(id, mapIssueRange(iss, tr.mapping));
              });
              issues = mappedIssues;
            }

            let stateModified = tr.docChanged;

            if (meta) {
              stateModified = true;
              switch (meta.type) {
                case "SET_DIFF_ISSUES":
                  issues.clear();
                  meta.issues.forEach((issue) => issues.set(issue.id, issue));
                  processingRange = null;
                  activeDiffId = null;
                  break;
                case "ADD_DIFF_ISSUE":
                  issues.set(meta.issue.id, meta.issue);
                  processingRange = null;
                  activeSelectionRange = null;
                  break;
                case "ADD_DIFF_ISSUES": {
                  const toAdd = Array.isArray(meta.issues) ? meta.issues : [meta.issues];
                  toAdd.forEach((issue) => issues.set(issue.id, issue));
                  processingRange = null;
                  activeSelectionRange = null;
                  break;
                }
                case "REMOVE_DIFF":
                  issues.delete(meta.issueId);
                  if (activeDiffId === meta.issueId) activeDiffId = null;
                  break;
                case "CLEAR_ALL_DIFFS":
                  issues.clear();
                  activeDiffId = null;
                  break;
                case "SET_PROCESSING_RANGE":
                  processingRange = meta.range;
                  activeSelectionRange = null;
                  break;
                case "SET_ACTIVE_SELECTION_RANGE":
                  activeSelectionRange = meta.range;
                  break;
                case "SET_ACTIVE_DIFF_ID":
                  activeDiffId = meta.issueId;
                  break;
              }
            }

            if (stateModified) {
              const decorations = issues.size === 0 && !processingRange && !activeSelectionRange
                ? DecorationSet.empty
                : buildDecorations(
                    newState.doc,
                    issues,
                    processingRange,
                    activeSelectionRange,
                    activeDiffId
                  );
              return { decorations, issues, processingRange, activeSelectionRange, activeDiffId };
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
