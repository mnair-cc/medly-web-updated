import { useState, useEffect, useCallback, useRef } from "react";
import {
  Message,
  QuestionWithMarkingResult,
  CanvasMessage,
  Decoration,
  FloatingMessage,
  Canvas,
} from "@/app/types/types";
import { Socket } from "socket.io-client";
import { useUser } from "@/app/_context/UserProvider";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { formatQuestionsForLLM } from "@/app/_lib/utils/llmDataFormatter";
import {
  buildCanvasLatexSummary,
  renderLinesToPngBase64,
  getQuestionIdentifier,
  formatCanvasDataByParts,
} from "@/app/_lib/utils/utils";
import { toast } from "sonner";
import { useMedlyChatTutorial } from "./useMedlyChatTutorial";
import { useRaindropTracking } from "./useRaindropTracking";

// Check if markingTable has actual parseable content (not just headers)
const hasMarkingTableContent = (markingTable: string | undefined): boolean => {
  if (!markingTable) return false;
  const rows = markingTable.split("\n").filter((row) => row.trim());
  const contentRows = rows.slice(2); // Skip header and separator rows
  return contentRows.length > 0;
};

// Check if a message is a user message (not a system message)
const isUserMessage = (message: string): boolean => {
  return (
    message !== "next_question" &&
    message !== "canvas_updated" &&
    message !== "marking_updated" &&
    message !== "medly_tutorial" &&
    !message.startsWith("cards_data:") &&
    !message.startsWith("spot_highlighted:") &&
    !message.includes("selected_question_index_")
  );
};

// Split text into segments using LaTeX-aware logic
const splitTextIntoSegments = (text: string): string[] => {
  // Temporarily protect LaTeX expressions from splitting
  const latexPlaceholders: string[] = [];
  let protectedText = text;

  // Replace LaTeX expressions with placeholders
  const latexRegexes = [
    /\$\$([\s\S]*?)\$\$/g, // Block LaTeX with $$
    /\$([^\$]*?)\$/g, // Inline LaTeX with $
    /\\\[([\s\S]*?)\\\]/g, // Block LaTeX with \[ \]
    /\\\(([\s\S]*?)\\\)/g, // Inline LaTeX with \( \)
  ];

  latexRegexes.forEach((regex) => {
    protectedText = protectedText.replace(regex, (match: string) => {
      const placeholder = `__LATEX_${latexPlaceholders.length}__`;
      latexPlaceholders.push(match);
      return placeholder;
    });
  });

  // Step 1: Split by newlines first - each line becomes a potential segment
  const newlineSplit = protectedText
    .replace("\n$$", "$$")
    .replace(/\n\n/g, "\n")
    .split("\n")
    .filter((segment) => segment.trim().length > 0);

  const finalSegments: string[] = [];

  // Step 2: Process each line-separated segment
  for (const segment of newlineSplit) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) continue;

    // Check if this segment contains sentence-ending punctuation
    // If it does, we can split it further; if not, treat it as a single segment
    const hasSentenceEnding = /[.!?]/.test(trimmedSegment);

    if (!hasSentenceEnding) {
      // No sentence punctuation - treat as single segment
      finalSegments.push(trimmedSegment);
    } else {
      // Has sentence punctuation - split by sentence boundaries
      const sentences = trimmedSegment
        .split(/([.!?])(\s+|$)/)
        .filter((part) => part.trim().length > 0);

      let currentSentence = "";

      for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];

        // If this is punctuation
        if (/^[.!?]$/.test(part)) {
          currentSentence += part;

          // Check if this should NOT be split:
          const beforePunct = currentSentence.slice(0, -1);
          const nextPart = sentences[i + 1];

          // 1. Decimal numbers (e.g., "3.14")
          const isDecimal =
            part === "." &&
            /\d$/.test(beforePunct) &&
            nextPart &&
            /^\s*\d/.test(nextPart);

          // 2. List items (e.g., "1.", "2.", "a.", "i.")
          const isListItem =
            part === "." &&
            /^\s*(?:\d+|[a-z]|[ivx]+)$/i.test(beforePunct.trim());

          // 3. Abbreviations (e.g., "Dr.", "Mr.", "etc.")
          const isAbbreviation =
            part === "." &&
            /\b(?:Dr|Mr|Mrs|Ms|Prof|etc|vs|e\.g|i\.e)$/i.test(beforePunct);

          if (!isDecimal && !isListItem && !isAbbreviation) {
            // This is a sentence boundary - push the current sentence
            if (currentSentence.trim()) {
              finalSegments.push(currentSentence.trim());
            }
            currentSentence = "";
            // Skip the whitespace part that follows punctuation
            if (i + 1 < sentences.length && /^\s+$/.test(sentences[i + 1])) {
              i++;
            }
          }
        } else {
          // This is regular text
          currentSentence += part;
        }
      }

      // Add any remaining text as a segment
      if (currentSentence.trim()) {
        finalSegments.push(currentSentence.trim());
      }
    }
  }

  // Restore LaTeX expressions in each segment
  const processedSegments = finalSegments.map((segment) => {
    let result = segment;
    latexPlaceholders.forEach((latex, index) => {
      result = result.replace(`__LATEX_${index}__`, latex);
    });
    return result;
  });

  return processedSegments.filter((segment) => segment.length > 0);
};

