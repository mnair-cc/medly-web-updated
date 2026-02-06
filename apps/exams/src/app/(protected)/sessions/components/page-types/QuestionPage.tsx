import {
  InputMode,
  SessionType,
  MockPage,
  QuestionSessionPageType,
} from "../../types";
import {
  QuestionGroup,
  QuestionWithMarkingResult,
  Canvas,
  CanvasMessage,
  MarkingContext,
  FloatingMessage,
  Decoration,
  UnderlineType,
  DecorationType,
} from "@/app/types/types";
import EnglishLitPrelude from "../question-components/EnglishLitPrelude";
import QuestionGroupCardContent from "../question-components/QuestionGroupCardContent";
import MarkingCriteriaCard from "../question-components/MarkingCriteriaCard";
import QuestionGroupCardStem from "../question-components/QuestionGroupCardStem";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import SketchCanvasLined from "../question-components/canvas/SketchCanvasLined";
import SketchCanvas from "../question-components/canvas/SketchCanvas";
import InputBar from "../InputBar";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import QuestionAndAnswerContainer from "../question-components/QuestionAndAnswerContainer";
import BottomSheet from "../BottomSheet";
import { useResponsive } from "@/app/_hooks/useResponsive";
import AnnotationToolbar from "../question-components/AnnotationToolbar";
import AskMedlyPopup from "../question-components/AskMedlyPopup";

import QuestionBreakdownOverlay from "../question-breakdown/QuestionBreakdownOverlay";
import { Socket } from "socket.io-client";
import NotesColumn from "../question-components/NotesColumn";
import CloseIcon from "@/app/_components/icons/CloseIcon";
import DesmosStep from "../question-breakdown/steps/DesmosStep";
import DesmosScientific from "../question-breakdown/steps/DesmosScientific";
import SprHelpSheet from "../question-components/SprHelpSheet";
import { useExamLoggerContext } from "@/app/(protected)/sessions/contexts/ExamLoggerContext";
import CustomSketchCanvas from "../question-breakdown/steps/CustomSketchCanvas"; // LEGACY: now integrated in SketchCanvas
import { CrossCanvasRegistry } from "@/app/_lib/utils/CrossCanvasRegistry";

// Memoised versions to keep DOM stable and preserve text selection
const MemoQuestionGroupCardContent = React.memo(QuestionGroupCardContent);
const MemoQuestionAndAnswerContainer = React.memo(QuestionAndAnswerContainer);

