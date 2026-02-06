import { TranscriptionChunk } from "@/app/(protected)/open/_hooks/useTranscription";
import SketchToolbar from "@/app/(protected)/sessions/components/footer/SketchToolbar";
import SketchToolbarTutorialTooltip from "@/app/(protected)/sessions/components/footer/SketchToolbarTutorialTooltip";
import {
  InputMode,
  MockPage,
  QuestionSessionPageType,
  SessionType,
} from "@/app/(protected)/sessions/types";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import Tooltip from "@/app/_components/Tooltip";
import { useResponsive } from "@/app/_hooks/useResponsive";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import {
  QuestionDifficulty,
  QuestionGroup,
  QuestionWithMarkingResult,
} from "@/app/types/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TranscriptionToolbar from "./TranscriptionToolbar";

const ToggleShowInsertButton = ({
  insertType,
  isInsertVisible,
  setIsInsertVisible,
}: {
  insertType: "text" | "periodic_table";
  isInsertVisible: boolean;
  setIsInsertVisible: (isInsertVisible: boolean) => void;
}) => {
  const displayText =
    insertType === "periodic_table" ? "Periodic Table" : "Insert";
  const buttonText = `${isInsertVisible ? "Hide" : "Show"} ${displayText}`;
  return (
    <PrimaryButtonClicky
      buttonText={buttonText}
      buttonState={undefined}
      onPress={() => setIsInsertVisible(!isInsertVisible)}
      disabled={false}
      showKeyboardShortcut={false}
      isLong={true}
    />
  );
};

const PreviousPageButton = ({ onPress }: { onPress: () => void }) => (
  <PrimaryButtonClicky
    buttonText="Previous"
    onPress={onPress}
    showKeyboardShortcut={false}
    isLong={true}
  />
);

const StartSessionButton = ({
  onPress,
  isStartingSession,
  isReadOnly,
  sessionType,
}: {
  onPress: () => void;
  isStartingSession: boolean;
  isReadOnly: boolean;
  sessionType: SessionType;
}) => (
  <PrimaryButtonClicky
    buttonText={`Start ${sessionType === SessionType.PaperSession
        ? "exam"
        : sessionType === SessionType.MockSession
          ? "Paper"
          : "session"
      }`}
    onPress={onPress}
    buttonState={isReadOnly ? "greyed" : "filled"}
    isLoading={isStartingSession}
    disabled={isStartingSession || isReadOnly}
    isLong={true}
    showKeyboardShortcut={false}
  />
);

const MarkAnswerButton = ({
  buttonState,
  onPress,
  disabled,
  isMarking,
}: {
  buttonState: "filled" | "greyed" | undefined;
  onPress: () => void;
  disabled: boolean;
  isMarking: boolean;
}) => (
  <PrimaryButtonClicky
    buttonText="Mark answer"
    onPress={onPress}
    buttonState={buttonState}
    showKeyboardShortcut={false}
    disabled={disabled}
    isLoading={isMarking}
    isLong={true}
  />
);

const SolveTogetherButton = ({
  title,
  buttonState,
  onPress,
  disabled,
  isLoading,
}: {
  title: string;
  buttonState: "filled" | "greyed" | undefined;
  onPress: () => void;
  disabled: boolean;
  isLoading: boolean;
}) => (
  <PrimaryButtonClicky
    buttonText={title}
    onPress={onPress}
    buttonState={buttonState}
    disabled={disabled}
    isLoading={isLoading}
    showKeyboardShortcut={false}
    isLong={true}
    doesStretch={true}
  />
);

const NextPageButton = ({
  onPress,
  isLoading,
  sessionType,
}: {
  onPress: () => void;
  isLoading: boolean;
  sessionType?: SessionType;
}) => (
  <PrimaryButtonClicky
    buttonText={
      sessionType === SessionType.MockSession ? "Next" : "Next question"
    }
    onPress={onPress}
    buttonState={"filled"}
    isLoading={isLoading}
    showKeyboardShortcut={false}
    isLong={true}
  />
);

const NextPartButton = ({ onPress }: { onPress: () => void }) => (
  <PrimaryButtonClicky
    buttonText="Next part"
    onPress={onPress}
    buttonState={"filled"}
    showKeyboardShortcut={false}
    isLong={true}
  />
);

