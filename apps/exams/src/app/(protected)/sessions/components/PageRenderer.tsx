import React from "react";
import CoverPage from "./page-types/CoverPage";
import QuestionPage from "./page-types/QuestionPage";
import ReviewPage from "./page-types/ReviewPage";
import TextbookPage from "./page-types/TextbookPage";
import LearnPage from "./page-types/LearnPage";
import {
  MockPage,
  CoverContent,
  TextbookContent,
  LearnContent,
  InputMode,
  QuestionSessionPageType,
  SessionType,
  LearnFlowProgress,
} from "../types";
import {
  QuestionGroup,
  QuestionWithMarkingResult,
  Canvas,
  CanvasMessage,
  MarkingContext,
  FloatingMessage,
  Decoration,
} from "@/app/types/types";
import ShimmerEffect from "./question-components/canvas/ShimmerEffect";
import Spinner from "@/app/_components/Spinner";
import { Socket } from "socket.io-client";

type PageRendererProps = {
  page: MockPage;
  currentPageIndex: number;
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
  handleSendMessageRef: React.MutableRefObject<
    ((message: string) => void) | null
  >;
  canvasMessage?: CanvasMessage[] | undefined;
  isAwaitingResponse: boolean;
  isMarking: boolean;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  highlightedText: string[];
  handleMarkAnswer: (markingContext: MarkingContext) => void;
  isAiChatOpen: boolean;
  floatingMessage?: FloatingMessage;
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
  subjectTitle?: string;
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
        }
      | undefined
  ) => void;
  isStepsActive: boolean;
  setIsStepsActive: (active: boolean) => void;
  pages: MockPage[];
  handleSetCurrentPageIndex: (index: number) => void;
  sessionTitle: string;
  sessionSubtitle: string;
  isCalculatorOpen: boolean;
  isAnnotating: boolean;
  updateQuestionDesmosExpressions: (
    questionGroupId: number,
    questionLegacyId: string,
    expressions: unknown[]
  ) => void;
  setCurrentStepIndex: (step: number | undefined) => void;
  currentStepIndex: number;
  // Breakdown footer prop setters
  setBreakdownButtonText: (text: string | undefined) => void;
  setBreakdownButtonState: (state: "filled" | "greyed" | undefined) => void;
  setBreakdownIsDisabled: (disabled: boolean | undefined) => void;
  setBreakdownOnClick: (onClick: (() => void) | undefined) => void;
  setBreakdownIsMarked: (marked: boolean | undefined) => void;
  setBreakdownUserMark: (mark: number | undefined) => void;
  setBreakdownMaxMark: (mark: number | undefined) => void;
  setBreakdownIsMarking: (marking: boolean | undefined) => void;
  // Question highlight page props
  isQuestionStemHighlighted: boolean;
  isQuestionPartHighlighted: boolean;
  highlightedQuestionPartIndex: number;
  handleRetryQuestion: (
    questionGroupId: number,
    questionLegacyId: string
  ) => void;
  scrollToNextQuestionRef: React.MutableRefObject<(() => void) | null>;
  registerDesmosRef?: (
    id: string,
    ref: any,
    isReadOnly: boolean,
    index: number
  ) => void;
  onStrokeAdded?: (
    questionId: string,
    canvasRef: any,
    strokeIndex: number
  ) => void;
  onStrokeRemoved?: (questionId: string, strokeIndex: number) => void;
  onEraseAction?: (questionId: string, canvasRef: any, erasedData: any) => void;
  getIsQuestionReadOnly?: (questionLegacyId: string) => boolean;
  mathCanvasMode: "drawing" | "textbox";
  onLearnPageBlockIndexChange?: (index: number) => void;
  onLearnPageWhyClick?: () => void;
  onLearnPageExplainClick?: (stepIndex: number, stepMath: string) => void;
  learnFlowProgress?: LearnFlowProgress | null;
  updateBlockIndex?: (index: number) => void;
  updateMcqAnswer?: (
    blockKey: string,
    answer: {
      selected_option_index: number;
      is_checked: boolean;
      is_correct: boolean;
    }
  ) => void;
  updateCanvas?: (blockKey: string, canvas: Canvas) => void;
  markLearnFlowCompleted?: () => void;
};

