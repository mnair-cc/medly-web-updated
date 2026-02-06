import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  CanvasMessage,
  QuestionWithMarkingResult,
  Canvas,
  Decoration,
} from "@/app/types/types";
import InputBar from "./InputBar";
import MessageSuggestions from "./MessageSuggestions";
import { usePracticeGroupAi } from "@/app/_hooks/usePracticeGroupAi";
import { useLearnFlowAi } from "@/app/_hooks/useLearnFlowAi";
import { LearnFlow, LearnFlowBlock, LearnFlowProgress } from "../types";
import { Message } from "@/app/types/types";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useSocket } from "@/app/_hooks/useSocket";
import Link from "next/link";
import DisclaimerModal from "@/app/_components/DisclaimerModal";
import ChatThread from "./ChatThread";
import FeedbackModal from "@/app/_components/FeedbackModal";
import { QuestionSessionPageType, SessionType } from "../types";
import { useGettingStartedProgress } from "@/app/_hooks/useGettingStartedSteps";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useRaindropTracking } from "@/app/_hooks/useRaindropTracking";
import { useResponsive } from "@/app/_hooks/useResponsive";

export interface AiGroupCardRef {
  getMessages: () => any[];
}

interface AiCardProps {
  currentPageType: QuestionSessionPageType;
  questionsWithMarkingResults: QuestionWithMarkingResult[];
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  setHighlightedText: (text: string[]) => void;
  setDecorations: (decorations: Decoration[]) => void;
  setHandleSendMessage: (fn: (message: string) => void) => void;
  setClearMessages: (fn: () => void) => void;
  sessionType: SessionType;
  setCanvasMessage: (message: CanvasMessage[] | undefined) => void;
  setFloatingMessage: (
    message:
      | {
          text: string;
          targetText: string;
          targetAction: string;
          targetIndex?: number;
          targetComponent?: string;
        }
      | undefined
  ) => void;
  updateQuestionCanvas?: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas
  ) => void;
  questionGroupId?: number;
  onIsAwaitingResponseChange: (isAwaiting: boolean) => void;
  onShimmerTextboxIndicesChange: (indices: number[]) => void;
  onFadeInTextboxIndicesChange: (indices: number[]) => void;
  currentStepIndex: number;
  setIsSolveTogether: (isSolveTogether: boolean) => void;
  isSolveTogether: boolean;
  setCurrentStepIndex: (stepIndex: number) => void;
  currentPageIndex: number;
  setIsQuestionStemHighlighted: (isHighlighted: boolean) => void;
  setIsQuestionPartHighlighted: (isHighlighted: boolean) => void;
  setHighlightedQuestionPartIndex: (index: number) => void;
  // Learn flow props (optional)
  learnFlow?: LearnFlow;
  allLearnBlocks?: LearnFlowBlock[];
  currentLearnBlockIndex?: number;
  // Learn flow persistence props (optional)
  initialLearnFlowMessages?: Message[];
  onLearnFlowMessagesChange?: (messages: Message[]) => void;
  learnFlowProgress?: LearnFlowProgress | null;
  updateLearnFlowCanvas?: (blockKey: string, canvas: Canvas) => void;
  // Theme color for user messages
  userMessageColor?: string;
}

