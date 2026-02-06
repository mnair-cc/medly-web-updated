import {
  MockPage,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";
import BookmarkIcon from "@/app/_components/icons/BookmarkIcon";
import { QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";

const ReviewPage = ({
  pages,
  handleSetCurrentPageIndex,
  sessionTitle,
  sessionSubtitle,
  isReadOnly,
}: {
  pages: MockPage[];
  handleSetCurrentPageIndex: (index: number) => void;
  sessionTitle: string;
  sessionSubtitle: string;
  isReadOnly?: boolean;
}) => {
  // Filter out the review page itself from the navigation
  const questionPages = pages.filter(
    (page) => page.type === QuestionSessionPageType.Question
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FBFBFD] p-4">
      <div className="flex flex-col items-center justify-center max-w-[600px] mx-auto">
        <div className="flex flex-col items-center justify-center mb-10">
          <h1 className="text-4xl font-rounded-bold">Check your work</h1>
          {!isReadOnly && (
            <>
              <p className="text-sm text-gray-500 text-center mt-6">
                On test day, you won&apos;t be able to move on to the next
                module until time expires.
              </p>
              <p className="text-sm text-gray-500 text-center">
                For these practice questions, you can click{" "}
                <span className="font-bold">Next</span> when you&apos;re ready
                to move on.
              </p>
            </>
          )}
        </div>
        <div className="border border-[#000000]/5 rounded-2xl p-10 bg-white">
          <div className="flex flex-col justify-center items-center gap-4">
            <div className="flex justify-between border-b border-[#F2F2F7] pb-4 gap-4 w-full">
              <div className="flex flex-col">
                <h3 className="font-rounded-semibold">
                  {sessionTitle} Questions
                </h3>
                <p className="text-xs text-black/50">{sessionSubtitle}</p>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col gap-2">
                  {isReadOnly ? (
                    // Read-only mode: Show unanswered, correct, and incorrect
                    <>
                      <div className="flex gap-1 items-center">
                        <div className="bg-[#F2F2F7] rounded-full w-6 h-6 flex justify-center items-center"></div>
                        <p className="text-xs text-black/50">Unanswered</p>
                      </div>
                      <div className="flex gap-1 items-center">
                        <div className="bg-[#E6F9E6] rounded-full w-6 h-6 flex justify-center items-center"></div>
                        <p className="text-xs text-black/50">Correct</p>
                      </div>
                      <div className="flex gap-1 items-center">
                        <div className="bg-[#FDEEEE] rounded-full w-6 h-6 flex justify-center items-center"></div>
                        <p className="text-xs text-black/50">Incorrect</p>
                      </div>
                    </>
                  ) : (
                    // Active mode: Show unanswered
                    <div className="flex gap-1 items-center">
                      <p className="text-xs text-black/50 bg-[#F2F2F7] rounded-full w-6 h-6 flex justify-center items-center"></p>
                      <p className="text-xs text-black/50">Unanswered</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1 items-center">
                    <BookmarkIcon />
                    <p className="text-xs text-black/50">For Review</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(10,2.5rem)] gap-2">
              {questionPages.map((page, index) => {
                const containsUnansweredQuestions =
                  page.type === QuestionSessionPageType.Question &&
                  (page.content as QuestionGroup).questions.some((question) => {
                    const q = question as QuestionWithMarkingResult;
                    return (
                      !q.userAnswer &&
                      !(
                        q.canvas &&
                        ((q.canvas.paths && q.canvas.paths.length > 0) ||
                          (q.canvas.textboxes && q.canvas.textboxes.length > 0))
                      )
                    );
                  });
                const question = (page.content as QuestionGroup)
                  .questions[0] as QuestionWithMarkingResult;

                // Determine color based on marking results
                const getQuestionColorClasses = () => {
                  // First check if the question is unanswered (regardless of mode)
                  if (containsUnansweredQuestions) {
                    return "bg-[#F2F2F7] border-white";
                  }

                  if (question.markMax !== undefined) {
                    // If no userMark found, assume as incorrect (userMark = 0)
                    const userMark = question.userMark ?? 0;

                    if (userMark === question.markMax) {
                      // Full marks - Green
                      return "bg-[#E6F9E6] border-white";
                    } else {
                      // No marks or partial marks - Red
                      return "bg-[#FDEEEE] border-white";
                    }
                  } else {
                    // Not marked yet - use blue for answered questions
                    return "bg-[#06B0FF] border-white";
                  }
                };

                const getTextColorClasses = () => {
                  // First check if the question is unanswered (regardless of mode)
                  if (containsUnansweredQuestions) {
                    return "text-black/25";
                  }

                  if (question.markMax !== undefined) {
                    // If no userMark found, assume as incorrect (userMark = 0)
                    const userMark = question.userMark ?? 0;
                    // Non-current marked questions use colored text
                    return userMark === question.markMax
                      ? "text-[#7CC500]"
                      : "text-[#FF4B4C]";
                  } else {
                    // Not marked yet - use white text for answered questions
                    return "text-white";
                  }
                };

                return (
                  <button
                    key={index}
                    className={`relative flex justify-center items-center rounded-full w-10 h-10 border-2 ${getQuestionColorClasses()}`}
                    onClick={() => {
                      handleSetCurrentPageIndex(index);
                    }}
                  >
                    <p className={`font-bold ${getTextColorClasses()}`}>
                      {index + 1}
                    </p>
                    {question.isMarkedForReview && (
                      <div className="absolute top-[-5px] right-[-10px]">
                        <BookmarkIcon />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
