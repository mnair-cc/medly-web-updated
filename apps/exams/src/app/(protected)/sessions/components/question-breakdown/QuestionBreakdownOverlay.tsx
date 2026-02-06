import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { useMarking } from "@/app/_hooks/useMarking";
import { useInactivityTrigger } from "@/app/_hooks/useInactivityTrigger";
import { SessionType } from "../../types";
import { Socket } from "socket.io-client";
import StepRouter from "./StepRouter";
import { Decoration, DecorationType, QuestionWithMarkingResult, StrategyStep } from "@/app/types/types";
import { QuestionTextRenderer } from "../question-components/QuestionTextRenderer";
import LoadingScreen from "@/app/_components/LoadingScreen";
import CloseIcon from "@/app/_components/icons/CloseIcon";

interface QuestionBreakdownOverlayProps {
  question: QuestionWithMarkingResult;
  isActive: boolean;
  onNext: () => void;
  onHideSteps: () => void;
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  sessionType: SessionType;
  subjectId?: string;
  lessonId?: string;
  paperId?: string;
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
}

export default function QuestionBreakdownOverlay({
  question,
  isActive,
  onNext,
  onHideSteps,
  socket,
  socketError,
  setSocketError,
  sessionType,
  subjectId,
  lessonId,
  paperId,
  setAiDecorations,
  setFloatingMessage,
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
}: QuestionBreakdownOverlayProps) {
  // Process strategy steps and add strategy/debrief steps
  const strategySteps = question.strategy?.steps || [];
  const allSteps: StrategyStep[] = [
    // Strategy step (index 0)
    {
      index: 0,
      title: "Strategy",
      heading: "Let's solve this question step-by-step!",
      description: "Here's our approach to solving this question",
      questionType: "strategy",
      options: [],
      correctAnswer: "strategy",
      maxMark: 0,
      legacyId: `${question.legacyId}_strategy`,
    },
    // Add actual strategy steps with adjusted indices
    ...strategySteps.map((step, index) => ({
      ...step,
      index: index + 1,
      maxMark: step.maxMark || 1,
      legacyId: step.legacyId || `${question.legacyId}_step_${step.index}`,
    })),
    // Debrief step (final step)
    {
      index: strategySteps.length + 1,
      title: "Choose your answer",
      heading: "Great work!",
      description: "You're ready to answer the question.",
      questionType: "debrief",
      options: [],
      correctAnswer: "debrief",
      maxMark: 0,
      legacyId: `${question.legacyId}_debrief`,
    }
  ];

  const steps = allSteps;
  const isLoading = false;
  const isStepsLoadingFinished = true;
  const error = null;
  const breakdownStrategy = strategySteps.map(step => step.title);

  const [stepAnswers, setStepAnswers] = useState<{ [key: string]: any }>({});
  const [desmosExpressions, setDesmosExpressions] = useState<any[]>([]);
  const [persistentDecorations, setPersistentDecorations] = useState<Decoration[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [sortStepTargetLetter, setSortStepTargetLetter] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];
  const isLastStep = currentStepIndex === steps.length;
  const isPenultimateStep = currentStepIndex === steps.length - 1;

  // Reset target letter when step changes
  useEffect(() => {
    setSortStepTargetLetter(null);
  }, [currentStepIndex]);

  // Helper function to update decorations while preserving persistent ones
  const updateDecorations = useCallback((temporaryDecorations: Decoration[]) => {
    const mergedDecorations = [...persistentDecorations, ...temporaryDecorations];
    console.log("mergedDecorations", mergedDecorations);
    setAiDecorations(mergedDecorations);
  }, [persistentDecorations, setAiDecorations]);

  // Auto-update decorations when persistent decorations change
  useEffect(() => {
    const mergedDecorations = [...persistentDecorations];
    setAiDecorations(mergedDecorations);
  }, [persistentDecorations, setAiDecorations]);

  const { handleMarkAnswer, handleCheckWork, isMarking, isMarked, setIsMarked, markingResult } =
    useMarking({
      socket,
      socketError,
      setSocketError,
      sessionType,
      subjectId,
      lessonId,
      paperId,
      markingType: "step",
      onDecorationsUpdate: updateDecorations,
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
          targetComponent: message.targetComponent || "",
        });
      },
    });

  // Function to reset all local state
  const resetOverlayState = useCallback(() => {
    setCurrentStepIndex(0);
    setStepAnswers({});
    setDesmosExpressions([]);
    setPersistentDecorations([]);
    setRetryCount(0);
    setSortStepTargetLetter(null);
    setIsMarked(false);
    setAiDecorations([]);
    setFloatingMessage(undefined);

    // Reset scroll position to first step
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: 0,
        behavior: "instant",
      });
    }
  }, [setIsMarked, setAiDecorations, setFloatingMessage]);

  // Reset local state when question changes
  useEffect(() => {
    resetOverlayState();
  }, [question.legacyId, resetOverlayState]);

  // Handle close with state reset
  const handleClose = useCallback(() => {
    resetOverlayState();
    onHideSteps();
  }, [resetOverlayState, onHideSteps]);

  // Keyboard inactivity trigger
  const handleInactivity = useCallback(() => {
    // console.log('🔇 Keyboard inactivity detected after 500ms - could trigger AI analysis here');
    // // Get fresh values from refs to avoid stale closure issues
    // const currentStep = steps[currentStepIndex];
    // const currentExpressions = desmosExpressions;
    // if (currentStep && (currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step")) {
    //   console.log('triggering check work for currentStep', currentStep)
    //   triggerCheckWork(currentStep, currentExpressions)
    // }
  }, [desmosExpressions, steps, currentStepIndex]); // Add dependencies

  const { isLoading: isInactivityLoading, trigger: triggerInactivity, reset: resetInactivityTimer } = useInactivityTrigger({
    callback: handleInactivity,
    delay: 1000,
    enabled: true
  });

  // Reset marking state when step changes
  useEffect(() => {
    setIsMarked(false);
  }, [currentStepIndex, setIsMarked]);

  // Update breakdown footer props when component becomes active/inactive
  useEffect(() => {
    if (isActive) {
      // Set initial breakdown props when becoming active
      setBreakdownButtonText(getButtonText());
      setBreakdownButtonState(getButtonState());
      setBreakdownIsDisabled(isButtonDisabled());
      setBreakdownOnClick(() => handleButtonClick);
      setBreakdownIsMarked(isMarked);
      setBreakdownUserMark(markingResult?.userMark || 0);
      setBreakdownMaxMark(currentStep?.maxMark || 1);
      setBreakdownIsMarking(isMarking);
    } else {
      // Clear breakdown props when becoming inactive
      setBreakdownButtonText(undefined);
      setBreakdownButtonState(undefined);
      setBreakdownIsDisabled(undefined);
      setBreakdownOnClick(undefined);
      setBreakdownIsMarked(undefined);
      setBreakdownUserMark(undefined);
      setBreakdownMaxMark(undefined);
      setBreakdownIsMarking(undefined);
    }
  }, [
    isActive,
    currentStepIndex,
    isMarked,
    isMarking,
    markingResult?.userMark,
    currentStep?.maxMark,
    stepAnswers,
    desmosExpressions,
    retryCount,
    isStepsLoadingFinished,
    setBreakdownButtonText,
    setBreakdownButtonState,
    setBreakdownIsDisabled,
    setBreakdownOnClick,
    setBreakdownIsMarked,
    setBreakdownUserMark,
    setBreakdownMaxMark,
    setBreakdownIsMarking,
  ]);

  const updateStepAnswer = (stepId: string, answer: any) => {
    setStepAnswers((prev) => ({ ...prev, [stepId]: answer }));
  };

  const doesExpressionsContainStrings = (
    searchStrings: string[],
    expressions: any[]
  ): boolean => {
    if (!searchStrings || searchStrings.length === 0) return false;

    return searchStrings.every((searchString) => {
      // Normalize search string: remove spaces and convert to LaTeX format
      const normalizedSearch = searchString
        .replace(/\s+/g, "") // Remove all spaces
        .replace(/\(/g, "\\left(") // Convert ( to \left(
        .replace(/\)/g, "\\right)"); // Convert ) to \right)

      return expressions.some((expr) => {
        if (!expr.latex) return false;
        const normalizedLatex = expr.latex.replace(/\s+/g, ""); // Remove all spaces
        return normalizedLatex.includes(normalizedSearch);
      });
    });
  };

  const handleExpressionsChange = useCallback(
    (expressions: any[]) => {
      if (
        isMarked &&
        markingResult?.userMark !== (currentStep?.maxMark || 1)
      ) {
        setIsMarked(false);
      }
      // console.log("expressions_qb_updated", expressions);
      // console.log("current_step_index_updated", currentStepIndex);

      // Filter expressions to only include objects with type and either columns or latex
      const filteredExpressions = expressions
        .filter((expr) => {
          if (!expr || typeof expr !== "object" || !expr.type) return false;
          // Include if it has columns (table) or latex (expression)
          return expr.columns !== undefined || expr.latex !== undefined;
        })
        .map((expr) => {
          // For tables, keep type and columns
          if (expr.columns !== undefined) {
            return {
              type: expr.type,
              columns: expr.columns,
            };
          }
          // For expressions, keep type and latex
          if (expr.latex !== undefined) {
            return {
              type: expr.type,
              latex: expr.latex,
            };
          }
          return expr;
        });

      // console.log("filtered_expressions", filteredExpressions);
      setDesmosExpressions(filteredExpressions);

      // Reset the inactivity timer since expressions changed
      resetInactivityTimer();

      // Get the current step fresh from state to avoid stale closure
      const currentStepFromState = steps[currentStepIndex];
      if (!currentStepFromState) return;

      // Check for success string in desmos steps
      const successStrings = Array.isArray(currentStepFromState.success_string)
        ? currentStepFromState.success_string
        : currentStepFromState.success_string
          ? [currentStepFromState.success_string]
          : [];

      const containsSuccessTarget = doesExpressionsContainStrings(
        successStrings,
        filteredExpressions
      );
      if (containsSuccessTarget && !isMarked) {
        const markingContext = {
          questionLegacyId: currentStepFromState.legacyId || `step-${currentStepFromState.index}`,
          question:
            question.questionText +
            "\n\n" +
            "Current step: " +
            currentStepFromState.heading,
          correctAnswer: JSON.stringify(currentStepFromState.sub_steps || []),
          markMax: currentStepFromState.maxMark || 1,
          userAnswer: "",
          canvas: {
            paths: [],
            textboxes: [],
            maths: filteredExpressions.map((expr) => ({
              latex: expr.latex || "",
              x: 0,
              y: 0,
              fontSize: 14,
              color: "#000000",
            })),
          },
          questionType: "automark_desmos",
          retryCount: retryCount,
          subLessonId: question.subLessonId
        };
        setFloatingMessage(undefined);
        updateDecorations([]);
        handleMarkAnswer(markingContext);
      }
    },
    [
      currentStepIndex,
      steps,
      isMarked,
      question.questionText,
      handleMarkAnswer,
      setDesmosExpressions,
      resetInactivityTimer,
    ]
  );

  const handleStepNext = () => {
    setIsAnimating(true)
    // Store values for use in setTimeout to avoid stale closures
    const nextStepIndex = currentStepIndex + 1;
    const nextStep = steps[nextStepIndex];
    const shouldAddSummaryDecoration = currentStep.questionType === "short_answer" &&
      (currentStep.heading?.toLowerCase().includes('summar') || currentStep.title?.toLowerCase().includes('summar'));
    const summaryDecoration = shouldAddSummaryDecoration ? (() => {
      const userAnswer = stepAnswers[currentStep.legacyId || `step-${currentStep.index}`];
      if (userAnswer && currentStep.summary_center) {
        return {
          type: DecorationType.SUMMARY,
          text: currentStep.summary_center,
          summary: userAnswer,
        };
      }
      return null;
    })() : null;

    // Reset marking state immediately to avoid showing correct state during transition
    setIsMarked(false);

    // Handle decorations
    if (summaryDecoration) {
      setPersistentDecorations(prev => [...prev, summaryDecoration]);
    } else {
      updateDecorations([]);
      setFloatingMessage(undefined);
    }

    // Reset retry counter for next step
    setRetryCount(0);

    // Update step index
    setCurrentStepIndex(nextStepIndex);

    // Scroll to the next step
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.offsetWidth;
        scrollContainerRef.current.scrollTo({
          left: containerWidth * nextStepIndex,
          behavior: "smooth",
        });
      }
    }, 100)

    // Check if the new step is a desmos/math step and call handleCheckWork
    if (nextStep && (nextStep.questionType === "solve_with_desmos" || nextStep.questionType === "math_step")) {
      // Use setTimeout to allow state update to complete
      setTimeout(() => triggerCheckWork(nextStep, desmosExpressions), 100);
    }
    setTimeout(() => {
      setIsAnimating(false)
    }, 800)
  };

  const triggerCheckWork = (newStep: StrategyStep, expressions?: any[]) => {
    // console.log('getting desmos feedback for new step')
    // Use provided expressions or fall back to state (for backward compatibility)
    const currentExpressions = expressions || desmosExpressions;

    const markingContext = {
      questionLegacyId: currentStep.legacyId || `step-${currentStep.index}`,
      question:
        currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
          ? question.questionText +
          "\n\n" +
          "Current step: " +
          currentStep.heading
          : "Passage: " +
          question.questionStem +
          question.questionText +
          "\n\n" +
          "Current working step goal: " +
          currentStep.heading,
      correctAnswer:
        currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
          ? "Sub Steps: " + JSON.stringify(currentStep.sub_steps || []) + "\n Success String for current working step goal: " + JSON.stringify(currentStep.success_string || [])
          : currentStep.correctAnswer,
      markMax: currentStep.maxMark || 1,
      userAnswer: "",
      canvas:
        currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
          ? {
            paths: [],
            textboxes: [],
            maths: currentExpressions.map((expr) => ({
              latex: expr.latex || "",
              x: 0,
              y: 0,
              fontSize: 14,
              color: "#000000",
            })),
          }
          : undefined,
      questionType: currentStep.questionType,
      subLessonId: question.subLessonId
    };
    // console.log('markingContext', markingContext)
    // Use setTimeout to ensure state update completes first
    setTimeout(() => handleCheckWork(markingContext), 100);
  }

  // Helper function to get option letter (A, B, C, etc.)
  const getOptionLetter = (index: number) => {
    return String.fromCharCode(64 + index); // A, B, C, D...
  };

  // Helper function to process heading for sort steps
  const processHeadingForSortStep = (step: StrategyStep) => {
    if (step.questionType !== "sort" || !step.heading.includes("this answer choice")) {
      // For non-sort steps or sort steps without replacement, render as markdown
      return (
        <ReactMarkdown
          className="inline"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            p: ({ children }) => <>{children}</>,
            strong: ({ children }) => <strong className="font-rounded-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {step.heading}
        </ReactMarkdown>
      );
    }

    let replacementElement: React.ReactNode;

    if (sortStepTargetLetter === null) {
      replacementElement = "each answer choice";
    } else {
      replacementElement = (
        <>
          {" "}option{" "}
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F2F2F7] font-rounded-heavy text-[18px] mx-1">
            {sortStepTargetLetter}
          </span>
        </>
      );
    }

    // Split the heading by 'this answer choice' and replace with styled element
    const parts = step.heading.split('this answer choice');
    if (parts.length === 1) {
      return (
        <ReactMarkdown
          className="inline"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            p: ({ children }) => <>{children}</>,
            strong: ({ children }) => <strong className="font-rounded-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {step.heading}
        </ReactMarkdown>
      );
    }

    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <ReactMarkdown
              className="inline"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                p: ({ children }) => <>{children}</>,
                strong: ({ children }) => <strong className="font-rounded-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {part}
            </ReactMarkdown>
            {index < parts.length - 1 && replacementElement}
          </React.Fragment>
        ))}
      </>
    );
  };

  const handleButtonClick = () => {
    // Handle strategy step - just proceed to next step
    if (currentStep.questionType === "strategy") {
      handleStepNext();
      return;
    }

    // Handle debrief step - hide overlay and return to question
    if (currentStep.questionType === "debrief") {
      handleClose();
      return;
    }

    if (!isMarked) {
      // First check - mark the answer
      const userAnswer = stepAnswers[currentStep.legacyId || `step-${currentStep.index}`];
      if (isButtonDisabled()) return;

      // For sort questions, use correct_answer_mapping instead of correctAnswer
      const correctAnswer =
        currentStep.questionType === "sort"
          ? JSON.stringify(currentStep.correct_answer_mapping || {})
          : currentStep.correctAnswer;

      const markingContext = {
        questionLegacyId: currentStep.legacyId || `step-${currentStep.index}`,
        question:
          currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
            ? question.questionText +
            "\n\n" +
            "Current step: " +
            currentStep.heading
            : "Passage: " +
            question.questionStem +
            question.questionText +
            "\n\n" +
            "Current step. Important, do not use desmos for this step: " +
            currentStep.heading,
        correctAnswer:
          currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
            ? "Sub Steps: " + JSON.stringify(currentStep.sub_steps || []) + "\n Success String for current working step goal: " + JSON.stringify(currentStep.success_string || [])
            : correctAnswer,
        markMax: currentStep.maxMark || 1,
        userAnswer: userAnswer,
        canvas:
          currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step"
            ? {
              paths: [],
              textboxes: [],
              maths: desmosExpressions.map((expr) => ({
                latex: expr.latex || "",
                x: 0,
                y: 0,
                fontSize: 14,
                color: "#000000",
              })),
            }
            : undefined,
        questionType: currentStep.questionType,
        subLessonId: question.subLessonId
      };
      // console.log('marking answer', markingContext)
      handleMarkAnswer(markingContext, true);
    } else if (
      markingResult &&
      markingResult.userMark !== (currentStep.maxMark || 1)
    ) {
      // Incorrect answer - retry
      setIsMarked(false);
      setRetryCount(prev => prev + 1);
    } else {
      // Correct answer - proceed to next step or question
      if (steps.length > currentStepIndex + 1) {
        handleStepNext();
      } else {
        setPersistentDecorations([]);
        setAiDecorations([]);
        onNext();
      }
    }
  };

  const getButtonText = () => {
    // Handle strategy step
    if (currentStep.questionType === "strategy") {
      if (steps.length > currentStepIndex + 1) {
        return "I'm Ready!";
      } else {
        return "Loading...";
      }
    }

    // Handle debrief step
    if (currentStep.questionType === "debrief") {
      return "Answer Question";
    }

    if (!isMarked) {
      return "Check Step";
    } else if (
      markingResult &&
      markingResult.userMark !== (currentStep.maxMark || 1)
    ) {
      return "Try Again";
    } else {
      if (isStepsLoadingFinished) {
        return "Next Step";
      } else {
        if (steps.length > currentStepIndex + 1) {
          return "Next Step";
        } else {
          return "Loading...";
        }
      }
    }
  };

  const getButtonState = (): "filled" | "greyed" | undefined => {
    const isDisabled = isButtonDisabled();
    return isDisabled ? "filled" : "filled";
  };

  const isButtonDisabled = () => {
    if (currentStep.questionType === "strategy") {
      if (steps.length <= currentStepIndex + 1) {
        return true;
      } else {
        return false;
      }
    }

    if (currentStep.questionType === "debrief") {
      return false;
    }

    const userAnswer = stepAnswers[currentStep.legacyId || `step-${currentStep.index}`];

    if (currentStep.questionType === "solve_with_desmos" || currentStep.questionType === "math_step") {
      return false;
    }

    // No answer provided
    if (!userAnswer) return true;

    // Currently marking
    if (isMarking) return true;

    // Next step is not loaded
    if (
      !isStepsLoadingFinished &&
      isMarked &&
      markingResult &&
      markingResult.userMark == (currentStep.maxMark || 1) &&
      steps.length <= currentStepIndex + 1
    ) {
      return true;
    }

    // For sort questions, check if all options are placed
    if (currentStep.questionType === "sort") {
      const sortAnswer = userAnswer as Record<string, string[]>;
      const totalAssigned = Object.values(sortAnswer).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      const totalOptions = Array.isArray(currentStep.options) ? currentStep.options.length : 0;
      return totalAssigned !== totalOptions;
    }

    // For text-based questions, check if answer is not empty
    if (typeof userAnswer === "string") {
      return !userAnswer.trim();
    }

    return false;
  };

  // Helper function to render a single step
  const renderStep = (
    step: StrategyStep,
    stepIndex: number
  ) => {
    if (!step) return null;

    const isCurrentStep = stepIndex === currentStepIndex;

    return (
      <div
        key={step.legacyId || `step-${stepIndex}`}
        className="min-w-full flex flex-col md:h-full"
        data-step-status={isCurrentStep ? "current" : "inactive"}
        data-step-index={stepIndex}
      >
        {/* Step Header */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step.index > 0 && (
                <div className="flex-1">
                  <div className="h-5 w-5 bg-[#05B0FF] rounded-full flex items-center justify-center text-white text-[12px] font-rounded-heavy">
                    {step.index}
                  </div>
                </div>
              )}
              <h2 className="text-[17px] font-rounded-bold text-[#05B0FF]">
                {step.title}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute -top-2 right-0 p-0 bg-[#F2F2F7] md:bg-transparent rounded-full hidden md:block"
          >
            <CloseIcon />
          </button>
          <div className="mt-2">
            <h3 className="text-[22px] leading-tight font-medium font-rounded-bold">
              {processHeadingForSortStep(step)}
            </h3>
            {step.questionType === "debrief" && (
              <p className="text-[15px] text-gray-600 mt-1">
                {step.description}
              </p>
            )}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 mt-5 overflow-y-auto">
          <StepRouter
            questionContext={question}
            step={step}
            userAnswer={stepAnswers[step.legacyId || `step-${step.index}`]}
            updateAnswer={updateStepAnswer}
            isMarking={isCurrentStep ? isMarking : false}
            isMarked={isCurrentStep ? isMarked : false}
            markingResult={isCurrentStep ? markingResult : null}
            breakdownStrategy={breakdownStrategy}
            onExpressionsChange={
              isCurrentStep ? handleExpressionsChange : () => { }
            }
            setIsMarked={isCurrentStep ? setIsMarked : () => { }}
            allStrategySteps={steps}
            currentStepIndex={stepIndex}
            onTargetLetterChange={isCurrentStep ? setSortStepTargetLetter : undefined}
          />
        </div>
      </div>
    );
  };

  if (!isActive) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="absolute inset-0 z-[50] bg-white overflow-hidden -mt-16">
        <LoadingScreen
          hideLoadingBar={true}
          loadingText="Crafting question strategy"
          factText=" "
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="absolute inset-0 z-[50] bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // No steps available
  if (!steps || steps.length === 0) {
    return (
      <div className="absolute inset-0 z-[50] bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No breakdown steps available</p>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="z-[1001] overflow-hidden h-full bg-white">
      {/* Horizontal scrollable container */}
      <div
        ref={scrollContainerRef}
        className={`flex md:h-full snap-x snap-mandatory scrollbar-hide ${isAnimating ? "overflow-x-scroll" : "overflow-x-hidden"}`}
        style={{
          scrollSnapType: "x mandatory",
          touchAction: "pan-y pinch-zoom", // Only allow vertical pan and pinch zoom, no horizontal
          overscrollBehaviorX: "none", // Prevent horizontal overscroll
        }}
      >
        {/* Render all steps */}
        {steps.map((step, index) => (
          <div key={step.legacyId || `step-${index}`} className="flex-shrink-0 w-full md:h-full flex flex-col px-5 md:py-5 md:px-10 gap-2 snap-start">
            {renderStep(step, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

