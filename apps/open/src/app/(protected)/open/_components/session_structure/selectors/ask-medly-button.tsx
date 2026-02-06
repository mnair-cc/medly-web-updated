import { useAiChat } from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import { useEditor } from "novel";
import { Button } from "./ui/button";

export const AskMedlyButton = () => {
  const { editor } = useEditor();
  const { updateSelectedText } = useAiChat();

  if (!editor) return null;

  const handleAskMedly = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (selectedText && selectedText.trim()) {
      // Update chat context with selected text
      updateSelectedText(selectedText.trim());

      // Focus chat input (same pattern as DocumentPage)
      window.setTimeout(() => {
        const el = document.getElementById(
          "userInput",
        ) as HTMLTextAreaElement | null;
        if (el) {
          el.focus();
          try {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          } catch {
            /* ignore */
          }
        }
      }, 0);
    }
  };

  return (
    <Button
      variant="ghost"
      className="rounded-none px-3 py-2 text-sm font-rounded-bold hover:bg-gray-100"
      onClick={handleAskMedly}
    >
      Ask Medly
    </Button>
  );
};

