import { Code, Heading1, List, ListOrdered, Text } from "lucide-react";
import { Command, createSuggestionItems, renderItems } from "novel";

export const suggestionItems = createSuggestionItems([
  {
    title: "Text",
    description: "Just start typing with plain text.",
    searchTerms: ["p", "paragraph"],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleNode("paragraph", "paragraph")
        .run();
    },
  },
  {
    title: "Heading",
    description: "Section heading.",
    searchTerms: ["title", "heading", "h1"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  // {
  //   title: "Heading 2",
  //   description: "Medium section heading.",
  //   searchTerms: ["subtitle", "medium"],
  //   icon: <Heading2 size={18} />,
  //   command: ({ editor, range }) => {
  //     editor
  //       .chain()
  //       .focus()
  //       .deleteRange(range)
  //       .setNode("heading", { level: 2 })
  //       .run();
  //   },
  // },
  // {
  //   title: "Heading 3",
  //   description: "Small section heading.",
  //   searchTerms: ["subtitle", "small"],
  //   icon: <Heading3 size={18} />,
  //   command: ({ editor, range }) => {
  //     editor
  //       .chain()
  //       .focus()
  //       .deleteRange(range)
  //       .setNode("heading", { level: 3 })
  //       .run();
  //   },
  // },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    searchTerms: ["codeblock"],
    icon: <Code size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
