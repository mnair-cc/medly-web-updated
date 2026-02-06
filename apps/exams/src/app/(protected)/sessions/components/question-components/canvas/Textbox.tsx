declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathfieldElement> & {
          onKeyDown?: (e: React.KeyboardEvent) => void;
          readOnly?: boolean;
          onInput?: (e: Event) => void;
          onFocus?: (e: React.FocusEvent) => void;
          onBlur?: () => void;
          value?: string;
          placeholder?: string;
        },
        MathfieldElement
      >;
    }
  }
}

import "mathlive";
import { TextboxData, Highlight } from "@/app/types/types";
import { MathfieldElement } from "mathlive";
import { useRef, useEffect, useState, useCallback } from "react";
import { HighlightedText } from "./HighlightedText";
import SendButton from "@/app/_components/SendButton";
import { InputMode } from "../../../types";

// Helper for auto-resizing textarea height and width
const autoResizeTextarea = (
  textarea: HTMLTextAreaElement | null,
  mirror: HTMLSpanElement | null,
  value: string,
  maxWidth: number
) => {
  if (textarea && mirror) {
    mirror.textContent = value || textarea.placeholder || "";
    const newWidth = Math.min(mirror.offsetWidth + 20, maxWidth);
    textarea.style.width = `${newWidth}px`;

    textarea.style.height = "24px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
};

const Textbox = ({
  index,
  textboxData,
  inputMode,
  isReadOnly,
  isBeingEdited,
  setEditingTextboxIndex,
  setHoveredTextboxIndex,
  handleUpdateTextbox,
  handleDeleteTextbox,
  onMouseDown,
  questionAnnotations,
  showShimmer = false,
  fadeIn = false,
  shouldShowSendButton = false,
  handleSendMessage,
  isAwaitingResponse = false,
  isSolveTogether = false,
}: {
  index: number;
  textboxData: TextboxData;
  inputMode: InputMode;
  isReadOnly: boolean;
  isBeingEdited: boolean;
  setEditingTextboxIndex: (index: number | null) => void;
  setHoveredTextboxIndex: (index: number | null) => void;
  handleUpdateTextbox: (index: number, textboxData: TextboxData) => void;
  handleDeleteTextbox: (index: number) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  questionAnnotations: Highlight[] | undefined;
  showShimmer?: boolean;
  fadeIn?: boolean;
  shouldShowSendButton?: boolean;
  handleSendMessage?: (message: string) => void;
  isAwaitingResponse?: boolean;
  isSolveTogether?: boolean;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mathFieldRef = useRef<MathfieldElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [localText, setLocalText] = useState(textboxData.text);
  const [maxTextboxWidth] = useState<number>(700);
  const [mathFieldWidth, setMathFieldWidth] = useState<number>(0);
  const [textContainerWidth, setTextContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLDivElement>(null);
  const isClickingSendButton = useRef<boolean>(false);

  // Add function to check and adjust position if needed
  const checkAndAdjustPosition = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const canvasRect = containerRef.current
      .closest('[class*="absolute top-0 left-0 w-full h-full"]')
      ?.getBoundingClientRect();

    if (!canvasRect) return;

    let newX = textboxData.x;
    let newY = textboxData.y;

    // Check right boundary
    if (rect.right > canvasRect.right) {
      newX = canvasRect.width - rect.width;
    }
    // Check bottom boundary
    if (rect.bottom > canvasRect.bottom) {
      newY = canvasRect.height - rect.height;
    }
    // Check left boundary
    if (rect.left < canvasRect.left) {
      newX = 0;
    }
    // Check top boundary
    if (rect.top < canvasRect.top) {
      newY = 0;
    }

    // Only update if position needs to change
    if (newX !== textboxData.x || newY !== textboxData.y) {
      handleUpdateTextbox(index, {
        ...textboxData,
        x: newX,
        y: newY,
      });
    }
  }, [textboxData, index, handleUpdateTextbox]);

  // Add effect to check boundaries when content changes
  useEffect(() => {
    if (localText !== textboxData.text) {
      // Small delay to allow for content to render
      setTimeout(checkAndAdjustPosition, 0);
    }
  }, [localText, textboxData.text, checkAndAdjustPosition]);

  useEffect(() => {
    setLocalText(textboxData.text);
  }, [textboxData.text]);

  // Update math field width for SendButton positioning
  useEffect(() => {
    if (mathFieldRef.current && textboxData.isMath) {
      const updateWidth = () => {
        if (mathFieldRef.current) {
          const width = mathFieldRef.current.offsetWidth;
          setMathFieldWidth(width);
        }
      };

      // Initial measurement with a delay to ensure element is rendered
      setTimeout(updateWidth, 100);

      // Update on content change
      const observer = new ResizeObserver(updateWidth);
      observer.observe(mathFieldRef.current);

      return () => observer.disconnect();
    }
  }, [textboxData.isMath, localText, isBeingEdited]);

  // Update text container width for SendButton positioning
  useEffect(() => {
    if (containerRef.current && !textboxData.isMath) {
      const updateWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setTextContainerWidth(width);
        }
      };

      // Initial measurement with a delay to ensure element is rendered
      setTimeout(updateWidth, 100);

      // Update on content change
      const observer = new ResizeObserver(updateWidth);
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }
  }, [textboxData.isMath, localText, isBeingEdited]);

  useEffect(() => {
    if (isBeingEdited) {
      if (textboxData.isMath && mathFieldRef.current) {
        // Small delay to ensure the math field is ready
        setTimeout(() => {
          if (mathFieldRef.current) {
            mathFieldRef.current.mathModeSpace = "\\:";
            mathFieldRef.current.mathVirtualKeyboardPolicy = "manual";
            // mathFieldRef.current.smartMode = true;
            mathFieldRef.current.focus();
            // Set MathLive to use asterisk (*) for multiplication instead of dot
            mathFieldRef.current.inlineShortcuts = {
              sqrt: "\\sqrt",
              cube: "\\sqrt[3]",
              cuberoot: "\\sqrt[3]",
              "->": "\\to",
              "<->": "\\leftrightarrow",
              "+-": "\\pm",
              "!=": "\\ne",
              "*": "\\times",
            };

            // Add beforeinput event listener to check width before allowing input
            mathFieldRef.current.addEventListener("beforeinput", (e: Event) => {
              const mathField = e.target as MathfieldElement;
              const currentWidth = mathField.offsetWidth;
              // Only prevent input if we're adding content (not deleting)
              const inputEvent = e as InputEvent;
              if (
                currentWidth >= maxTextboxWidth - 50 &&
                inputEvent.inputType !== "deleteContentBackward" &&
                inputEvent.inputType !== "deleteContentForward"
              ) {
                e.preventDefault();
                e.stopPropagation();
              }
            });
          }
        }, 50);
      } else if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isBeingEdited, textboxData.isMath]);

  useEffect(() => {
    if (
      isBeingEdited &&
      textareaRef.current &&
      mirrorRef.current &&
      !textboxData.isMath
    ) {
      autoResizeTextarea(
        textareaRef.current,
        mirrorRef.current,
        localText,
        maxTextboxWidth
      );
    }
  }, [isBeingEdited, localText, textboxData.isMath, maxTextboxWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't handle in grab mode
    if (inputMode === "grab") return;

    // Only prevent default when not editing to allow cursor placement
    if (!isBeingEdited) {
      e.preventDefault();
      onMouseDown(e);

      // Set focus on the textbox element
      if (textboxData.isMath) {
        const mathField = e.currentTarget.querySelector(
          "math-field"
        ) as MathfieldElement;
        if (mathField) {
          mathField.focus();
        }
      } else {
        const textbox = e.currentTarget as HTMLTextAreaElement;
        if (textbox) {
          textbox.focus();
        }
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Don't handle in grab mode
    if (inputMode === "grab") return;

    if (!isReadOnly && !isBeingEdited) {
      e.preventDefault();
      setEditingTextboxIndex(index);

      // Set cursor position to the end
      if (textboxData.isMath) {
        const mathField = e.currentTarget as MathfieldElement;
        if (mathField) {
          mathField.focus();
          // MathLive will automatically place cursor at the end when focused
        }
      } else {
        const textbox = e.currentTarget as HTMLTextAreaElement;
        if (textbox && textbox.value) {
          textbox.focus();
          const length = textbox.value.length;
          textbox.setSelectionRange(length, length);
        }
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const text = e.currentTarget.value || "";
    setLocalText(text);
    autoResizeTextarea(
      e.currentTarget,
      mirrorRef.current,
      text,
      maxTextboxWidth
    );
  };

  const handleMathInput = (e: Event) => {
    const mathField = e.target as MathfieldElement;
    const text = mathField.value || "";

    // Get the actual width of the math field content
    const mathFieldWidth = mathField.offsetWidth;

    if (mathFieldWidth <= maxTextboxWidth) {
      setLocalText(text);
    } else {
      // If over width limit, revert to previous value and prevent further input
      mathField.value = localText;
      // Force the math field to update its display
      mathField.blur();
      mathField.focus();
      // Prevent the default input behavior
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleBlur = () => {
    // If we're clicking on the SendButton, don't blur yet
    if (isClickingSendButton.current) {
      return;
    }

    // CRITICAL FIX: Get final value and update parent FIRST, then clear editing state
    const text = textboxData.isMath
      ? mathFieldRef.current?.value || ""
      : localText;

    // Remove textbox if it's empty
    if (!text.trim()) {
      handleDeleteTextbox(index);
      setEditingTextboxIndex(null);
      return;
    }

    // Only update if text actually changed
    if (textboxData.text !== text) {
      const updatedTextbox = {
        ...textboxData,
        text,
      };
      handleUpdateTextbox(index, updatedTextbox);
    }

    // Clear editing state AFTER content is committed
    setEditingTextboxIndex(null);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      // Handle both React and native KeyboardEvent types
      const key = e.key;
      const shiftKey = e.shiftKey;

      if (key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleBlur();
        return;
      }

      if (key === "Enter" && textboxData.isMath && isBeingEdited) {
        // Let the parent SketchCanvas handle Enter key for creating new textboxes
        // We need to trigger the custom event or call the parent handler directly

        // For now, let's dispatch a custom event that SketchCanvas can listen for
        const customEvent = new CustomEvent("mathfield-enter", {
          bubbles: true,
          detail: {
            textboxIndex: index,
            shiftKey: shiftKey,
            mathFieldElement: mathFieldRef.current,
          },
        });

        // Dispatch from the math field element
        if (mathFieldRef.current) {
          mathFieldRef.current.dispatchEvent(customEvent);
        }

        e.preventDefault();
        e.stopPropagation();
        return;
      }
    },
    [textboxData.isMath, isBeingEdited, index, handleBlur]
  );

  const handleClick = (e: React.MouseEvent) => {
    // Don't handle in grab mode
    if (inputMode === "grab") return;

    // Prevent creating a new textbox when clicking on an existing textbox
    e.stopPropagation();
  };

  const handleFocus = (e: React.FocusEvent) => {
    // Get the index of the current math field
    if (isBeingEdited) {
      setEditingTextboxIndex(index);
    }
  };

  const insertTextAtCursor = (text: string) => {
    if (mathFieldRef.current) {
      try {
        mathFieldRef.current.insert(text);
      } catch (error) {
        console.warn("Failed to insert text at cursor in math field:", error);
      }
    }
  };

  // Add keydown event listener to math-field element
  useEffect(() => {
    const mathField = mathFieldRef.current;
    if (mathField && textboxData.isMath && isBeingEdited) {
      const keydownHandler = (e: KeyboardEvent) => {
        handleKeyDown(e); // No unsafe casting needed now
      };

      mathField.addEventListener("keydown", keydownHandler);

      return () => {
        mathField.removeEventListener("keydown", keydownHandler);
      };
    }
  }, [isBeingEdited, textboxData.isMath, handleKeyDown]);

  if (isReadOnly && questionAnnotations && !textboxData.isMath) {
    return (
      <div
        className={`absolute text-[18px] rounded font-[500] p-1 font-['Shantell_Sans'] resize-none bg-transparent whitespace-pre-wrap ${
          fadeIn ? "animate-fadeInWithShimmer" : ""
        }`}
        style={{
          left: textboxData.x,
          top: textboxData.y,
        }}
      >
        <HighlightedText
          text={textboxData.text}
          questionAnnotations={questionAnnotations}
        />
        {showShimmer && !fadeIn && (
          <div
            className="shimmer-effect absolute inset-0 pointer-events-none z-[100]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)",
              transform: "translateX(-100%)",
              animation: "shimmer 3s 1 forwards",
              zIndex: 100,
            }}
          />
        )}
        <style jsx>{`
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          @keyframes fadeInWithShimmer {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-in-out;
          }
          .animate-fadeInWithShimmer {
            animation: fadeInWithShimmer 0.5s ease-in-out;
            position: relative;
          }
          .animate-fadeInWithShimmer::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 1),
              transparent
            );
            background-size: 200% 100%;
            transform: translateX(-100%);
            animation: shimmer 3s 1 forwards;
            pointer-events: none;
            z-index: 100;
          }
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .shimmer-effect {
            background-size: 200% 100%;
          }
        `}</style>
      </div>
    );
  }

  if (textboxData.isMath) {
    return (
      <div
        ref={containerRef}
        className={`absolute w-fit h-fit ${fadeIn ? "animate-fadeInWithShimmer" : ""}`}
        style={{
          left: textboxData.x,
          top: textboxData.y,
        }}
        data-textbox-index={index}
        onMouseEnter={() => setHoveredTextboxIndex(index)}
        onMouseLeave={() => setHoveredTextboxIndex(null)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
      >
        <math-field
          ref={mathFieldRef}
          readOnly={!isBeingEdited}
          tabIndex={isBeingEdited ? 0 : -1}
          suppressHydrationWarning
          onInput={handleMathInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`-top-2 flex items-center justify-start text-[18px] font-[500] focus:outline focus:outline-2 focus:outline-blue-500 h-fit bg-transparent w-fit z-10 overflow-x-auto ${
            isBeingEdited ? "min-w-28" : "select-none"
          }`}
          style={{
            maxWidth: `${maxTextboxWidth}px`,
            overflowX: "auto",
            color: textboxData.color,
          }}
          placeholder="Write Maths"
          value={localText}
        />
        <div
          className={`absolute top-0 left-0 w-full h-full cursor-text ${
            isBeingEdited ? "pointer-events-none" : ""
          }`}
          onDoubleClick={handleDoubleClick}
        ></div>

        {/* Render SendButton for the currently editing or last textbox (math), positioned to the right */}
        {shouldShowSendButton &&
          textboxData.isMath &&
          !isReadOnly &&
          handleSendMessage &&
          isSolveTogether && (
            <div
              ref={sendButtonRef}
              style={{
                position: "absolute",
                left: mathFieldWidth > 0 ? mathFieldWidth + 10 : 200, // Position based on measured math field width + small gap, fallback to 200px if width not measured yet
                top: "50%",
                transform: "translateY(-50%)", // Center vertically
                zIndex: 102, // Higher z-index to ensure it's above other elements
                pointerEvents: "auto", // Ensure pointer events work
              }}
            >
              <div
                onMouseDown={(e) => {
                  // Prevent the math field from losing focus during click
                  e.preventDefault();
                  e.stopPropagation();
                  isClickingSendButton.current = true;
                }}
                onMouseUp={() => {
                  // Reset the flag after mouse up
                  setTimeout(() => {
                    isClickingSendButton.current = false;
                  }, 50);
                }}
              >
                <SendButton
                  onClick={() => {
                    handleSendMessage("canvas_updated");
                    // After sending, blur the textbox
                    setTimeout(() => {
                      if (mathFieldRef.current) {
                        mathFieldRef.current.blur();
                      }
                    }, 100);
                  }}
                  isLoading={isAwaitingResponse}
                  disabled={isAwaitingResponse}
                />
              </div>
            </div>
          )}

        {showShimmer && !fadeIn && (
          <div
            className="shimmer-effect absolute inset-0 pointer-events-none z-[100]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)",
              transform: "translateX(-100%)",
              animation: "shimmer 3s 1 forwards",
              zIndex: 100,
            }}
          />
        )}

        <style jsx global>
          {`
            math-field::part(virtual-keyboard-toggle) {
              display: none;
            }
            math-field::part(menu-toggle) {
              display: none;
            }
            math-field::placeholder {
              color: #9ca3af;
            }
            math-field:hover {
              cursor: default;
            }
            @keyframes shimmer {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
            @keyframes fadeIn {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
            @keyframes fadeInWithShimmer {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
            .shimmer-effect {
              background-size: 200% 100%;
            }
            .animate-fadeIn {
              animation: fadeIn 0.5s ease-in-out;
            }
            .animate-fadeInWithShimmer {
              animation: fadeInWithShimmer 0.5s ease-in-out;
              position: relative;
            }
            .animate-fadeInWithShimmer::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 1),
                transparent
              );
              background-size: 200% 100%;
              transform: translateX(-100%);
              animation: shimmer 3s 1 forwards;
              pointer-events: none;
              z-index: 100;
            }
          `}
        </style>
      </div>
    );
  } else {
    return (
      <div
        ref={containerRef}
        className={`absolute ${fadeIn ? "animate-fadeInWithShimmer" : ""}`}
        style={{
          left: textboxData.x,
          top: textboxData.y,
        }}
        data-textbox-index={index}
        onMouseEnter={() => setHoveredTextboxIndex(index)}
        onMouseLeave={() => setHoveredTextboxIndex(null)}
      >
        {isBeingEdited ? (
          <>
            <textarea
              ref={textareaRef}
              onMouseDown={handleMouseDown}
              onClick={handleClick}
              onInput={handleInput}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-[18px] rounded font-[500] p-1 font-['Shantell_Sans'] resize-none bg-transparent whitespace-pre focus:outline-none focus:outline-blue-500 focus:border-blue-500 focus:rounded-sm"
              style={{
                width: "100px", // initial width, will be overridden by JS
                minWidth: "100px",
                maxWidth: `${maxTextboxWidth}px`,
                wordWrap: "break-word",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                display: "inline-block",
                boxSizing: "border-box",
                lineHeight: "1.625",
                color: textboxData.color,
              }}
              placeholder="Add Text"
              value={localText}
            />
            {/* Hidden mirror span for measuring width */}
            <span
              ref={mirrorRef}
              style={{
                position: "absolute",
                visibility: "hidden",
                whiteSpace: "pre",
                font: "inherit",
                fontWeight: 500,
                fontFamily: "'Shantell Sans', sans-serif",
                fontSize: "18px",
                padding: "1px",
                border: "none",
                boxSizing: "border-box",
                pointerEvents: "none",
                lineHeight: "1.625",
              }}
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="text-[18px] rounded font-[500] px-1 py-1 font-['Shantell_Sans'] bg-transparent select-none border-2 border-transparent focus:outline-none focus:border-blue-500 focus:rounded-md whitespace-pre"
            style={{
              lineHeight: "1.625",
              maxWidth: `${maxTextboxWidth}px`,
              wordWrap: "break-word",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              display: "inline-block",
              boxSizing: "border-box",
              color: textboxData.color,
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            tabIndex={0}
          >
            {localText}
          </div>
        )}

        {/* Render SendButton for the currently editing or last textbox (text), positioned to the right */}
        {shouldShowSendButton &&
          !textboxData.isMath &&
          !isReadOnly &&
          handleSendMessage &&
          isSolveTogether && (
            <div
              ref={sendButtonRef}
              style={{
                position: "absolute",
                left: textContainerWidth > 0 ? textContainerWidth + 10 : 200, // Position based on measured text container width + small gap
                top: "50%",
                transform: "translateY(-50%)", // Center vertically
                zIndex: 102, // Higher z-index to ensure it's above other elements
                pointerEvents: "auto", // Ensure pointer events work
              }}
            >
              <div
                onMouseDown={(e) => {
                  // Prevent the text field from losing focus during click
                  e.preventDefault();
                  e.stopPropagation();
                  isClickingSendButton.current = true;
                }}
                onMouseUp={() => {
                  // Reset the flag after mouse up
                  setTimeout(() => {
                    isClickingSendButton.current = false;
                  }, 50);
                }}
              >
                <SendButton
                  onClick={() => {
                    handleSendMessage("canvas_updated");
                    // After sending, blur the textbox
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.blur();
                      }
                    }, 100);
                  }}
                  isLoading={isAwaitingResponse}
                  disabled={isAwaitingResponse}
                />
              </div>
            </div>
          )}

        {showShimmer && !fadeIn && (
          <div
            className="shimmer-effect absolute inset-0 pointer-events-none z-[100]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)",
              transform: "translateX(-100%)",
              animation: "shimmer 3s 1 forwards",
              zIndex: 100,
            }}
          />
        )}

        <style jsx>{`
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          @keyframes fadeInWithShimmer {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-in-out;
          }
          .animate-fadeInWithShimmer {
            animation: fadeInWithShimmer 0.5s ease-in-out;
            position: relative;
          }
          .animate-fadeInWithShimmer::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 1),
              transparent
            );
            background-size: 200% 100%;
            transform: translateX(-100%);
            animation: shimmer 3s 1 forwards;
            pointer-events: none;
            z-index: 100;
          }
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .shimmer-effect {
            background-size: 200% 100%;
          }
        `}</style>
      </div>
    );
  }
};

export default Textbox;
