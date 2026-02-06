"use client";

import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";
import TickCircleIcon from "@/app/_components/icons/TickCircleIcon";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import LearnModeSketchCanvas from "../../question-components/canvas/LearnModeSketchCanvas";
import { Canvas, CanvasMessage } from "@/app/types/types";
import "katex/dist/katex.min.css";
import React, {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InputMode, LearnFlowQuestionContent } from "../../../types";
import LearnBlockCard from "./LearnBlockCard";
import LearnBlockFooter from "./LearnBlockFooter";
import LearnExplanationSteps from "./LearnExplanationSteps";
import MemoizedMarkdown from "./MemoizedMarkdown";

interface QuestionBlockProps {
  title: string;
  content: LearnFlowQuestionContent;
  onComplete?: () => void;
  isFinalBlock?: boolean;
  onExplainClick?: (stepIndex: number, stepMath: string) => void;
  lessonId?: string;
  blockKey?: string;
  persistedUserAnswer?:
    | string
    | string[]
    | Record<string, string>
    | Record<string, string[]>;
  onAnswerChange?: (
    userAnswer:
      | string
      | string[]
      | Record<string, string>
      | Record<string, string[]>,
  ) => void;
  inputMode: InputMode;
  setInputMode: (inputMode: InputMode) => void;
  isReadOnly: boolean;
  canvas?: Canvas;
  updateCanvas?: (canvas: Canvas) => void;
  canvasMessage?: CanvasMessage[] | undefined;
  handleSendMessage: (message: string) => void;
  isAwaitingResponse: boolean;
  shimmerTextboxIndices?: number[];
  fadeInTextboxIndices?: number[];
  highlightedText?: string[];
}

