import { useRef, useLayoutEffect } from "react";
import ArrowWithTailUpIcon from "@/app/_components/icons/ArrowWithTailUpIcon";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Spinner from "@/app/_components/Spinner";
import VoiceRecorder from "./VoiceRecorder";

function InputBar({
  userInput,
  setUserInput,
  handleFilterUserMessageAndSend,
  canReply,
  options,
  highlightInput,
  autoFocus = true,
  backgroundColor = "",
  placeholder = "Reply",
}: {
  userInput: string;
  setUserInput: (input: string) => void;
  handleFilterUserMessageAndSend: (input: string) => void;
  canReply: boolean;
  options: string[];
  highlightInput?: boolean;
  autoFocus?: boolean;
  backgroundColor?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canReply) {
      e.preventDefault();
      handleFilterUserMessageAndSend(userInput);
      setUserInput("");
      // Reset textarea height after sending
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  };

  // Function to auto-resize textarea
  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  // Adjust height on mount and when userInput changes
  useLayoutEffect(() => {
    if (inputRef.current) {
      // For empty input, explicitly set to minimum height
      if (!userInput.trim()) {
        inputRef.current.style.height = "24px";
      } else {
        adjustHeight(inputRef.current);
      }
    }
  }, [userInput]);

  return (
    <div className="flex flex-col items-center justify-center w-full pointer-events-auto">
      {options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 w-full text-base md:text-sm px-4 pb-4">
          {options.map((option: string, index: number) => (
            <PrimaryButtonClicky
              key={index}
              buttonText={option}
              onPress={() => canReply && handleFilterUserMessageAndSend(option)}
              showKeyboardShortcut={false}
            />
          ))}
        </div>
      )}

      <div className={`flex items-center w-full p-2 md:p-1 px-2 rounded-[24px] pointer-events-auto ${highlightInput ? "border-2 border-[#1CA4FF]" : ""} ${backgroundColor ? `bg-[${backgroundColor}]` : "bg-[#F2F2F7]"}`}>
        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          maxLength={1024}
          id="userInput"
          name="userInput"
          placeholder={placeholder}
          value={userInput}
          className="w-full bg-transparent outline-none pl-2 md:mt-1 text-base md:text-sm resize-none overflow-hidden min-h-[24px]"
          rows={1}
          onChange={(e) => {
            setUserInput(e.target.value);
            adjustHeight(e.target);
          }}
          onFocus={(e) => adjustHeight(e.target)}
        />
        <div className="flex items-end self-end md:mb-[2px] md:mr-1">
          <button
            className={`w-6 h-6 rounded-full flex flex-col items-center ${canReply ? "bg-[#00AEFF]" : "bg-[#B3B3B3]"}`}
            disabled={!canReply}
            onClick={() => {
              if (canReply) {
                handleFilterUserMessageAndSend(userInput);
                setUserInput("");
                // Reset textarea height after sending
                if (inputRef.current) {
                  inputRef.current.style.height = "auto";
                }
              }
            }}
          >
            {canReply ? (
              <ArrowWithTailUpIcon
                backgroundColor={
                  canReply && userInput.trim().length > 0 ? "#00AEFF" : "#B3B3B3"
                }
                fillColor="white"
              />
            ) :
              (
                <div className="w-6 h-6 rounded-full flex flex-col items-center justify-center bg-[#B3B3B3]">
                  <Spinner size="small" style="light" />
                </div>
              )
            }
          </button>
        </div>
      </div>
    </div >
  );
}

export default InputBar;
