import { Extension } from "@tiptap/core";

// Adds global HTML attributes we want to preserve/round-trip in getHTML/parseHTML.
// This lets us keep things like author="ai" or data-page-index on many nodes/marks.
const GlobalAttributes = Extension.create({
  name: "globalAttributes",

  addGlobalAttributes() {
    // Node/mark names come from StarterKit + our extras
    const nodeTypes = [
      "paragraph",
      "heading",
      "blockquote",
      "codeBlock",
      "bulletList",
      "orderedList",
      "listItem",
      "horizontalRule",
      "textStyle",
    ];
    const markTypes = [
      "bold",
      "italic",
      "strike",
      "link",
      "code",
      "highlight",
    ];

    const attrs = {
      author: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("author"),
        renderHTML: (attributes: Record<string, any>) =>
          attributes.author ? { author: String(attributes.author) } : {},
      },
      source: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("source"),
        renderHTML: (attributes: Record<string, any>) =>
          attributes.source ? { source: String(attributes.source) } : {},
      },
      dataPageIndex: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-page-index"),
        renderHTML: (attributes: Record<string, any>) =>
          attributes.dataPageIndex
            ? { "data-page-index": String(attributes.dataPageIndex) }
            : {},
      },
    };

    return [
      {
        types: nodeTypes,
        attributes: attrs,
      },
      {
        types: markTypes,
        attributes: attrs,
      },
    ];
  },
});

export default GlobalAttributes;


