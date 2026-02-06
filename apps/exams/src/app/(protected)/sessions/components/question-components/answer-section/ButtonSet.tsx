import {
  preprocessLaTeX,
  removeAltText,
} from "@/app/_hooks/useLatexPreprocessing";
import { QuestionWithMarkingResult } from "@/app/types/types";
import remarkMath from "remark-math";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import PrimaryButtonClicky, {
  ButtonState,
} from "@/app/_components/PrimaryButtonClicky";
import { useState, useEffect } from "react";
import RuleOutOptionAIcon from "@/app/_components/icons/RuleOutOptionAIcon";
import RuleOutOptionBIcon from "@/app/_components/icons/RuleOutOptionBIcon";
import RuleOutOptionCIcon from "@/app/_components/icons/RuleOutOptionCIcon";
import RuleOutOptionDIcon from "@/app/_components/icons/RuleOutOptionDIcon";
import { useExamLoggerContext } from "@/app/(protected)/sessions/contexts/ExamLoggerContext";

const ButtonSet = ({
  currentQuestionWithMarkingResult,
  userAnswer,
  setUserAnswer,
  options,
  canPickMultiple = false,
  initiallyRuledOut = new Set(),
  hideElimination,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  options: string[] | { option: string; explanation: string }[];
  canPickMultiple?: boolean;
  initiallyRuledOut?: Set<string>;
  hideElimination?: boolean;
}) => {
  const {
    logRuleOutOption,
    logUndoRuleOutOption,
    logSetAnswer,
    isMockSession,
  } = useExamLoggerContext();

  const [ruledOutOptions, setRuledOutOptions] = useState<Set<string>>(
    new Set(initiallyRuledOut)
  );

  // Update ruled out options when initiallyRuledOut prop changes
  // Convert Set to Array for stable dependency comparison
  const initiallyRuledOutArray = Array.from(initiallyRuledOut).sort();
  useEffect(() => {
    setRuledOutOptions(new Set(initiallyRuledOut));
  }, [JSON.stringify(initiallyRuledOutArray)]);

  const getRuleOutIcon = (index: number) => {
    switch (index) {
      case 0:
        return RuleOutOptionAIcon;
      case 1:
        return RuleOutOptionBIcon;
      case 2:
        return RuleOutOptionCIcon;
      case 3:
        return RuleOutOptionDIcon;
      default:
        return RuleOutOptionAIcon;
    }
  };

  const getOptionLetter = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };

  const handleRuleOutToggle = (option: string) => {
    const newRuledOutOptions = new Set(ruledOutOptions);

    if (ruledOutOptions.has(option)) {
      // Undo rule out
      newRuledOutOptions.delete(option);

      if (isMockSession) {
        logUndoRuleOutOption(currentQuestionWithMarkingResult.legacyId, option);
      }
    } else {
      // Rule out option and deselect it if it was selected
      newRuledOutOptions.add(option);

      // Deselect the option if it was selected
      if (canPickMultiple) {
        const currentAnswers = Array.isArray(userAnswer) ? userAnswer : [];
        const newAnswers = currentAnswers.filter((ans) => ans !== option);
        setUserAnswer(newAnswers);
      } else if (userAnswer === option) {
        setUserAnswer("");
      }

      if (isMockSession) {
        logRuleOutOption(currentQuestionWithMarkingResult.legacyId, option);
      }
    }

    setRuledOutOptions(newRuledOutOptions);
  };

  const handleOptionPress = (option: string) => {
    // If option is ruled out, un-rule it out when selecting
    if (ruledOutOptions.has(option)) {
      const newRuledOutOptions = new Set(ruledOutOptions);
      newRuledOutOptions.delete(option);
      setRuledOutOptions(newRuledOutOptions);
    }

    if (canPickMultiple) {
      const currentAnswers = Array.isArray(userAnswer)
        ? userAnswer
        : userAnswer
          ? [userAnswer]
          : [];
      const newAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter((ans) => ans !== option)
        : [...currentAnswers, option];
      setUserAnswer(newAnswers as string[]);
    } else {
      setUserAnswer(option);
    }

    if (isMockSession) {
      logSetAnswer(currentQuestionWithMarkingResult.legacyId, option);
    }
  };

  const buttonState = (option: string): ButtonState | undefined => {
    if (currentQuestionWithMarkingResult.userMark !== undefined) {
      let { userAnswer, correctAnswer } =
        currentQuestionWithMarkingResult.questionType === "true_false"
          ? {
            userAnswer:
              String(currentQuestionWithMarkingResult.userAnswer)
                .toLowerCase()
                .charAt(0)
                .toUpperCase() +
              String(currentQuestionWithMarkingResult.userAnswer)
                .toLowerCase()
                .slice(1),
            correctAnswer:
              String(currentQuestionWithMarkingResult.correctAnswer)
                .toLowerCase()
                .charAt(0)
                .toUpperCase() +
              String(currentQuestionWithMarkingResult.correctAnswer)
                .toLowerCase()
                .slice(1),
          }
          : {
            userAnswer: currentQuestionWithMarkingResult.userAnswer,
            correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
          };

      // For MCQ, if correctAnswer is an index, convert it to the actual option text
      if (currentQuestionWithMarkingResult.questionType === "mcq" &&
          typeof correctAnswer === 'string' &&
          /^\d+$/.test(correctAnswer)) {
        const index = parseInt(correctAnswer, 10);
        if (index >= 0 && index < options.length) {
          const optionAtIndex = options[index];
          correctAnswer = typeof optionAtIndex === 'string'
            ? optionAtIndex
            : optionAtIndex.option;
        }
      }

      if (
        Array.isArray(userAnswer)
          ? userAnswer.some((answer) => answer === option)
          : typeof userAnswer === "string" && userAnswer === option
      ) {
        if (
          Array.isArray(correctAnswer)
            ? correctAnswer.some((answer) => answer === option)
            : typeof correctAnswer === "string" && correctAnswer === option
        ) {
          return "correct";
        } else {
          return "incorrect";
        }
      } else {
        return "greyed";
      }
    } else if (ruledOutOptions.has(option)) {
      return "greyed";
    } else if (
      Array.isArray(userAnswer)
        ? userAnswer.some((answer) => answer === option)
        : userAnswer && typeof userAnswer === "string" && userAnswer === option
    ) {
      return "selected";
    }
  };

  // Helper to get the actual correct answer for comparison
  const getCorrectAnswerForComparison = () => {
    const correctAnswerRaw = currentQuestionWithMarkingResult.correctAnswer;
    if (currentQuestionWithMarkingResult.questionType === "mcq" &&
        typeof correctAnswerRaw === 'string' &&
        /^\d+$/.test(correctAnswerRaw)) {
      const index = parseInt(correctAnswerRaw, 10);
      if (index >= 0 && index < options.length) {
        const optionAtIndex = options[index];
        return typeof optionAtIndex === 'string' ? optionAtIndex : optionAtIndex.option;
      }
    }
    return correctAnswerRaw;
  };

  const correctAnswerForDisplay = getCorrectAnswerForComparison();

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => {
        const optionText = typeof option === "string" ? option : option.option;
        const isRuledOut = ruledOutOptions.has(optionText);
        const RuleOutIcon = getRuleOutIcon(index);

        return currentQuestionWithMarkingResult.isMarked &&
          typeof option !== "string" &&
          option.explanation ? (
          <div
            key={option.option}
            className={`flex flex-col gap-1 border rounded-2xl p-4 text-[14px] ${correctAnswerForDisplay === option.option
              ? "bg-[#e4ffb7] border-[#CEE8A3]"
              : currentQuestionWithMarkingResult.userAnswer ===
                option.option &&
                currentQuestionWithMarkingResult.userAnswer !==
                correctAnswerForDisplay
                ? "bg-[#FDEEEE] border-[#FF4B4C]/20"
                : "border-[#F2F2F7]"
              }`}
          >
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center font-rounded-bold text-[15px] md:text-[14px] leading-tight gap-3">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full border font-rounded-bold text-xs flex-shrink-0 ${correctAnswerForDisplay ===
                    option.option
                    ? "bg-[#7CC500] border-[#7CC500] text-white"
                    : currentQuestionWithMarkingResult.userAnswer ===
                      option.option &&
                      currentQuestionWithMarkingResult.userAnswer !==
                      correctAnswerForDisplay
                      ? "bg-[#FF4B4C] border-[#FF4B4C] text-white"
                      : "border-[#F2F2F7] text-[rgba(0,0,0,0.8)]"
                    }`}
                >
                  {getOptionLetter(index)}
                </div>
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    [remarkMath, { singleDollarTextMath: true }],
                  ]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {removeAltText(preprocessLaTeX(option.option))}
                </ReactMarkdown>
              </div>
            </div>

            <div className="text-black/50">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { singleDollarTextMath: true }],
                ]}
                rehypePlugins={[rehypeKatex]}
              >
                {removeAltText(preprocessLaTeX(option.explanation || ""))}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div key={optionText} className="flex items-center gap-2">
            <PrimaryButtonClicky
              buttonText={optionText}
              onPress={() => handleOptionPress(optionText)}
              disabled={!!currentQuestionWithMarkingResult.annotatedAnswer}
              buttonState={buttonState(optionText)}
              showKeyboardShortcut={false}
              isStrikethrough={isRuledOut}
              doesStretch={true}
              letter={getOptionLetter(index)}
            />

            {!hideElimination && <button
              onClick={() => handleRuleOutToggle(optionText)}
              className="flex items-center gap-1 p-1 w-10"
              disabled={!!currentQuestionWithMarkingResult.annotatedAnswer}
            >
              {isRuledOut ? (
                <span className="text-xs font-medium text-[#BCBCBE]">Undo</span>
              ) : (
                <RuleOutIcon />
              )}
            </button>}
          </div>
        );
      })}
    </div>
  );
};

export default ButtonSet;