const AiCard = forwardRef<AiGroupCardRef, AiCardProps>(function AiCard(
  {
    currentPageType,
    questionsWithMarkingResults,
    currentQuestionWithMarkingResult,
    setHighlightedText,
    setDecorations,
    setHandleSendMessage,
    setClearMessages,
    sessionType,
    setCanvasMessage,
    setFloatingMessage,
    updateQuestionCanvas,
    questionGroupId,
    onIsAwaitingResponseChange,
    onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange,
    currentStepIndex,
    setIsSolveTogether,
    isSolveTogether,
    setCurrentStepIndex,
    currentPageIndex,
    setIsQuestionStemHighlighted,
    setIsQuestionPartHighlighted,
    setHighlightedQuestionPartIndex,
    learnFlow,
    allLearnBlocks,
    currentLearnBlockIndex,
    initialLearnFlowMessages,
    onLearnFlowMessagesChange,
    learnFlowProgress,
    updateLearnFlowCanvas,
    userMessageColor,
  },
  ref
) {
  const { track } = useTracking();
  const { trackSignal } = useRaindropTracking();
  const { isTouchScreen } = useResponsive();

  const { hasActivePlan } = useHasActivePlan();
  const { socket, error } = useSocket();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"positive" | "negative">(
    "positive"
  );
  const previousQuestionIdRef = useRef<string | null>(null);
  const [speechControls, setSpeechControls] = useState<{
    fadeOutAndStop: () => void;
  } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    // Load voice preference from localStorage on mount, default to false
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("medly-voice-mode-enabled");
      return saved === "true";
    }
    return false;
  });

  // Handle voice toggle from InputBar
  const handleVoiceToggle = useCallback((enabled: boolean) => {
    console.log(`🔊 Voice toggled: ${enabled ? "ON" : "OFF"}`);
    setVoiceEnabled(enabled);
    // Save preference to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("medly-voice-mode-enabled", enabled.toString());
    }
  }, []);

  // Message suggestions based on whether the user got the question correct or incorrect
  const getMessageSuggestions = () => {
    // Check if question is marked and if user got it correct (full marks)
    const isCorrect =
      currentQuestionWithMarkingResult.isMarked &&
      currentQuestionWithMarkingResult.userMark ===
        currentQuestionWithMarkingResult.maxMark;

    if (currentQuestionWithMarkingResult.isMarked && isCorrect) {
      // Suggestions for correct answers
      return [
        // "Talk",
        // "Talk me through alternative points",
        "What concept should I review for this?",
      ];
    } else {
      // Default suggestions for incorrect answers or unmarked questions
      return [
        "I don't understand this problem",
        "Can you walk me through this step by step?",
        // "What concept should I review for this?",
      ];
    }
  };

  const suggestions = getMessageSuggestions();

  // Determine if we're in learn flow mode
  const isLearnFlowMode =
    learnFlow &&
    allLearnBlocks !== undefined &&
    currentLearnBlockIndex !== undefined;

  // Create blockKeyMap for learn flow (maps block index to "{chunk_index}_{block_order}")
  const learnFlowBlockKeyMap = React.useMemo(() => {
    if (!learnFlow?.chunks) return new Map<number, string>();
    const keyMap = new Map<number, string>();
    let blockIndex = 0;
    learnFlow.chunks.forEach((chunk) => {
      chunk.blocks
        .sort((a, b) => a.order - b.order)
        .forEach((block) => {
          keyMap.set(blockIndex, `${chunk.chunk_index}_${block.order}`);
          blockIndex++;
        });
    });
    return keyMap;
  }, [learnFlow]);

  // Use learn flow AI hook if in learn flow mode, otherwise use practice group AI
  // Only the active hook registers socket handlers to avoid duplicate event processing
  const practiceGroupAi = usePracticeGroupAi({
    socket,
    socketError: error ? new Error("Socket connection failed") : null,
    questionWithMarkingResult: currentQuestionWithMarkingResult,
    questionsWithMarkingResults,
    solveTogetherOrFeedback: "feedbackMessage",
    currentQuestionIndex: currentPageIndex,
    onHighlightUpdate: setHighlightedText,
    currentCanvas: [
      currentQuestionWithMarkingResult.canvas || {
        paths: [],
        textboxes: [],
        maths: [],
      },
    ],
    onDecorationsUpdate: setDecorations,
    onCanvasMessageUpdate: (messages: CanvasMessage[]) => {
      setCanvasMessage(messages);
    },
    onFloatingMessageUpdate: (message: {
      text: string;
      targetText?: string;
      targetAction?: string;
      targetIndex?: number;
      targetComponent?: string;
    }) => {
      setFloatingMessage({
        text: message.text,
        targetText: message.targetText || "",
        targetAction: message.targetAction || "",
        targetIndex: message.targetIndex ?? undefined,
        targetComponent: message.targetComponent ?? undefined,
      });
    },
    onCanvasUpdate: updateQuestionCanvas
      ? (canvas: Canvas[]) => {
          if (
            canvas[0] &&
            updateQuestionCanvas &&
            questionGroupId !== undefined
          ) {
            updateQuestionCanvas(
              questionGroupId,
              currentQuestionWithMarkingResult.legacyId,
              canvas[0]
            );
          }
        }
      : undefined,
    onShimmerTextboxIndicesChange: onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange: onFadeInTextboxIndicesChange,
    currentStepIndex,
    setCurrentStepIndex: setCurrentStepIndex,
    sessionType: sessionType.toString(),
    currentPageIndex,
    onIsQuestionStemHighlightedChange: setIsQuestionStemHighlighted,
    onIsQuestionPartHighlightedChange: setIsQuestionPartHighlighted,
    onHighlightedQuestionPartIndexChange: setHighlightedQuestionPartIndex,
    isActive: !isLearnFlowMode,
  });

  // Calculate current block's canvas and blockKey
  const currentBlockCanvas = React.useMemo(() => {
    if (!learnFlow || !allLearnBlocks || currentLearnBlockIndex === undefined) {
      return { paths: [], textboxes: [], maths: [] };
    }

    // Calculate blockKey the same way LearnPage does
    const flow = learnFlow;
    let blockIndex = 0;
    let blockKey: string | undefined;

    for (const chunk of flow.chunks) {
      const sortedBlocks = [...chunk.blocks].sort((a, b) => a.order - b.order);
      for (const block of sortedBlocks) {
        if (blockIndex === currentLearnBlockIndex) {
          blockKey = `${chunk.chunk_index}_${block.order}`;
          break;
        }
        blockIndex++;
      }
      if (blockKey) break;
    }

    if (blockKey && learnFlowProgress?.blocks?.[blockKey]?.canvas) {
      return learnFlowProgress.blocks[blockKey].canvas;
    }

    return { paths: [], textboxes: [], maths: [] };
  }, [learnFlow, allLearnBlocks, currentLearnBlockIndex, learnFlowProgress]);

  const handleLearnFlowCanvasUpdate = React.useCallback(
    (canvas: Canvas[]) => {
      if (
        !learnFlow ||
        !allLearnBlocks ||
        currentLearnBlockIndex === undefined ||
        !updateLearnFlowCanvas
      ) {
        return;
      }

      // Calculate blockKey the same way LearnPage does
      const flow = learnFlow;
      let blockIndex = 0;
      let blockKey: string | undefined;

      for (const chunk of flow.chunks) {
        const sortedBlocks = [...chunk.blocks].sort(
          (a, b) => a.order - b.order
        );
        for (const block of sortedBlocks) {
          if (blockIndex === currentLearnBlockIndex) {
            blockKey = `${chunk.chunk_index}_${block.order}`;
            break;
          }
          blockIndex++;
        }
        if (blockKey) break;
      }

      if (blockKey && canvas[0]) {
        updateLearnFlowCanvas(blockKey, canvas[0]);
      }
    },
    [learnFlow, allLearnBlocks, currentLearnBlockIndex, updateLearnFlowCanvas]
  );

  // Always call both hooks (React rules), but only the active one registers socket handlers
  const learnFlowAi = useLearnFlowAi({
    socket,
    socketError: error ? new Error("Socket connection failed") : null,
    learnFlow: learnFlow || ({} as LearnFlow),
    allBlocks: allLearnBlocks || [],
    currentBlockIndex: currentLearnBlockIndex ?? 0,
    onHighlightUpdate: setHighlightedText,
    currentCanvas: [currentBlockCanvas],
    onDecorationsUpdate: setDecorations,
    onCanvasMessageUpdate: (messages: CanvasMessage[]) => {
      setCanvasMessage(messages);
    },
    onFloatingMessageUpdate: (message: {
      text: string;
      targetText?: string;
      targetAction?: string;
      targetIndex?: number;
      targetComponent?: string;
    }) => {
      setFloatingMessage({
        text: message.text,
        targetText: message.targetText || "",
        targetAction: message.targetAction || "",
        targetIndex: message.targetIndex ?? undefined,
        targetComponent: message.targetComponent ?? undefined,
      });
    },
    onCanvasUpdate: updateLearnFlowCanvas
      ? handleLearnFlowCanvasUpdate
      : undefined,
    onShimmerTextboxIndicesChange: onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange: onFadeInTextboxIndicesChange,
    currentStepIndex,
    setCurrentStepIndex: setCurrentStepIndex,
    initialMessages: initialLearnFlowMessages,
    onMessagesChange: onLearnFlowMessagesChange,
    learnFlowProgress: learnFlowProgress,
    blockKeyMap: learnFlowBlockKeyMap,
    isActive: !!isLearnFlowMode,
  });

  // Use the appropriate hook's return values based on mode
  const {
    messages,
    isAwaitingResponse,
    handleFilterUserMessageAndSend,
    handleSendMessage,
    userInput,
    setUserInput,
    clearMessages,
    canReply,
  } = isLearnFlowMode ? learnFlowAi : practiceGroupAi;

  // Wrap handleFilterUserMessageAndSend to stop speech before sending
  const wrappedHandleFilterUserMessageAndSend = useCallback(
    (message: string) => {
      if (speechControls) {
        speechControls.fadeOutAndStop();
      }
      handleFilterUserMessageAndSend(message);
    },
    [handleFilterUserMessageAndSend, speechControls]
  );

  // Mark "send-message" step complete when the user sends their first message
  const { markComplete } = useGettingStartedProgress();
  useEffect(() => {
    if (messages.some((m) => m.type === "userMessage")) {
      markComplete("send-message");
    }
  }, [messages, markComplete]);

  useEffect(() => {
    setHandleSendMessage(handleFilterUserMessageAndSend);
  }, [handleFilterUserMessageAndSend, setHandleSendMessage]);

  useEffect(() => {
    setClearMessages(clearMessages);
  }, [clearMessages, setClearMessages]);

  // Expose messages through ref
  useImperativeHandle(
    ref,
    () => ({
      getMessages: () => messages || [],
    }),
    [messages]
  );

  const prevStateRef = useRef({
    pageType: currentPageType,
    isLearnFlowMode: false,
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    if (
      sessionType === SessionType.PaperSession ||
      sessionType === SessionType.MockSession
    ) {
      socket.disconnect();
      socket.connect();

      // handleSendMessage("next_question");

      prevStateRef.current = {
        pageType: currentPageType,
        isLearnFlowMode: isLearnFlowMode ?? false,
      };
    }
  }, [socket, sessionType, currentPageType, isLearnFlowMode]);

  useEffect(() => {
    const currentQuestionId = currentQuestionWithMarkingResult.legacyId;
    const wasLearnFlowMode = prevStateRef.current.isLearnFlowMode;
    const isSwitchingFromLearnFlowToQuestion =
      wasLearnFlowMode && !isLearnFlowMode;
    const isSwitchingBetweenQuestions =
      !isLearnFlowMode &&
      previousQuestionIdRef.current !== null &&
      previousQuestionIdRef.current !== currentQuestionId;

    // Clear messages when:
    // 1. Switching FROM learn flow TO a question (preserve learn flow history, but clear when leaving)
    // 2. Switching between questions (not in learn flow mode)
    // Don't clear when staying in learn flow mode
    if (isSwitchingFromLearnFlowToQuestion || isSwitchingBetweenQuestions) {
      clearMessages();
      setCanvasMessage(undefined);
      setFloatingMessage(undefined);

      // Kill any ongoing messaging processes
      if (
        socket &&
        sessionType !== SessionType.PaperSession &&
        sessionType !== SessionType.MockSession
      ) {
        // For non-paper sessions, disconnect and reconnect socket to kill pending operations
        socket.disconnect();
        socket.connect();
      }

      // Reset animation states
      onShimmerTextboxIndicesChange([]);
      onFadeInTextboxIndicesChange([]);

      // Reset highlighting and decorations
      setHighlightedText([]);
      setDecorations([]);
    }

    // Update refs
    previousQuestionIdRef.current = currentQuestionId;
    prevStateRef.current = {
      pageType: currentPageType,
      isLearnFlowMode: isLearnFlowMode ?? false,
    };
  }, [
    currentQuestionWithMarkingResult.legacyId,
    isLearnFlowMode,
    clearMessages,
    setCanvasMessage,
    setFloatingMessage,
    socket,
    sessionType,
    onShimmerTextboxIndicesChange,
    onFadeInTextboxIndicesChange,
    setHighlightedText,
    setDecorations,
    currentPageType,
  ]);

  // Handle auto-scrolling when visible messages change
  const handleVisibleMessagesChange = (
    visibleMessages: any[],
    shouldShowLoading: boolean
  ) => {
    if (scrollableContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        if (scrollableContainerRef.current) {
          scrollableContainerRef.current.scrollTo({
            top: scrollableContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  };

  useEffect(() => {
    onIsAwaitingResponseChange(isAwaitingResponse);
  }, [isAwaitingResponse, onIsAwaitingResponseChange]);

  // useEffect(() => {
  //   if (onShimmerTextboxIndicesChange) {
  //     onShimmerTextboxIndicesChange(shimmerTextboxIndices);
  //   }
  // }, [shimmerTextboxIndices, onShimmerTextboxIndicesChange]);

  // useEffect(() => {
  //   if (onFadeInTextboxIndicesChange) {
  //     onFadeInTextboxIndicesChange(fadeInTextboxIndices);
  //   }
  // }, [fadeInTextboxIndicesChange, onFadeInTextboxIndicesChange]);

  const shouldShowPremiumPrompt =
    (sessionType === SessionType.PaperSession ||
      sessionType === SessionType.MockSession) &&
    !hasActivePlan;

  return (
    <>
      <div
        className={`text-sm relative flex flex-col h-full bg-white ${!shouldShowPremiumPrompt ? "pb-20" : ""}`}
      >
        <div
          className="flex flex-col h-full overflow-y-scroll"
          ref={scrollableContainerRef}
        >
          <div className="flex justify-center items-center p-6">
            <p className="font-rounded-heavy text-[15px]">Ask medly</p>
          </div>

          {/* Add padding at bottom for premium prompt when it's shown */}
          <div className={shouldShowPremiumPrompt ? "pb-64" : ""}>
            <ChatThread
              messages={messages}
              isAwaitingResponse={isAwaitingResponse}
              options={[]}
              threadKey={
                isLearnFlowMode
                  ? "learnflow"
                  : `question:${currentQuestionWithMarkingResult.legacyId}`
              }
              onClickDisclaimer={() => {
                setShowDisclaimer(true);
              }}
              onClickFeedback={(type: "positive" | "negative") => {
                setFeedbackType(type);
                setShowFeedback(true);
              }}
              onVisibleMessagesChange={handleVisibleMessagesChange}
              onSpeechControlsReady={setSpeechControls}
              voiceEnabled={voiceEnabled}
              audioGenerationMode="bulk"
              userMessageColor={userMessageColor}
            />
          </div>

          {/* {showHints && (
          <div className="flex flex-col gap-2 px-2 pt-2">
            {hints.map((hint, index) => (
              <PrimaryButtonClicky
                key={index}
                buttonText={hint}
                doesStretch={true}
                showKeyboardShortcut={false}
                onPress={() => {
                  handleFilterUserMessageAndSend(hint);
                }}
              />
            ))}
          </div>
        )} */}
        </div>
      </div>

      {!shouldShowPremiumPrompt && (
        <div className="absolute bottom-0 w-full p-6 pt-4 gap-3 flex flex-col z-[100] bg-white/70 backdrop-blur-[8px]">
          {!messages.some(
            (m) => m.type === "userMessage" || m.type === "apiMessage"
          ) && (
            <MessageSuggestions
              suggestions={suggestions}
              onSuggestionClick={(message) => {
                track("clicked_message_suggestion", {
                  message_suggestion: message,
                });
                wrappedHandleFilterUserMessageAndSend(message);
                setIsSolveTogether(true);
              }}
            />
          )}
          <InputBar
            userInput={userInput}
            setUserInput={setUserInput}
            handleFilterUserMessageAndSend={
              wrappedHandleFilterUserMessageAndSend
            }
            canReply={canReply}
            options={[]}
            autoFocus={!isTouchScreen}
          />
        </div>
      )}

      {shouldShowPremiumPrompt && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-gradient-to-t from-white via-white to-transparent pt-12 z-[100]">
          <div className="w-full max-w-sm bg-white rounded-[16px] border border-[#E9E9F0] p-6 shadow-lg">
            <div className="w-full font-rounded-heavy text-black mb-2 text-2xl text-center">
              Upgrade to Medly Pro
            </div>
            <div className="text-gray-500 mb-5 text-center text-sm">
              Chat with Medly to get step-by-step explanations and strategies
              for improving your speed.
            </div>

            <Link href="/plan" className="w-full">
              <PrimaryButtonClicky
                buttonText="Upgrade now"
                buttonState="filled"
                doesStretch={true}
                showKeyboardShortcut={false}
              />
            </Link>
          </div>
        </div>
      )}
      {!shouldShowPremiumPrompt && (
        <div className="absolute bottom-0 w-full p-6 pt-4 gap-3 flex flex-col z-[100] bg-white/70 backdrop-blur-[8px]">
          {!messages.some(
            (m) => m.type === "userMessage" || m.type === "apiMessage"
          ) && (
            <MessageSuggestions
              suggestions={suggestions}
              onSuggestionClick={(message) => {
                track("clicked_message_suggestion", {
                  message_suggestion: message,
                });
                wrappedHandleFilterUserMessageAndSend(message);
                setIsSolveTogether(true);
              }}
            />
          )}
          <InputBar
            userInput={userInput}
            setUserInput={setUserInput}
            handleFilterUserMessageAndSend={
              wrappedHandleFilterUserMessageAndSend
            }
            canReply={canReply}
            options={[]}
            autoFocus={!isTouchScreen}
            voiceEnabled={voiceEnabled}
            onVoiceToggle={handleVoiceToggle}
            onStartRecording={() => {
              if (speechControls) {
                speechControls.fadeOutAndStop();
              }
            }}
          />
        </div>
      )}

      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => {
          setShowDisclaimer(false);
        }}
      />

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => {
          setShowFeedback(false);
        }}
        feedbackType={feedbackType}
        questionData={[currentQuestionWithMarkingResult]}
        conversationHistory={messages}
        onTrackSignal={(name, comment, questionId) =>
          trackSignal(name, comment, "feedback", questionId)
        }
      />
    </>
  );
});

export default AiCard;
