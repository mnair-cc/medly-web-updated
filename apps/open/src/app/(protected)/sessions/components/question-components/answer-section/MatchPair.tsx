import PrimaryButton, {
  ButtonState,
} from "@/app/_components/PrimaryButtonClicky";
import { MarkingContext, QuestionWithMarkingResult } from "@/app/types/types";
import { useState, useMemo, useEffect } from "react";

const MatchPair = ({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
}) => {
  const [selectedPairs, setSelectedPairs] = useState<
    Array<{ left: string; right: string }>
  >([]);
  const [selectedPair, setSelectedPair] = useState<{
    left?: string;
    right?: string;
  }>({});
  const [incorrectPair, setIncorrectPair] = useState<{
    left?: string;
    right?: string;
  }>({});

  // Add useEffect to reset state when question changes
  useEffect(() => {
    setSelectedPairs([]);
    setSelectedPair({});
    setIncorrectPair({});
  }, [currentQuestionWithMarkingResult.legacyId]);

  // Add randomized lists using useMemo
  const randomizedLists = useMemo(() => {
    if (
      typeof currentQuestionWithMarkingResult.options === "object" &&
      "list_1" in currentQuestionWithMarkingResult.options
    ) {
      const list1 = [...currentQuestionWithMarkingResult.options.list_1].sort(
        () => Math.random() - 0.5
      );
      const list2 = [...currentQuestionWithMarkingResult.options.list_2].sort(
        () => Math.random() - 0.5
      );
      return { list1, list2 };
    }
    return { list1: [], list2: [] };
  }, [currentQuestionWithMarkingResult.options]);

  const buttonState = (option: string, side: "left" | "right"): ButtonState => {
    if (currentQuestionWithMarkingResult.annotatedAnswer) {
      return "correct";
    }

    if (incorrectPair[side] === option) {
      return "incorrect";
    }

    // Check if the option is part of a correct pair
    const isInCorrectPair = selectedPairs.some((pair) => pair[side] === option);
    if (isInCorrectPair) {
      return "correct";
    }

    if (selectedPair[side] === option) {
      return "selected";
    }

    return undefined;
  };

  const handleOptionPress = (option: string, side: "left" | "right") => {
    setSelectedPair({ ...selectedPair, [side]: option });

    // If both sides selected, check if pair is correct
    if (
      (side === "right" && selectedPair.left) ||
      (side === "left" && selectedPair.right)
    ) {
      const pair =
        side === "right"
          ? { left: selectedPair.left!, right: option }
          : { left: option, right: selectedPair.right! };

      const correctAnswer =
        currentQuestionWithMarkingResult.correctAnswer as Record<
          string,
          string
        >;
      const correctRight = correctAnswer[pair.left];
      const isCorrectPair = correctRight === pair.right;

      if (!isCorrectPair) {
        // Show incorrect state briefly
        setIncorrectPair(pair);
        setTimeout(() => {
          setIncorrectPair({});
          setSelectedPair({});
        }, 1000);
        return;
      }

      // Add to selected pairs if correct
      const newSelectedPairs = [...selectedPairs, pair];
      setSelectedPairs(newSelectedPairs);
      setSelectedPair({});

      // If all pairs are matched, submit the answer
      const totalPairs = Object.keys(
        currentQuestionWithMarkingResult.correctAnswer
      ).length;
      if (newSelectedPairs.length === totalPairs) {
        const finalAnswer = newSelectedPairs.reduce(
          (acc, pair) => ({
            ...acc,
            [pair.left]: pair.right,
          }),
          {}
        );
        handleMarkQuestion({
          questionLegacyId:
            currentQuestionWithMarkingResult.legacyId.toString(),
          question: currentQuestionWithMarkingResult.questionText,
          correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
          markMax: currentQuestionWithMarkingResult.maxMark,
          userAnswer: finalAnswer,
          questionType: currentQuestionWithMarkingResult.questionType,
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 px-4 md:px-6 pb-2">
      <div className="flex flex-col gap-2 justify-center">
        {typeof currentQuestionWithMarkingResult.options === "object" &&
        "list_1" in currentQuestionWithMarkingResult.options
          ? randomizedLists.list1.map((option: string) => (
              <PrimaryButton
                key={option}
                buttonText={option}
                onPress={() => handleOptionPress(option, "left")}
                buttonState={buttonState(option, "left")}
                disabled={
                  !!currentQuestionWithMarkingResult.annotatedAnswer ||
                  !!incorrectPair.left ||
                  selectedPairs.some((pair) => pair.left === option)
                }
                showKeyboardShortcut={false}
              />
            ))
          : null}
      </div>
      <div className="flex flex-col gap-2 justify-center">
        {typeof currentQuestionWithMarkingResult.options === "object" &&
        "list_2" in currentQuestionWithMarkingResult.options
          ? randomizedLists.list2.map((option: string) => (
              <PrimaryButton
                key={option}
                buttonText={option}
                onPress={() => handleOptionPress(option, "right")}
                buttonState={buttonState(option, "right")}
                disabled={
                  !!currentQuestionWithMarkingResult.annotatedAnswer ||
                  !!incorrectPair.right ||
                  selectedPairs.some((pair) => pair.right === option)
                }
                showKeyboardShortcut={false}
              />
            ))
          : null}
      </div>
    </div>
  );
};

export default MatchPair;