export default function QuestionPage({
  currentPageIndex,
  questionNumber,
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
  isStepsActive,
  setIsStepsActive,
  isCalculatorOpen,
  isAnnotating,
  // Breakdown footer prop setters
  setBreakdownButtonText,
  setBreakdownButtonState,
  setBreakdownIsDisabled,
  setBreakdownOnClick,
  setBreakdownIsMarked,
  setBreakdownUserMark,
  setBreakdownMaxMark,
  setBreakdownIsMarking,
  setCurrentStepIndex,
  currentStepIndex,
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
  pages,
}: {
  currentPageIndex: number;
  questionNumber: number;
  questionGroup: Omit<QuestionGroup, "questions"> & {
    questions: QuestionWithMarkingResult[];
  };
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  updateQuestionCanvas: (
    questionGroupId: number,
    questionLegacyId: string,
    canvas: Canvas
  ) => void;
  updateQuestionDecorations: (
    questionGroupId: number,
    questionLegacyId: string,
    decorations: Decoration[]
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
    questionLegacyId: string
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
      | undefined
  ) => void;
  isStepsActive: boolean;
  setIsStepsActive: (active: boolean) => void;
  isCalculatorOpen: boolean;
  isAnnotating: boolean;
  // Breakdown footer prop setters
  setBreakdownButtonText: (text: string | undefined) => void;
  setBreakdownButtonState: (state: "filled" | "greyed" | undefined) => void;
  setBreakdownIsDisabled: (disabled: boolean | undefined) => void;
  setBreakdownOnClick: (onClick: (() => void) | undefined) => void;
  setBreakdownIsMarked: (marked: boolean | undefined) => void;
  setBreakdownUserMark: (mark: number | undefined) => void;
  setBreakdownMaxMark: (mark: number | undefined) => void;
  setBreakdownIsMarking: (marking: boolean | undefined) => void;
  setCurrentStepIndex: (step: number | undefined) => void;
  currentStepIndex: number;
  updateQuestionDesmosExpressions: (
    questionGroupId: number,
    questionLegacyId: string,
    expressions: any[]
  ) => void;
  isQuestionStemHighlighted: boolean;
  isQuestionPartHighlighted: boolean;
  highlightedQuestionPartIndex: number;
  handleRetryQuestion: (
    questionGroupId: number,
    questionLegacyId: string
  ) => void;
  scrollToNextUnansweredQuestion?: React.MutableRefObject<(() => void) | null>;
  registerDesmosRef?: (
    id: string,
    ref: any,
    isReadOnly: boolean,
    index: number
  ) => void;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeId: string,
    strokeData?: any
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeId: string) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  getIsQuestionReadOnly?: (questionLegacyId: string) => boolean;
  mathCanvasMode: "drawing" | "textbox";
  pages?: MockPage[];
}) {
  const isEnglishLit =
    questionGroup.questions[0]?.legacyId?.includes("EngLit") ?? false;
  const isMath = questionGroup.legacyId?.includes("Math") ?? false;
  const isSATMath =
    questionGroup.questions[0]?.subLessonId?.includes("sat1") ?? false;
  const isSATRW =
    questionGroup.questions[0]?.subLessonId?.includes("sat0") ?? false;
  const isSAT =
    questionGroup.questions[0]?.subLessonId?.includes("sat") ?? false;
  const isAQA = questionGroup.questions[0]?.legacyId?.includes("aqa") ?? false;
  // Use filtered question number (1-based) mapped to 0-based index
  const displayedPageIndex = Math.max(0, (questionNumber || 0) - 1);

  const showShimmer = false;
  const [markingQuestionId, setMarkingQuestionId] = useState<string | null>(
    null
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

  const [isNotesColumnOpen, setIsNotesColumnOpen] = useState(false);

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
    const nextUnmarkedIndex = questionGroup.questions.findIndex(
      (question) => question.userMark === undefined
    );

    if (nextUnmarkedIndex !== -1) {
      setCurrentQuestionIndex(nextUnmarkedIndex);

      // Scroll to the question element
      const questionElement = document.querySelector(
        `[data-question-index="${nextUnmarkedIndex}"]`
      );
      if (questionElement) {
        questionElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [questionGroup.questions]);

  // English Lit part index
  const [currentEngLitPartIndex, setCurrentEngLitPartIndex] = useState(0);

  // Set currentEngLitPartIndex on page navigation
  useEffect(() => {
    if (isEnglishLit) {
      const legacyId = questionGroup.questions[0].legacyId;
      const isAqaEngLit1 = legacyId.includes("aqaGCSEEngLit_1");
      const isAqaEngLit2 = legacyId.includes("aqaGCSEEngLit_2");
      const isEdexcelEngLit1 = legacyId.includes("edexcelGCSEEngLit_1");
      const isEdexcelEngLit2 = legacyId.includes("edexcelGCSEEngLit_2");

      // Find the first question with a non-empty userAnswer
      const answeredQuestionIndex = questionGroup.questions.findIndex(
        (question) =>
          question.userAnswer &&
          (typeof question.userAnswer === "string"
            ? question.userAnswer.trim() !== ""
            : Array.isArray(question.userAnswer)
              ? question.userAnswer.length > 0 &&
                question.userAnswer.some((answer) => answer.trim() !== "")
              : question.userAnswer &&
                Object.keys(question.userAnswer).length > 0)
      );

      if (answeredQuestionIndex !== -1) {
        if (isAqaEngLit1) {
          // AQA GCSE Eng Lit Paper 1: single question on both pages 1 and 2
          setCurrentEngLitPartIndex(answeredQuestionIndex);
        } else if (isAqaEngLit2) {
          // AQA GCSE Eng Lit Paper 2: single question on pages 1 and 2, show all on page 3+
          if (currentPageIndex === 1 || currentPageIndex === 2) {
            setCurrentEngLitPartIndex(answeredQuestionIndex);
          } else {
            setCurrentEngLitPartIndex(0);
          }
        } else if (isEdexcelEngLit1) {
          // Edexcel GCSE Eng Lit Paper 1: pairs on page 1, single on page 2
          if (currentPageIndex === 1) {
            setCurrentEngLitPartIndex(
              Math.floor(answeredQuestionIndex / 2) * 2
            );
          } else {
            setCurrentEngLitPartIndex(answeredQuestionIndex);
          }
        } else if (isEdexcelEngLit2) {
          // Edexcel GCSE Eng Lit Paper 2: pairs on page 1, single on page 2, show all on page 3+
          if (currentPageIndex === 1) {
            setCurrentEngLitPartIndex(
              Math.floor(answeredQuestionIndex / 2) * 2
            );
          } else if (currentPageIndex === 2) {
            setCurrentEngLitPartIndex(answeredQuestionIndex);
          } else {
            setCurrentEngLitPartIndex(0);
          }
        } else {
          // Default behavior for other English Lit papers
          setCurrentEngLitPartIndex(answeredQuestionIndex);
        }
      } else {
        setCurrentEngLitPartIndex(0);
      }
    }
  }, [currentPageIndex, questionGroup.questions, isEnglishLit]);

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
            "[data-annotation-enabled]"
          );

          if (isInQuestionContent) {
            const rect = range.getBoundingClientRect();

            if (isAnnotating) {
              // In annotation mode: immediately apply highlight
              // Clear any existing selection state to ensure clean highlighting
              setSelectedDecorationIndex(null);
              setCurrentTextSelection(null);
              decorationClickFlag.current = false;

              const currentDecorations =
                questionGroup.questions[0]?.decorations || [];

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
              updateQuestionDecorations(
                questionGroup.id,
                questionGroup.questions[0].legacyId,
                newDecorations
              );

              // Log the decoration creation
              logAddDecoration(questionGroup.questions[0].legacyId, text).catch(
                console.error
              );

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
    questionGroup,
    lastUsedHighlightColor,
    lastUsedUnderlineType,
    updateQuestionDecorations,
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
        handleDecorationClick
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
      const clickedAskMedlyPopup = target.closest("[data-ask-medly-popup]");
      const clickedInQuestionContent = target.closest(
        "[data-annotation-enabled]"
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
        !clickedToolbar &&
        !clickedAskMedlyPopup
      ) {
        setSelectedDecorationIndex(null);
        setCurrentTextSelection(null);
      }

      // Clear text selection if clicked outside (for Ask Medly popup)
      if (
        currentTextSelection &&
        !clickedInQuestionContent &&
        !clickedToolbar &&
        !clickedAskMedlyPopup
      ) {
        setCurrentTextSelection(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [selectedDecorationIndex, isAnnotating, currentTextSelection]);

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
    });
  };

  const handleAskMedly = (
    questionGroupIndex: number,
    questionIndex: number
  ) => {
    const indexes = questionGroupIndex + 1 + "_" + (questionIndex + 1);
    handleSendMessage(`selected_question_index_${indexes}`);
  };

  const showMarkingCriteriaColumn =
    questionGroup.questions.some((q) => {
      return q.isMarked;
    }) && !isAiChatOpen;

  const handleBreakdownNext = () => {
    setIsStepsActive(false);
    // Don't go to next question, just hide breakdown mode
  };

  const handleHideSteps = () => {
    setIsStepsActive(false);
    setAiDecorations([]);
    setFloatingMessage(undefined);
  };

  // Memoize combined decorations to prevent unnecessary re-renders and preserve text selection
  const memoizedDecorationsByQuestion = useMemo(() => {
    const decorationsMap = new Map();
    questionGroup.questions.forEach((question) => {
      decorationsMap.set(question.legacyId, [
        ...(question.decorations || []),
        ...aiDecorations,
      ]);
    });
    return decorationsMap;
  }, [questionGroup.questions, aiDecorations]);

  const firstQuestionDecorations = useMemo(
    () => [
      ...(questionGroup.questions[0]?.decorations || []),
      ...aiDecorations,
    ],
    [questionGroup.questions[0]?.decorations, aiDecorations]
  );

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

  return (
    <div className="mx-auto h-full w-full relative">
      {/* Question page for SAT */}
      {isSATRW &&
        questionGroup.questions.map(
          (question: QuestionWithMarkingResult, index: number) => (
            <div
              key={question.legacyId}
              className="flex w-full h-full"
              data-question-index={index}
            >
              <div
                className={`flex-1 flex flex-row w-10 mx-auto ${
                  !isCalculatorOpen &&
                  question.questionType !== "spr" &&
                  !isStepsActive
                    ? "justify-center bg-white"
                    : "justify-end"
                }`}
              >
                {/* TODO: don't remove w-10, important for container responsive half split */}
                <div
                  className={`w-full md:w-1/2 relative bg-[#FBFBFD] overflow-y-auto pb-64 md:pb-5 p-5 border-r border-[#EFEFF6] 
                  ${
                    isWideScreen &&
                    !isCalculatorOpen &&
                    question.questionType !== "spr" &&
                    (isSATMath || isMath) &&
                    !isStepsActive
                      ? "hidden"
                      : ""
                  }`}
                  data-question-content={index}
                >
                  {question.questionType === "spr" && <SprHelpSheet />}
                  {isSATRW || paperId?.includes("Reading") ? (
                    <div data-annotation-enabled>
                      <MemoQuestionGroupCardContent
                        paperId={paperId}
                        currentQuestionIndex={displayedPageIndex}
                        currentQuestionPartIndex={index}
                        currentQuestionWithMarkingResult={question}
                        userAnswer={question.userAnswer}
                        updateQuestionUserAnswer={updateQuestionUserAnswer}
                        highlightedText={highlightedText}
                        showLineNumbers={true}
                        combinedDecorations={
                          memoizedDecorationsByQuestion.get(
                            question.legacyId
                          ) || []
                        }
                        selectedDecorationIndex={selectedDecorationIndex}
                        isAnnotating={isAnnotating}
                      />
                    </div>
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-full z-10">
                      {isStepsActive ? (
                        <div className="flex flex-1 flex-col relative py-5 overflow-y-auto pb-24">
                          <MemoQuestionAndAnswerContainer
                            question={question}
                            currentPageIndex={currentPageIndex}
                            decorations={
                              memoizedDecorationsByQuestion.get(
                                question.legacyId
                              ) || []
                            }
                            updateQuestionUserAnswer={updateQuestionUserAnswer}
                            handleMarkAnswer={handleMarkAnswer}
                            isReadOnly={isReadOnly}
                            showShimmer={showShimmer}
                            hideOptions={true}
                            updateQuestionMarkedForReview={
                              updateQuestionMarkedForReview
                            }
                            sessionType={sessionType}
                            selectedDecorationIndex={selectedDecorationIndex}
                            isAnnotating={isAnnotating}
                            handleRetryQuestion={handleRetryQuestion}
                            handleSendMessage={handleSendMessage}
                            isAwaitingResponse={isAwaitingResponse}
                          />
                        </div>
                      ) : (
                        <div style={{ height: "50dvh", width: "100%" }}>
                          {!isWideScreen && (
                            <DesmosStep desmos_type="scientific" />
                          )}
                        </div>
                        // <SketchCanvasLined
                        //   inputMode={inputMode}
                        //   setInputMode={setInputMode}
                        //   isReadOnly={false} // isReadOnly || !!question.markingTable
                        //   canvas={question.canvas}
                        //   updateQuestionCanvas={updateQuestionCanvas}
                        //   questionGroupId={questionGroup.id}
                        //   questionLegacyId={question.legacyId}
                        //   questionAnnotations={question.annotations}
                        //   canvasMessage={canvasMessage}
                        //   handleSendMessage={handleSendMessage}
                        //   shimmerTextboxIndices={shimmerTextboxIndices}
                        //   fadeInTextboxIndices={fadeInTextboxIndices}
                        //   highlightTextbox={
                        //     floatingMessage?.targetAction === "write_work" &&
                        //     !isAwaitingResponse &&
                        //     isOnLastSegment
                        //   }
                        //   isSolveTogether={isSolveTogether}
                        // />
                      )}
                    </div>
                  )}

                  {!isAiChatOpen && !isStepsActive && (
                    <div
                      className={`absolute p-8 left-0 right-0 z-[10] bottom-0 mx-auto max-w-[480px]`}
                    >
                      <InputBar
                        userInput={userInput}
                        handleFilterUserMessageAndSend={handleSendMessage}
                        setUserInput={setUserInput}
                        canReply={true}
                        options={[]}
                        highlightInput={
                          floatingMessage?.targetAction === "reply" &&
                          !isAwaitingResponse &&
                          isOnLastSegment
                        }
                        placeholder="Ask Medly Anything"
                        autoFocus={false}
                      />
                    </div>
                  )}
                </div>

                {/* Notes column */}
                <NotesColumn
                  decorations={question.decorations || []}
                  updateQuestionDecorations={(decorations) =>
                    updateQuestionDecorations(
                      questionGroup.id,
                      question.legacyId,
                      decorations
                    )
                  }
                  isOpen={isNotesColumnOpen}
                  onToggle={setIsNotesColumnOpen}
                  selectedDecorationIndex={selectedDecorationIndex}
                  onSelectDecoration={setSelectedDecorationIndex}
                />

                {isWideScreen && (
                  <div
                    className={`flex flex-col relative py-5 overflow-y-auto bg-white
                  ${
                    !isStepsActive &&
                    question.isMarked &&
                    sessionType === SessionType.PracticeSession
                      ? "mb-[200px] xl:mb-[92px]"
                      : !isStepsActive &&
                        !question.isMarked &&
                        sessionType === SessionType.PracticeSession &&
                        "mb-[160px] xl:mb-0 xl:pb-[96px]"
                  }
                  ${
                    !isStepsActive &&
                    !isCalculatorOpen &&
                    question.questionType !== "spr" &&
                    (isSATMath || isMath)
                      ? "w-full px-40"
                      : "w-1/2"
                  }
                  `}
                    data-annotation-enabled
                    data-question-content={index}
                  >
                    {!isStepsActive && (
                      <MemoQuestionAndAnswerContainer
                        question={question}
                        currentPageIndex={currentPageIndex}
                        updateQuestionUserAnswer={updateQuestionUserAnswer}
                        handleMarkAnswer={handleMarkAnswer}
                        isReadOnly={isReadOnly}
                        showShimmer={showShimmer}
                        updateQuestionMarkedForReview={
                          updateQuestionMarkedForReview
                        }
                        sessionType={sessionType}
                        hideOptions={false}
                        decorations={
                          memoizedDecorationsByQuestion.get(
                            question.legacyId
                          ) || []
                        }
                        selectedDecorationIndex={selectedDecorationIndex}
                        isAnnotating={isAnnotating}
                        handleRetryQuestion={handleRetryQuestion}
                        handleSendMessage={handleSendMessage}
                        isAwaitingResponse={isAwaitingResponse}
                      />
                    )}
                    <QuestionBreakdownOverlay
                      question={question}
                      isActive={isStepsActive}
                      onNext={handleBreakdownNext}
                      onHideSteps={handleHideSteps}
                      socket={socket}
                      socketError={socketError}
                      setSocketError={setSocketError}
                      sessionType={sessionType}
                      subjectId={subjectId}
                      lessonId={lessonId}
                      paperId={paperId}
                      setAiDecorations={setAiDecorations}
                      setFloatingMessage={setFloatingMessage}
                      // Breakdown footer prop setters
                      setBreakdownButtonText={setBreakdownButtonText}
                      setBreakdownButtonState={setBreakdownButtonState}
                      setBreakdownIsDisabled={setBreakdownIsDisabled}
                      setBreakdownOnClick={setBreakdownOnClick}
                      setBreakdownIsMarked={setBreakdownIsMarked}
                      setBreakdownUserMark={setBreakdownUserMark}
                      setBreakdownMaxMark={setBreakdownMaxMark}
                      setBreakdownIsMarking={setBreakdownIsMarking}
                      setCurrentStepIndex={setCurrentStepIndex}
                      currentStepIndex={currentStepIndex}
                    />

                    {false &&
                      (isSATMath || isMath) &&
                      !isAiChatOpen &&
                      !isStepsActive &&
                      !isCalculatorOpen && (
                        <div
                          className={`absolute p-8 left-0 right-0 z-[1000] bottom-0 mx-auto max-w-[480px]`}
                        >
                          <InputBar
                            userInput={userInput}
                            handleFilterUserMessageAndSend={handleSendMessage}
                            setUserInput={setUserInput}
                            canReply={true}
                            options={[]}
                            highlightInput={
                              floatingMessage?.targetAction === "reply" &&
                              !isAwaitingResponse &&
                              isOnLastSegment
                            }
                            placeholder="Ask Medly Anything"
                            autoFocus={false}
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>

              {false && showMarkingCriteriaColumn && (
                <div className="pl-4 mt-10">
                  <MarkingCriteriaCard
                    questionWithMarkingResult={question}
                    index={index}
                    handleRemark={() => {
                      handleRemark(question);
                    }}
                    handleAskMedly={() => {
                      handleAskMedly(questionGroup.order, index);
                    }}
                    isMarking={markingQuestionId === question.legacyId}
                  />
                </div>
              )}
            </div>
          )
        )}

      {/* Question page for UK */}
      <div
        ref={scrollContainerRef}
        className={`flex flex-col items-center h-full overflow-y-scroll pt-20 py-8 relative ${
          inputMode === "grab"
            ? isDraggingPage
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
        data-question-page-scroll
      >
        <div className="relative">
          {!isSAT &&
            questionGroup.questions
              .filter((question, index) =>
                isEnglishLit
                  ? questionGroup.questions[0].legacyId.includes(
                      "aqaGCSEEngLit_1"
                    )
                    ? currentPageIndex === 1
                      ? index === currentEngLitPartIndex
                      : currentPageIndex === 2 &&
                        index === currentEngLitPartIndex
                    : questionGroup.questions[0].legacyId.includes(
                          "aqaGCSEEngLit_2"
                        )
                      ? currentPageIndex === 1
                        ? index === currentEngLitPartIndex
                        : currentPageIndex === 2
                          ? index === currentEngLitPartIndex
                          : true
                      : questionGroup.questions[0].legacyId.includes(
                            "edexcelGCSEEngLit_1"
                          )
                        ? currentPageIndex === 1
                          ? index === currentEngLitPartIndex ||
                            index === currentEngLitPartIndex + 1
                          : currentPageIndex === 2 &&
                            index === currentEngLitPartIndex
                        : questionGroup.questions[0].legacyId.includes(
                              "edexcelGCSEEngLit_2"
                            )
                          ? currentPageIndex === 1
                            ? index === currentEngLitPartIndex ||
                              index === currentEngLitPartIndex + 1
                            : currentPageIndex === 2
                              ? index === currentEngLitPartIndex
                              : true
                          : true
                  : true
              )
              .map((question: QuestionWithMarkingResult, index: number) => (
                <div
                  key={question.legacyId}
                  className="flex w-full"
                  data-question-index={index}
                >
                  {true && (
                    <div
                      className={`flex flex-col relative w-full overflow-hidden relative`}
                    >
                      {/* White rounded header */}
                      {index === 0 && (
                        <div className="hidden md:block md:w-[800px] h-16 bg-white rounded-t-[16px] mx-auto md:border-t md:border-l md:border-r md:border-[#F2F2F7]" />
                      )}

                      <div
                        className="md:w-[800px] bg-white mx-auto px-5 md:px-10 md:border-l md:border-r md:border-[#F2F2F7] relative pb-10"
                        data-annotation-enabled
                      >
                        {SessionType.MockSession &&
                          isEnglishLit &&
                          index === 0 && (
                            <EnglishLitPrelude
                              currentQuestionIndex={displayedPageIndex}
                              currentEngLitPartIndex={currentEngLitPartIndex}
                              setCurrentEngLitPartIndex={
                                setCurrentEngLitPartIndex
                              }
                              currentQuestionWithMarkingResult={question}
                              isReadOnly={isReadOnly}
                            />
                          )}

                        {/* Question Group Stem */}
                        {index === 0 && (
                          <QuestionGroupCardStem
                            currentQuestionIndex={displayedPageIndex}
                            currentQuestionWithMarkingResult={question}
                            userAnswer={question.userAnswer}
                            setUserAnswer={(answer) =>
                              updateQuestionUserAnswer(
                                questionGroup.id,
                                question.legacyId,
                                answer
                              )
                            }
                            highlightedText={highlightedText}
                            isMaximized={false}
                            setIsMaximized={() => {}}
                            decorations={
                              memoizedDecorationsByQuestion.get(
                                question.legacyId
                              ) || []
                            }
                            selectedDecorationIndex={selectedDecorationIndex}
                            isAnnotating={isAnnotating}
                            isHighlighted={isQuestionStemHighlighted}
                          />
                        )}

                        {/* Question numbering and content */}
                        <div
                          className={`flex flex-col md:flex-row
                           ${!isAQA && index === 0 && questionGroup.questionStem.length > 0 ? "pt-5" : index === 0 && !isAQA ? "-mt-6" : isAQA && "pt-5"} 
                          ${isAQA || questionGroup.questions.length > 1 ? "md:px-10" : "md:px-2"}
                          relative
                      `}
                        >
                          {/* Question part highlighting */}
                          <div
                            className={`pointer-events-none absolute top-0 -left-4 -right-4 h-full z-5 transition-all duration-300 ease-in-out ${
                              !isQuestionPartHighlighted
                                ? "opacity-0"
                                : highlightedQuestionPartIndex == index
                                  ? "opacity-100 border border-[#05B0FF] border-2 rounded-[8px] bg-[#05B0FF]/5"
                                  : "opacity-70 bg-white z-10"
                            }`}
                          />

                          {/* Question numbering */}
                          {question.questionLegacyId?.includes("aqa") ? (
                            <div className="flex flex-row gap-0 md:-ml-10 md:mr-4">
                              <div
                                className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-r-0 border-black font-rounded-bold ${
                                  question.annotatedAnswer
                                    ? question.userMark === question.maxMark
                                      ? "text-[#7CC500]" // Green for full marks
                                      : question.userMark === 0
                                        ? "text-[#FF4B4C]" // Red for zero marks
                                        : "text-[#FFA935]" // Orange for partial marks
                                    : "text-[black]" // Black if not yet answered
                                } text-black`}
                              >
                                {(displayedPageIndex + 1).toString().length ===
                                1
                                  ? `0`
                                  : (displayedPageIndex + 1).toString()[0]}
                              </div>
                              <div
                                className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-black font-rounded-bold ${
                                  question.annotatedAnswer
                                    ? question.userMark === question.maxMark
                                      ? "text-[#7CC500]" // Green for full marks
                                      : question.userMark === 0
                                        ? "text-[#FF4B4C]" // Red for zero marks
                                        : "text-[#FFA935]" // Orange for partial marks
                                    : "text-[black]" // Black if not yet answered
                                } text-black`}
                              >
                                {(displayedPageIndex + 1).toString().length ===
                                1
                                  ? displayedPageIndex + 1
                                  : (displayedPageIndex + 1).toString()[1] || 0}
                              </div>
                              <div className="px-1">.</div>
                              <div
                                className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-black font-rounded-bold ${
                                  question.annotatedAnswer
                                    ? question.userMark === question.maxMark
                                      ? "text-[#7CC500]" // Green for full marks
                                      : question.userMark === 0
                                        ? "text-[#FF4B4C]" // Red for zero marks
                                        : "text-[#FFA935]" // Orange for partial marks
                                    : "text-[black]" // Black if not yet answered
                                } text-black`}
                              >
                                {index + 1}
                              </div>
                            </div>
                          ) : (
                            questionGroup.questions.length > 1 && (
                              <div
                                className={`text-[15px] mt-[-2px] font-rounded-bold mr-5 
                                ${
                                  question.annotatedAnswer
                                    ? question.userMark === question.maxMark
                                      ? "text-[#7CC500]" // Green for full marks
                                      : question.userMark === 0
                                        ? "text-[#FF4B4C]" // Red for zero marks
                                        : "text-[#FFA935]" // Orange for partial marks
                                    : "text-[black]" // Black if not yet answered
                                } 
                                text-black`}
                              >
                                {"(" + String.fromCharCode(97 + index) + ")"}
                              </div>
                            )
                          )}

                          <div className="flex-1">
                            {!isStepsActive && (
                              <MemoQuestionAndAnswerContainer
                                question={question}
                                currentPageIndex={currentPageIndex}
                                updateQuestionUserAnswer={
                                  updateQuestionUserAnswer
                                }
                                handleMarkAnswer={handleMarkAnswer}
                                isReadOnly={
                                  getIsQuestionReadOnly
                                    ? getIsQuestionReadOnly(question.legacyId)
                                    : isReadOnly
                                }
                                showShimmer={showShimmer}
                                updateQuestionMarkedForReview={
                                  updateQuestionMarkedForReview
                                }
                                sessionType={sessionType}
                                hideOptions={false}
                                decorations={
                                  memoizedDecorationsByQuestion.get(
                                    question.legacyId
                                  ) || []
                                }
                                selectedDecorationIndex={
                                  selectedDecorationIndex
                                }
                                handleSendMessage={handleSendMessage}
                                isAnnotating={isAnnotating}
                                hideHeader={true}
                                hideElimination={true}
                                handleRetryQuestion={handleRetryQuestion}
                                hideLines={
                                  (question.userMark !== undefined &&
                                    question.desmosExpressions &&
                                    question.desmosExpressions.length > 0) ||
                                    mathCanvasMode === "drawing" ? true : false
                                  }
                                isAwaitingResponse={isAwaitingResponse}
                              />
                            )}
                          </div>
                        </div>

                        {![
                          "reorder",
                          "match_pair",
                          "mcq",
                          "group",
                          "number",
                          "spot",
                        ].includes(question.questionType) &&
                          isWideScreen &&
                          !question.questionLegacyId?.includes("Eng") && (
                            <>
                              {/* Sketch Canvas Overlay */}
                              {(question.userMark !== undefined &&
                                question.desmosExpressions &&
                                question.desmosExpressions.length > 0) ||
                                mathCanvasMode === "drawing" ? (
                                <div className="relative w-full h-full">
                                  <DesmosScientific
                                    inputMode={inputMode}
                                    desmos_type="scientific"
                                    expressions={
                                      (question.desmosExpressions as any[]) ||
                                      []
                                    }
                                    maxMark={question.maxMark}
                                    onLinesDataChange={(data) => {
                                      updateQuestionDesmosExpressions(
                                        questionGroup.id,
                                        question.legacyId,
                                        data.current as any
                                      );
                                    }}
                                    onPressCheckDesmos={() =>
                                      handleSendMessage("Check my work")
                                    }
                                    isAwaitingResponse={isAwaitingResponse}
                                    isSolveTogether={isSolveTogether}
                                    floatingMessage={floatingMessage}
                                    isReadOnly={
                                      question.userMark !== undefined ||
                                      isReadOnly
                                    }
                                    questionId={question.legacyId}
                                    onStrokeAdded={onStrokeAdded as any}
                                    onStrokeRemoved={onStrokeRemoved as any}
                                    onEraseAction={onEraseAction}
                                    sessionType={sessionType}
                                    ref={(ref) => {
                                      if (registerDesmosRef) {
                                        registerDesmosRef(
                                          question.legacyId,
                                          ref,
                                          question.userMark !== undefined ||
                                          isReadOnly,
                                          index
                                        );
                                      }
                                    }}
                                  />
                                  {question.userMark !== undefined && (
                                    <div className="absolute top-0 left-0 w-full h-full z-[1000]" />
                                  )}
                                </div>
                              ) : (
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
                                  isQuestionMarked={
                                    question.userMark !== undefined
                                  }
                                  canvas={question.canvas}
                                  canvasMessage={canvasMessage}
                                  updateQuestionCanvas={updateQuestionCanvas}
                                  questionGroupId={questionGroup.id}
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
                                  onCanvasUpdate={(
                                    groupId,
                                    legacyId,
                                    oldCanvas,
                                    newCanvas
                                  ) => {
                                    setTimeout(() => {
                                      if (isSolveTogether) {
                                        handleSendMessage("canvas_updated");
                                      }
                                    }, 300);
                                  }}
                                />
                              )}
                            </>
                          )}
                      </div>

                      {/* White rounded footer */}
                      {index === questionGroup.questions.length - 1 && (
                        <div className="md:w-[800px] h-16 bg-white rounded-b-[16px] mx-auto md:border-b md:border-l md:border-r md:border-[#F2F2F7]" />
                      )}
                    </div>
                  )}
                </div>
              ))}

          {!["reorder", "match_pair", "mcq", "group", "number"].includes(
            questionGroup.questions[0].questionType
          ) &&
            isTouchScreen &&
            isWideScreen && (
              <div
                key={questionGroup.legacyId}
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
                  questionId={questionGroup.legacyId}
                  initialPaths={{
                    paths: questionGroup.questions[0]?.canvas?.stemPaths || [],
                  }}
                  registerWithRegistryId={`page-canvas-${questionGroup.legacyId}`}
                  onStroke={(data, isEraser) => {
                    // Merge incoming data with existing canvas to preserve all fields
                    const existingCanvas = questionGroup.questions[0]?.canvas;
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
                    updateQuestionCanvas(
                      questionGroup.id,
                      questionGroup.questions[0]?.legacyId,
                      mergedCanvas
                    );
                  }}
                  onStrokeAdded={onStrokeAdded}
                  onStrokeRemoved={onStrokeRemoved}
                  onEraseAction={onEraseAction}
                />
              </div>
            )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {!isWideScreen && isSAT && (
        <BottomSheet
          snapPoints={snapPoints}
          activeSnapPoint={snap || snapPoints[1]}
          setActiveSnapPoint={setSnap}
          open={true}
        >
          {isStepsActive && (
            <button
              onClick={() => {
                setIsStepsActive(false);
              }}
              className="absolute right-0 top-8 mr-2 p-0 z-[10000]"
            >
              <CloseIcon />
            </button>
          )}
          <div
            onClick={() => {
              if (snap === 0) {
                setSnap(1);
              }
            }}
            className={`flex flex-col max-w-md mx-auto w-full`}
            style={{
              marginBottom: snap === 1 ? "240px" : "0px",
            }}
            data-annotation-enabled
            data-question-index={0}
            data-question-content={0}
          >
            {!isStepsActive ? (
              <MemoQuestionAndAnswerContainer
                question={questionGroup.questions[0]}
                currentPageIndex={currentPageIndex}
                updateQuestionUserAnswer={updateQuestionUserAnswer}
                handleMarkAnswer={handleMarkAnswer}
                isReadOnly={isReadOnly}
                showShimmer={showShimmer}
                updateQuestionMarkedForReview={updateQuestionMarkedForReview}
                sessionType={sessionType}
                decorations={[
                  ...(questionGroup.questions[0].decorations || []),
                  ...aiDecorations,
                ]}
                isAnnotating={isAnnotating}
                handleRetryQuestion={handleRetryQuestion}
                handleSendMessage={handleSendMessage}
                isAwaitingResponse={isAwaitingResponse}
              />
            ) : (
              <QuestionBreakdownOverlay
                question={questionGroup.questions[0]}
                isActive={isStepsActive}
                onNext={handleBreakdownNext}
                onHideSteps={handleHideSteps}
                socket={socket}
                socketError={socketError}
                setSocketError={setSocketError}
                sessionType={sessionType}
                subjectId={subjectId}
                lessonId={lessonId}
                paperId={paperId}
                setAiDecorations={setAiDecorations}
                setFloatingMessage={setFloatingMessage}
                // Breakdown footer prop setters
                setBreakdownButtonText={setBreakdownButtonText}
                setBreakdownButtonState={setBreakdownButtonState}
                setBreakdownIsDisabled={setBreakdownIsDisabled}
                setBreakdownOnClick={setBreakdownOnClick}
                setBreakdownIsMarked={setBreakdownIsMarked}
                setBreakdownUserMark={setBreakdownUserMark}
                setBreakdownMaxMark={setBreakdownMaxMark}
                setBreakdownIsMarking={setBreakdownIsMarking}
                setCurrentStepIndex={setCurrentStepIndex}
                currentStepIndex={currentStepIndex}
              />
            )}
          </div>
        </BottomSheet>
      )}

      {/* Annotation Toolbar */}
      {currentTextSelection &&
        sessionType === SessionType.PaperSession &&
        !isReadOnly &&
        isSATRW && (
          <AnnotationToolbar
            selectionInfo={{
              text: currentTextSelection.text,
              rect: currentTextSelection.rect,
            }}
            combinedDecorations={firstQuestionDecorations}
            updateQuestionDecorations={(decorations) =>
              updateQuestionDecorations(
                questionGroup.id,
                questionGroup.questions[0].legacyId,
                decorations
              )
            }
            onOpenNotesColumn={() => setIsNotesColumnOpen(true)}
            lastUsedHighlightColor={lastUsedHighlightColor}
            lastUsedUnderlineType={lastUsedUnderlineType}
            onColorChange={setLastUsedHighlightColor}
            onUnderlineChange={setLastUsedUnderlineType}
            questionLegacyId={questionGroup.questions[0].legacyId}
          />
        )}

      {/* Ask Medly Popup for Practice Sessions */}
      {currentTextSelection &&
        sessionType === SessionType.LessonSession &&
        !isAnnotating && (
          <AskMedlyPopup
            selectionInfo={{
              text: currentTextSelection.text,
              rect: currentTextSelection.rect,
            }}
            onAskMedly={(text) => {
              // Clear the popup
              setCurrentTextSelection(null);

              // Send message to AI
              handleSendMessage(`Can you help me understand this? "${text}"`);
            }}
          />
        )}
    </div>
  );
}

// From QuestionGroupCard

// Always show QuestionGroupCardContent

// Always show InputMethod
// - if calculate long_answer or short_answer and not English show the SimpleLines
// - if it's not calculate, long_answer or short_answer show the different question type answer section (mcq etc)
// - if it's English show the EnglishLines

// Always show the canvas

// if maths or calculate, and in marking mode, show the shimmer effect

// What do we show for EngLit vs Lang? (lines, EnglishPrelude)
