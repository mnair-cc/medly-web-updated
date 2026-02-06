import { getGradeScale } from "@/app/(protected)/onboarding/_utils/gradeScales";
import { CourseType } from "@/app/types/types";
import ProgressBarWithAvatar from "./ProgressBarWithAvatar";

const GradePerformanceProgressBar = ({
  userMarks,
  maxMarks,
  cohortAveragePercentage,
  gradientBoundaries,
}: {
  userMarks: number;
  maxMarks: number;
  cohortAveragePercentage?: number;
  gradientBoundaries?: number[];
}) => {
  // Calculate user position as percentage from userMarks/maxMarks
  const userPositionPercentage =
    maxMarks > 0 &&
    userMarks !== undefined &&
    userMarks !== null &&
    !isNaN(userMarks)
      ? (userMarks / maxMarks) * 100
      : 0;

  // Don't render if cohort average is not provided
  if (
    cohortAveragePercentage === undefined ||
    cohortAveragePercentage === null
  ) {
    return null;
  }

  // Use cohort average percentage directly (already converted to 0-100 scale in parent)
  const averagePositionPercentage = cohortAveragePercentage;

  return (
    <ProgressBarWithAvatar
      userPosition={userPositionPercentage}
      averagePosition={averagePositionPercentage}
      showGradient={true}
      gradientBoundaries={gradientBoundaries}
      animationDelay={200} // Start first in the sequence
    />
  );
};

const GradePerformance = ({
  grade,
  userMarks,
  timeTaken,
  paperDurationMinutes,
  timeStarted,
  maxMarks,
  course,
  examBoard,
  cohortAveragePercentage,
  gradientBoundaries,
}: {
  grade: string;
  userMarks: number;
  timeTaken: string;
  paperDurationMinutes: number | null;
  timeStarted?: string | null;
  maxMarks: number;
  course?: string;
  examBoard?: string;
  cohortAveragePercentage?: number;
  gradientBoundaries?: number[];
}) => {
  // Calculate percentage from userMarks/maxMarks
  const percentage =
    maxMarks > 0 &&
    userMarks !== undefined &&
    userMarks !== null &&
    !isNaN(userMarks)
      ? Math.round((userMarks / maxMarks) * 100)
      : 0;

  // Determine grade color based on percentage and gradient boundaries
  // Colors: yellow (#F8C856), green (#8ADB00), blue (#06B0FF)
  const getGradeColor = (): string => {
    if (!gradientBoundaries || gradientBoundaries.length < 3) {
      return "#7CC500"; // Default green if no boundaries
    }

    const userPercentage = maxMarks > 0 ? (userMarks / maxMarks) * 100 : 0;

    if (userPercentage < gradientBoundaries[1]) {
      return "#F8C856"; // Yellow
    } else if (userPercentage < gradientBoundaries[2]) {
      return "#8ADB00"; // Green
    } else {
      return "#06B0FF"; // Blue
    }
  };

  const gradeColor = getGradeColor();

  // Check if time exceeded paper duration
  const getDisplayTime = (): { displayTime: string; isExceeded: boolean } => {
    if (!paperDurationMinutes || !timeStarted) {
      return { displayTime: timeTaken, isExceeded: false };
    }

    // Parse timeTaken to get total minutes
    const timeParts = timeTaken.split(":");
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = parseInt(timeParts[2]);
    const totalMinutesTaken = hours * 60 + minutes + seconds / 60;

    // Check if exceeded
    if (totalMinutesTaken > paperDurationMinutes) {
      // Format paper duration as H:MM:SS
      const durationHours = Math.floor(paperDurationMinutes / 60);
      const durationMinutes = Math.floor(paperDurationMinutes % 60);
      const durationSeconds = Math.round((paperDurationMinutes % 1) * 60);

      return {
        displayTime: `${durationHours}:${durationMinutes.toString().padStart(2, "0")}:${durationSeconds.toString().padStart(2, "0")}`,
        isExceeded: true,
      };
    }

    return { displayTime: timeTaken, isExceeded: false };
  };

  const { displayTime, isExceeded } = getDisplayTime();

  return (
    <div className="py-2">
      <div className="border-y border-[#00000014] pt-6 pb-12">
        <div className="flex flex-row items-center justify-between mb-12">
          <div className="flex flex-col gap-2">
            <h1
              className="text-6xl font-rounded-black"
              style={{ color: gradeColor }}
            >
              {grade}
            </h1>
            <p className="text-sm font-rounded-bold text-[#00000066]">
              Your Estimated Grade
            </p>
          </div>
          <div>
            <ul className="flex flex-col gap-2">
              <li className="flex flex-row items-center justify-between gap-8">
                <p className="text-sm font-rounded-bold text-[#00000066]">
                  Raw Marks
                </p>
                <p className="text-sm font-rounded-bold text-[#00000080]">
                  {userMarks ?? 0}/{maxMarks}
                </p>
              </li>
              <li className="flex flex-row items-center justify-between gap-8">
                <p className="text-sm font-rounded-bold text-[#00000066]">
                  Percentage
                </p>
                <p className="text-sm font-rounded-bold text-[#00000080]">
                  {percentage}%
                </p>
              </li>
              <li className="flex flex-row items-center justify-between gap-8">
                <p className="text-sm font-rounded-bold text-[#00000066]">
                  Time Taken
                </p>
                <p className="text-sm font-rounded-bold text-[#00000080]">
                  {isExceeded && ">"}
                  {displayTime}
                </p>
              </li>
            </ul>
          </div>
        </div>
        <GradePerformanceProgressBar
          userMarks={userMarks}
          maxMarks={maxMarks}
          cohortAveragePercentage={cohortAveragePercentage}
          gradientBoundaries={gradientBoundaries}
        />
      </div>
    </div>
  );
};

export default GradePerformance;
