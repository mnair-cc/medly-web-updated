import SketchCanvas from "@/app/(protected)/sessions/components/question-components/canvas/SketchCanvas";
import QuestionAndAnswerContainer from "@/app/(protected)/open/_components/session_structure/practice/MOQuestionAndAnswerContainer";
import QuestionGroupCardContent from "@/app/(protected)/sessions/components/question-components/QuestionGroupCardContent";
import QuestionGroupCardStem from "@/app/(protected)/sessions/components/question-components/QuestionGroupCardStem";
import { InputMode, SessionType } from "@/app/(protected)/sessions/types";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import {
  Canvas,
  CanvasMessage,
  Decoration,
  DecorationType,
  FloatingMessage,
  MarkingContext,
  MarkingResult,
  QuestionGroup,
  QuestionWithMarkingResult,
  UnderlineType,
} from "@/app/types/types";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CustomSketchCanvas from "@/app/(protected)/sessions/components/question-breakdown/steps/CustomSketchCanvas"; // LEGACY: now integrated in SketchCanvas
import DesmosScientific from "@/app/(protected)/sessions/components/question-breakdown/steps/DesmosScientific";
import { useExamLoggerContext } from "@/app/(protected)/sessions/contexts/ExamLoggerContext";
import { Socket } from "socket.io-client";
import { useRegisterContextCollector } from "@/app/(protected)/open/_components/chat/MOChatLayoutClient";
import { formatQuestionsForLLM } from "@/app/_lib/utils/llmDataFormatter";
import {
  buildCanvasLatexSummary,
  renderLinesToPngBase64,
} from "@/app/_lib/utils/utils";

// Memoised versions to keep DOM stable and preserve text selection
const MemoQuestionGroupCardContent = React.memo(QuestionGroupCardContent);
const MemoQuestionAndAnswerContainer = React.memo(QuestionAndAnswerContainer);

