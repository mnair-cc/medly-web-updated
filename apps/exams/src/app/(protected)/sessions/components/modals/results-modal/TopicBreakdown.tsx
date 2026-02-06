import ProgressBarWithAvatar from "./ProgressBarWithAvatar";
import type { TopicBreakdown } from "@/app/(protected)/sessions/types";
import { useUser } from "@/app/_context/UserProvider";

const TopicProgressBar = ({
  score,
  averageScore,
  animationDelay = 0,
}: {
  score: number;
  averageScore: number;
  animationDelay?: number;
}) => {
  return (
    <ProgressBarWithAvatar
      userPosition={score}
      averagePosition={averageScore}
      background="#F2F2F7"
      progressColor="#7CC500"
      className="mt-2"
      animationDelay={animationDelay}
    />
  );
};

const TopicBreakdown = ({
  topicsBreakdown = [],
  subjectTitle,
  subjectCourse,
  gcseHigher,
}: {
  topicsBreakdown?: TopicBreakdown[];
  subjectTitle?: string;
  subjectCourse?: string;
  gcseHigher?: boolean;
}) => {
  const { user } = useUser();

  // If no data provided, don't render anything
  if (!topicsBreakdown || topicsBreakdown.length === 0) {
    return null;
  }

  // Generate title with subject name and level if applicable
  const generateTitle = () => {
    if (!subjectTitle) return "Topic Performance";

    // Add Higher/Foundation for GCSE subjects only
    if (subjectCourse === "GCSE" && gcseHigher !== undefined) {
      const level = gcseHigher ? "Higher" : "Foundation";
      return `${subjectTitle} ${level}`;
    }

    return subjectTitle;
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="font-rounded-heavy text-2xl">{generateTitle()}</div>
      <p className="text-sm text-[#00000066]">
        A topic breakdown, benchmarked against other Year {user?.year || 10}s.
      </p>
      <div className="p-6 border border-[#F2F2F7] rounded-[24px] flex flex-col gap-6 mt-4">
        {topicsBreakdown.map((topic, index) => {
          // Calculate percentage from userMarks/maxMarks
          const percentage =
            topic.maxMarks > 0 &&
            topic.userMarks !== undefined &&
            topic.userMarks !== null &&
            !isNaN(topic.userMarks)
              ? Math.round((topic.userMarks / topic.maxMarks) * 100)
              : 0;

          // Calculate cohort average as percentage
          const cohortAveragePercentage =
            topic.maxMarks > 0 &&
            topic.cohortAverage !== undefined &&
            topic.cohortAverage !== null &&
            !isNaN(topic.cohortAverage)
              ? (topic.cohortAverage / topic.maxMarks) * 100
              : 0;

          return (
            <div key={topic.topicLegacyId} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-rounded-bold text-sm text-[#595959]">
                  {topic.topicTitle}
                </span>
                <span className="font-rounded-bold text-sm text-[#ABABAB]">
                  {percentage}%
                </span>
              </div>
              <TopicProgressBar
                score={percentage}
                averageScore={cohortAveragePercentage}
                animationDelay={600 + index * 200} // Start after GradePerformance (200ms) + 400ms gap + stagger
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopicBreakdown;
