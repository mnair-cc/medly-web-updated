import { cn } from "@/app/(protected)/open/_utils/cn";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  type LucideIcon,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Button } from "./ui/button";

export type SelectorItem = {
  name: string;
  icon: LucideIcon;
  command: (editor: ReturnType<typeof useEditor>["editor"]) => void;
  isActive: (editor: ReturnType<typeof useEditor>["editor"]) => boolean;
};

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;
  const items: SelectorItem[] = [
    {
      name: "bold",
      isActive: (editor) => (editor ? editor.isActive("bold") : false),
      command: (editor) => {
        if (editor) editor.chain().focus().toggleBold().run();
      },
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: (editor) => (editor ? editor.isActive("italic") : false),
      command: (editor) => {
        if (editor) editor.chain().focus().toggleItalic().run();
      },
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: (editor) => (editor ? editor.isActive("underline") : false),
      command: (editor) => {
        if (editor) editor.chain().focus().toggleUnderline().run();
      },
      icon: UnderlineIcon,
    },
  ];
  return (
    <div className="flex">
      {items.map((item, index) => (
        <EditorBubbleItem
          key={index}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button size="icon" className="rounded-none" variant="ghost">
            <item.icon
              className={cn("h-4 w-4", {
                "text-blue-500": item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