// Simple seeded random number generator for consistent shuffling
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const QuestionBlock: React.FC<QuestionBlockProps> = React.memo(
  ({
    title,
    content,
    onComplete,
    isFinalBlock = false,
    onExplainClick,
    lessonId,
    blockKey,
    persistedUserAnswer,
    onAnswerChange,
    inputMode,
    setInputMode,
    isReadOnly,
    canvas,
    updateCanvas,
    canvasMessage,
    handleSendMessage,
    isAwaitingResponse,
    shimmerTextboxIndices = [],
    fadeInTextboxIndices = [],
    highlightedText = [],
  }) => {
    // Use ref to always have access to latest onComplete without breaking memoization
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const handleComplete = useCallback(() => {
      onCompleteRef.current?.();
    }, []);

    // Stable callback for showing explanation
    const handleShowExplanation = useCallback((e: MouseEvent) => {
      e.stopPropagation();
      setShowExplanation(true);
    }, []);

    // Memoize the updateQuestionCanvas wrapper to prevent SketchCanvas re-renders
    const stableUpdateQuestionCanvas = useCallback(
      (_groupId: number, _legacyId: string, canvasData: Canvas) => {
        updateCanvas?.(canvasData);
      },
      [updateCanvas],
    );

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isChecked, setIsChecked] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    // Shuffle options while keeping track of the correct answer index
    // Use blockKey as seed for consistent shuffling across sessions
    const { shuffledOptions, correctIndex } = useMemo(() => {
      const optionsWithIndex = content.options.map((option, index) => ({
        option,
        originalIndex: index,
      }));

      // Use seeded random for consistent shuffling
      const seed = blockKey
        ? blockKey.split("_").reduce((acc, val) => acc + parseInt(val, 10), 0)
        : Math.floor(Math.random() * 10000);
      const random = seededRandom(seed);

      // Fisher-Yates shuffle with seeded random
      const shuffled = [...optionsWithIndex];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Find the new index of the correct answer
      const correctOriginalIndex = content.correct_answer_index;
      const correctNewIndex = shuffled.findIndex(
        (item) => item.originalIndex === correctOriginalIndex,
      );

      return {
        shuffledOptions: shuffled.map((item) => item.option),
        correctIndex: correctNewIndex,
      };
    }, [content.options, content.correct_answer_index, blockKey]);

    // Load persisted answer on mount (only once)
    const hasLoadedPersistedAnswer = useRef(false);
    useEffect(() => {
      if (persistedUserAnswer && !hasLoadedPersistedAnswer.current) {
        // persistedUserAnswer is the option text (string) for MCQ
        if (typeof persistedUserAnswer === "string") {
          const optionIndex = shuffledOptions.findIndex(
            (opt) => opt === persistedUserAnswer,
          );
          if (optionIndex !== -1) {
            setSelectedOption(optionIndex);
            setIsChecked(true); // If persisted, assume it was checked
          }
        }
        // Don't auto-show explanation - user must click "Why?" to see it
        // This prevents all explanations from showing on page load
        hasLoadedPersistedAnswer.current = true;
      } else if (!persistedUserAnswer) {
        // Reset flag if persistedUserAnswer becomes null (e.g., switching lessons)
        hasLoadedPersistedAnswer.current = false;
      }
    }, [persistedUserAnswer, shuffledOptions]);

    const handleCheck = useCallback(() => {
      if (selectedOption !== null) {
        setIsChecked(true);
        // Persist the answer when checked - store the option text (string) as user_answer
        if (onAnswerChange) {
          const selectedOptionText = shuffledOptions[selectedOption];
          onAnswerChange(selectedOptionText);
        }
        // If this is the final block, mark the learn flow as complete
        if (isFinalBlock) {
          onCompleteRef.current?.();
        }
      }
    }, [selectedOption, onAnswerChange, shuffledOptions, isFinalBlock]);

    // Stable handler for selecting an option - uses isChecked ref to avoid recreating
    const isCheckedRef = useRef(isChecked);
    isCheckedRef.current = isChecked;

    // Create stable handlers for each option (memoized based on shuffledOptions which is already memoized)
    const optionHandlers = useMemo(() => {
      return shuffledOptions.map((_, index) => () => {
        if (!isCheckedRef.current) {
          setSelectedOption(index);
        }
      });
    }, [shuffledOptions]); // shuffledOptions is memoized, so this is stable

    const isCorrect = selectedOption === correctIndex;

    // Extract "Question n" from title (e.g., "Question 1 – Ordering Integers..." -> "Question 1")
    const questionTitle = title.split("–")[0].trim();

    return (
      <LearnBlockCard
        title={questionTitle}
        footer={
          onComplete && !isChecked ? (
            <LearnBlockFooter
              buttonText="Check"
              buttonState={selectedOption !== null ? "filled" : "greyed"}
              onPress={handleCheck}
              disabled={selectedOption === null}
            />
          ) : undefined
        }
      >
        <div className="mb-6">
          <div className="prose prose-sm max-w-none">
            <MemoizedMarkdown
              content={content.question_text}
              highlightedText={highlightedText}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {shuffledOptions.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectOption = index === correctIndex;
            const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

            // Determine button state based on checked and selection status
            let buttonState:
              | "selected"
              | "correct"
              | "incorrect"
              | "greyed"
              | undefined;
            if (isChecked) {
              if (isCorrectOption) {
                buttonState = "correct";
              } else if (isSelected && !isCorrectOption) {
                buttonState = "incorrect";
              } else {
                buttonState = "greyed";
              }
            } else {
              if (isSelected) {
                buttonState = "selected";
              } else {
                buttonState = undefined;
              }
            }

            return (
              <div key={index} className="relative z-50 h-fit">
                <PrimaryButtonClicky
                  buttonText={option}
                  buttonState={buttonState}
                  letter={optionLabel}
                  onPress={optionHandlers[index]}
                  disabled={isChecked}
                  doesStretch={true}
                  showKeyboardShortcut={false}
                  isFontRounded={true}
                />
              </div>
            );
          })}
        </div>

        {showExplanation &&
          content.explanation &&
          content.explanation.length > 0 && (
            <div className="mb-6">
              <LearnExplanationSteps
                steps={content.explanation}
                onExplainClick={onExplainClick}
              />
            </div>
          )}

        {isChecked && (
          <div
            className={`mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-[24px] px-4 py-4 relative z-10 ${
              isCorrect ? "bg-[#efffd4]" : "bg-[#FDEEEE]"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-rounded-bold sm:flex-1 ${
                isCorrect ? "text-[#7CC500]" : "text-[#FF4B4C]"
              }`}
            >
              {isCorrect ? (
                <TickCircleIcon fillColor="#7CC500" className="w-12 h-12" />
              ) : (
                <CrossInCircleIcon fill="#FF4B4C" width={48} height={48} />
              )}
              {isCorrect ? "Correct!" : "Incorrect"}
            </div>
            {(!showExplanation || (onComplete && !isFinalBlock)) && (
              <div className="flex gap-3 w-full sm:w-auto">
                {!showExplanation && (
                  <button
                    onClick={handleShowExplanation}
                    className={`font-rounded-bold px-4 py-3 relative z-10 ${
                      isCorrect ? "text-[#7CC500]" : "text-[#FF4B4C]"
                    }`}
                  >
                    Why?
                  </button>
                )}
                {onComplete && !isFinalBlock && (
                  <div className="relative z-10 flex-1 sm:flex-none">
                    <LearnBlockFooter
                      buttonText="Continue"
                      buttonState={isCorrect ? "correct" : "incorrect"}
                      onPress={handleComplete}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Canvas disabled for now
        {content.requires_working && (
          <LearnModeSketchCanvas
            inputMode={inputMode}
            setInputMode={setInputMode}
            isReadOnly={isReadOnly}
            isQuestionMarked={false}
            canvas={canvas}
            canvasMessage={canvasMessage}
            updateQuestionCanvas={stableUpdateQuestionCanvas}
            questionGroupId={0}
            questionLegacyId={blockKey || "question-block"}
            questionAnnotations={undefined}
            handleSendMessage={handleSendMessage}
            shimmerTextboxIndices={shimmerTextboxIndices}
            fadeInTextboxIndices={fadeInTextboxIndices}
            isAwaitingResponse={isAwaitingResponse}
          />
        )}
        */}
      </LearnBlockCard>
    );
  },
);

QuestionBlock.displayName = "QuestionBlock";

export default QuestionBlock;
