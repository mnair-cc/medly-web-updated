import { useState, useEffect, useMemo, useRef } from "react";
import { useAllSubjects } from "@/app/_hooks/useAllSubjects";
import { Subject } from "@/app/types/types";
import Spinner from "@/app/_components/Spinner";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";
import { getSubjectIconWithColor } from "@/app/_lib/utils/getSubjectIcon";
import { OnboardingData, OnboardingSubject } from "../types";
import { getSubjectTheme } from "@/app/_lib/utils/subjectTheme";

interface SubjectsSelectProps {
  onContinue: () => void;
  onboardingData: OnboardingData;
  handleAnswerChange: (
    fieldName: string,
    value: string | number | boolean | string[] | OnboardingSubject
  ) => void;
}

const SubjectsSelect = ({
  onContinue,
  onboardingData,
  handleAnswerChange,
}: SubjectsSelectProps) => {
  const { data: courses, isLoading: isLoadingCourses } = useAllSubjects();

  const [selectedCourse, setSelectedCourse] = useState("");
  const [modalSubject, setModalSubject] = useState<
    (Subject & { examBoard: string; courseName: string }) | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Use onboarding data for selected subjects
  const selectedSubjects = onboardingData.selectedSubjects || [];
  const selectedSubjectIds = selectedSubjects.map((s) => s.legacyId);

  // Extract available courses from the retrieved data
  const availableCourses = useMemo(
    () => courses?.map((course) => course.name) || [],
    [courses]
  );

  // Set the selected course based on year when data loads
  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      // Default based on user's year: 12/13 -> A-Level, else GCSE
      let defaultCourse = availableCourses[0];

      if (onboardingData.year === 12 || onboardingData.year === 13) {
        const aLevelCourse = availableCourses.find(
          (course) => course === "A-Level"
        );
        if (aLevelCourse) {
          defaultCourse = aLevelCourse;
        }
      } else {
        const gcseCourse = availableCourses.find((course) => course === "GCSE");
        if (gcseCourse) {
          defaultCourse = gcseCourse;
        }
      }

      setSelectedCourse(defaultCourse);
    }
  }, [availableCourses, selectedCourse, onboardingData.year]);

  // Get subjects for the selected course
  const currentCourseData = courses?.find(
    (course) => course.name === selectedCourse
  );
  const currentSubjects =
    currentCourseData?.examBoards.flatMap((board) =>
      board.subjects.map((subject) => ({
        ...subject,
        examBoard: board.name,
        courseName: currentCourseData.name,
      }))
    ) || [];

  // Remove duplicates by title within the current course
  const uniqueSubjects = currentSubjects.filter(
    (subject, index, self) =>
      index === self.findIndex((s) => s.title === subject.title)
  );

  // Helper functions to determine tier/level applicability
  const isScienceSubject = (subjectTitle: string) => {
    const t = subjectTitle.toLowerCase();
    if (t.includes("computer")) return false; // exclude Computer Science
    return (
      t.includes("biology") || t.includes("chemistry") || t.includes("physics")
    );
  };

  const isMathsSubject = (subjectTitle: string) => {
    const t = subjectTitle.toLowerCase();
    return t.includes("math"); // matches Math, Maths, Mathematics
  };

  const requiresTierSelection = (courseName: string, subjectTitle: string) => {
    if (courseName === "GCSE") {
      return isScienceSubject(subjectTitle) || isMathsSubject(subjectTitle);
    }
    return false;
  };

  // Get available exam boards for the modal subject
  const getAvailableExamBoards = (subjectTitle: string) => {
    if (!currentCourseData) return [];

    const examBoards: string[] = [];
    currentCourseData.examBoards.forEach((board) => {
      const hasSubject = board.subjects.some(
        (subject) => subject.title === subjectTitle
      );
      if (hasSubject) {
        examBoards.push(board.name);
      }
    });

    return examBoards;
  };

  const handleSubjectToggle = (
    subject: Subject & { examBoard: string; courseName: string },
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Calculate position for the modal
    const buttonRect = event.currentTarget.getBoundingClientRect();
    // Prefer placing below the button; flip above if near viewport bottom
    const approxPopupHeight = 160;
    let top = buttonRect.bottom + window.scrollY + 8;
    if (top + approxPopupHeight > window.scrollY + window.innerHeight) {
      top = buttonRect.top + window.scrollY - approxPopupHeight - 8;
      if (top < 8) top = 8;
    }
    // Clamp horizontally within viewport, accounting for popup width
    const estimatedPopupWidth = Math.min(320, window.innerWidth - 32);
    let left = buttonRect.left + window.scrollX;
    // If it would overflow to the right, pull it leftwards
    if (left + estimatedPopupWidth > window.scrollX + window.innerWidth - 16) {
      left = window.scrollX + window.innerWidth - estimatedPopupWidth - 16;
    }
    // Keep some padding from the left edge
    left = Math.max(16, left);

    setModalPosition({
      top,
      left,
    });

    // Determine if any board variant of this subject is already selected
    let selectedVariant: OnboardingSubject | null = null;
    if (currentCourseData) {
      // Find any subject legacyId for this title that is selected
      for (const board of currentCourseData.examBoards) {
        const match = board.subjects.find(
          (s) =>
            s.title === subject.title && selectedSubjectIds.includes(s.legacyId)
        );
        if (match) {
          // Find the corresponding saved onboarding subject to remove
          const existing = selectedSubjects.find(
            (os) => os.legacyId === match.legacyId
          );
          if (existing) {
            selectedVariant = existing;
            break;
          }
        }
      }
    }

    // If subject (any board) is already selected, remove it directly
    if (selectedVariant) {
      handleAnswerChange("selectedSubjects", selectedVariant);
      return;
    }

    // Reset modal selections for new subject
    setSelectedExamBoard("");
    setSelectedLevel("");

    // Show modal for exam board/level selection
    setModalSubject(subject);
    setIsModalOpen(true);
  };

  const handleExamBoardSelect = (examBoard: string) => {
    setSelectedExamBoard(examBoard);

    // Auto-confirm for anything that doesn't require level selection
    if (!modalSubject) return;
    const requiresLevel = requiresTierSelection(
      modalSubject.courseName,
      modalSubject.title
    );
    if (!requiresLevel) {
      handleModalConfirm(examBoard);
    }
  };

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);

    // If we have both exam board and level selected, auto-confirm
    if (selectedExamBoard) {
      handleModalConfirm(undefined, level);
    }
  };

  const handleModalConfirm = (examBoard?: string, level?: string) => {
    if (!modalSubject) return;

    // Use the passed values or fall back to the selected ones
    const finalExamBoard = examBoard || selectedExamBoard;
    const finalLevel = level || selectedLevel;

    // Resolve the correct legacyId for the chosen exam board + subject title
    let legacyIdToUse = modalSubject.legacyId;
    if (currentCourseData && finalExamBoard) {
      const board = currentCourseData.examBoards.find(
        (b) => b.name === finalExamBoard
      );
      const matchedSubject = board?.subjects.find(
        (s) => s.title === modalSubject.title
      );
      if (matchedSubject?.legacyId) {
        legacyIdToUse = matchedSubject.legacyId;
      }
    }

    // Add the subject with the selected exam board and gcseHigher flag
    const onboardingSubject: OnboardingSubject = {
      legacyId: legacyIdToUse,
      title: modalSubject.title,
      course: modalSubject.courseName,
      examBoard: finalExamBoard,
      gcseHigher:
        requiresTierSelection(modalSubject.courseName, modalSubject.title) &&
        finalLevel
          ? finalLevel === "Higher"
          : undefined,
    };
    handleAnswerChange("selectedSubjects", onboardingSubject);

    // Reset selections and close modal
    setSelectedExamBoard("");
    setSelectedLevel("");
    setModalSubject(null);
    setIsModalOpen(false);
  };

  const handleModalClose = () => {
    setSelectedExamBoard("");
    setSelectedLevel("");
    setModalSubject(null);
    setIsModalOpen(false);
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handleModalClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isModalOpen]);

  if (isLoadingCourses) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (!courses || courses?.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Could not find any subjects</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto px-4">
      {/* Course tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-1 bg-[#06B0FF1A] rounded-full p-1">
          {availableCourses.map((course) => {
            const isSelected = selectedCourse === course;
            let displayName = course;
            if (course === "A-Level") {
              displayName = "A Level";
            } else if (course === "IGCSE (International GCSE)") {
              displayName = "IGCSE";
            } else if (course === "IB (International Baccalaureate)") {
              displayName = "IB";
            }

            return (
              <button
                key={course}
                onClick={() => setSelectedCourse(course)}
                className={`px-4 py-2 rounded-full font-rounded-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-[#06B0FF] text-white"
                    : "bg-transparent text-[#06B0FF] hover:bg-[#06B0FF1A]"
                }`}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subjects grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 md:gap-4 sm:justify-center mb-24 sm:mb-8">
          {uniqueSubjects.map((subject) => {
            const isSelectedByTitle = (
              currentCourseData?.examBoards || []
            ).some((b) =>
              b.subjects.some(
                (s) =>
                  s.title === subject.title &&
                  selectedSubjectIds.includes(s.legacyId)
              )
            );
            const theme = getSubjectTheme(subject.title);

            return (
              <button
                key={subject.legacyId}
                onClick={(event) => handleSubjectToggle(subject, event)}
                className={`w-full sm:w-auto flex items-center justify-start text-left gap-2 rounded-[16px] px-3 py-3 sm:px-4 sm:py-3 font-rounded-semibold border border-gray-100 whitespace-nowrap text-[14px] sm:text-[15px] ${
                  isSelectedByTitle
                    ? "text-white"
                    : "bg-transparent text-black/80 hover:bg-[#000000]/5"
                }`}
                style={
                  isSelectedByTitle
                    ? { backgroundColor: theme.primaryColor }
                    : undefined
                }
              >
                <span className="inline-flex items-center justify-center shrink-0">
                  {getSubjectIconWithColor(
                    subject.title,
                    isSelectedByTitle ? "white" : undefined,
                    28,
                    28
                  )}
                </span>
                <span className="min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  {subject.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected subjects at bottom - fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] z-50">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Container with fixed height for 2 rows of subjects */}
          <div className="flex-1 relative">
            <div className="min-h-20 max-h-28 overflow-y-auto overscroll-y-contain">
              <div className="flex flex-wrap gap-2 content-start h-full">
                {selectedSubjects.map((onboardingSubject) => {
                  return (
                    <div
                      key={onboardingSubject.legacyId}
                      className="flex items-center gap-1 rounded-xl px-3 py-2 font-rounded-semibold bg-[#F2F2F7] max-w-full"
                    >
                      <span className="truncate max-w-[75vw] sm:max-w-[520px]">
                        {`${onboardingSubject.examBoard}${
                          onboardingSubject.examBoard === "IB" &&
                          onboardingSubject.course ===
                            "IB (International Baccalaureate)"
                            ? ""
                            : ` ${onboardingSubject.course}`
                        } ${onboardingSubject.title} ${
                          onboardingSubject.course === "GCSE" &&
                          onboardingSubject.gcseHigher !== undefined &&
                          onboardingSubject.gcseHigher !== null
                            ? onboardingSubject.gcseHigher
                              ? "Higher"
                              : "Foundation"
                            : ""
                        }`}
                      </span>
                      <button
                        onClick={() =>
                          handleAnswerChange(
                            "selectedSubjects",
                            onboardingSubject
                          )
                        }
                        className="text-gray-500 hover:text-gray-700 ml-1"
                      >
                        <CrossInCircleIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
          </div>

          <div className="w-full sm:w-[250px]">
            <PrimaryButtonClicky
              buttonText={`Confirm ${selectedSubjects.length} Subject${
                selectedSubjects.length !== 1 ? "s" : ""
              }`}
              onPress={onContinue}
              buttonState="filled"
              doesStretch={true}
              showKeyboardShortcut={false}
              disabled={selectedSubjects.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Exam Board Modal */}
      {modalSubject && isModalOpen && (
        <div
          ref={modalRef}
          className="absolute z-50 rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] p-4 sm:p-6 bg-white max-w-[90vw] sm:max-w-sm w-auto min-w-[260px] sm:min-w-[300px]"
          style={{
            top: modalPosition.top,
            left: modalPosition.left,
          }}
        >
          <h3 className="font-rounded-semibold">Choose your exam board</h3>
          <p className="text-black/50 text-[15px] mt-1">
            You can change this later if you&apos;re unsure.
          </p>
          <div className="flex gap-2 font-rounded-semibold mt-4">
            {getAvailableExamBoards(modalSubject.title).map((examBoard) => (
              <button
                key={examBoard}
                onClick={() => handleExamBoardSelect(examBoard)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  selectedExamBoard === examBoard
                    ? "bg-[#06B0FF] text-white"
                    : "bg-[#F2F2F7] text-black/40 hover:bg-[#E0E0E7]"
                }`}
              >
                {examBoard}
              </button>
            ))}
          </div>

          {requiresTierSelection(modalSubject.courseName, modalSubject.title) &&
            selectedExamBoard && (
              <div className="flex gap-2 font-rounded-semibold border-t border-[#F2F2F7] pt-4 mt-4">
                <button
                  onClick={() => handleLevelSelect("Higher")}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    selectedLevel === "Higher"
                      ? "bg-[#06B0FF] text-white"
                      : "bg-[#F2F2F7] text-black/40 hover:bg-[#E0E0E7]"
                  }`}
                >
                  Higher
                </button>
                <button
                  onClick={() => handleLevelSelect("Foundation")}
                  className={`rounded-md px-3 py-1 transition-colors ${
                    selectedLevel === "Foundation"
                      ? "bg-[#06B0FF] text-white"
                      : "bg-[#F2F2F7] text-black/40 hover:bg-[#E0E0E7]"
                  }`}
                >
                  Foundation
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default SubjectsSelect;
