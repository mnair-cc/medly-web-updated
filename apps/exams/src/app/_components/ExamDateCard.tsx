import ClockIcon from "@/app/_components/icons/ClockIcon";
import Link from "next/link";
import moment from "moment";
import LockIcon from "@/app/_components/icons/LockIcon";
import { Exam, Paper } from "@/app/types/types";
import { paperIdToSubjectId } from "../_lib/utils/utils";
import { useHasActivePlan } from "@/app/_context/PlanProvider";
import { useTracking } from "../_lib/posthog/useTracking";
import { useMockDates } from "@/app/(protected)/mocks/_hooks/useMockDates";
import { PaperInsight } from "../(protected)/mocks/_types/types";

const calculateTimeLeft = (dateString: string): string => {
  const paperDate = moment(dateString);
  const isToday = paperDate.isSame(moment(), "day");
  const deadlineDate = isToday
    ? moment(paperDate).endOf("day")
    : moment(paperDate).startOf("day");

  const now = moment();
  const diffHours = deadlineDate.diff(now, "hours");

  if (diffHours <= 0) return "0h";

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    return `${days}d ${hours}h`;
  }

  return `${diffHours}h`;
};

// Button Components
const StartButton = ({
  href,
  onClick,
}: {
  href: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className="rounded-full px-5 py-2.5 flex items-center justify-center text-sm font-medium bg-special text-white relative"
  >
    Start
  </Link>
);

const StartProButton = ({
  href,
  onClick,
}: {
  href: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className="rounded-full px-5 py-2.5 flex items-center justify-center text-sm font-medium bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white shadow-[0_0_10px_rgba(255,215,0,0.3)] relative"
  >
    Start
    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded ml-2">
      PRO
    </span>
  </Link>
);

const UpgradeButton = ({ onClick }: { onClick: () => void }) => (
  <Link
    href="/plan"
    onClick={onClick}
    className="rounded-full px-5 py-2.5 flex items-center justify-center text-sm font-medium bg-[#FFA935] text-white relative"
  >
    Upgrade to access
  </Link>
);

const ReviewButton = ({
  href,
  onClick,
}: {
  href: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className="rounded-full px-5 py-2.5 flex items-center justify-center text-sm font-medium bg-[#4549F3] text-white relative"
  >
    Review paper
  </Link>
);

const MarkingInProgressButton = ({ isToday }: { isToday: boolean }) => (
  <div
    className={`rounded-full px-3 pr-4 py-2 flex items-center justify-center text-sm font-medium ${
      isToday ? "bg-[#FDEBD7] text-[#FFA935]" : "bg-[#FFA935]/50 text-white/70"
    } cursor-not-allowed relative`}
  >
    • Marking in progress
  </div>
);

const ReleasesInButton = ({ timeLeft }: { timeLeft: string }) => (
  <div className="rounded-full px-3 pr-4 py-2 flex items-center justify-center text-sm font-medium bg-white/30 text-white/70 cursor-not-allowed relative">
    <LockIcon fill="white" />
    Releases in {timeLeft}
  </div>
);

const ResultsDayStartButton = ({
  href,
  onClick,
}: {
  href: string;
  onClick: () => void;
}) => (
  <Link
    href={href}
    // onClick={onClick}
    className="rounded-full px-5 py-2.5 flex items-center justify-center text-sm font-medium bg-white/30 text-white/70 relative cursor-not-allowed pointer-events-none"
  >
    Not attempted
  </Link>
);

const PaperButton = ({
  examDate,
  paper,
  hasActivePlan,
}: {
  examDate: Exam;
  paper: Paper;
  hasActivePlan: boolean;
}) => {
  const { track } = useTracking();
  const { isAfterResultsDay: isResultsDay } = useMockDates();
  const isToday = moment(examDate.papers[0].date).isSame(moment(), "day");
  const isPast = moment(paper.date).isBefore(moment(), "day");
  const subjectId = paperIdToSubjectId(paper.legacyId);
  const href = `/subjects/${subjectId}/mocks/${paper.legacyId}`;

  const handleClick = () => {
    track("mock_paper_clicked", {
      paper_id: paper.legacyId,
      action: paper.hasFinished ? "review" : "start",
    });
  };

  if (paper.hasFinished) {
    if (isResultsDay) {
      return <ReviewButton href={href} onClick={handleClick} />;
    }
    return <MarkingInProgressButton isToday={isToday} />;
  } else {
    if (isResultsDay) {
      return <ReviewButton href={href} onClick={handleClick} />;
    }
    return <MarkingInProgressButton isToday={isToday} />;
  }

  if (isResultsDay) {
    if (hasActivePlan) {
      return <ResultsDayStartButton href={href} onClick={handleClick} />;
    }
    return <UpgradeButton onClick={handleClick} />;
  }

  if (isToday) {
    return <StartButton href={href} onClick={handleClick} />;
  }

  if (isPast) {
    if (hasActivePlan) {
      return <StartProButton href={href} onClick={handleClick} />;
    }
    return <UpgradeButton onClick={handleClick} />;
  }

  return <ReleasesInButton timeLeft={calculateTimeLeft(paper.date)} />;
};

const ExamDateCard = ({
  examDate,
  paperInsight,
}: {
  examDate: Exam;
  paperInsight?: PaperInsight[];
}) => {
  const { isAfterResultsDay: isResultsDay } = useMockDates();
  const isToday = moment(examDate.papers[0].date).isSame(moment(), "day");
  const { hasActivePlan } = useHasActivePlan();

  return (
    <div
      className={`rounded-xl p-3 w-full text-white backdrop-blur-md ${
        isToday ? "bg-special" : "bg-white/20"
      }`}
    >
      <div className="flex flex-col sm:flex-row justify-start w-full sm:items-center text-white px-2 mb-2">
        <h4 className="text-md font-semibold">{examDate.title}</h4>
        <div className="flex flex-wrap items-center flex-1">
          {!isResultsDay && (
            <>
              <p className="hidden sm:block text-sm mx-2">•</p>
              <p className="text-sm">
                {moment(examDate.papers[0].date).format("dddd Do MMMM")}
              </p>
            </>
          )}
          {moment(examDate.papers[0].date).isSame(moment(), "day") ? (
            <p className="text-sm flex flex-row items-center ml-auto">
              {isToday && (
                <>
                  <ClockIcon /> {calculateTimeLeft(examDate.papers[0].date)}{" "}
                  left to attempt
                </>
              )}
            </p>
          ) : examDate.papers[0].hasFinished && !isResultsDay ? (
            <p className="text-sm flex flex-row items-center ml-auto">
              <ClockIcon /> Marking in progress
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={`flex flex-col items-center rounded-xl gap-3 py-3 px-4  ${
          isToday ? "bg-white text-black" : "bg-white/20 text-white"
        }`}
      >
        {examDate.papers.map((paper, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-2 sm:gap-0"
          >
            <div className="flex justify-center items-center gap-2">
              <p className="text-sm font-medium">
                {paper.number}
                {!isResultsDay && <>- {paper.duration}</>}
              </p>
              {isResultsDay &&
                paperInsight &&
                (() => {
                  const insight = paperInsight.find(
                    (i) => i.paperId === paper.legacyId
                  );
                  return insight && insight.percentage > 0;
                })() && (
                  <div
                    className={`rounded-full ${
                      true ? "bg-[#E4FFB7] text-[#7CC500]" : "transparent"
                    } px-5 py-2.5 text-sm font-medium`}
                  >
                    {true
                      ? `${(() => {
                          const insight = paperInsight.find(
                            (i) => i.paperId === paper.legacyId
                          );
                          const grade = insight?.grade || 0;
                          const percentage = insight?.percentage || 0;
                          return (
                            "Grade " +
                            grade +
                            " (" +
                            Math.round(percentage) +
                            "%)"
                          );
                        })()}`
                      : ""}
                    {/* {paper.hasFinished
                    ? `${(() => {
                      const insight = paperInsight.find(i => i.paperId === paper.legacyId);
                      const percentage = insight?.percentage || 0;
                      return percentage < 40 ? "Paper not finished" : Math.round(percentage) + "%";
                    })()}`
                    : ""} */}
                  </div>
                )}
            </div>
            <div className="w-full sm:w-auto">
              <PaperButton
                examDate={examDate}
                paper={paper}
                hasActivePlan={hasActivePlan}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExamDateCard;
