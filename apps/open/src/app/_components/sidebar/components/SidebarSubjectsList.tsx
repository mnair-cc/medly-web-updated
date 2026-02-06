"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getSubjectTheme } from "../../../_lib/utils/subjectTheme";
import { useTracking } from "@/app/_lib/posthog/useTracking";

import PlusIcon from "../../icons/PlusIcon";

interface SubjectForGradeSelection {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  currentGrade?: string;
  targetGrade?: string;
  units?: { topics?: { lessons?: { legacyId: string }[] }[] }[];
}

interface SidebarSubjectsListProps {
  userSubjects: SubjectForGradeSelection[] | undefined;
  isLoadingSubjects: boolean;
  selectedSubject: string | null;
  leftSidebarWidth: number;
  onSubjectSelect: (subject: SubjectForGradeSelection) => void;
  onAddSubjects: () => void;
}

export default function SidebarSubjectsList({
  userSubjects,
  isLoadingSubjects,
  selectedSubject,
  leftSidebarWidth,
  onSubjectSelect,
  onAddSubjects,
}: SidebarSubjectsListProps) {
  const [hoveredSubject, setHoveredSubject] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    top: number;
    left: number;
    content: string;
  } | null>(null);
  const { track } = useTracking();

  const sortedSubjects = useMemo(() => {
    if (!userSubjects) return [] as SubjectForGradeSelection[];
    return [...userSubjects].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
  }, [userSubjects]);

  const updateTooltipFromEvent = (e: React.MouseEvent, content: string) => {
    if (leftSidebarWidth >= 140) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setTooltip({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
      content,
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Subjects List - Scrollable */}
      <div className="flex flex-col gap-1 px-4 overflow-y-auto flex-1">
        {isLoadingSubjects ? (
          <div className="flex items-center justify-center py-4">
            {/* <div className="text-[14px] text-gray-500">Loading subjects...</div> */}
          </div>
        ) : (
          sortedSubjects.length > 0 &&
          sortedSubjects.map((subject) => {
            const theme = getSubjectTheme(subject.title);
            const isSelected = selectedSubject === subject.legacyId;

            return (
              <button
                key={subject.legacyId}
                onClick={() => {
                  onSubjectSelect(subject);
                  track("clicked_subject_in_sidebar");
                }}
                onMouseEnter={(e) => {
                  setHoveredSubject(subject.legacyId);
                  updateTooltipFromEvent(e, subject.title);
                }}
                onMouseMove={(e) => updateTooltipFromEvent(e, subject.title)}
                onMouseLeave={() => {
                  setHoveredSubject(null);
                  setTooltip(null);
                }}
                className={`relative group flex flex-row items-center w-full ${
                  leftSidebarWidth < 140 ? "justify-center px-2" : "gap-2 px-2"
                } rounded-[8px] py-2 ${
                  isSelected
                    ? "bg-[#F7F7FA]"
                    : hoveredSubject === subject.legacyId
                      ? "bg-[#F7F7FA]"
                      : "bg-transparent"
                }`}
                title={leftSidebarWidth < 140 ? subject.title : undefined}
              >
                <div
                  style={{ color: theme.primaryColor }}
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0 [&>svg]:w-full [&>svg]:h-full"
                >
                  {theme.icon}
                </div>
                {leftSidebarWidth >= 140 && (
                  <div
                    className={`font-rounded-bold text-[15px] whitespace-nowrap truncate ${
                      isSelected ? "text-black" : "text-gray-600"
                    }`}
                  >
                    {subject.title}
                  </div>
                )}

                {/* Tooltip now rendered via portal */}
              </button>
            );
          })
        )}

        {/* Add New Subject Button */}
        {!isLoadingSubjects && (
          <button
            className={`relative group flex flex-row items-center w-full ${
              leftSidebarWidth < 140 ? "justify-center px-2" : "gap-2 px-2"
            } rounded-[8px] py-2 transition-colors duration-150 hover:bg-[#F7F7FA] bg-transparent`}
            title={leftSidebarWidth < 140 ? "Add New Subject" : undefined}
            onClick={() => {
              onAddSubjects();
              track("clicked_add_or_edit_subjects_in_sidebar");
            }}
            onMouseEnter={(e) => updateTooltipFromEvent(e, "Add subjects")}
            onMouseMove={(e) => updateTooltipFromEvent(e, "Add subjects")}
            onMouseLeave={() => setTooltip(null)}
          >
            <div
              className={`text-[#A9A9AA] ${
                leftSidebarWidth < 140 ? "text-[20px]" : ""
              }`}
            >
              {userSubjects && userSubjects.length > 0 ? (
                <PlusIcon fill="currentColor" />
              ) : (
                <PlusIcon fill="currentColor" />
              )}
            </div>
            {leftSidebarWidth >= 140 && (
              <div className="font-rounded-bold py-1 text-[15px] text-[#A9A9AA] text-left leading-tight">
                {userSubjects && userSubjects.length > 0
                  ? "Edit subjects"
                  : "Add subject"}
              </div>
            )}

            {/* Tooltip now rendered via portal */}
          </button>
        )}

        {/* Empty State - when no subject selected (hide when collapsed/icons-only) */}
        {!selectedSubject && !isLoadingSubjects && leftSidebarWidth >= 140 && (
          <div className="flex flex-col gap-1 justify-center items-center text-center text-[#808080] mt-2 pb-2">
            <svg
              width="30"
              height="84"
              viewBox="0 0 30 84"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M28.3251 83.732C28.7293 84.1084 29.362 84.0858 29.7384 83.6816C30.1147 83.2773 30.0921 82.6446 29.6879 82.2682L29.0065 83.0001L28.3251 83.732ZM13.5031 60.5L14.4764 60.2706L13.5031 60.5ZM23.9978 43L23.7688 43.9734L23.9978 43ZM1.5 35L0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626L6.00309 17ZM9.24741 0.335636C8.88049 -0.0771466 8.24842 -0.114327 7.83564 0.252591L1.10895 6.23187C0.696169 6.59878 0.658989 7.23086 1.02591 7.64364C1.39282 8.05642 2.0249 8.0936 2.43768 7.72668L8.41695 2.41177L13.7319 8.39105C14.0988 8.80383 14.7309 8.84101 15.1436 8.47409C15.5564 8.10718 15.5936 7.4751 15.2267 7.06232L9.24741 0.335636ZM29.0065 83.0001L29.6879 82.2682C27.3242 80.0676 23.9048 76.2542 20.8721 72.1157C17.8184 67.9485 15.258 63.5866 14.4764 60.2706L13.5031 60.5L12.5298 60.7294C13.4101 64.4645 16.1846 69.1026 19.2589 73.2978C22.354 77.5215 25.8554 81.4327 28.3251 83.732L29.0065 83.0001ZM13.5031 60.5L14.4764 60.2706C13.528 56.2465 14.1266 51.6494 15.8834 48.3237C16.7582 46.6677 17.8922 45.3783 19.207 44.6076C20.5018 43.8486 22.0199 43.5619 23.7688 43.9734L23.9978 43L24.2269 42.0266C21.9757 41.4969 19.9316 41.8646 18.1956 42.8822C16.4796 43.8881 15.1143 45.4977 14.115 47.3895C12.1236 51.1593 11.4748 56.2533 12.5298 60.7294L13.5031 60.5ZM23.9978 43L23.7688 43.9734C25.1183 44.291 25.9685 45.0282 26.4477 45.94C26.9395 46.8759 27.0754 48.068 26.8309 49.3003C26.3388 51.7801 24.378 54.1329 21.3791 54.5077L21.5031 55.5L21.6271 56.4923C25.6293 55.992 28.1637 52.8589 28.7926 49.6896C29.1086 48.0973 28.9614 46.4241 28.2181 45.0097C27.4622 43.5712 26.1251 42.4732 24.2269 42.0266L23.9978 43ZM21.5031 55.5L21.3791 54.5077C17.7647 54.9595 13.0439 53.142 9.17866 49.5809C5.34179 46.0458 2.4994 40.9239 2.5 35.0001L1.5 35L0.5 34.9999C0.499334 41.5863 3.65849 47.2144 7.82348 51.0518C11.9602 54.863 17.2415 57.0405 21.6271 56.4923L21.5031 55.5ZM1.5 35L2.5 35.0001C2.50029 32.1497 3.15976 29.3491 4.0599 26.4237C4.94043 23.5621 6.10383 20.4378 6.968 17.2626L6.00309 17L5.03819 16.7374C4.1753 19.9079 3.08745 22.7836 2.14835 25.8355C1.22886 28.8237 0.500319 31.8503 0.5 34.9999L1.5 35ZM6.00309 17L6.968 17.2626C8.49008 11.6701 9.32951 3.92771 9.49827 1.05872L8.5 1L7.50173 0.941278C7.33716 3.73896 6.50992 11.3299 5.03819 16.7374L6.00309 17Z"
                fill="black"
                fillOpacity="0.3"
              />
            </svg>

            <p className="font-rounded-bold mt-4 text-[15px]">
              Let&apos;s Start Learning
            </p>
            <p className="max-w-[170px] mx-auto text-[12px]">
              Tap on a subject to start your first lesson
            </p>
          </div>
        )}
      </div>
      {/* Global portal tooltip for collapsed sidebar */}
      {tooltip &&
        leftSidebarWidth < 140 &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed px-2 py-1 flex items-center justify-center bg-[#333333] rounded-[4px] whitespace-nowrap pointer-events-none z-[9999]"
            style={{
              top: tooltip.top,
              left: tooltip.left,
              transform: "translateY(-50%)",
            }}
          >
            <div className="font-medium text-[12px] text-white">
              {tooltip.content}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