export default function QuestionPage({
  currentPageIndex,
  questionGroup,
  inputMode,
  setInputMode,
  updateQuestionUserAnswer,
  updateQuestionCanvas,
  updateQuestionDecorations,
  isReadOnly,
  highlightedText,
  handleSendMessage,
  canvasMessage,
  shimmerTextboxIndices = [],
  fadeInTextboxIndices = [],
  handleMarkAnswer,
  isAiChatOpen,
  floatingMessage,
  isAwaitingResponse,
  isSolveTogether,
  isOnLastSegment,
  updateQuestionMarkedForReview,
  socket,
  socketError,
  setSocketError,
  sessionType,
  subjectId,
  lessonId,
  paperId,
  aiDecorations,
  setAiDecorations,
  setFloatingMessage,
  isCalculatorOpen,
  isAnnotating,
  updateQuestionDesmosExpressions,
  isQuestionStemHighlighted,
  isQuestionPartHighlighted,
  highlightedQuestionPartIndex,
  handleRetryQuestion,
  scrollToNextUnansweredQuestion,
  registerDesmosRef,
  onStrokeAdded,
  onStrokeRemoved,
  onEraseAction,
  getIsQuestionReadOnly,
  mathCanvasMode,
  documentQuestionGroups,
  updateDocumentQuestionUserAnswer,
  updateDocumentQuestionCanvas,
  updateDocumentQuestionMarkingResult,
  updateDocumentQuestionDecorations,
  updateDocumentQuestionMarkedForReview,
  isMarking,
  toolbarHeight = 0,
}: {
  currentPageIndex: number;
  questionGroup?: Omit<QuestionGroup, "questions"> & {
    questions: QuestionWithMarkingResult[];
  };
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string },
  ) => void;
  updateQuestionCanvas: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas,
  ) => void;
  updateQuestionDecorations: (
    questionGroupId: number,
    questionLegacyId: string,
    decorations: Decoration[],
  ) => void;
  isReadOnly: boolean;
  highlightedText: string[];
  handleSendMessage: (message: string) => void;
  canvasMessage?: CanvasMessage[] | undefined;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  handleMarkAnswer: (markingContext: MarkingContext) => void;
  isAiChatOpen: boolean;
  floatingMessage?: FloatingMessage;
  isAwaitingResponse: boolean;
  isSolveTogether: boolean;
  isOnLastSegment: boolean;
  updateQuestionMarkedForReview: (
    questionGroupId: number,
    questionLegacyId: string,
  ) => void;
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  sessionType: SessionType;
  subjectId?: string;
  lessonId?: string;
  paperId?: string;
  aiDecorations: Decoration[];
  setAiDecorations: (decorations: Decoration[]) => void;
  setFloatingMessage: (
    message:
      | {
        text: string;
        targetText: string;
        targetAction: string;
        targetIndex?: number;
        targetComponent?: string;
      }
      | undefined,
  ) => void;
  isCalculatorOpen: boolean;
  isAnnotating: boolean;
  updateQuestionDesmosExpressions: (
    questionGroupId: number,
    questionLegacyId: string,
    expressions: any[],
  ) => void;
  isQuestionStemHighlighted: boolean;
  isQuestionPartHighlighted: boolean;
  highlightedQuestionPartIndex: number;
  handleRetryQuestion: (
    questionGroupId: number,
    questionLegacyId: string,
  ) => void;
  scrollToNextUnansweredQuestion?: React.MutableRefObject<(() => void) | null>;
  registerDesmosRef?: (
    id: string,
    ref: any,
    isReadOnly: boolean,
    index: number,
  ) => void;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeId: string,
    strokeData?: any,
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeId: string) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  getIsQuestionReadOnly?: (questionLegacyId: string) => boolean;
  mathCanvasMode: "drawing" | "textbox";
  documentQuestionGroups?: QuestionGroup[];
  updateDocumentQuestionUserAnswer?: (
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string },
  ) => void;
  updateDocumentQuestionCanvas?: (
    questionLegacyId: string,
    canvas: Canvas,
  ) => void;
  updateDocumentQuestionMarkingResult?: (
    questionLegacyId: string,
    markingResult: MarkingResult,
  ) => void;
  updateDocumentQuestionDecorations?: (
    questionLegacyId: string,
    decorations: Decoration[],
  ) => void;
  updateDocumentQuestionMarkedForReview?: (questionLegacyId: string) => void;
  isMarking?: boolean;
  toolbarHeight?: number;
}) {

  const questionGroups = documentQuestionGroups || [];
  // Flatten all questions for utilities that need flat array
  const allQuestions = useMemo(() =>
    questionGroups.flatMap(g => g.questions as QuestionWithMarkingResult[]),
    [questionGroups]
  );

  // Track seen group IDs for entrance animation
  const seenGroupIdsRef = useRef<Set<string | number>>(new Set());
  const [newGroupIds, setNewGroupIds] = useState<Set<string | number>>(new Set());
  const lastGroupRef = useRef<HTMLDivElement>(null);

  // Detect new groups and trigger animation
  useEffect(() => {
    const currentIds = questionGroups.map(g => g.id || g.legacyId || `group-${questionGroups.indexOf(g)}`);
    const newIds = currentIds.filter(id => !seenGroupIdsRef.current.has(id));

    if (newIds.length > 0 && seenGroupIdsRef.current.size > 0) {
      // New groups added (not initial load)
      setNewGroupIds(new Set(newIds));

      // Scroll so new question's top aligns with viewport top
      setTimeout(() => {
        if (lastGroupRef.current) {
          lastGroupRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);

      // Clear animation state after animation completes
      setTimeout(() => {
        setNewGroupIds(new Set());
      }, 350);
    }

    // Update seen IDs
    currentIds.forEach(id => seenGroupIdsRef.current.add(id));
  }, [questionGroups]);

  // Register context collector for questions page (chat agent context)
  const collectQuestionsContext = useCallback(async () => {
    if (!allQuestions || allQuestions.length === 0) {
      return { questions: [] };
    }

    // Format questions using existing utility
    const desmosExpressionsPerQuestion = allQuestions.map(
      (q) => q.desmosExpressions || [],
    );
    const formatted = formatQuestionsForLLM(
      allQuestions,
      desmosExpressionsPerQuestion,
    );

    // Add marking results to studentData
    const studentDataWithMarking = formatted.studentData.map((sd, idx) => ({
      ...sd,
      annotatedAnswer: allQuestions[idx]?.annotatedAnswer,
      markingTable: allQuestions[idx]?.markingTable,
      isMarked: allQuestions[idx]?.isMarked,
    }));

    // Build canvas latex summary from all expressions
    const allExpressions: any[] = [];
    allQuestions.forEach((q) => {
      if (q.desmosExpressions?.length)
        allExpressions.push(...q.desmosExpressions);
      if (q.canvas?.maths?.length) allExpressions.push(...q.canvas.maths);
    });
    const canvasLatexSummary =
      allExpressions.length > 0
        ? JSON.stringify(buildCanvasLatexSummary(allExpressions))
        : undefined;

    // Render strokes PNG (combining canvas paths + expression strokes)
    let canvasStrokesPng: string | undefined;
    const hasStrokes = allQuestions.some(
      (q) =>
        q.canvas?.paths?.length ||
        q.desmosExpressions?.length ||
        q.canvas?.maths?.length,
    );
    if (hasStrokes) {
      try {
        const strokesData: any[] = [];
        const headers: string[] = [];
        allQuestions.forEach((q, idx) => {
          const questionId = `part ${idx + 1}`;
          const hasPaths = q.canvas?.paths?.length;
          const hasExprs =
            q.desmosExpressions?.length || q.canvas?.maths?.length;
          if (hasPaths || hasExprs) {
            headers.push(`=====${questionId}======`);
            if (hasPaths && q.canvas?.paths) {
              strokesData.push({
                strokes: {
                  paths: q.canvas.paths.map((p: any) => ({
                    paths: p.points || p.paths,
                  })),
                },
              });
            }
            [
              ...(q.desmosExpressions || []),
              ...(q.canvas?.maths || []),
            ].forEach((expr: any) => {
              strokesData.push({ strokes: expr?.strokes });
            });
          }
        });
        canvasStrokesPng = await renderLinesToPngBase64(strokesData, {
          headers,
          padding: 8,
          background: "#ffffff",
          strokeColor: "#2563eb",
          lineWidth: 4,
          maxWidth: 900,
        });
      } catch (e) {
        console.error("Failed to render strokes PNG for chat context", e);
      }
    }

    return {
      questions: formatted.questionData,
      studentWork: studentDataWithMarking,
      canvasLatexSummary,
      canvasStrokesPng,
    };
  }, [allQuestions]);

  useRegisterContextCollector("questions", collectQuestionsContext);

  const displayedPageIndex =
    sessionType === SessionType.MockSession
      ? currentPageIndex - 1
      : currentPageIndex;

  const showShimmer = false;
  const [markingQuestionId, setMarkingQuestionId] = useState<string | null>(
    null,
  );
  const [userInput, setUserInput] = useState("");
  const { track } = useTracking();
  const { isWideScreen, isTouchScreen } = useResponsive();
  const { logAddDecoration } = useExamLoggerContext();

  // Snap points for the drawer
  const snapPoints = ["280px", 0.7, 1];
  const [snap, setSnap] = useState<number | string | null>(snapPoints[1]);

  // Text selection state for annotation toolbar
  const [currentTextSelection, setCurrentTextSelection] = useState<{
    text: string;
    rect: DOMRect;
  } | null>(null);

  // State for last used annotation colors/styles
  const [lastUsedHighlightColor, setLastUsedHighlightColor] =
    useState("#F6DEA3");
  const [lastUsedUnderlineType, setLastUsedUnderlineType] =
    useState<UnderlineType | null>(null);

  // Flag to indicate a decoration click is in progress
  const decorationClickFlag = useRef(false);

  // State to track current focused question index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const customSketchCanvasRef = useRef<any>(null);

  // Grab mode scrolling state
  const [isDraggingPage, setIsDraggingPage] = useState(false);
  const dragStartScrollPos = useRef({ x: 0, y: 0, scrollTop: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll to next unmarked question part
  const handleScrollToNextPart = useCallback(() => {
    // Find the first unmarked question (where userMark is undefined)
    const nextUnmarkedIndex = allQuestions.findIndex(
      (question) => question.userMark === undefined,
    );

    if (nextUnmarkedIndex !== -1) {
      setCurrentQuestionIndex(nextUnmarkedIndex);

      // Scroll to the question element
      const questionElement = document.querySelector(
        `[data-question-index="${nextUnmarkedIndex}"]`,
      );
      if (questionElement) {
        questionElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [allQuestions]);

  // Expose the scroll function to parent via ref
  useEffect(() => {
    if (scrollToNextUnansweredQuestion) {
      scrollToNextUnansweredQuestion.current = handleScrollToNextPart;
    }
  }, [handleScrollToNextPart, scrollToNextUnansweredQuestion]);

  // State for selected decoration
  const [selectedDecorationIndex, setSelectedDecorationIndex] = useState<
    number | null
  >(null);

  // Handle all text selection globally but limit to specific components
  useEffect(() => {
    // Only skip annotation in practice sessions if not in annotation mode
    if (
      (sessionType === SessionType.PracticeSession ||
        paperId?.includes("Math")) &&
      !isAnnotating
    )
      return;

    const handleGlobalMouseUp = () => {
      // Small delay to ensure selection is finalized
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text) {
          // If a decoration is currently selected, don't clear the toolbar
          if (decorationClickFlag.current) {
            // Reset flag but keep toolbar and decoration selection
            decorationClickFlag.current = false;
            return;
          }

          // Only clear text selection, keep decoration selection
          setCurrentTextSelection(null);
          return;
        }

        // Check if selection is within allowed components
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element =
            container.nodeType === Node.TEXT_NODE
              ? container.parentElement
              : (container as Element);

          // Only show annotation toolbar for selections within question content
          const isInQuestionContent = element?.closest(
            "[data-annotation-enabled]",
          );

          if (isInQuestionContent) {
            const rect = range.getBoundingClientRect();

            if (isAnnotating) {
              // In annotation mode: immediately apply highlight
              // Clear any existing selection state to ensure clean highlighting
              setSelectedDecorationIndex(null);
              setCurrentTextSelection(null);
              decorationClickFlag.current = false;

              const firstQuestion = allQuestions[0];
              const currentDecorations = firstQuestion?.decorations || [];

              // Create new highlight decoration with current settings
              const newDecoration = {
                type: DecorationType.HIGHLIGHT,
                text: text,
                color: lastUsedHighlightColor,
                ...(lastUsedUnderlineType && {
                  underline: lastUsedUnderlineType,
                }),
              };

              const newDecorations = [...currentDecorations, newDecoration];

              // Apply the new decoration
              if (firstQuestion) {
                updateDocumentQuestionDecorations?.(
                  firstQuestion.legacyId,
                  newDecorations,
                );

                // Log the decoration creation
                logAddDecoration(firstQuestion.legacyId, text).catch(
                  console.error,
                );
              }

              // Calculate the decoration index in the combined decorations array
              // The new decoration will be at the end of the current decorations
              const newDecorationIndex = currentDecorations.length;
              setSelectedDecorationIndex(newDecorationIndex);

              // Show the toolbar for the selection
              setCurrentTextSelection({
                text: text,
                rect: rect,
              });

              // Clear the browser selection to avoid visual artifacts
              selection.removeAllRanges();
            } else {
              // Normal mode: just show the toolbar
              setCurrentTextSelection({
                text: text,
                rect: rect,
              });
            }
          } else {
            setCurrentTextSelection(null);
          }
        }
      }, 10);
    };

    // Add event listeners
    document.addEventListener("mouseup", handleGlobalMouseUp);

    // Cleanup
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    isAnnotating,
    sessionType,
    paperId,
    lastUsedHighlightColor,
    lastUsedUnderlineType,
    updateDocumentQuestionDecorations,
    allQuestions,
  ]);

  // Listen for decoration clicks to open toolbar without native selection
  useEffect(() => {
    const handleDecorationClick = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        text: string;
        rect: DOMRect;
        decorationIndex: number;
      };
      decorationClickFlag.current = true;

      // Use setTimeout to ensure this runs after any other click handlers
      setTimeout(() => {
        // Always show toolbar when clicking any decoration (don't toggle)
        setSelectedDecorationIndex(detail.decorationIndex);
        setCurrentTextSelection({ text: detail.text, rect: detail.rect });
      }, 0);
    };

    window.addEventListener("medly-decoration-click", handleDecorationClick);

    return () => {
      window.removeEventListener(
        "medly-decoration-click",
        handleDecorationClick,
      );
    };
  }, []);

  // Clear darker highlight when clicking outside any decoration
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if the click is outside both decorations and note boxes
      const clickedDecoration = target.closest("[data-top-dec]");
      const clickedNoteBox = target.closest("[data-decoration-notebox]");
      const clickedToolbar = target.closest("[data-annotation-toolbar]");
      const clickedInQuestionContent = target.closest(
        "[data-annotation-enabled]",
      );

      // In annotation mode, don't clear state when clicking on question content
      // (let the mouseup handler deal with new selections)
      if (isAnnotating && clickedInQuestionContent) {
        return;
      }

      // Only deselect if we have a selection and clicked outside everything
      if (
        selectedDecorationIndex !== null &&
        !clickedDecoration &&
        !clickedNoteBox &&
        !clickedToolbar
      ) {
        setSelectedDecorationIndex(null);
        setCurrentTextSelection(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [selectedDecorationIndex, isAnnotating]);

  // Set snap to 0 when decorations are updated
  useEffect(() => {
    if (!isWideScreen) {
      if (aiDecorations.length > 0) {
        setSnap(0);
      }
    }
  }, [aiDecorations, isWideScreen]);

  useEffect(() => {
    const handler = () => {
      setSelectedDecorationIndex(null);
    };
    window.addEventListener("medly-decoration-deselect", handler);
    return () => {
      window.removeEventListener("medly-decoration-deselect", handler);
    };
  }, []);

  const handleRemark = (question: QuestionWithMarkingResult) => {
    setMarkingQuestionId(question.legacyId);
    handleMarkAnswer({
      questionLegacyId: question.legacyId,
      markMax: question.maxMark,
      userAnswer: question.userAnswer || "",
      canvas: question.canvas || {},
      question: question.questionText,
      correctAnswer: question.correctAnswer,
      questionType: question.questionType,
      lessonLegacyIds: question.lessonLegacyIds,
      options: question.options as string[] | undefined,
    });
  };

  // Memoize combined decorations to prevent unnecessary re-renders and preserve text selection
  const memoizedDecorationsByQuestion = useMemo(() => {
    const decorationsMap = new Map();
    allQuestions.forEach((question) => {
      decorationsMap.set(question.legacyId, [
        ...(question.decorations || []),
        ...aiDecorations,
      ]);
    });
    return decorationsMap;
  }, [allQuestions, aiDecorations]);

  useEffect(() => {
    if (customSketchCanvasRef.current) {
      customSketchCanvasRef.current.eraseMode(inputMode === "eraser");
    }
  }, [inputMode]);

  // Handle grab mode scrolling
  useEffect(() => {
    if (inputMode !== "grab") return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleGrabMouseDown = (e: MouseEvent) => {
      setIsDraggingPage(true);
      dragStartScrollPos.current = {
        x: e.clientX,
        y: e.clientY,
        scrollTop: container.scrollTop,
      };
      e.preventDefault();
    };

    const handleGrabMouseMove = (e: MouseEvent) => {
      if (!isDraggingPage) return;

      const deltaY = dragStartScrollPos.current.y - e.clientY;
      container.scrollTop = dragStartScrollPos.current.scrollTop + deltaY;
      e.preventDefault();
    };

    const handleGrabMouseUp = () => {
      setIsDraggingPage(false);
    };

    container.addEventListener("mousedown", handleGrabMouseDown);
    document.addEventListener("mousemove", handleGrabMouseMove);
    document.addEventListener("mouseup", handleGrabMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleGrabMouseDown);
      document.removeEventListener("mousemove", handleGrabMouseMove);
      document.removeEventListener("mouseup", handleGrabMouseUp);
    };
  }, [inputMode, isDraggingPage]);

  // Empty state for practice documents with no question groups yet
  if (questionGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg">No questions yet</p>
        <p className="text-sm mt-2">Use the chat to generate practice questions</p>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full w-full relative">
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(-40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        ref={scrollContainerRef}
        className={`flex flex-col items-center h-full overflow-y-scroll pt-8 relative ${inputMode === "grab"
          ? isDraggingPage
            ? "cursor-grabbing"
            : "cursor-grab"
          : ""
          }`}
        style={{ paddingBottom: 32 + toolbarHeight }}
        data-question-page-scroll
      >
        <div className="relative">
          {/* Question Groups */}
          {questionGroups.map((group, groupIndex) => {
            const groupQuestions = group.questions as QuestionWithMarkingResult[];
            const groupId = group.id || group.legacyId || `group-${groupIndex}`;
            const isNewGroup = newGroupIds.has(groupId);
            const isLastGroup = groupIndex === questionGroups.length - 1;

            // Calculate global question index for this group's first question
            const globalStartIndex = questionGroups
              .slice(0, groupIndex)
              .reduce((sum, g) => sum + g.questions.length, 0);

            return (
              <div
                key={groupId}
                ref={isLastGroup ? lastGroupRef : undefined}
                className={`${groupIndex > 0 ? "mt-6" : ""} ${
                  isNewGroup ? "animate-slide-in-up" : ""
                }`}
                style={isNewGroup ? {
                  animation: "slideInUp 300ms ease-out forwards",
                } : undefined}
              >
                {/* Card container with rounded borders */}
                <div className="md:w-[800px] mx-auto rounded-[16px] md:border md:border-[#F2F2F7] relative overflow-hidden">
                  {/* Group content */}
                  <div className="px-5 md:px-10 pt-8 pb-10">
                  {/* Question Group Stem */}
                  {group.questionStem && (
                    <div data-annotation-enabled className="pb-4">
                      <QuestionGroupCardStem
                        currentQuestionIndex={groupIndex}
                        currentQuestionWithMarkingResult={groupQuestions[0]}
                        decorations={
                          memoizedDecorationsByQuestion.get(
                            groupQuestions[0]?.legacyId,
                          ) || []
                        }
                        isAnnotating={isAnnotating}
                        questionStemOverride={group.questionStem}
                      />
                    </div>
                  )}

                  {/* Question parts within this group */}
                  {groupQuestions.map((question, partIndex) => {
                    const globalIndex = globalStartIndex + partIndex;
                    const isFirstPart = partIndex === 0;

                    return (
                      <div
                        key={question.legacyId}
                        className="flex w-full"
                        data-question-index={globalIndex}
                        data-annotation-enabled
                      >
                        <div className="flex flex-col relative w-full overflow-hidden">
                          {/* Question numbering and content */}
                          <div
                            className={`flex flex-col md:flex-row
                              ${isFirstPart && group.questionStem ? "pt-2" : isFirstPart ? "-mt-6" : "pt-5"}
                              ${groupQuestions.length > 1 ? "md:px-10" : "md:px-2"}
                              relative
                            `}
                          >
                            {/* Question part highlighting */}
                            <div
                              className={`pointer-events-none absolute top-0 -left-4 -right-4 h-full z-5 transition-all duration-300 ease-in-out ${
                                !isQuestionPartHighlighted
                                  ? "opacity-0"
                                  : highlightedQuestionPartIndex === globalIndex
                                    ? "opacity-100 border border-[#05B0FF] border-2 rounded-[8px] bg-[#05B0FF]/5"
                                    : "opacity-70 bg-white z-10"
                              }`}
                            />

                            {/* Question numbering */}
                            {groupQuestions.length > 1 && (
                              <div
                                className={`text-[15px] mt-[-2px] font-rounded-bold mr-5
                                  ${
                                    question.annotatedAnswer
                                      ? question.userMark === question.maxMark
                                        ? "text-[#7CC500]"
                                        : question.userMark === 0
                                          ? "text-[#FF4B4C]"
                                          : "text-[#FFA935]"
                                      : "text-[black]"
                                  }
                                  text-black`}
                              >
                                {"(" + String.fromCharCode(97 + partIndex) + ")"}
                              </div>
                            )}

                            <div className="flex-1">
                              <MemoQuestionAndAnswerContainer
                                question={question}
                                currentPageIndex={currentPageIndex}
                                updateQuestionUserAnswer={(groupId, legacyId, answer) =>
                                  updateDocumentQuestionUserAnswer?.(legacyId, answer)
                                }
                                handleMarkAnswer={handleMarkAnswer}
                                isReadOnly={
                                  getIsQuestionReadOnly
                                    ? getIsQuestionReadOnly(question.legacyId)
                                    : isReadOnly
                                }
                                showShimmer={showShimmer}
                                updateQuestionMarkedForReview={(groupId, legacyId) =>
                                  updateDocumentQuestionMarkedForReview?.(legacyId)
                                }
                                sessionType={sessionType}
                                hideOptions={false}
                                decorations={
                                  memoizedDecorationsByQuestion.get(question.legacyId) || []
                                }
                                selectedDecorationIndex={selectedDecorationIndex}
                                isAnnotating={isAnnotating}
                                hideHeader={true}
                                hideElimination={true}
                                handleRetryQuestion={handleRetryQuestion}
                                hideLines={mathCanvasMode === "drawing"}
                                isMarking={isMarking}
                              />
                            </div>
                          </div>

                          {/* Sketch canvas */}
                          {!["reorder", "match_pair", "mcq", "group", "number"].includes(
                            question.questionType,
                          ) &&
                            isWideScreen && (
                              <>
                                {mathCanvasMode === "textbox" ? (
                                  <SketchCanvas
                                    inputMode={inputMode}
                                    isDraggingPage={isDraggingPage}
                                    setInputMode={setInputMode}
                                    isReadOnly={
                                      question.userMark !== undefined ||
                                      (getIsQuestionReadOnly
                                        ? getIsQuestionReadOnly(question.legacyId)
                                        : isReadOnly)
                                    }
                                    isQuestionMarked={question.userMark !== undefined}
                                    canvas={question.canvas}
                                    canvasMessage={canvasMessage}
                                    updateQuestionCanvas={(groupId, legacyId, canvas) =>
                                      updateDocumentQuestionCanvas?.(legacyId, canvas)
                                    }
                                    questionGroupId={group.id}
                                    questionLegacyId={question.legacyId}
                                    questionAnnotations={question.annotations}
                                    handleSendMessage={handleSendMessage}
                                    shimmerTextboxIndices={shimmerTextboxIndices}
                                    fadeInTextboxIndices={fadeInTextboxIndices}
                                    isAwaitingResponse={isAwaitingResponse}
                                    isSolveTogether={isSolveTogether}
                                    onStrokeAdded={onStrokeAdded}
                                    onStrokeRemoved={onStrokeRemoved}
                                    onEraseAction={onEraseAction}
                                    onCanvasUpdate={(groupId, legacyId, oldCanvas, newCanvas) => {
                                      setTimeout(() => {
                                        if (isSolveTogether) {
                                          handleSendMessage("canvas_updated");
                                        }
                                      }, 300);
                                    }}
                                  />
                                ) : (
                                  <div className="relative w-full h-full">
                                    <DesmosScientific
                                      inputMode={inputMode}
                                      desmos_type="scientific"
                                      expressions={(question.desmosExpressions as any[]) || []}
                                      maxMark={question.maxMark}
                                      onLinesDataChange={(data) => {
                                        if (questionGroup?.id) {
                                          updateQuestionDesmosExpressions(
                                            questionGroup.id,
                                            question.legacyId,
                                            data.current as any,
                                          );
                                        }
                                      }}
                                      onPressCheckDesmos={() => handleSendMessage("Check my work")}
                                      isAwaitingResponse={isAwaitingResponse}
                                      isSolveTogether={isSolveTogether}
                                      floatingMessage={floatingMessage}
                                      isReadOnly={question.userMark !== undefined || isReadOnly}
                                      questionId={question.legacyId}
                                      onStrokeAdded={onStrokeAdded as any}
                                      onStrokeRemoved={onStrokeRemoved as any}
                                      onEraseAction={onEraseAction}
                                      ref={(ref) => {
                                        if (registerDesmosRef) {
                                          registerDesmosRef(
                                            question.legacyId,
                                            ref,
                                            question.userMark !== undefined || isReadOnly,
                                            globalIndex,
                                          );
                                        }
                                      }}
                                    />
                                    {question.userMark !== undefined && (
                                      <div className="absolute top-0 left-0 w-full h-full z-[1000]" />
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Sketch canvas for question stem */}
          {allQuestions[0] &&
            !["reorder", "match_pair", "mcq", "group", "number"].includes(
              allQuestions[0].questionType,
            ) &&
            isTouchScreen &&
            isWideScreen && (
              <div
                key={questionGroup?.legacyId || allQuestions[0]?.legacyId}
                className={`absolute top-0 bottom-0 h-full overflow-hidden rounded-[16px] w-[800px] left-1/2 -translate-x-1/2 z-5 ${inputMode === "pen" || inputMode === "eraser" ? "" : "pointer-events-none"}`}
              >
                <CustomSketchCanvas
                  ref={customSketchCanvasRef}
                  width="100%"
                  height="100%"
                  strokeColor="#06B0FF"
                  strokeWidth={4}
                  eraserWidth={8}
                  index={0}
                  style={{
                    backgroundColor: "transparent",
                  }}
                  showPlaceholder={false}
                  questionId={
                    questionGroup?.legacyId || allQuestions[0]?.legacyId || ""
                  }
                  initialPaths={{
                    paths: allQuestions[0]?.canvas?.stemPaths || [],
                  }}
                  registerWithRegistryId={`page-canvas-${questionGroup?.legacyId || allQuestions[0]?.legacyId}`}
                  onStroke={(data, isEraser) => {
                    // Merge incoming data with existing canvas to preserve all fields
                    const existingCanvas = allQuestions[0]?.canvas;
                    const mergedCanvas = {
                      paths: existingCanvas?.paths, // Preserve question part strokes
                      textboxes:
                        data.textboxes !== undefined
                          ? data.textboxes
                          : existingCanvas?.textboxes,
                      maths:
                        data.maths !== undefined
                          ? data.maths
                          : existingCanvas?.maths,
                      stemPaths:
                        data.paths !== undefined
                          ? data.paths
                          : existingCanvas?.stemPaths, // Write stem strokes
                    };
                    if (allQuestions[0]?.legacyId) {
                      updateDocumentQuestionCanvas?.(
                        allQuestions[0].legacyId,
                        mergedCanvas,
                      );
                    }
                    console.log(mergedCanvas);
                  }}
                  onStrokeAdded={onStrokeAdded}
                  onStrokeRemoved={onStrokeRemoved}
                  onEraseAction={onEraseAction}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
