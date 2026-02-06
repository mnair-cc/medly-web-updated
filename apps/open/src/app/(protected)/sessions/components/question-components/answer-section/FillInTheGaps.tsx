import PrimaryButton, {
  ButtonState,
} from "@/app/_components/PrimaryButtonClicky";
import { MarkingContext } from "@/app/types/types";

import { QuestionWithMarkingResult } from "@/app/types/types";
import { useEffect, useState } from "react";

const FillInTheGaps = ({
  currentQuestionWithMarkingResult,
  userAnswer,
  setUserAnswer,
  options,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;
  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  options: string[];
}) => {
  const [randomizedOptions, setRandomizedOptions] = useState<string[]>([]);

  useEffect(() => {
    // Fisher-Yates shuffle algorithm
    const shuffledOptions = [...options];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [
        shuffledOptions[j],
        shuffledOptions[i],
      ];
    }
    setRandomizedOptions(shuffledOptions);
  }, [options]);

  // Convert userAnswer to array if it's a string or null
  const answersArray = Array.isArray(userAnswer) ? userAnswer : [];

  const handleOptionPress = (option: string) => {
    const emptyIndex = answersArray.findIndex((answer) => answer === "");
    if (emptyIndex !== -1) {
      const newAnswers = [...answersArray];
      newAnswers[emptyIndex] = option;
      setUserAnswer(newAnswers);
    } else {
      setUserAnswer([...answersArray, option]);
    }
  };

  const buttonState = (option: string): ButtonState | undefined => {
    if (answersArray.includes(option)) {
      return "picked";
    }
    return undefined;
  };

  return (
    <div className="flex justify-center gap-2 px-4 md:px-6 pb-2 flex-wrap">
      {randomizedOptions.map((option) => (
        <PrimaryButton
          key={option}
          buttonText={option}
          onPress={() => handleOptionPress(option)}
          disabled={
            currentQuestionWithMarkingResult.userMark !== undefined ||
            (Array.isArray(userAnswer) && userAnswer.includes(option))
          }
          buttonState={buttonState(option)}
          showKeyboardShortcut={false}
        />
      ))}
    </div>
  );
};

export default FillInTheGaps;
