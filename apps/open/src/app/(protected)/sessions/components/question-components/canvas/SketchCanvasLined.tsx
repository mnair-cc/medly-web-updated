import "mathlive";
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
} from "react";
import { InputMode } from "../../../types";
import {
  Canvas,
  TextboxData,
  Highlight,
  CanvasMessage,
} from "@/app/types/types";
import { MathfieldElement } from "mathlive";
import { useTutorialTooltip } from "@/app/_hooks/useTutorialTooltip";

// Create a typed MathField component
const MathField = forwardRef<
  MathfieldElement,
  {
    className?: string;
    style?: React.CSSProperties;
    onInput?: (e: Event) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    placeholder?: string;
    value?: string;
    readOnly?: boolean;
  }
>((props, ref) => {
  return React.createElement("math-field", {
    ...props,
    ref,
  });
});

const LINE_HEIGHT = 80;

const SketchCanvas = ({
  inputMode,
  setInputMode,
  isReadOnly,
  canvas,
  canvasMessage,
  updateQuestionCanvas,
  questionGroupId,
  questionLegacyId,
  questionAnnotations,
  handleSendMessage,
  shimmerTextboxIndices = [],
  fadeInTextboxIndices = [],
  isSolveTogether,
  highlightTextbox,
}: {
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  isReadOnly: boolean;
  canvas: Canvas | undefined;
  canvasMessage?: CanvasMessage[] | undefined;
  updateQuestionCanvas: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas
  ) => void;
  questionGroupId: number;
  questionLegacyId: string;
  questionAnnotations: Highlight[] | undefined;
  handleSendMessage: (message: string) => void;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  isSolveTogether: boolean;
  highlightTextbox: boolean;
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const mathFieldRefs = useRef<(MathfieldElement | null)[]>([]);

  const { showTooltip, handleDismiss } =
    useTutorialTooltip("check_work_canvas");

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);
  const [clearInputHintText, setClearInputHintText] = useState<boolean>(false);

  // Get display textboxes - always show textboxes + 1 empty line at the end
  const getDisplayTextboxes = useCallback((): TextboxData[] => {
    const textboxes = canvas?.textboxes || [];

    // Always ensure there's at least one empty textbox for the first line
    if (textboxes.length === 0) {
      return [
        {
          x: 0,
          y: 0,
          text: "",
          fontSize: 16,
          color: "#000000",
          isMath: questionLegacyId.toLowerCase().includes("math"),
        },
      ];
    }

    // Check if we need to add another textbox at the end
    const hasContent = textboxes.some((textbox) => textbox.text.trim() !== "");

    if (hasContent) {
      const lastTextbox = textboxes[textboxes.length - 1];
      const lastTextboxEmpty = !lastTextbox?.text?.trim();

      // Only add a new textbox if the last one isn't already empty
      if (!lastTextboxEmpty) {
        return [
          ...textboxes,
          {
            x: 0,
            y: textboxes.length * LINE_HEIGHT,
            text: "",
            fontSize: 16,
            color: "#000000",
            isMath: questionLegacyId.toLowerCase().includes("math"),
          },
        ];
      }
    }

    return textboxes;
  }, [canvas?.textboxes, questionLegacyId]);

  // Update textbox
  const handleUpdateTextbox = useCallback(
    (index: number, text: string) => {
      const textboxes = canvas?.textboxes || [];
      const newTextboxes = [...textboxes];

      // If updating an index that doesn't exist yet, create new textboxes up to that index
      while (newTextboxes.length <= index) {
        newTextboxes.push({
          x: 0,
          y: newTextboxes.length * LINE_HEIGHT,
          text: "",
          fontSize: 16,
          color: "#000000",
          isMath: questionLegacyId.toLowerCase().includes("math"),
        });
      }

      // Update the specific textbox
      newTextboxes[index] = {
        ...newTextboxes[index],
        text,
      };

      const newCanvas = {
        ...canvas,
        textboxes: newTextboxes,
      };

      updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
    },
    [canvas, questionLegacyId, updateQuestionCanvas, questionGroupId]
  );

  // Handle math input
  const handleMathInput = useCallback(
    (e: Event, lineIndex: number) => {
      const mathField = e.target as MathfieldElement;
      const text = mathField.value || "";
      handleUpdateTextbox(lineIndex, text);
    },
    [handleUpdateTextbox]
  );

  // Handle line focus
  const handleLineFocus = useCallback((lineIndex: number) => {
    setFocusedLineIndex(lineIndex);

    // Check if it's a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Desmos-style calculator layout with dismiss button
    if (window.mathVirtualKeyboard) {
      window.mathVirtualKeyboard.layouts = [
        {
          label: '123',
          layers: [
            {
              // style: ".operator { background: black; color: white; border: 1px solid black; }",
              rows: [
                [
                  'x', 'y', '#@^2', '#@^{#?}',
                  { label: '[separator]', width: 0.5 },
                  '[7]', '[8]', '[9]', { class: 'operator', latex: '\\div' },
                  { label: '[separator]', width: 0.5 },
                  { label: '[hide-keyboard]', width: 2 },
                ],
                [
                  '(', ')', '\\lt', '\\gt',
                  { label: '[separator]', width: 0.5 },
                  '[4]', '[5]', '[6]', { class: 'operator', latex: '\\times' },
                  { label: '[separator]', width: 0.5 },
                  { label: '[backspace]', width: 2 },
                ],
                [
                  '|#@|', ',', '\\le', '\\ge',
                  { label: '[separator]', width: 0.5 },
                  '[1]', '[2]', '[3]', { class: 'operator', latex: '-' },
                  { label: '[separator]', width: 0.5 },
                  { label: '[left]', width: 1 }, { label: '[right]', width: 1 },
                ],
                [
                  '\\frac{#@}{#?}', '\\%', '\\sqrt{#0}', '\\pi',
                  { label: '[separator]', width: 0.5 },
                  '[0]', '[.]', { class: 'operator', latex: '=' }, { class: 'operator', latex: '+' },
                  { label: '[separator]', width: 0.5 },
                  {
                    label: '[return]',
                    width: 2
                  },
                ],
              ],
            }
          ],
        },
        // "numeric",
        "symbols",
        "alphabetic"
      ];
    }
  }, []);

  // Handle line blur
  const handleLineBlur = useCallback(
    (lineIndex: number) => {
      setFocusedLineIndex(null);

      // Clean up empty textboxes at the end, but keep at least one
      const textboxes = canvas?.textboxes || [];
      const newTextboxes = [...textboxes];

      // Remove empty textboxes from the end, but keep at least one
      while (
        newTextboxes.length > 1 &&
        newTextboxes[newTextboxes.length - 1].text.trim() === ""
      ) {
        newTextboxes.pop();
      }

      // Only update if something changed
      if (newTextboxes.length !== textboxes.length) {
        const newCanvas = {
          ...canvas,
          textboxes: newTextboxes,
        };
        updateQuestionCanvas(questionGroupId, questionLegacyId, newCanvas);
      }
    },
    [canvas, updateQuestionCanvas, questionGroupId, questionLegacyId]
  );

  // Handle line click
  const handleLineClick = useCallback(
    (lineIndex: number) => {
      if (isReadOnly) return;
      const mathField = mathFieldRefs.current[lineIndex];
      if (mathField) {
        mathField.focus();
      }
    },
    [isReadOnly]
  );

  // Handle key down in math field
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, lineIndex: number) => {
      if (e.key === "Enter" && !isReadOnly) {
        e.preventDefault();
        e.stopPropagation();

        // Check if current textbox has content and trigger check work
        const currentMathField = mathFieldRefs.current[lineIndex];
        const currentText = currentMathField?.value?.trim() || "";

        if (currentText && isSolveTogether) {
          handleSendMessage("Check my work");
          handleDismiss();
        }

        // Move to next line (index + 1)
        const nextLineIndex = lineIndex + 1;

        // The getDisplayTextboxes() function will automatically create a new textbox if needed
        // We need to wait a bit for the textbox to be created and the ref to be set
        setTimeout(() => {
          const nextMathField = mathFieldRefs.current[nextLineIndex];
          if (nextMathField) {
            nextMathField.focus();
          }
        }, 50);
      }
    },
    [isReadOnly, handleSendMessage, handleDismiss]
  );

  // Configure math fields when focused
  useEffect(() => {
    if (focusedLineIndex !== null) {
      const mathField = mathFieldRefs.current[focusedLineIndex];
      if (mathField) {
        setTimeout(() => {
          if (mathField) {
            // Check if it's a touch device
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            mathField.mathModeSpace = "\\:";
            // Use "auto" for touch devices so dismiss button works, "manual" for desktop
            mathField.mathVirtualKeyboardPolicy = isTouchDevice ? "auto" : "manual";
            mathField.inlineShortcuts = {
              sqrt: "\\sqrt",
              cube: "\\sqrt[3]",
              cuberoot: "\\sqrt[3]",
              "->": "\\to",
              "<->": "\\leftrightarrow",
              "+-": "\\pm",
              "!=": "\\ne",
              "*": "\\cdot",
            };

            // Handle virtual keyboard enter press
            mathField.addEventListener('input', (e: any) => {
              if (e.inputType === 'insertLineBreak' && !isReadOnly) {
                // Prevent the line break from being inserted
                e.preventDefault();

                // Get the current line index for this mathfield
                const currentLineIndex = mathFieldRefs.current.indexOf(mathField);

                if (currentLineIndex !== -1) {
                  // Check if current textbox has content and trigger check work
                  const currentText = mathField.value?.trim() || "";

                  if (currentText && isSolveTogether) {
                    handleSendMessage("Check my work");
                    handleDismiss();
                  }

                  // Move to next line (index + 1)
                  const nextLineIndex = currentLineIndex + 1;

                  // The getDisplayTextboxes() function will automatically create a new textbox if needed
                  // We need to wait a bit for the textbox to be created and the ref to be set
                  setTimeout(() => {
                    const nextMathField = mathFieldRefs.current[nextLineIndex];
                    if (nextMathField) {
                      nextMathField.focus();
                    }
                  }, 50);
                }
              }
            });
          }
        }, 50);
      }
    }

    // Listen for virtual keyboard hide events and blur the focused mathfield
    const handleVirtualKeyboardHide = () => {
      if (document.activeElement && document.activeElement.tagName.toLowerCase() === 'math-field') {
        (document.activeElement as HTMLElement).blur();
        setFocusedLineIndex(null);
      }
    };

    const handleGeometryChange = (evt: any) => {
      // When keyboard is hidden (height becomes 0)
      if (evt.detail?.height === 0 || !window.mathVirtualKeyboard.visible) {
        handleVirtualKeyboardHide();
      }
    };

    if (window.mathVirtualKeyboard) {
      window.mathVirtualKeyboard.addEventListener('geometrychange', handleGeometryChange);
    }

    return () => {
      if (window.mathVirtualKeyboard) {
        window.mathVirtualKeyboard.removeEventListener('geometrychange', handleGeometryChange);
      }
    };
  }, [focusedLineIndex, isReadOnly, isSolveTogether, handleSendMessage, handleDismiss]);

  // Global keyboard shortcuts (simplified)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a math field
      const isTypingInMathField =
        document.activeElement?.tagName.toLowerCase() === "math-field";

      // "/" key to switch to message mode
      if (
        (e.key === "/" || e.key === "?") &&
        !isReadOnly &&
        !isTypingInMathField &&
        inputMode !== "message"
      ) {
        e.preventDefault();
        e.stopPropagation();
        setInputMode("message");
        return;
      }

      // Escape key to exit message mode
      if (e.key === "Escape" && inputMode === "message") {
        e.preventDefault();
        e.stopPropagation();
        setClearInputHintText(true);
        setInputMode("math");
        setTimeout(() => setClearInputHintText(false), 100);
        return;
      }

      // Escape key to unfocus lines
      if (e.key === "Escape" && !isReadOnly && focusedLineIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown, {
      capture: true,
    });
    return () =>
      document.removeEventListener("keydown", handleGlobalKeyDown, {
        capture: true,
      });
  }, [isReadOnly, focusedLineIndex, inputMode, setInputMode]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (inputMode === "message") {
      setInputMode("math");
      return;
    }

    // Check if click is on canvas background (not on a line)
    const target = e.target as HTMLElement;
    if (target === canvasContainerRef.current) {
      // Focus the last line
      const displayTextboxes = getDisplayTextboxes();
      const lastLineIndex = displayTextboxes.length - 1;
      handleLineClick(lastLineIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Update cursor position for the hint
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const displayTextboxes = getDisplayTextboxes();

  // Update MathField values when canvas textboxes change
  useEffect(() => {
    displayTextboxes.forEach((textbox, index) => {
      const mathField = mathFieldRefs.current[index];
      if (mathField && textbox.text !== undefined) {
        // Only update if the value is different and the field is not currently focused
        if (mathField.value !== textbox.text && focusedLineIndex !== index) {
          mathField.value = textbox.text;
        }
      }
    });
  }, [displayTextboxes, focusedLineIndex]);

  return (
    <div
      ref={canvasContainerRef}
      className="absolute top-0 left-0 w-full h-full overflow-y-scroll cursor-text pb-24"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHoveringCanvas(true)}
      onMouseLeave={() => setIsHoveringCanvas(false)}
    >
      {/* <InputHint
        inputMode={inputMode}
        resetInputMode={() => setInputMode("math")}
        mousePosition={mousePosition}
        isReadOnly={isReadOnly}
        isHoveringOnTextbox={false}
        isHoveringCanvas={isHoveringCanvas}
        handleSendMessage={handleSendMessage}
        clearMessageText={clearInputHintText}
      /> */}

      <div className="w-full">
        {displayTextboxes.map((textbox, index) => (
          <div
            key={index}
            className={`w-full flex items-center border-b border-[#F2F2F7] relative ${fadeInTextboxIndices.includes(index)
              ? "animate-fadeInWithShimmer"
              : ""
              }`}
            style={{ height: `${LINE_HEIGHT}px` }}
            onClick={() => !isReadOnly && handleLineClick(index)}
          >
            {/* Line number */}
            <div className="w-14 flex-shrink-0 text-sm font-rounded-heavy text-gray-400 text-center">
              {index + 1}
            </div>

            <div
              className={`absolute left-20 -translate-x-2 font-['Shantell_Sans'] font-[600] text-gray-400 ${index === displayTextboxes.length - 1 && textbox.text === ""
                ? ""
                : "text-transparent"
                }`}
            >
              Write your work here
            </div>

            {isSolveTogether && focusedLineIndex === index && (
              <>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSendMessage("Check my work");
                  }}
                  className={`hidden md:flex absolute right-4 font-medium text-[12px] text-[#C9C9CA] items-center gap-1 hover:bg-[#F2F2F7] rounded-md px-2 py-1.5 `}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11.6504 2.78613C12.2893 2.78618 12.7686 2.92098 13.0859 3.23828C13.4031 3.55563 13.5381 4.03489 13.5381 4.67383V7.65234C13.538 8.27923 13.4023 8.75952 13.0859 9.08203C12.7692 9.40495 12.2908 9.54976 11.6504 9.5498H5.37305L4.50098 9.51172L5.16016 10.0664L5.16602 10.0713L6.46191 11.332L6.46387 11.335C6.57246 11.4492 6.65231 11.5931 6.65234 11.7852C6.65234 11.9644 6.59018 12.1243 6.47461 12.2393C6.35888 12.3542 6.19614 12.418 6.00977 12.418C5.84703 12.4179 5.67188 12.3467 5.54395 12.2246L5.54297 12.2227L2.66016 9.38086V9.37988C2.52551 9.25035 2.45508 9.07419 2.45508 8.90234C2.45512 8.72535 2.52527 8.54795 2.66113 8.41797L5.54297 5.58203L5.64648 5.49707C5.75783 5.42261 5.88738 5.38189 6.00977 5.38184C6.19614 5.38184 6.35887 5.44559 6.47461 5.56055C6.59022 5.67546 6.65234 5.83533 6.65234 6.01465C6.65234 6.21087 6.57369 6.35586 6.46289 6.4668L6.46191 6.46777L5.16602 7.72852L5.16113 7.7334L5.0957 7.65723L5.16016 7.7334L4.5 8.29102L5.37207 8.25H11.625C11.8672 8.25 12.017 8.19784 12.1084 8.10645C12.1998 8.01508 12.2529 7.86414 12.2529 7.61719V4.7041C12.2529 4.46186 12.2009 4.31274 12.1104 4.22266C12.0196 4.13262 11.8697 4.08106 11.625 4.08105H8.8623C8.47476 4.08085 8.20529 3.78865 8.20508 3.43359C8.20508 3.07775 8.48023 2.78634 8.8623 2.78613H11.6504Z"
                      fill="#C9C9CA"
                      stroke="#C9C9CA"
                      stroke-width="0.2"
                    />
                  </svg>
                  {showTooltip ? "Press Enter to Add New Line" : "Press Enter"}
                </button>
              </>
            )}

            {/* Line content */}
            <div
              className={`flex-1 px-3 h-full flex items-center ${highlightTextbox &&
                (focusedLineIndex === index ||
                  (focusedLineIndex === null &&
                    index === displayTextboxes.length - 1 &&
                    textbox.text.trim() === ""))
                ? "border-2 border-[#1CA4FF] rounded-md"
                : ""
                }`}
            >
              <MathField
                ref={(el: MathfieldElement | null) => {
                  mathFieldRefs.current[index] = el;
                  // Always set the value from textbox.text when the element is created
                  if (el && textbox.text !== undefined) {
                    el.value = textbox.text;
                  }
                }}
                className="w-full h-fit flex items-center text-[18px] font-[500] focus:outline-none bg-transparent overflow-x-auto rounded-md"
                style={{
                  maxWidth: "700px",
                  minHeight: "20px",
                  overflowX: "auto",
                  // borderWidth: true ? "2px" : "0px",
                  // borderColor: true ? "#1CA4FF" : "transparent",
                }}
                onInput={(e: Event) => handleMathInput(e, index)}
                onFocus={() => handleLineFocus(index)}
                onBlur={() => handleLineBlur(index)}
                onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, index)}
                readOnly={isReadOnly}
              // placeholder={index === 0 && textbox.text === '' ? 'Write working out' : ''}
              />
            </div>

            {/* Shimmer effect for existing textboxes being updated */}
            {shimmerTextboxIndices.includes(index) &&
              !fadeInTextboxIndices.includes(index) && (
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
          </div>
        ))}
      </div>

      <style jsx global>{`
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
};

export default SketchCanvas;
