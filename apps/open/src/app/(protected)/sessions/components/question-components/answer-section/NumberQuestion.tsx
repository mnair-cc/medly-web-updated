import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { QuestionWithMarkingResult, MarkingContext } from "@/app/types/types";
import PrimaryButton from "@/app/_components/PrimaryButtonClicky";

interface NumberQuestionProps {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  handleMarkQuestion: (markingContext: MarkingContext) => void;
  setUserAnswer: (answer: string | string[] | { left?: string; right?: string } | Record<string, string[]>) => void;
}

export default function NumberQuestion({
  currentQuestionWithMarkingResult,
  handleMarkQuestion,
  setUserAnswer,
}: NumberQuestionProps) {
  const correctAnswer = useMemo(
    () => String(currentQuestionWithMarkingResult.correctAnswer || ""),
    [currentQuestionWithMarkingResult.correctAnswer]
  );
  const numDigits = correctAnswer.length;

  // Initialize state from userAnswer if it exists
  const [userDigits, setUserDigits] = useState<string[]>(() => {
    if (Array.isArray(currentQuestionWithMarkingResult.userAnswer)) {
      return currentQuestionWithMarkingResult.userAnswer as string[];
    }
    return Array(numDigits).fill("");
  });

  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0);
  const [isJiggling, setIsJiggling] = useState<boolean>(false);
  const lastJiggleTimeRef = useRef<number>(0);
  const jiggleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isMarked = currentQuestionWithMarkingResult.userMark !== undefined;
  const isComplete = userDigits.every(d => d !== "");

  // Reset state when question changes
  useEffect(() => {
    // If userAnswer exists and has values, use it
    if (Array.isArray(currentQuestionWithMarkingResult.userAnswer) &&
      currentQuestionWithMarkingResult.userAnswer.length > 0 &&
      currentQuestionWithMarkingResult.userAnswer.some(d => d !== "")) {
      setUserDigits(currentQuestionWithMarkingResult.userAnswer as string[]);
    } else {
      // Otherwise reset to empty
      setUserDigits(Array(numDigits).fill(""));
    }
    setSelectedBoxIndex(0);
  }, [currentQuestionWithMarkingResult.legacyId, numDigits]);

  // Sync userDigits to parent's setUserAnswer (but don't let it trigger reset)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (userDigits.some(d => d !== "")) {
      setUserAnswer(userDigits);
    }
  }, [userDigits]); // setUserAnswer is stable, don't include in deps to avoid infinite loop

  // Check if answer is complete and correct, then auto-submit
  const checkAndSubmit = useCallback((digits: string[]) => {
    // Check if all boxes are filled
    const isComplete = digits.every(d => d !== "");

    if (isComplete && !isMarked) {
      const userAnswerString = digits.join("");

      setTimeout(() => {
        handleMarkQuestion({
          questionLegacyId: currentQuestionWithMarkingResult.legacyId.toString(),
          question: currentQuestionWithMarkingResult.questionText,
          correctAnswer: currentQuestionWithMarkingResult.correctAnswer,
          markMax: currentQuestionWithMarkingResult.maxMark,
          userAnswer: digits,
          canvas: currentQuestionWithMarkingResult.canvas,
          questionType: currentQuestionWithMarkingResult.questionType,
        });
      }, 10);
    }
  }, [isMarked, correctAnswer, handleMarkQuestion, currentQuestionWithMarkingResult]);

  // Trigger jiggle animation when marked incorrectly
  useEffect(() => {
    if (isMarked && currentQuestionWithMarkingResult.userMark !== currentQuestionWithMarkingResult.maxMark) {
      const now = Date.now();
      // Prevent jiggling if it happened within the last 5 seconds
      if (now - lastJiggleTimeRef.current < 5000) {
        return;
      }

      lastJiggleTimeRef.current = now;
      setIsJiggling(true);

      // Clear any existing timer
      if (jiggleTimerRef.current) {
        clearTimeout(jiggleTimerRef.current);
      }

      jiggleTimerRef.current = setTimeout(() => {
        setIsJiggling(false);
        jiggleTimerRef.current = null;
      }, 500); // Animation duration
    }
  }, [isMarked, currentQuestionWithMarkingResult.userMark, currentQuestionWithMarkingResult.maxMark]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (jiggleTimerRef.current) {
        clearTimeout(jiggleTimerRef.current);
      }
    };
  }, []);

  // Handle number input
  const handleNumberClick = useCallback((digit: string) => {
    if (isMarked) return;

    const newDigits = [...userDigits];

    // Insert the digit at selected box
    newDigits[selectedBoxIndex] = digit;
    setUserDigits(newDigits);

    // Auto-advance to next box
    if (selectedBoxIndex < numDigits - 1) {
      setSelectedBoxIndex(selectedBoxIndex + 1);
    }

    // Check and submit if complete and correct
    checkAndSubmit(newDigits);
  }, [userDigits, selectedBoxIndex, numDigits, isMarked, checkAndSubmit]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (isMarked) return;

    const newDigits = [...userDigits];

    // If current box has a digit, clear it
    if (newDigits[selectedBoxIndex]) {
      newDigits[selectedBoxIndex] = "";
    } else {
      // Otherwise, clear the previous filled box
      const lastFilledIndex = newDigits.reduceRight((acc, digit, idx) => {
        if (acc === -1 && digit !== "" && idx < selectedBoxIndex) {
          return idx;
        }
        return acc;
      }, -1);

      if (lastFilledIndex !== -1) {
        newDigits[lastFilledIndex] = "";
        setSelectedBoxIndex(lastFilledIndex);
      }
    }

    setUserDigits(newDigits);
    setUserAnswer(newDigits);
  }, [userDigits, selectedBoxIndex, isMarked, setUserAnswer]);

  // Handle box click
  const handleBoxClick = (index: number) => {
    if (!isMarked) {
      setSelectedBoxIndex(index);
    }
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMarked) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberClick, handleDelete, isMarked]);

  // Get box styling based on state
  const getBoxStyle = (index: number) => {
    const digit = userDigits[index];
    const isSelected = selectedBoxIndex === index && !isMarked;

    if (isMarked) {
      // Check if this digit is correct
      const isCorrect = digit === correctAnswer[index];

      if (isCorrect) {
        return "bg-[#E4FFB7] text-[#7CC500] border-2 border-[#7CC500]";
      } else {
        return "bg-[#FDEEEE] text-[#FF4B4C] border-2 border-[#FF4B4C]";
      }
    }

    if (isSelected) {
      // Selected box with no digit: show "?" in light grey
      if (!digit) {
        return "bg-[#8FDCFF]/30 text-[#595959]/50 border-2 border-[#06B0FF]";
      }
      // Selected box with digit: show digit in blue
      return "bg-[#8FDCFF]/30 text-[#05B0FF] border-2 border-[#06B0FF]";
    }

    // Unselected box
    if (digit) {
      // Has digit: black text
      return "bg-gray-100 text-black border-2 border-gray-300";
    } else {
      // No digit: grey "?" placeholder
      return "bg-gray-100 text-[#595959]/50 border-2 border-gray-300";
    }
  };

  // Number pad buttons
  const numberButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
  ];

  return (
    <div className="flex flex-col items-center gap-8 py-6 px-4">
      {/* Digit Display Boxes */}
      <div className={`flex gap-3 ${isJiggling ? 'animate-jiggle' : ''}`}>
        {Array.from({ length: numDigits }).map((_, index) => (
          <div
            key={index}
            onClick={() => handleBoxClick(index)}
            className={`
              ${getBoxStyle(index)}
              text-4xl font-rounded-semibold rounded-xl w-20 h-24
              flex items-center justify-center
              ${!isMarked ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}
              transition-all duration-150
            `}
          >
            {userDigits[index] || (isMarked ? "" : "?")}
          </div>
        ))}
      </div>

      {/* Number Pad */}
      <div className="flex flex-col gap-2">
        {numberButtons.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((num) => (
              <div key={num} style={{ width: '80px' }}>
                <PrimaryButton
                  buttonText={num}
                  onPress={() => handleNumberClick(num)}
                  disabled={isMarked}
                  doesStretch={true}
                  showKeyboardShortcut={false}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Bottom row with 0 and DEL */}
        <div className="flex gap-2">
          <div style={{ width: '168px' }}>
            <PrimaryButton
              buttonText="0"
              onPress={() => handleNumberClick('0')}
              disabled={isMarked}
              doesStretch={true}
              showKeyboardShortcut={false}
            />
          </div>
          <div style={{ width: '80px' }}>
            <PrimaryButton
              buttonText="DEL"
              onPress={handleDelete}
              disabled={isMarked}
              doesStretch={true}
              showKeyboardShortcut={false}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes jiggle {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-8px); }
          20% { transform: translateX(8px); }
          30% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          50% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          90% { transform: translateX(-1px); }
        }
        .animate-jiggle {
          animation: jiggle 0.8s ease-in-out;
        }
      `}</style>
    </div>
  );
}