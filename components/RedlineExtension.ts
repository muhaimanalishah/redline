import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Issue } from "@/lib/types";

export interface RedlinePluginState {
  decorations: DecorationSet;
  issues: Map<string, Issue>;
}

export const RedlinePluginKey = new PluginKey<RedlinePluginState>("redline");

export interface SetIssuesMeta {
  type: "SET_PARAGRAPH_ISSUES";
  paragraphPos: number;
  paragraphText: string;
  issues: Issue[];
}

export interface RemoveIssueMeta {
  type: "REMOVE_ISSUE";
  issueId: string;
}

export interface ClearAllMeta {
  type: "CLEAR_ALL";
}

export type RedlineMeta = SetIssuesMeta | RemoveIssueMeta | ClearAllMeta;

export const RedlineExtension = Extension.create({
  name: "redline",

  addProseMirrorPlugins() {
    return [
      new Plugin<RedlinePluginState>({
        key: RedlinePluginKey,
        state: {
          init(_, { doc }) {
            return {
              decorations: DecorationSet.empty,
              issues: new Map<string, Issue>(),
            };
          },
          apply(tr, prev, oldState, newState) {
            // 1. Map existing decorations through the transaction changes
            let decorations = prev.decorations.map(tr.mapping, tr.doc);
            const issues = new Map<string, Issue>(prev.issues);

            const meta = tr.getMeta(RedlinePluginKey) as RedlineMeta | undefined;

            if (meta) {
              if (meta.type === "REMOVE_ISSUE") {
                issues.delete(meta.issueId);
                const toRemove = decorations.find(
                  undefined,
                  undefined,
                  (spec) => spec.id === meta.issueId
                );
                if (toRemove.length > 0) {
                  decorations = decorations.remove(toRemove);
                }
              } else if (meta.type === "SET_PARAGRAPH_ISSUES") {
                let nodeStart = -1;
                let nodeEnd = -1;
                let paragraphText = meta.paragraphText;

                // Match paragraph by exact text
                newState.doc.descendants((node, pos) => {
                  if (nodeStart !== -1) return false;
                  if (node.type.name === "paragraph" || node.isTextblock) {
                    if (node.textContent === meta.paragraphText) {
                      nodeStart = pos + 1;
                      nodeEnd = pos + 1 + node.content.size;
                      paragraphText = node.textContent;
                      return false;
                    }
                  }
                });

                // Fallback: resolve node near mapped position
                if (nodeStart === -1) {
                  const mappedPos = tr.mapping.map(meta.paragraphPos);
                  const safePos = Math.max(0, Math.min(mappedPos + 1, newState.doc.content.size));
                  const $pos = newState.doc.resolve(safePos);
                  for (let d = $pos.depth; d >= 0; d--) {
                    const n = $pos.node(d);
                    if (n.type.name === "paragraph" || n.isTextblock) {
                      nodeStart = $pos.start(d);
                      nodeEnd = $pos.end(d);
                      paragraphText = n.textContent;
                      break;
                    }
                  }
                }

                if (nodeStart !== -1 && nodeEnd >= nodeStart) {
                  // Remove previous decorations inside this paragraph
                  const oldDecos = decorations.find(nodeStart, nodeEnd);
                  for (const d of oldDecos) {
                    if (d.spec.id) {
                      issues.delete(d.spec.id);
                    }
                  }
                  if (oldDecos.length > 0) {
                    decorations = decorations.remove(oldDecos);
                  }

                  // Create new inline decorations
                  const newDecos: Decoration[] = [];

                  for (const issue of meta.issues) {
                    const offset = paragraphText.indexOf(issue.original);
                    if (offset !== -1) {
                      const from = nodeStart + offset;
                      const to = from + issue.original.length;

                      if (to <= nodeEnd) {
                        issues.set(issue.id, issue);
                        newDecos.push(
                          Decoration.inline(
                            from,
                            to,
                            {
                              class: `flag ${issue.type}`,
                              "data-issue-id": issue.id,
                              "data-issue-type": issue.type,
                            },
                            {
                              id: issue.id,
                              issue,
                            }
                          )
                        );
                      }
                    }
                  }

                  if (newDecos.length > 0) {
                    decorations = decorations.add(newState.doc, newDecos);
                  }
                }
              } else if (meta.type === "CLEAR_ALL") {
                issues.clear();
                decorations = DecorationSet.empty;
              }
            }

            return { decorations, issues };
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
