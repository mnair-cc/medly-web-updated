import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citation: {};
  }
}

// Inline mark to preserve <span class="citation" data-*="...">...</span>
// and round-trip it through the ProseMirror document.
const Citation = Mark.create({
  name: "citation",
  inclusive: false,
  group: "inline",
  exitable: true,
  spanning: false,

  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-document-id"),
        renderHTML: (attrs) =>
          attrs.documentId ? { "data-document-id": String(attrs.documentId) } : {},
      },
      pageIndex: {
        default: null,
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-page-index"),
        renderHTML: (attrs) =>
          attrs.pageIndex ? { "data-page-index": String(attrs.pageIndex) } : {},
      },
      sourceSegment: {
        default: null,
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-source-segment"),
        renderHTML: (attrs) =>
          attrs.sourceSegment
            ? { "data-source-segment": String(attrs.sourceSegment) }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.citation",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "citation",
      }),
    ];
  },
});

export default Citation;