const FinishSessionButton = ({
  onPress,
  isReadOnly,
  sessionType,
  nextLesson,
}: {
  onPress: () => void;
  isReadOnly: boolean;
  sessionType: SessionType;
  nextLesson?: { legacyId: string; title: string } | null;
}) => (
  <PrimaryButtonClicky
    buttonText={
      sessionType === SessionType.PaperSession
        ? "Next"
        : sessionType === SessionType.MockSession
          ? "Finish Paper"
          : sessionType === SessionType.LessonSession && nextLesson
            ? `Next lesson`
            : "Finish session"
    }
    onPress={onPress}
    buttonState={isReadOnly ? "greyed" : "filled"}
    disabled={isReadOnly}
    isLong={true}
    showKeyboardShortcut={false}
  />
);

const Footer = ({
  hasStarted,
  pages,
  questionGroup,
  currentPageIndex,
  handlePreviousPage,
  handleNextPage,
  handleStartSession,
  handleMarkAnswer,
  handleSolveTogether,
  handleGetFeedback,
  handleRetry,
  setIsPostPracticeModalOpen,
  isInsertVisible,
  setIsInsertVisible,
  hasInsert,
  insertType,
  inputMode,
  setInputMode,
  isStartingSession,
  isReadOnly,
  sessionType,
  currentQuestionWithMarkingResult,
  isMarking,
  isFetchingNextQuestion,

  isSolveTogether,
  handleFinishSession,
  setIsExitConfirmationModalOpen,
  isStepsActive,
  isCalculatorOpen,
  // Breakdown mode props (optional)
  breakdownButtonText,
  breakdownButtonState,
  breakdownIsDisabled,
  breakdownOnClick,
  breakdownIsMarked,
  breakdownUserMark,

  breakdownIsMarking,
  showTooltip,
  handleDismiss,
  showWhyTooltip,
  handleDismissWhy,
  setIsSolveTogether,
  nextLesson,
  scrollToNextQuestionRef,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearAll,
  hasRetriedQuestions,
  retriedQuestions,
  setIsCanvasTutorialOpen,
  isSidebarOpen,
  isAwaitingResponse,
  mathCanvasMode,
  setMathCanvasMode,
  onTranscriptionChange,
  initialTranscription,
  pageType,
  isDocumentLandscape = true,
}: {
  hasStarted: boolean;
  pages: MockPage[];
  questionGroup: QuestionGroup;
  currentPageIndex: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  handleStartSession: () => void;
  handleMarkAnswer?: () => void;
  handleSolveTogether: () => void;
  handleGetFeedback: () => void;
  handleRetry: () => void;
  setIsPostPracticeModalOpen: (isPostPracticeModalOpen: boolean) => void;
  isInsertVisible: boolean;
  setIsInsertVisible: (isInsertVisible: boolean) => void;
  hasInsert: boolean;
  insertType: "text" | "periodic_table" | null;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  isStartingSession: boolean;
  isReadOnly: boolean;
  sessionType: SessionType;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult | null;
  isMarking: boolean;
  isFetchingNextQuestion: boolean;
  isSolveTogether: boolean;
  handleFinishSession: () => void;
  setIsExitConfirmationModalOpen?: (isOpen: boolean) => void;
  isStepsActive: boolean;
  isCalculatorOpen: boolean;
  // Breakdown mode props (optional)
  breakdownButtonText?: string;
  breakdownButtonState?: "filled" | "greyed" | undefined;
  breakdownIsDisabled?: boolean;
  breakdownOnClick?: () => void;
  breakdownIsMarked?: boolean;
  breakdownUserMark?: number;
  breakdownIsMarking?: boolean;
  showTooltip: boolean;
  handleDismiss: () => void;
  showWhyTooltip: boolean;
  handleDismissWhy: () => void;
  setIsSolveTogether: (isSolveTogether: boolean) => void;
  nextLesson?: { legacyId: string; title: string } | null;
  scrollToNextQuestionRef: React.MutableRefObject<(() => void) | null>;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClearAll?: () => void;
  hasRetriedQuestions?: boolean;
  retriedQuestions?: Set<string>;
  setIsCanvasTutorialOpen: (isCanvasTutorialOpen: boolean) => void;
  isSidebarOpen: boolean;
  isAwaitingResponse: boolean;
  mathCanvasMode: "drawing" | "textbox";
  setMathCanvasMode: (mode: "drawing" | "textbox") => void;
  onTranscriptionChange?: (
    currentText: string,
    transcriptHistory: string[],
    isRecording?: boolean,
  ) => void;
  initialTranscription?: string;
  pageType: QuestionSessionPageType;
  isDocumentLandscape?: boolean;
}) => {
  const router = useRouter();

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [justScrolledToNextPart, setJustScrolledToNextPart] = useState(false);

  const prevIsMarkedRef = useRef<boolean>(false);
  const { track } = useTracking();
  const { isWideScreen, isTouchScreen } = useResponsive();

  // Memoize encouragement text based on question ID and difficulty to prevent flickering
  const encouragementText = useMemo(() => {
    const difficulty =
      currentQuestionWithMarkingResult?.difficulty || QuestionDifficulty.EASY;
    const encouragements = {
      [QuestionDifficulty.EASY]: ["Good!", "Correct!", "Nice!"],
      [QuestionDifficulty.MEDIUM]: ["Great!", "Awesome!", "Well done!"],
      [QuestionDifficulty.HARD]: ["Amazing!", "Excellent!", "Outstanding!"],
    };

    const difficultyEncouragements = encouragements[difficulty];
    return difficultyEncouragements[
      Math.floor(Math.random() * difficultyEncouragements.length)
    ];
  }, [currentQuestionWithMarkingResult?.difficulty]);

  // Calculate isMarked and other derived values first
  const questions = (questionGroup.questions ||
    []) as QuestionWithMarkingResult[];
  const isAllCorrect = questions.every(
    (question) =>
      question.userMark !== undefined && question.userMark === question.maxMark,
  );
  const isAllIncorrect = questions.every(
    (question) => question.userMark === undefined || question.userMark === 0,
  );
  const totalMarks = questions.reduce(
    (acc, question) => acc + question.maxMark,
    0,
  );
  const totalUserMarks = questions.reduce(
    (acc, question) => acc + (question.userMark || 0),
    0,
  );
  const isMarked =
    pages[currentPageIndex].type === QuestionSessionPageType.Question &&
    !isMarking &&
    questions.every((question) => question.userMark !== undefined);

  // Check if there are questions with attempted answers but not yet marked
  const hasAttemptedQuestions = questions.some((question) => {
    // For mock sessions, only check retried questions
    if (sessionType === SessionType.MockSession && retriedQuestions) {
      if (!retriedQuestions.has(question.legacyId)) {
        return false;
      }
    }

    return (
      question.userMark === undefined &&
      ((question.canvas &&
        question.canvas.textboxes &&
        question.canvas.textboxes.length > 0 &&
        question.canvas.textboxes.some(
          (textbox) => textbox.text.trim().length > 0,
        )) ||
        (question.userAnswer && question.userAnswer !== "") ||
        (question.desmosExpressions && question.desmosExpressions.length > 0))
    );
  });

  // Check if some questions are marked and there are unmarked ones (mobile flow)
  const hasMarkedQuestions = questions.some(
    (question) => question.userMark !== undefined,
  );
  const hasUnmarkedQuestions = questions.some(
    (question) => question.userMark === undefined,
  );
  const shouldShowNextPart =
    !isWideScreen &&
    !isMarking &&
    hasMarkedQuestions &&
    hasUnmarkedQuestions &&
    !justScrolledToNextPart;

  // Track when marking changes from false to true to trigger animation and set encouragement text
  useEffect(() => {
    const currentIsMarked = isMarked;
    const currentBreakdownIsMarked = breakdownIsMarked || false;

    // Check if either regular marking or breakdown marking changed from false to true
    const markingJustCompleted =
      (!prevIsMarkedRef.current && currentIsMarked) ||
      (!prevIsMarkedRef.current && currentBreakdownIsMarked);

    if (markingJustCompleted) {
      setShouldAnimate(true);
      // Reset animation state after animation completes
      setTimeout(() => setShouldAnimate(false), 550);
    }

    // Update ref to track either type of marking
    prevIsMarkedRef.current = currentIsMarked || currentBreakdownIsMarked;
  }, [isMarking, breakdownIsMarked, isMarked]);

  const canToggleInsert =
    sessionType === SessionType.MockSession &&
    pages &&
    pages.length > 0 &&
    pages[0]?.type === QuestionSessionPageType.Cover &&
    pages[0]?.content &&
    typeof pages[0].content === "object" &&
    "subject" in pages[0].content &&
    typeof pages[0].content.subject === "string" &&
    pages[0].content.subject.includes("Language");

  const canStartSession = !hasStarted && handleStartSession;

  const canMoveToNextPage =
    hasStarted &&
    currentPageIndex < pages.length - 1 &&
    // For mock sessions, allow free navigation once started
    (sessionType === SessionType.MockSession ||
      // For paper sessions, require marking
      ((sessionType === SessionType.PaperSession ||
        sessionType === SessionType.PracticeSession ||
        sessionType === SessionType.LessonSession) &&
        isMarked));

  const canMoveToPreviousPage = hasStarted && currentPageIndex > 0;

  const canMarkAnswer =
    (sessionType === SessionType.PracticeSession ||
      sessionType === SessionType.LessonSession ||
      sessionType === SessionType.PaperSession ||
      (sessionType === SessionType.MockSession && hasRetriedQuestions)) &&
    handleMarkAnswer &&
    questionGroup.questions &&
    Array.isArray(questionGroup.questions) &&
    (questionGroup.questions as QuestionWithMarkingResult[]).some(
      (question) => {
        // For mock sessions, only check retried questions
        if (sessionType === SessionType.MockSession && retriedQuestions) {
          if (!retriedQuestions.has(question.legacyId)) {
            return false;
          }
        }

        return (
          question.userMark === undefined &&
          ((question.canvas &&
            question.canvas.textboxes &&
            question.canvas.textboxes.length > 0 &&
            question.canvas.textboxes.some(
              (textbox) => textbox.text.trim().length > 0,
            )) ||
            (question.userAnswer && question.userAnswer !== "") ||
            (question.desmosExpressions &&
              question.desmosExpressions.length > 0) ||
            (question.canvas &&
              question.canvas.paths &&
              question.canvas.paths.length > 0))
        );
      },
    );
  const canFinishSession =
    currentPageIndex === pages.length - 1 &&
    (sessionType === SessionType.PaperSession ||
      sessionType === SessionType.MockSession ||
      currentQuestionWithMarkingResult?.isMarked ||
      (sessionType === SessionType.LessonSession && nextLesson && isMarked)) &&
    !isReadOnly;

  const handlePressFinishSession = async () => {
    if (sessionType === SessionType.PracticeSession) {
      setIsPostPracticeModalOpen(true);
    } else if (sessionType === SessionType.LessonSession && nextLesson) {
      // Navigate directly to the next lesson practice
      router.push(`/lessons/${nextLesson.legacyId}/practice`);
    } else if (sessionType === SessionType.MockSession) {
      // Show confirmation modal for mock sessions
      setIsExitConfirmationModalOpen?.(true);
    } else {
      handleFinishSession();
    }
  };

  // Don't render footer for textbook pages
  if (pages[currentPageIndex]?.type === QuestionSessionPageType.Textbook) {
    return null;
  }

  // Breakdown mode rendering
  if (isStepsActive && breakdownButtonText && breakdownOnClick) {
    const isCorrect = breakdownIsMarked && (breakdownUserMark || 0) > 0;
    const isIncorrect = breakdownIsMarked && (breakdownUserMark || 0) === 0;

    return (
      <div
        className={`absolute bottom-0 right-0 p-4 pointer-events-none z-[1005]
          ${isCorrect
            ? "bg-[#E4FFB7]/90 backdrop-blur-sm"
            : isIncorrect
              ? "bg-[#FDEEEE]/90 backdrop-blur-sm"
              : "bg-transparent"
          }
          w-full md:w-1/2
          ${shouldAnimate ? "animate-slide-up ease-out duration-300" : ""}
        `}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            {breakdownIsMarked && (
              <div
                className={`px-4 font-rounded-heavy flex items-center gap-3 ${isCorrect ? "text-[#7CC500]" : "text-[#FF4B4C]"
                  }`}
              >
                {isCorrect ? (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="12" fill="#7CC500" />
                    <path
                      d="M11.7565 18.2666C11.437 18.7411 10.9652 19 10.4022 19C9.83913 19 9.39783 18.7699 8.98696 18.281L5.39565 14.1538C5.13696 13.8374 5 13.521 5 13.1759C5 12.4569 5.59348 11.8816 6.35435 11.8816C6.79565 11.8816 7.16087 12.0398 7.52609 12.4856L10.3565 15.865L16.413 6.73341C16.7326 6.24447 17.1435 6 17.6 6C18.3304 6 19 6.47456 19 7.19358C19 7.52434 18.8326 7.86947 18.6196 8.17146L11.7565 18.2666Z"
                      fill="white"
                    />
                  </svg>
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="12" fill="#FF4B4C" />
                    <path
                      d="M7.12584 15.3723C6.80943 15.6888 6.79437 16.2538 7.13337 16.5777C7.45731 16.9167 8.02986 16.9016 8.34626 16.5852L12 12.9315L15.6537 16.5852C15.9777 16.9092 16.5352 16.9167 16.8591 16.5777C17.1981 16.2538 17.1906 15.6888 16.8666 15.3648L13.2129 11.7111L16.8666 8.06487C17.1906 7.7334 17.1981 7.17592 16.8591 6.85198C16.5352 6.51297 15.9777 6.52051 15.6537 6.84445L12 10.4982L8.34626 6.84445C8.02986 6.52804 7.45731 6.51297 7.13337 6.85198C6.79437 7.17592 6.80943 7.74093 7.12584 8.05734L10.7796 11.7111L7.12584 15.3723Z"
                      fill="white"
                    />
                  </svg>
                )}

                {isCorrect ? encouragementText : "Not quite"}
              </div>
            )}
          </div>

          <PrimaryButtonClicky
            buttonText={breakdownButtonText}
            onPress={breakdownOnClick}
            buttonState={breakdownIsMarking ? "filled" : breakdownButtonState}
            showKeyboardShortcut={false}
            disabled={breakdownIsDisabled || false}
            isLoading={breakdownIsMarking || false}
            doesStretch={!isWideScreen && !breakdownIsMarked}
            isLong={isWideScreen || breakdownIsMarked}
          />
        </div>
      </div>
    );
  }

  // Normal mode rendering
  return (
    <div
      className={`flex flex-col justify-center px-4 py-4 z-[1005] min-h-24 absolute ${isDocumentLandscape ? "bottom-[0]" : "bottom-0"} left-0 right-0 w-full pointer-events-none ${shouldAnimate ? "animate-slide-up ease-out duration-300" : ""
        }
        ${((isCalculatorOpen &&
          currentQuestionWithMarkingResult?.subLessonId?.includes("sat1")) ||
          currentQuestionWithMarkingResult?.subLessonId?.includes("sat0")) &&
          sessionType === SessionType.PracticeSession
          ? "md:w-1/2"
          : "md:w-full"
        }
        ${isMarked && isAllCorrect
          ? "bg-[#E4FFB7]/90 backdrop-blur-sm"
          : isMarked && isAllIncorrect
            ? "bg-[#FDEEEE]/90 backdrop-blur-sm"
            : isMarked
              ? "bg-[#FDEBD7]/90 backdrop-blur-sm"
              : "bg-transparent"
        }`}
    // style={{
    //   boxShadow: currentQuestionWithMarkingResult?.isMarked ? "0px -4px 8px 0px rgba(0, 0, 0, 0.05)" : "none"
    // }}
    >
      {!isMarked && isWideScreen && (
        <>
          {/* <div className="absolute bottom-6 flex flex-row">
            <SketchToolbar
              mode={inputMode}
              type={'edit'}
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div> */}

          <SketchToolbarTutorialTooltip
            isVisible={
              !isMarked && isWideScreen && !isSidebarOpen && !isAwaitingResponse
            }
            onClick={() => setIsCanvasTutorialOpen(true)}
          />
          {(pageType === QuestionSessionPageType.Document || pageType === QuestionSessionPageType.Practice) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-row">
              <SketchToolbar
                mode={inputMode}
                type={"toolbar"}
                onSelectMode={() => setInputMode("select")}
                onTextMode={() => setInputMode("text")}
                onMathMode={() => setInputMode("math")}
                onMessageMode={() => setInputMode("message")}
                onPenMode={() => setInputMode("pen")}
                onEraserMode={() => setInputMode("eraser")}
                onGrabMode={() => setInputMode("grab")}
                showTouchTools={true}
                onUndo={onUndo}
                mathCanvasMode={"textbox"}
                onMathCanvasModeChange={setMathCanvasMode}
                hideGrabMode={true}
              />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col md:flex-row justify-between md:items-center">
        <div className={`flex justify-between items-center gap-2`}>
          {canToggleInsert && insertType && (
            <ToggleShowInsertButton
              isInsertVisible={isInsertVisible}
              insertType={insertType}
              setIsInsertVisible={setIsInsertVisible}
            />
          )}

          {isMarked &&
            currentQuestionWithMarkingResult &&
            (isReadOnly ||
              currentQuestionWithMarkingResult.userMark !== undefined) && (
              <div
                className={`px-4 font-rounded-heavy flex items-center gap-3 mb-4 md:mb-0 ${isAllCorrect
                    ? "text-[#7CC500]"
                    : isAllIncorrect
                      ? "text-[#FF4B4C]"
                      : "text-[#FFA935]"
                  }`}
              >
                {totalMarks < 7 && (
                  <div className="flex items-center">
                    {/* Render correct answer icons */}
                    {Array.from({ length: totalUserMarks }, (_, index) => (
                      <svg
                        key={`correct-${index}`}
                        className="mr-[-4px]"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="12" fill="#7CC500" />
                        <path
                          d="M11.7565 18.2666C11.437 18.7411 10.9652 19 10.4022 19C9.83913 19 9.39783 18.7699 8.98696 18.281L5.39565 14.1538C5.13696 13.8374 5 13.521 5 13.1759C5 12.4569 5.59348 11.8816 6.35435 11.8816C6.79565 11.8816 7.16087 12.0398 7.52609 12.4856L10.3565 15.865L16.413 6.73341C16.7326 6.24447 17.1435 6 17.6 6C18.3304 6 19 6.47456 19 7.19358C19 7.52434 18.8326 7.86947 18.6196 8.17146L11.7565 18.2666Z"
                          fill="white"
                        />
                      </svg>
                    ))}

                    {/* Render incorrect answer icons */}
                    {Array.from(
                      { length: totalMarks - totalUserMarks },
                      (_, index) => (
                        <svg
                          key={`incorrect-${index}`}
                          className="ml-[-4px]"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="12" r="12" fill="#FF4B4C" />
                          <path
                            d="M7.12584 15.3723C6.80943 15.6888 6.79437 16.2538 7.13337 16.5777C7.45731 16.9167 8.02986 16.9016 8.34626 16.5852L12 12.9315L15.6537 16.5852C15.9777 16.9092 16.5352 16.9167 16.8591 16.5777C17.1981 16.2538 17.1906 15.6888 16.8666 15.3648L13.2129 11.7111L16.8666 8.06487C17.1906 7.7334 17.1981 7.17592 16.8591 6.85198C16.5352 6.51297 15.9777 6.52051 15.6537 6.84445L12 10.4982L8.34626 6.84445C8.02986 6.52804 7.45731 6.51297 7.13337 6.85198C6.79437 7.17592 6.80943 7.74093 7.12584 8.05734L10.7796 11.7111L7.12584 15.3723Z"
                            fill="white"
                          />
                        </svg>
                      ),
                    )}
                  </div>
                )}

                {currentQuestionWithMarkingResult?.subLessonId?.includes("sat")
                  ? isAllIncorrect
                    ? "Incorrect!"
                    : isAllCorrect
                      ? encouragementText
                      : "Not quite"
                  : "Total: " + totalUserMarks + "/" + totalMarks + " marks"}
              </div>
            )}

          {isMarked && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                className={`flex items-center ml-4 gap-1 font-rounded-bold mb-4 md:mb-0 ${isAllCorrect
                    ? "text-[#7CC500]"
                    : isAllIncorrect
                      ? "text-[#FF4B4C]"
                      : "text-[#FFA935]"
                  }`}
                onClick={handleRetry}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.12988 12.8984C4.12988 13.5049 4.62207 13.9971 5.22852 13.9971C5.84375 13.9971 6.32715 13.5049 6.32715 12.8984V12.3271C6.32715 10.8945 7.31152 9.97168 8.80566 9.97168H15.4062V11.8086C15.4062 12.3359 15.7402 12.6699 16.2764 12.6699C16.5137 12.6699 16.7334 12.582 16.9092 12.4414L20.3721 9.55859C20.8027 9.21582 20.7939 8.63574 20.3721 8.28418L16.9092 5.39258C16.7334 5.24316 16.5137 5.15527 16.2764 5.15527C15.7402 5.15527 15.4062 5.48926 15.4062 6.0166V7.80957H8.98145C6.00195 7.80957 4.12988 9.4707 4.12988 12.1162V12.8984ZM12.5938 15.3066C12.5938 14.7793 12.2598 14.4365 11.7324 14.4365C11.4951 14.4365 11.2666 14.5332 11.0908 14.6738L7.63672 17.5566C7.20605 17.8994 7.20605 18.4707 7.63672 18.8311L11.0908 21.7227C11.2666 21.8721 11.4951 21.96 11.7324 21.96C12.2598 21.96 12.5938 21.626 12.5938 21.0986V19.2969H19.0273C22.0068 19.2969 23.8701 17.627 23.8701 14.9902V14.208C23.8701 13.5928 23.3867 13.1006 22.7715 13.1006C22.165 13.1006 21.6729 13.5928 21.6729 14.208V14.7793C21.6729 16.2031 20.6973 17.1348 19.1943 17.1348H12.5938V15.3066Z"
                    fill={
                      isAllCorrect
                        ? "#7CC500"
                        : isAllIncorrect
                          ? "#FF4B4C"
                          : "#FFA935"
                    }
                  />
                </svg>
                Retry
              </button>

              {/* <button
              className={`flex items-center ml-4 gap-1 font-rounded-bold ${isAllCorrect
                ? "text-[#7CC500]"
                : isAllIncorrect
                  ? "text-[#FF4B4C]"
                  : "text-[#FFA935]"
                }`}
              onClick={() =>
                track("flag_button_click", {
                  question_id: currentQuestionWithMarkingResult?.legacyId,
                })
              }
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.74218 23.1601C6.15234 23.1601 6.48437 22.8379 6.48437 22.4277V16.998C6.72851 16.8906 7.64648 16.539 9.08203 16.539C12.6953 16.539 14.9609 18.3066 18.3984 18.3066C19.9218 18.3066 20.4882 18.1406 21.2304 17.8086C21.9043 17.5058 22.3437 16.998 22.3437 16.0996V6.1875C22.3437 5.66015 21.8945 5.35742 21.3281 5.35742C20.8496 5.35742 19.9511 5.76757 18.2714 5.76757C14.834 5.76757 12.5781 4 8.95507 4C7.43164 4 6.85546 4.16602 6.11328 4.49805C5.43945 4.80078 5 5.30859 5 6.19726V22.4277C5 22.8281 5.3418 23.1601 5.74218 23.1601Z"
                  fill={
                    isAllCorrect
                      ? "#7CC500"
                      : isAllIncorrect
                        ? "#FF4B4C"
                        : "#FFA935"
                  } />
              </svg>
              Flag
            </button> */}
            </div>
          )}
        </div>

        <div
          className={
            pageType === QuestionSessionPageType.Document ? "hidden md:flex md:justify-end w-full md:w-auto" : "hidden"
          }
        >
          <TranscriptionToolbar
            maxLines={3}
            onTranscriptionChange={(
              currentText: string,
              transcriptChunks: TranscriptionChunk[],
              isRecording: boolean,
            ) => {
              // Convert TranscriptionChunk[] to string[] for Footer's callback
              const transcriptHistory = transcriptChunks.map(
                (chunk) => chunk.text,
              );
              if (onTranscriptionChange) {
                onTranscriptionChange(
                  currentText,
                  transcriptHistory,
                  isRecording,
                );
              }
            }}
            initialTranscription={
              initialTranscription
                ? [{ timestamp: Date.now(), text: initialTranscription }]
                : undefined
            }
          />
        </div>

        {false && (
          <div className="w-full md:w-auto md:flex-1 flex flex-col-reverse md:flex-row gap-2 justify-end">
            {sessionType === SessionType.MockSession &&
              canMoveToPreviousPage && (
                <PreviousPageButton onPress={handlePreviousPage} />
              )}

            {sessionType === SessionType.MockSession && canStartSession && (
              <StartSessionButton
                onPress={async () => {
                  await handleStartSession();
                  // Move to next page after starting (skip cover page)
                  if (currentPageIndex < pages.length - 1) {
                    handleNextPage();
                  }
                }}
                isStartingSession={isStartingSession}
                isReadOnly={isReadOnly}
                sessionType={sessionType}
              />
            )}

            {!isWideScreen && (
              <div className="z-[1001] flex justify-center items-center">
                {(sessionType === SessionType.PracticeSession ||
                  sessionType === SessionType.LessonSession) && (
                    <SolveTogetherButton
                      title={
                        !isWideScreen &&
                          currentQuestionWithMarkingResult?.subLessonId?.includes(
                            "sat",
                          )
                          ? "Learn Strategy"
                          : isMarked
                            ? "Why?"
                            : "Solve with Medly"
                      }
                      buttonState={showTooltip ? "filled" : undefined}
                      onPress={() => {
                        if (isMarked) {
                          track("ask_for_feedback_button_click");
                          // if (isWideScreen) {
                          handleGetFeedback?.();
                          // } else {
                          // setIsStepsActive(true);
                          // }
                          handleDismissWhy(); // Dismiss the "Why?" tooltip when clicked
                        } else {
                          track("solve_with_medly_button_click");
                          // if (isWideScreen) {
                          handleSolveTogether?.();
                          // } else {
                          // setIsStepsActive(true);
                          // }
                        }
                        setIsSolveTogether(true);
                        handleDismiss();
                      }}
                      disabled={
                        isWideScreen && isSolveTogether && !showWhyTooltip
                      }
                      isLoading={false}
                    />
                  )}

                {showTooltip && (
                  <div className="absolute bottom-20 animate-fade-in z-[10000] flex justify-center items-center w-full md:w-auto">
                    <Tooltip
                      text="Let's go through the strategy step-by-step!"
                      type="bottom"
                      showClose={false}
                    />
                  </div>
                )}

                {showWhyTooltip &&
                  isWideScreen &&
                  isMarked &&
                  totalUserMarks != null &&
                  totalMarks != null &&
                  totalUserMarks < totalMarks && (
                    <div className="absolute bottom-20 animate-fade-in z-[10000] flex justify-center items-center w-full md:w-auto">
                      <Tooltip
                        text="Let's go through why this is wrong"
                        type="bottom"
                        showClose={false}
                        onClose={() => { }}
                      />
                    </div>
                  )}
              </div>
            )}

            {!isWideScreen ? (
              shouldShowNextPart ? (
                <NextPartButton
                  onPress={() => {
                    track("next_part_button_click");
                    if (scrollToNextQuestionRef.current) {
                      scrollToNextQuestionRef.current();
                      setJustScrolledToNextPart(true);
                    }
                  }}
                />
              ) : canMoveToNextPage ? (
                <NextPageButton
                  onPress={() => {
                    track("next_question_button_click");
                    handleNextPage();
                  }}
                  isLoading={isFetchingNextQuestion}
                  sessionType={sessionType}
                />
              ) : sessionType === SessionType.MockSession &&
                !hasRetriedQuestions ? (
                <div />
              ) : (
                <MarkAnswerButton
                  buttonState={showTooltip ? undefined : "filled"}
                  onPress={() => {
                    track("check_answer_button_click");
                    handleMarkAnswer?.();
                    setJustScrolledToNextPart(false); // Reset the flag when marking
                  }}
                  disabled={!hasAttemptedQuestions}
                  isMarking={isMarking}
                />
              )
            ) : (
              !isMarked &&
              (sessionType !== SessionType.MockSession ||
                hasRetriedQuestions) && (
                <MarkAnswerButton
                  buttonState={showTooltip ? undefined : "filled"}
                  onPress={() => {
                    track("check_answer_button_click");
                    handleMarkAnswer?.();
                  }}
                  disabled={!canMarkAnswer}
                  isMarking={isMarking}
                />
              )
            )}

            {/* {canMoveToNextPage && (
            <GetFeedbackButton
              onPress={() => { handleSolveTogether?.() }}
              disabled={false}
              isLoading={isAwaitingResponse}
            />
          )} */}

            {isWideScreen && canMoveToNextPage && (
              <NextPageButton
                onPress={() => {
                  track("next_question_button_click");
                  handleNextPage();
                }}
                isLoading={isFetchingNextQuestion}
                sessionType={sessionType}
              />
            )}

            {canFinishSession && (
              <FinishSessionButton
                onPress={() => {
                  track("finish_session_button_click");
                  handlePressFinishSession();
                }}
                isReadOnly={isReadOnly}
                sessionType={sessionType}
                nextLesson={nextLesson}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Footer;
