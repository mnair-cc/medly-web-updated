import { QuestionWithMarkingResult } from "@/app/types/types";

const Open = ({
  isMarking,
  userAnswer,
  setUserAnswer,
  onPressPrimaryButton,
  setIsTextareaFocused,
  currentQuestionWithMarkingResult,
}: {
  isMarking: boolean;
  userAnswer: string | string[] | { left?: string; right?: string } | undefined;

  setUserAnswer: (
    answer: string | string[] | { left?: string; right?: string }
  ) => void;
  onPressPrimaryButton: () => void;
  setIsTextareaFocused: (focused: boolean) => void;
  currentQuestionWithMarkingResult: QuestionWithMarkingResult;
}) => {
  if (!currentQuestionWithMarkingResult.annotatedAnswer && isMarking) {
    return (
      <div className="px-4 md:px-6 pt-2 md:pt-4 bg-white">
        <div className="flex flex-col gap-2">
          <div className="outline-none resize-none pb-8 bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 mb-2 text-gray-500 text-[15px] md:text-[15px]">
            {typeof userAnswer === "string" && userAnswer}
          </div>
        </div>
      </div>
    );
  }

  const markdownStyles = `
  [&_h1]:text-2xl
  [&_h1]:mb-4
  [&_h1]:font-bold

  [&_table]:table-fixed 
  [&_table]:border
  [&_table]:border-[#f2f2f7]
  [&_table]:rounded-[16px]
  [&_table]:my-8
  [&_table]:mx-auto
  
  [&_table_td]:px-4
  [&_table_td]:border-r
  [&_table_td]:border-[#f2f2f7]
  [&_table_td]:text-center
  [&_table_td:last-child]:border-r-0
  
  [&_table_th]:px-4
  [&_table_th]:border-b
  [&_table_th]:border-r
  [&_table_th]:bg-[#F8F8FB]
  [&_table_th]:border-[#f2f2f7]
  [&_table_th]:font-medium
  [&_table_th]:text-center
  [&_table_th:last-child]:border-r-0
  
  [&_table_tr:last-child_td]:border-b-0
  
  [&_img]:py-4 
  [&_img]:max-h-[400px] 
  [&_img]:mx-auto

  [&_p]:mb-4
  [&_br]:mb-4
`;

  if (!currentQuestionWithMarkingResult.annotatedAnswer && !isMarking) {
    return (
      <div className="px-4 md:px-6 pt-2 md:pt-4 ">
        <div className="flex flex-col gap-2">
          <textarea
            className="outline-none resize-none bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 md:mb-2 overflow-y-hidden text-[15px] md:text-[15px]"
            style={{ height: "auto" }}
            // maxLength={1024}
            // maxLength={}
            id="userAnswer"
            name="userAnswer"
            placeholder="Your answer"
            value={typeof userAnswer === "string" ? userAnswer : ""}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              // Auto-resize logic
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                if (typeof userAnswer === "string" && userAnswer.length > 0) {
                  onPressPrimaryButton();
                }
              }
            }}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}

            // autoFocus={true}
          />
        </div>
      </div>
    );
  }

  if (currentQuestionWithMarkingResult.annotatedAnswer) {
    return (
      <div className="px-4 md:px-6 pt-2 md:pt-4">
        <div className="outline-none resize-none pb-8 bg-[#F7F7FB] rounded-[16px] border border-[#EFEFF6] p-4 mb-2 text-[15px] md:text-[15px]">
          {currentQuestionWithMarkingResult.annotatedAnswer.length >=
          0.75 * currentQuestionWithMarkingResult.userAnswer?.length ? (
            currentQuestionWithMarkingResult.annotatedAnswer
              .split(/(\*\*.*?\*\*|`.*?`)/)
              .map((part: string, index: number) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <span key={index} className="bg-[#FFC0C0] py-0.5 px-1 -m-1">
                      {part.slice(2, -2)}
                    </span>
                  );
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                  return (
                    <span key={index} className="bg-[#E6FFBC] py-0.5 px-1 -m-1">
                      {part.slice(1, -1)}
                    </span>
                  );
                }
                return <span key={index}>{part}</span>;
              })
          ) : (
            <span>{currentQuestionWithMarkingResult.userAnswer}</span>
          )}
        </div>
      </div>
    );
  }
};

export default Open;
