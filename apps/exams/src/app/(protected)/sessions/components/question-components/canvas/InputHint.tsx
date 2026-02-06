import { useState, useEffect } from "react";
import { InputMode } from "../../../types";

const InputHint = ({
  inputMode,
  resetInputMode,
  mousePosition,
  isReadOnly,
  isHoveringOnTextbox,
  isHoveringCanvas,
  handleSendMessage,
  clearMessageText,
}: {
  inputMode: InputMode;
  resetInputMode: () => void;
  mousePosition: { x: number; y: number };
  isReadOnly: boolean;
  isHoveringOnTextbox: boolean;
  isHoveringCanvas: boolean;
  handleSendMessage: (message: string) => void;
  clearMessageText?: boolean;
}) => {
  const [messageText, setMessageText] = useState("");

  // Clear message text when clearMessageText prop becomes true
  useEffect(() => {
    if (clearMessageText) {
      setMessageText("");
    }
  }, [clearMessageText]);

  const handleMessageSubmit = () => {
    if (messageText.trim()) {
      handleSendMessage(messageText);
      setMessageText("");
      resetInputMode(); // Return to text input mode
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit();
    }
  };

  const shouldShowTextOrMathHint =
    (inputMode === "text" || inputMode === "math") &&
    !isReadOnly &&
    !isHoveringOnTextbox &&
    isHoveringCanvas;

  const shouldShowMessageBox =
    inputMode === "message" &&
    !isReadOnly;

  if (shouldShowTextOrMathHint) {
    return (
      <div
        className="pointer-events-none select-none absolute font-['Shantell_Sans'] font-[500] text-[18px] text-gray-500 opacity-70"
        style={{
          left: `${mousePosition.x + 4}px`,
          top: `${mousePosition.y - 10}px`,
        }}
      >
        {inputMode === "math" ? "Write Maths" : "Add Text"}
      </div>
    );
  } else if (shouldShowMessageBox) {
    return (
      <div
        className="pointer-events-auto select-none absolute opacity-95 bg-[#06B0FF] backdrop-blur-md rounded-full px-4 py-2 shadow-[0_0_15px_rgba(0,0,0,0.15)]  z-[1000] border-1 border-white"
        style={{
          left: `${mousePosition.x + 12}px`,
          top: `${mousePosition.y + 12}px`,
        }}
      >
        <textarea
          className="cursor-auto focus:outline-none font-medium font-[500] text-[14px] text-white placeholder:text-[#FFFFFF]/80 resize-none bg-transparent"
          placeholder="Say something"
          rows={1}
          autoFocus={true}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  return null;
};

export default InputHint;
