import { useAiChat } from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import { useEditor } from "novel";
import { Button } from "./ui/button";

export const DefineButton = () => {
  const { editor } = useEditor();
  const { sendMessage } = useAiChat();

  if (!editor) return null;

  const handleDefine = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (selectedText && selectedText.trim()) {
      // Send /Define message (same pattern as DocumentPage)
      sendMessage(`/Define ${selectedText.trim()}`);

      // Deselect text by collapsing selection to end
      editor.commands.setTextSelection(to);
    }
  };

  return (
    <Button
      variant="ghost"
      className="rounded-none px-3 py-2 text-sm font-rounded-bold hover:bg-gray-100"
      onClick={handleDefine}
    >
      Define
    </Button>
  );
};
