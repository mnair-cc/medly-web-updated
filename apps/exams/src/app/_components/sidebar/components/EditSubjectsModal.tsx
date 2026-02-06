"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useAllSubjects } from "@/app/_hooks/useAllSubjects";
import { useUpdateSubjects } from "@/app/_hooks/useUpdateSubjects";
import { Subject, UserSubject } from "@/app/types/types";
import Spinner from "@/app/_components/Spinner";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import CrossInCircleIcon from "@/app/_components/icons/CrossInCircleIcon";
import { getSubjectIconWithColor } from "@/app/_lib/utils/getSubjectIcon";
import { toast } from "sonner";
import { useTracking } from "@/app/_lib/posthog/useTracking";

import { getSubjectTheme } from "@/app/_lib/utils/subjectTheme";

interface EditSubjectsModalProps {
  editSubjectsModalRef: React.RefObject<HTMLDivElement>;
  setIsEditSubjectsModalOpen: (isOpen: boolean) => void;
  userSubjects: UserSubject[] | undefined;
  onSubjectsUpdated?: (updatedSubjects: UserSubject[]) => void;
}

const EditSubjectsModal = ({
  editSubjectsModalRef,
  setIsEditSubjectsModalOpen,
  userSubjects,
  onSubjectsUpdated,
}: EditSubjectsModalProps) => {
  const { track } = useTracking();
  const {
    data: allSubjects,
    isLoading: isLoadingAllSubjects,
    error: allSubjectsError,
  } = useAllSubjects();
  const { updateSubjects, isSaving } = useUpdateSubjects();
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
  const handlePopupClose = () => {
    setSelectedExamBoard("");
    setSelectedLevel("");
    setModalSubject(null);
    setIsModalOpen(false);
  };

  // Close the small popup when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        handlePopupClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isModalOpen]);

  // State for selected subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const [gcseHigherById, setGcseHigherById] = useState<Record<string, boolean>>(
    {}
  );
  const [examBoardById, setExamBoardById] = useState<Record<string, string>>(
    {}
  );

  // Initialize selected subjects from user subjects
  useEffect(() => {
    if (userSubjects) {
      setSelectedSubjects(userSubjects.map((subject) => subject.legacyId));

      // Initialize gcseHigherById with existing values
      const gcseHigherMap: Record<string, boolean> = {};
      userSubjects.forEach((subject) => {
        if (subject.gcseHigher !== undefined) {
          gcseHigherMap[subject.legacyId] = subject.gcseHigher;
        }
      });
      setGcseHigherById(gcseHigherMap);

      // Initialize examBoardById with existing values
      const examBoardMap: Record<string, string> = {};
      userSubjects.forEach((subject) => {
        examBoardMap[subject.legacyId] = subject.examBoard;
      });
      setExamBoardById(examBoardMap);
    }
  }, [userSubjects]);

  // Handle errors
  useEffect(() => {
    if (allSubjectsError) {
      toast.error("Failed to load subjects. Please try again later.");
      setError(new Error("Failed to load subjects"));
    }
  }, [allSubjectsError]);

  // Use selected subjects state instead of onboarding data
  const selectedSubjectIds = selectedSubjects;

  // Extract available courses from the retrieved data
  const availableCourses = useMemo(
    () => courses?.map((course) => course.name) || [],
    [courses]
  );

  // Set the selected course to the first available course when data loads
  useEffect(() => {
    if (availableCourses.length > 0 && !selectedCourse) {
      setSelectedCourse(availableCourses[0]);
    }
  }, [availableCourses, selectedCourse]);

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

  // Get all subjects from all courses for the selected subjects display
  const allCourseSubjects =
    courses?.flatMap((course) =>
      course.examBoards.flatMap((board) =>
        board.subjects.map((subject) => ({
          ...subject,
          examBoard: board.name,
          courseName: course.name,
        }))
      )
    ) || [];

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

  const addSubjectToSelectedSubjects = (subjectId: string) => {
    setSelectedSubjects([...selectedSubjects, subjectId]);
  };

  const removeSubjectFromSelectedSubjects = (subjectId: string) => {
    setSelectedSubjects(selectedSubjects.filter((id) => id !== subjectId));
    setGcseHigherById((prev) => {
      const updated = { ...prev };
      delete updated[subjectId];
      return updated;
    });
    setExamBoardById((prev) => {
      const updated = { ...prev };
      delete updated[subjectId];
      return updated;
    });
  };

  const handleSubjectToggle = (
    subject: Subject & { examBoard: string; courseName: string },
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Calculate position in viewport coordinates so it can overrun the modal
    const buttonRect = event.currentTarget.getBoundingClientRect();

    // Initial placement below the button
    const approxPopupHeight = 160; // rough height for board+level options
    const popupWidth = Math.min(320, window.innerWidth - 32); // responsive width cap
    let top = buttonRect.bottom + window.scrollY + 8; // 8px spacing
    let left = buttonRect.left + window.scrollX;

    // Flip above if it would overflow the viewport bottom
    if (top + approxPopupHeight > window.scrollY + window.innerHeight) {
      top = buttonRect.top + window.scrollY - approxPopupHeight - 8;
      if (top < window.scrollY + 8) top = window.scrollY + 8;
    }

    // Keep within viewport horizontally
    if (left + popupWidth > window.scrollX + window.innerWidth) {
      left = window.scrollX + window.innerWidth - popupWidth - 16;
    }
    left = Math.max(window.scrollX + 16, left);

    setModalPosition({ top, left });

    // Determine if any board variant of this subject is already selected
    let selectedVariantLegacyId: string | null = null;
    if (currentCourseData) {
      for (const board of currentCourseData.examBoards) {
        const match = board.subjects.find(
          (s) =>
            s.title === subject.title && selectedSubjectIds.includes(s.legacyId)
        );
        if (match) {
          selectedVariantLegacyId = match.legacyId;
          break;
        }
      }
    }

    // If subject (any board) is already selected, remove it directly
    if (selectedVariantLegacyId) {
      removeSubjectFromSelectedSubjects(selectedVariantLegacyId);
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

    // Store the exam board selection keyed by the resolved legacy id
    if (finalExamBoard) {
      setExamBoardById((prev) => ({
        ...prev,
        [legacyIdToUse]: finalExamBoard,
      }));
    }

    // Store the level selection if applicable (Higher/Standard/Foundation)
    if (
      requiresTierSelection(modalSubject.courseName, modalSubject.title) &&
      finalLevel
    ) {
      setGcseHigherById((prev) => ({
        ...prev,
        [legacyIdToUse]: finalLevel === "Higher",
      }));
    }

    // Add the subject to selected subjects using the resolved legacy id
    addSubjectToSelectedSubjects(legacyIdToUse);

    // Reset selections and close modal
    setSelectedExamBoard("");
    setSelectedLevel("");
    setModalSubject(null);
    setIsModalOpen(false);
  };

  // Perform the actual save to backend
  const performSave = async () => {
    if (!allSubjects) {
      return;
    }

    try {
      await track("click_save_subjects", {
        subject_ids: selectedSubjects,
      });
    } catch (error) {
      console.error("Failed to track subject save:", error);
    }

    const subjectsToUpdate: UserSubject[] = selectedSubjects.flatMap(
      (legacyId) => {
        // Check if subject already exists to preserve existing grades
        const existingSubject = userSubjects?.find(
          (userSubject) => userSubject.legacyId === legacyId
        );

        // Get the user's selected exam board for this subject
        const selectedExamBoard =
          examBoardById[legacyId] || existingSubject?.examBoard;

        for (const course of allSubjects) {
          for (const examBoard of course.examBoards) {
            // Only process the exam board that the user selected (or existing one as fallback)
            if (selectedExamBoard && examBoard.name !== selectedExamBoard) {
              continue;
            }

            for (const subject of examBoard.subjects) {
              if (subject.legacyId === legacyId) {
                const isGcse = course.name === "GCSE";
                const t = subject.title.toLowerCase();
                const isScience =
                  t.includes("biology") ||
                  t.includes("chemistry") ||
                  t.includes("physics");
                const isMaths = t.includes("math");
                const shouldIncludeLevel = isGcse && (isScience || isMaths);
                return [
                  {
                    id: subject.id,
                    legacyId,
                    title: subject.title,
                    examBoard: examBoard.name,
                    course: course.name, // Include course for Sidebar state update
                    // Preserve existing grades or default to "0" for new subjects
                    currentGrade: existingSubject?.currentGrade || "0",
                    targetGrade: existingSubject?.targetGrade || "0",
                    weakTopics: existingSubject?.weakTopics || [],
                    // Save level as boolean (true = Higher, false = Foundation/Standard)
                    ...(shouldIncludeLevel
                      ? {
                          gcseHigher:
                            gcseHigherById[legacyId] ??
                            existingSubject?.gcseHigher ??
                            false,
                        }
                      : {}),
                    // Preserve priorQualificationGrade if present for this subject
                    ...(existingSubject?.priorQualificationGrade
                      ? {
                          priorQualificationGrade:
                            existingSubject.priorQualificationGrade,
                        }
                      : {}),
                  },
                ];
              }
            }
          }
        }
        return [];
      }
    );

    const success = await updateSubjects(subjectsToUpdate);
    if (success) {
      // Update state directly with the data we just saved (no refetch needed)
      onSubjectsUpdated?.(subjectsToUpdate);
      setIsEditSubjectsModalOpen(false);
    }
  };

  const handleSave = async () => {
    await performSave();
  };

  // Simplified loading state - show loading while fetching initial data or saving
  const isLoading = isLoadingAllSubjects || isLoadingCourses || isSaving;

  // Show error state if we have an error or can't load essential data
  const hasError = error || allSubjectsError || !allSubjects;

  // Mount guard for portals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Loading state
  if (isLoading) {
    if (!mounted) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[1200] bg-black bg-opacity-50"
        onClick={() => setIsEditSubjectsModalOpen(false)}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <div
            ref={editSubjectsModalRef}
            className="bg-white rounded-2xl w-full max-w-md h-64 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-gray-600">
                {isSaving ? "Saving subjects..." : "Loading subjects..."}
              </p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Error state
  if (hasError) {
    if (!mounted) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[1200] bg-black bg-opacity-50"
        onClick={() => setIsEditSubjectsModalOpen(false)}
      >
        <div className="flex items-center justify-center min-h-screen p-4">
          <div
            ref={editSubjectsModalRef}
            className="bg-white rounded-2xl w-full max-w-md p-8 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-red-500 text-4xl">⚠️</div>
            <div className="text-center">
              <h3 className="font-rounded-bold text-lg mb-2">
                Unable to load subjects
              </h3>
              <p className="text-gray-600 mb-4">
                {!courses || courses?.length === 0
                  ? "No subjects are available at the moment."
                  : "Failed to load subjects. Please try again later."}
              </p>
            </div>
            <button
              onClick={() => setIsEditSubjectsModalOpen(false)}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-rounded-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[1200] bg-black bg-opacity-50"
      onClick={() => setIsEditSubjectsModalOpen(false)}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          ref={editSubjectsModalRef}
          className="bg-white rounded-xl sm:rounded-2xl w-full max-w-[96vw] sm:max-w-6xl max-h-[90vh] overflow-hidden relative flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setIsEditSubjectsModalOpen(false)}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <CrossInCircleIcon />
          </button>

          <div className="flex flex-col w-full px-3 py-4 sm:px-6 sm:py-8 flex-1 min-h-0">
            {/* Course tabs */}
            <div className="w-full flex justify-start sm:justify-center mb-4 sm:mb-8">
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
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-rounded-semibold transition-all whitespace-nowrap text-[14px] sm:text-[16px] ${
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

            {/* Scroll container for subjects list only */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Subjects list: 2 columns on mobile, content-width pills on desktop */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 md:gap-4 sm:justify-center mb-4 sm:mb-6">
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

            {/* Bottom section outside scroll area */}
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Selected subjects chips scroller */}
                <div className="flex-1 relative sm:mr-4">
                  <div className="min-h-20 max-h-32 sm:max-h-28 overflow-y-auto">
                    <div className="flex flex-wrap gap-2 content-start h-full">
                      {selectedSubjects.map((subjectId) => {
                        const subject = allCourseSubjects.find(
                          (s) => s.legacyId === subjectId
                        );
                        if (!subject) return null;
                        return (
                          <div
                            key={subjectId}
                            className="flex items-center gap-1 rounded-xl px-3 py-2 font-rounded-semibold bg-[#F2F2F7] max-w-full"
                          >
                            <span className="truncate max-w-[75vw] sm:max-w-[520px]">
                              {`${
                                examBoardById[subjectId] || subject.examBoard
                              }${
                                (examBoardById[subjectId] ||
                                  subject.examBoard) === "IB" &&
                                subject.courseName ===
                                  "IB (International Baccalaureate)"
                                  ? ""
                                  : ` ${subject.courseName}`
                              } ${subject.title}${
                                requiresTierSelection(
                                  subject.courseName,
                                  subject.title
                                ) &&
                                gcseHigherById[subjectId] !== undefined &&
                                gcseHigherById[subjectId] !== null
                                  ? gcseHigherById[subjectId]
                                    ? " Higher"
                                    : subject.courseName ===
                                        "IB (International Baccalaureate)"
                                      ? " Standard"
                                      : " Foundation"
                                  : ""
                              }`}
                            </span>
                            <button
                              onClick={() =>
                                removeSubjectFromSelectedSubjects(subjectId)
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

                {/* Save button */}
                <div className="w-full sm:w-[250px]">
                  <PrimaryButtonClicky
                    buttonText={`Save ${selectedSubjects.length} Subject${
                      selectedSubjects.length !== 1 ? "s" : ""
                    }`}
                    onPress={handleSave}
                    buttonState="filled"
                    doesStretch={true}
                    showKeyboardShortcut={false}
                    disabled={selectedSubjects.length === 0 || isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Exam Board Modal */}
            {modalSubject && isModalOpen && (
              <div
                ref={modalRef}
                className="fixed z-[1200] rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] p-4 sm:p-6 bg-white max-w-[90vw] sm:max-w-sm w-auto min-w-[260px] sm:min-w-[300px]"
                style={{
                  top: modalPosition.top,
                  left: modalPosition.left,
                }}
              >
                <h3 className="font-rounded-semibold">
                  Choose your exam board
                </h3>
                <p className="text-black/50 text-[15px] mt-1">
                  You can change this later if you&apos;re unsure.
                </p>
                <div className="flex gap-2 font-rounded-semibold mt-4">
                  {getAvailableExamBoards(modalSubject.title).map(
                    (examBoard) => (
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
                    )
                  )}
                </div>

                {requiresTierSelection(
                  modalSubject.courseName,
                  modalSubject.title
                ) &&
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
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditSubjectsModal;
