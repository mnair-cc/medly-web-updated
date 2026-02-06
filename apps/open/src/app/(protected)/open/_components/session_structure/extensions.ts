import Typography from "@tiptap/extension-typography";
import {
  Color,
  HighlightExtension,
  HorizontalRule,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
} from "novel";
import Citation from "./citation";

// Configure StarterKit with Notion-like styling
const starterKit = StarterKit.configure({
  heading: {
    levels: [1, 2, 3],
  },
  bulletList: {
    HTMLAttributes: {
      class: "list-disc list-outside ml-6",
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: "list-decimal list-outside ml-6",
    },
  },
  listItem: {
    HTMLAttributes: {
      class: "pl-2",
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: "border-l-3 border-gray-300 pl-4 italic",
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: "rounded bg-gray-50 border border-gray-200 p-4 font-mono text-sm",
    },
  },
  code: {
    HTMLAttributes: {
      class: "rounded bg-red-50 text-red-600 px-1.5 py-0.5 font-mono text-sm",
      spellcheck: "false",
    },
  },
  horizontalRule: false, // We'll add it separately
  dropcursor: {
    color: "#37352F20",
    width: 2,
  },
  gapcursor: false,
});

// Configure Link extension
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class:
      "text-blue-600 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer",
  },
});

// Configure TaskList
const taskList = TaskList.configure({
  HTMLAttributes: {
    class: "not-prose ml-0",
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: "flex items-start my-1",
  },
  nested: true,
});

// Configure HorizontalRule
const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: "mt-4 mb-6 border-t border-gray-300",
  },
});

// Configure Placeholder
const placeholder = Placeholder.configure({
  placeholder: "Write or press '/' for commands...",
});

// Configure Highlight extension
const highlight = HighlightExtension.configure({
  multicolor: true,
});

// Configure Image extension
const image = TiptapImage.configure({
  HTMLAttributes: {
    class: "rounded-lg max-w-full",
  },
  allowBase64: true,
});

export const defaultExtensions = [
  starterKit,
  placeholder,
  tiptapLink,
  taskList,
  taskItem,
  horizontalRule,
  Color,
  TextStyle,
  highlight,
  Citation,
  Typography,
  image,
];
