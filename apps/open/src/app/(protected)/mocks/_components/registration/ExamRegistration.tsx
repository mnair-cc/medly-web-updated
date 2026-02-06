import { useTracking } from "@/app/_lib/posthog/useTracking";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { useQueryClient } from "@tanstack/react-query";
import { MOCKS_DATA_QUERY_KEY } from "@/app/_hooks/useMocksData";

type Board = "AQA" | "Edexcel" | "OCR";
type Course = "GCSE" | "A-Level";

interface SubjectOption {
  course: Course;
  subject: string;
  requiresTier: boolean;
}

const SUBJECTS_BY_BOARD: Record<Board, SubjectOption[]> = {
  AQA: [
    { course: "GCSE", subject: "Biology", requiresTier: true },
    { course: "GCSE", subject: "Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Physics", requiresTier: true },
    { course: "GCSE", subject: "Combined Biology", requiresTier: true },
    { course: "GCSE", subject: "Combined Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Combined Physics", requiresTier: true },
    { course: "GCSE", subject: "English Literature", requiresTier: false },
    { course: "GCSE", subject: "English Language", requiresTier: false },
    { course: "GCSE", subject: "Maths", requiresTier: true },
    { course: "A-Level", subject: "Maths", requiresTier: false },
    { course: "A-Level", subject: "Biology", requiresTier: false },
    { course: "A-Level", subject: "Chemistry", requiresTier: false },
    { course: "A-Level", subject: "Physics", requiresTier: false },
  ],
  Edexcel: [
    { course: "GCSE", subject: "Biology", requiresTier: true },
    { course: "GCSE", subject: "Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Physics", requiresTier: true },
    { course: "GCSE", subject: "Combined Biology", requiresTier: true },
    { course: "GCSE", subject: "Combined Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Combined Physics", requiresTier: true },
    { course: "GCSE", subject: "English Literature", requiresTier: false },
    { course: "GCSE", subject: "English Language", requiresTier: false },
    { course: "GCSE", subject: "Maths", requiresTier: true },
    { course: "A-Level", subject: "Maths", requiresTier: false },
    { course: "A-Level", subject: "Biology", requiresTier: false },
    { course: "A-Level", subject: "Chemistry", requiresTier: false },
    { course: "A-Level", subject: "Physics", requiresTier: false },
  ],
  OCR: [
    { course: "GCSE", subject: "Biology", requiresTier: true },
    { course: "GCSE", subject: "Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Physics", requiresTier: true },
    { course: "GCSE", subject: "Combined Biology", requiresTier: true },
    { course: "GCSE", subject: "Combined Chemistry", requiresTier: true },
    { course: "GCSE", subject: "Combined Physics", requiresTier: true },
    { course: "GCSE", subject: "Maths", requiresTier: true },
    { course: "A-Level", subject: "Maths", requiresTier: false },
    { course: "A-Level", subject: "Biology", requiresTier: false },
    { course: "A-Level", subject: "Chemistry", requiresTier: false },
    { course: "A-Level", subject: "Physics", requiresTier: false },
  ],
};

const ALL_BOARDS: Board[] = ["AQA", "Edexcel", "OCR"];

interface SelectedChoice {
  board: Board;
  course: Course;
  subject: string;
  level?: "Higher" | "Foundation";
}

interface ModalChoice {
  course: Course;
  subject: string;
  requiresTier: boolean;
}

const COURSES: Course[] = ["GCSE", "A-Level"];

// Format display label so "Combined Biology" renders as "Biology (Combined)"
const formatSubjectLabel = (subject: string) => {
  if (subject.startsWith("Combined ")) {
    return `${subject.replace(/^Combined\s+/, "")} (Combined)`;
  }
  return subject;
};

