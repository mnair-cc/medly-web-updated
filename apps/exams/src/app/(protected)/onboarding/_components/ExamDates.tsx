import { OnboardingSubject } from "../types";
import { useExamDatesForSubjects } from "@/app/_hooks/useExamDatesForSubjects";
import moment from "moment";
import { useMemo } from "react";

const ExamDates = ({
  selectedSubjects,
}: {
  selectedSubjects: OnboardingSubject[];
}) => {
  // Extract legacy IDs from selected subjects - memoized to prevent infinite loops
  const subjectLegacyIds = useMemo(
    () => selectedSubjects.map((subject) => subject.legacyId),
    [selectedSubjects]
  );

  // Fetch exam dates for all selected subjects
  const { data: subjectsWithExams, isLoading } =
    useExamDatesForSubjects(subjectLegacyIds);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 gap-4 mt-16 text-center">
        <p>Loading exam dates...</p>
      </div>
    );
  }

  if (selectedSubjects.length === 0) {
    return (
      <div className="flex flex-col flex-1 gap-4 mt-16 text-center">
        <p>No subjects selected</p>
      </div>
    );
  }

  // Flatten all exams from all subjects with subject info
  const allExams = (subjectsWithExams || [])
    .flatMap((subject) =>
      subject.exams.flatMap((exam) =>
        exam.papers.map((paper) => ({
          id: `${subject.id}-${exam.id}-${paper.id}`,
          subjectTitle: subject.title,
          examBoard: subject.examBoard,
          course: subject.course,
          paperNumber: paper.number,
          date: paper.date,
        }))
      )
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date

  if (allExams.length === 0) {
    return (
      <div className="flex flex-col flex-1 gap-4 mt-16 text-center">
        <p className="text-center">
          No exam dates available for your selected subjects
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 gap-4 mt-8 max-w-sm mx-auto">
      {allExams.map((exam) => (
        <div
          className="flex gap-4 border border-gray-100 rounded-2xl px-4 py-4"
          key={exam.id}
        >
          <div className="flex flex-col justify-center items-center w-16">
            <p className="text-[#FF4B4C] text-xs font-medium">
              {moment(exam.date).format("MMM").toUpperCase()}
            </p>
            <p className="font-rounded-heavy text-4xl">
              {moment(exam.date).format("D")}
            </p>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[#000000]/50">
              {exam.examBoard} {exam.course}
            </p>
            <p className="text-lg font-extrabold font-rounded">
              {exam.subjectTitle} {exam.paperNumber}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamDates;
