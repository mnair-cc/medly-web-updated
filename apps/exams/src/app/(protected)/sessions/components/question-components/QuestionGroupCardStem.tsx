import { Decoration, QuestionWithMarkingResult } from "@/app/types/types";
import { QuestionTextRenderer } from "./QuestionTextRenderer";

const QuestionGroupCardStem = ({
  currentQuestionIndex,
  currentQuestionWithMarkingResult,
  decorations,
  isAnnotating = false,
  questionStemOverride,
}: {
  currentQuestionIndex: number;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
  decorations: Decoration[];
  isAnnotating?: boolean;
  questionStemOverride?: string;
}) => {
  const questionStem = questionStemOverride ?? currentQuestionWithMarkingResult.questionStem;
  return (
    <div
      className={`overflow-y-scroll overflow-y-scroll-question leading-6 relative ${
        currentQuestionWithMarkingResult.legacyId?.includes("EngLang")
          ? "md:pt-0"
          : "md:pt-0 "
      }`}
    >
      <div className="flex flex-row gap-5 pt-1">
        {currentQuestionWithMarkingResult.legacyId.includes("aqa") ? (
          <div className="flex flex-row gap-0 mt-0">
            <div
              className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-r-0 border-black font-medium ${
                currentQuestionWithMarkingResult.annotatedAnswer
                  ? currentQuestionWithMarkingResult.userMark ===
                    currentQuestionWithMarkingResult.maxMark
                    ? "text-[#7CC500]" // Green for full marks
                    : currentQuestionWithMarkingResult.userMark === 0
                      ? "text-[#FF4B4C]" // Red for zero marks
                      : "text-[#FFA935]" // Orange for partial marks
                  : "text-[black]" // Blue if not yet answered
              } text-black`}
            >
              {(currentQuestionIndex + 1).toString().length === 1
                ? `0`
                : (currentQuestionIndex + 1).toString()[0]}
            </div>
            <div
              className={`text-[15px] mt-[-2px] h-6 w-6 flex items-center justify-center border border-black font-medium ${
                currentQuestionWithMarkingResult.annotatedAnswer
                  ? currentQuestionWithMarkingResult.userMark ===
                    currentQuestionWithMarkingResult.maxMark
                    ? "text-[#7CC500]" // Green for full marks
                    : currentQuestionWithMarkingResult.userMark === 0
                      ? "text-[#FF4B4C]" // Red for zero marks
                      : "text-[#FFA935]" // Orange for partial marks
                  : "text-[black]" // Blue if not yet answered
              } text-black`}
            >
              {(currentQuestionIndex + 1).toString().length === 1
                ? currentQuestionIndex + 1
                : (currentQuestionIndex + 1).toString()[1]}
            </div>
          </div>
        ) : (
          <div className="text-base font-heading flex justify-start">
            {currentQuestionIndex + 1}
          </div>
        )}

        {questionStem && (
          <div className="flex flex-col w-full">
            <div className="">
              <QuestionTextRenderer
                text={questionStem}
                diagram={currentQuestionWithMarkingResult.questionStemDiagram}
                decorations={decorations}
                isAnnotating={isAnnotating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionGroupCardStem;
