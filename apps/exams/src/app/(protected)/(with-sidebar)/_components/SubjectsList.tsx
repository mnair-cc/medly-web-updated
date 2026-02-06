import { CourseWithExamBoards, Subject } from "@/app/types/types";
import AddSubjectCard from "./AddSubjectCard";
import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

function SubjectsList({
  courses,
  selectedSubjects,
  removeSubjectFromSelectedSubjects,
  addSubjectToSelectedSubjects,
}: {
  courses: CourseWithExamBoards[];
  selectedSubjects: string[];
  removeSubjectFromSelectedSubjects: (subject: Subject) => void;
  addSubjectToSelectedSubjects: (subject: Subject) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Split search term into individual terms for filtering
  const searchTerms = searchTerm
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Filter function that checks if a subject matches the search terms
  const matchesSearch = (
    subject: Subject,
    courseName: string,
    examBoardName: string
  ) => {
    if (searchTerms.length === 0) return true;

    // Normalize courseName to handle "a-level" variations
    let normalizedCourseName = courseName.toLowerCase();
    if (normalizedCourseName === "a-level") {
      normalizedCourseName = "a level alevel a-level a2 as";
    }

    const searchableText =
      `${examBoardName} ${normalizedCourseName} ${subject.title}`.toLowerCase();

    // Check if every search term is included in the searchable text
    return searchTerms.every((term) => searchableText.includes(term));
  };

  return (
    <div className="flex flex-col w-full">
      {/* Search input */}
      <div className="mb-6 relative">
        <div className="md:w-[480px]">
          <input
            type="text"
            placeholder="Search subjects (e.g. AQA GCSE Biology)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 border rounded-full focus:outline-none "
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="overflow-y-scroll">
        {courses
          .filter((course) => course.name !== "AP (Advanced Placement)")
          .map((course: CourseWithExamBoards, courseIndex: number) => {
            // Get visible exam boards after filtering
            const visibleExamBoards = course.examBoards
              .map((examBoard) => {
                // Filter subjects based on search
                const filteredSubjects = examBoard.subjects.filter((subject) =>
                  matchesSearch(
                    subject,
                    course.name,
                    examBoard.name !== "AP" ? examBoard.name : ""
                  )
                );

                return {
                  ...examBoard,
                  filteredSubjects,
                };
              })
              .filter((examBoard) => examBoard.filteredSubjects.length > 0);

            // Only render the course if it has visible exam boards after filtering
            if (visibleExamBoards.length === 0) return null;

            return (
              <div key={courseIndex} className="w-full overflow-hidden">
                {visibleExamBoards.map((examBoard, examBoardIndex) => (
                  <div
                    key={examBoardIndex}
                    className={`flex flex-col w-full rounded-md text-black mb-8`}
                  >
                    <div
                      className={`flex flex-row items-center w-full text-[16px] font-medium mb-2`}
                    >
                      <div className="flex flex-row items-center md:w-6/12 mb-2 text-xl font-heavy">
                        {examBoard.name !== "AP" &&
                          examBoard.name !== "IB" &&
                          `${examBoard.name} `}
                        {course.name}
                      </div>
                    </div>

                    <div className="flex md:flex-wrap gap-4 overflow-x-scroll py-1">
                      {examBoard.filteredSubjects.map(
                        (subject: Subject, subjectIndex) => (
                          <AddSubjectCard
                            key={subjectIndex}
                            subject={subject}
                            courseName={course.name}
                            examBoardName={
                              examBoard.name !== "AP"
                                ? `${examBoard.name} `
                                : ""
                            }
                            isSelected={selectedSubjects.includes(
                              subject.legacyId
                            )}
                            onClick={() => {
                              if (selectedSubjects.includes(subject.legacyId)) {
                                removeSubjectFromSelectedSubjects(subject);
                              } else {
                                addSubjectToSelectedSubjects(subject);
                              }
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default SubjectsList;
