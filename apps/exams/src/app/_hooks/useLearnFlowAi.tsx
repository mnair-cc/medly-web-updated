import { useState, useEffect, useCallback, useRef } from "react";
import {
  Message,
  CanvasMessage,
  Decoration,
  FloatingMessage,
  Canvas,
} from "@/app/types/types";
import { Socket } from "socket.io-client";
import { useUser } from "@/app/_context/UserProvider";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { toast } from "sonner";
import { useRaindropTracking } from "./useRaindropTracking";
import {
  LearnFlow,
  LearnFlowBlock,
  LearnFlowProgress,
} from "@/app/(protected)/sessions/types";

// Split text into segments using LaTeX-aware logic (same as usePracticeGroupAi)
const splitTextIntoSegments = (text: string): string[] => {
  const latexPlaceholders: string[] = [];
  let protectedText = text;

  const latexRegexes = [
    /\$\$([\s\S]*?)\$\$/g,
    /\$([^\$]*?)\$/g,
    /\\\[([\s\S]*?)\\\]/g,
    /\\\(([\s\S]*?)\\\)/g,
  ];

  latexRegexes.forEach((regex) => {
    protectedText = protectedText.replace(regex, (match: string) => {
      const placeholder = `__LATEX_${latexPlaceholders.length}__`;
      latexPlaceholders.push(match);
      return placeholder;
    });
  });

  const newlineSplit = protectedText
    .replace("\n$$", "$$")
    .replace(/\n\n/g, "\n")
    .split("\n")
    .filter((segment) => segment.trim().length > 0);

  const finalSegments: string[] = [];

  for (const segment of newlineSplit) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) continue;

    const hasSentenceEnding = /[.!?]/.test(trimmedSegment);

    if (!hasSentenceEnding) {
      finalSegments.push(trimmedSegment);
    } else {
      const sentences = trimmedSegment
        .split(/([.!?])(\s+|$)/)
        .filter((part) => part.trim().length > 0);

      let currentSentence = "";

      for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];

        if (/^[.!?]$/.test(part)) {
          currentSentence += part;

          const beforePunct = currentSentence.slice(0, -1);
          const nextPart = sentences[i + 1];

          const isDecimal =
            part === "." &&
            /\d$/.test(beforePunct) &&
            nextPart &&
            /^\s*\d/.test(nextPart);

          const isListItem =
            part === "." &&
            /^\s*(?:\d+|[a-z]|[ivx]+)$/i.test(beforePunct.trim());

          const isAbbreviation =
            part === "." &&
            /\b(?:Dr|Mr|Mrs|Ms|Prof|etc|vs|e\.g|i\.e)$/i.test(beforePunct);

          if (!isDecimal && !isListItem && !isAbbreviation) {
            if (currentSentence.trim()) {
              finalSegments.push(currentSentence.trim());
            }
            currentSentence = "";
            if (i + 1 < sentences.length && /^\s+$/.test(sentences[i + 1])) {
              i++;
            }
          }
        } else {
          currentSentence += part;
        }
      }

      if (currentSentence.trim()) {
        finalSegments.push(currentSentence.trim());
      }
    }
  }

  const processedSegments = finalSegments.map((segment) => {
    let result = segment;
    latexPlaceholders.forEach((latex, index) => {
      result = result.replace(`__LATEX_${index}__`, latex);
    });
    return result;
  });

  return processedSegments.filter((segment) => segment.length > 0);
};

/**
 * Format learn flow blocks up to current index as structured JSON for AI context
 */
const formatLearnFlowBlocksForLLM = (
  blocks: LearnFlowBlock[],
  currentBlockIndex: number
): {
  blocks: Array<{
    title: string;
    order: number;
    kind: string;
    content: any;
  }>;
} => {
  const visibleBlocks = blocks.slice(0, currentBlockIndex + 1);

  return {
    blocks: visibleBlocks.map((block) => ({
      title: block.title,
      order: block.order,
      kind: block.content.kind,
      content: block.content,
    })),
  };
};

/**
 * Extract markscheme from MCQ blocks (correct option)
 */
const extractMarkschemeFromBlocks = (
  blocks: LearnFlowBlock[],
  currentBlockIndex: number
): string => {
  // Find the most recent MCQ block up to current index
  for (let i = currentBlockIndex; i >= 0; i--) {
    const block = blocks[i];
    if (
      block.content.kind === "question" &&
      block.content.question_type === "mcq"
    ) {
      const correctIndex = block.content.correct_answer_index;
      const correctOption = block.content.options[correctIndex];
      return correctOption || "";
    }
  }
  return "";
};