const ExamRegistration = ({
  setIsUserRegistered,
  setIsUserWaitingList,
  setWaitlistPosition,
  hasActiveSubscription,
  referrerId,
  initialSelectedExams,
  parentRef,
  isEditing,
}: {
  setIsUserRegistered: (isUserRegistered: boolean) => void;
  setIsUserWaitingList: (isWaitlisted: boolean) => void;
  setWaitlistPosition: (position: number) => void;
  hasActiveSubscription: boolean;
  referrerId?: string | null;
  initialSelectedExams?: {
    examId: string;
    board: string | null;
    series: string | null;
    subject: string;
    subjectId: string;
  }[];
  parentRef: React.RefObject<HTMLDivElement>;
  isEditing?: boolean;
}) => {
  const { track } = useTracking();
  const queryClient = useQueryClient();

  const [selectedCourse, setSelectedCourse] = useState<Course>("GCSE");
  const [selected, setSelected] = useState<SelectedChoice[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChoice, setModalChoice] = useState<ModalChoice | null>(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedExamBoard, setSelectedExamBoard] = useState<Board | null>(
    null
  );
  const [selectedLevel, setSelectedLevel] = useState<
    "Higher" | "Foundation" | null
  >(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Referral code input (defaults to referrerId if provided via URL)
  const [referralCode, setReferralCode] = useState<string>(
    referrerId ? referrerId.toUpperCase() : ""
  );
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  useEffect(() => {
    if (referrerId) {
      setReferralCode(referrerId.toUpperCase());
      setIsAutoFilled(true);
      const t = setTimeout(() => setIsAutoFilled(false), 800);
      return () => clearTimeout(t);
    }
  }, [referrerId]);

  // Pre-populate selections if provided (edit mode)
  useEffect(() => {
    if (!initialSelectedExams || initialSelectedExams.length === 0) return;
    const parsed: SelectedChoice[] = [];
    for (const item of initialSelectedExams) {
      if (!item.subject) continue;
      let course: Course = "GCSE";
      let subjectName = item.subject;
      if (item.subject.startsWith("GCSE ")) {
        course = "GCSE";
        subjectName = item.subject.slice(5);
      } else if (item.subject.startsWith("A-Level ")) {
        course = "A-Level";
        subjectName = item.subject.slice(8);
      } else if (item.subject.startsWith("A Level ")) {
        course = "A-Level";
        subjectName = item.subject.slice(7);
      }

      const boardRaw = (item.board || "").trim();
      if (boardRaw !== "AQA" && boardRaw !== "Edexcel" && boardRaw !== "OCR") {
        continue;
      }
      const level =
        item.series === "Higher" || item.series === "Foundation"
          ? (item.series as "Higher" | "Foundation")
          : undefined;
      parsed.push({
        board: boardRaw as Board,
        course,
        subject: subjectName,
        level,
      });
    }
    if (parsed.length > 0) {
      setSelected(parsed);
      // Default course tab based on first selection
      setSelectedCourse(parsed[0].course);
    }
  }, [initialSelectedExams]);

  // Build unique subject list for selected course across all boards
  const subjectsForCourse = useMemo<SubjectOption[]>(() => {
    const map = new Map<string, SubjectOption>();
    ALL_BOARDS.forEach((board) => {
      SUBJECTS_BY_BOARD[board].forEach((opt) => {
        if (opt.course !== selectedCourse) return;
        const existing = map.get(opt.subject);
        if (!existing) {
          map.set(opt.subject, { ...opt });
        } else {
          if (opt.requiresTier && !existing.requiresTier) {
            map.set(opt.subject, { ...existing, requiresTier: true });
          }
        }
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.subject.localeCompare(b.subject)
    );
  }, [selectedCourse]);

  const getAvailableExamBoards = (subject: string, course: Course): Board[] => {
    return ALL_BOARDS.filter((board) =>
      SUBJECTS_BY_BOARD[board].some(
        (opt) => opt.course === course && opt.subject === subject
      )
    );
  };

  const isSubjectSelected = (subject: string) =>
    selected.some((s) => s.course === selectedCourse && s.subject === subject);

  const getSelectedChoiceForSubject = (
    subject: string
  ): SelectedChoice | undefined =>
    selected.find((s) => s.course === selectedCourse && s.subject === subject);

  const removeSubjectSelections = (subject: string) => {
    setSelected((prev) =>
      prev.filter(
        (s) => !(s.course === selectedCourse && s.subject === subject)
      )
    );
  };

  const handleSubjectClick = (
    option: SubjectOption,
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (isSubjectSelected(option.subject)) {
      removeSubjectSelections(option.subject);
      return;
    }

    const availableBoards = getAvailableExamBoards(
      option.subject,
      option.course
    );
    if (availableBoards.length === 0) {
      toast.error("No exam boards available for this subject.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const parentRect = parentRef.current?.getBoundingClientRect();

    if (!parentRect) {
      console.error("Parent ref is not available.");
      return;
    }

    const approxPopupHeight = option.requiresTier ? 200 : 140;
    let top = rect.bottom - parentRect.top + 8;
    if (top + approxPopupHeight > parentRect.height) {
      top = rect.top - parentRect.top - approxPopupHeight - 8;
      if (top < 8) top = 8;
    }
    const left = rect.left - parentRect.left;
    setModalPosition({ top, left });

    // Reset modal selection state
    setSelectedExamBoard(null);
    setSelectedLevel(null);
    setModalChoice({
      course: option.course,
      subject: option.subject,
      requiresTier: option.requiresTier,
    });
    setIsModalOpen(true);
  };

  const handleExamBoardSelect = (board: Board) => {
    setSelectedExamBoard(board);
    if (modalChoice && !modalChoice.requiresTier) {
      // Confirm immediately if no level needed
      handleModalConfirm(board, null);
    }
  };

  const handleLevelSelect = (level: "Higher" | "Foundation") => {
    setSelectedLevel(level);
    if (selectedExamBoard && modalChoice) {
      handleModalConfirm(selectedExamBoard, level);
    }
  };

  const handleModalConfirm = (
    board: Board,
    level: "Higher" | "Foundation" | null
  ) => {
    if (!modalChoice) return;
    const newChoice: SelectedChoice = {
      board,
      course: modalChoice.course,
      subject: modalChoice.subject,
      level: modalChoice.requiresTier ? (level ?? "Higher") : undefined,
    };
    setSelected((prev) => [...prev, newChoice]);
    setModalChoice(null);
    setSelectedExamBoard(null);
    setSelectedLevel(null);
    setIsModalOpen(false);
  };

  const handleModalClose = () => {
    setModalChoice(null);
    setSelectedExamBoard(null);
    setSelectedLevel(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleModalClose();
      }
    };
    if (isModalOpen) {
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }
  }, [isModalOpen]);

  const handleRegister = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one exam to register");
      return;
    }

    setIsSubmitting(true);
    setRegistrationError(null);

    try {
      const formattedSelectedExams = selected.map((c) => {
        const subjectWithCourse = `${c.course} ${c.subject}`;
        const id = `medly${c.board}_${c.course}_${c.subject.replace(/[^A-Za-z]/g, "")}${c.level ? `_${c.level}` : ""}`;
        return {
          examId: id,
          board: c.board,
          series: c.level ?? null,
          subject: subjectWithCourse,
        };
      });

      type SelectedExamPayload = {
        examId: string;
        board: string | null;
        series: string | null;
        subject: string;
      };
      type RegistrationPayload = {
        selectedExams: SelectedExamPayload[];
        referralCodeUsed?: string;
      };
      const payload: RegistrationPayload = {
        selectedExams: formattedSelectedExams,
        referralCodeUsed: referralCode.trim() || undefined,
      };

      const response = await curriculumApiV2Client.post(
        `/mocks/register`,
        payload
      );

      const registrationData = response.data.data;

      toast.success("Successfully registered for Medly Mocks 2025!");
      window.scrollTo({ top: 0, behavior: "smooth" });
      track("mock_registration_completed", {
        selectedExams: formattedSelectedExams,
      });

      if (registrationData.waitListPosition !== undefined) {
        setWaitlistPosition(registrationData.waitListPosition);
        const shouldBeOnWaitlist =
          registrationData.waitListPosition > 0 && !hasActiveSubscription;
        setIsUserWaitingList(shouldBeOnWaitlist);
      }

      setIsUserRegistered(true);

      // Invalidate mocks data cache so sidebar updates immediately
      queryClient.invalidateQueries({ queryKey: MOCKS_DATA_QUERY_KEY });
    } catch (error) {
      console.error("Registration error:", error);
      setRegistrationError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to register. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full ">
      {/* Course tabs */}
      <div className="flex justify-center mb-10">
        <div className="flex gap-1 bg-[white] rounded-full p-1">
          {COURSES.map((course) => (
            <button
              key={course}
              onClick={() => setSelectedCourse(course)}
              className={`px-5 py-2 rounded-full font-rounded-semibold transition-all whitespace-nowrap ${
                selectedCourse === course
                  ? "bg-[#06B0FF] text-white"
                  : "bg-transparent text-[#06B0FF] hover:bg-[#06B0FF1A]"
              }`}
            >
              {course === "A-Level" ? "A Level" : course}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects grid */}
      <div className="mb-10 px-10">
        <div className="flex flex-wrap gap-3 justify-center">
          {subjectsForCourse.map((opt) => {
            const active = isSubjectSelected(opt.subject);
            const selectedChoice = getSelectedChoiceForSubject(opt.subject);

            // Display text: if selected, show full details; otherwise just subject name
            const displayText = selectedChoice
              ? `${selectedChoice.board} ${formatSubjectLabel(selectedChoice.subject)}${selectedChoice.level ? ` ${selectedChoice.level}` : ""}`
              : formatSubjectLabel(opt.subject);

            return (
              <button
                key={`${opt.course}-${opt.subject}`}
                onClick={(e) => handleSubjectClick(opt, e)}
                className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 font-rounded-semibold border border-gray-100 whitespace-nowrap ${
                  active
                    ? "bg-[#06B0FF] text-white"
                    : "bg-[white] text-black/80 hover:bg-[#000000]/5"
                }`}
              >
                {displayText}
                {active && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSubjectSelections(opt.subject);
                    }}
                    className="text-white/80 hover:text-white ml-2 text-lg leading-none cursor-pointer"
                  >
                    ×
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom bar with selections and confirm */}
      <div
        className={`bg-white 50 p-4 mt-6 pb-10 ${!isEditing ? "border-t border-[#06B0FF]/10" : ""}`}
      >
        <div className="flex flex-wrap justify-between items-center gap-3">
          {/* <div className="flex-1 mr-4 relative">
            <div className="min-h-20 max-h-28 overflow-y-auto">
              <div className="flex flex-wrap gap-2 content-start h-full">
                {selected.map((c) => (
                  <div
                    key={`${c.board}|${c.course}|${c.subject}|${c.level ?? ""}`}
                    className="flex items-center justify-center rounded-xl px-3 py-2 font-rounded-semibold bg-[#F2F2F7] whitespace-nowrap"
                  >
                    {c.board} {c.course} {formatSubjectLabel(c.subject)}{" "}
                    {c.level ? c.level : ""}
                    <button
                      onClick={() => removeSubjectSelections(c.subject)}
                      className="text-gray-500 hover:text-gray-700 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent z-10" />
          </div> */}
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* Referral code input - only show on first registration */}
          {!isEditing && (
            <div className="w-[220px]">
              <label
                htmlFor="referralCode"
                className="block font-rounded-semibold text-center text-[15px] text-black/50 mb-1"
              >
                Referral code (optional)
              </label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Referral code (optional)"
                maxLength={6}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all ${
                  isAutoFilled
                    ? "border-black ring-2 ring-black scale-[1.02]"
                    : "border-gray-200 focus:ring-2 focus:ring-[#06B0FF]"
                }`}
              />
              <p className="font-rounded-semibold text-center text-[11px] text-black/40 mt-1">
                Help a friend skip the waitlist
              </p>
            </div>
          )}

          <div className="w-[250px]">
            <PrimaryButtonClicky
              buttonState="filled"
              buttonText={
                isSubmitting
                  ? "Registering..."
                  : `Confirm ${selected.length} Subject${selected.length !== 1 ? "s" : ""}`
              }
              onPress={handleRegister}
              disabled={isSubmitting || selected.length === 0}
              doesStretch={true}
              showKeyboardShortcut={false}
            />
          </div>
        </div>
      </div>

      {/* Exam Board + Level Modal */}
      {isModalOpen && modalChoice && (
        <div
          ref={modalRef}
          className="absolute z-50 rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] p-6 bg-white max-w-sm w-auto min-w-[300px]"
          style={{ top: modalPosition.top, left: modalPosition.left }}
        >
          <h3 className="font-rounded-semibold">Choose your exam board</h3>
          <p className="text-black/50 text-[15px] mt-1">
            You can change this later if you&apos;re unsure.
          </p>
          <div className="flex gap-2 font-rounded-semibold mt-4 flex-wrap">
            {getAvailableExamBoards(
              modalChoice.subject,
              modalChoice.course
            ).map((board) => (
              <button
                key={board}
                onClick={() => handleExamBoardSelect(board)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  selectedExamBoard === board
                    ? "bg-[#06B0FF] text-white"
                    : "bg-[#F2F2F7] text-black/40 hover:bg-[#E0E0E7]"
                }`}
              >
                {board}
              </button>
            ))}
          </div>

          {modalChoice.requiresTier && selectedExamBoard && (
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

      {registrationError && (
        <p className="text-red-500 text-center mt-2">{registrationError}</p>
      )}
    </div>
  );
};

export default ExamRegistration;
