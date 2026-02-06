import QuestionCardAnswerSection from "./answer-section/QuestionCardAnswerSection";
import { MarkingContext, QuestionWithMarkingResult } from "@/app/types/types";
import EnglishLines from "./EnglishLines";
import SimpleLines from "./SimpleLines";
import Lined from "./Lined";
import { useResponsive } from "@/app/_hooks/useResponsive";

const InputMethod = ({
  currentQuestionWithMarkingResult,
  updateQuestionUserAnswer,
  handleMarkAnswer,
  hideElimination,
  hideLines,
  handleSendMessage,
  isAwaitingResponse,
}: {
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  updateQuestionUserAnswer: (
    questionGroupId: number,
    questionLegacyId: string,
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  handleMarkAnswer: (markingContext: MarkingContext) => void;
  hideElimination?: boolean;
  hideLines?: boolean;
  handleSendMessage?: (message: string) => void;
  isAwaitingResponse?: boolean;
}) => {
  const { isWideScreen } = useResponsive();
  const isEnglish = currentQuestionWithMarkingResult.legacyId.includes("Eng");
  const isAlternativeInput =
    currentQuestionWithMarkingResult.questionType === "mcq" ||
    currentQuestionWithMarkingResult.questionType === "mcq_multiple" ||
    currentQuestionWithMarkingResult.questionType === "true_false" ||
    currentQuestionWithMarkingResult.questionType === "match_pair" ||
    currentQuestionWithMarkingResult.questionType === "number" ||
    currentQuestionWithMarkingResult.questionType === "reorder" ||
    currentQuestionWithMarkingResult.questionType === "group" ||
    currentQuestionWithMarkingResult.questionType === "spot" ||
    currentQuestionWithMarkingResult.questionType === "fix_sentence";

  if (isAlternativeInput) {
    return (
      <div className="relative mx-4 mb-10">
        <QuestionCardAnswerSection
          isMarking={false}
          userAnswer={currentQuestionWithMarkingResult.userAnswer}
          setUserAnswer={(answer) =>
            updateQuestionUserAnswer(
              currentQuestionWithMarkingResult.questionGroupId,
              currentQuestionWithMarkingResult.legacyId,
              answer
            )
          }
          onPressPrimaryButton={() => {}}
          setIsTextareaFocused={() => {}}
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          handleMarkQuestion={handleMarkAnswer}
          hideElimination={hideElimination}
          handleSendMessage={handleSendMessage}
          isAwaitingResponse={isAwaitingResponse}
        />
      </div>
    );
  }

  if (!isWideScreen) {
    return (
      <div className="bg-[#FBFBFD] rounded-[24px] border border-[#F2F2F7] py-2 pb-10">
        <Lined
          isMarking={false}
          userAnswer={currentQuestionWithMarkingResult.userAnswer}
          setUserAnswer={(answer) =>
            updateQuestionUserAnswer(
              currentQuestionWithMarkingResult.questionGroupId,
              currentQuestionWithMarkingResult.legacyId,
              answer
            )
          }
          onPressPrimaryButton={() => {}}
          setIsTextareaFocused={() => {}}
          currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
          type="lined"
        />
      </div>
    );
  }

  if (isEnglish || currentQuestionWithMarkingResult.userAnswer) {
    return (
      <Lined
        isMarking={false}
        userAnswer={currentQuestionWithMarkingResult.userAnswer}
        setUserAnswer={(answer) =>
          updateQuestionUserAnswer(
            currentQuestionWithMarkingResult.questionGroupId,
            currentQuestionWithMarkingResult.legacyId,
            answer
          )
        }
        onPressPrimaryButton={() => {}}
        setIsTextareaFocused={() => {}}
        currentQuestionWithMarkingResult={currentQuestionWithMarkingResult}
        type="lined"
      />
    );
  }

  if (hideLines) {
    return null;
  }

  return (
    <SimpleLines questionWithMarkingResult={currentQuestionWithMarkingResult} />
  );
};

export default InputMethod;

// if calculate long_answer or short_answer and not English show the SimpleLines
// if it's not calculate, long_answer or short_answer show the different question type answer section (mcq etc)
// if it's English show the EnglishLines
