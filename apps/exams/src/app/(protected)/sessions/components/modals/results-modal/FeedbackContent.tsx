import React from "react";
import moment from "moment";
import Link from "next/link";
import {
  PostMockInsights,
  ResultsDayInsights,
  MockPage,
  CoverContent,
} from "@/app/(protected)/sessions/types";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import GradePerformance from "./GradePerformance";
import TopicBreakdown from "./TopicBreakdown";
import AccoladeBadge from "./AccoladeBadge";

interface FeedbackContentProps {
  initialInsights?: PostMockInsights;
  resultsDayInsights?: ResultsDayInsights;
  shouldShowResultsData: boolean;
  pages: MockPage[];
  timeStarted?: string | null;
  timeFinished?: string | null;
  derivedGcseHigher?: boolean;
}

const FeedbackContent = ({
  initialInsights,
  resultsDayInsights,
  shouldShowResultsData,
  pages,
  timeStarted,
  timeFinished,
  derivedGcseHigher,
}: FeedbackContentProps) => {
  // Get mock dates for fallback time calculation
  const { mocksEnd } = useMockDates();

  // Get course and examBoard from pages data
  const coverContent = pages[0]?.content as CoverContent;
  const course = coverContent?.course || "";
  const examBoard = coverContent?.examBoard || "";

  // Calculate time taken in hours:minutes:seconds format using moment
  const calculateTimeTaken = (): string => {
    if (!timeStarted) return "0:00:00";

    const startTime = moment(timeStarted);

    // Use timeFinished if available, otherwise use end of mock period
    const endTime = timeFinished ? moment(timeFinished) : mocksEnd;

    const duration = moment.duration(endTime.diff(startTime));

    // Get hours, minutes, and seconds
    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    // Format as H:MM:SS
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const timeTaken = calculateTimeTaken();

  // Get paper duration in minutes from cover content
  const paperDurationMinutes = coverContent?.time
    ? parseInt(coverContent.time)
    : null;

  // Use resultsDayInsights after results day, fallback to initialInsights
  const insightsData =
    shouldShowResultsData && resultsDayInsights
      ? resultsDayInsights
      : initialInsights;

  return (
    <div className="flex flex-col gap-16 w-full">
      {/* Level and Summary - use resultsDayInsights after results day */}
      <div className="w-full bg-[#FBFBFD] rounded-[24px] p-6 flex flex-col space-y-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col ">
            <p className="text-[15px] text-[#818181]">Your level</p>
            <div className="font-rounded-heavy text-2xl">
              {insightsData?.level || "Processing..."}
            </div>
          </div>
          {/* Accolade badge only after results day and if accolade data exists */}
          {shouldShowResultsData && resultsDayInsights?.percentileAccolade && (
            <AccoladeBadge position={resultsDayInsights.percentileAccolade} />
          )}
        </div>

        {/* Grade performance only after results day */}
        {shouldShowResultsData && (
          <GradePerformance
            grade={resultsDayInsights?.grade || "U"}
            userMarks={resultsDayInsights?.userMarks ?? 0}
            timeTaken={timeTaken}
            paperDurationMinutes={paperDurationMinutes}
            timeStarted={timeStarted}
            maxMarks={resultsDayInsights?.maxMarks ?? 0}
            course={course}
            examBoard={examBoard}
            cohortAveragePercentage={
              resultsDayInsights?.cohortDistribution?.middle ?? 50
            }
            gradientBoundaries={[
              resultsDayInsights?.cohortDistribution?.lower ?? 0,
              resultsDayInsights?.cohortDistribution?.middle ?? 50,
              resultsDayInsights?.cohortDistribution?.upper ?? 100,
            ]}
          />
        )}

        <p className="text-[15px]">
          {insightsData?.summary || "Insights are being generated..."}
        </p>
      </div>

      {shouldShowResultsData && (
        <TopicBreakdown
          topicsBreakdown={resultsDayInsights?.topicsBreakdown}
          subjectTitle={coverContent?.subject}
          subjectCourse={course}
          gcseHigher={derivedGcseHigher}
        />
      )}

      <div className="flex flex-col gap-4 w-full">
        <div className="font-rounded-heavy text-2xl">Your Strengths</div>
        <div className="flex flex-col gap-2">
          {(insightsData?.strengths || []).map((strength, index) => {
            const title = strength.lessonTitle || strength.topicTitle || "";
            return (
              <div
                key={`strength-${index}`}
                className="p-6 border border-[#F2F2F7] rounded-[24px] flex flex-row gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-[#ECFFCC] flex items-center justify-center font-rounded-bold text-[12px] text-[#7CC500] flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[15px] font-rounded-bold">{title}</div>
                  <div className="text-[15px]">{strength.feedback}</div>
                  {strength.lessonLegacyId && (
                    <Link
                      href={`/lessons/${strength.lessonLegacyId}/practice`}
                      className="flex flex-row items-center gap-1 text-[#00B8F5] font-rounded-bold text-[15px] hover:underline mt-2"
                    >
                      Practice {title}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div className="font-rounded-heavy text-2xl">Focus Areas</div>
        <div className="flex flex-col gap-2">
          {(insightsData?.improvements || []).map((improvement, index) => {
            const title =
              improvement.lessonTitle || improvement.topicTitle || "";
            return (
              <div
                key={`improvement-${index}`}
                className="p-6 border border-[#F2F2F7] rounded-[24px] flex flex-row gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-[#FDEBD7] flex items-center justify-center font-rounded-bold text-[12px] text-[#FF882B] flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-[15px] font-rounded-bold">{title}</div>
                  <div className="text-[15px]">{improvement.feedback}</div>
                  {improvement.lessonLegacyId && (
                    <Link
                      href={`/lessons/${improvement.lessonLegacyId}/practice`}
                      className="flex flex-row items-center gap-1 text-[#00B8F5] font-rounded-bold text-[15px] hover:underline mt-2"
                    >
                      Practice {title}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeedbackContent;