export const useLearnFlowAi = ({
  socket,
  socketError,
  learnFlow,
  allBlocks,
  currentBlockIndex,
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
  initialMessages,
  onMessagesChange,
  learnFlowProgress,
  blockKeyMap,
  isActive = true,
}: {
  socket: Socket | null;
  socketError: Error | null;
  learnFlow: LearnFlow;
  allBlocks: LearnFlowBlock[];
  currentBlockIndex: number;
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
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  learnFlowProgress?: LearnFlowProgress | null;
  blockKeyMap?: Map<number, string>;
  /** When false, socket handlers are not registered to avoid duplicate event processing */
  isActive?: boolean;
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
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
  const { user } = useUser();
  const { track } = useTracking();
  const {
    beginInteraction,
    finishInteraction,
    finishInteractionWithError,
    hasActiveInteraction,
  } = useRaindropTracking();

  // Suppress unused variable warnings - these are used in callbacks
  void shimmerTextboxIndices;
  void fadeInTextboxIndices;

  // Track initial messages to avoid persisting unchanged data
  const initialMessagesRef = useRef<Message[]>(initialMessages || []);

  // Update ref when initialMessages change (e.g., when switching lessons)
  useEffect(() => {
    initialMessagesRef.current = initialMessages || [];
  }, [initialMessages]);

  // Persist messages when they change (debounced)
  // Only persist if messages have actually changed from initial state
  useEffect(() => {
    if (onMessagesChange && messages.length > 0) {
      // Check if messages have changed from initial state
      const hasChanged =
        messages.length !== initialMessagesRef.current.length ||
        messages.some((msg, idx) => {
          const initialMsg = initialMessagesRef.current[idx];
          return (
            !initialMsg ||
            msg.message !== initialMsg.message ||
            msg.type !== initialMsg.type
          );
        });

      if (!hasChanged) {
        // Messages haven't changed, don't persist
        return;
      }

      // Debounce persistence to avoid too many API calls
      const timeoutId = setTimeout(() => {
        onMessagesChange(messages);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, onMessagesChange]);

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

    const handleDecorationMessage = (data: any) => {
      if (onDecorationsUpdate) {
        onDecorationsUpdate(data);
      }
    };

    const handleCanvasMessage = (data: any) => {
      if (onCanvasMessageUpdate && data) {
        onCanvasMessageUpdate(data.canvasMessages || []);
      }
    };

    const handleCanvasUpdated = (data: any) => {
      if (onCanvasUpdate && data?.canvas) {
        onCanvasUpdate([data.canvas]);
      }
    };

    const handleShimmerTextboxIndices = (data: any) => {
      if (onShimmerTextboxIndicesChange && data?.indices) {
        onShimmerTextboxIndicesChange(data.indices);
      }
    };

    const handleFadeInTextboxIndices = (data: any) => {
      if (onFadeInTextboxIndicesChange && data?.indices) {
        onFadeInTextboxIndicesChange(data.indices);
      }
    };

    const handleMessage = (data: any) => {
      if (data && !isCleared) {
        if (messageTimeoutId) {
          clearTimeout(messageTimeoutId);
          setMessageTimeoutId(null);
        }

        activeTimeouts.forEach((timeout) => clearTimeout(timeout));
        setActiveTimeouts([]);

        const processedSegments = splitTextIntoSegments(data);

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
      setCanReply(true);
      try {
        setIsAwaitingResponse(false);

        track("learn_flow_message_received", {
          lesson_id: learnFlow.lesson_id,
          message: data.response || data.message,
        });

        if (hasActiveInteraction() && data.response) {
          finishInteraction(JSON.stringify(data));
        }

        if (
          data.canvas_updates &&
          data.canvas_updates.length > 0 &&
          onCanvasUpdate
        ) {
          const updatedIndices: number[] = [];
          const newIndices: number[] = [];

          data.canvas_updates.forEach(
            (update: { index: number; text: string }) => {
              const textLines = update.text.split("\\\\");

              if (
                currentCanvas[0] &&
                currentCanvas[0].textboxes &&
                currentCanvas[0].textboxes[update.index]
              ) {
                updatedIndices.push(update.index);

                for (let i = 1; i < textLines.length; i++) {
                  newIndices.push(update.index + i);
                }
              } else {
                for (let i = 0; i < textLines.length; i++) {
                  newIndices.push(update.index + i);
                }
              }
            }
          );

          setShimmerTextboxIndices(updatedIndices);
          setFadeInTextboxIndices(newIndices);

          setTimeout(() => {
            const updatedCanvas = [...currentCanvas];

            data.canvas_updates.forEach(
              (update: { index: number; text: string }) => {
                if (updatedCanvas[0] && updatedCanvas[0].textboxes) {
                  const textLines = update.text.split("\\\\");

                  if (updatedCanvas[0].textboxes[update.index]) {
                    const baseTextbox =
                      updatedCanvas[0].textboxes[update.index];

                    updatedCanvas[0] = {
                      ...updatedCanvas[0],
                      textboxes: updatedCanvas[0].textboxes.map(
                        (textbox: any, i: number) => {
                          if (i === update.index) {
                            return { ...textbox, text: textLines[0] };
                          }
                          return textbox;
                        }
                      ),
                    };

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
                    const previousTextbox =
                      updatedCanvas[0].textboxes[update.index - 1];
                    const newTextboxes = [...updatedCanvas[0].textboxes];

                    for (let i = 0; i < textLines.length; i++) {
                      const newIndex = update.index + i;

                      const templateTextbox = previousTextbox || {
                        x: 50,
                        y: 50,
                        width: 200,
                        height: 30,
                        fontSize: 16,
                        fontFamily: "Arial",
                        fill: "#000000",
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
          }, 1200);

          setTimeout(() => {
            setShimmerTextboxIndices([]);
            setFadeInTextboxIndices([]);
          }, 3000);
        }

        // Extract highlights from decorations array (type: "highlight")
        if (data.decorations && Array.isArray(data.decorations)) {
          const highlightDecorations = data.decorations.filter(
            (d: { type: string; show: boolean }) =>
              d.type === "highlight" && d.show
          );
          if (highlightDecorations.length > 0) {
            const highlights = highlightDecorations.map(
              (d: { text: string }) => d.text
            );
            onHighlightUpdate(highlights);
          }
        }

        // Also check question_highlight for backwards compatibility
        if (data.question_highlight?.highlighted_text) {
          const highlights = Array.isArray(
            data.question_highlight.highlighted_text
          )
            ? data.question_highlight.highlighted_text
            : [data.question_highlight.highlighted_text];
          onHighlightUpdate(highlights);
        }

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

      if (hasActiveInteraction()) {
        finishInteractionWithError(error?.message || "Unknown socket error");
      }
    };

    const handleTimeout = () => {
      console.warn("Socket timeout");
      setIsAwaitingResponse(false);

      if (hasActiveInteraction()) {
        finishInteractionWithError("Request timed out");
      }
    };

    const handleQuestionHighlightMessage = (data: any) => {
      if (data?.highlighted_text) {
        const highlights = Array.isArray(data.highlighted_text)
          ? data.highlighted_text
          : [data.highlighted_text];
        onHighlightUpdate(highlights);
      }
    };

    socket.on("firstMessage", handleFirstMessage);
    socket.on("current_step_message", handleCurrentStepMessage);
    socket.on("floating_message", handleFloatingMessage);
    socket.on("question_highlight_message", handleQuestionHighlightMessage);
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
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }

      socket.off("firstMessage", handleFirstMessage);
      socket.off("current_step_message", handleCurrentStepMessage);
      socket.off("floating_message", handleFloatingMessage);
      socket.off("question_highlight_message", handleQuestionHighlightMessage);
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
    learnFlow.lesson_id,
    track,
    messageTimeoutId,
    currentCanvas,
    currentStepIndex,
    setCurrentStepIndex,
    finishInteraction,
    finishInteractionWithError,
    hasActiveInteraction,
    isActive,
  ]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        track("learn_flow_message_sent", {
          lesson_id: learnFlow.lesson_id,
          message: message,
        });

        if (socket && socket.connected === false) {
          socket.disconnect();
          socket.connect();

          const isConnected = await new Promise<boolean>((resolve) => {
            const timeoutId = setTimeout(() => resolve(false), 3000);

            socket.once("connect", () => {
              clearTimeout(timeoutId);
              resolve(true);
            });
          });

          if (!isConnected) {
            setIsAwaitingResponse(false);
            setCanReply(true);
            setUserInput(message);
            toast.error("Failed to connect to service. Please try again.");
            return;
          }
        }

        if (!socket || !learnFlow) {
          setIsAwaitingResponse(false);
          setCanReply(true);
          setUserInput(message);
          toast.error("Connection not available. Please try again.");
          return;
        }

        if (socketError) {
          setIsAwaitingResponse(false);
          setCanReply(true);
          setUserInput(message);
          toast.error(
            "Connection error. Please refresh the page and try again."
          );
          return;
        }

        setIsAwaitingResponse(true);
        setCanReply(false);

        // Format learn flow blocks up to current index
        const formattedBlocks = formatLearnFlowBlocksForLLM(
          allBlocks,
          currentBlockIndex
        );
        const markscheme = extractMarkschemeFromBlocks(
          allBlocks,
          currentBlockIndex
        );

        // Set message timeout
        const timeoutId = setTimeout(() => {
          setIsAwaitingResponse(false);
        }, 30000);
        setMessageTimeoutId(timeoutId);
        setActiveTimeouts((prev) => [...prev, timeoutId]);

        // Build user progress for blocks up to and including current block
        const userProgress: Record<
          string,
          {
            user_answer?:
              | string
              | string[]
              | Record<string, string>
              | Record<string, string[]>;
            canvas?: Canvas;
            is_correct?: boolean;
            is_submitted?: boolean;
            completed_at?: string;
          }
        > = {};

        if (learnFlowProgress?.blocks && blockKeyMap) {
          // Only include blocks up to the current block index (matching formattedBlocks)
          const visibleBlocks = allBlocks.slice(0, currentBlockIndex + 1);
          visibleBlocks.forEach((block, index) => {
            const blockKey = blockKeyMap.get(index);
            if (blockKey && learnFlowProgress.blocks[blockKey]) {
              const blockProgress = learnFlowProgress.blocks[blockKey];
              // Determine if answer is correct for MCQ blocks
              let isCorrect: boolean | undefined;
              if (
                block.content.kind === "question" &&
                block.content.question_type === "mcq"
              ) {
                const correctOptionIndex = block.content.correct_answer_index;
                const correctAnswer =
                  block.content.options?.[correctOptionIndex];
                if (blockProgress.user_answer && correctAnswer) {
                  isCorrect = blockProgress.user_answer === correctAnswer;
                }
              }
              // user_answer is only saved when "Check answer" is clicked, so its presence means submitted
              const isSubmitted = blockProgress.user_answer !== undefined;
              userProgress[blockKey] = {
                user_answer: blockProgress.user_answer,
                canvas: blockProgress.canvas,
                is_correct: isCorrect,
                is_submitted: isSubmitted,
                completed_at: blockProgress.completed_at,
              };
            }
          });
        }

        const data = {
          userName: user?.userName || "",
          isWeb: true,
          isTutorial: false,
          lessonId: String(learnFlow.lesson_id),
          message: String(message),
          questionText: JSON.stringify(formattedBlocks),
          markscheme: markscheme,
          userAnswer: JSON.stringify(userProgress), // Include progress for visible blocks only
          questionType: "learn_flow",
          options: "",
          markmax: 0,
          score: 0,
          currentStepIndex: currentBlockIndex,
          history: messages.map(
            (item) =>
              `${item.type === "apiMessage" ? "Tutor" : user?.userName || "Student"}: ${item.message}<END_OF_TURN>`
          ),
          isCompleted: currentBlockIndex >= allBlocks.length - 1,
          userProgress: userProgress, // Also include as structured object
        };

        if (
          !message.startsWith("cards_data:") &&
          message !== "canvas_updated" &&
          message !== "marking_updated" &&
          message !== "medly_tutorial" &&
          message !== "next_question" &&
          !message.includes("selected_question_index_")
        ) {
          beginInteraction(
            "learn_flow_ai_interaction",
            JSON.stringify(data),
            "medly-ai-20250903",
            `learn_flow_${learnFlow.lesson_id}`,
            {
              lesson_id: learnFlow.lesson_id,
            },
            learnFlow.lesson_id
          );
        }

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
      learnFlow,
      allBlocks,
      currentBlockIndex,
      messages,
      user,
      track,
      beginInteraction,
      setActiveTimeouts,
      learnFlowProgress,
      blockKeyMap,
    ]
  );

  const handleFilterUserMessageAndSend = async (message: string) => {
    setIsCleared(false);
    activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    setActiveTimeouts([]);

    if (!message.trim()) return;

    setUserInput("");
    setMessages((prev) => [...prev, { message, type: "userMessage" }]);

    handleSendMessage(message);
  };

  const clearMessages = () => {
    setIsCleared(true);
    activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    setActiveTimeouts([]);

    setMessages([]);
    setIsAwaitingResponse(false);
    setCanReply(true);
    setUserInput("");
  };

  return {
    messages,
    setMessages,
    isAwaitingResponse,
    canReply,
    handleFilterUserMessageAndSend,
    handleSendMessage,
    userInput,
    setUserInput,
    clearMessages,
  };
};
