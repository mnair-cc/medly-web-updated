import MockPanelBanner from "./MockPanelBanner";
import MockCountdown from "./MockCountdown";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PapersList, { PapersListExam } from "../PapersList";
import CircularProgressBar from "@/app/_components/CircularProgressBar";
import LockIcon from "@/app/_components/icons/LockIcon";
import { getMockSubjectDate } from "@/app/(protected)/mocks/_utils/utils";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import moment from "moment-timezone";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useMocksData } from "@/app/_hooks/useMocksData";
import type {
  MocksData,
  CohortDistribution,
} from "@/app/_components/sidebar/_lib/mocks.types";
import { useSidebar } from "@/app/_components/sidebar/SidebarLayoutClient";

interface MockPanelProps {
  subjectId?: string | null;
  initialMocksData: MocksData | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MockPanel = ({
  subjectId: _subjectId,
  initialMocksData,
}: MockPanelProps) => {
  const { hasActivePlan } = useHasActivePlan();
  const { closeSidebar } = useSidebar();
  const pathname = usePathname();

  // Extract current paper ID from URL (e.g., /subjects/.../mocks/{paperId} or /subjects/.../papers/{paperId})
  const currentPaperId =
    pathname.match(/\/(mocks|papers)\/([^/]+)/)?.[2] || null;

  // Use React Query with server-provided initial data
  const { mocksData } = useMocksData(initialMocksData);

  // Get mock dates state
  const { isAfterResultsDay, isAfterMocksEnd } = useMockDates();

  // Check if registration/editing is available (before mocks end)
  const isRegistrationAvailable = !isAfterMocksEnd;

  // Helper function to get grade color based on gradient boundaries from resultsDayInsights
  // Colors from ProgressBarWithAvatar: yellow (#F8C856), green (#8ADB00), blue (#06B0FF)
  // Uses EXACT same logic as GradePerformance.tsx to match the results modal
  const getGradeColor = (
    userMarks?: number,
    maxMarks?: number,
    cohortDistribution?: CohortDistribution
  ): string => {
    // If we have no cohort distribution data, use yellow (low performance color)
    // This handles U grades and papers without proper cohort data
    if (!cohortDistribution) {
      return "#F8C856"; // Yellow for papers without cohort data
    }

    if (!maxMarks || maxMarks === 0) {
      return "#ABABAB"; // Gray if no max marks
    }

    const userPercentage = ((userMarks || 0) / maxMarks) * 100;

    // Convert cohortDistribution to gradient boundaries array [lower, middle, upper]
    const gradientBoundaries = [
      cohortDistribution.lower,
      cohortDistribution.middle,
      cohortDistribution.upper,
    ];

    // Exact same logic as GradePerformance.tsx:
    // if (userPercentage < gradientBoundaries[1]) return Yellow
    // else if (userPercentage < gradientBoundaries[2]) return Green
    // else return Blue
    if (userPercentage < gradientBoundaries[1]) {
      return "#F8C856"; // Yellow - below middle boundary
    } else if (userPercentage < gradientBoundaries[2]) {
      return "#8ADB00"; // Green - between middle and upper
    } else {
      return "#06B0FF"; // Blue - upper and above
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 pb-8 mt-0">
          {!isAfterResultsDay && <MockCountdown />}

          <MockPanelBanner isAfterResultsDay={isAfterResultsDay} />
        </div>

        <div className="flex flex-col border-t border-[#F2F2F7]">
          {/* Mock Papers List (reusing PapersList) */}
          {mocksData?.isRegistered && mocksData.exams.length > 0 ? (
            <div className="py-4">
              <PapersList
                onItemClick={closeSidebar}
                exams={[...mocksData.exams]
                  // Pre-compute dates before sorting to avoid unstable sort
                  // (getMockSubjectDate returns moment() which changes between calls)
                  .map((exam) => ({
                    exam,
                    sortDate: getMockSubjectDate(exam.title).valueOf(),
                  }))
                  .sort((a, b) => {
                    const dateComparison = a.sortDate - b.sortDate;
                    // Use title as tiebreaker for stable sorting when dates are equal
                    // (e.g., when testing with any_subject_day PostHog scenario)
                    if (dateComparison === 0) {
                      return a.exam.title.localeCompare(b.exam.title);
                    }
                    return dateComparison;
                  })
                  .map(({ exam }): PapersListExam => {
                    // Get the subject date and format it
                    const subjectDate = getMockSubjectDate(exam.title);
                    const dateLabel = subjectDate.format("dddd, D MMM");

                    // Check if mock is available (within 24-hour window or after results day)
                    const nowLondon = moment.tz("Europe/London");
                    const subjectEnd = subjectDate
                      .clone()
                      .add(24, "hours")
                      .subtract(1, "second");
                    const isWithinWindow =
                      nowLondon.isSameOrAfter(subjectDate) &&
                      nowLondon.isSameOrBefore(subjectEnd);
                    const isActive = isAfterResultsDay || isWithinWindow;

                    return {
                      title: exam.title,
                      headerLabel:
                        `${exam.board || ""} ${exam.series?.toUpperCase() || ""}`.trim(),
                      dateLabel,
                      isActive,
                      items: exam.papers.map((paper) => {
                        const subjectId = exam.subjectId || "";

                        // Progress is now embedded in the paper object
                        const progressPercent =
                          paper.totalQuestions > 0
                            ? Math.round(
                                (paper.questionsAnswered /
                                  paper.totalQuestions) *
                                  100
                              )
                            : 0;

                        // Determine href based on whether mock has a grade, user has premium, and if after results day
                        // Before results day: always use /mocks/ route
                        // After results day:
                        //   - If has grade: link to /mocks/ route (review mode)
                        //   - If no grade and no premium: link to plan page
                        //   - If no grade and has premium: link to /papers/ route (can attempt)
                        const mockHref = !isAfterResultsDay
                          ? `/subjects/${subjectId}/mocks/${paper.paperId}`
                          : paper.grade
                            ? `/subjects/${subjectId}/mocks/${paper.paperId}`
                            : !hasActivePlan
                              ? "/plan"
                              : `/subjects/${subjectId}/papers/${paper.paperId}`;

                        return {
                          key: paper.paperId,
                          label: paper.number,
                          href: mockHref,
                          isActive: paper.paperId === currentPaperId,
                          right: isAfterResultsDay ? (
                            // After results day: Show grade if calculated, LockIcon if no grade (and no premium), progress bar otherwise
                            paper.grade ? (
                              <div className="px-3 py-1 rounded-full border border-[#0000000F] text-[#ABABAB] text-[13px] font-rounded-bold flex flex-row items-center gap-1.5">
                                <div
                                  className="w-[8px] h-[8px] rounded-full"
                                  style={{
                                    backgroundColor: getGradeColor(
                                      paper.userMarks,
                                      paper.maxMarks,
                                      paper.cohortDistribution
                                    ),
                                  }}
                                />
                                Grade {paper.grade}
                              </div>
                            ) : !hasActivePlan ? (
                              <LockIcon fill="#ABABAB" />
                            ) : (
                              <CircularProgressBar
                                progress={progressPercent}
                                size={18}
                                strokeWidth={3}
                              />
                            )
                          ) : (
                            <CircularProgressBar
                              progress={progressPercent}
                              size={18}
                              strokeWidth={3}
                            />
                          ),
                        };
                      }),
                    };
                  })}
              />

              {/* Edit Registered Mocks Button - only show before mocks end */}
              {isRegistrationAvailable && (
                <div className="text-center py-4">
                  <Link href="/mocks/register">
                    <button className="px-4 py-2 rounded-full text-[15px] text-[black] bg-[#F2F2F7] hover:bg-[#F2F2F7]/80 font-rounded-semibold">
                      Edit Exams
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Register for Mocks Button - only show before mocks end */}
              {isRegistrationAvailable && (
                <div className="text-center py-8 px-4">
                  <Link href="/mocks/register">
                    <button className="px-4 py-2 rounded-full text-[15px] text-[black] bg-[#F2F2F7] hover:bg-[#F2F2F7]/80 font-rounded-semibold">
                      Register for Mocks
                    </button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockPanel;
