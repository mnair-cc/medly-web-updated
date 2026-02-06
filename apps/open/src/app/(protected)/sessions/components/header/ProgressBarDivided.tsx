import { useUser } from "@/app/_context/UserProvider";
import {
  MockPage,
  SessionType,
  QuestionSessionPageType,
} from "@/app/(protected)/sessions/types";
import { QuestionGroup, QuestionWithMarkingResult } from "@/app/types/types";

const ProgressBarDivided = ({
  currentPageIndex,
  handleSetCurrentPageIndex,
  pages,
  hasStarted,
  sessionType,
  isResultsModalOpen = false,
}: {
  currentPageIndex: number;
  handleSetCurrentPageIndex: (index: number) => void;
  pages: MockPage[];
  hasStarted: boolean;
  sessionType: SessionType;
  isResultsModalOpen?: boolean;
}) => {
  const { user } = useUser();
  const avatar = user?.avatar;

  const getProgressBarColor = (page: MockPage) => {
    // Only apply colors for question pages that have been marked
    if (page.type !== QuestionSessionPageType.Question) {
      return "#00AEFF"; // Default blue for non-question pages
    }

    const questionGroup = page.content as QuestionGroup;
    const questions = questionGroup.questions as QuestionWithMarkingResult[];

    // Check if all questions are marked
    const allMarked = questions.every((q) => q.userMark !== undefined);
    if (!allMarked) {
      return "#00AEFF"; // Default blue if not all marked
    }

    // Calculate marking status
    const isAllCorrect = questions.every((q) => q.userMark === q.maxMark);
    const isAllIncorrect = questions.every((q) => q.userMark === 0);

    if (isAllCorrect) {
      return "#7CC500"; // Green
    } else if (isAllIncorrect) {
      return "#FF4B4C"; // Red
    } else {
      return "#FFA935"; // Orange for partial
    }
  };

  return (
    <div className="flex gap-2 w-full">
      {pages.map((page, index) => {
        return (
          <button
            onClick={() => {
              handleSetCurrentPageIndex(index);
            }}
            key={index}
            className={`h-3 rounded-full flex-1 relative ${
              page.type !== "question" ? "max-w-12" : ""
            }  ${index !== currentPageIndex ? "bg-[#F2F2F7]" : ""}`}
            disabled={
              !hasStarted ||
              sessionType === SessionType.PracticeSession ||
              isResultsModalOpen
            }
          >
            {index === currentPageIndex && (
              <div className="absolute inset-[-5px] rounded-full border-2 border-[#B4E7FF]"></div>
            )}
            <div
              className={`h-full rounded-full ${
                index === currentPageIndex ? "bg-[#F2F2F7]" : ""
              } relative`}
            >
              <div
                className="h-full rounded-full absolute top-0 left-0"
                style={{
                  width: `${
                    page.type !== "question" && hasStarted ? 100 : page.progress
                  }%`,
                  backgroundColor: "#00AEFF",
                }}
              />
              {avatar && index === currentPageIndex && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-4xl z-[1000]"
                  style={{
                    left: `${Math.max(10, Math.min(page.progress, 95))}%`,
                  }}
                >
                  {avatar}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProgressBarDivided;
