import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

type RangeSpec = { from: number; to: number; className: string; type?: "inline" | "node" };

const replaceAnimationKey = new PluginKey<DecorationSet>("replaceAnimation");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    replaceAnimation: {
      setReplaceDecorations: (ranges: RangeSpec[]) => ReturnType;
      clearReplaceDecorations: () => ReturnType;
    };
  }
}

export const ReplaceAnimation = Extension.create({
  name: "replaceAnimation",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: replaceAnimationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, oldSet) {
            // Map existing decorations through the transaction
            let decorationSet = oldSet.map(tr.mapping, tr.doc);

            const meta = tr.getMeta(replaceAnimationKey);
            if (meta?.type === "set" && Array.isArray(meta.ranges)) {
              const decorations = meta.ranges.map((r: RangeSpec) => {
                if (r.type === "node") {
                  return Decoration.node(r.from, r.to, { class: r.className });
                }
                return Decoration.inline(r.from, r.to, { class: r.className });
              });
              decorationSet = DecorationSet.create(tr.doc, decorations);
            } else if (meta?.type === "clear") {
              decorationSet = DecorationSet.empty;
            }

            return decorationSet;
          },
        },
        props: {
          decorations(state) {
            return replaceAnimationKey.getState(state) ?? null;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setReplaceDecorations:
        (ranges: RangeSpec[]) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(replaceAnimationKey, { type: "set", ranges }));
          }
          return true;
        },
      clearReplaceDecorations:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(replaceAnimationKey, { type: "clear" }));
          }
          return true;
        },
    };
  },
});