export const usePracticeGroupAi = ({
  socket,
  socketError,
  questionWithMarkingResult,
  questionsWithMarkingResults,
  solveTogetherOrFeedback,
  currentQuestionIndex,
  onHighlightUpdate,
  currentCanvas,
  onDecorationsUpdate,
  onCanvasMessageUpdate,
  onFloatingMessageUpdate,
  onCanvasUpdate,
  onShimmerTextboxIndicesChange,
  onFadeInTextboxIndicesChange,
  currentStepIndex,
  setCurrentStepIndex,
  sessionType,
  currentPageIndex,
  onIsQuestionStemHighlightedChange,
  onIsQuestionPartHighlightedChange,
  onHighlightedQuestionPartIndexChange,
  isActive = true,
}: {
  socket: Socket | null;
  socketError: Error | null;
  questionWithMarkingResult: QuestionWithMarkingResult;
  questionsWithMarkingResults: QuestionWithMarkingResult[];
  solveTogetherOrFeedback:
    | "solveTogetherMessage"
    | "feedbackMessage"
    | "reviewMessage";
  currentQuestionIndex: number;
  onHighlightUpdate: (text: string[]) => void;
  currentCanvas: any[];
  onDecorationsUpdate?: (decorations: Decoration[]) => void;
  onCanvasMessageUpdate?: (messages: CanvasMessage[]) => void;
  onFloatingMessageUpdate?: (message: FloatingMessage) => void;
  onCanvasUpdate?: (canvas: Canvas[]) => void;
  onShimmerTextboxIndicesChange?: (indices: number[]) => void;
  onFadeInTextboxIndicesChange?: (indices: number[]) => void;
  currentStepIndex?: number;
  setCurrentStepIndex?: (step: number) => void;
  sessionType?: string;
  currentPageIndex?: number;
  onIsQuestionStemHighlightedChange?: (isHighlighted: boolean) => void;
  onIsQuestionPartHighlightedChange?: (isHighlighted: boolean) => void;
  onHighlightedQuestionPartIndexChange?: (index: number) => void;
  /** When false, socket handlers are not registered to avoid duplicate event processing */
  isActive?: boolean;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [canReply, setCanReply] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [activeTimeouts, setActiveTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [isCleared, setIsCleared] = useState(false);
  const [shimmerTextboxIndices, setShimmerTextboxIndices] = useState<number[]>(
    []
  );
  const [fadeInTextboxIndices, setFadeInTextboxIndices] = useState<number[]>(
    []
  );
  const [messageTimeoutId, setMessageTimeoutId] =
    useState<NodeJS.Timeout | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<string>("");
  const { user, setUser } = useUser();
  const { track } = useTracking();
  const { isTutorial, markTutorialComplete } = useMedlyChatTutorial();
  const {
    beginInteraction,
    finishInteraction,
    finishInteractionWithError,
    hasActiveInteraction,
    clearInteraction,
    clearAllHistory,
  } = useRaindropTracking();

  useEffect(() => {
    return () => {
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }
    };
  }, [messageTimeoutId]);

  useEffect(() => {
    // Skip socket registration when hook is inactive to avoid duplicate event handlers
    if (!socket || socketError || !isActive) return;

    const handleFirstMessage = (data: any) => {
      // Clear message timeout when first message is received
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        setMessageTimeoutId(null);
      }

      setMessages((prev) => [
        ...prev,
        { message: data, type: "apiMessage" as const },
      ]);
    };

    const handleCurrentStepMessage = (data: any) => {
      if (setCurrentStepIndex && currentStepIndex !== undefined) {
        setCurrentStepIndex(Math.max(currentStepIndex, Number(data)));
      }
    };

    const handleFloatingMessage = (data: any) => {
      // console.log("floating_message", data, data.target_index ?? 0);
      if (onFloatingMessageUpdate) {
        onFloatingMessageUpdate({
          text: data.text,
          targetIndex:
            data.target_index === 0 ? 0 : data.target_index || undefined,
          targetText: data.target_text || undefined,
          targetAction: data.action || undefined,
          targetComponent: data.target_component ?? undefined,
        });
      }
    };

    const handleQuestionHighlightMessage = (data: any) => {
      // console.log("question_highlight_message", data);
      if (data.show == true) {
        if (data.type == "stem") {
          if (onIsQuestionStemHighlightedChange) {
            onIsQuestionStemHighlightedChange(true);
          }
        } else if (data.type == "part") {
          if (
            onIsQuestionPartHighlightedChange &&
            onHighlightedQuestionPartIndexChange
          ) {
            onIsQuestionPartHighlightedChange(true);
            onHighlightedQuestionPartIndexChange(Math.max(0, data.index - 1));
          }
        }
      } else {
        if (onIsQuestionStemHighlightedChange) {
          onIsQuestionStemHighlightedChange(false);
        }
        if (onIsQuestionPartHighlightedChange) {
          onIsQuestionPartHighlightedChange(false);
        }
        if (onHighlightedQuestionPartIndexChange) {
          onHighlightedQuestionPartIndexChange(0);
        }
      }
    };

    const handleDecorationMessage = (data: any) => {
      // console.log("decoration_message", data);
      if (onDecorationsUpdate) {
        onDecorationsUpdate(data);
      }
    };

    const handleCanvasMessage = (data: any) => {
      // console.log("canvas_message", data);
      if (onCanvasMessageUpdate && data) {
        onCanvasMessageUpdate(data.canvasMessages || []);
      }
    };

    const handleCanvasUpdated = (data: any) => {
      // console.log("canvas_updated", data);
      if (onCanvasUpdate && data?.canvas) {
        onCanvasUpdate([data.canvas]);
      }
    };

    const handleShimmerTextboxIndices = (data: any) => {
      // console.log("shimmer_textbox_indices", data);
      if (onShimmerTextboxIndicesChange && data?.indices) {
        onShimmerTextboxIndicesChange(data.indices);
      }
    };

    const handleFadeInTextboxIndices = (data: any) => {
      // console.log("fade_in_textbox_indices", data);
      if (onFadeInTextboxIndicesChange && data?.indices) {
        onFadeInTextboxIndicesChange(data.indices);
      }
    };

    const handleMessage = (data: any) => {
      // console.info("Message received", data);
      if (data && !isCleared) {
        // Clear message timeout when message is received
        if (messageTimeoutId) {
          clearTimeout(messageTimeoutId);
          setMessageTimeoutId(null);
        }

        // Clear any existing timeouts before starting new message stream
        activeTimeouts.forEach((timeout) => clearTimeout(timeout));
        setActiveTimeouts([]);

        // Use the advanced text segmentation function
        const processedSegments = splitTextIntoSegments(data);

        // Add all segments as messages
        for (let index = 0; index < processedSegments.length; index++) {
          setMessages((prev) => [
            ...prev,
            { message: processedSegments[index], type: "apiMessage" as const },
          ]);
        }

        setIsAwaitingResponse(false);
      }
    };

    const handleFinalResponse = (data: any) => {
      // console.log("final_response", data);
      setCanReply(true);
      try {
        setIsAwaitingResponse(false);

        track("practice_feedback_message_received", {
          question_id: questionWithMarkingResult.legacyId,
          message_type: solveTogetherOrFeedback,
          message: data.response || data.message,
        });

        // Finish Raindrop interaction tracking
        if (hasActiveInteraction() && data.response) {
          finishInteraction(JSON.stringify(data));
        }

        // Handle canvas updates if they exist
        if (
          data.canvas_updates &&
          data.canvas_updates.length > 0 &&
          onCanvasUpdate
        ) {
          const updatedIndices: number[] = [];
          const newIndices: number[] = [];

          // First, determine which indices will be updated vs newly created
          data.canvas_updates.forEach(
            (update: { index: number; text: string }) => {
              const textLines = update.text.split("\\\\");

              // Check if textbox exists at the given index
              if (
                currentCanvas[0] &&
                currentCanvas[0].textboxes &&
                currentCanvas[0].textboxes[update.index]
              ) {
                // Existing textbox - add to shimmer only
                updatedIndices.push(update.index);

                // Track additional indices for multi-line text (these are new, so fade-in with shimmer)
                for (let i = 1; i < textLines.length; i++) {
                  newIndices.push(update.index + i); // Fade-in (includes shimmer)
                }
              } else {
                // New textbox(es) - add to fade-in (includes shimmer)
                for (let i = 0; i < textLines.length; i++) {
                  newIndices.push(update.index + i); // Fade-in (includes shimmer)
                }
              }
            }
          );

          // Set animations immediately
          setShimmerTextboxIndices(updatedIndices);
          setFadeInTextboxIndices(newIndices);

          // Delay the actual canvas content updates by 1.2 seconds
          setTimeout(() => {
            const updatedCanvas = [...currentCanvas];

            data.canvas_updates.forEach(
              (update: { index: number; text: string }) => {
                if (updatedCanvas[0] && updatedCanvas[0].textboxes) {
                  // Split text by line breaks (\\\\)
                  const textLines = update.text.split("\\\\");

                  // Check if textbox exists at the given index
                  if (updatedCanvas[0].textboxes[update.index]) {
                    // Get reference to the base textbox before updating
                    const baseTextbox =
                      updatedCanvas[0].textboxes[update.index];

                    // Update existing textbox with first line
                    updatedCanvas[0] = {
                      ...updatedCanvas[0],
                      textboxes: updatedCanvas[0].textboxes.map(
                        (textbox, i) => {
                          if (i === update.index) {
                            return { ...textbox, text: textLines[0] };
                          }
                          return textbox;
                        }
                      ),
                    };

                    // Create new textboxes for additional lines
                    if (
                      textLines.length > 1 &&
                      baseTextbox &&
                      updatedCanvas[0].textboxes
                    ) {
                      const newTextboxes = [...updatedCanvas[0].textboxes];

                      for (let i = 1; i < textLines.length; i++) {
                        const newIndex = update.index + i;
                        const newTextbox = {
                          ...baseTextbox,
                          text: textLines[i],
                          x: baseTextbox.x,
                          y: baseTextbox.y + 40 * i,
                        };
                        newTextboxes[newIndex] = newTextbox;
                      }

                      updatedCanvas[0] = {
                        ...updatedCanvas[0],
                        textboxes: newTextboxes,
                      };
                    }
                  } else {
                    // Create new textbox if index doesn't exist
                    const previousTextbox =
                      updatedCanvas[0].textboxes[update.index - 1];
                    const newTextboxes = [...updatedCanvas[0].textboxes];

                    // Create textboxes for each line
                    for (let i = 0; i < textLines.length; i++) {
                      const newIndex = update.index + i;

                      // Use previous textbox as template if available, otherwise use defaults
                      const templateTextbox = previousTextbox || {
                        x: 50, // Default x position
                        y: 50, // Default y position
                        width: 200, // Default width
                        height: 30, // Default height
                        fontSize: 16, // Default font size
                        fontFamily: "Arial", // Default font family
                        fill: "#000000", // Default text color
                      };

                      const newTextbox = {
                        ...templateTextbox,
                        text: textLines[i],
                        x: templateTextbox.x,
                        y: previousTextbox
                          ? templateTextbox.y + 40 + 40 * i
                          : templateTextbox.y + 40 * i,
                      };
                      newTextboxes[newIndex] = newTextbox;
                    }

                    updatedCanvas[0] = {
                      ...updatedCanvas[0],
                      textboxes: newTextboxes,
                    };
                  }
                }
              }
            );

            onCanvasUpdate(updatedCanvas);
          }, 1200); // 1.2-second delay for content updates

          // Clear shimmer after animation duration (3 seconds total)
          setTimeout(() => {
            setShimmerTextboxIndices([]);
            setFadeInTextboxIndices([]);
          }, 3000);
        }

        if (data.question_highlight) {
          if (data.question_highlight.show == true) {
            setTimeout(() => {
              if (data.question_highlight.type == "stem") {
                if (onIsQuestionStemHighlightedChange) {
                  onIsQuestionStemHighlightedChange(true);
                }
              } else if (data.question_highlight.type == "part") {
                if (
                  onIsQuestionPartHighlightedChange &&
                  onHighlightedQuestionPartIndexChange
                ) {
                  onIsQuestionPartHighlightedChange(true);
                  onHighlightedQuestionPartIndexChange(
                    Math.max(0, data.question_highlight.index - 1)
                  );
                }
              }
            }, data.response.length * 25);
          } else {
            if (onIsQuestionStemHighlightedChange) {
              onIsQuestionStemHighlightedChange(false);
            }
            if (onIsQuestionPartHighlightedChange) {
              onIsQuestionPartHighlightedChange(false);
            }
            if (onHighlightedQuestionPartIndexChange) {
              onHighlightedQuestionPartIndexChange(0);
            }
          }

          if (data.question_highlight.highlighted_text) {
            // Ensure highlighted_text is always an array
            const highlights = Array.isArray(
              data.question_highlight.highlighted_text
            )
              ? data.question_highlight.highlighted_text
              : [data.question_highlight.highlighted_text];
            onHighlightUpdate(highlights);
          }
        }

        // Handle step index updates
        if (data.step_index !== undefined && setCurrentStepIndex) {
          setCurrentStepIndex(data.step_index);
        }
      } catch (error) {
        console.error("Error handling final response:", error);
        toast.error("Failed to process response");
      }
    };

    const handleError = (error: any) => {
      console.error("Socket error:", error);
      setIsAwaitingResponse(false);
      toast.error("Connection error. Please try again.");

      // Clean up current interaction on error
      if (hasActiveInteraction()) {
        finishInteractionWithError(error?.message || "Unknown socket error");
      }
    };

    const handleTimeout = () => {
      console.warn("Socket timeout");
      setIsAwaitingResponse(false);
      // // toast.error("Request timed out. Please try again.");

      // Clean up current interaction on timeout
      if (hasActiveInteraction()) {
        finishInteractionWithError("Request timed out");
      }
    };

    // Register all socket event listeners
    socket.on("firstMessage", handleFirstMessage);
    socket.on("current_step_message", handleCurrentStepMessage);
    socket.on("floating_message", handleFloatingMessage);
    // socket.on("question_highlight_message", handleQuestionHighlightMessage);
    socket.on("decoration_message", handleDecorationMessage);
    socket.on("canvas_message", handleCanvasMessage);
    socket.on("canvas_updated", handleCanvasUpdated);
    socket.on("shimmer_textbox_indices", handleShimmerTextboxIndices);
    socket.on("fade_in_textbox_indices", handleFadeInTextboxIndices);
    socket.on("message", handleMessage);
    socket.on("final_response", handleFinalResponse);
    socket.on("error", handleError);
    socket.on("timeout", handleTimeout);

    return () => {
      // Clear timeouts on cleanup
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }

      // Remove all socket listeners
      socket.off("firstMessage", handleFirstMessage);
      socket.off("current_step_message", handleCurrentStepMessage);
      socket.off("floating_message", handleFloatingMessage);
      socket.off("decoration_message", handleDecorationMessage);
      socket.off("canvas_message", handleCanvasMessage);
      socket.off("canvas_updated", handleCanvasUpdated);
      socket.off("shimmer_textbox_indices", handleShimmerTextboxIndices);
      socket.off("fade_in_textbox_indices", handleFadeInTextboxIndices);
      socket.off("message", handleMessage);
      socket.off("final_response", handleFinalResponse);
      socket.off("error", handleError);
      socket.off("timeout", handleTimeout);
    };
  }, [
    socket,
    socketError,
    isCleared,
    onHighlightUpdate,
    onDecorationsUpdate,
    onCanvasMessageUpdate,
    onFloatingMessageUpdate,
    onCanvasUpdate,
    onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange,
    activeTimeouts,
    questionWithMarkingResult.legacyId,
    solveTogetherOrFeedback,
    setCurrentStepIndex,
    currentStepIndex,
    track,
    messageTimeoutId,
    currentCanvas,
    isActive,
  ]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        track("practice_feedback_message_sent", {
          question_id: questionWithMarkingResult.legacyId,
          message_type: solveTogetherOrFeedback,
          message: message,
        });

        // Mark tutorial as complete on first message send
        if (isTutorial) {
          markTutorialComplete();
        }

        // Check if socket is disconnected and attempt to reconnect FIRST
        if (socket && socket.connected === false) {
          socket.disconnect();
          socket.connect();

          // Give the socket a moment to reconnect before proceeding
          const isConnected = await new Promise<boolean>((resolve) => {
            // Set a timeout in case connection takes too long
            const timeoutId = setTimeout(() => resolve(false), 3000);

            // Listen for successful connection
            socket.once("connect", () => {
              clearTimeout(timeoutId);
              resolve(true);
            });
          });

          if (!isConnected) {
            setIsAwaitingResponse(false);
            setCanReply(true);
            if (isUserMessage(message)) {
              setUserInput(message); // Restore user's message only
            }
            toast.error("Failed to connect to service. Please try again.");
            return;
          }
        }

        // Now check if we have valid socket and question data
        if (!socket || !questionWithMarkingResult) {
          setIsAwaitingResponse(false);
          setCanReply(true);
          if (isUserMessage(message)) {
            setUserInput(message); // Restore user's message only
          }
          toast.error("Connection not available. Please try again.");
          return;
        }

        if (socketError) {
          setIsAwaitingResponse(false);
          setCanReply(true);
          if (isUserMessage(message)) {
            setUserInput(message); // Restore user's message only
          }
          toast.error(
            "Connection error. Please refresh the page and try again."
          );
          return;
        }

        if (message === "next_question") {
          activeTimeouts.forEach((timeout) => clearTimeout(timeout));
          setActiveTimeouts([]);
          setMessages([]);
          setMessages((prev) => [
            ...prev,
            { message: "next_question", type: "systemMessage" },
          ]);
          setUserInput("");
          return;
        } else if (message.includes("selected_question_index_")) {
          activeTimeouts.forEach((timeout) => clearTimeout(timeout));
          setActiveTimeouts([]);

          // Parse the question number and part number from the message
          const parts = message.split("_");
          const questionNumber = parseInt(parts[3]);
          const partIndex = parseInt(parts[4]);
          const partLetter = String.fromCharCode(96 + partIndex);

          setMessages((prev) => [
            ...prev,
            {
              message: `Help me with question ${questionNumber} part ${partLetter}`,
              type: "userMessage",
            },
          ]);
          setUserInput("");
        } else if (message === "canvas_updated") {
          // Don't send canvas_updated if there's already a message awaiting response
          if (!isAwaitingResponse) {
            activeTimeouts.forEach((timeout) => clearTimeout(timeout));
            setActiveTimeouts([]);
            setMessages((prev) => [
              ...prev,
              { message: "canvas_updated", type: "systemMessage" },
            ]);
          }
        } else if (message === "marking_updated") {
          if (!isAwaitingResponse) {
            activeTimeouts.forEach((timeout) => clearTimeout(timeout));
            setActiveTimeouts([]);
            setMessages((prev) => [
              ...prev,
              { message: "marking_updated", type: "systemMessage" },
            ]);
          }
        } else if (message.startsWith("cards_data:")) {
          activeTimeouts.forEach((timeout) => clearTimeout(timeout));
          setActiveTimeouts([]);
          // setIsAwaitingResponse(false);

          // Handle card data from SessionStructure
          try {
            const cardDataStr = message.replace("cards_data:", "");
            const cardData = JSON.parse(cardDataStr);
            const {
              markedQuestion,
              markedQuestionIndex,
              currentPageIndex,
              questionNumber,
            } = cardData;

            // Recreate the getQuestionHeading function locally
            const getQuestionHeading = (question: any, index: number) => {
              const isAQA = question.questionLegacyId?.includes("aqa");
              const qNum = questionNumber || (currentPageIndex || 0) + 1;

              if (isAQA) {
                return `Markscheme ${qNum}.${index + 1}`;
              } else {
                const subQuestionLetter = String.fromCharCode(97 + index);
                return `Markscheme ${qNum} (${subQuestionLetter})`;
              }
            };

            const cardMessages: Message[] = [];

            // 1. Add markscheme card if the marked question has markingTable with content (but not ao_analysis)
            if (
              hasMarkingTableContent(markedQuestion.markingTable) &&
              (markedQuestion.ao_analysis?.length === 0 ||
                markedQuestion.ao_analysis?.length === undefined)
            ) {
              cardMessages.push({
                message: "",
                type: "markschemeCard",
                cardData: {
                  currentQuestionWithMarkingResult: markedQuestion,
                  question: markedQuestion,
                  index: markedQuestionIndex,
                  getQuestionHeading: getQuestionHeading,
                  showMarkScheme: false,
                },
              });
            }

            // 2. Add AO analysis cards if the marked question has ao_analysis
            if (
              markedQuestion.ao_analysis &&
              markedQuestion.ao_analysis.length > 0
            ) {
              markedQuestion.ao_analysis.forEach((ao: any) => {
                const progress =
                  ao.ao_markmax && ao.ao_markmax > 0
                    ? Math.round(((ao.ao_mark || 0) / ao.ao_markmax) * 100)
                    : 0;
                const feedbackPoints = [
                  ...(ao.strengths_feedback_point || []).map(
                    (text: string) => ({ text, mark: 1 })
                  ),
                  ...(ao.weaknesses_feedback_point || []).map(
                    (text: string) => ({ text, mark: -1 })
                  ),
                ];

                cardMessages.push({
                  message: "",
                  type: "aoAnalysisCard",
                  cardData: {
                    aoData: {
                      label: `AO${ao.ao_number || "?"}`,
                      score: ao.ao_mark || 0,
                      maxScore: ao.ao_markmax || 0,
                      progress: progress,
                      feedbackPoints: feedbackPoints,
                    },
                    index: markedQuestionIndex,
                    getQuestionHeading: getQuestionHeading,
                    question: markedQuestion,
                  },
                });
              });
            }

            // 3. Add strategy card if available (only for the first question/main question)
            if (
              markedQuestion.strategy?.steps?.length > 0 &&
              markedQuestionIndex === 0
            ) {
              cardMessages.push({
                message: "",
                type: "strategyCard",
                cardData: {
                  strategySteps: markedQuestion.strategy.steps,
                  currentStepIndex: currentStepIndex || 0,
                  isMarked: markedQuestion.isMarked || false,
                  userMark: markedQuestion.userMark || 0,
                },
              });
            }

            // 4. Add timing card (only for the first question part to avoid duplicates)
            if (markedQuestionIndex === 0) {
              cardMessages.push({
                message: "",
                type: "timingCard",
                cardData: {
                  durationSpentInSeconds:
                    markedQuestion.durationSpentInSeconds || 0,
                  isMarked: markedQuestion.isMarked || false,
                  subLessonId: markedQuestion.subLessonId,
                  difficulty: markedQuestion.difficulty,
                },
              });
            }

            // Add or update card messages in the conversation
            if (cardMessages.length > 0) {
              setMessages((prev) => {
                const questionLegacyId = markedQuestion.legacyId;
                if (!questionLegacyId) {
                  return [...prev, ...cardMessages];
                }

                // Check for existing markscheme card for this question and index
                const existingCardIndex = prev.findIndex(
                  (msg) =>
                    msg.type === "markschemeCard" &&
                    msg.cardData?.currentQuestionWithMarkingResult?.legacyId ===
                      questionLegacyId &&
                    msg.cardData?.index === markedQuestionIndex
                );

                // If a card exists, update it in-place with new data
                if (existingCardIndex !== -1) {
                  const newMarkschemeCard = cardMessages.find(
                    (c) => c.type === "markschemeCard"
                  );
                  if (newMarkschemeCard) {
                    const updated = [...prev];
                    updated[existingCardIndex] = {
                      ...updated[existingCardIndex],
                      cardData: newMarkschemeCard.cardData,
                    };
                    return updated;
                  }
                  return prev;
                }

                // No existing cards for this question, add all new cards
                return [...prev, ...cardMessages];
              });
            }
          } catch (error) {
            console.error("Error parsing card data:", error);
          }
          return;
        } else if (message === "medly_tutorial") {
          if (!isAwaitingResponse) {
            activeTimeouts.forEach((timeout) => clearTimeout(timeout));
            setActiveTimeouts([]);
          }
        } else if (message.startsWith("spot_question_context:")) {
          // Hidden payload for spot question - don't add to chat UI
          // Falls through to send to backend for AI processing
        } else if (message.startsWith("spot_highlighted:")) {
          // Show highlight in chat UI as system message (don't send to backend)
          activeTimeouts.forEach((timeout) => clearTimeout(timeout));
          setActiveTimeouts([]);
          setIsAwaitingResponse(false);
          setCanReply(true);
          setMessages((prev) => [
            ...prev,
            { message: message, type: "systemMessage" },
          ]);
          return;
        } else {
          setMessages((prev) => [...prev, { message, type: "userMessage" }]);
        }

        setIsCleared(false);
        activeTimeouts.forEach((timeout) => clearTimeout(timeout));
        setActiveTimeouts([]);
        setIsAwaitingResponse(true);

        // Collect ALL questions' canvas data and Desmos expressions with headers
        const allCanvasData: any[] = [];
        const allDesmosWithHeaders: Array<{
          header: string;
          expressions: any[];
        }> = [];
        const allDesmosExpressions: any[] = [];
        const allSketchCanvasExpressions: any[] = [];
        const allCanvasPathsWithHeaders: Array<{
          questionId: string;
          paths: any[];
        }> = [];
        const headers: string[] = [];

        questionsWithMarkingResults.forEach((question, index) => {
          const questionId =
            sessionType && currentPageIndex !== undefined
              ? getQuestionIdentifier(index, currentPageIndex, sessionType)
              : `${index + 1}`;

          // Collect canvas objects
          if (
            question.canvas &&
            (question.canvas.textboxes?.length > 0 ||
              question.canvas.paths?.length > 0 ||
              question.canvas.maths?.length > 0)
          ) {
            allCanvasData.push(question.canvas);
          }

          // Collect canvas paths with questionId for stroke rendering
          if (question.canvas?.paths && question.canvas.paths.length > 0) {
            allCanvasPathsWithHeaders.push({
              questionId,
              paths: question.canvas.paths,
            });
          }

          // Collect Desmos expressions with headers
          if (
            question.desmosExpressions &&
            question.desmosExpressions.length > 0
          ) {
            const header = `=====${questionId}======`;
            headers.push(header);
            allDesmosExpressions.push(...question.desmosExpressions);
            allDesmosWithHeaders.push({
              header,
              expressions: question.desmosExpressions,
            });
          }

          // Collect sketch canvas expressions for combined latex summary
          if (question.canvas?.maths && question.canvas.maths.length > 0) {
            allSketchCanvasExpressions.push(...question.canvas.maths);
          }
        });

        // Build combined canvas latex summary from ALL expressions (both Desmos and SketchCanvas)
        const combinedExpressions = [
          ...allDesmosExpressions,
          ...allSketchCanvasExpressions,
        ];
        const canvasLatexSummaryArr =
          buildCanvasLatexSummary(combinedExpressions);
        const canvasLatexSummary = JSON.stringify(canvasLatexSummaryArr);

        // Build PNG base64 of strokes stacked vertically with headers from ALL expressions and canvas paths
        // Structure: For each question part, canvas strokes appear first, then expression strokes
        let canvasStrokesPngBase64 = "";
        const hasCanvasPaths = allCanvasPathsWithHeaders.length > 0;
        const hasExpressions = combinedExpressions.length > 0;

        if (hasCanvasPaths || hasExpressions) {
          try {
            // Build combined strokes array with canvas paths at the top of each part
            const combinedStrokesWithHeaders: any[] = [];
            const combinedHeaders: string[] = [];

            // Create a map of questionId to expressions for easy lookup
            const expressionsByQuestionId = new Map<string, any[]>();
            questionsWithMarkingResults.forEach((question, index) => {
              const questionId =
                sessionType && currentPageIndex !== undefined
                  ? getQuestionIdentifier(index, currentPageIndex, sessionType)
                  : `${index + 1}`;

              const expressions: any[] = [];
              if (
                question.desmosExpressions &&
                question.desmosExpressions.length > 0
              ) {
                expressions.push(...question.desmosExpressions);
              }
              if (question.canvas?.maths && question.canvas.maths.length > 0) {
                expressions.push(...question.canvas.maths);
              }

              if (expressions.length > 0) {
                expressionsByQuestionId.set(questionId, expressions);
              }
            });

            // For each question, add canvas strokes first, then expressions
            questionsWithMarkingResults.forEach((question, index) => {
              const questionId =
                sessionType && currentPageIndex !== undefined
                  ? getQuestionIdentifier(index, currentPageIndex, sessionType)
                  : `${index + 1}`;

              const canvasPathsForQuestion = allCanvasPathsWithHeaders.find(
                (item) => item.questionId === questionId
              );
              const expressionsForQuestion =
                expressionsByQuestionId.get(questionId);

              // Only add header and data if there's something to render for this question
              if (canvasPathsForQuestion || expressionsForQuestion) {
                const header = `=====${questionId}======`;
                combinedHeaders.push(header);

                // Add canvas paths first (transformed to expected format)
                if (canvasPathsForQuestion) {
                  combinedStrokesWithHeaders.push({
                    strokes: {
                      paths: canvasPathsForQuestion.paths.map((path: any) => ({
                        paths: path.points || path.paths,
                      })),
                    },
                  });
                }

                // Add expressions second
                if (expressionsForQuestion) {
                  expressionsForQuestion.forEach((expr: any) => {
                    combinedStrokesWithHeaders.push({ strokes: expr?.strokes });
                  });
                }
              }
            });

            canvasStrokesPngBase64 = await renderLinesToPngBase64(
              combinedStrokesWithHeaders,
              {
                headers: combinedHeaders,
                padding: 8,
                background: "#ffffff",
                strokeColor: "#2563eb",
                lineWidth: 4,
                maxWidth: 900,
              }
            );
          } catch (e) {
            console.error("Failed to render strokes PNG", e);
            // Continue without base64 data
          }
        }

        // Format questions data including Desmos expressions from each question
        const desmosExpressionsPerQuestion = questionsWithMarkingResults.map(
          (q) => q.desmosExpressions || []
        );
        const formattedData = formatQuestionsForLLM(
          questionsWithMarkingResults,
          desmosExpressionsPerQuestion
        );
        const formattedCanvas = formatCanvasDataByParts(
          allCanvasData,
          canvasLatexSummary
        );

        const data = {
          userName: user?.userName || "",
          isWeb: true,
          isTutorial: isTutorial,
          lessonId: String(questionWithMarkingResult.legacyId),
          message: String(message),
          questionText: JSON.stringify(formattedData.questionData),
          markscheme: String(questionWithMarkingResult.correctAnswer),
          userAnswer: JSON.stringify(formattedData.studentData),
          canvas: formattedCanvas, // All questions' canvas objects
          canvasLatex: "", // Combined latex from all expressions
          canvasStrokes: canvasStrokesPngBase64, // Combined PNG from all expressions
          questionType: String(questionWithMarkingResult.questionType),
          options: String(questionWithMarkingResult.options || ""),
          markmax: Number(questionWithMarkingResult.maxMark),
          score: Number(questionWithMarkingResult.userMark || 0),
          currentStepIndex: currentStepIndex || 0,
          history: messages.map(
            (item) =>
              `${item.type === "apiMessage" ? "Tutor" : user?.userName || "Student"}: ${item.message}<END_OF_TURN>`
          ),
          isCompleted: formattedData.studentData.every(
            (question) => typeof question.userMark === "number"
          ),
        };

        // console.log('🔍 usePracticeGroupAi: Data ->', data);
        // Begin Raindrop interaction tracking
        if (
          !message.startsWith("cards_data:") &&
          !message.startsWith("spot_question_context:") &&
          message !== "canvas_updated" &&
          message !== "marking_updated" &&
          message !== "medly_tutorial" &&
          message !== "next_question" &&
          !message.includes("selected_question_index_")
        ) {
          beginInteraction(
            "practice_ai_interaction",
            JSON.stringify(data),
            "medly-ai-20250903",
            `practice_${questionWithMarkingResult.legacyId}`,
            {
              question_id: questionWithMarkingResult.legacyId,
              is_tutorial: isTutorial.toString(),
            },
            data.lessonId // Pass question ID for signal tracking
          );
        }

        // Set a timeout to prevent hanging requests
        const timeoutId = setTimeout(() => {
          setIsAwaitingResponse(false);
          // toast.error("Request timed out. Please try again.");
        }, 30000); // 30 second timeout

        setActiveTimeouts((prev) => [...prev, timeoutId]);

        socket.emit("agentMessage", JSON.stringify(data));
      } catch (error) {
        console.error("Error sending message:", error);
        setIsAwaitingResponse(false);
        toast.error("Failed to send message. Please try again.");
      }
    },
    [
      socket,
      socketError,
      questionWithMarkingResult,
      questionsWithMarkingResults,
      solveTogetherOrFeedback,
      currentStepIndex,
      messages,
      activeTimeouts,
      track,
      sessionType,
      currentPageIndex,
      isTutorial,
      markTutorialComplete,
    ]
  );

  const handleFilterUserMessageAndSend = useCallback(
    async (message: string) => {
      setIsCleared(false);
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      setActiveTimeouts([]);

      if (!message.trim()) return;

      // Skip timeout logic for hidden payloads that don't need timeout handling
      if (
        message.startsWith("cards_data:") ||
        message.startsWith("spot_question_context:")
      ) {
        handleSendMessage(message);
        return;
      }

      // Clear any existing message timeout
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }

      // Set awaiting response immediately
      setIsAwaitingResponse(true);
      setCanReply(false);

      // Store the sent message and set timeout
      setLastSentMessage(message);

      const timeoutId = setTimeout(() => {
        setIsAwaitingResponse(false);
        if (isUserMessage(message)) {
          setUserInput(message); // Put message back in input box only if it's a user message
          // Remove the failed user message from chat
          setMessages((prev) => {
            const lastUserMessageIndex = prev.length - 1;
            if (
              lastUserMessageIndex >= 0 &&
              prev[lastUserMessageIndex].type === "userMessage" &&
              prev[lastUserMessageIndex].message === message
            ) {
              return prev.slice(0, lastUserMessageIndex);
            }
            return prev;
          });
        }
        // toast.error("Failed to get response. Please try again.");
        setMessageTimeoutId(null);

        // Clean up current interaction on message timeout
        if (hasActiveInteraction()) {
          finishInteractionWithError("Message timeout - no response received");
        }
      }, 10000); // 10 second timeout

      setMessageTimeoutId(timeoutId);
      setUserInput("");
      // setMessages((prev) => [...prev, { message, type: "userMessage" }]);

      handleSendMessage(message);
    },
    [handleSendMessage, activeTimeouts, messageTimeoutId]
  );

  const clearMessages = useCallback(() => {
    setIsCleared(true);
    activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    setActiveTimeouts([]);
    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId);
      setMessageTimeoutId(null);
    }
    setMessages([]);
    setIsAwaitingResponse(false);
    setCanReply(true);
    setUserInput("");

    // Clean up current interaction on clear
    if (hasActiveInteraction()) {
      finishInteraction("User cleared the chat thread", {
        cleared: "true",
      });
    }
    // Clear all event history when messages are cleared
    clearAllHistory();

    // Clear all animation states
    if (onShimmerTextboxIndicesChange) {
      onShimmerTextboxIndicesChange([]);
    }
    if (onFadeInTextboxIndicesChange) {
      onFadeInTextboxIndicesChange([]);
    }
    if (onDecorationsUpdate) {
      onDecorationsUpdate([]);
    }
    if (onFloatingMessageUpdate) {
      onFloatingMessageUpdate({
        text: "",
        targetText: "",
        targetAction: "",
      });
    }
  }, [
    activeTimeouts,
    messageTimeoutId,
    onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange,
    onDecorationsUpdate,
    onFloatingMessageUpdate,
  ]);

  // Cleanup effect for when component unmounts or socket changes
  useEffect(() => {
    return () => {
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [activeTimeouts]);

  return {
    messages,
    isAwaitingResponse,
    canReply,
    handleFilterUserMessageAndSend,
    handleSendMessage,
    userInput,
    setUserInput,
    clearMessages,
    shimmerTextboxIndices,
    fadeInTextboxIndices,
  };
};
