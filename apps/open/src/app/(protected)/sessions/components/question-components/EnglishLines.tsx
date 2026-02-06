import { QuestionWithMarkingResult } from "@/app/types/types";
import Lined from "./Lined";

const Lined2 = ({
  isMarking,
  index,
  currentQuestionIndex,
  questionAnswers,
  setQuestionAnswers,
  setIsTextareaFocused,
  questionWithMarkingResult,
  isReadOnly,
  onPressPrimaryButton,
}: {
  isMarking: boolean;
  index: number;
  currentQuestionIndex: number;
  questionAnswers: any;
  setQuestionAnswers: (questionAnswers: any) => void;
  setIsTextareaFocused: (focused: boolean) => void;
  questionWithMarkingResult: QuestionWithMarkingResult;
  isReadOnly: boolean;
  onPressPrimaryButton: () => void;
}) => {
  return (
    <div className=" z-[10]">
      <Lined
        isMarking={isMarking && index === currentQuestionIndex}
        userAnswer={
          questionAnswers[questionWithMarkingResult.legacyId]
            ? questionAnswers[questionWithMarkingResult.legacyId]
            : questionWithMarkingResult.userAnswer
        }
        setUserAnswer={(newAnswer) => {
          if (!isReadOnly) {
            setQuestionAnswers((prev: any) => ({
              ...prev,
              [questionWithMarkingResult.legacyId]: newAnswer,
            }));
          }
        }}
        onPressPrimaryButton={onPressPrimaryButton}
        setIsTextareaFocused={setIsTextareaFocused}
        currentQuestionWithMarkingResult={questionWithMarkingResult}
        type="lined"
      />
    </div>
  );
};

export default Lined2;