const PageRenderer = React.forwardRef<HTMLDivElement, PageRendererProps>(
  (
    {
      page,
      currentPageIndex,
      inputMode,
      setInputMode,
      updateQuestionUserAnswer,
      updateQuestionCanvas,
      updateQuestionDecorations,
      isReadOnly,
      handleSendMessageRef,
      canvasMessage,
      isAwaitingResponse,
      isMarking,
      shimmerTextboxIndices = [],
      fadeInTextboxIndices = [],
      highlightedText,
      handleMarkAnswer,
      isAiChatOpen,
      floatingMessage,
      isSolveTogether,
      isOnLastSegment,
      updateQuestionMarkedForReview,
      socket,
      socketError,
      setSocketError,
      sessionType,
      subjectId,
      subjectTitle,
      lessonId,
      paperId,
      aiDecorations,
      setAiDecorations,
      setFloatingMessage,
      isStepsActive,
      setIsStepsActive,
      setCurrentStepIndex,
      currentStepIndex,
      pages,
      handleSetCurrentPageIndex,
      sessionTitle,
      sessionSubtitle,
      isCalculatorOpen,
      isAnnotating,
      updateQuestionDesmosExpressions,
      // Breakdown footer prop setters
      setBreakdownButtonText,
      setBreakdownButtonState,
      setBreakdownIsDisabled,
      setBreakdownOnClick,
      setBreakdownIsMarked,
      setBreakdownUserMark,
      setBreakdownMaxMark,
      setBreakdownIsMarking,
      isQuestionStemHighlighted,
      isQuestionPartHighlighted,
      highlightedQuestionPartIndex,
      handleRetryQuestion,
      scrollToNextQuestionRef,
      registerDesmosRef,
      onStrokeAdded,
      onStrokeRemoved,
      onEraseAction,
      getIsQuestionReadOnly,
      mathCanvasMode,
      onLearnPageBlockIndexChange,
      onLearnPageWhyClick,
      onLearnPageExplainClick,
      learnFlowProgress,
      updateBlockIndex,
      updateMcqAnswer,
      updateCanvas,
      markLearnFlowCompleted,
    },
    ref
  ) => {
    // Ensure scroll-to-top on page index change without forcing remounts
    React.useEffect(() => {
      const getContainer = (): HTMLDivElement | null => {
        if (!ref) return null;
        if (typeof ref === "function") return null;
        return (ref as React.RefObject<HTMLDivElement | null>).current;
      };

      const container = getContainer();
      if (!container) return;

      // Scroll primary container
      container.scrollTop = 0;

      // Also attempt to reset any inner scrollable regions
      const innerScrollers = container.querySelectorAll(
        ".overflow-y-auto, .overflow-y-scroll"
      );
      innerScrollers.forEach((el) => {
        (el as HTMLElement).scrollTop = 0;
      });
    }, [currentPageIndex, ref]);
    // Compute filtered question number to match dot navigation logic
    const computeFilteredQuestionPosition = () => {
      if (page.type !== QuestionSessionPageType.Question) {
        return { filteredIndex: -1, questionNumber: 0 };
      }
      try {
        const isLearnMode =
          sessionType === SessionType.LearnSession || currentPageIndex === 0;
        const questionPages = pages.filter(
          (p) => p.type === QuestionSessionPageType.Question
        );
        const currentStage = (page.content as QuestionGroup)?.stage;
        const filteredQuestionPages =
          !isLearnMode && currentStage !== undefined
            ? questionPages.filter((qp) => {
                const group = qp.content as QuestionGroup;
                return group?.stage === currentStage;
              })
            : questionPages;
        const filteredToActualIndex = filteredQuestionPages.map((fp) =>
          pages.findIndex((p) => p === fp)
        );
        const filteredIndex = filteredToActualIndex.findIndex(
          (idx) => idx === currentPageIndex
        );
        const questionNumber = filteredIndex >= 0 ? filteredIndex + 1 : 0;
        return { filteredIndex, questionNumber };
      } catch {
        return { filteredIndex: -1, questionNumber: 0 };
      }
    };
    const { questionNumber } = computeFilteredQuestionPosition();
    return (
      <div
        ref={ref}
        className="flex flex-col justify-start items-center flex-1 overflow-y-auto h-full relative"
        data-session-scroll-container
        // style={{
        //   ...(typeof window !== "undefined" && window.innerWidth >= 768
        //     ? {
        //       backgroundImage: "radial-gradient(#F0F0F0 2px, transparent 0)",
        //       backgroundSize: "32px 32px",
        //       backgroundPosition: "0 0",
        //       position: "relative",
        //       overflow: "hidden",
        //     }
        //     : {}),
        // }}
      >
        {page.type === QuestionSessionPageType.Cover && (
          <CoverPage content={page.content as CoverContent} paperId={paperId} />
        )}
        {page.type === QuestionSessionPageType.Textbook && (
          <TextbookPage content={page.content as TextbookContent} />
        )}
        {page.type === QuestionSessionPageType.Learn && (
          <LearnPage
            content={page.content as LearnContent}
            onCurrentBlockIndexChange={onLearnPageBlockIndexChange}
            onWhyClick={onLearnPageWhyClick}
            onExplainClick={onLearnPageExplainClick}
            pages={pages}
            handleSetCurrentPageIndex={handleSetCurrentPageIndex}
            lessonId={lessonId}
            subjectId={subjectId}
            initialLearnFlowProgress={learnFlowProgress}
            updateBlockIndex={updateBlockIndex}
            updateMcqAnswer={updateMcqAnswer}
            updateCanvas={updateCanvas}
            markLearnFlowCompleted={markLearnFlowCompleted}
            inputMode={inputMode}
            setInputMode={setInputMode}
            canvasMessage={canvasMessage}
            isAwaitingResponse={isAwaitingResponse}
            handleSendMessageRef={handleSendMessageRef}
            isReadOnly={isReadOnly}
            shimmerTextboxIndices={shimmerTextboxIndices}
            fadeInTextboxIndices={fadeInTextboxIndices}
            highlightedText={highlightedText}
          />
        )}
        {page.type === QuestionSessionPageType.Question && (
          <>
            {(page.content as QuestionGroup).questions.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <Spinner />
              </div>
            ) : (
              <>
                <QuestionPage
                  currentPageIndex={currentPageIndex}
                  questionNumber={questionNumber}
                  questionGroup={
                    page.content as QuestionGroup & {
                      questions: QuestionWithMarkingResult[];
                    }
                  }
                  inputMode={inputMode}
                  setInputMode={setInputMode}
                  updateQuestionUserAnswer={updateQuestionUserAnswer}
                  updateQuestionCanvas={updateQuestionCanvas}
                  updateQuestionDecorations={updateQuestionDecorations}
                  isReadOnly={isReadOnly}
                  highlightedText={highlightedText}
                  handleSendMessage={(message) => {
                    if (handleSendMessageRef.current) {
                      handleSendMessageRef.current(message);
                    }
                  }}
                  canvasMessage={canvasMessage}
                  shimmerTextboxIndices={shimmerTextboxIndices}
                  fadeInTextboxIndices={fadeInTextboxIndices}
                  handleMarkAnswer={handleMarkAnswer}
                  isAiChatOpen={isAiChatOpen}
                  floatingMessage={floatingMessage}
                  isAwaitingResponse={isAwaitingResponse}
                  isSolveTogether={isSolveTogether}
                  isOnLastSegment={isOnLastSegment}
                  updateQuestionMarkedForReview={updateQuestionMarkedForReview}
                  socket={socket}
                  socketError={socketError}
                  setSocketError={setSocketError}
                  sessionType={sessionType}
                  subjectId={subjectId}
                  lessonId={lessonId}
                  paperId={paperId}
                  aiDecorations={aiDecorations}
                  setAiDecorations={setAiDecorations}
                  setFloatingMessage={setFloatingMessage}
                  isStepsActive={isStepsActive}
                  setIsStepsActive={setIsStepsActive}
                  isCalculatorOpen={isCalculatorOpen}
                  isAnnotating={isAnnotating}
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
                  updateQuestionDesmosExpressions={
                    updateQuestionDesmosExpressions
                  }
                  isQuestionStemHighlighted={isQuestionStemHighlighted}
                  isQuestionPartHighlighted={isQuestionPartHighlighted}
                  highlightedQuestionPartIndex={highlightedQuestionPartIndex}
                  handleRetryQuestion={handleRetryQuestion}
                  scrollToNextUnansweredQuestion={scrollToNextQuestionRef}
                  registerDesmosRef={registerDesmosRef}
                  onStrokeAdded={onStrokeAdded}
                  onStrokeRemoved={onStrokeRemoved}
                  onEraseAction={onEraseAction}
                  getIsQuestionReadOnly={getIsQuestionReadOnly}
                  mathCanvasMode={mathCanvasMode}
                  pages={pages}
                />
                <div className="overflow-hidden top-0 left-0 right-0 bottom-0 z-[10000] w-full h-full absolute pointer-events-none">
                  <ShimmerEffect isVisible={isAwaitingResponse || isMarking} />
                </div>
              </>
            )}
          </>
        )}
        {page.type === QuestionSessionPageType.Review && (
          <ReviewPage
            pages={pages}
            handleSetCurrentPageIndex={handleSetCurrentPageIndex}
            sessionTitle={sessionTitle}
            sessionSubtitle={sessionSubtitle}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    );
  }
);

PageRenderer.displayName = "PageRenderer";

export default PageRenderer;
